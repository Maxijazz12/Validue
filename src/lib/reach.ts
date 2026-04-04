import {
  PLAN_CONFIG,
  PLATFORM_FEE_RATE,
  STRENGTH_THRESHOLDS,
  WELCOME_BONUS,
  type PlanTier,
} from "./plans";
import { DEFAULTS } from "./defaults";

/* ─── Types ─── */

export type ReachEstimate = {
  baselineRU: number;
  fundedRU: number;
  totalRU: number;
  effectiveReach: number;
  qualityModifier: number;
  campaignStrength: number;
  strengthLabel: string;
  estimatedResponsesLow: number;
  estimatedResponsesHigh: number;
};

export type FundingPreset = {
  label: string;
  amount: number;
  strength: number;
  strengthLabel: string;
  estimatedResponsesLow: number;
  estimatedResponsesHigh: number;
  fillSpeedLabel: string;
  recommended: boolean;
};

/* ─── Quality Modifier ─── */

/**
 * V2: Tighter range [0.7, 1.3] centered at 1.0x when score = 50.
 * V2.1: Locked to 1.0x (neutral) until campaign has enough ranked responses
 *        to produce a meaningful signal. Prevents premature reach penalties.
 *
 *   qualityScore 0   → 0.7x  (30% penalty)
 *   qualityScore 50  → 1.0x  (neutral)
 *   qualityScore 100 → 1.3x  (30% bonus)
 */
export function getQualityModifier(
  qualityScore: number,
  rankedResponseCount?: number
): number {
  // Gate: no quality influence until enough signal exists
  if (
    rankedResponseCount !== undefined &&
    rankedResponseCount < DEFAULTS.QUALITY_INFLUENCE_MIN_RESPONSES
  ) {
    return 1.0;
  }
  const clamped = Math.max(0, Math.min(100, qualityScore));
  return 0.7 + (clamped / 100) * 0.6;
}

/**
 * Campaign strength ratchet — strength can only increase, never decrease.
 * Prevents mid-campaign visibility drops from score fluctuations.
 */
export function resolveStrength(
  currentStrength: number,
  newStrength: number
): number {
  return Math.max(currentStrength, newStrength);
}

/* ─── Diminishing Returns ─── */

/**
 * Calculates funded reach units with soft logarithmic diminishing returns
 * above the tier's efficient zone threshold.
 *
 * Below the zone: fully linear (fundingAmount × reachPerDollar)
 * Above the zone: base + diminished excess via ln(1 + excess/zone)
 */
function calculateFundedRU(
  fundingAmount: number,
  reachPerDollar: number,
  efficientZone: number
): number {
  const effective = Math.max(0, fundingAmount);
  if (effective <= efficientZone) {
    return Math.round(effective * reachPerDollar);
  }
  const base = efficientZone * reachPerDollar;
  const excess = effective - efficientZone;
  const diminished =
    reachPerDollar * efficientZone * Math.log(1 + excess / efficientZone);
  return Math.round(base + diminished);
}

/* ─── Campaign Strength ─── */

/**
 * V2: Absolute scale — maps effective reach to 1–10 using fixed thresholds.
 * "Strength 8" means the same thing regardless of tier.
 */
export function getCampaignStrength(effectiveReach: number): number {
  for (let i = STRENGTH_THRESHOLDS.length - 1; i >= 0; i--) {
    if (effectiveReach >= STRENGTH_THRESHOLDS[i]) return Math.min(i + 1, 10);
  }
  return 1;
}

/**
 * Returns a human-readable label for a Campaign Strength score.
 */
export function getStrengthLabel(strength: number): string {
  if (strength <= 3)
    return "Low reach — fewer respondents will see your campaign";
  if (strength <= 5)
    return "Growing reach — your campaign will attract qualified respondents";
  if (strength <= 7)
    return "Strong reach — expect a healthy volume of responses";
  if (strength <= 9)
    return "High reach — your campaign gets priority placement";
  return "Peak reach — maximum exposure for your plan tier";
}

/* ─── Response Estimation ─── */

const BASE_CONVERSION_RATE = 0.06;

/**
 * V2: Non-circular conversion estimation.
 * Base 6% conversion + saturating payout bonus (asymptote ~+14%).
 */
function estimateConversionRate(payoutPerResponse: number): number {
  const payoutBonus =
    0.14 * (1 - Math.exp(-Math.max(0, payoutPerResponse) / 1.5));
  return BASE_CONVERSION_RATE + payoutBonus;
}

