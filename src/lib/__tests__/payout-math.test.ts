import { describe, it, expect } from "vitest";
import {
  distributePayouts,
  payoutWeight,
  bonusWeightV2,
  qualifyResponse,
  distributePayoutsV2,
  distributeSubsidizedPayouts,
  defaultTargetResponses,
  type ScoredResponse,
  type ResponseMetadata,
  type QualificationResult,
} from "../payout-math";

function makeResponse(
  id: string,
  qualityScore: number,
  confidence = 0.9
): ScoredResponse {
  return {
    responseId: id,
    respondentId: `user-${id}`,
    respondentName: `User ${id}`,
    qualityScore,
    confidence,
  };
}

describe("payoutWeight", () => {
  it("returns 0 for scores <= 25", () => {
    expect(payoutWeight(0)).toBe(0);
    expect(payoutWeight(25)).toBe(0);
  });

  it("returns positive for scores > 25", () => {
    expect(payoutWeight(26)).toBeGreaterThan(0);
    expect(payoutWeight(80)).toBeGreaterThan(0);
  });

  it("uses power-law 1.5 exponent", () => {
    // (55 - 25)^1.5 = 30^1.5 ≈ 164.3
    expect(payoutWeight(55)).toBeCloseTo(Math.pow(30, 1.5), 1);
  });
});

