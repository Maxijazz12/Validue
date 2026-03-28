import { DEFAULTS } from "./defaults";

/* ─── Types ─── */

export type ReputationTier = "new" | "bronze" | "silver" | "gold" | "platinum";

export type ReputationStats = {
  totalCompleted: number;
  avgQualityScore: number;
  totalEarned: number;
  totalSubmitted: number;
  flaggedResponseCount: number;
  /** Current tier from DB — needed for hysteresis check */
  currentTier?: ReputationTier;
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
  silver: { min: 45, color: "#9ca3af", label: "Silver" },
  gold: { min: 70, color: "#E8725C", label: "Gold" },
  platinum: { min: 85, color: "#a855f7", label: "Platinum" },
};

/**
 * Hysteresis thresholds: promote at `promote`, demote only below `demote`.
 * Prevents tier flapping when score oscillates near a boundary.
 */
const TIER_THRESHOLDS: {
  tier: ReputationTier;
  promote: number;
  demote: number;
}[] = [
  { tier: "platinum", promote: 85, demote: 85 - DEFAULTS.REPUTATION_TIER_HYSTERESIS },
  { tier: "gold", promote: 70, demote: 70 - DEFAULTS.REPUTATION_TIER_HYSTERESIS },
  { tier: "silver", promote: 45, demote: 45 - DEFAULTS.REPUTATION_TIER_HYSTERESIS },
  { tier: "bronze", promote: 0, demote: -Infinity },
];

/**
 * Resolves tier with hysteresis — avoids flapping at boundaries.
 * If score drops below the promote threshold but stays above the demote
 * threshold, the current tier is retained.
 */
function resolveTier(score: number, currentTier?: ReputationTier): ReputationTier {
  for (const { tier, promote, demote } of TIER_THRESHOLDS) {
    // Promotion: score reaches the promote threshold
    if (score >= promote) return tier;
    // Retention: already at this tier and score above demote threshold
    if (currentTier === tier && score >= demote) return tier;
  }
  return "bronze";
}

/* ─── Pure Calculation ─── */

/**
 * V2: Removed earningsBonus (circular incentive). Added sample-size gate.
 * V2.1: Added confidence dampener for low sample counts (3–10 responses)
 *        and hysteresis on tier boundaries.
 *
 * Components:
 *   Quality:     60 pts max (up from 50) — dominant signal
 *   Reliability: 20 pts max (unchanged)
 *   Volume:      20 pts max (up from 15) — redistributed from removed earnings
 *   Gaming:     -20 pts max (unchanged)
 *
 * Requires minimum 3 completed responses before any reputation is calculated.
 */
export function calculateReputation(stats: ReputationStats): ReputationResult {
  if (stats.totalCompleted < DEFAULTS.REPUTATION_MIN_RESPONSES) {
    return { score: 0, tier: "new" };
  }

  // Quality: dominant signal (60 pts max)
  const qualityComponent = (stats.avgQualityScore / 100) * 60;

  // Reliability: completion rate (20 pts max)
  const completionRate =
    stats.totalSubmitted > 0
      ? stats.totalCompleted / stats.totalSubmitted
      : 0;
  const reliabilityComponent = completionRate * 20;

  // Volume: logarithmic bonus (20 pts max)
  const volumeBonus = Math.min(20, Math.log2(stats.totalCompleted + 1) * 5);

  // Gaming penalty (-20 pts max)
  const flaggedRate =
    stats.totalCompleted > 0
      ? stats.flaggedResponseCount / stats.totalCompleted
      : 0;
  const gamingPenalty = flaggedRate * 20;

  const raw =
    qualityComponent +
    reliabilityComponent +
    volumeBonus -
    gamingPenalty;

  // Confidence dampener: blend toward neutral for low sample counts.
  // At 3 responses: 30% own signal, 70% neutral. At 10+: 100% own signal.
  const dampener = Math.min(1, stats.totalCompleted / DEFAULTS.REPUTATION_CONFIDENCE_RAMP);
  const dampened = raw * dampener + DEFAULTS.REPUTATION_NEUTRAL * (1 - dampener);

  const score = Math.min(Math.max(Math.round(dampened * 100) / 100, 0), 100);

  // Tier assignment with hysteresis to prevent flapping
  const tier = resolveTier(score, stats.currentTier);

  return { score, tier };
}
