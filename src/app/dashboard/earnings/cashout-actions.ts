"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { DEFAULTS } from "@/lib/defaults";
import { logOps } from "@/lib/ops-logger";
import { captureError } from "@/lib/sentry";
import { rateLimit } from "@/lib/rate-limit";
import stripe from "@/lib/stripe";
import sql from "@/lib/db";

function cashoutIdempotencyKey(cashoutId: string, attemptCount: number): string {
  return `cashout_${cashoutId}_attempt_${Math.max(1, attemptCount)}`;
}

async function markSnapshotResponsesPaidOut(
  respondentId: string,
  snapshotAt: string | Date
) {
  await sql`
    UPDATE responses
    SET money_state = 'paid_out'
    WHERE respondent_id = ${respondentId}
      AND money_state = 'available'
      AND (available_at IS NULL OR available_at <= ${snapshotAt})
  `;
}

/* ─── Stripe Connect Onboarding ─── */

/**
 * Creates a Stripe Connect Express account for the respondent and returns
 * the Stripe-hosted onboarding URL. If the respondent already has an account
 * but hasn't completed onboarding, generates a fresh onboarding link.
 */
export async function createConnectOnboardingLink(): Promise<
  { url: string } | { error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const rl = rateLimit(`connect-onboard:${user.id}`, 300_000, 3); // 3 per 5 min
  if (!rl.allowed) return { error: "Too many attempts. Try again shortly." };

  // Fetch current Connect status
  const [profile] = await sql`
    SELECT stripe_connect_account_id, stripe_connect_onboarding_complete, full_name, role
    FROM profiles WHERE id = ${user.id}
  `;

  if (!profile) return { error: "Profile not found" };
  if (profile.role !== "respondent") return { error: "Only respondents can set up payouts" };

  let connectAccountId = profile.stripe_connect_account_id;

  // Create Express account if none exists
  if (!connectAccountId) {
    try {
      const account = await stripe.accounts.create({
        type: "express",
        metadata: { userId: user.id },
        capabilities: {
          transfers: { requested: true },
        },
        settings: {
          payouts: {
            schedule: { interval: "manual" },
          },
        },
      });

      connectAccountId = account.id;

      await sql`
        UPDATE profiles
        SET stripe_connect_account_id = ${connectAccountId}
        WHERE id = ${user.id}
      `;

      logOps({
        event: "connect.account_created",
        userId: user.id,
        stripeConnectAccountId: connectAccountId,
      });
    } catch (err) {
      console.error("[cashout] Failed to create Connect account:", err);
      captureError(err, { userId: user.id, operation: "connect.create_account" });
      return { error: "Failed to create payout account. Try again." };
    }
  }

  // Generate onboarding link
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const accountLink = await stripe.accountLinks.create({
      account: connectAccountId,
      refresh_url: `${appUrl}/dashboard/earnings?connect=refresh`,
      return_url: `${appUrl}/dashboard/earnings?connect=complete`,
      type: "account_onboarding",
    });

    return { url: accountLink.url };
  } catch (err) {
    console.error("[cashout] Failed to create onboarding link:", err);
    captureError(err, { userId: user.id, operation: "connect.create_link" });
    return { error: "Failed to generate setup link. Try again." };
  }
}

/* ─── Check Connect Status ─── */

/**
 * Checks the Stripe Connect account status directly with Stripe.
 * Called after onboarding return to verify completion.
 */
export async function checkConnectStatus(): Promise<
  { onboardingComplete: boolean; chargesEnabled: boolean } | { error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const [profile] = await sql`
    SELECT stripe_connect_account_id, stripe_connect_onboarding_complete
    FROM profiles WHERE id = ${user.id}
  `;

  if (!profile?.stripe_connect_account_id) {
    return { onboardingComplete: false, chargesEnabled: false };
  }

  try {
    const account = await stripe.accounts.retrieve(profile.stripe_connect_account_id);
    const chargesEnabled = account.charges_enabled ?? false;
    const detailsSubmitted = account.details_submitted ?? false;

    // Update our record if Stripe says onboarding is done
    if (detailsSubmitted && !profile.stripe_connect_onboarding_complete) {
      await sql`
        UPDATE profiles
        SET stripe_connect_onboarding_complete = true
        WHERE id = ${user.id}
      `;
    }

    return { onboardingComplete: detailsSubmitted, chargesEnabled };
  } catch (err) {
    console.error("[cashout] Failed to check Connect status:", err);
    captureError(err, { userId: user.id, operation: "connect.check_status" });
    return { error: "Failed to check account status" };
  }
}

/* ─── Request Cashout ─── */

