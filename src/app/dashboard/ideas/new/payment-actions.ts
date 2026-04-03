"use server";

import { createClient } from "@/lib/supabase/server";
import stripe from "@/lib/stripe";
import sql from "@/lib/db";
import { getSubscription, isFirstMonth, isFirstCampaign } from "@/lib/plan-guard";
import { validateFunding } from "@/lib/reach";
import { WELCOME_BONUS, getPlanConfig } from "@/lib/plans";
import { env } from "@/lib/env";
import { captureError } from "@/lib/sentry";
import { resolveFundingCredits } from "@/lib/funding-credits";
import { getStatusAfterFunding, type GateStatus } from "@/lib/reciprocal-gate";
import { DEFAULTS } from "@/lib/defaults";

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
    .select("id, creator_id, title, reward_amount, status, is_subsidized, reciprocal_gate_status")
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

  // Check welcome credit eligibility (free tier, first month, first campaign, not yet used)
  let useWelcomeCredit = false;
  if (sub.tier === "free") {
    const firstMonth = await isFirstMonth(user.id);
    if (firstMonth) {
      const firstCampaign = await isFirstCampaign(user.id, {
        excludeCampaignId: campaign.id,
      });
      if (firstCampaign) {
        const [subRow] = await sql`
          SELECT welcome_credit_used FROM subscriptions WHERE user_id = ${user.id}
        `;
        useWelcomeCredit = !subRow || !subRow.welcome_credit_used;
      }
    }
  }

  const fullAmountCents = Math.round(campaign.reward_amount * 100);
  let appliedWelcomeCreditCents = 0;
  let appliedPlatformCreditCents = 0;
  let chargeAmountCents = 0;
  let platformSubsidyCents = 0;
  let originalPlatformCreditExpiresAt: string | null = null;

  // Eagerly deduct only the platform credit actually applied so concurrent
  // funding attempts cannot spend the same balance twice.
  {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TransactionSql loses call signature
    await sql.begin(async (tx: any) => {
      const [creditRow] = await tx`
        SELECT platform_credit_cents, platform_credit_expires_at
        FROM profiles WHERE id = ${user.id}
        FOR UPDATE
      `;
      originalPlatformCreditExpiresAt = creditRow?.platform_credit_expires_at ?? null;

      const rawCredit = Math.max(
        0,
        Math.floor(Number(creditRow?.platform_credit_cents) || 0)
      );
      const expires = creditRow?.platform_credit_expires_at
        ? new Date(creditRow.platform_credit_expires_at)
        : null;
      const availablePlatformCreditCents =
        rawCredit > 0 && (!expires || expires > new Date()) ? rawCredit : 0;
      const resolution = resolveFundingCredits({
        fullAmountCents,
        welcomeCreditEligible: useWelcomeCredit,
        welcomeCreditCents: WELCOME_BONUS.fundingCreditCents,
        platformCreditAvailableCents: availablePlatformCreditCents,
      });

      appliedWelcomeCreditCents = resolution.appliedWelcomeCreditCents;
      appliedPlatformCreditCents = resolution.appliedPlatformCreditCents;
      chargeAmountCents = resolution.chargeAmountCents;
      platformSubsidyCents = resolution.platformSubsidyCents;

      if (appliedPlatformCreditCents > 0) {
        await tx`
          UPDATE profiles
          SET platform_credit_cents = GREATEST(0, platform_credit_cents - ${appliedPlatformCreditCents}),
              platform_credit_expires_at = CASE
                WHEN platform_credit_cents - ${appliedPlatformCreditCents} <= 0 THEN NULL
                ELSE platform_credit_expires_at
              END
          WHERE id = ${user.id}
        `;
      }
    });
  }

  const restorePlatformCredit = async () => {
    if (appliedPlatformCreditCents <= 0) return true;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await sql`
          UPDATE profiles
          SET platform_credit_cents = platform_credit_cents + ${appliedPlatformCreditCents},
              platform_credit_expires_at = ${originalPlatformCreditExpiresAt}
          WHERE id = ${user.id}
        `;
        return true;
      } catch (refundErr) {
        if (attempt === 1) {
          console.error("[createFundingSession] CRITICAL — platform credit refund failed after retry:", refundErr);
          captureError(refundErr, {
            userId: user.id,
            campaignId,
            platformCreditCents: appliedPlatformCreditCents,
            operation: "platform_credit.restore",
          }, "fatal");
          return false;
        }
      }
    }

    return false;
  };

  if (chargeAmountCents === 0) {
    const expiryInterval = `${DEFAULTS.CAMPAIGN_EXPIRY_DAYS} days`;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TransactionSql loses call signature
      await sql.begin(async (tx: any) => {
        const [lockedCampaign] = await tx`
          SELECT reciprocal_gate_status
          FROM campaigns
          WHERE id = ${campaign.id}
            AND creator_id = ${user.id}
            AND status = 'pending_funding'
          FOR UPDATE
        `;

        if (!lockedCampaign) {
          throw new Error("Campaign does not need funding.");
        }

        const fundedStatus = getStatusAfterFunding(
          (lockedCampaign.reciprocal_gate_status as GateStatus | null) ?? null
        );

        await tx`
          UPDATE campaigns
          SET funded_at = NOW(),
              status = ${fundedStatus},
              expires_at = CASE
                WHEN ${fundedStatus} = 'active'
                  THEN NOW() + ${expiryInterval}::interval
                ELSE expires_at
              END,
              updated_at = NOW()
          WHERE id = ${campaign.id}
            AND creator_id = ${user.id}
            AND status = 'pending_funding'
        `;

        if (appliedWelcomeCreditCents > 0) {
          await tx`
            UPDATE subscriptions
            SET welcome_credit_used = true, updated_at = NOW()
            WHERE user_id = ${user.id}
          `;
        }
      });
    } catch (err) {
      const restored = await restorePlatformCredit();
      if (!restored) {
        return { error: "A billing error occurred. Our team has been notified and will resolve it shortly." };
      }
      console.error("[createFundingSession] Immediate funding error:", err);
      return { error: "Failed to fund campaign. Please try again." };
    }

    return {
      url: `${env().NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/ideas/${campaign.id}?funded=true`,
    };
  }

  const totalCreditCents = appliedWelcomeCreditCents + appliedPlatformCreditCents;

  // Get or create Stripe customer only when an actual Stripe charge is needed.
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
        welcomeCredit: appliedWelcomeCreditCents > 0 ? "true" : "false",
        platformCreditCents: appliedPlatformCreditCents > 0 ? String(appliedPlatformCreditCents) : "0",
        platformSubsidyCents: platformSubsidyCents > 0 ? String(platformSubsidyCents) : "0",
      },
      success_url: `${env().NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/ideas/${campaign.id}?funded=true`,
      cancel_url: `${env().NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/ideas/${campaign.id}?funded=false`,
    });
  } catch (err) {
    const restored = await restorePlatformCredit();
    if (!restored) {
      return { error: "A billing error occurred. Our team has been notified and will resolve it shortly." };
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
