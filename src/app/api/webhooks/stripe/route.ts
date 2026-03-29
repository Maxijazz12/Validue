import stripe from "@/lib/stripe";
import sql from "@/lib/db";
import { isValidTier } from "@/lib/plans";
import { DEFAULTS } from "@/lib/defaults";
import type Stripe from "stripe";
import { logOps } from "@/lib/ops-logger";
import { captureError } from "@/lib/sentry";

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
    captureError(err, { operation: "stripe.webhook.signature" });
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
        // Set expires_at for V2 campaigns (CAMPAIGN_EXPIRY_DAYS after activation)
        const expiryInterval = `${DEFAULTS.CAMPAIGN_EXPIRY_DAYS} days`;
        await sql`
          UPDATE campaigns
          SET status = 'active',
              funded_at = NOW(),
              expires_at = CASE
                WHEN economics_version = 2 THEN NOW() + ${expiryInterval}::interval
                ELSE expires_at
              END,
              stripe_payment_intent_id = ${(session.payment_intent as string) || null}
          WHERE id = ${campaignId}
            AND status = 'pending_funding'
        `;

        // If this was a welcome-credit campaign, mark the credit as used
        const userId = session.metadata?.userId;
        const welcomeCreditUsed = session.metadata?.welcomeCredit === "true";
        if (userId && welcomeCreditUsed) {
          await sql`
            UPDATE subscriptions
            SET welcome_credit_used = true, updated_at = NOW()
            WHERE user_id = ${userId}
          `.catch((err) => {
            console.error("[stripe-webhook] Failed to mark welcome credit used:", err);
          });
        }

        // V2: Clear platform credit if it was applied
        const platformCreditUsed = Number(session.metadata?.platformCreditCents || 0);
        if (userId && platformCreditUsed > 0) {
          await sql`
            UPDATE profiles
            SET platform_credit_cents = GREATEST(0, platform_credit_cents - ${platformCreditUsed}),
                platform_credit_expires_at = CASE
                  WHEN platform_credit_cents - ${platformCreditUsed} <= 0 THEN NULL
                  ELSE platform_credit_expires_at
                END
            WHERE id = ${userId}
          `.catch((err) => {
            console.error("[stripe-webhook] Failed to clear platform credit:", err);
          });
        }

        logOps({
          event: "campaign.funded",
          campaignId,
          rewardAmount: (session.amount_total ?? 0) / 100,
          distributableAmount: 0, // Already calculated at campaign creation
          stripePaymentIntentId: (session.payment_intent as string) || undefined,
          welcomeCreditUsed,
        });
        logOps({
          event: "campaign.status_changed",
          campaignId,
          fromStatus: "pending_funding",
          toStatus: "active",
          triggeredBy: "webhook",
        });
        logOps({
          event: "webhook.processed",
          stripeEventId: event.id,
          eventType: event.type,
          result: "success",
          detail: `Campaign ${campaignId} activated`,
        });
      } catch (err) {
        console.error("[stripe-webhook] Failed to activate campaign:", err);
        captureError(err, { campaignId: campaignId!, stripeEventId: event.id, operation: "stripe.campaign.activate" });
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
        logOps({ event: "webhook.processed", stripeEventId: event.id, eventType: event.type, result: "success", detail: `${userId} → ${tier}` });
      } catch (err) {
        console.error("[stripe-webhook] Failed to create subscription:", err);
        captureError(err, { userId: userId!, stripeEventId: event.id, operation: "stripe.subscription.create" });
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
        logOps({ event: "webhook.processed", stripeEventId: event.id, eventType: event.type, result: "success", detail: `Updated ${stripeSubId}` });
      } catch (err) {
        console.error("[stripe-webhook] Failed to update subscription:", err);
        captureError(err, { stripeEventId: event.id, operation: "stripe.subscription.update" });
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
        logOps({ event: "webhook.processed", stripeEventId: event.id, eventType: event.type, result: "success", detail: `Canceled ${subscription.id}` });
      } catch (err) {
        console.error("[stripe-webhook] Failed to cancel subscription:", err);
        captureError(err, { stripeEventId: event.id, operation: "stripe.subscription.cancel" });
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
