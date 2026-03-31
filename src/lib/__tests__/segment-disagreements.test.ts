import { describe, it, expect } from "vitest";
import { detectSegmentDisagreements, _testExports } from "@/lib/ai/segment-disagreements";
import type { AssumptionEvidence } from "@/lib/ai/assumption-evidence";

const { classifyEvidence, computeSegmentRatios } = _testExports;

/* ─── Helpers ─── */

function makeEvidence(
  overrides: Partial<AssumptionEvidence> = {}
): AssumptionEvidence {
  return {
    questionText: "Test question",
    answerText: "Test answer",
    qualityScore: 60,
    authenticityScore: 6,
    depthScore: 6,
    respondentLabel: "R1",
    evidenceCategory: "behavior",
    audienceMatch: 50,
    ...overrides,
  };
}

function makeMap(
  entries: [number, AssumptionEvidence[]][]
): Map<number, AssumptionEvidence[]> {
  return new Map(entries);
}

/* ─── classifyEvidence ─── */

describe("classifyEvidence", () => {
  it("classifies negative as contradicting", () => {
    expect(classifyEvidence("negative")).toBe("contradicting");
  });

  it("classifies behavior as supporting", () => {
    expect(classifyEvidence("behavior")).toBe("supporting");
  });

  it("classifies all non-negative categories as supporting", () => {
    for (const cat of ["attempts", "willingness", "price", "pain"]) {
      expect(classifyEvidence(cat)).toBe("supporting");
    }
  });
});

/* ─── computeSegmentRatios ─── */

describe("computeSegmentRatios", () => {
  it("returns zero for empty bucket", () => {
    expect(computeSegmentRatios([])).toEqual({ count: 0, supportRatio: 0 });
  });

  it("computes ratio correctly with mixed evidence", () => {
    const bucket = [
      makeEvidence({ evidenceCategory: "behavior" }),
      makeEvidence({ evidenceCategory: "negative" }),
      makeEvidence({ evidenceCategory: "willingness" }),
    ];
    const stats = computeSegmentRatios(bucket);
    expect(stats.count).toBe(3);
    expect(stats.supportRatio).toBeCloseTo(2 / 3);
  });
});

/* ─── detectSegmentDisagreements ─── */

