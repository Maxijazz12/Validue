import sql from "@/lib/db";
import { calculateReputation } from "./reputation-config";
import type { ReputationResult, ReputationStats, ReputationTier } from "./reputation-config";
import { DEFAULTS, safeNumber } from "./defaults";
import { logOps } from "./ops-logger";

// Re-export types for convenience
export type { ReputationTier, ReputationResult, ReputationStats } from "./reputation-config";
export { TIER_CONFIG, calculateReputation } from "./reputation-config";

/* ─── EMA Smoothing ─── */

/**
 * Smooths quality score updates using an exponential moving average.
 * Caps the maximum score movement from any single update to prevent
 * one outlier response from causing large reputation swings.
 */
function smoothedQualityAverage(previousAvg: number, newAvg: number): number {
  if (!Number.isFinite(previousAvg) || previousAvg < 0) return newAvg; // first valid score — no history to smooth
  const ema = previousAvg + DEFAULTS.REPUTATION_ALPHA * (newAvg - previousAvg);
  const delta = ema - previousAvg;
  const clampedDelta = Math.max(
    -DEFAULTS.REPUTATION_MAX_SINGLE_MOVE,
    Math.min(DEFAULTS.REPUTATION_MAX_SINGLE_MOVE, delta)
  );
  return previousAvg + clampedDelta;
}

/* ─── Server Action ─── */

export async function updateRespondentReputation(
  respondentId: string
): Promise<ReputationResult> {
  // Phase 1: aggregate reads (outside transaction — no lock contention)

  const allResponses = await sql`
    SELECT status, quality_score
    FROM responses
    WHERE respondent_id = ${respondentId}
    LIMIT 10000
  `;
  const submitted = allResponses.filter(
    (r) => r.status === "submitted" || r.status === "ranked"
  );
  const ranked = allResponses.filter((r) => r.status === "ranked");

  const totalCompleted = ranked.length;
  const totalSubmitted = submitted.length;

  const qualityScores = ranked.map((r) => safeNumber(r.quality_score, NaN));
  const validScores = qualityScores.filter((s) => Number.isFinite(s));
  const rawAvgQualityScore =
    validScores.length > 0
      ? validScores.reduce((s, v) => s + v, 0) / validScores.length
      : NaN;

  // Count flagged responses (responses with paste detection)
  let flaggedCount = 0;
  if (ranked.length > 0) {
    const rankedResponses = await sql`
      SELECT id
      FROM responses
      WHERE respondent_id = ${respondentId}
        AND status = 'ranked'
      LIMIT 10000
    `;

    if (rankedResponses.length > 0) {
      const rIds = rankedResponses.map((r) => r.id);
      const answers = await sql`
        SELECT metadata
        FROM answers
        WHERE response_id = ANY(${rIds}::uuid[])
      `;

      let flaggedAnswers = 0;
      for (const answer of answers) {
        const meta = answer.metadata as Record<string, unknown> | null;
        if (meta?.pasteDetected === true && (meta?.pasteCount as number) > 1) {
          flaggedAnswers++;
        }
      }
      const totalAnswers = answers.length || 1;
      const flagRate = flaggedAnswers / totalAnswers;
      flaggedCount = Math.round(flagRate * totalCompleted);
    }
  }

  // Get total earned — use raw SQL to bypass RLS so we see all payouts for the respondent
  const payoutRows = await sql`SELECT amount FROM payouts WHERE respondent_id = ${respondentId} LIMIT 10000`;

  const totalEarned = payoutRows.reduce(
    (s, p) => s + safeNumber(p.amount),
    0
  );

  // Phase 2: locked profile read + update in a transaction.
  // FOR UPDATE serializes concurrent reputation updates for the same respondent —
  // without it, two concurrent calls read the same previousAvg, apply EMA
  // independently, and the second write silently overwrites the first.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TransactionSql loses call signature
  const result = await sql.begin(async (tx: any) => {
    const [profile] = await tx`
      SELECT average_quality_score, reputation_tier
      FROM profiles
      WHERE id = ${respondentId}
      FOR UPDATE
    `;

    if (!profile) {
      throw new Error(`Reputation update failed: profile ${respondentId} not found`);
    }

    const previousAvg = safeNumber(profile.average_quality_score, -1);
    const currentTier = (profile.reputation_tier as ReputationTier) ?? "new";

    // Apply EMA smoothing using the locked profile's current value
    const avgQualityScore = Number.isFinite(rawAvgQualityScore)
      ? smoothedQualityAverage(previousAvg, rawAvgQualityScore)
      : NaN;

    const noValidScores = !Number.isFinite(avgQualityScore);
    const stats: ReputationStats = {
      totalCompleted: noValidScores ? 0 : totalCompleted,
      avgQualityScore: noValidScores ? 0 : avgQualityScore,
      totalEarned,
      totalSubmitted,
      flaggedResponseCount: flaggedCount,
      currentTier,
    };

    const repResult = calculateReputation(stats);

    const oldScore = safeNumber(profile.average_quality_score, 0);
    if (repResult.score !== oldScore || repResult.tier !== currentTier) {
      logOps({
        event: "reputation.updated",
        respondentId,
        oldScore: Math.round(oldScore * 100) / 100,
        newScore: repResult.score,
        oldTier: currentTier,
        newTier: repResult.tier,
        totalCompleted,
      });
    }

    await tx`
      UPDATE profiles
      SET reputation_score = ${repResult.score},
          reputation_tier = ${repResult.tier},
          total_responses_completed = ${totalCompleted},
          average_quality_score = ${
            Number.isFinite(avgQualityScore)
              ? Math.round(avgQualityScore * 100) / 100
              : null
          },
          total_earned = ${Math.round(totalEarned * 100) / 100},
          reputation_updated_at = NOW()
      WHERE id = ${respondentId}
    `;

    return repResult;
  });

  return result;
}
