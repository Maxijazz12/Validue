import { describe, it, expect } from "vitest";
import {
  checkGrounding,
  applyGroundingCorrections,
  formatGroundingFeedback,
  _testExports,
} from "@/lib/ai/grounding-check";
import type { DecisionBrief } from "@/lib/ai/brief-schemas";
import type { AssumptionEvidence } from "@/lib/ai/assumption-evidence";

const {
  checkVerdictCountConsistency,
  checkQuoteGrounding,
  checkCountPlausibility,
} = _testExports;

const emptyEvidenceMap = new Map<number, AssumptionEvidence[]>();

/* ─── Helpers ─── */

function makeVerdict(overrides: Partial<DecisionBrief["assumptionVerdicts"][0]> = {}) {
  return {
    assumption: "Users will pay for this",
    assumptionIndex: 0,
    verdict: "CONFIRMED" as const,
    confidence: "MEDIUM" as const,
    evidenceSummary: "Most respondents showed willingness to pay.",
    supportingCount: 4,
    contradictingCount: 1,
    totalResponses: 5,
    quotes: [
      { text: "I currently spend $20/month on similar tools", respondentLabel: "Respondent 1" },
    ],
    ...overrides,
  };
}

function makeBrief(overrides: Partial<DecisionBrief> = {}): DecisionBrief {
  return {
    recommendation: "PROCEED",
    confidence: "MEDIUM",
    confidenceRationale: "Directional signal from 5 responses.",
    uncomfortableTruth: "Price resistance is higher than expected.",
    signalSummary: "Users want this but may not pay current price.",
    assumptionVerdicts: [makeVerdict()],
    strongestSignals: ["Clear demand signal from target audience"],
    nextSteps: [
      { action: "Run a landing page test", effort: "Low", timeline: "1 week", whatItTests: "Conversion intent" },
      { action: "Interview top respondents", effort: "Medium", timeline: "2 weeks", whatItTests: "Depth of need" },
    ],
    cheapestTest: "Post in a relevant subreddit and track DM count.",
    ...overrides,
  };
}

function makeEvidence(text: string, overrides: Partial<AssumptionEvidence> = {}): AssumptionEvidence {
  return {
    questionText: "How much do you spend on this?",
    answerText: text,
    qualityScore: 60,
    authenticityScore: 6,
    depthScore: 6,
    respondentLabel: "Respondent 1",
    evidenceCategory: "price",
    audienceMatch: 70,
    ...overrides,
  };
}

/* ─── checkVerdictCountConsistency ─── */

describe("checkVerdictCountConsistency", () => {
  it("passes when CONFIRMED has more supporting than contradicting", () => {
    const result = checkVerdictCountConsistency(makeVerdict({
      verdict: "CONFIRMED",
      supportingCount: 4,
      contradictingCount: 1,
    }));
    expect(result).toBeNull();
  });

  it("fails when CONFIRMED but contradicting > supporting", () => {
    const result = checkVerdictCountConsistency(makeVerdict({
      verdict: "CONFIRMED",
      supportingCount: 1,
      contradictingCount: 4,
    }));
    expect(result).not.toBeNull();
    expect(result!.type).toBe("verdict_count_mismatch");
  });

  it("fails when REFUTED but supporting > contradicting", () => {
    const result = checkVerdictCountConsistency(makeVerdict({
      verdict: "REFUTED",
      supportingCount: 4,
      contradictingCount: 1,
    }));
    expect(result).not.toBeNull();
    expect(result!.type).toBe("verdict_count_mismatch");
  });

  it("passes when REFUTED has more contradicting", () => {
    const result = checkVerdictCountConsistency(makeVerdict({
      verdict: "REFUTED",
      supportingCount: 1,
      contradictingCount: 4,
    }));
    expect(result).toBeNull();
  });

  it("always passes for CHALLENGED", () => {
    const result = checkVerdictCountConsistency(makeVerdict({
      verdict: "CHALLENGED",
      supportingCount: 4,
      contradictingCount: 4,
    }));
    expect(result).toBeNull();
  });

  it("always passes for INSUFFICIENT_DATA", () => {
    const result = checkVerdictCountConsistency(makeVerdict({
      verdict: "INSUFFICIENT_DATA",
      supportingCount: 0,
      contradictingCount: 0,
    }));
    expect(result).toBeNull();
  });

  it("passes when counts are equal for CONFIRMED", () => {
    const result = checkVerdictCountConsistency(makeVerdict({
      verdict: "CONFIRMED",
      supportingCount: 3,
      contradictingCount: 3,
    }));
    expect(result).toBeNull();
  });
});

/* ─── checkQuoteGrounding ─── */

describe("checkQuoteGrounding", () => {
  it("passes when quote exists in evidence", () => {
    const verdict = makeVerdict({
      quotes: [{ text: "I currently spend $20/month on similar tools", respondentLabel: "R1" }],
    });
    const evidence = [makeEvidence("I currently spend $20/month on similar tools and it works great")];
    const result = checkQuoteGrounding(verdict, evidence, emptyEvidenceMap);
    expect(result).toHaveLength(0);
  });

  it("fails when quote is hallucinated", () => {
    const verdict = makeVerdict({
      quotes: [{ text: "This product would save me hours every week", respondentLabel: "R1" }],
    });
    const evidence = [makeEvidence("I spend about 30 minutes dealing with this problem")];
    const result = checkQuoteGrounding(verdict, evidence, emptyEvidenceMap);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("quote_not_found");
  });

  it("is case-insensitive", () => {
    const verdict = makeVerdict({
      quotes: [{ text: "I SPEND A LOT on this", respondentLabel: "R1" }],
    });
    const evidence = [makeEvidence("i spend a lot on this kind of thing")];
    const result = checkQuoteGrounding(verdict, evidence, emptyEvidenceMap);
    expect(result).toHaveLength(0);
  });

  it("skips very short quotes", () => {
    const verdict = makeVerdict({
      quotes: [{ text: "Yes", respondentLabel: "R1" }],
    });
    const evidence = [makeEvidence("Something completely different")];
    const result = checkQuoteGrounding(verdict, evidence, emptyEvidenceMap);
    expect(result).toHaveLength(0); // skipped, not failed
  });

  it("handles empty quotes array", () => {
    const verdict = makeVerdict({ quotes: [] });
    const result = checkQuoteGrounding(verdict, [], emptyEvidenceMap);
    expect(result).toHaveLength(0);
  });
});

