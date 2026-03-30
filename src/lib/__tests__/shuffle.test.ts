import { describe, it, expect } from "vitest";
import { seededShuffle } from "../shuffle";

describe("seededShuffle", () => {
  const items = ["a", "b", "c", "d", "e", "f", "g", "h"];

  it("returns same order for same seed", () => {
    const a = seededShuffle(items, "response-123");
    const b = seededShuffle(items, "response-123");
    expect(a).toEqual(b);
  });

  it("returns different order for different seeds", () => {
    const a = seededShuffle(items, "response-123");
    const b = seededShuffle(items, "response-456");
    // Extremely unlikely to be identical with 8 items (1/40320)
    expect(a).not.toEqual(b);
  });

  it("preserves all elements (no loss, no duplication)", () => {
    const result = seededShuffle(items, "test-seed");
    expect(result.sort()).toEqual([...items].sort());
  });

  it("does not mutate the original array", () => {
    const original = [...items];
    seededShuffle(items, "test-seed");
    expect(items).toEqual(original);
  });

  it("handles empty array", () => {
    expect(seededShuffle([], "seed")).toEqual([]);
  });

  it("handles single element", () => {
    expect(seededShuffle(["x"], "seed")).toEqual(["x"]);
  });

  it("actually shuffles (not identity for most seeds)", () => {
    // Test 10 different seeds — at least some should differ from original order
    const shuffled = Array.from({ length: 10 }, (_, i) =>
      seededShuffle(items, `seed-${i}`)
    );
    const identityCount = shuffled.filter(
      (s) => JSON.stringify(s) === JSON.stringify(items)
    ).length;
    // With 8! = 40320 permutations, getting identity more than once in 10 tries is near-impossible
    expect(identityCount).toBeLessThan(2);
  });
});
