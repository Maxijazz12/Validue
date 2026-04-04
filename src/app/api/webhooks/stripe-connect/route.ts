import stripe from "@/lib/stripe";
import sql from "@/lib/db";
import type Stripe from "stripe";
import { env } from "@/lib/env";
import { logOps } from "@/lib/ops-logger";
import { captureError } from "@/lib/sentry";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return Response.json({ error: "Missing signature" }, { status: 400 });
  }

  const webhookSecret = env().STRIPE_CONNECT_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[stripe-connect-webhook] STRIPE_CONNECT_WEBHOOK_SECRET not configured");
    return Response.json({ error: "Webhook not configured" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[stripe-connect-webhook] Signature verification failed:", message);
    captureError(err, { operation: "stripe.connect.webhook.signature" });
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Deduplication check. Record success only after the event has been handled
  // so failed deliveries can retry.
  const [existing] = await sql`
    SELECT event_id
    FROM processed_stripe_events
    WHERE event_id = ${event.id}
  `;
  if (existing) {
    return Response.json({ received: true, deduplicated: true });
  }

  switch (event.type) {
    /* ─── Connect Account Updated (onboarding complete, requirements change) ─── */
    case "account.updated": {
      const account = event.data.object as Stripe.Account;
      const userId = account.metadata?.userId;

      if (!userId) {
        // Not one of our managed accounts — ignore
        break;
      }

      const detailsSubmitted = account.details_submitted ?? false;

      try {
        if (detailsSubmitted) {
          await sql`
            UPDATE profiles
            SET stripe_connect_onboarding_complete = true
            WHERE stripe_connect_account_id = ${account.id}
          `;
        }

        logOps({
          event: "webhook.processed",
          stripeEventId: event.id,
          eventType: event.type,
          result: "success",
          detail: `Connect account ${account.id} updated (details_submitted=${detailsSubmitted})`,
        });
      } catch (err) {
        console.error("[stripe-connect-webhook] Failed to update Connect status:", err);
        captureError(err, { stripeEventId: event.id, operation: "stripe.connect.account_updated" });
        return Response.json({ error: "DB update failed" }, { status: 500 });
      }
      break;
    }

    default:
      break;
  }

  await sql`
    INSERT INTO processed_stripe_events (event_id, event_type)
    VALUES (${event.id}, ${event.type})
    ON CONFLICT (event_id) DO NOTHING
  `;

  return Response.json({ received: true });
}
