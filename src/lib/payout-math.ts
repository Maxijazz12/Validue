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

/* ═══════════════════════════════════════════════════════════════════════════
 * V2 Economics — flat qualified payout model
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
 * V2 payout distribution — flat qualified model.
 *
 * 1. Separate qualified vs disqualified responses
 * 2. Full distributable pool split equally among qualified
 * 3. Disqualified responses get $0 (their share stays in pool)
 * 4. Remainder reconciliation to the cent
 *
 * Bonus pool removed — at current price points ($0.45–0.60/response),
 * the bonus delta doesn't motivate behavior. Qualification gates do
 * the anti-spam work. Reintroduce quality-weighted payouts when avg
 * campaign funding crosses $50+.
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

  // Flat equal payout among qualified
  const flatPay = Math.round((distributable / qualified.length) * 100) / 100;

  // Build allocations for qualified responses
  const allocations: PayoutAllocationV2[] = qualified.map((r) => ({
    responseId: r.responseId,
    respondentId: r.respondentId,
    respondentName: r.respondentName,
    qualityScore: r.qualityScore,
    qualified: true,
    disqualificationReasons: [],
    basePayout: flatPay,
    bonusPayout: 0,
    suggestedAmount: flatPay,
    weight: 0,
  }));

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
    top.suggestedAmount = top.basePayout;
  }

  // Post-reconciliation invariant: sum must match distributable within 1 cent
  if (qualifiedAllocations.length > 0) {
    const finalSum = qualifiedAllocations.reduce((s, a) => s + a.suggestedAmount, 0);
    const drift = Math.abs(Math.round((finalSum - distributable) * 100));
    if (drift > 1) {
      throw new Error(
        `Payout sum invariant violated: sum=${finalSum.toFixed(2)}, distributable=${distributable.toFixed(2)}, drift=${drift}¢`
      );
    }
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

  // Cap paid slots at SUBSIDY_TARGET_RESPONSES to stay within budget
  let paidSlots = 0;
  return responses.map((r) => {
    const qual = qualMap.get(r.responseId);
    const isQualified = qual?.qualified === true;
    const isPaid = isQualified && paidSlots < DEFAULTS.SUBSIDY_TARGET_RESPONSES;
    if (isPaid) paidSlots++;
    // Qualified-but-unpaid responses are marked not-qualified with a clear reason
    // so downstream code doesn't see contradictory state (qualified + reasons).
    const effectiveQualified = isPaid;
    const reasons = !isQualified
      ? (qual?.reasons ?? [])
      : isPaid
        ? []
        : ["Subsidy budget exhausted"];

    return {
      responseId: r.responseId,
      respondentId: r.respondentId,
      respondentName: r.respondentName,
      qualityScore: r.qualityScore,
      qualified: effectiveQualified,
      disqualificationReasons: reasons,
      basePayout: isPaid ? DEFAULTS.SUBSIDY_FLAT_PAYOUT : 0,
      bonusPayout: 0,
      suggestedAmount: isPaid ? DEFAULTS.SUBSIDY_FLAT_PAYOUT : 0,
      weight: 0,
    };
  });
}
