import { describe, it, expect } from "vitest";
import {
  computeMatchScore,
  computeRewardScore,
  computeMomentumScore,
  computeWallScore,
  sortByWallScore,
  type WallCampaign,
  type RespondentProfile,
} from "../wall-ranking";

const baseCampaign: WallCampaign = {
  id: "aaa",
  created_at: new Date().toISOString(),
  current_responses: 0,
  target_responses: 50,
  reward_amount: 25,
  estimated_responses_low: 5,
  quality_score: 50,
  match_priority: 1,
  target_interests: [],
  target_expertise: [],
  target_age_ranges: [],
  tags: [],
};

const baseProfile: RespondentProfile = {
  interests: [],
  expertise: [],
  age_range: null,
  profile_completed: true,
  reputation_score: 0,
  total_responses_completed: 0,
};

describe("computeMatchScore", () => {
  it("scores 40% of max per dimension when both sides empty", () => {
    const score = computeMatchScore(baseCampaign, baseProfile);
    // interests: 40*0.4=16, expertise: 30*0.4=12, age: 15*0.4=6, tags: 0 = 34
    expect(score).toBe(34);
  });

  it("gives full points for perfect overlap", () => {
    const campaign = {
      ...baseCampaign,
      target_interests: ["a", "b"],
      target_expertise: ["x"],
      target_age_ranges: ["25-34"],
    };
    const profile = {
      ...baseProfile,
      interests: ["a", "b"],
      expertise: ["x"],
      age_range: "25-34" as const,
    };
    const score = computeMatchScore(campaign, profile);
    // interests: 40, expertise: 30, age: 15, tags: 0 = 85
    expect(score).toBe(85);
  });

  it("caps at 100", () => {
    const campaign = {
      ...baseCampaign,
      target_interests: ["a"],
      target_expertise: ["x"],
      target_age_ranges: ["25-34"],
      tags: ["a", "x"],
    };
    const profile = {
      ...baseProfile,
      interests: ["a"],
      expertise: ["x"],
      age_range: "25-34" as const,
      reputation_score: 100,
      total_responses_completed: 10,
    };
    const score = computeMatchScore(campaign, profile);
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe("computeRewardScore", () => {
  it("returns 0 for zero reward", () => {
    expect(computeRewardScore({ ...baseCampaign, reward_amount: 0 })).toBe(0);
  });

  it("returns 0 for negative reward", () => {
    expect(computeRewardScore({ ...baseCampaign, reward_amount: -5 })).toBe(0);
  });

  it("caps at 100", () => {
    expect(
      computeRewardScore({ ...baseCampaign, reward_amount: 10000 })
    ).toBe(100);
  });

  it("scores $10 at ~52", () => {
    const score = computeRewardScore({ ...baseCampaign, reward_amount: 10 });
    expect(score).toBeGreaterThanOrEqual(50);
    expect(score).toBeLessThanOrEqual(55);
  });
});

describe("computeMomentumScore", () => {
  it("returns 50 when target is 0 (safe default)", () => {
    expect(computeMomentumScore(0, 0)).toBe(50);
  });

  it("returns ~80 when 0% filled", () => {
    const score = computeMomentumScore(0, 50);
    expect(score).toBeGreaterThanOrEqual(78);
    expect(score).toBeLessThanOrEqual(80);
  });

  it("returns ~50 when 50% filled", () => {
    const score = computeMomentumScore(25, 50);
    expect(score).toBeGreaterThanOrEqual(48);
    expect(score).toBeLessThanOrEqual(52);
  });

  it("returns ~20 when 100% filled", () => {
    const score = computeMomentumScore(50, 50);
    expect(score).toBeGreaterThanOrEqual(20);
    expect(score).toBeLessThanOrEqual(22);
  });

  it("clamps at 100% fill when over target", () => {
    const score = computeMomentumScore(100, 50);
    expect(score).toBeGreaterThanOrEqual(20);
    expect(score).toBeLessThanOrEqual(22);
  });
});

describe("computeWallScore", () => {
  it("returns value in [0, 100]", () => {
    const { wallScore } = computeWallScore(baseCampaign, baseProfile);
    expect(wallScore).toBeGreaterThanOrEqual(0);
    expect(wallScore).toBeLessThanOrEqual(100);
  });

  it("uses MATCH_SCORE_INCOMPLETE for incomplete profiles", () => {
    const incompleteProfile = { ...baseProfile, profile_completed: false };
    const { matchScore } = computeWallScore(baseCampaign, incompleteProfile);
    expect(matchScore).toBe(40);
  });
});

describe("sortByWallScore", () => {
  it("sorts by score descending when difference > 2.0", () => {
    const campaigns = [
      { ...baseCampaign, id: "aaa", wallScore: 50 },
      { ...baseCampaign, id: "bbb", wallScore: 60 },
    ];
    const sorted = sortByWallScore(campaigns);
    expect(sorted[0].id).toBe("bbb");
    expect(sorted[1].id).toBe("aaa");
  });

  it("uses priority tiebreak within 2.0pt band", () => {
    const campaigns = [
      { ...baseCampaign, id: "aaa", wallScore: 50, match_priority: 1 },
      { ...baseCampaign, id: "bbb", wallScore: 51, match_priority: 3 },
    ];
    const sorted = sortByWallScore(campaigns);
    // Within 2.0pt band, higher priority wins
    expect(sorted[0].id).toBe("bbb");
  });

  it("is deterministic — same order on repeated calls", () => {
    const campaigns = [
      { ...baseCampaign, id: "aaa", wallScore: 50, match_priority: 1 },
      { ...baseCampaign, id: "bbb", wallScore: 50, match_priority: 1 },
    ];
    const sorted1 = sortByWallScore(campaigns);
    const sorted2 = sortByWallScore(campaigns);
    expect(sorted1.map((c) => c.id)).toEqual(sorted2.map((c) => c.id));
  });

  it("uses UUID as final tiebreaker", () => {
    const campaigns = [
      { ...baseCampaign, id: "zzz", wallScore: 50, match_priority: 1 },
      { ...baseCampaign, id: "aaa", wallScore: 50, match_priority: 1 },
    ];
    const sorted = sortByWallScore(campaigns);
    // UUID lexicographic: "aaa" < "zzz", so "aaa" comes first
    expect(sorted[0].id).toBe("aaa");
  });
});
