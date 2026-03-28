/**
 * Single source of truth for all default values used across scoring,
 * ranking, reach, and economic logic. No magic numbers elsewhere.
 */
export const DEFAULTS = {
  /** Neutral quality score (produces 1.0x quality modifier) */
  QUALITY_SCORE: 50,

  /** Match score for incomplete profiles (slightly pessimistic) */
  MATCH_SCORE_INCOMPLETE: 40,

  /** Fraction of max points awarded when either side of a match dimension is empty */
  MATCH_SCORE_UNKNOWN_DIM: 0.4,

  /** Momentum score when target_responses is 0 or missing */
  MOMENTUM_NO_TARGET: 50,

  /** Platform fee rate — applied exactly once at funding time */
  PLATFORM_FEE_RATE: 0.15,

  /** Minimum payout amount per respondent */
  MIN_PAYOUT: 0.5,

  /** Assumed center of response quality distribution for confidence shrinkage */
  POPULATION_MEAN_SCORE: 55,

  /** Fixed confidence assigned to all fallback (heuristic) scores */
  FALLBACK_CONFIDENCE: 0.5,

  /** Floor for AI-reported confidence — never trust less than this */
  MIN_AI_CONFIDENCE: 0.3,

  /** Minimum ranked responses before reputation is calculated */
  REPUTATION_MIN_RESPONSES: 3,

  /** Minimum ranked responses before reputation affects wall ranking */
  REPUTATION_WALL_MIN_RESPONSES: 5,

  /* ─── Stability Constants ─── */

  /** EMA smoothing factor for reputation quality component (0–1, lower = smoother) */
  REPUTATION_ALPHA: 0.3,

  /** Max reputation score change from a single response */
  REPUTATION_MAX_SINGLE_MOVE: 5,

  /** Responses needed for full reputation confidence (ramp from min to this) */
  REPUTATION_CONFIDENCE_RAMP: 10,

  /** Neutral reputation score used during confidence ramp blending */
  REPUTATION_NEUTRAL: 50,

  /** Hysteresis buffer for tier demotion (demote at threshold - this value) */
  REPUTATION_TIER_HYSTERESIS: 5,

  /** Wall score equivalence band — scores within this range use deterministic tiebreakers */
  WALL_SCORE_EQUIVALENCE_BAND: 2.0,

  /** Minimum ranked responses before quality modifier affects effective reach */
  QUALITY_INFLUENCE_MIN_RESPONSES: 5,

  /** Minimum AI confidence for a score to participate in weighted payout distribution */
  PAYOUT_CONFIDENCE_THRESHOLD: 0.5,

  /** Maximum allowed funding amount */
  MAX_FUNDING_AMOUNT: 10_000,

  /** Minimum target responses for a campaign */
  MIN_TARGET_RESPONSES: 1,

  /** Maximum target responses for a campaign */
  MAX_TARGET_RESPONSES: 10_000,
} as const;

/** NaN-safe number coercion — prevents silent distortion from corrupted data */
export function safeNumber(x: unknown, fallback = 0): number {
  const n = Number(x);
  return isNaN(n) ? fallback : n;
}

/** NaN-safe, non-negative number coercion for monetary and score fields */
export function safePositive(x: unknown, fallback = 0): number {
  const n = Number(x);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n;
}
