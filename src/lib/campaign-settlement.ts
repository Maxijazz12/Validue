import type { SqlRunner } from "@/lib/postgres-types";

export type CampaignPayoutSettlement = {
  lockedCount: number;
  respondentCount: number;
};

/**
 * Releases locked campaign payouts into respondents' available balances.
 * Throws if the balance move cannot be reconciled so callers can roll back.
 */
export async function settleLockedCampaignPayouts(
  db: SqlRunner,
  campaignId: string
): Promise<CampaignPayoutSettlement> {
  const lockedRespondents = await db`
    SELECT
      respondent_id,
      COUNT(*)::int AS locked_count,
      SUM(COALESCE(payout_amount, 0)) AS total
    FROM responses
    WHERE campaign_id = ${campaignId}
      AND money_state = 'locked'
    GROUP BY respondent_id
  `;

  const lockedCount = lockedRespondents.reduce(
    (sum: number, row: Record<string, unknown>) =>
      sum + (Number(row.locked_count) || 0),
    0
  );

  if (lockedCount === 0) {
    return { lockedCount: 0, respondentCount: 0 };
  }

  await db`
    UPDATE responses
    SET money_state = 'available',
        available_at = NOW()
    WHERE campaign_id = ${campaignId}
      AND money_state = 'locked'
  `;

  await db`
    UPDATE payouts
    SET status = 'processing'
    WHERE campaign_id = ${campaignId}
      AND status = 'pending'
  `;

  for (const row of lockedRespondents) {
    const rawTotal = Number(row.total);
    if (!Number.isFinite(rawTotal)) {
      throw new Error(
        `Invalid locked payout total for respondent ${String(row.respondent_id)}`
      );
    }

    const cents = Math.round(rawTotal * 100);
    if (cents <= 0) continue;

    const [updated] = await db`
      UPDATE profiles
      SET pending_balance_cents = pending_balance_cents - ${cents},
          available_balance_cents = available_balance_cents + ${cents}
      WHERE id = ${String(row.respondent_id)}
        AND pending_balance_cents >= ${cents}
      RETURNING id
    `;

    if (!updated) {
      throw new Error(
        `Pending balance mismatch while settling campaign ${campaignId} for respondent ${String(row.respondent_id)}`
      );
    }
  }

  return {
    lockedCount,
    respondentCount: lockedRespondents.length,
  };
}
