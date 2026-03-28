import { describe, it, expect } from "vitest";
import { distributePayouts, payoutWeight, type ScoredResponse } from "../payout-math";

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