/**
 * Initiates a cashout: deducts available_balance_cents atomically,
 * creates a cashout record, and initiates a Stripe Transfer.
 */
export async function requestCashout(): Promise<
  { cashoutId: string; amountCents: number } | { error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const rl = rateLimit(`cashout:${user.id}`, 600_000, 2); // 2 per 10 min
  if (!rl.allowed) return { error: "Too many cashout attempts. Try again in a few minutes." };

  // Fetch profile with Connect info + balance
  const [profile] = await sql`
    SELECT
      stripe_connect_account_id,
      stripe_connect_onboarding_complete,
      available_balance_cents,
      role
    FROM profiles WHERE id = ${user.id}
  `;

  if (!profile) return { error: "Profile not found" };
  if (profile.role !== "respondent") return { error: "Only respondents can cash out" };

  if (!profile.stripe_connect_account_id || !profile.stripe_connect_onboarding_complete) {
    return { error: "Please set up your bank account first" };
  }

  const balanceCents = Number(profile.available_balance_cents) || 0;
  if (balanceCents < DEFAULTS.MIN_CASHOUT_BALANCE_CENTS) {
    return {
      error: `Minimum cashout is $${(DEFAULTS.MIN_CASHOUT_BALANCE_CENTS / 100).toFixed(2)}`,
    };
  }

  // Verify Connect account is active with Stripe
  try {
    const account = await stripe.accounts.retrieve(profile.stripe_connect_account_id);
    if (!account.charges_enabled) {
      return { error: "Your payout account needs attention. Please complete setup." };
    }
  } catch (err) {
    captureError(err, { userId: user.id, operation: "cashout.verify_account" });
    return { error: "Could not verify payout account. Try again." };
  }

  // Atomic: deduct balance + create cashout record + initiate transfer
  let cashoutId: string;
  let cashoutSnapshotAt: string;
  let transferAttempt = 1;
  let transferId: string;

  try {
    // Use a transaction to atomically deduct balance and create cashout
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TransactionSql loses call signature
    const result = await sql.begin(async (tx: any) => {
      // Deduct balance atomically with a check (prevents double-spend)
      const [updated] = await tx`
        UPDATE profiles
        SET available_balance_cents = available_balance_cents - ${balanceCents},
            last_cashout_at = NOW()
        WHERE id = ${user.id}
          AND available_balance_cents >= ${balanceCents}
        RETURNING available_balance_cents
      `;

      if (!updated) {
        throw new Error("INSUFFICIENT_BALANCE");
      }

      // Create cashout record
      const [cashout] = await tx`
        INSERT INTO cashouts (respondent_id, amount_cents, status, attempt_count)
        VALUES (${user.id}, ${balanceCents}, 'processing', 1)
        RETURNING id, created_at, attempt_count
      `;

      return {
        cashoutId: cashout.id,
        createdAt: cashout.created_at,
        attemptCount: cashout.attempt_count,
      };
    });

    cashoutId = result.cashoutId;
    cashoutSnapshotAt = result.createdAt;
    transferAttempt = Number(result.attemptCount) || 1;
  } catch (err) {
    if (err instanceof Error && err.message === "INSUFFICIENT_BALANCE") {
      return { error: "Balance changed. Please refresh and try again." };
    }
    console.error("[cashout] Transaction failed:", err);
    captureError(err, { userId: user.id, operation: "cashout.transaction" });
    return { error: "Cashout failed. Your balance was not deducted." };
  }

  // Initiate Stripe Transfer (outside transaction — if this fails, we have the cashout record to reconcile)
  try {
    const transfer = await stripe.transfers.create({
      amount: balanceCents,
      currency: "usd",
      destination: profile.stripe_connect_account_id,
      metadata: {
        cashoutId,
        userId: user.id,
      },
    }, {
      idempotencyKey: cashoutIdempotencyKey(cashoutId, transferAttempt),
    });

    transferId = transfer.id;

    // Update cashout with transfer ID
    await sql`
      UPDATE cashouts
      SET stripe_transfer_id = ${transferId}
      WHERE id = ${cashoutId}
    `;

    await markSnapshotResponsesPaidOut(user.id, cashoutSnapshotAt);

    logOps({
      event: "cashout.initiated",
      userId: user.id,
      cashoutId,
      amountCents: balanceCents,
      stripeTransferId: transferId,
    });
  } catch (err) {
    console.error("[cashout] Stripe transfer failed:", err);
    captureError(err, { userId: user.id, cashoutId, operation: "cashout.transfer" });

    // Mark cashout as failed and refund the balance
    await sql`
      UPDATE cashouts SET status = 'failed', failure_reason = ${(err as Error).message || "Transfer failed"}
      WHERE id = ${cashoutId}
    `;
    await sql`
      UPDATE profiles
      SET available_balance_cents = available_balance_cents + ${balanceCents}
      WHERE id = ${user.id}
    `;

    return { error: "Transfer failed. Your balance has been restored." };
  }

  // Mark cashout as completed — only if still in processing state (idempotent)
  await sql`
    UPDATE cashouts SET status = 'completed', completed_at = NOW()
    WHERE id = ${cashoutId} AND status = 'processing'
  `;

  revalidatePath("/dashboard/earnings");

  return { cashoutId, amountCents: balanceCents };
}

