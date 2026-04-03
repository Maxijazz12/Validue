import { describe, expect, it } from "vitest";
import { PLAN_TIERS, isValidTier, normalizeTier } from "../plans";

describe("PLAN_TIERS", () => {
  it("keeps the launch pricing model to free and pro", () => {
    expect(PLAN_TIERS).toEqual(["free", "pro"]);
  });
});

describe("normalizeTier", () => {
  it("returns valid launch tiers unchanged", () => {
    expect(normalizeTier("free")).toBe("free");
    expect(normalizeTier("pro")).toBe("pro");
  });

  it("maps legacy paid tiers to pro", () => {
    expect(normalizeTier("starter")).toBe("pro");
    expect(normalizeTier("scale")).toBe("pro");
  });

  it("returns null for unknown tiers", () => {
    expect(normalizeTier("enterprise")).toBeNull();
    expect(normalizeTier(null)).toBeNull();
  });
});

describe("isValidTier", () => {
  it("only accepts live launch tiers", () => {
    expect(isValidTier("free")).toBe(true);
    expect(isValidTier("pro")).toBe(true);
    expect(isValidTier("starter")).toBe(false);
  });
});