/* ─── checkCountPlausibility ─── */

describe("checkCountPlausibility", () => {
  it("passes when counts match evidence", () => {
    const result = checkCountPlausibility(makeVerdict({ totalResponses: 5 }), 5);
    expect(result).toBeNull();
  });

  it("passes within buffer of 2", () => {
    const result = checkCountPlausibility(makeVerdict({ totalResponses: 7 }), 5);
    expect(result).toBeNull();
  });

  it("fails when count far exceeds evidence", () => {
    const result = checkCountPlausibility(makeVerdict({ totalResponses: 10 }), 3);
    expect(result).not.toBeNull();
    expect(result!.type).toBe("count_exceeds_evidence");
  });
});

/* ─── checkGrounding (integration) ─── */

describe("checkGrounding", () => {
  it("passes a well-grounded brief", () => {
    const evidence = new Map<number, AssumptionEvidence[]>([
      [0, [
        makeEvidence("I currently spend $20/month on similar tools"),
        makeEvidence("Would definitely pay for this"),
        makeEvidence("Not interested in paying"),
        makeEvidence("I use free tools only"),
        makeEvidence("Spend about $15/month"),
      ]],
    ]);

    const brief = makeBrief({
      assumptionVerdicts: [makeVerdict({
        assumptionIndex: 0,
        supportingCount: 4,
        contradictingCount: 1,
        totalResponses: 5,
        quotes: [{ text: "I currently spend $20/month on similar tools", respondentLabel: "R1" }],
      })],
    });

    const result = checkGrounding(brief, evidence);
    expect(result.passed).toBe(true);
    expect(result.failures).toHaveLength(0);
  });

  it("catches multiple failures across assumptions", () => {
    const evidence = new Map<number, AssumptionEvidence[]>([
      [0, [makeEvidence("I hate this idea")]],
      [1, [makeEvidence("Seems ok")]],
    ]);

    const brief = makeBrief({
      assumptionVerdicts: [
        makeVerdict({
          assumptionIndex: 0,
          verdict: "CONFIRMED",
          supportingCount: 1,
          contradictingCount: 4, // mismatch
          totalResponses: 5,
          quotes: [{ text: "I love this product so much", respondentLabel: "R1" }], // hallucinated
        }),
        makeVerdict({
          assumptionIndex: 1,
          verdict: "CHALLENGED",
          supportingCount: 1,
          contradictingCount: 1,
          totalResponses: 10, // exceeds evidence
          quotes: [],
        }),
      ],
    });

    const result = checkGrounding(brief, evidence);
    expect(result.passed).toBe(false);
    expect(result.failures.length).toBeGreaterThanOrEqual(3);
  });
});

/* ─── applyGroundingCorrections ─── */

describe("applyGroundingCorrections", () => {
  it("downgrades confidence on failed assumptions", () => {
    const brief = makeBrief({
      confidence: "HIGH",
      assumptionVerdicts: [makeVerdict({ assumptionIndex: 0, confidence: "HIGH" })],
    });

    const failures = [{
      type: "verdict_count_mismatch" as const,
      assumptionIndex: 0,
      detail: "test",
    }];

    const corrected = applyGroundingCorrections(brief, failures);
    expect(corrected.assumptionVerdicts[0].confidence).toBe("LOW");
    expect(corrected.confidence).toBe("LOW"); // brief-level downgrade on critical failure
  });

  it("does not downgrade brief confidence for non-critical failures", () => {
    const brief = makeBrief({ confidence: "HIGH" });

    const failures = [{
      type: "count_exceeds_evidence" as const,
      assumptionIndex: 0,
      detail: "test",
    }];

    const corrected = applyGroundingCorrections(brief, failures);
    expect(corrected.confidence).toBe("HIGH"); // not a critical failure
  });

  it("does not mutate the original brief", () => {
    const brief = makeBrief();
    const failures = [{
      type: "verdict_count_mismatch" as const,
      assumptionIndex: 0,
      detail: "test",
    }];

    applyGroundingCorrections(brief, failures);
    expect(brief.assumptionVerdicts[0].confidence).toBe("MEDIUM"); // unchanged
  });
});

/* ─── formatGroundingFeedback ─── */

describe("formatGroundingFeedback", () => {
  it("formats failures into actionable prompt text", () => {
    const feedback = formatGroundingFeedback([
      { type: "verdict_count_mismatch", assumptionIndex: 0, detail: "CONFIRMED but contradicting > supporting" },
      { type: "quote_not_found", assumptionIndex: 1, detail: "Quote not in evidence" },
    ]);

    expect(feedback).toContain("GROUNDING ERRORS");
    expect(feedback).toContain("Assumption 0");
    expect(feedback).toContain("Assumption 1");
    expect(feedback).toContain("Reconcile");
    expect(feedback).toContain("verbatim");
  });
});
