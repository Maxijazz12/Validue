import { describe, expect, it } from "vitest";
import {
  calculateCurrentResponseStreak,
  getResponseActivityDay,
  getResponseCompletedAt,
} from "../response-activity";

describe("response activity timing", () => {
  it("derives completion time from created_at plus submitted duration", () => {
    expect(
      getResponseCompletedAt({
        created_at: "2026-04-03T23:55:00.000Z",
        submitted_duration_ms: 10 * 60 * 1000,
      })?.toISOString()
    ).toBe("2026-04-04T00:05:00.000Z");
  });

  it("uses completion day for streak-sensitive activity", () => {
    expect(
      getResponseActivityDay({
        created_at: "2026-04-03T23:55:00.000Z",
        submitted_duration_ms: 10 * 60 * 1000,
      })
    ).toBe("2026-04-04");
  });

  it("counts a streak from completed-response days instead of start days", () => {
    expect(
      calculateCurrentResponseStreak(
        [
          {
            created_at: "2026-04-03T23:55:00.000Z",
            submitted_duration_ms: 10 * 60 * 1000,
          },
          {
            created_at: "2026-04-03T12:00:00.000Z",
            submitted_duration_ms: 0,
          },
          {
            created_at: "2026-04-02T08:00:00.000Z",
            submitted_duration_ms: 0,
          },
        ],
        new Date("2026-04-04T12:00:00.000Z")
      )
    ).toBe(3);
  });

  it("ignores stale or invalid activity rows", () => {
    expect(
      calculateCurrentResponseStreak(
        [
          {
            created_at: "not-a-date",
            submitted_duration_ms: 0,
          },
          {
            created_at: "2026-03-28T12:00:00.000Z",
            submitted_duration_ms: 0,
          },
        ],
        new Date("2026-04-04T12:00:00.000Z")
      )
    ).toBe(0);
  });
});
