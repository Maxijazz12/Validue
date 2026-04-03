"use server";

import { createClient } from "@/lib/supabase/server";
import stripe from "@/lib/stripe";
import sql from "@/lib/db";
import { getSubscription, isFirstMonth, isFirstCampaign } from "@/lib/plan-guard";
import { validateFunding } from "@/lib/reach";
import { WELCOME_BONUS, getPlanConfig } from "@/lib/plans";
import { env } from "@/lib/env";
import { captureError } from "@/lib/sentry";

export async function createFundingSession(
  campaignId: string
): Promise<{ url: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  // Verify the user owns this campaign and it needs funding
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, creator_id, title, reward_amount, status, is_subsidized")
    .eq("id", campaignId)
    .eq("creator_id", user.id)
    .single();

  if (!campaign) return { error: "Campaign not found." };

  // V2: Subsidized campaigns skip Stripe entirely
  if (campaign.is_subsidized) {
    return { error: "This campaign is sponsored — no payment needed." };
  }

  if (campaign.status !== "pending_funding") {
    return { error: "Campaign does not need funding." };
  }
  if (!campaign.reward_amount || campaign.reward_amount <= 0) {
    return { error: "Campaign has no reward amount set." };
  }

  // Validate funding amount against tier minimum
  const sub = await getSubscription(user.id);
  const fundingCheck = validateFunding(sub.tier, Number(campaign.reward_amount));
  if (!fundingCheck.valid) {
    return { error: fundingCheck.reason ?? "Invalid funding amount." };
  }

  // Get or create Stripe customer
  let stripeCustomerId: string;

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id, full_name")
    .eq("id", user.id)
    .single();

  if (profile?.stripe_customer_id) {
    stripeCustomerId = profile.stripe_customer_id;
  } else {
    const customer = await stripe.customers.create({
      email: user.email,
      name: profile?.full_name || undefined,
      metadata: { userId: user.id },
    });
    stripeCustomerId = customer.id;

    await sql`
      UPDATE profiles SET stripe_customer_id = ${stripeCustomerId}
      WHERE id = ${user.id}
    `;
  }

  // Check welcome credit eligibility (free tier, first month, first campaign, not yet used)
  let useWelcomeCredit = false;
  if (sub.tier === "free") {
    const firstMonth = await isFirstMonth(user.id);
    if (firstMonth) {
      const firstCampaign = await isFirstCampaign(user.id);
      if (firstCampaign) {
        const [subRow] = await sql`
          SELECT welcome_credit_used FROM subscriptions WHERE user_id = ${user.id}
        `;
        useWelcomeCredit = !subRow || !subRow.welcome_credit_used;
      }
    }
  }

  // V2: Check for platform credit (zero-qualifier auto-credit)
  // Eagerly deduct inside a transaction so concurrent checkouts can't double-spend.
  // If the user abandons checkout, the webhook won't fire and credit stays deducted —
  // but the expire-campaigns cron will re-credit on campaign expiry with zero responses.
  let platformCreditCents = 0;
  {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TransactionSql loses call signature
    await sql.begin(async (tx: any) => {
      const [creditRow] = await tx`
        SELECT platform_credit_cents, platform_credit_expires_at
        FROM profiles WHERE id = ${user.id}
        FOR UPDATE
      `;
      if (creditRow && creditRow.platform_credit_cents > 0) {
        const expires = creditRow.platform_credit_expires_at ? new Date(creditRow.platform_credit_expires_at) : null;
        if (!expires || expires > new Date()) {
          platformCreditCents = creditRow.platform_credit_cents;
          await tx`
            UPDATE profiles
            SET platform_credit_cents = 0,
                platform_credit_expires_at = NULL
            WHERE id = ${user.id}
          `;
        }
      }
    });
  }

  const fullAmountCents = Math.round(campaign.reward_amount * 100);
  const welcomeCreditCents = useWelcomeCredit ? WELCOME_BONUS.fundingCreditCents : 0;
  const totalCreditCents = welcomeCreditCents + platformCreditCents;
  const chargeAmountCents = Math.max(50, fullAmountCents - totalCreditCents); // Stripe min $0.50

  // Create Checkout Session — restore platform credit if Stripe call fails
  let session;
  try {
    session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: chargeAmountCents,
            product_data: {
              name: `Campaign: ${campaign.title}`,
              description: totalCreditCents > 0
                ? `Reward pool funding ($${(totalCreditCents / 100).toFixed(2)} credit applied)`
                : "Reward pool funding for Validue campaign",
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        campaignId: campaign.id,
        userId: user.id,
        type: "campaign_funding",
        welcomeCredit: useWelcomeCredit ? "true" : "false",
        platformCreditCents: platformCreditCents > 0 ? String(platformCreditCents) : "0",
      },
      success_url: `${env().NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/ideas/${campaign.id}?funded=true`,
      cancel_url: `${env().NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/ideas/${campaign.id}?funded=false`,
    });
  } catch (err) {
    // Restore platform credit that was eagerly deducted
    if (platformCreditCents > 0) {
      try {
        await sql`
          UPDATE profiles
          SET platform_credit_cents = platform_credit_cents + ${platformCreditCents},
              platform_credit_expires_at = NOW() + INTERVAL '90 days'
          WHERE id = ${user.id}
        `;
      } catch (refundErr) {
        // Critical: credit deducted but neither checkout nor refund succeeded.
        // Log as fatal so ops can reconcile manually.
        console.error("[createFundingSession] CRITICAL — platform credit refund failed:", refundErr);
        captureError(refundErr, {
          userId: user.id,
          campaignId,
          platformCreditCents,
          operation: "platform_credit.restore",
        }, "fatal");
        return { error: "A billing error occurred. Our team has been notified and will resolve it shortly." };
      }
    }
    console.error("[createFundingSession] Stripe error:", err);
    return { error: "Failed to create checkout session. Please try again." };
  }

  if (!session.url) return { error: "Failed to create checkout session." };

  return { url: session.url };
}

/**
 * Creates a Stripe Checkout session for a subscription upgrade.
 */
export async function createSubscriptionSession(
  tier: "pro"
): Promise<{ url: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  const priceId = getPlanConfig(tier).stripePriceId;
  if (!priceId) {
    return { error: `No Stripe price configured for ${tier} plan.` };
  }

  // Get or create Stripe customer
  let stripeCustomerId: string;

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id, full_name")
    .eq("id", user.id)
    .single();

  if (profile?.stripe_customer_id) {
    stripeCustomerId = profile.stripe_customer_id;
  } else {
    const customer = await stripe.customers.create({
      email: user.email,
      name: profile?.full_name || undefined,
      metadata: { userId: user.id },
    });
    stripeCustomerId = customer.id;

    await sql`
      UPDATE profiles SET stripe_customer_id = ${stripeCustomerId}
      WHERE id = ${user.id}
    `;
  }

  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: {
      userId: user.id,
      type: "subscription",
      tier,
    },
    success_url: `${env().NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard?subscribed=${tier}`,
    cancel_url: `${env().NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard?subscribed=false`,
  });

  if (!session.url) return { error: "Failed to create checkout session." };

  return { url: session.url };
}
