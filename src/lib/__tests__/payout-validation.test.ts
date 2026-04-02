import { describe, it, expect } from "vitest";
import { PLATFORM_FEE_RATE } from "@/lib/plans";
import { DEFAULTS, safePositive } from "@/lib/defaults";

/**
 * Tests for payout validation logic extracted from payout-actions.ts.
 * These validate the financial integrity checks without needing a database.
 */

// ─── Distributable integrity check (from suggestDistribution) ───

function checkDistributableIntegrity(
  storedDistributable: number,
  rewardAmount: number,
  tolerance = 0.02
): boolean {
  const expected =
    Math.round(safePositive(rewardAmount) * (1 - PLATFORM_FEE_RATE) * 100) / 100;
  return Math.abs(storedDistributable - expected) <= tolerance;
}

describe("distributable integrity check", () => {
  it("passes when stored matches calculated exactly", () => {
    // $100 reward → $80.00 distributable (20% fee)
    expect(checkDistributableIntegrity(80.0, 100)).toBe(true);
  });

  it("passes within $0.02 tolerance (rounding)", () => {
    expect(checkDistributableIntegrity(80.01, 100)).toBe(true);
    expect(checkDistributableIntegrity(79.99, 100)).toBe(true);
  });

  it("fails when stored exceeds tolerance", () => {
    expect(checkDistributableIntegrity(80.03, 100)).toBe(false);
    expect(checkDistributableIntegrity(79.97, 100)).toBe(false);
  });

  it("rejects corrupted distributable (stored way too high)", () => {
    expect(checkDistributableIntegrity(100, 100)).toBe(false);
  });

  it("handles $0 reward", () => {
    expect(checkDistributableIntegrity(0, 0)).toBe(true);
  });

  it("handles precision edge case ($99.99 reward)", () => {
    const expected = Math.round(99.99 * (1 - PLATFORM_FEE_RATE) * 100) / 100;
    expect(checkDistributableIntegrity(expected, 99.99)).toBe(true);
  });

  it("handles small reward ($5)", () => {
    const expected = Math.round(5 * (1 - PLATFORM_FEE_RATE) * 100) / 100;
    expect(expected).toBe(4.0);
    expect(checkDistributableIntegrity(4.0, 5)).toBe(true);
  });
});

// ─── Over-allocation prevention (from allocatePayouts) ───

function checkOverAllocation(
  allocations: { amount: number }[],
  distributable: number,
  tolerance = 0.01
): boolean {
  const total = allocations.reduce((s, a) => s + a.amount, 0);
  return total <= distributable + tolerance;
}

describe("over-allocation prevention", () => {
  it("passes when total equals distributable", () => {
    expect(checkOverAllocation([{ amount: 5 }, { amount: 3 }], 8)).toBe(true);
  });

  it("passes when total is under distributable", () => {
    expect(checkOverAllocation([{ amount: 4 }, { amount: 3 }], 8)).toBe(true);
  });

  it("passes within $0.01 tolerance", () => {
    expect(checkOverAllocation([{ amount: 5 }, { amount: 3.01 }], 8)).toBe(true);
  });

  it("rejects when exceeding tolerance", () => {
    expect(checkOverAllocation([{ amount: 5 }, { amount: 3.02 }], 8)).toBe(false);
  });

  it("handles empty allocations", () => {
    expect(checkOverAllocation([], 100)).toBe(true);
  });

  it("handles single allocation exceeding pool", () => {
    expect(checkOverAllocation([{ amount: 10 }], 5)).toBe(false);
  });
});

// ─── Min payout filtering (from allocatePayouts) ───

describe("min payout filtering", () => {
  const MIN_PAYOUT = DEFAULTS.MIN_PAYOUT; // $0.50

  function filterAllocations(allocations: { responseId: string; amount: number }[]) {
    return allocations.filter((a) => a.amount >= MIN_PAYOUT);
  }

  it("keeps allocations above minimum", () => {
    const allocs = [
      { responseId: "a", amount: 5.0 },
      { responseId: "b", amount: 3.5 },
    ];
    expect(filterAllocations(allocs)).toHaveLength(2);
  });

  it("filters out allocations below minimum", () => {
    const allocs = [
      { responseId: "a", amount: 5.0 },
      { responseId: "b", amount: 0.25 },
      { responseId: "c", amount: 3.5 },
    ];
    const filtered = filterAllocations(allocs);
    expect(filtered).toHaveLength(2);
    expect(filtered.map((a) => a.responseId)).toEqual(["a", "c"]);
  });

  it("keeps allocation exactly at minimum", () => {
    const allocs = [{ responseId: "a", amount: MIN_PAYOUT }];
    expect(filterAllocations(allocs)).toHaveLength(1);
  });

  it("filters allocation just below minimum", () => {
    const allocs = [{ responseId: "a", amount: MIN_PAYOUT - 0.01 }];
    expect(filterAllocations(allocs)).toHaveLength(0);
  });
});

// ─── Distributable calculation (from publishCampaign) ───

describe("distributable amount calculation", () => {
  function calculateDistributable(fundingAmount: number): number {
    return fundingAmount
      ? Math.round(fundingAmount * (1 - PLATFORM_FEE_RATE) * 100) / 100
      : 0;
  }

  it("calculates 20% fee correctly for $100", () => {
    expect(calculateDistributable(100)).toBe(80.0);
  });

  it("calculates for $5 minimum", () => {
    expect(calculateDistributable(5)).toBe(4.0);
  });

  it("returns 0 for $0 funding", () => {
    expect(calculateDistributable(0)).toBe(0);
  });

  it("handles floating-point precision", () => {
    // $99.99 * 0.80 = 79.992 → rounds to 79.99
    expect(calculateDistributable(99.99)).toBe(79.99);
  });

  it("handles $1 funding", () => {
    expect(calculateDistributable(1)).toBe(0.80);
  });
});
