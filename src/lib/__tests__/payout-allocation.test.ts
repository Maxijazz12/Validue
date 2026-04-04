import { describe, expect, it } from "vitest";
import {
  resolvePayoutAllocations,
  type TrustedPayoutSuggestion,
} from "../payout-allocation";

function makeSuggestion(
  responseId: string,
  overrides: Partial<TrustedPayoutSuggestion> = {}
): TrustedPayoutSuggestion {
  return {
    responseId,
    respondentId: `user-${responseId}`,
    respondentName: `User ${responseId}`,
    qualityScore: 80,
    suggestedAmount: 5,
    weight: 0,
    scoringSource: "ai",
    scoringConfidence: 0.9,
    qualified: true,
    basePayout: 5,
    bonusPayout: 0,
    disqualificationReasons: [],
    ...overrides,
  };
}

describe("resolvePayoutAllocations", () => {
  it("fills omitted trusted responses with zero allocations", () => {
    const resolved = resolvePayoutAllocations(
      [makeSuggestion("a"), makeSuggestion("b")],
      [{ responseId: "a", amount: 4 }]
    );

    expect(resolved).toEqual([
      expect.objectContaining({
        responseId: "a",
        respondentId: "user-a",
        amount: 4,
        basePayout: 4,
        bonusPayout: 0,
        qualified: true,
      }),
      expect.objectContaining({
        responseId: "b",
        respondentId: "user-b",
        amount: 0,
        basePayout: 0,
        bonusPayout: 0,
        qualified: false,
      }),
    ]);
  });

  it("preserves server disqualification reasons", () => {
    const resolved = resolvePayoutAllocations(
      [
        makeSuggestion("a", {
          qualified: false,
          suggestedAmount: 0,
          basePayout: 0,
          disqualificationReasons: ["quality_score_below_threshold"],
        }),
      ],
      [{ responseId: "a", amount: 0 }]
    );

    expect(resolved[0]).toEqual(
      expect.objectContaining({
        responseId: "a",
        amount: 0,
        qualified: false,
        disqualificationReasons: ["quality_score_below_threshold"],
      })
    );
  });

  it("rejects payouts for server-disqualified responses", () => {
    expect(() =>
      resolvePayoutAllocations(
        [
          makeSuggestion("a", {
            qualified: false,
            suggestedAmount: 0,
            basePayout: 0,
            disqualificationReasons: ["insufficient_time"],
          }),
        ],
        [{ responseId: "a", amount: 1 }]
      )
    ).toThrow(/not payout-qualified/);
  });

  it("rejects response IDs outside the trusted ranked set", () => {
    expect(() =>
      resolvePayoutAllocations(
        [makeSuggestion("a")],
        [{ responseId: "b", amount: 1 }]
      )
    ).toThrow(/not eligible for payout allocation/);
  });

  it("rejects duplicate client allocations", () => {
    expect(() =>
      resolvePayoutAllocations(
        [makeSuggestion("a")],
        [
          { responseId: "a", amount: 1 },
          { responseId: "a", amount: 2 },
        ]
      )
    ).toThrow(/Duplicate response ID/);
  });
});
