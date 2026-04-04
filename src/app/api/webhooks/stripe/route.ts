import stripe from "@/lib/stripe";
import sql from "@/lib/db";
import { normalizeTier } from "@/lib/plans";
import { DEFAULTS } from "@/lib/defaults";
import type Stripe from "stripe";
import { logOps } from "@/lib/ops-logger";
import { captureError, captureWarning } from "@/lib/sentry";
import { stripeWebhookEnv } from "@/lib/env";
import { getStatusAfterFunding, type GateStatus } from "@/lib/reciprocal-gate";

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
      stripeWebhookEnv().STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[stripe-webhook] Signature verification failed:", message);
    captureError(err, { operation: "stripe.webhook.signature" });
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Deduplication check. We only record success after the handler completes,
  // so failed deliveries can retry cleanly.
  const [existing] = await sql`
    SELECT event_id
    FROM processed_stripe_events
    WHERE event_id = ${event.id}
  `;
  if (existing) {
    return Response.json({ received: true, deduplicated: true });
  }

  switch (event.type) {
    /* ─── Campaign Funding ─── */
    case "checkout.session.completed": {
      const session = event.data.object;
      const sessionId = session.id;
      const paymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id ?? null;

      // Subscription checkouts are handled by customer.subscription.created
      if (session.mode === "subscription") break;

      const campaignId = session.metadata?.campaignId;
      if (!campaignId) {
        console.error("[stripe-webhook] No campaignId in session metadata");
        break;
      }

      try {
        // If this was a welcome-credit campaign, mark the credit as used
        const userId = session.metadata?.userId;
        const welcomeCreditUsed = session.metadata?.welcomeCredit === "true";
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TransactionSql loses call signature
        const completion = await sql.begin(async (tx: any) => {
          const [campaign] = await tx`
            SELECT status, reciprocal_gate_status, reserved_checkout_session_id
            FROM campaigns
            WHERE id = ${campaignId}
            FOR UPDATE
          `;
          if (!campaign) {
            return {
              kind: "stale" as const,
              reason: "campaign_not_found" as const,
              reservedCheckoutSessionId: null,
            };
          }

          const reservedCheckoutSessionId =
            campaign.reserved_checkout_session_id ?? null;
          if (campaign.status !== "pending_funding") {
            return {
              kind: "stale" as const,
              reason: "campaign_not_pending" as const,
              reservedCheckoutSessionId,
            };
          }
          if (!reservedCheckoutSessionId || reservedCheckoutSessionId !== sessionId) {
            return {
              kind: "stale" as const,
              reason: "session_mismatch" as const,
              reservedCheckoutSessionId,
            };
          }

          const nextStatus = getStatusAfterFunding(
            (campaign.reciprocal_gate_status as GateStatus | null) ?? null
          );
          const expiryInterval = `${DEFAULTS.CAMPAIGN_EXPIRY_DAYS} days`;

          await tx`
            UPDATE campaigns
            SET funded_at = NOW(),
                stripe_payment_intent_id = ${paymentIntentId},
                reserved_platform_credit_cents = 0,
                reserved_platform_credit_expires_at = NULL,
                reserved_checkout_session_id = NULL,
                status = ${nextStatus},
                expires_at = CASE
                  WHEN ${nextStatus} = 'active'
                    THEN NOW() + ${expiryInterval}::interval
                  ELSE expires_at
                END
            WHERE id = ${campaignId}
              AND status = 'pending_funding'
          `;

          if (userId && welcomeCreditUsed) {
            await tx`
              UPDATE subscriptions
              SET welcome_credit_used = true, updated_at = NOW()
              WHERE user_id = ${userId}
            `;
          }

          return {
            kind: "funded" as const,
            fundedStatus: nextStatus,
          };
        });

        if (completion.kind !== "funded") {
          if (!paymentIntentId) {
            captureWarning("Stale funding checkout completed without payment_intent", {
              campaignId,
              stripeEventId: event.id,
              operation: "stripe.campaign.stale_checkout_missing_payment_intent",
            });
            logOps({
              event: "webhook.processed",
              stripeEventId: event.id,
              eventType: event.type,
              result: "no_op",
              detail: `Ignored stale checkout ${sessionId} for campaign ${campaignId} (${completion.reason})`,
            });
            break;
          }

          try {
            await stripe.refunds.create(
              {
                payment_intent: paymentIntentId,
                reason: "duplicate",
                metadata: {
                  campaignId,
                  checkoutSessionId: sessionId,
                  staleReason: completion.reason,
                },
              },
              {
                idempotencyKey: `stale_checkout_refund_${sessionId}`,
              }
            );
          } catch (refundErr) {
            console.error(
              "[stripe-webhook] Failed to refund stale checkout session:",
              refundErr
            );
            captureError(refundErr, {
              campaignId,
              stripeEventId: event.id,
              operation: "stripe.campaign.refund_stale_checkout",
            });
            return Response.json({ error: "Refund failed" }, { status: 500 });
          }

          logOps({
            event: "webhook.processed",
            stripeEventId: event.id,
            eventType: event.type,
            result: "success",
            detail: `Refunded stale checkout ${sessionId} for campaign ${campaignId} (${completion.reason})`,
          });
          break;
        }

        const fundedStatus = completion.fundedStatus;
        logOps({
          event: "campaign.funded",
          campaignId,
          rewardAmount: (session.amount_total ?? 0) / 100,
          distributableAmount: 0, // Already calculated at campaign creation
          stripePaymentIntentId: paymentIntentId ?? undefined,
          welcomeCreditUsed,
        });
        logOps({
          event: "campaign.status_changed",
          campaignId,
          fromStatus: "pending_funding",
          toStatus: fundedStatus,
          triggeredBy: "webhook",
        });
        logOps({
          event: "webhook.processed",
          stripeEventId: event.id,
          eventType: event.type,
          result: "success",
          detail: `Campaign ${campaignId} moved to ${fundedStatus}`,
        });
      } catch (err) {
        console.error("[stripe-webhook] Failed to activate campaign:", err);
        captureError(err, { campaignId: campaignId!, stripeEventId: event.id, operation: "stripe.campaign.activate" });
        return Response.json({ error: "DB update failed" }, { status: 500 });
      }
      break;
    }

    case "checkout.session.expired":
    case "checkout.session.async_payment_failed": {
      const session = event.data.object;

      if (session.mode === "subscription") break;

      const campaignId = session.metadata?.campaignId;
      if (!campaignId) break;

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TransactionSql loses call signature
        const restoredCreditCents = await sql.begin(async (tx: any) => {
          const [campaign] = await tx`
            SELECT
              creator_id,
              reserved_platform_credit_cents,
              reserved_platform_credit_expires_at
            FROM campaigns
            WHERE id = ${campaignId}
              AND status = 'pending_funding'
              AND reserved_checkout_session_id = ${session.id}
            FOR UPDATE
          `;

          if (!campaign) return null;

          const reservedCreditCents = Math.max(
            0,
            Math.floor(Number(campaign.reserved_platform_credit_cents) || 0)
          );

          if (reservedCreditCents > 0) {
            await tx`
              UPDATE profiles
              SET platform_credit_cents = platform_credit_cents + ${reservedCreditCents},
                  platform_credit_expires_at = COALESCE(
                    platform_credit_expires_at,
                    ${campaign.reserved_platform_credit_expires_at ?? null}
                  )
              WHERE id = ${campaign.creator_id}
            `;
          }

          await tx`
            UPDATE campaigns
            SET reserved_platform_credit_cents = 0,
                reserved_platform_credit_expires_at = NULL,
                reserved_checkout_session_id = NULL
            WHERE id = ${campaignId}
          `;

          return reservedCreditCents;
        });

        logOps({
          event: "webhook.processed",
          stripeEventId: event.id,
          eventType: event.type,
          result: restoredCreditCents === null ? "no_op" : "success",
          detail:
            restoredCreditCents === null
              ? `No reservation to release for campaign ${campaignId}`
              : `Released ${restoredCreditCents} reserved credit cents for campaign ${campaignId}`,
        });
      } catch (err) {
        console.error("[stripe-webhook] Failed to release reserved credit:", err);
        captureError(err, {
          campaignId,
          stripeEventId: event.id,
          operation: "stripe.campaign.release_reserved_credit",
        });
        return Response.json({ error: "DB update failed" }, { status: 500 });
      }
      break;
    }

    /* ─── Subscription Created ─── */
    case "customer.subscription.created": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.userId;
      const rawTier = subscription.metadata?.tier;
      const tier = normalizeTier(rawTier);

      if (!userId || !rawTier || !tier) {
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

      const rawTier = subscription.metadata?.tier;
      const tier = normalizeTier(rawTier);
      const status = subscription.status === "active" ? "active"
        : subscription.status === "past_due" ? "past_due"
        : subscription.status === "trialing" ? "trialing"
        : subscription.status === "incomplete" ? "past_due"   // initial payment pending — don't prematurely cancel
        : subscription.status === "unpaid" ? "past_due"       // invoice retries exhausted but not yet canceled
        : "canceled";

      const item = subscription.items.data[0];
      const periodStart = new Date(item.current_period_start * 1000);
      const periodEnd = new Date(item.current_period_end * 1000);

      try {
        if (rawTier && tier) {
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

    /* ─── Charge Refunded ─── */
    // If a campaign-funding charge is fully refunded, reset the welcome credit
    // so the founder can use it on their next campaign.
    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId =
        typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : null;

      // Only handle full refunds for payment-intent charges
      if (!paymentIntentId || !charge.refunded) break;

      try {
        // Look up the checkout session to get campaign metadata
        const sessions = await stripe.checkout.sessions.list({
          payment_intent: paymentIntentId,
          limit: 1,
        });
        const session = sessions.data[0];
        if (!session || session.metadata?.type !== "campaign_funding") break;

        const welcomeCreditUsed = session.metadata?.welcomeCredit === "true";
        const userId = session.metadata?.userId;
        if (!welcomeCreditUsed || !userId) break;

        // Reset welcome_credit_used so the founder can use it on their next campaign
        await sql`
          UPDATE subscriptions
          SET welcome_credit_used = false, updated_at = NOW()
          WHERE user_id = ${userId}
            AND welcome_credit_used = true
        `;

        logOps({
          event: "webhook.processed",
          stripeEventId: event.id,
          eventType: event.type,
          result: "success",
          detail: `Reset welcome_credit_used for user ${userId} after full refund of ${paymentIntentId}`,
        });
      } catch (err) {
        // Non-fatal: log and continue. Don't return 500 (would trigger Stripe retry).
        console.error("[stripe-webhook] Failed to reset welcome credit on refund:", err);
        captureError(err, { stripeEventId: event.id, operation: "stripe.charge.refund_reset_credit" });
      }
      break;
    }

    default:
      // Unhandled event type — ignore
      break;
  }

  await sql`
    INSERT INTO processed_stripe_events (event_id, event_type)
    VALUES (${event.id}, ${event.type})
    ON CONFLICT (event_id) DO NOTHING
  `;

  return Response.json({ received: true });
}
