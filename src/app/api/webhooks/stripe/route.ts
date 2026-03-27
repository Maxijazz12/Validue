import stripe from "@/lib/stripe";
import sql from "@/lib/db";
import { isValidTier } from "@/lib/plans";
import type Stripe from "stripe";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return Response.json({ error: "Missing signature" }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[stripe-webhook] Signature verification failed:", message);
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    /* ─── Campaign Funding ─── */
    case "checkout.session.completed": {
      const session = event.data.object;

      // Subscription checkouts are handled by customer.subscription.created
      if (session.mode === "subscription") break;

      const campaignId = session.metadata?.campaignId;
      if (!campaignId) {
        console.error("[stripe-webhook] No campaignId in session metadata");
        break;
      }

      try {
        await sql`
          UPDATE campaigns
          SET status = 'active',
              funded_at = NOW(),
              stripe_payment_intent_id = ${(session.payment_intent as string) || null}
          WHERE id = ${campaignId}
            AND status = 'pending_funding'
        `;
        console.log(`[stripe-webhook] Campaign ${campaignId} funded and activated`);
      } catch (err) {
        console.error("[stripe-webhook] Failed to activate campaign:", err);
        return Response.json({ error: "DB update failed" }, { status: 500 });
      }
      break;
    }

    /* ─── Subscription Created ─── */
    case "customer.subscription.created": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.userId;
      const tier = subscription.metadata?.tier;

      if (!userId || !tier || !isValidTier(tier)) {
        console.error("[stripe-webhook] Missing userId or invalid tier in subscription metadata");
        break;
      }

      const item = subscription.items.data[0];
      const periodStart = new Date(item.current_period_start * 1000);
      const periodEnd = new Date(item.current_period_end * 1000);

      try {
        await sql`
          INSERT INTO subscriptions (
            user_id, tier, stripe_subscription_id, stripe_price_id,
            status, current_period_start, current_period_end,
            campaigns_used_this_period
          ) VALUES (
            ${userId}, ${tier}, ${subscription.id},
            ${item.price?.id ?? null},
            'active',
            ${periodStart},
            ${periodEnd},
            0
          )
          ON CONFLICT (user_id) DO UPDATE SET
            tier = ${tier},
            stripe_subscription_id = ${subscription.id},
            stripe_price_id = ${item.price?.id ?? null},
            status = 'active',
            current_period_start = ${periodStart},
            current_period_end = ${periodEnd},
            campaigns_used_this_period = 0,
            updated_at = NOW()
        `;
        console.log(`[stripe-webhook] Subscription created: ${userId} → ${tier}`);
      } catch (err) {
        console.error("[stripe-webhook] Failed to create subscription:", err);
        return Response.json({ error: "DB update failed" }, { status: 500 });
      }
      break;
    }

    /* ─── Subscription Updated (renewal, plan change) ─── */
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const stripeSubId = subscription.id;

      const tier = subscription.metadata?.tier;
      const status = subscription.status === "active" ? "active"
        : subscription.status === "past_due" ? "past_due"
        : subscription.status === "trialing" ? "trialing"
        : "canceled";

      const item = subscription.items.data[0];
      const periodStart = new Date(item.current_period_start * 1000);
      const periodEnd = new Date(item.current_period_end * 1000);

      try {
        if (tier && isValidTier(tier)) {
          // Tier change + period update
          await sql`
            UPDATE subscriptions
            SET status = ${status},
                tier = ${tier},
                current_period_start = ${periodStart},
                current_period_end = ${periodEnd},
                campaigns_used_this_period = CASE
                  WHEN current_period_start < ${periodStart} THEN 0
                  ELSE campaigns_used_this_period
                END,
                updated_at = NOW()
            WHERE stripe_subscription_id = ${stripeSubId}
          `;
        } else {
          // Period update only (no tier change)
          await sql`
            UPDATE subscriptions
            SET status = ${status},
                current_period_start = ${periodStart},
                current_period_end = ${periodEnd},
                campaigns_used_this_period = CASE
                  WHEN current_period_start < ${periodStart} THEN 0
                  ELSE campaigns_used_this_period
                END,
                updated_at = NOW()
            WHERE stripe_subscription_id = ${stripeSubId}
          `;
        }
        console.log(`[stripe-webhook] Subscription updated: ${stripeSubId}`);
      } catch (err) {
        console.error("[stripe-webhook] Failed to update subscription:", err);
        return Response.json({ error: "DB update failed" }, { status: 500 });
      }
      break;
    }

    /* ─── Subscription Canceled ─── */
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;

      try {
        await sql`
          UPDATE subscriptions
          SET tier = 'free',
              status = 'canceled',
              stripe_subscription_id = NULL,
              stripe_price_id = NULL,
              updated_at = NOW()
          WHERE stripe_subscription_id = ${subscription.id}
        `;
        console.log(`[stripe-webhook] Subscription canceled: ${subscription.id}`);
      } catch (err) {
        console.error("[stripe-webhook] Failed to cancel subscription:", err);
        return Response.json({ error: "DB update failed" }, { status: 500 });
      }
      break;
    }

    default:
      // Unhandled event type — ignore
      break;
  }

  return Response.json({ received: true });
}