/* ─── Retry Failed Cashout ─── */

/**
 * Retries a failed cashout. The balance was already refunded on failure,
 * so this is equivalent to requesting a new cashout.
 * We update the old cashout record instead of creating a new one.
 */
export async function retryCashout(
  cashoutId: string
): Promise<{ amountCents: number } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const rl = rateLimit(`cashout-retry:${user.id}`, 600_000, 2);
  if (!rl.allowed) return { error: "Too many retry attempts. Try again in a few minutes." };

  // Verify the cashout belongs to this user and is failed
  const [cashout] = await sql`
    SELECT id, amount_cents, status, created_at
    FROM cashouts
    WHERE id = ${cashoutId} AND respondent_id = ${user.id}
  `;

  if (!cashout) return { error: "Cashout not found" };
  if (cashout.status !== "failed") return { error: "Only failed cashouts can be retried" };

  // Fetch profile
  const [profile] = await sql`
    SELECT stripe_connect_account_id, stripe_connect_onboarding_complete, available_balance_cents
    FROM profiles WHERE id = ${user.id}
  `;

  if (!profile?.stripe_connect_account_id || !profile.stripe_connect_onboarding_complete) {
    return { error: "Please set up your bank account first" };
  }

  const amountCents = cashout.amount_cents;
  const currentBalance = Number(profile.available_balance_cents) || 0;

  if (currentBalance < amountCents) {
    return { error: `Insufficient balance. You need $${(amountCents / 100).toFixed(2)} but have $${(currentBalance / 100).toFixed(2)}.` };
  }

  // Atomically deduct balance + update cashout status in one transaction
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TransactionSql typing
  const txResult = await sql.begin(async (tx: any) => {
    const [updated] = await tx`
      UPDATE profiles
      SET available_balance_cents = available_balance_cents - ${amountCents},
          last_cashout_at = NOW()
      WHERE id = ${user.id}
        AND available_balance_cents >= ${amountCents}
      RETURNING available_balance_cents
    `;
    if (!updated) return { error: "Balance changed. Please refresh." } as const;

    const [updatedCashout] = await tx`
      UPDATE cashouts
      SET status = 'processing',
          failure_reason = NULL,
          attempt_count = attempt_count + 1
      WHERE id = ${cashoutId}
      RETURNING attempt_count, created_at
    `;
    return {
      ok: true,
      attemptCount: Number(updatedCashout?.attempt_count) || 1,
      snapshotAt: updatedCashout?.created_at || cashout.created_at,
    } as const;
  });

  if ("error" in txResult) return { error: txResult.error as string };

  // Attempt transfer
  try {
    const transfer = await stripe.transfers.create({
      amount: amountCents,
      currency: "usd",
      destination: profile.stripe_connect_account_id,
      metadata: { cashoutId, userId: user.id },
    }, {
      idempotencyKey: cashoutIdempotencyKey(cashoutId, txResult.attemptCount),
    });

    await sql`
      UPDATE cashouts
      SET stripe_transfer_id = ${transfer.id}, status = 'completed', completed_at = NOW()
      WHERE id = ${cashoutId} AND status = 'processing'
    `;

    await markSnapshotResponsesPaidOut(user.id, txResult.snapshotAt);

    logOps({
      event: "cashout.initiated",
      userId: user.id,
      cashoutId,
      amountCents,
      stripeTransferId: transfer.id,
    });

    revalidatePath("/dashboard/earnings");
    return { amountCents };
  } catch (err) {
    console.error("[cashout-retry] Transfer failed:", err);
    captureError(err, { userId: user.id, cashoutId, operation: "cashout.retry_transfer" });

    // Refund and mark failed again
    await sql`
      UPDATE cashouts SET status = 'failed', failure_reason = ${(err as Error).message || "Transfer failed"}
      WHERE id = ${cashoutId}
    `;
    await sql`
      UPDATE profiles SET available_balance_cents = available_balance_cents + ${amountCents}
      WHERE id = ${user.id}
    `;

    return { error: "Transfer failed again. Your balance has been restored." };
  }
}
