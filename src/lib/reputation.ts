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
  // Fetch current profile for EMA baseline and tier hysteresis
  const [profile] = await sql`
    SELECT average_quality_score, reputation_tier
    FROM profiles
    WHERE id = ${respondentId}
  `;

  if (!profile) {
    throw new Error(`Reputation update failed: profile ${respondentId} not found`);
  }

  const previousAvg = safeNumber(profile.average_quality_score, -1);
  const currentTier = (profile.reputation_tier as ReputationTier) ?? "new";

  // Aggregate response stats
  const allResponses = await sql`
    SELECT status, quality_score
    FROM responses
    WHERE respondent_id = ${respondentId}
  `;
  const submitted = allResponses.filter(
    (r) => r.status === "submitted" || r.status === "ranked"
  );
  const ranked = allResponses.filter((r) => r.status === "ranked");

  const totalCompleted = ranked.length;
  const totalSubmitted = submitted.length; // submitted already includes ranked
  // Track whether any quality scores are actually present (not just null/NaN).
  // Uses NaN as the "no valid data" sentinel instead of -1, since quality_score
  // is always >= 0 when valid, and NaN propagates obviously through arithmetic.
  const qualityScores = ranked.map((r) => safeNumber(r.quality_score, NaN));
  const validScores = qualityScores.filter((s) => Number.isFinite(s));
  const rawAvgQualityScore =
    validScores.length > 0
      ? validScores.reduce((s, v) => s + v, 0) / validScores.length
      : NaN; // NaN signals "no valid scores" vs genuine 0

  // Apply EMA smoothing to quality score
  const avgQualityScore = Number.isFinite(rawAvgQualityScore)
    ? smoothedQualityAverage(previousAvg, rawAvgQualityScore)
    : NaN;

  // Count flagged responses (responses with paste detection)
  let flaggedCount = 0;
  if (ranked.length > 0) {
    const rankedResponses = await sql`
      SELECT id
      FROM responses
      WHERE respondent_id = ${respondentId}
        AND status = 'ranked'
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
  const payoutRows = await sql`SELECT amount FROM payouts WHERE respondent_id = ${respondentId}`;

  const totalEarned = payoutRows.reduce(
    (s, p) => s + safeNumber(p.amount),
    0
  );

  // If all quality scores are null/invalid, treat as insufficient data
  const noValidScores = !Number.isFinite(avgQualityScore);
  const stats: ReputationStats = {
    totalCompleted: noValidScores ? 0 : totalCompleted,
    avgQualityScore: noValidScores ? 0 : avgQualityScore,
    totalEarned,
    totalSubmitted,
    flaggedResponseCount: flaggedCount,
    currentTier,
  };

  const result = calculateReputation(stats);

  const oldScore = safeNumber(profile?.average_quality_score, 0);
  if (result.score !== oldScore || result.tier !== currentTier) {
    logOps({
      event: "reputation.updated",
      respondentId,
      oldScore: Math.round(oldScore * 100) / 100,
      newScore: result.score,
      oldTier: currentTier,
      newTier: result.tier,
      totalCompleted,
    });
  }

  await sql`
    UPDATE profiles
    SET reputation_score = ${result.score},
        reputation_tier = ${result.tier},
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

  return result;
}
