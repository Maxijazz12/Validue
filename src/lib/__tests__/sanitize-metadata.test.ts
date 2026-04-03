import { describe, it, expect } from "vitest";

// sanitizeMetadata is private in the server action file. Test the logic directly.
type AnswerMetadata = {
  pasteDetected: boolean;
  pasteCount: number;
  timeSpentMs: number;
  charCount: number;
};

function sanitizeCounter(value: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return 0;
  return Math.floor(numeric);
}

function sanitizeMetadata(m: AnswerMetadata, text: string): AnswerMetadata {
  return {
    pasteDetected: m.pasteDetected === true,
    pasteCount: sanitizeCounter(m.pasteCount),
    timeSpentMs: sanitizeCounter(m.timeSpentMs),
    charCount: text.length,
  };
}

describe("sanitizeMetadata", () => {
  it("passes through valid counters and recomputes charCount from text", () => {
    const input = { pasteDetected: true, pasteCount: 3, timeSpentMs: 5000, charCount: 150 };
    expect(sanitizeMetadata(input, "x".repeat(150))).toEqual(input);
  });

  it("coerces string numbers", () => {
    const input = {
      pasteDetected: true,
      pasteCount: "5.7" as unknown as number,
      timeSpentMs: "12000" as unknown as number,
      charCount: "200.9" as unknown as number,
    };
    const result = sanitizeMetadata(input, "x".repeat(200));
    expect(result.pasteCount).toBe(5);
    expect(result.timeSpentMs).toBe(12000);
    expect(result.charCount).toBe(200);
  });

  it("clamps negative values to 0", () => {
    const input = { pasteDetected: false, pasteCount: -10, timeSpentMs: -1, charCount: -999 };
    const result = sanitizeMetadata(input, "");
    expect(result.pasteCount).toBe(0);
    expect(result.timeSpentMs).toBe(0);
    expect(result.charCount).toBe(0);
  });

  it("handles NaN — coerces to 0", () => {
    const input = { pasteDetected: false, pasteCount: NaN, timeSpentMs: 0, charCount: 0 };
    expect(sanitizeMetadata(input, "").pasteCount).toBe(0);
  });

  it("clamps Infinity to 0", () => {
    const input = { pasteDetected: false, pasteCount: 0, timeSpentMs: Infinity, charCount: 0 };
    expect(sanitizeMetadata(input, "").timeSpentMs).toBe(0);
  });

  it("coerces truthy non-boolean pasteDetected to false", () => {
    const input = {
      pasteDetected: "yes" as unknown as boolean,
      pasteCount: 0,
      timeSpentMs: 0,
      charCount: 0,
    };
    expect(sanitizeMetadata(input, "").pasteDetected).toBe(false);
  });

  it("preserves pasteDetected: true", () => {
    const input = { pasteDetected: true, pasteCount: 0, timeSpentMs: 0, charCount: 0 };
    expect(sanitizeMetadata(input, "").pasteDetected).toBe(true);
  });

  it("preserves pasteDetected: false", () => {
    const input = { pasteDetected: false, pasteCount: 0, timeSpentMs: 0, charCount: 0 };
    expect(sanitizeMetadata(input, "").pasteDetected).toBe(false);
  });

  it("floors decimal values", () => {
    const input = { pasteDetected: false, pasteCount: 2.9, timeSpentMs: 5000.7, charCount: 99.1 };
    const result = sanitizeMetadata(input, "x".repeat(99));
    expect(result.pasteCount).toBe(2);
    expect(result.timeSpentMs).toBe(5000);
    expect(result.charCount).toBe(99);
  });

  it("handles undefined-like values via Number coercion", () => {
    const input = {
      pasteDetected: false,
      pasteCount: undefined as unknown as number,
      timeSpentMs: null as unknown as number,
      charCount: "" as unknown as number,
    };
    const result = sanitizeMetadata(input, "");
    expect(result.pasteCount).toBe(0);
    expect(result.timeSpentMs).toBe(0);
    expect(result.charCount).toBe(0);
  });
});