describe("distributePayouts", () => {
  it("returns empty for no responses", () => {
    expect(distributePayouts([], 10)).toEqual([]);
  });

  it("returns empty for zero distributable", () => {
    expect(distributePayouts([makeResponse("a", 80)], 0)).toEqual([]);
  });

  it("sum equals distributable exactly for [80, 60, 20]", () => {
    const responses = [
      makeResponse("a", 80),
      makeResponse("b", 60),
      makeResponse("c", 20),
    ];
    const allocations = distributePayouts(responses, 10);
    const sum = allocations.reduce((s, a) => s + a.suggestedAmount, 0);
    expect(Math.round(sum * 100) / 100).toBe(10.0);
  });

  it("falls back to equal split when all weights are 0 (scores <= 25)", () => {
    const responses = [
      makeResponse("a", 20),
      makeResponse("b", 15),
      makeResponse("c", 10),
    ];
    const allocations = distributePayouts(responses, 9);
    // Equal: $3 each
    expect(allocations).toHaveLength(3);
    const amounts = allocations.map((a) => a.suggestedAmount);
    // All should be close to $3, total should be $9
    const sum = amounts.reduce((s, v) => s + v, 0);
    expect(Math.round(sum * 100) / 100).toBe(9.0);
  });

  it("single response gets full amount", () => {
    const allocations = distributePayouts(
      [makeResponse("a", 80)],
      5
    );
    expect(allocations).toHaveLength(1);
    expect(allocations[0].suggestedAmount).toBe(5.0);
  });

  it("remainder reconciliation: 3 equal-weight, sum exact", () => {
    const responses = [
      makeResponse("a", 55),
      makeResponse("b", 55),
      makeResponse("c", 55),
    ];
    const allocations = distributePayouts(responses, 10);
    const sum = allocations.reduce((s, a) => s + a.suggestedAmount, 0);
    expect(Math.round(sum * 100) / 100).toBe(10.0);
  });

  it("low-confidence responses get equal share from reserved pool", () => {
    const responses = [
      makeResponse("a", 80, 0.9), // high confidence
      makeResponse("b", 60, 0.3), // low confidence
    ];
    const allocations = distributePayouts(responses, 10);
    const sum = allocations.reduce((s, a) => s + a.suggestedAmount, 0);
    expect(Math.round(sum * 100) / 100).toBe(10.0);
    // Both should get something
    expect(allocations).toHaveLength(2);
    expect(allocations.every((a) => a.suggestedAmount > 0)).toBe(true);
  });

  it("all amounts are non-negative", () => {
    const responses = [
      makeResponse("a", 80),
      makeResponse("b", 30),
      makeResponse("c", 26),
    ];
    const allocations = distributePayouts(responses, 5);
    expect(allocations.every((a) => a.suggestedAmount >= 0)).toBe(true);
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
 * V2 Economics Tests
 * ═══════════════════════════════════════════════════════════════════════════ */

function makeGoodMeta(format: "quick" | "standard" = "standard"): ResponseMetadata {
  return {
    totalTimeMs: format === "quick" ? 60_000 : 120_000,
    openAnswers: [{ charCount: 100 }],
  };
}

function makeQualResult(id: string, qualified = true, reasons: string[] = []): QualificationResult {
  return { responseId: id, qualified, reasons };
}

describe("bonusWeightV2", () => {
  it("returns 0 for scores at or below BONUS_MIN_SCORE (50)", () => {
    expect(bonusWeightV2(50)).toBe(0);
    expect(bonusWeightV2(49)).toBe(0);
    expect(bonusWeightV2(30)).toBe(0);
    expect(bonusWeightV2(0)).toBe(0);
  });

  it("returns linear weight above 50", () => {
    expect(bonusWeightV2(60)).toBe(10);
    expect(bonusWeightV2(75)).toBe(25);
    expect(bonusWeightV2(100)).toBe(50);
  });
});

describe("qualifyResponse", () => {
  it("qualifies a response that meets all criteria", () => {
    const r = makeResponse("a", 30);
    const result = qualifyResponse(r, "standard", makeGoodMeta());
    expect(result.qualified).toBe(true);
    expect(result.reasons).toEqual([]);
  });

  it("disqualifies score below threshold (29)", () => {
    const r = makeResponse("a", 29);
    const result = qualifyResponse(r, "standard", makeGoodMeta());
    expect(result.qualified).toBe(false);
    expect(result.reasons).toContain("quality_score_below_threshold");
  });

  it("disqualifies insufficient time on Standard", () => {
    const r = makeResponse("a", 50);
    const meta: ResponseMetadata = {
      totalTimeMs: 10_000, // 10s, need 90s
      openAnswers: [{ charCount: 100 }],
    };
    const result = qualifyResponse(r, "standard", meta);
    expect(result.qualified).toBe(false);
    expect(result.reasons).toContain("insufficient_time");
  });

  it("disqualifies insufficient time on Quick", () => {
    const r = makeResponse("a", 50);
    const meta: ResponseMetadata = {
      totalTimeMs: 10_000, // 10s, need 45s
      openAnswers: [{ charCount: 100 }],
    };
    const result = qualifyResponse(r, "quick", meta);
    expect(result.qualified).toBe(false);
    expect(result.reasons).toContain("insufficient_time");
  });

  it("disqualifies when all open answers are too short", () => {
    const r = makeResponse("a", 80);
    const meta: ResponseMetadata = {
      totalTimeMs: 120_000,
      openAnswers: [{ charCount: 20 }, { charCount: 10 }],
    };
    const result = qualifyResponse(r, "standard", meta);
    expect(result.qualified).toBe(false);
    expect(result.reasons).toContain("open_answer_too_short");
  });

  it("qualifies if at least one open answer meets char minimum", () => {
    const r = makeResponse("a", 80);
    const meta: ResponseMetadata = {
      totalTimeMs: 120_000,
      openAnswers: [{ charCount: 20 }, { charCount: 60 }],
    };
    const result = qualifyResponse(r, "standard", meta);
    expect(result.qualified).toBe(true);
  });

  it("disqualifies spam-flagged response", () => {
    const r = makeResponse("a", 80);
    const meta: ResponseMetadata = {
      totalTimeMs: 120_000,
      openAnswers: [{ charCount: 100 }],
      spamFlagged: true,
    };
    const result = qualifyResponse(r, "standard", meta);
    expect(result.qualified).toBe(false);
    expect(result.reasons).toContain("spam_detected");
  });

  it("accumulates multiple failure reasons", () => {
    const r = makeResponse("a", 10);
    const meta: ResponseMetadata = {
      totalTimeMs: 5_000,
      openAnswers: [{ charCount: 5 }],
      spamFlagged: true,
    };
    const result = qualifyResponse(r, "standard", meta);
    expect(result.qualified).toBe(false);
    expect(result.reasons.length).toBeGreaterThanOrEqual(3);
  });
});

describe("defaultTargetResponses", () => {
  it("computes Quick target from distributable", () => {
    // $21.25 / $0.45 = 47.2 → 47
    expect(defaultTargetResponses(21.25, "quick")).toBe(47);
  });

  it("computes Standard target from distributable", () => {
    // $21.25 / $0.60 = 35.4 → 35
    expect(defaultTargetResponses(21.25, "standard")).toBe(35);
  });

  it("enforces minimum of 5", () => {
    expect(defaultTargetResponses(1.0, "standard")).toBe(5);
  });
});

describe("distributePayoutsV2", () => {
  it("returns empty for no responses", () => {
    expect(distributePayoutsV2([], 10, [])).toEqual([]);
  });

  it("returns empty for zero distributable", () => {
    const r = [makeResponse("a", 80)];
    const q = [makeQualResult("a")];
    expect(distributePayoutsV2(r, 0, q)).toEqual([]);
  });

  it("all qualified, all bonus-eligible: sum === distributable", () => {
    const responses = [
      makeResponse("a", 80),
      makeResponse("b", 70),
      makeResponse("c", 60),
    ];
    const quals = responses.map((r) => makeQualResult(r.responseId));
    const allocations = distributePayoutsV2(responses, 10, quals);

    const qualifiedAllocs = allocations.filter((a) => a.qualified);
    expect(qualifiedAllocs).toHaveLength(3);

    const sum = qualifiedAllocs.reduce((s, a) => s + a.suggestedAmount, 0);
    expect(Math.round(sum * 100) / 100).toBe(10.0);

    // Each should have both base and bonus
    for (const a of qualifiedAllocs) {
      expect(a.basePayout).toBeGreaterThan(0);
      expect(a.bonusPayout).toBeGreaterThan(0);
    }

    // Higher score should earn more bonus
    const allocA = qualifiedAllocs.find((a) => a.responseId === "a")!;
    const allocC = qualifiedAllocs.find((a) => a.responseId === "c")!;
    expect(allocA.bonusPayout).toBeGreaterThan(allocC.bonusPayout);

    // All base payouts should be equal
    expect(allocA.basePayout).toBeCloseTo(allocC.basePayout, 1);
  });

  it("all qualified, none bonus-eligible (scores 30-49): bonus folds into base", () => {
    const responses = [
      makeResponse("a", 40),
      makeResponse("b", 35),
      makeResponse("c", 45),
    ];
    const quals = responses.map((r) => makeQualResult(r.responseId));
    const allocations = distributePayoutsV2(responses, 9, quals);

    const qualifiedAllocs = allocations.filter((a) => a.qualified);
    expect(qualifiedAllocs).toHaveLength(3);

    // No bonus pool — each gets distributable/3
    for (const a of qualifiedAllocs) {
      expect(a.bonusPayout).toBe(0);
      expect(a.basePayout).toBeCloseTo(3.0, 1);
    }

    const sum = qualifiedAllocs.reduce((s, a) => s + a.suggestedAmount, 0);
    expect(Math.round(sum * 100) / 100).toBe(9.0);
  });

  it("mixed qualification: disqualified get $0, qualified split full pool", () => {
    const responses = [
      makeResponse("a", 80),
      makeResponse("b", 60),
      makeResponse("c", 20), // disqualified
    ];
    const quals = [
      makeQualResult("a"),
      makeQualResult("b"),
      makeQualResult("c", false, ["quality_score_below_threshold"]),
    ];
    const allocations = distributePayoutsV2(responses, 10, quals);

    const allocC = allocations.find((a) => a.responseId === "c")!;
    expect(allocC.qualified).toBe(false);
    expect(allocC.suggestedAmount).toBe(0);
    expect(allocC.basePayout).toBe(0);
    expect(allocC.bonusPayout).toBe(0);
    expect(allocC.disqualificationReasons).toContain("quality_score_below_threshold");

    // Qualified responses split the full $10
    const qualifiedSum = allocations
      .filter((a) => a.qualified)
      .reduce((s, a) => s + a.suggestedAmount, 0);
    expect(Math.round(qualifiedSum * 100) / 100).toBe(10.0);
  });

  it("single response gets 100% of distributable", () => {
    const responses = [makeResponse("a", 80)];
    const quals = [makeQualResult("a")];
    const allocations = distributePayoutsV2(responses, 5, quals);

    expect(allocations).toHaveLength(1);
    expect(allocations[0].suggestedAmount).toBe(5.0);
    expect(allocations[0].basePayout + allocations[0].bonusPayout).toBe(5.0);
  });

  it("all same score: equal distribution", () => {
    const responses = [
      makeResponse("a", 65),
      makeResponse("b", 65),
      makeResponse("c", 65),
    ];
    const quals = responses.map((r) => makeQualResult(r.responseId));
    const allocations = distributePayoutsV2(responses, 9, quals);

    const qualifiedAllocs = allocations.filter((a) => a.qualified);
    // All should get the same amount
    const amounts = qualifiedAllocs.map((a) => a.suggestedAmount);
    const uniqueAmounts = new Set(amounts.map((a) => Math.round(a * 100)));
    // Allow 1 cent difference from remainder reconciliation
    expect(uniqueAmounts.size).toBeLessThanOrEqual(2);

    const sum = qualifiedAllocs.reduce((s, a) => s + a.suggestedAmount, 0);
    expect(Math.round(sum * 100) / 100).toBe(9.0);
  });

  it("score at exact thresholds: 30 qualifies, 29 does not; 50 gets bonus, 49 does not", () => {
    const responses = [
      makeResponse("a", 30), // qualifies, no bonus
      makeResponse("b", 29), // disqualified
      makeResponse("c", 50), // qualifies, no bonus (weight = 0)
      makeResponse("d", 51), // qualifies, gets bonus (weight = 1)
    ];
    const quals = [
      makeQualResult("a"),
      makeQualResult("b", false, ["quality_score_below_threshold"]),
      makeQualResult("c"),
      makeQualResult("d"),
    ];
    const allocations = distributePayoutsV2(responses, 10, quals);

    expect(allocations.find((a) => a.responseId === "a")!.qualified).toBe(true);
    expect(allocations.find((a) => a.responseId === "b")!.qualified).toBe(false);
    expect(allocations.find((a) => a.responseId === "c")!.bonusPayout).toBe(0);
    expect(allocations.find((a) => a.responseId === "d")!.bonusPayout).toBeGreaterThan(0);
  });

  it("remainder reconciliation: sum of qualified payouts === distributable to the cent", () => {
    const responses = [
      makeResponse("a", 80),
      makeResponse("b", 65),
      makeResponse("c", 55),
      makeResponse("d", 40),
      makeResponse("e", 70),
      makeResponse("f", 60),
      makeResponse("g", 90),
    ];
    const quals = responses.map((r) => makeQualResult(r.responseId));
    const allocations = distributePayoutsV2(responses, 17.83, quals);

    const qualifiedSum = allocations
      .filter((a) => a.qualified)
      .reduce((s, a) => s + a.suggestedAmount, 0);
    expect(Math.round(qualifiedSum * 100) / 100).toBe(17.83);
  });

  it("all responses disqualified: everyone gets $0", () => {
    const responses = [
      makeResponse("a", 10),
      makeResponse("b", 15),
    ];
    const quals = [
      makeQualResult("a", false, ["quality_score_below_threshold"]),
      makeQualResult("b", false, ["quality_score_below_threshold"]),
    ];
    const allocations = distributePayoutsV2(responses, 10, quals);

    expect(allocations).toHaveLength(2);
    expect(allocations.every((a) => a.suggestedAmount === 0)).toBe(true);
    expect(allocations.every((a) => !a.qualified)).toBe(true);
  });

  it("all base payouts are non-negative", () => {
    const responses = [
      makeResponse("a", 80),
      makeResponse("b", 35),
      makeResponse("c", 55),
    ];
    const quals = responses.map((r) => makeQualResult(r.responseId));
    const allocations = distributePayoutsV2(responses, 5, quals);
    expect(allocations.every((a) => a.basePayout >= 0)).toBe(true);
    expect(allocations.every((a) => a.bonusPayout >= 0)).toBe(true);
  });
});

describe("distributeSubsidizedPayouts", () => {
  it("pays flat $0.30 per qualifier, $0 for disqualified", () => {
    const responses = [
      makeResponse("a", 60),
      makeResponse("b", 50),
      makeResponse("c", 20), // disqualified
    ];
    const quals = [
      makeQualResult("a"),
      makeQualResult("b"),
      makeQualResult("c", false, ["quality_score_below_threshold"]),
    ];
    const allocations = distributeSubsidizedPayouts(responses, quals);

    const allocA = allocations.find((a) => a.responseId === "a")!;
    expect(allocA.suggestedAmount).toBe(0.30);
    expect(allocA.basePayout).toBe(0.30);
    expect(allocA.bonusPayout).toBe(0);
    expect(allocA.qualified).toBe(true);

    const allocC = allocations.find((a) => a.responseId === "c")!;
    expect(allocC.suggestedAmount).toBe(0);
    expect(allocC.qualified).toBe(false);
  });

  it("returns all responses (qualified and not)", () => {
    const responses = [
      makeResponse("a", 60),
      makeResponse("b", 20),
    ];
    const quals = [
      makeQualResult("a"),
      makeQualResult("b", false, ["quality_score_below_threshold"]),
    ];
    const allocations = distributeSubsidizedPayouts(responses, quals);
    expect(allocations).toHaveLength(2);
  });
});
