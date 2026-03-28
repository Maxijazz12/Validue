import { createClient } from "@/lib/supabase/server";
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
  if (previousAvg < 0) return newAvg; // first valid score — no history to smooth
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
  const supabase = await createClient();

  // Fetch current profile for EMA baseline and tier hysteresis
  const { data: profile } = await supabase
    .from("profiles")
    .select("average_quality_score, reputation_tier")
    .eq("id", respondentId)
    .single();

  const previousAvg = safeNumber(profile?.average_quality_score, -1);
  const currentTier = (profile?.reputation_tier as ReputationTier) ?? "new";

  // Aggregate response stats
  const { data: responses } = await supabase
    .from("responses")
    .select("status, quality_score")
    .eq("respondent_id", respondentId);

  const allResponses = responses || [];
  const submitted = allResponses.filter(
    (r) => r.status === "submitted" || r.status === "ranked"
  );
  const ranked = allResponses.filter((r) => r.status === "ranked");

  const totalCompleted = ranked.length;
  const totalSubmitted = submitted.length + ranked.length;
  // Track whether any quality scores are actually present (not just null/NaN)
  const qualityScores = ranked.map((r) => safeNumber(r.quality_score, -1));
  const validScores = qualityScores.filter((s) => s >= 0);
  const rawAvgQualityScore =
    validScores.length > 0
      ? validScores.reduce((s, v) => s + v, 0) / validScores.length
      : -1; // -1 signals "no valid scores" vs genuine 0

  // Apply EMA smoothing to quality score
  const avgQualityScore =
    rawAvgQualityScore >= 0
      ? smoothedQualityAverage(previousAvg, rawAvgQualityScore)
      : -1;

  // Count flagged responses (responses with paste detection)
  let flaggedCount = 0;
  if (ranked.length > 0) {
    const { data: rankedResponses } = await supabase
      .from("responses")
      .select("id")
      .eq("respondent_id", respondentId)
      .eq("status", "ranked");

    if (rankedResponses && rankedResponses.length > 0) {
      const rIds = rankedResponses.map((r) => r.id);
      const { data: answers } = await supabase
        .from("answers")
        .select("metadata")
        .in("response_id", rIds);

      let flaggedAnswers = 0;
      for (const answer of answers || []) {
        const meta = answer.metadata as Record<string, unknown> | null;
        if (meta?.pasteDetected === true && (meta?.pasteCount as number) > 1) {
          flaggedAnswers++;
        }
      }
      const totalAnswers = answers?.length || 1;
      const flagRate = flaggedAnswers / totalAnswers;
      flaggedCount = Math.round(flagRate * totalCompleted);
    }
  }

  // Get total earned
  const { data: payouts } = await supabase
    .from("payouts")
    .select("amount")
    .eq("respondent_id", respondentId);

  const totalEarned = (payouts || []).reduce(
    (s, p) => s + safeNumber(p.amount),
    0
  );

  // If all quality scores are null/invalid, treat as insufficient data
  const stats: ReputationStats = {
    totalCompleted: avgQualityScore < 0 ? 0 : totalCompleted,
    avgQualityScore: avgQualityScore < 0 ? 0 : avgQualityScore,
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

  // Update profile
  await supabase
    .from("profiles")
    .update({
      reputation_score: result.score,
      reputation_tier: result.tier,
      total_responses_completed: totalCompleted,
      average_quality_score: Math.round(avgQualityScore * 100) / 100,
      total_earned: Math.round(totalEarned * 100) / 100,
      reputation_updated_at: new Date().toISOString(),
    })
    .eq("id", respondentId);

  return result;
}
