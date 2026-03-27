import { createClient } from "@/lib/supabase/server";
import { calculateReputation } from "./reputation-config";
import type { ReputationResult, ReputationStats } from "./reputation-config";

// Re-export types for convenience
export type { ReputationTier, ReputationResult, ReputationStats } from "./reputation-config";
export { TIER_CONFIG, calculateReputation } from "./reputation-config";

/* ─── Server Action ─── */

export async function updateRespondentReputation(
  respondentId: string
): Promise<ReputationResult> {
  const supabase = await createClient();

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
  const avgQualityScore =
    ranked.length > 0
      ? ranked.reduce((s, r) => s + (Number(r.quality_score) || 0), 0) /
        ranked.length
      : 0;

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
    (s, p) => s + (Number(p.amount) || 0),
    0
  );

  const stats: ReputationStats = {
    totalCompleted,
    avgQualityScore,
    totalEarned,
    totalSubmitted,
    flaggedResponseCount: flaggedCount,
  };

  const result = calculateReputation(stats);

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
