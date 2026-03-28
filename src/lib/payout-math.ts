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
