import { describe, it, expect } from "vitest";
import {
  getQualityModifier,
  resolveStrength,
  getCampaignStrength,
  calculateReach,
  validateFunding,
} from "../reach";

describe("getQualityModifier", () => {
  it("returns 1.0 for neutral score (50)", () => {
    expect(getQualityModifier(50)).toBe(1.0);
  });

  it("returns 0.7 for score 0", () => {
    expect(getQualityModifier(0)).toBe(0.7);
  });

  it("returns 1.3 for score 100", () => {
    expect(getQualityModifier(100)).toBeCloseTo(1.3);
  });

  it("returns 1.0 when gated below 5 responses", () => {
    expect(getQualityModifier(0, 0)).toBe(1.0);
    expect(getQualityModifier(0, 3)).toBe(1.0);
    expect(getQualityModifier(0, 4)).toBe(1.0);
    expect(getQualityModifier(100, 4)).toBe(1.0);
  });

  it("returns actual modifier at exactly 5 responses (gate lifts)", () => {
    expect(getQualityModifier(0, 5)).toBe(0.7);
    expect(getQualityModifier(100, 5)).toBeCloseTo(1.3);
    expect(getQualityModifier(50, 5)).toBe(1.0);
  });

  it("clamps out-of-range scores", () => {
    expect(getQualityModifier(-50)).toBe(0.7);
    expect(getQualityModifier(200)).toBeCloseTo(1.3);
  });

  it("works without rankedResponseCount (undefined = no gate)", () => {
    expect(getQualityModifier(0)).toBe(0.7);
    expect(getQualityModifier(100)).toBeCloseTo(1.3);
  });
});

describe("resolveStrength", () => {
  it("ratchets: keeps higher value", () => {
    expect(resolveStrength(7, 5)).toBe(7);
  });

  it("allows increase", () => {
    expect(resolveStrength(5, 8)).toBe(8);
  });

  it("stays same when equal", () => {
    expect(resolveStrength(6, 6)).toBe(6);
  });
});

describe("getCampaignStrength", () => {
  it("returns 1 for 0 reach", () => {
    expect(getCampaignStrength(0)).toBe(1);
  });

  it("returns 10 for 3000+ reach", () => {
    expect(getCampaignStrength(3000)).toBe(10);
    expect(getCampaignStrength(5000)).toBe(10);
  });

  it("returns correct strength at boundaries", () => {
    expect(getCampaignStrength(49)).toBe(1);
    expect(getCampaignStrength(50)).toBe(2);
    expect(getCampaignStrength(100)).toBe(3);
    expect(getCampaignStrength(200)).toBe(4);
  });
});

describe("validateFunding", () => {
  it("accepts $0 (baseline-only)", () => {
    expect(validateFunding("free", 0)).toEqual({ valid: true });
  });

  it("rejects NaN", () => {
    expect(validateFunding("free", NaN).valid).toBe(false);
  });

  it("rejects Infinity", () => {
    expect(validateFunding("free", Infinity).valid).toBe(false);
  });

  it("rejects negative", () => {
    expect(validateFunding("free", -10).valid).toBe(false);
  });

  it("rejects below tier minimum", () => {
    expect(validateFunding("free", 2).valid).toBe(false);
    expect(validateFunding("free", 3).valid).toBe(true);
  });

  it("rejects above max ($10,000)", () => {
    expect(validateFunding("free", 10001).valid).toBe(false);
    expect(validateFunding("free", 10000).valid).toBe(true);
  });

  it("rejects fractional cents", () => {
    expect(validateFunding("free", 5.001).valid).toBe(false);
    expect(validateFunding("free", 5.01).valid).toBe(true);
  });
});

describe("calculateReach", () => {
  it("returns positive values for all tiers at $0", () => {
    for (const tier of ["free", "pro"] as const) {
      const result = calculateReach(tier, 0);
      expect(result.baselineRU).toBeGreaterThan(0);
      expect(result.effectiveReach).toBeGreaterThan(0);
      expect(result.campaignStrength).toBeGreaterThanOrEqual(1);
      expect(result.estimatedResponsesLow).toBeGreaterThanOrEqual(1);
    }
  });

  it("increases reach with funding", () => {
    const noFund = calculateReach("free", 0);
    const funded = calculateReach("free", 25);
    expect(funded.effectiveReach).toBeGreaterThan(noFund.effectiveReach);
  });

  it("welcome bonus reach multiplier is disabled (baseline 150 is the welcome experience)", () => {
    const normal = calculateReach("free", 0);
    const bonus = calculateReach("free", 0, {
      isFirstMonth: true,
      isFirstCampaign: true,
    });
    // With multiplier at 1.0, baseline stays the same — 150 RU is already generous
    expect(bonus.baselineRU).toBe(normal.baselineRU);
  });

  it("uses neutral quality modifier when rankedResponseCount < 5", () => {
    const gated = calculateReach("free", 10, {
      qualityScore: 0,
      rankedResponseCount: 0,
    });
    const ungated = calculateReach("free", 10, {
      qualityScore: 0,
      rankedResponseCount: 10,
    });
    // Gated: modifier = 1.0 (neutral), ungated: modifier = 0.7 (penalty)
    expect(gated.qualityModifier).toBe(1.0);
    expect(ungated.qualityModifier).toBe(0.7);
    expect(gated.effectiveReach).toBeGreaterThan(ungated.effectiveReach);
  });

  it("defaults to ungated when rankedResponseCount not provided", () => {
    // Without rankedResponseCount, gate should NOT apply (backward compat for UI presets)
    const result = calculateReach("free", 10, { qualityScore: 0 });
    expect(result.qualityModifier).toBe(0.7);
  });
});
