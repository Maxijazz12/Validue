import { describe, expect, it } from "vitest";
import {
  hasReachedResponseTarget,
  isCampaignExpired,
  isCampaignOpenForResponses,
} from "../campaign-availability";

describe("campaign availability helpers", () => {
  it("treats campaigns at target as closed", () => {
    expect(hasReachedResponseTarget(10, 10)).toBe(true);
    expect(hasReachedResponseTarget(11, 10)).toBe(true);
    expect(hasReachedResponseTarget(9, 10)).toBe(false);
  });

  it("treats expired campaigns as closed", () => {
    const now = Date.parse("2026-04-03T12:00:00.000Z");
    expect(isCampaignExpired("2026-04-03T11:59:59.000Z", now)).toBe(true);
    expect(isCampaignExpired("2026-04-03T12:00:01.000Z", now)).toBe(false);
    expect(isCampaignExpired(null, now)).toBe(false);
  });

  it("only opens active, non-full, non-expired campaigns", () => {
    const now = Date.parse("2026-04-03T12:00:00.000Z");

    expect(
      isCampaignOpenForResponses(
        {
          status: "active",
          current_responses: 2,
          target_responses: 10,
          expires_at: "2026-04-03T13:00:00.000Z",
        },
        now
      )
    ).toBe(true);

    expect(
      isCampaignOpenForResponses(
        {
          status: "completed",
          current_responses: 2,
          target_responses: 10,
          expires_at: "2026-04-03T13:00:00.000Z",
        },
        now
      )
    ).toBe(false);

    expect(
      isCampaignOpenForResponses(
        {
          status: "active",
          current_responses: 10,
          target_responses: 10,
          expires_at: "2026-04-03T13:00:00.000Z",
        },
        now
      )
    ).toBe(false);

    expect(
      isCampaignOpenForResponses(
        {
          status: "active",
          current_responses: 2,
          target_responses: 10,
          expires_at: "2026-04-03T11:00:00.000Z",
        },
        now
      )
    ).toBe(false);

    expect(
      isCampaignOpenForResponses(
        {
          status: "active",
          current_responses: 0,
          target_responses: 0,
          expires_at: "2026-04-03T13:00:00.000Z",
        },
        now
      )
    ).toBe(false);
  });
});
