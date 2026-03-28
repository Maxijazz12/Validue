import { describe, it, expect } from "vitest";
import { scoreResponseFallback } from "../ai/rank-responses";
import type { AnswerWithMeta } from "../ai/types";

function makeAnswer(overrides: Partial<AnswerWithMeta> = {}): AnswerWithMeta {
  return {
    questionId: "q1",
    questionText: "Test question?",
    questionType: "open",
    answerText: "This is a detailed answer with enough characters to be meaningful for the scoring system to evaluate.",
    metadata: {
      charCount: 100,
      timeSpentMs: 15000,
      pasteDetected: false,
      pasteCount: 0,
    },
    ...overrides,
  };
}

describe("scoreResponseFallback", () => {
  it("returns score 0 and source fallback for empty answers", () => {
    const result = scoreResponseFallback([]);
    expect(result.score).toBe(0);
    expect(result.source).toBe("fallback");
    expect(result.dimensions.depth).toBe(0);
  });

  it("scores high-quality responses >= 60", () => {
    const answers = [
      makeAnswer({
        answerText: "A".repeat(350),
        metadata: { charCount: 350, timeSpentMs: 30000 },
      }),
      makeAnswer({
        answerText: "B".repeat(350),
        metadata: { charCount: 350, timeSpentMs: 25000 },
      }),
      makeAnswer({
        answerText: "C".repeat(350),
        metadata: { charCount: 350, timeSpentMs: 20000 },
      }),
    ];
    const result = scoreResponseFallback(answers);
    expect(result.score).toBeGreaterThanOrEqual(60);
  });

  it("penalizes heavy paste detection (pasteCount > 3)", () => {
    const answers = [
      makeAnswer({
        metadata: { charCount: 200, timeSpentMs: 15000, pasteDetected: true, pasteCount: 5 },
      }),
    ];
    const result = scoreResponseFallback(answers);
    expect(result.dimensions.authenticity).toBe(3);
  });

  it("always returns score in [0, 100]", () => {
    // Minimal answers — lowest possible score
    const low = scoreResponseFallback([
      makeAnswer({
        answerText: "",
        metadata: { charCount: 0, timeSpentMs: 100, pasteDetected: true, pasteCount: 10 },
      }),
    ]);
    expect(low.score).toBeGreaterThanOrEqual(0);
    expect(low.score).toBeLessThanOrEqual(100);

    // Maximal answers — highest possible score
    const high = scoreResponseFallback([
      makeAnswer({
        answerText: "A".repeat(500),
        metadata: { charCount: 500, timeSpentMs: 60000 },
      }),
    ]);
    expect(high.score).toBeGreaterThanOrEqual(0);
    expect(high.score).toBeLessThanOrEqual(100);
  });

  it("applies confidence shrinkage (fallback conf=0.5)", () => {
    // Fallback uses conf=0.5, so raw score is pulled toward POPULATION_MEAN (55)
    const result = scoreResponseFallback([
      makeAnswer({
        answerText: "A".repeat(500),
        metadata: { charCount: 500, timeSpentMs: 60000 },
      }),
    ]);
    expect(result.confidence).toBe(0.5);
    // With confidence 0.5, even a perfect raw score gets pulled toward 55
    // So score should be < raw but > 55
    expect(result.score).toBeLessThan(100);
  });

  it("returns source as fallback", () => {
    const result = scoreResponseFallback([makeAnswer()]);
    expect(result.source).toBe("fallback");
  });
});