/* ─── Main Reach Calculation ─── */

/**
 * Calculates total reach units, effective reach (with quality modifier and
 * diminishing returns), campaign strength, and estimated responses.
 *
 * This is the single source of truth for all reach-related metrics.
 */
export function calculateReach(
  tier: PlanTier,
  fundingAmount: number,
  options?: {
    isFirstCampaign?: boolean;
    isFirstMonth?: boolean;
    qualityScore?: number;
    rankedResponseCount?: number;
  }
): ReachEstimate {
  const plan = PLAN_CONFIG[tier];

  // Apply welcome bonus multiplier on first campaign during first month (free only)
  let baselineRU = plan.baselineReachUnits;
  if (tier === "free" && options?.isFirstMonth && options?.isFirstCampaign) {
    baselineRU = Math.round(baselineRU * WELCOME_BONUS.firstCampaignReachMultiplier);
  }

  // Calculate funded RU with diminishing returns
  const fundedRU = calculateFundedRU(
    fundingAmount,
    plan.reachPerDollar,
    plan.efficientZone
  );
  const totalRU = baselineRU + fundedRU;

  // Apply quality modifier (defaults to DEFAULTS.QUALITY_SCORE if not provided — neutral 1.0x)
  const qualityScore = options?.qualityScore ?? DEFAULTS.QUALITY_SCORE;
  const qualityMod = getQualityModifier(qualityScore, options?.rankedResponseCount);
  const effectiveReach = Math.round(totalRU * qualityMod);

  // Campaign Strength (1–10, absolute scale)
  const strength = getCampaignStrength(effectiveReach);
  const strengthLbl = getStrengthLabel(strength);

  // V2: Converged response estimation (3 iterations to eliminate circularity)
  const safeFunding = Math.max(0, fundingAmount);
  const distributable = safeFunding * (1 - PLATFORM_FEE_RATE);

  // Iterative convergence: 3 passes is sufficient because estimateConversionRate
  // is monotonic in ppr and the feedback loop (reach→responses→ppr→conversion)
  // contracts toward a fixed point. Empirically converges within 2 iterations.
  let conversionRate = BASE_CONVERSION_RATE;
  for (let i = 0; i < 3; i++) {
    const resp = Math.max(1, effectiveReach * conversionRate);
    const ppr = safeFunding > 0 ? distributable / resp : 0;
    conversionRate = estimateConversionRate(ppr);
  }

  const rawEstimate = effectiveReach * conversionRate;

  // Apply ±40% range for uncertainty
  const estimatedResponsesLow = Math.max(1, Math.floor(rawEstimate * 0.6));
  const estimatedResponsesHigh = Math.max(1, Math.ceil(rawEstimate * 1.4));

  return {
    baselineRU,
    fundedRU,
    totalRU,
    effectiveReach,
    qualityModifier: qualityMod,
    campaignStrength: strength,
    strengthLabel: strengthLbl,
    estimatedResponsesLow,
    estimatedResponsesHigh,
  };
}

/* ─── Funding Presets ─── */

/**
 * Returns funding preset cards with pre-computed outcomes for the UI.
 * The preset that achieves strength ≥ 7 is marked as recommended.
 */
/** Tier-aware recommended strength thresholds */
const RECOMMENDED_STRENGTH: Record<PlanTier, number> = {
  free: 5,
  pro: 7,
};

export function getFundingPresets(
  tier: PlanTier,
  qualityScore: number = DEFAULTS.QUALITY_SCORE
): FundingPreset[] {
  const amounts = [0, 10, 25, 50];
  const labels = ["No funding", "Initial push", "Recommended", "Max reach"];
  const opts = { qualityScore };
  const target = RECOMMENDED_STRENGTH[tier];

  let recommendedIdx = -1;

  const presets = amounts.map((amount, i) => {
    const est = calculateReach(tier, amount, opts);
    const fillSpeed = estimateFillSpeed(est.effectiveReach);
    if (recommendedIdx === -1 && est.campaignStrength >= target) {
      recommendedIdx = i;
    }
    return {
      label: labels[i],
      amount,
      strength: est.campaignStrength,
      strengthLabel: est.strengthLabel,
      estimatedResponsesLow: est.estimatedResponsesLow,
      estimatedResponsesHigh: est.estimatedResponsesHigh,
      fillSpeedLabel: fillSpeed,
      recommended: false,
    };
  });

  // If no preset hits the target, recommend the highest one
  if (recommendedIdx === -1) recommendedIdx = presets.length - 1;
  presets[recommendedIdx].recommended = true;

  return presets;
}

