import { DEFAULTS } from "./defaults";

/* ─── Types ─── */

export type WallCampaign = {
  id: string;
  created_at: string;
  current_responses: number;
  target_responses: number;
  reward_amount: number;
  estimated_responses_low: number;
  quality_score: number | null;
  match_priority: number;
  target_interests: string[];
  target_expertise: string[];
  target_age_ranges: string[];
  tags: string[];
};

export type RespondentProfile = {
  interests: string[];
  expertise: string[];
  age_range: string | null;
  profile_completed: boolean;
  reputation_score: number;
  total_responses_completed?: number;
};

/* ─── Component Scores ─── */

/**
 * Match score: how well the campaign targets align with the respondent profile.
 * 0–100 points based on interest/expertise/age/tag overlap.
 *
 * V2: Symmetric handling — if either side is empty for a dimension,
 * score that dimension at 40% of max (slightly below neutral).
 */
export function computeMatchScore(
  campaign: Pick<
    WallCampaign,
    "target_interests" | "target_expertise" | "target_age_ranges" | "tags"
  >,
  profile: RespondentProfile
): number {
  let score = 0;
  const unknownFraction = DEFAULTS.MATCH_SCORE_UNKNOWN_DIM;

  // Interest overlap (0-40 pts)
  if (
    campaign.target_interests.length === 0 ||
    profile.interests.length === 0
  ) {
    score += 40 * unknownFraction; // 16 pts — unknown alignment
  } else {
    const overlap = campaign.target_interests.filter((i) =>
      profile.interests.includes(i)
    ).length;
    const ratio = overlap / campaign.target_interests.length;
    score += ratio * 40;
  }

  // Expertise overlap (0-30 pts)
  if (
    campaign.target_expertise.length === 0 ||
    profile.expertise.length === 0
  ) {
    score += 30 * unknownFraction; // 12 pts
  } else {
    const overlap = campaign.target_expertise.filter((e) =>
      profile.expertise.includes(e)
    ).length;
    const ratio = overlap / campaign.target_expertise.length;
    score += ratio * 30;
  }

  // Age range match (0-15 pts)
  if (campaign.target_age_ranges.length === 0 || !profile.age_range) {
    score += 15 * unknownFraction; // 6 pts
  } else {
    if (campaign.target_age_ranges.includes(profile.age_range)) score += 15;
  }

  // Tag overlap with interests/expertise (0-15 pts) — fallback for legacy campaigns
  if (campaign.tags.length > 0) {
    const allProfileTags = [...profile.interests, ...profile.expertise];
    const tagOverlap = campaign.tags.filter((t) =>
      allProfileTags.includes(t)
    ).length;
    score += Math.min((tagOverlap / campaign.tags.length) * 15, 15);
  }

  // Reputation boost (0-5 pts, requires minimum sample)
  const completedResponses = profile.total_responses_completed ?? 0;
  if (
    profile.reputation_score > 0 &&
    completedResponses >= DEFAULTS.REPUTATION_WALL_MIN_RESPONSES
  ) {
    score += Math.min(5, profile.reputation_score / 20);
  }

  return Math.min(100, Math.round(score));
}

/**
 * Reward attractiveness score based on total campaign reward amount.
 * Uses log-scaled total reward to avoid dilution from reach (more reach =
 * more expected responders = lower per-response payout, which penalized
 * generous campaigns under the old formula).
 *
 * $5 → 39, $10 → 52, $25 → 70, $50 → 85, $100 → 100.
 */
export function computeRewardScore(campaign: WallCampaign): number {
  if (campaign.reward_amount <= 0) return 0;

  return Math.min(100, Math.round(Math.log2(campaign.reward_amount + 1) * 15));
}

/**
 * V2: Exponential freshness decay — preserves first 48h, steeper late decay.
 * Half-life ~83 hours. Reaches ~6 by day 14.
 */
export function computeFreshnessScore(createdAt: string): number {
  const hoursOld =
    (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  return Math.max(0, Math.round(100 * Math.exp(-hoursOld / 120)));
}

/**
 * V2: Continuous sigmoid momentum — no step-function cliff edges.
 * Centered at 50% fill, scaled to [20, 80].
 *
 *   0% filled  → ~80
 *   25% filled → ~72
 *   50% filled → ~50
 *   75% filled → ~28
 *   100% filled → ~20
 */
export function computeMomentumScore(
  currentResponses: number,
  targetResponses: number
): number {
  if (targetResponses <= 0) return DEFAULTS.MOMENTUM_NO_TARGET;
  const fillRate = Math.min(currentResponses / targetResponses, 1.0);
  const sigmoid = 1 / (1 + Math.exp(8 * (fillRate - 0.5)));
  return Math.round(20 + sigmoid * 60);
}

/* ─── Composite Wall Score ─── */

/**
 * Computes the composite wall ranking score for a campaign relative to
 * a specific respondent profile.
 *
 * V3 weights (match-heavy — matching is the moat):
 *   matchScore     × 0.50  (up from 0.35 — better matching > more campaigns)
 *   rewardScore    × 0.15
 *   qualityScore   × 0.10
 *   freshnessScore × 0.12
 *   momentumScore  × 0.13
 */
export function computeWallScore(
  campaign: WallCampaign,
  profile: RespondentProfile
): { wallScore: number; matchScore: number } {
  const matchScore = profile.profile_completed
    ? computeMatchScore(campaign, profile)
    : DEFAULTS.MATCH_SCORE_INCOMPLETE;

  const rewardScore = computeRewardScore(campaign);
  const qualityScore = campaign.quality_score ?? DEFAULTS.QUALITY_SCORE;
  const freshnessScore = computeFreshnessScore(campaign.created_at);
  const momentumScore = computeMomentumScore(
    campaign.current_responses,
    campaign.target_responses
  );

  const wallScore =
    matchScore * 0.50 +
    rewardScore * 0.15 +
    qualityScore * 0.10 +
    freshnessScore * 0.12 +
    momentumScore * 0.13;

  return {
    wallScore: Math.round(wallScore * 100) / 100,
    matchScore: Math.min(matchScore, 100),
  };
}

/**
 * Sorts campaigns by composite wall score, with deterministic tiebreakers.
 * V2.1: Wider equivalence band (2.0 pts) to prevent jitter-driven reordering.
 * Within band: match_priority → createdAt → UUID (fully deterministic).
 */
export function sortByWallScore(
  campaigns: Array<WallCampaign & { wallScore: number }>
): Array<WallCampaign & { wallScore: number }> {
  return [...campaigns].sort((a, b) => {
    const scoreDiff = b.wallScore - a.wallScore;
    // If within equivalence band, use deterministic tiebreakers only
    if (Math.abs(scoreDiff) <= DEFAULTS.WALL_SCORE_EQUIVALENCE_BAND) {
      const priorityDiff = b.match_priority - a.match_priority;
      if (priorityDiff !== 0) return priorityDiff;
      // Then by recency
      const timeDiff =
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (timeDiff !== 0) return timeDiff;
      // Final tiebreaker: UUID lexicographic — fully deterministic
      return a.id.localeCompare(b.id);
    }
    return scoreDiff;
  });
}
