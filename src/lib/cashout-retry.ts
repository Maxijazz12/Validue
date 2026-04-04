import type { SqlRunner } from "@/lib/postgres-types";

export type CashoutRetryClaim = {
  attemptCount: number;
  snapshotAt: string | Date;
};

/**
 * Claims a failed cashout for retry and atomically re-deducts the balance.
 * Returns null when another request already claimed the cashout.
 */
export async function claimFailedCashoutRetry(
  db: SqlRunner,
  cashoutId: string,
  respondentId: string,
  amountCents: number
): Promise<CashoutRetryClaim | null> {
  const [updatedCashout] = await db`
    UPDATE cashouts
    SET status = 'processing',
        failure_reason = NULL,
        attempt_count = attempt_count + 1
    WHERE id = ${cashoutId}
      AND respondent_id = ${respondentId}
      AND status = 'failed'
    RETURNING attempt_count, created_at
  `;

  if (!updatedCashout) {
    return null;
  }

  const [updatedProfile] = await db`
    UPDATE profiles
    SET available_balance_cents = available_balance_cents - ${amountCents},
        last_cashout_at = NOW()
    WHERE id = ${respondentId}
      AND available_balance_cents >= ${amountCents}
    RETURNING id
  `;

  if (!updatedProfile) {
    throw new Error("INSUFFICIENT_BALANCE");
  }

  return {
    attemptCount: Number(updatedCashout.attempt_count) || 1,
    snapshotAt: (updatedCashout.created_at as string | Date) ?? new Date(),
  };
}