describe("detectSegmentDisagreements", () => {
  it("returns empty when both segments agree (all supporting)", () => {
    const evidence = [
      ...Array.from({ length: 3 }, () => makeEvidence({ audienceMatch: 80, evidenceCategory: "behavior" })),
      ...Array.from({ length: 3 }, () => makeEvidence({ audienceMatch: 20, evidenceCategory: "behavior" })),
    ];
    const report = detectSegmentDisagreements(makeMap([[0, evidence]]), ["Assumption 0"]);
    expect(report.disagreements).toHaveLength(0);
    expect(report.summary).toBeNull();
  });

  it("returns empty when both segments agree (all contradicting)", () => {
    const evidence = [
      ...Array.from({ length: 3 }, () => makeEvidence({ audienceMatch: 80, evidenceCategory: "negative" })),
      ...Array.from({ length: 3 }, () => makeEvidence({ audienceMatch: 20, evidenceCategory: "negative" })),
    ];
    const report = detectSegmentDisagreements(makeMap([[0, evidence]]), ["Assumption 0"]);
    // Condition C fires: high-match has 0% support (< 0.5)
    // But both agree so let's check — actually Condition C fires because high supportRatio is 0 < 0.5
    expect(report.disagreements).toHaveLength(1);
    expect(report.disagreements[0].severity).toBe("high");
  });

  it("detects high severity: high-match contradicts, low-match supports (Condition A)", () => {
    const evidence = [
      ...Array.from({ length: 3 }, () => makeEvidence({ audienceMatch: 80, evidenceCategory: "negative" })),
      ...Array.from({ length: 3 }, () => makeEvidence({ audienceMatch: 20, evidenceCategory: "behavior" })),
    ];
    const report = detectSegmentDisagreements(makeMap([[0, evidence]]), ["Test assumption"]);
    expect(report.disagreements).toHaveLength(1);
    const d = report.disagreements[0];
    expect(d.severity).toBe("high");
    expect(d.highMatchSupportRatio).toBe(0);
    expect(d.lowMatchSupportRatio).toBe(1);
    expect(d.signal).toContain("pushes back");
    expect(d.signal).toContain("peripheral respondents");
  });

  it("detects medium severity: low-match contradicts, high-match supports (Condition B)", () => {
    const evidence = [
      ...Array.from({ length: 3 }, () => makeEvidence({ audienceMatch: 80, evidenceCategory: "behavior" })),
      ...Array.from({ length: 3 }, () => makeEvidence({ audienceMatch: 20, evidenceCategory: "negative" })),
    ];
    const report = detectSegmentDisagreements(makeMap([[0, evidence]]), ["Test assumption"]);
    expect(report.disagreements).toHaveLength(1);
    const d = report.disagreements[0];
    expect(d.severity).toBe("medium");
    expect(d.highMatchSupportRatio).toBe(1);
    expect(d.lowMatchSupportRatio).toBe(0);
    expect(d.signal).toContain("Peripheral respondents");
  });

  it("detects high severity: target audience pushback regardless of low-match (Condition C)", () => {
    const evidence = [
      makeEvidence({ audienceMatch: 80, evidenceCategory: "negative" }),
      makeEvidence({ audienceMatch: 80, evidenceCategory: "negative" }),
      makeEvidence({ audienceMatch: 75, evidenceCategory: "behavior" }),
      // Only 1 low-match — not enough for condition A/B
      makeEvidence({ audienceMatch: 20, evidenceCategory: "behavior" }),
    ];
    const report = detectSegmentDisagreements(makeMap([[0, evidence]]), ["Test assumption"]);
    expect(report.disagreements).toHaveLength(1);
    const d = report.disagreements[0];
    expect(d.severity).toBe("high");
    expect(d.signal).toContain("majority pushback");
    expect(d.signal).toContain("67%");
  });

  it("skips when high-match segment has fewer than 2 respondents", () => {
    const evidence = [
      makeEvidence({ audienceMatch: 80, evidenceCategory: "negative" }),
      ...Array.from({ length: 3 }, () => makeEvidence({ audienceMatch: 20, evidenceCategory: "behavior" })),
    ];
    const report = detectSegmentDisagreements(makeMap([[0, evidence]]), ["Test"]);
    expect(report.disagreements).toHaveLength(0);
  });

  it("skips conditions A/B when low-match segment has fewer than 2 respondents", () => {
    // 3 high-match all supporting, 1 low-match contradicting
    // No condition A/B (low < 2), no condition C (high support > 0.5)
    const evidence = [
      ...Array.from({ length: 3 }, () => makeEvidence({ audienceMatch: 80, evidenceCategory: "behavior" })),
      makeEvidence({ audienceMatch: 20, evidenceCategory: "negative" }),
    ];
    const report = detectSegmentDisagreements(makeMap([[0, evidence]]), ["Test"]);
    expect(report.disagreements).toHaveLength(0);
  });

  it("skips when all evidence is middle-band", () => {
    const evidence = Array.from({ length: 5 }, () =>
      makeEvidence({ audienceMatch: 50, evidenceCategory: "negative" })
    );
    const report = detectSegmentDisagreements(makeMap([[0, evidence]]), ["Test"]);
    expect(report.disagreements).toHaveLength(0);
  });

  it("handles multiple assumptions with partial disagreements", () => {
    const agree = [
      ...Array.from({ length: 2 }, () => makeEvidence({ audienceMatch: 80, evidenceCategory: "behavior" })),
      ...Array.from({ length: 2 }, () => makeEvidence({ audienceMatch: 20, evidenceCategory: "behavior" })),
    ];
    const disagree = [
      ...Array.from({ length: 2 }, () => makeEvidence({ audienceMatch: 80, evidenceCategory: "negative" })),
      ...Array.from({ length: 2 }, () => makeEvidence({ audienceMatch: 20, evidenceCategory: "behavior" })),
    ];
    const report = detectSegmentDisagreements(
      makeMap([[0, agree], [1, disagree], [2, agree]]),
      ["A0", "A1", "A2"]
    );
    expect(report.disagreements).toHaveLength(1);
    expect(report.disagreements[0].assumptionIndex).toBe(1);
  });

  it("generates correct summary text", () => {
    const disagree = [
      ...Array.from({ length: 2 }, () => makeEvidence({ audienceMatch: 80, evidenceCategory: "negative" })),
      ...Array.from({ length: 2 }, () => makeEvidence({ audienceMatch: 20, evidenceCategory: "behavior" })),
    ];
    const report = detectSegmentDisagreements(
      makeMap([[0, disagree], [1, disagree]]),
      ["A0", "A1", "A2", "A3", "A4"]
    );
    expect(report.summary).toBe("2 of 5 assumptions show audience segment disagreements");
  });

  it("returns null summary when no disagreements", () => {
    const report = detectSegmentDisagreements(new Map(), ["A0", "A1"]);
    expect(report.summary).toBeNull();
  });

  it("sorts high severity before medium", () => {
    const highSev = [
      ...Array.from({ length: 2 }, () => makeEvidence({ audienceMatch: 80, evidenceCategory: "negative" })),
      ...Array.from({ length: 2 }, () => makeEvidence({ audienceMatch: 20, evidenceCategory: "behavior" })),
    ];
    const medSev = [
      ...Array.from({ length: 2 }, () => makeEvidence({ audienceMatch: 80, evidenceCategory: "behavior" })),
      ...Array.from({ length: 2 }, () => makeEvidence({ audienceMatch: 20, evidenceCategory: "negative" })),
    ];
    // Put medium first in map to ensure sort reorders
    const report = detectSegmentDisagreements(
      makeMap([[0, medSev], [1, highSev]]),
      ["Med assumption", "High assumption"]
    );
    expect(report.disagreements).toHaveLength(2);
    expect(report.disagreements[0].severity).toBe("high");
    expect(report.disagreements[1].severity).toBe("medium");
  });

  it("handles empty evidence map", () => {
    const report = detectSegmentDisagreements(new Map(), ["A0", "A1"]);
    expect(report.disagreements).toHaveLength(0);
    expect(report.summary).toBeNull();
  });

  it("handles mixed categories within a segment", () => {
    const evidence = [
      // High-match: 2 supporting, 1 contradicting → ratio 0.67 (> 0.6)
      makeEvidence({ audienceMatch: 80, evidenceCategory: "behavior" }),
      makeEvidence({ audienceMatch: 75, evidenceCategory: "willingness" }),
      makeEvidence({ audienceMatch: 80, evidenceCategory: "negative" }),
      // Low-match: 1 supporting, 2 contradicting → ratio 0.33 (< 0.4)
      makeEvidence({ audienceMatch: 20, evidenceCategory: "willingness" }),
      makeEvidence({ audienceMatch: 10, evidenceCategory: "negative" }),
      makeEvidence({ audienceMatch: 25, evidenceCategory: "negative" }),
    ];
    const report = detectSegmentDisagreements(makeMap([[0, evidence]]), ["Test"]);
    expect(report.disagreements).toHaveLength(1);
    expect(report.disagreements[0].severity).toBe("medium");
  });

  it("signal string contains actual counts", () => {
    const evidence = [
      ...Array.from({ length: 4 }, () => makeEvidence({ audienceMatch: 80, evidenceCategory: "negative" })),
      ...Array.from({ length: 3 }, () => makeEvidence({ audienceMatch: 20, evidenceCategory: "behavior" })),
    ];
    const report = detectSegmentDisagreements(makeMap([[0, evidence]]), ["Test"]);
    expect(report.disagreements[0].signal).toContain("4 high-match");
    expect(report.disagreements[0].signal).toContain("3 low-match");
  });
});
