/* ─── Types ─── */

export type ReputationTier = "new" | "bronze" | "silver" | "gold" | "platinum";

export type ReputationStats = {
  totalCompleted: number;
  avgQualityScore: number;
  totalEarned: number;
  totalSubmitted: number;
  flaggedResponseCount: number;
};

export type ReputationResult = {
  score: number;
  tier: ReputationTier;
};

/* ─── Tier Config ─── */

export const TIER_CONFIG: Record<
  ReputationTier,
  { min: number; color: string; label: string }
> = {
  new: { min: -1, color: "#999999", label: "New" },
  bronze: { min: 0, color: "#cd7f32", label: "Bronze" },
  silver: { min: 40, color: "#9ca3af", label: "Silver" },
  gold: { min: 60, color: "#e8b87a", label: "Gold" },
  platinum: { min: 80, color: "#a855f7", label: "Platinum" },
};

/* ─── Pure Calculation ─── */

export function calculateReputation(stats: ReputationStats): ReputationResult {
  if (stats.totalCompleted === 0) {
    return { score: 0, tier: "new" };
  }

  const qualityComponent = (stats.avgQualityScore / 100) * 50;
  const completionRate =
    stats.totalSubmitted > 0
      ? stats.totalCompleted / stats.totalSubmitted
      : 0;
  const reliabilityComponent = completionRate * 20;
  const volumeBonus = Math.min(15, Math.log2(stats.totalCompleted + 1) * 5);
  const earningsBonus = Math.min(15, Math.log2(stats.totalEarned + 1) * 3);
  const flaggedRate =
    stats.totalCompleted > 0
      ? stats.flaggedResponseCount / stats.totalCompleted
      : 0;
  const gamingPenalty = flaggedRate * 20;

  const raw =
    qualityComponent +
    reliabilityComponent +
    volumeBonus +
    earningsBonus -
    gamingPenalty;

  const score = Math.min(Math.max(Math.round(raw * 100) / 100, 0), 100);

  let tier: ReputationTier = "bronze";
  if (score >= 80) tier = "platinum";
  else if (score >= 60) tier = "gold";
  else if (score >= 40) tier = "silver";

  return { score, tier };
}
