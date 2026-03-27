"use server";

import { createClient } from "@/lib/supabase/server";
import stripe from "@/lib/stripe";
import sql from "@/lib/db";
import { getSubscription } from "@/lib/plan-guard";
import { validateFunding } from "@/lib/reach";

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
    .select("id, creator_id, title, reward_amount, status")
    .eq("id", campaignId)
    .eq("creator_id", user.id)
    .single();

  if (!campaign) return { error: "Campaign not found." };
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

  // Create Checkout Session
  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: Math.round(campaign.reward_amount * 100),
          product_data: {
            name: `Campaign: ${campaign.title}`,
            description: "Reward pool funding for VLDTA campaign",
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      campaignId: campaign.id,
      userId: user.id,
      type: "campaign_funding",
    },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/ideas/${campaign.id}?funded=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/ideas/${campaign.id}?funded=false`,
  });

  if (!session.url) return { error: "Failed to create checkout session." };

  return { url: session.url };
}

/**
 * Creates a Stripe Checkout session for a subscription upgrade.
 */
export async function createSubscriptionSession(
  tier: "starter" | "pro" | "scale"
): Promise<{ url: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  const priceIds: Record<string, string | undefined> = {
    starter: process.env.STRIPE_STARTER_PRICE_ID,
    pro: process.env.STRIPE_PRO_PRICE_ID,
    scale: process.env.STRIPE_SCALE_PRICE_ID,
  };

  const priceId = priceIds[tier];
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
    success_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard?subscribed=${tier}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard?subscribed=false`,
  });

  if (!session.url) return { error: "Failed to create checkout session." };

  return { url: session.url };
}