/* ─── Fill Speed Estimation ─── */

/**
 * Estimates how quickly a campaign will fill based on effective reach.
 * Uses rough marketplace velocity assumptions.
 */
export function estimateFillSpeed(effectiveReach: number): string {
  if (effectiveReach >= 3000) return "Fast — typically under a day";
  if (effectiveReach >= 1500) return "Fast — 1 to 2 days";
  if (effectiveReach >= 800) return "Moderate — 2 to 3 days";
  if (effectiveReach >= 400) return "Moderate — 3 to 5 days";
  if (effectiveReach >= 150) return "Steady — about a week";
  return "Slower — 1 to 2 weeks";
}

/* ─── Funding Validation ─── */

/**
 * Validates a funding amount against tier minimum, max cap, and format.
 * $0 is always valid (baseline-only campaign).
 * Any positive amount must meet the minimum floor, not exceed the cap,
 * and be a valid cent-aligned positive number.
 */
export function validateFunding(
  tier: PlanTier,
  amount: number
): { valid: boolean; reason?: string } {
  if (amount === 0) return { valid: true };

  // Guard against NaN, Infinity, negative, non-finite
  if (!Number.isFinite(amount) || amount < 0) {
    return { valid: false, reason: "Invalid funding amount." };
  }

  const plan = PLAN_CONFIG[tier];
  if (amount < plan.minFundingAmount) {
    return {
      valid: false,
      reason: `The minimum budget is $${plan.minFundingAmount} on your plan. You can also run for free with $0.`,
    };
  }

  if (amount > DEFAULTS.MAX_FUNDING_AMOUNT) {
    return {
      valid: false,
      reason: `Maximum funding is $${DEFAULTS.MAX_FUNDING_AMOUNT.toLocaleString()}.`,
    };
  }

  // Ensure cent-aligned (no fractional cents) — use tolerance for IEEE754 float imprecision
  if (Math.abs(Math.round(amount * 100) - amount * 100) > 0.01) {
    return { valid: false, reason: "Amount must be in whole cents." };
  }

  return { valid: true };
}

/* ─── Warnings ─── */

/**
 * Returns user-facing warnings about campaign setup that may lead to
 * low response rates or wasted spend.
 */
export function getCampaignWarnings(
  tier: PlanTier,
  fundingAmount: number,
  audienceFilterCount: number,
  qualityScore?: number,
  targetingMode?: "broad" | "balanced" | "strict"
): string[] {
  const warnings: string[] = [];
  const estimate = calculateReach(tier, fundingAmount, { qualityScore });

  // Low payout warning
  if (fundingAmount > 0) {
    const distributable = fundingAmount * (1 - PLATFORM_FEE_RATE);
    const avgPayout =
      distributable / Math.max(1, estimate.estimatedResponsesHigh);
    if (avgPayout < 0.5) {
      warnings.push(
        "At this budget, individual rewards are quite small. Increasing your fund will attract more thoughtful responses."
      );
    }
  }

  // No funding warning
  if (fundingAmount === 0) {
    warnings.push(
      "Without a reward budget, responses will come more slowly. Even a small fund makes a meaningful difference."
    );
  }

  // Narrow audience warning — threshold varies by targeting mode
  const narrowThreshold = targetingMode === "strict" ? 3 : 4;
  if (audienceFilterCount >= narrowThreshold) {
    warnings.push(
      targetingMode === "strict"
        ? "Strict targeting with this many dimensions will significantly limit eligible respondents. Consider removing some filters or switching to Balanced."
        : "Your targeting is very specific, which may limit how many people can respond. Broadening slightly will help your campaign fill faster."
    );
  }

  // Strict mode general notice
  if (targetingMode === "strict" && audienceFilterCount >= 1) {
    warnings.push(
      "Strict targeting requires respondents to match every dimension you set. This guarantees relevance but may slow campaign fill."
    );
  }

  // Low quality warning
  if (qualityScore !== undefined && qualityScore < 50) {
    warnings.push(
      "Your survey quality is limiting how many people see your campaign. Improving your questions will unlock more reach."
    );
  }

  return warnings;
}
