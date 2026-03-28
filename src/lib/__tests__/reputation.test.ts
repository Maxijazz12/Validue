import { describe, it, expect } from "vitest";
import { calculateReputation, type ReputationStats } from "../reputation-config";

function makeStats(overrides: Partial<ReputationStats> = {}): ReputationStats {
  return {
    totalCompleted: 10,
    avgQualityScore: 70,
    totalEarned: 50,
    totalSubmitted: 10,
    flaggedResponseCount: 0,
    ...overrides,
  };
}

describe("calculateReputation", () => {
  it("returns tier new and score 0 below minimum responses", () => {
    const result = calculateReputation(makeStats({ totalCompleted: 2 }));
    expect(result.score).toBe(0);
    expect(result.tier).toBe("new");
  });

  it("returns tier new and score 0 at exactly min-1 responses", () => {
    const result = calculateReputation(makeStats({ totalCompleted: 2 }));
    expect(result.tier).toBe("new");
  });

  it("dampens score toward 50 at exactly 3 responses (30% signal)", () => {
    const result = calculateReputation(
      makeStats({ totalCompleted: 3, avgQualityScore: 80, totalSubmitted: 3 })
    );
    // At 3 responses, dampener = 3/10 = 0.3
    // Raw components: quality=48, reliability=20, volume=10, gaming=0 => raw=78
    // Dampened: 78*0.3 + 50*0.7 = 23.4 + 35 = 58.4
    expect(result.score).toBeGreaterThan(50);
    expect(result.score).toBeLessThan(70); // Significantly dampened from raw ~78
  });

  it("applies full signal at 10+ responses (no damping)", () => {
    const result = calculateReputation(
      makeStats({ totalCompleted: 10, avgQualityScore: 80, totalSubmitted: 10 })
    );
    // At 10 responses, dampener = 1.0 (full signal)
    // Raw: quality=48, reliability=20, volume≈16.1, gaming=0 => raw≈84.1
    expect(result.score).toBeGreaterThan(80);
  });

  it("score is always in [0, 100]", () => {
    const low = calculateReputation(
      makeStats({
        totalCompleted: 3,
        avgQualityScore: 0,
        totalSubmitted: 100,
        flaggedResponseCount: 3,
      })
    );
    expect(low.score).toBeGreaterThanOrEqual(0);

    const high = calculateReputation(
      makeStats({
        totalCompleted: 100,
        avgQualityScore: 100,
        totalSubmitted: 100,
        flaggedResponseCount: 0,
      })
    );
    expect(high.score).toBeLessThanOrEqual(100);
  });

  describe("tier hysteresis", () => {
    it("retains silver when score drops to 43 (above demote=40)", () => {
      // With 10 completed responses (full signal), we need avgQualityScore
      // that produces a score around 43
      // At 10 resp: quality=q/100*60, reliability≈20, volume≈16.1, gaming=0
      // score ≈ q*0.6 + 36.1
      // For score=43: q*0.6 = 6.9, q ≈ 11.5
      const result = calculateReputation(
        makeStats({
          totalCompleted: 10,
          avgQualityScore: 11.5,
          totalSubmitted: 10,
          currentTier: "silver",
        })
      );
      expect(result.tier).toBe("silver");
    });

    it("demotes from silver when score drops below 40", () => {
      // For score=39: q*0.6 = 2.9, q ≈ 4.8
      const result = calculateReputation(
        makeStats({
          totalCompleted: 10,
          avgQualityScore: 4,
          totalSubmitted: 10,
          currentTier: "silver",
        })
      );
      expect(result.tier).toBe("bronze");
    });

    it("promotes to silver at exactly 45", () => {
      // For score=45: q*0.6 = 8.9, q ≈ 14.8
      const result = calculateReputation(
        makeStats({
          totalCompleted: 10,
          avgQualityScore: 15,
          totalSubmitted: 10,
        })
      );
      expect(result.score).toBeGreaterThanOrEqual(45);
      expect(result.tier).toBe("silver");
    });
  });

  it("gaming penalty reduces score", () => {
    const clean = calculateReputation(
      makeStats({ totalCompleted: 10, flaggedResponseCount: 0 })
    );
    const flagged = calculateReputation(
      makeStats({ totalCompleted: 10, flaggedResponseCount: 5 })
    );
    expect(flagged.score).toBeLessThan(clean.score);
  });
});
