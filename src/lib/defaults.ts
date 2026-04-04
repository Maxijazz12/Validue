/**
 * Single source of truth for all default values used across scoring,
 * ranking, reach, and economic logic. No magic numbers elsewhere.
 */
export const DEFAULTS = {
  /** Neutral quality score (produces 1.0x quality modifier) */
  QUALITY_SCORE: 50,

  /** Match score for incomplete profiles — below unknown-dimension baseline (34) to incentivize completion */
  MATCH_SCORE_INCOMPLETE: 30,

  /** Fraction of max points awarded when either side of a match dimension is empty */
  MATCH_SCORE_UNKNOWN_DIM: 0.4,

  /** Momentum score when target_responses is 0 or missing */
  MOMENTUM_NO_TARGET: 50,

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

  /** Free-tier campaign limit resets after this many days (rolling window) */
  FREE_TIER_RESET_DAYS: 30,

  /** Minimum campaign funding to unlock the full Decision Brief (free tier only) */
  BRIEF_FUNDING_GATE: 10,

  /** Maximum allowed funding amount */
  MAX_FUNDING_AMOUNT: 10_000,

  /** Maximum target responses for a campaign */
  MAX_TARGET_RESPONSES: 10_000,

  /* ─── V2 Economics ─── */

  /** Minimum quality score to qualify for payout (launch calibration — review after 4 weeks) */
  QUALIFICATION_MIN_SCORE: 30,

  /** Hard floor: base pay per response must be >= this at publish time */
  MIN_BASE_PAYOUT: 0.10,

  /** Target average payout per qualifying response — Quick format (~2 min) */
  TARGET_AVG_PAYOUT_QUICK: 0.45,

  /** Target average payout per qualifying response — Standard format (~3 min) */
  TARGET_AVG_PAYOUT_STANDARD: 0.75,

  /** Minimum total response time for Quick format (ms) */
  MIN_RESPONSE_TIME_QUICK_MS: 45_000,

  /** Minimum total response time for Standard format (ms) */
  MIN_RESPONSE_TIME_STANDARD_MS: 90_000,

  /** Minimum target responses for V2 campaigns */
  MIN_TARGET_RESPONSES_V2: 5,

  /** Minimum characters for at least one open-ended answer */
  MIN_OPEN_ANSWER_CHARS: 50,

  /** Max paste count per answer before flagging as spam */
  SPAM_MAX_PASTE_COUNT: 3,

  /** Fraction of answers with paste detected before flagging response as spam */
  SPAM_PASTE_ANSWER_RATIO: 0.5,

  /** Minimum total time (ms) at submission — hard reject below this (Quick format) */
  SUBMIT_MIN_TIME_QUICK_MS: 20_000,

  /** Minimum total time (ms) at submission — hard reject below this (Standard format) */
  SUBMIT_MIN_TIME_STANDARD_MS: 40_000,

  /** Minimum time (ms) per assigned question for partial responses */
  PARTIAL_MIN_TIME_PER_QUESTION_MS: 8_000,

  /** Maximum completed responses per respondent per rolling 24 hours (launch calibration) */
  MAX_DAILY_RESPONSES: 12,

  /** Maximum concurrent in-progress responses per respondent (launch calibration) */
  MAX_CONCURRENT_RESPONSES: 2,

  /** Auto-abandon stale in-progress responses after this duration (ms) */
  STALE_RESPONSE_TIMEOUT_MS: 3_600_000,

  /** Campaign expiration — days after activation (extended from 7 to reduce trust risk at low liquidity) */
  CAMPAIGN_EXPIRY_DAYS: 14,

  /** Auto-extend campaign expiry by this many days when >50% filled at expiration */
  CAMPAIGN_AUTO_EXTEND_DAYS: 7,

  /** Fill ratio threshold to trigger auto-extension */
  CAMPAIGN_AUTO_EXTEND_FILL_RATIO: 0.5,

  /** Minimum respondent available balance (cents) required to cash out — low to prove platform pays fast */
  MIN_CASHOUT_BALANCE_CENTS: 100,

  /* ─── Subsidy ─── */

  /** Platform budget per subsidized first campaign — the conversion funnel, not a cost center */
  SUBSIDY_BUDGET_PER_CAMPAIGN: 2.25,

  /** Target qualifying responses for subsidized campaigns — enough for a meaningful Decision Brief */
  SUBSIDY_TARGET_RESPONSES: 5,

  /** Flat payout per qualifying response on subsidized campaigns — matches quick format target for strong first impression */
  SUBSIDY_FLAT_PAYOUT: 0.45,

  /** Maximum account age (days) to remain eligible for subsidized first campaign */
  SUBSIDY_ELIGIBILITY_DAYS: 30,

  /** Monthly platform-wide subsidy spend cap (dollars) */
  SUBSIDY_MONTHLY_CAP: 1500,
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
