import { PLAN_CONFIG, PLATFORM_FEE_RATE, type PlanTier } from "./plans";

/* ─── Types ─── */

export type ReachEstimate = {
  baselineRU: number;
  fundedRU: number;
  totalRU: number;
  estimatedResponsesLow: number;
  estimatedResponsesHigh: number;
};

/* ─── Conversion Rate Estimation ─── */

/**
 * Estimates conversion rate (impression → completed response) based on
 * how attractive the per-response payout is.
 *
 * v1: static tiers. v2 will use marketplace-learned rates.
 */
function estimateConversionRate(payoutPerResponse: number): number {
  if (payoutPerResponse <= 0) return 0.03;
  if (payoutPerResponse < 0.5) return 0.06;
  if (payoutPerResponse < 1.0) return 0.10;
  if (payoutPerResponse < 2.0) return 0.15;
  return 0.20;
}

/* ─── Main Reach Calculation ─── */

/**
 * Calculates total reach units and estimated responses for a campaign.
 *
 * Formula: Total RU = Baseline RU + (Funding × Tier Multiplier)
 * Response estimates use conversion rates based on payout attractiveness.
 */
export function calculateReach(
  tier: PlanTier,
  fundingAmount: number,
  options?: {
    isFirstCampaign?: boolean;
    isFirstMonth?: boolean;
  }
): ReachEstimate {
  const plan = PLAN_CONFIG[tier];

  // Apply welcome bonus: 2x baseline on first campaign during first month
  let baselineRU = plan.baselineReachUnits;
  if (
    tier === "free" &&
    options?.isFirstMonth &&
    options?.isFirstCampaign
  ) {
    baselineRU *= 2; // 200 RU instead of 100
  }

  const effectiveFunding = Math.max(0, fundingAmount);
  const fundedRU = Math.round(effectiveFunding * plan.reachPerDollar);
  const totalRU = baselineRU + fundedRU;

  // Estimate per-response payout to gauge attractiveness
  // Assume ~8% of total reach converts to estimate denominator
  const estimatedResponders = Math.max(1, totalRU * 0.08);
  const distributable = effectiveFunding * (1 - PLATFORM_FEE_RATE);
  const payoutPerResponse =
    effectiveFunding > 0 ? distributable / estimatedResponders : 0;

  const conversionRate = estimateConversionRate(payoutPerResponse);
  const rawEstimate = totalRU * conversionRate;

  // Apply ±40% range for uncertainty
  const estimatedResponsesLow = Math.max(1, Math.floor(rawEstimate * 0.6));
  const estimatedResponsesHigh = Math.ceil(rawEstimate * 1.4);

  return {
    baselineRU,
    fundedRU,
    totalRU,
    estimatedResponsesLow,
    estimatedResponsesHigh,
  };
}

/* ─── Funding Validation ─── */

/**
 * Validates a funding amount against the tier's minimum.
 * $0 is always valid (baseline-only campaign).
 * Any positive amount must meet the minimum floor.
 */
export function validateFunding(
  tier: PlanTier,
  amount: number
): { valid: boolean; reason?: string } {
  if (amount === 0) return { valid: true };

  const plan = PLAN_CONFIG[tier];
  if (amount < plan.minFundingAmount) {
    return {
      valid: false,
      reason: `Minimum funding is $${plan.minFundingAmount} on the ${tier} plan. Use $0 for a baseline-only campaign.`,
    };
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
  audienceFilterCount: number
): string[] {
  const warnings: string[] = [];
  const estimate = calculateReach(tier, fundingAmount);

  // Low payout warning
  if (fundingAmount > 0) {
    const distributable = fundingAmount * (1 - PLATFORM_FEE_RATE);
    const avgPayout = distributable / Math.max(1, estimate.estimatedResponsesHigh);
    if (avgPayout < 0.5) {
      warnings.push(
        "Low reward per response may reduce response rate. Consider increasing your fund for faster, higher-quality results."
      );
    }
  }

  // No funding warning
  if (fundingAmount === 0) {
    warnings.push(
      "Campaigns without funding rely on intrinsic motivation. Expect fewer and slower responses."
    );
  }

  // Narrow audience warning
  if (audienceFilterCount >= 4) {
    warnings.push(
      "Very specific targeting may limit your respondent pool. Consider broadening your audience for faster fill."
    );
  }

  return warnings;
}
