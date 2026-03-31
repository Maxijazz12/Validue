import { DEFAULTS } from "./defaults";

/**
 * Pure payout distribution math — no DB or server dependencies.
 * Extracted from payout-actions.ts for testability.
 */

export type ScoredResponse = {
  responseId: string;
  respondentId: string;
  respondentName: string;
  qualityScore: number;
  confidence: number;
};

export type PayoutAllocation = {
  responseId: string;
  respondentId: string;
  respondentName: string;
  qualityScore: number;
  suggestedAmount: number;
  weight: number;
};

/**
 * Computes payout weight from a quality score.
 * Power-law with threshold at 25 — scores ≤ 25 get zero weight.
 */
export function payoutWeight(qualityScore: number): number {
  const shifted = Math.max(qualityScore - 25, 0);
  return Math.pow(shifted, 1.5);
}

/**
 * Distributes a pool across scored responses using weighted power-law allocation.
 *
 * - High-confidence responses get weighted allocation
 * - Low-confidence responses get equal share from a reserved pool
 * - Zero-weight fallback: equal split when all weights are 0
 * - Sub-minimum redistribution: amounts < MIN_PAYOUT redistributed to above-minimum
 * - Remainder reconciliation: adjusts top earner so sum === distributable exactly
 */
export function distributePayouts(
  responses: ScoredResponse[],
  distributable: number
): PayoutAllocation[] {
  if (responses.length === 0 || distributable <= 0) return [];

  // Separate high-confidence (weighted) and low-confidence (equal share)
  const highConf = responses.filter(
    (r) => r.confidence >= DEFAULTS.PAYOUT_CONFIDENCE_THRESHOLD
  );
  const lowConf = responses.filter(
    (r) => r.confidence < DEFAULTS.PAYOUT_CONFIDENCE_THRESHOLD
  );

  // Reserve proportional share for low-confidence responses
  const lowConfShare =
    lowConf.length > 0
      ? (lowConf.length / responses.length) * distributable
      : 0;
  const highConfPool = distributable - lowConfShare;

  let allocations: PayoutAllocation[] = [];

  // High-confidence weighted allocation
  if (highConf.length > 0) {
    const scored = highConf.map((r) => ({
      ...r,
      weight: payoutWeight(r.qualityScore),
    }));

    const totalWeight = scored.reduce((sum, r) => sum + r.weight, 0);

    if (totalWeight === 0) {
      // Zero-weight fallback: equal distribution
      const equalShare = Math.round((highConfPool / scored.length) * 100) / 100;
      allocations = scored.map((r) => ({
        ...r,
        suggestedAmount: equalShare,
      }));
    } else {
      // Proportional allocation
      const initial: PayoutAllocation[] = scored.map((r) => ({
        ...r,
        suggestedAmount:
          Math.round(((r.weight / totalWeight) * highConfPool) * 100) / 100,
      }));

      // Sub-minimum redistribution
      const aboveMin = initial.filter(
        (s) => s.suggestedAmount >= DEFAULTS.MIN_PAYOUT
      );
      const belowMinTotal = initial
        .filter((s) => s.suggestedAmount < DEFAULTS.MIN_PAYOUT)
        .reduce((sum, s) => sum + s.suggestedAmount, 0);

      allocations = aboveMin;

      if (belowMinTotal > 0 && allocations.length > 0) {
        const remainingWeight = allocations.reduce((s, r) => s + r.weight, 0);
        if (remainingWeight > 0) {
          for (const s of allocations) {
            s.suggestedAmount += (s.weight / remainingWeight) * belowMinTotal;
            s.suggestedAmount = Math.round(s.suggestedAmount * 100) / 100;
          }
        }
      }
    }
  }

  // Low-confidence equal share
  if (lowConf.length > 0) {
    const equalLowShare =
      Math.round((lowConfShare / lowConf.length) * 100) / 100;
    for (const r of lowConf) {
      allocations.push({
        ...r,
        suggestedAmount: equalLowShare,
        weight: 0,
      });
    }
  }

  // Remainder reconciliation: ensure sum === distributable to the cent
  const totalAllocated = allocations.reduce(
    (s, a) => s + a.suggestedAmount,
    0
  );
  const remainder = Math.round((distributable - totalAllocated) * 100) / 100;
  if (allocations.length > 0 && remainder !== 0) {
    allocations.sort((a, b) => b.suggestedAmount - a.suggestedAmount);
    allocations[0].suggestedAmount =
      Math.round((allocations[0].suggestedAmount + remainder) * 100) / 100;
  }

  return allocations;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * V2 Economics — base + bonus model
 * ═══════════════════════════════════════════════════════════════════════════ */

export type CampaignFormat = "quick" | "standard";

export type ResponseMetadata = {
  totalTimeMs: number;
  openAnswers: { charCount: number }[];
  spamFlagged?: boolean;
};

export type QualificationResult = {
  responseId: string;
  qualified: boolean;
  reasons: string[];
};

export type PayoutAllocationV2 = {
  responseId: string;
  respondentId: string;
  respondentName: string;
  qualityScore: number;
  qualified: boolean;
  disqualificationReasons: string[];
  basePayout: number;
  bonusPayout: number;
  /** basePayout + bonusPayout (backward compat with V1 consumers) */
  suggestedAmount: number;
  weight: number;
};

/**
 * V2 bonus weight — linear, starting at BONUS_MIN_SCORE.
 * Every point above the threshold earns proportionally more bonus.
 */
export function bonusWeightV2(qualityScore: number): number {
  return Math.max(qualityScore - DEFAULTS.BONUS_MIN_SCORE, 0);
}

/**
 * Determines whether a response qualifies for base pay.
 *
 * Qualification criteria (all must pass):
 * 1. qualityScore >= QUALIFICATION_MIN_SCORE
 * 2. At least 1 open-ended answer >= MIN_OPEN_ANSWER_CHARS
 * 3. Total time >= format minimum
 * 4. Not spam-flagged
 */
export function qualifyResponse(
  response: ScoredResponse,
  format: CampaignFormat,
  metadata: ResponseMetadata
): QualificationResult {
  const reasons: string[] = [];

  if (response.qualityScore < DEFAULTS.QUALIFICATION_MIN_SCORE) {
    reasons.push("quality_score_below_threshold");
  }

  const hasValidOpen = metadata.openAnswers.some(
    (a) => a.charCount >= DEFAULTS.MIN_OPEN_ANSWER_CHARS
  );
  if (!hasValidOpen) {
    reasons.push("open_answer_too_short");
  }

  const minTime =
    format === "quick"
      ? DEFAULTS.MIN_RESPONSE_TIME_QUICK_MS
      : DEFAULTS.MIN_RESPONSE_TIME_STANDARD_MS;
  if (metadata.totalTimeMs < minTime) {
    reasons.push("insufficient_time");
  }

  if (metadata.spamFlagged) {
    reasons.push("spam_detected");
  }

  return {
    responseId: response.responseId,
    qualified: reasons.length === 0,
    reasons,
  };
}

/**
 * Computes the default target response count from distributable amount and format.
 */
export function defaultTargetResponses(
  distributable: number,
  format: CampaignFormat
): number {
  const targetAvg =
    format === "quick"
      ? DEFAULTS.TARGET_AVG_PAYOUT_QUICK
      : DEFAULTS.TARGET_AVG_PAYOUT_STANDARD;
  return Math.min(
    DEFAULTS.MAX_TARGET_RESPONSES,
    Math.max(DEFAULTS.MIN_TARGET_RESPONSES_V2, Math.floor(distributable / targetAvg))
  );
}

/**
 * V2 payout distribution — base + bonus model.
 *
 * 1. Separate qualified vs disqualified responses
 * 2. Base pool (60%) split equally among qualified
 * 3. Bonus pool (40%) split proportionally by bonusWeightV2 among score >= 50
 * 4. If no bonus earners, fold bonus pool into base pool
 * 5. Remainder reconciliation to the cent
 *
 * For subsidized campaigns, use distributeSubsidizedPayouts instead.
 */
export function distributePayoutsV2(
  responses: ScoredResponse[],
  distributable: number,
  qualificationResults: QualificationResult[]
): PayoutAllocationV2[] {
  if (responses.length === 0 || distributable <= 0) return [];

  // Build a lookup for qualification
  const qualMap = new Map(qualificationResults.map((q) => [q.responseId, q]));

  // Separate qualified and disqualified
  const qualified = responses.filter(
    (r) => qualMap.get(r.responseId)?.qualified === true
  );
  const disqualified = responses.filter(
    (r) => qualMap.get(r.responseId)?.qualified !== true
  );

  // If nobody qualifies, return all zeros
  if (qualified.length === 0) {
    return responses.map((r) => ({
      responseId: r.responseId,
      respondentId: r.respondentId,
      respondentName: r.respondentName,
      qualityScore: r.qualityScore,
      qualified: false,
      disqualificationReasons: qualMap.get(r.responseId)?.reasons ?? [],
      basePayout: 0,
      bonusPayout: 0,
      suggestedAmount: 0,
      weight: 0,
    }));
  }

  // Compute bonus weights for qualified responses
  const withWeights = qualified.map((r) => ({
    ...r,
    weight: bonusWeightV2(r.qualityScore),
  }));
  const totalBonusWeight = withWeights.reduce((sum, r) => sum + r.weight, 0);

  // Determine pool split
  let basePool: number;
  let bonusPool: number;

  if (totalBonusWeight === 0) {
    // No bonus earners — fold everything into base
    basePool = distributable;
    bonusPool = 0;
  } else {
    basePool = distributable * DEFAULTS.BASE_POOL_RATIO;
    bonusPool = distributable * DEFAULTS.BONUS_POOL_RATIO;
  }

  // Base pay: equal among qualified
  const rawBasePay = basePool / qualified.length;
  const basePay = Math.round(rawBasePay * 100) / 100;

  // Build allocations for qualified responses
  const allocations: PayoutAllocationV2[] = withWeights.map((r) => {
    const bonus =
      totalBonusWeight > 0
        ? Math.round(((r.weight / totalBonusWeight) * bonusPool) * 100) / 100
        : 0;
    return {
      responseId: r.responseId,
      respondentId: r.respondentId,
      respondentName: r.respondentName,
      qualityScore: r.qualityScore,
      qualified: true,
      disqualificationReasons: [],
      basePayout: basePay,
      bonusPayout: bonus,
      suggestedAmount: Math.round((basePay + bonus) * 100) / 100,
      weight: r.weight,
    };
  });

  // Add disqualified responses
  for (const r of disqualified) {
    allocations.push({
      responseId: r.responseId,
      respondentId: r.respondentId,
      respondentName: r.respondentName,
      qualityScore: r.qualityScore,
      qualified: false,
      disqualificationReasons: qualMap.get(r.responseId)?.reasons ?? [],
      basePayout: 0,
      bonusPayout: 0,
      suggestedAmount: 0,
      weight: 0,
    });
  }

  // Remainder reconciliation: ensure qualified payouts sum === distributable to the cent
  const qualifiedAllocations = allocations.filter((a) => a.qualified);
  const totalAllocated = qualifiedAllocations.reduce(
    (s, a) => s + a.suggestedAmount,
    0
  );
  const remainder = Math.round((distributable - totalAllocated) * 100) / 100;
  if (qualifiedAllocations.length > 0 && remainder !== 0) {
    qualifiedAllocations.sort((a, b) => b.suggestedAmount - a.suggestedAmount);
    const top = qualifiedAllocations[0];
    top.basePayout = Math.round((top.basePayout + remainder) * 100) / 100;
    top.suggestedAmount = Math.round((top.basePayout + top.bonusPayout) * 100) / 100;
  }

  return allocations;
}

/**
 * Subsidized campaign payout — flat amount per qualifying response, no bonus pool.
 */
export function distributeSubsidizedPayouts(
  responses: ScoredResponse[],
  qualificationResults: QualificationResult[]
): PayoutAllocationV2[] {
  const qualMap = new Map(qualificationResults.map((q) => [q.responseId, q]));

  return responses.map((r) => {
    const qual = qualMap.get(r.responseId);
    const isQualified = qual?.qualified === true;
    return {
      responseId: r.responseId,
      respondentId: r.respondentId,
      respondentName: r.respondentName,
      qualityScore: r.qualityScore,
      qualified: isQualified,
      disqualificationReasons: qual?.reasons ?? [],
      basePayout: isQualified ? DEFAULTS.SUBSIDY_FLAT_PAYOUT : 0,
      bonusPayout: 0,
      suggestedAmount: isQualified ? DEFAULTS.SUBSIDY_FLAT_PAYOUT : 0,
      weight: 0,
    };
  });
}
