import type { AssumptionEvidence } from "./assumption-evidence";
import { DEFAULTS } from "@/lib/defaults";

/* ─── Types ─── */

export interface SegmentDisagreement {
  assumptionIndex: number;
  assumption: string;
  severity: "high" | "medium";
  highMatchCount: number;
  highMatchSupportRatio: number;
  lowMatchCount: number;
  lowMatchSupportRatio: number;
  signal: string;
}

export interface SegmentReport {
  disagreements: SegmentDisagreement[];
  /** e.g. "2 of 5 assumptions show audience segment disagreements" */
  summary: string | null;
}

/* ─── Thresholds ─── */

const HIGH_MATCH_THRESHOLD = DEFAULTS.MATCH_BUCKET_CORE_THRESHOLD;
const LOW_MATCH_THRESHOLD = DEFAULTS.MATCH_BUCKET_ADJACENT_THRESHOLD;
const MIN_SEGMENT_SIZE = 2;

/* ─── Helpers ─── */

/** Phrases in open-ended answers that signal contradicting evidence,
 *  even when the question category is not "negative". */
const CONTRADICTING_PHRASES = [
  "would never",
  "wouldn't use",
  "wouldn't pay",
  "not interested",
  "don't need",
  "don't have this problem",
  "waste of money",
  "no need",
  "wouldn't buy",
  "not worth",
  "don't see the point",
  "wouldn't switch",
];

function classifyEvidence(
  evidenceCategory: string,
  answerText?: string
): "supporting" | "contradicting" {
  if (evidenceCategory === "negative") return "contradicting";

  // Check answer content for contradicting signals regardless of category
  if (answerText) {
    const lower = answerText.toLowerCase();
    if (CONTRADICTING_PHRASES.some((phrase) => lower.includes(phrase))) {
      return "contradicting";
    }
  }

  return "supporting";
}

interface SegmentStats {
  count: number;
  supportRatio: number;
}

function computeSegmentRatios(bucket: AssumptionEvidence[]): SegmentStats {
  if (bucket.length === 0) return { count: 0, supportRatio: 0 };
  const supportCount = bucket.filter(
    (e) => classifyEvidence(e.evidenceCategory, e.answerText) === "supporting"
  ).length;
  return {
    count: bucket.length,
    supportRatio: supportCount / bucket.length,
  };
}

/* ─── Main Entry Point ─── */

/**
 * Detects disagreements between high-match and low-match audience segments
 * for each assumption. Pure function — no DB or AI calls.
 *
 * Flags when the founder's target audience sees the assumption differently
 * than peripheral respondents, especially the dangerous case where optimism
 * is anchored to the wrong audience.
 */
export function detectSegmentDisagreements(
  evidenceByAssumption: Map<number, AssumptionEvidence[]>,
  assumptions: string[]
): SegmentReport {
  const disagreements: SegmentDisagreement[] = [];

  for (let i = 0; i < assumptions.length; i++) {
    const evidence = evidenceByAssumption.get(i);
    if (!evidence || evidence.length === 0) continue;

    const highMatch = evidence.filter(
      (e) => e.audienceMatch >= HIGH_MATCH_THRESHOLD
    );
    const lowMatch = evidence.filter(
      (e) => e.audienceMatch < LOW_MATCH_THRESHOLD
    );

    const high = computeSegmentRatios(highMatch);
    const low = computeSegmentRatios(lowMatch);

    // Need at least MIN_SEGMENT_SIZE in high-match for any detection
    if (high.count < MIN_SEGMENT_SIZE) continue;

    // Condition A (high severity): target audience contradicts, peripheral supports
    // Requires both segments to have enough respondents
    if (
      low.count >= MIN_SEGMENT_SIZE &&
      high.supportRatio < 0.4 &&
      low.supportRatio > 0.6
    ) {
      disagreements.push({
        assumptionIndex: i,
        assumption: assumptions[i],
        severity: "high",
        highMatchCount: high.count,
        highMatchSupportRatio: high.supportRatio,
        lowMatchCount: low.count,
        lowMatchSupportRatio: low.supportRatio,
        signal: `Target audience (${high.count} high-match) pushes back on this assumption while peripheral respondents (${low.count} low-match) support it`,
      });
      continue;
    }

    // Condition C (high severity): target audience pushback regardless of low-match
    // Only requires high-match segment — the low-match segment may be small or absent
    if (high.supportRatio < 0.5) {
      disagreements.push({
        assumptionIndex: i,
        assumption: assumptions[i],
        severity: "high",
        highMatchCount: high.count,
        highMatchSupportRatio: high.supportRatio,
        lowMatchCount: low.count,
        lowMatchSupportRatio: low.supportRatio,
        signal: `Target audience (${high.count} high-match) shows majority pushback — ${Math.round((1 - high.supportRatio) * 100)}% contradict this assumption`,
      });
      continue;
    }

    // Condition B (medium severity): peripheral contradicts, target supports
    // Requires both segments to have enough respondents
    if (
      low.count >= MIN_SEGMENT_SIZE &&
      high.supportRatio > 0.6 &&
      low.supportRatio < 0.4
    ) {
      disagreements.push({
        assumptionIndex: i,
        assumption: assumptions[i],
        severity: "medium",
        highMatchCount: high.count,
        highMatchSupportRatio: high.supportRatio,
        lowMatchCount: low.count,
        lowMatchSupportRatio: low.supportRatio,
        signal: `Peripheral respondents (${low.count} low-match) contradict this assumption while target audience (${high.count} high-match) supports it`,
      });
    }
  }

  // Sort: high severity first, then worst high-match support ratio first
  disagreements.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === "high" ? -1 : 1;
    return a.highMatchSupportRatio - b.highMatchSupportRatio;
  });

  const summary =
    disagreements.length > 0
      ? `${disagreements.length} of ${assumptions.length} assumption${assumptions.length === 1 ? "" : "s"} show audience segment disagreements`
      : null;

  return { disagreements, summary };
}

/* ─── Pure Helpers for Testing ─── */

export const _testExports = {
  classifyEvidence,
  computeSegmentRatios,
};
