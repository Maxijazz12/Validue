import { describe, it, expect, vi } from "vitest";

// Mock the db module to avoid env validation
vi.mock("../db", () => ({ default: vi.fn() }));

import {
  isAccountEligibleForSubsidy,
  isSubsidyCapReached,
  computeEffectiveLimit,
  isSubscriptionBlocked,
} from "../plan-guard";
import { DEFAULTS } from "../defaults";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

describe("isAccountEligibleForSubsidy", () => {
  it("returns true for a brand new account (0ms)", () => {
    expect(isAccountEligibleForSubsidy(0)).toBe(true);
  });

  it("returns true at exactly the eligibility window boundary", () => {
    expect(isAccountEligibleForSubsidy(DEFAULTS.SUBSIDY_ELIGIBILITY_DAYS * ONE_DAY_MS)).toBe(true);
  });

  it("returns false for an account 1ms past the window", () => {
    expect(isAccountEligibleForSubsidy(DEFAULTS.SUBSIDY_ELIGIBILITY_DAYS * ONE_DAY_MS + 1)).toBe(false);
  });

  it("returns false for a very old account (365 days)", () => {
    expect(isAccountEligibleForSubsidy(365 * ONE_DAY_MS)).toBe(false);
  });

  it("returns true for an account at half the window", () => {
    expect(isAccountEligibleForSubsidy(15 * ONE_DAY_MS)).toBe(true);
  });
});

describe("isSubsidyCapReached", () => {
  it("returns false when no subsidized campaigns exist", () => {
    expect(isSubsidyCapReached(0)).toBe(false);
  });

  it("returns false when well under the cap", () => {
    expect(isSubsidyCapReached(10)).toBe(false);
  });

  it("returns true at exactly the cap", () => {
    const exactCap = Math.ceil(DEFAULTS.SUBSIDY_MONTHLY_CAP / DEFAULTS.SUBSIDY_BUDGET_PER_CAMPAIGN);
    expect(isSubsidyCapReached(exactCap)).toBe(true);
  });

  it("returns true when over the cap", () => {
    expect(isSubsidyCapReached(10000)).toBe(true);
  });
});

describe("computeEffectiveLimit", () => {
  it("returns welcome bonus for free tier in first month", () => {
    const limit = computeEffectiveLimit("free", true);
    expect(limit).toBe(1);
  });

  it("returns base limit for free tier not in first month", () => {
    const limit = computeEffectiveLimit("free", false);
    expect(limit).toBe(1);
  });

  it("returns base limit for pro tier regardless of first month", () => {
    const limit = computeEffectiveLimit("pro", true);
    expect(limit).toBe(5);
  });

  it("returns base limit for pro tier not first month", () => {
    const limit = computeEffectiveLimit("pro", false);
    expect(limit).toBe(5);
  });
});

describe("isSubscriptionBlocked", () => {
  it("returns true for canceled", () => {
    expect(isSubscriptionBlocked("canceled")).toBe(true);
  });

  it("returns true for past_due", () => {
    expect(isSubscriptionBlocked("past_due")).toBe(true);
  });

  it("returns false for active", () => {
    expect(isSubscriptionBlocked("active")).toBe(false);
  });

  it("returns false for trialing", () => {
    expect(isSubscriptionBlocked("trialing")).toBe(false);
  });
});
