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
  audience_industry: string | null;
  audience_experience_level: string | null;
};

export type RespondentProfile = {
  interests: string[];
  expertise: string[];
  age_range: string | null;
  industry: string | null;
  experience_level: string | null;
  profile_completed: boolean;
  reputation_score: number;
  total_responses_completed?: number;
};

/* ─── Component Scores ─── */

/**
 * Match score: how well the campaign targets align with the respondent profile.
 * 0–100 points based on interest/expertise/age/industry/experience/tag overlap.
 *
 * V3: Added industry + experience_level dimensions. Point budget:
 *   interests  35,  expertise  25,  age  15,  industry  10,
 *   experience 10,  tags  10,  reputation  5  (max ~110, clamped to 100).
 *
 * Symmetric handling — if either side is empty for a dimension,
 * score that dimension at 40% of max (slightly below neutral).
 */
export function computeMatchScore(
  campaign: Pick<
    WallCampaign,
    | "target_interests"
    | "target_expertise"
    | "target_age_ranges"
    | "tags"
    | "audience_industry"
    | "audience_experience_level"
  >,
  profile: RespondentProfile
): number {
  let score = 0;
  const unknownFraction = DEFAULTS.MATCH_SCORE_UNKNOWN_DIM;

  // Interest overlap (0-35 pts)
  if (
    campaign.target_interests.length === 0 ||
    profile.interests.length === 0
  ) {
    score += 35 * unknownFraction;
  } else {
    const overlap = campaign.target_interests.filter((i) =>
      profile.interests.includes(i)
    ).length;
    const ratio = overlap / campaign.target_interests.length;
    score += ratio * 35;
  }

  // Expertise overlap (0-25 pts)
  if (
    campaign.target_expertise.length === 0 ||
    profile.expertise.length === 0
  ) {
    score += 25 * unknownFraction;
  } else {
    const overlap = campaign.target_expertise.filter((e) =>
      profile.expertise.includes(e)
    ).length;
    const ratio = overlap / campaign.target_expertise.length;
    score += ratio * 25;
  }

  // Age range match (0-15 pts)
  if (campaign.target_age_ranges.length === 0 || !profile.age_range) {
    score += 15 * unknownFraction;
  } else {
    if (campaign.target_age_ranges.includes(profile.age_range)) score += 15;
  }

  // Industry match (0-10 pts)
  if (!campaign.audience_industry || !profile.industry) {
    score += 10 * unknownFraction;
  } else {
    if (
      profile.industry.toLowerCase() ===
      campaign.audience_industry.toLowerCase()
    )
      score += 10;
  }

  // Experience level match (0-10 pts)
  if (!campaign.audience_experience_level || !profile.experience_level) {
    score += 10 * unknownFraction;
  } else {
    if (
      profile.experience_level.toLowerCase() ===
      campaign.audience_experience_level.toLowerCase()
    )
      score += 10;
  }

  // Tag overlap with interests/expertise (0-10 pts) — fallback for legacy campaigns
  if (campaign.tags.length > 0) {
    const allProfileTags = [...profile.interests, ...profile.expertise];
    const tagOverlap = campaign.tags.filter((t) =>
      allProfileTags.includes(t)
    ).length;
    score += Math.min((tagOverlap / campaign.tags.length) * 10, 10);
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

/* ─── Match Bucket Classification ─── */

export type MatchBucket = "core" | "adjacent" | "off_target";

/**
 * Classifies a match score into a fit bucket for analytics and brief segmentation.
 *   core     (>= 70): closely matches the target audience
 *   adjacent (40-69): partial match, useful but less authoritative signal
 *   off_target (< 40): poor match
 */
export function classifyMatchBucket(score: number): MatchBucket {
  if (score >= DEFAULTS.MATCH_BUCKET_CORE_THRESHOLD) return "core";
  if (score >= DEFAULTS.MATCH_BUCKET_ADJACENT_THRESHOLD) return "adjacent";
  return "off_target";
}

export type TargetingMode = "broad" | "balanced" | "strict";

/**
 * Minimum eligibility check for responding to a campaign.
 *
 * Modes:
 *   broad    — always eligible (targeting affects ranking only)
 *   balanced — pass if respondent overlaps on at least ONE targeted dimension (default)
 *   strict   — pass only if respondent overlaps on ALL targeted dimensions
 *
 * Incomplete profiles always pass regardless of mode (we nudge completion separately).
 * Campaigns with no targeting set always pass regardless of mode.
 */
export function meetsMinimumEligibility(
  campaign: Pick<
    WallCampaign,
    | "target_interests"
    | "target_expertise"
    | "target_age_ranges"
    | "audience_industry"
    | "audience_experience_level"
  >,
  profile: RespondentProfile,
  mode: TargetingMode = "balanced"
): boolean {
  // Incomplete profiles always pass — we nudge completion separately
  if (!profile.profile_completed) return true;

  // Build list of actively targeted dimensions and whether the respondent matches each
  const targeted: { name: string; matches: boolean }[] = [];

  if (campaign.target_interests.length > 0) {
    targeted.push({
      name: "interests",
      matches:
        profile.interests.length > 0 &&
        campaign.target_interests.some((i) => profile.interests.includes(i)),
    });
  }
  if (campaign.target_expertise.length > 0) {
    targeted.push({
      name: "expertise",
      matches:
        profile.expertise.length > 0 &&
        campaign.target_expertise.some((e) => profile.expertise.includes(e)),
    });
  }
  if (campaign.target_age_ranges.length > 0) {
    targeted.push({
      name: "age_range",
      matches:
        !!profile.age_range &&
        campaign.target_age_ranges.includes(profile.age_range),
    });
  }
  if (campaign.audience_industry) {
    targeted.push({
      name: "industry",
      matches:
        !!profile.industry &&
        profile.industry.toLowerCase() ===
          campaign.audience_industry.toLowerCase(),
    });
  }
  if (campaign.audience_experience_level) {
    targeted.push({
      name: "experience_level",
      matches:
        !!profile.experience_level &&
        profile.experience_level.toLowerCase() ===
          campaign.audience_experience_level.toLowerCase(),
    });
  }

  // No targeting at all — anyone can respond
  if (targeted.length === 0) return true;

  switch (mode) {
    case "broad":
      return true;
    case "strict":
      return targeted.every((d) => d.matches);
    case "balanced":
    default:
      return targeted.some((d) => d.matches);
  }
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
export function computeFreshnessScore(createdAt: string, now?: number): number {
  const hoursOld =
    ((now ?? Date.now()) - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  if (isNaN(hoursOld)) return 0;
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
