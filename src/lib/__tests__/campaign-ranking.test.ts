import { describe, expect, it } from "vitest";
import {
  getRankingStatusAfterNewResponse,
  getRankingStatusAfterRun,
} from "../campaign-ranking";

describe("campaign ranking state helpers", () => {
  it("keeps a campaign in ranking while a run is active", () => {
    expect(getRankingStatusAfterNewResponse("ranking")).toBe("ranking");
  });

  it("marks ranked or unknown campaigns as unranked when a new response arrives", () => {
    expect(getRankingStatusAfterNewResponse("ranked")).toBe("unranked");
    expect(getRankingStatusAfterNewResponse("unranked")).toBe("unranked");
    expect(getRankingStatusAfterNewResponse(null)).toBe("unranked");
  });

  it("leaves campaigns unranked when new submissions arrived during ranking", () => {
    expect(getRankingStatusAfterRun(true)).toBe("unranked");
    expect(getRankingStatusAfterRun(false)).toBe("ranked");
  });
});
