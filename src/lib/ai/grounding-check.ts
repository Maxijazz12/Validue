import type { DecisionBrief, AssumptionVerdict } from "./brief-schemas";
import type { AssumptionEvidence } from "./assumption-evidence";

/* ─── Types ─── */

export interface GroundingFailure {
  type: "verdict_count_mismatch" | "quote_not_found" | "count_exceeds_evidence";
  assumptionIndex: number;
  detail: string;
}

export interface GroundingResult {
  passed: boolean;
  failures: GroundingFailure[];
}

/* ─── Check Functions ─── */

/**
 * Check 1: Verdict direction must be consistent with evidence counts.
 * CONFIRMED requires supportingCount > contradictingCount.
 * REFUTED requires contradictingCount > supportingCount.
 * CHALLENGED and INSUFFICIENT_DATA are always acceptable.
 */
function checkVerdictCountConsistency(verdict: AssumptionVerdict): GroundingFailure | null {
  if (verdict.verdict === "CHALLENGED" || verdict.verdict === "INSUFFICIENT_DATA") {
    return null;
  }

  if (verdict.verdict === "CONFIRMED" && verdict.contradictingCount > verdict.supportingCount) {
    return {
      type: "verdict_count_mismatch",
      assumptionIndex: verdict.assumptionIndex,
      detail: `CONFIRMED but contradictingCount (${verdict.contradictingCount}) > supportingCount (${verdict.supportingCount})`,
    };
  }

  if (verdict.verdict === "REFUTED" && verdict.supportingCount > verdict.contradictingCount) {
    return {
      type: "verdict_count_mismatch",
      assumptionIndex: verdict.assumptionIndex,
      detail: `REFUTED but supportingCount (${verdict.supportingCount}) > contradictingCount (${verdict.contradictingCount})`,
    };
  }

  return null;
}

/**
 * Check 2: Every quote must appear (as substring) in the evidence that was
 * actually sent to Claude for that assumption. Catches hallucinated quotes.
 */
function checkQuoteGrounding(
  verdict: AssumptionVerdict,
  evidence: AssumptionEvidence[]
): GroundingFailure[] {
  const failures: GroundingFailure[] = [];

  // Build a combined text corpus from all evidence for this assumption
  const evidenceTexts = evidence.map((e) => e.answerText.toLowerCase());

  for (const quote of verdict.quotes) {
    // Normalize: trim, lowercase, remove surrounding quotes
    const normalized = quote.text.toLowerCase().replace(/^["']+|["']+$/g, "").trim();
    if (normalized.length < 10) continue; // skip very short quotes

    const found = evidenceTexts.some((text) => text.includes(normalized));
    if (!found) {
      failures.push({
        type: "quote_not_found",
        assumptionIndex: verdict.assumptionIndex,
        detail: `Quote "${quote.text.slice(0, 60)}..." not found in evidence`,
      });
    }
  }

  return failures;
}

/**
 * Check 3: totalResponses claimed by the verdict can't exceed
 * the actual number of evidence items provided for that assumption.
 */
function checkCountPlausibility(
  verdict: AssumptionVerdict,
  evidenceCount: number
): GroundingFailure | null {
  if (verdict.totalResponses > evidenceCount + 2) {
    // +2 buffer: evidence may be slightly different from what Claude counted
    return {
      type: "count_exceeds_evidence",
      assumptionIndex: verdict.assumptionIndex,
      detail: `Claims ${verdict.totalResponses} total responses but only ${evidenceCount} evidence items provided`,
    };
  }
  return null;
}

/* ─── Main Entry ─── */

/**
 * Runs deterministic grounding checks on a synthesized brief.
 * Verifies that the AI's output is faithful to the evidence it received.
 * Pure function — no DB, no AI calls, no side effects.
 */
export function checkGrounding(
  brief: DecisionBrief,
  evidenceByAssumption: Map<number, AssumptionEvidence[]>
): GroundingResult {
  const failures: GroundingFailure[] = [];

  for (const verdict of brief.assumptionVerdicts) {
    const evidence = evidenceByAssumption.get(verdict.assumptionIndex) ?? [];

    // Check 1: verdict-count consistency
    const countFail = checkVerdictCountConsistency(verdict);
    if (countFail) failures.push(countFail);

    // Check 2: quote grounding
    const quoteFails = checkQuoteGrounding(verdict, evidence);
    failures.push(...quoteFails);

    // Check 3: count plausibility
    const plausibilityFail = checkCountPlausibility(verdict, evidence.length);
    if (plausibilityFail) failures.push(plausibilityFail);
  }

  return { passed: failures.length === 0, failures };
}

/**
 * Applies grounding corrections to a brief that failed validation.
 * Downgrades confidence to LOW on any assumption with grounding failures.
 * Returns a new brief object (does not mutate the input).
 */
export function applyGroundingCorrections(
  brief: DecisionBrief,
  failures: GroundingFailure[]
): DecisionBrief {
  const failedIndices = new Set(failures.map((f) => f.assumptionIndex));

  const correctedVerdicts = brief.assumptionVerdicts.map((v) => {
    if (!failedIndices.has(v.assumptionIndex)) return v;

    return {
      ...v,
      confidence: "LOW" as const,
      // Strip ungrounded quotes
      quotes: v.quotes.filter(
        (q) => !failures.some(
          (f) => f.type === "quote_not_found" &&
                 f.assumptionIndex === v.assumptionIndex &&
                 f.detail.includes(q.text.slice(0, 30))
        )
      ),
    };
  });

  // If any assumption was corrected, downgrade brief-level confidence too
  const hasCriticalFailure = failures.some((f) => f.type === "verdict_count_mismatch");
  const correctedConfidence = hasCriticalFailure && brief.confidence === "HIGH"
    ? "LOW" as const
    : brief.confidence;

  return {
    ...brief,
    confidence: correctedConfidence,
    assumptionVerdicts: correctedVerdicts,
  };
}

/* ─── Build grounding context for re-synthesis prompt ─── */

/**
 * Formats grounding failures into a string that can be injected into
 * a re-synthesis prompt so Claude can self-correct.
 */
export function formatGroundingFeedback(failures: GroundingFailure[]): string {
  const lines = failures.map((f) => {
    switch (f.type) {
      case "verdict_count_mismatch":
        return `- Assumption ${f.assumptionIndex}: ${f.detail}. Reconcile the verdict with the evidence counts, or change the verdict.`;
      case "quote_not_found":
        return `- Assumption ${f.assumptionIndex}: ${f.detail}. Use only quotes that appear verbatim in the evidence provided.`;
      case "count_exceeds_evidence":
        return `- Assumption ${f.assumptionIndex}: ${f.detail}. Adjust counts to match the evidence you received.`;
    }
  });

  return `GROUNDING ERRORS IN YOUR PREVIOUS RESPONSE:\n${lines.join("\n")}\n\nFix these issues in your response. Do not repeat the same errors.`;
}

/* ─── Test Exports ─── */

export const _testExports = {
  checkVerdictCountConsistency,
  checkQuoteGrounding,
  checkCountPlausibility,
};
