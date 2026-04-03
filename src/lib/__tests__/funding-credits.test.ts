import { describe, expect, it } from "vitest";
import {
  reconcileReservedPlatformCredit,
  resolveFundingCredits,
} from "../funding-credits";

describe("resolveFundingCredits", () => {
  it("caps platform credit at the campaign remainder", () => {
    expect(
      resolveFundingCredits({
        fullAmountCents: 500,
        welcomeCreditEligible: false,
        welcomeCreditCents: 200,
        platformCreditAvailableCents: 1200,
      })
    ).toEqual({
      appliedWelcomeCreditCents: 0,
      appliedPlatformCreditCents: 500,
      chargeAmountCents: 0,
      platformSubsidyCents: 0,
    });
  });

  it("uses the welcome credit before spending platform credit", () => {
    expect(
      resolveFundingCredits({
        fullAmountCents: 500,
        welcomeCreditEligible: true,
        welcomeCreditCents: 200,
        platformCreditAvailableCents: 250,
      })
    ).toEqual({
      appliedWelcomeCreditCents: 200,
      appliedPlatformCreditCents: 250,
      chargeAmountCents: 50,
      platformSubsidyCents: 0,
    });
  });

  it("skips Stripe when credits fully cover the campaign", () => {
    expect(
      resolveFundingCredits({
        fullAmountCents: 500,
        welcomeCreditEligible: true,
        welcomeCreditCents: 200,
        platformCreditAvailableCents: 300,
      })
    ).toEqual({
      appliedWelcomeCreditCents: 200,
      appliedPlatformCreditCents: 300,
      chargeAmountCents: 0,
      platformSubsidyCents: 0,
    });
  });

  it("avoids charging an uncovered remainder below Stripe's minimum", () => {
    expect(
      resolveFundingCredits({
        fullAmountCents: 500,
        welcomeCreditEligible: true,
        welcomeCreditCents: 200,
        platformCreditAvailableCents: 260,
      })
    ).toEqual({
      appliedWelcomeCreditCents: 200,
      appliedPlatformCreditCents: 260,
      chargeAmountCents: 0,
      platformSubsidyCents: 40,
    });
  });
});

describe("reconcileReservedPlatformCredit", () => {
  it("returns a positive delta when more profile credit needs to be reserved", () => {
    expect(reconcileReservedPlatformCredit(300, 100)).toEqual({
      nextReservedPlatformCreditCents: 300,
      profileCreditDeltaCents: 200,
    });
  });

  it("returns a negative delta when part of the reservation should be refunded", () => {
    expect(reconcileReservedPlatformCredit(100, 260)).toEqual({
      nextReservedPlatformCreditCents: 100,
      profileCreditDeltaCents: -160,
    });
  });
});
