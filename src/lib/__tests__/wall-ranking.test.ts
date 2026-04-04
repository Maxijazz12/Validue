import { describe, it, expect } from "vitest";
import {
  computeMatchScore,
  computeRewardScore,
  computeMomentumScore,
  computeFreshnessScore,
  computeWallScore,
  sortByWallScore,
  meetsMinimumEligibility,
  classifyMatchBucket,
  type WallCampaign,
  type RespondentProfile,
} from "../wall-ranking";
import { DEFAULTS } from "../defaults";

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
  audience_industry: null,
  audience_experience_level: null,
};

const baseProfile: RespondentProfile = {
  interests: [],
  expertise: [],
  age_range: null,
  industry: null,
  experience_level: null,
  profile_completed: true,
  reputation_score: 0,
  total_responses_completed: 0,
};

describe("computeMatchScore", () => {
  it("scores 40% of max per dimension when both sides empty", () => {
    const score = computeMatchScore(baseCampaign, baseProfile);
    // interests: 35*0.4=14, expertise: 25*0.4=10, age: 15*0.4=6, industry: 10*0.4=4, experience: 10*0.4=4, tags: 0 = 38
    expect(score).toBe(38);
  });

  it("gives full points for perfect overlap", () => {
    const campaign = {
      ...baseCampaign,
      target_interests: ["a", "b"],
      target_expertise: ["x"],
      target_age_ranges: ["25-34"],
      audience_industry: "Technology",
      audience_experience_level: "Mid-level (3–5 years)",
    };
    const profile = {
      ...baseProfile,
      interests: ["a", "b"],
      expertise: ["x"],
      age_range: "25-34" as const,
      industry: "Technology",
      experience_level: "Mid-level (3–5 years)",
    };
    const score = computeMatchScore(campaign, profile);
    // interests: 35, expertise: 25, age: 15, industry: 10, experience: 10, tags: 0 = 95
    expect(score).toBe(95);
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

describe("computeFreshnessScore", () => {
  it("returns 100 for a campaign created right now", () => {
    const now = Date.now();
    const createdAt = new Date(now).toISOString();
    expect(computeFreshnessScore(createdAt, now)).toBe(100);
  });

  it("returns ~57 after 48 hours (preserves first 48h)", () => {
    const now = Date.now();
    const createdAt = new Date(now - 48 * 60 * 60 * 1000).toISOString();
    const score = computeFreshnessScore(createdAt, now);
    expect(score).toBeGreaterThanOrEqual(55);
    expect(score).toBeLessThanOrEqual(70);
  });

  it("returns ~6 after 14 days", () => {
    const now = Date.now();
    const createdAt = new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString();
    const score = computeFreshnessScore(createdAt, now);
    expect(score).toBeGreaterThanOrEqual(4);
    expect(score).toBeLessThanOrEqual(8);
  });

  it("returns 0 for invalid date", () => {
    expect(computeFreshnessScore("not-a-date")).toBe(0);
  });

  it("returns 0 for very old campaigns", () => {
    const now = Date.now();
    const createdAt = new Date(now - 365 * 24 * 60 * 60 * 1000).toISOString();
    expect(computeFreshnessScore(createdAt, now)).toBe(0);
  });

  it("decays monotonically over time", () => {
    const now = Date.now();
    const scores = [0, 24, 48, 72, 120, 240, 336].map((hours) =>
      computeFreshnessScore(new Date(now - hours * 60 * 60 * 1000).toISOString(), now)
    );
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeLessThanOrEqual(scores[i - 1]);
    }
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
    expect(matchScore).toBe(30);
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

/* ─── meetsMinimumEligibility ─── */

describe("meetsMinimumEligibility", () => {
  const targetedCampaign = {
    target_interests: ["SaaS", "Fintech"],
    target_expertise: ["Developer"],
    target_age_ranges: ["25-34"],
    audience_industry: "Technology",
    audience_experience_level: "Mid-level (3–5 years)",
  };

  const fullMatchProfile: RespondentProfile = {
    interests: ["SaaS"],
    expertise: ["Developer"],
    age_range: "25-34",
    industry: "Technology",
    experience_level: "Mid-level (3–5 years)",
    profile_completed: true,
    reputation_score: 50,
    total_responses_completed: 5,
  };

  const partialMatchProfile: RespondentProfile = {
    interests: ["SaaS"],
    expertise: ["Designer"],
    age_range: "35-44",
    industry: "Healthcare",
    experience_level: "Senior (6–10 years)",
    profile_completed: true,
    reputation_score: 50,
    total_responses_completed: 5,
  };

  const noMatchProfile: RespondentProfile = {
    interests: ["Gaming"],
    expertise: ["Designer"],
    age_range: "18-24",
    industry: "Healthcare",
    experience_level: "Student",
    profile_completed: true,
    reputation_score: 50,
    total_responses_completed: 5,
  };

  const incompleteProfile: RespondentProfile = {
    interests: [],
    expertise: [],
    age_range: null,
    industry: null,
    experience_level: null,
    profile_completed: false,
    reputation_score: 0,
    total_responses_completed: 0,
  };

  const untargetedCampaign = {
    target_interests: [] as string[],
    target_expertise: [] as string[],
    target_age_ranges: [] as string[],
    audience_industry: null as string | null,
    audience_experience_level: null as string | null,
  };

  // ─── Broad Mode ───

  describe("broad mode", () => {
    it("allows respondent with zero overlap", () => {
      expect(meetsMinimumEligibility(targetedCampaign, noMatchProfile, "broad")).toBe(true);
    });

    it("allows respondent with partial overlap", () => {
      expect(meetsMinimumEligibility(targetedCampaign, partialMatchProfile, "broad")).toBe(true);
    });

    it("allows incomplete profiles", () => {
      expect(meetsMinimumEligibility(targetedCampaign, incompleteProfile, "broad")).toBe(true);
    });

    it("allows full match", () => {
      expect(meetsMinimumEligibility(targetedCampaign, fullMatchProfile, "broad")).toBe(true);
    });
  });

  // ─── Balanced Mode (default) ───

  describe("balanced mode", () => {
    it("allows respondent with one matching dimension (interests)", () => {
      expect(meetsMinimumEligibility(targetedCampaign, partialMatchProfile, "balanced")).toBe(true);
    });

    it("rejects respondent with zero overlap", () => {
      expect(meetsMinimumEligibility(targetedCampaign, noMatchProfile, "balanced")).toBe(false);
    });

    it("allows full match", () => {
      expect(meetsMinimumEligibility(targetedCampaign, fullMatchProfile, "balanced")).toBe(true);
    });

    it("defaults to balanced when mode is omitted", () => {
      expect(meetsMinimumEligibility(targetedCampaign, partialMatchProfile)).toBe(true);
      expect(meetsMinimumEligibility(targetedCampaign, noMatchProfile)).toBe(false);
    });

    it("allows incomplete profiles", () => {
      expect(meetsMinimumEligibility(targetedCampaign, incompleteProfile, "balanced")).toBe(true);
    });

    it("passes when campaign has no targeting", () => {
      expect(meetsMinimumEligibility(untargetedCampaign, noMatchProfile, "balanced")).toBe(true);
    });
  });

  // ─── Strict Mode ───

  describe("strict mode", () => {
    it("rejects respondent with only partial overlap", () => {
      expect(meetsMinimumEligibility(targetedCampaign, partialMatchProfile, "strict")).toBe(false);
    });

    it("allows respondent with full overlap on all targeted dimensions", () => {
      expect(meetsMinimumEligibility(targetedCampaign, fullMatchProfile, "strict")).toBe(true);
    });

    it("rejects respondent with zero overlap", () => {
      expect(meetsMinimumEligibility(targetedCampaign, noMatchProfile, "strict")).toBe(false);
    });

    it("allows incomplete profiles (nudge, not block)", () => {
      expect(meetsMinimumEligibility(targetedCampaign, incompleteProfile, "strict")).toBe(true);
    });

    it("passes when campaign has no targeting (vacuous truth)", () => {
      expect(meetsMinimumEligibility(untargetedCampaign, noMatchProfile, "strict")).toBe(true);
    });
  });

  // ─── Edge Cases ───

  describe("edge cases", () => {
    it("strict mode with single dimension targeted — only checks that one", () => {
      const singleDim = {
        target_interests: ["SaaS"],
        target_expertise: [] as string[],
        target_age_ranges: [] as string[],
        audience_industry: null as string | null,
        audience_experience_level: null as string | null,
      };
      const profile = { ...noMatchProfile, interests: ["SaaS"] };
      expect(meetsMinimumEligibility(singleDim, profile, "strict")).toBe(true);
    });

    it("strict mode: null profile dimension fails against targeted campaign dimension", () => {
      const profile = { ...fullMatchProfile, industry: null };
      expect(meetsMinimumEligibility(targetedCampaign, profile, "strict")).toBe(false);
    });

    it("strict mode: empty profile array fails against targeted campaign array", () => {
      const profile = { ...fullMatchProfile, interests: [] as string[] };
      expect(meetsMinimumEligibility(targetedCampaign, profile, "strict")).toBe(false);
    });

    it("balanced mode: null profile dimension on one dim, match on another, passes", () => {
      const profile = { ...partialMatchProfile, industry: null };
      // Still has interests: ["SaaS"] which matches
      expect(meetsMinimumEligibility(targetedCampaign, profile, "balanced")).toBe(true);
    });

    it("industry matching is case-insensitive", () => {
      const campaign = { ...untargetedCampaign, audience_industry: "TECHNOLOGY" };
      const profile = { ...noMatchProfile, industry: "technology" };
      expect(meetsMinimumEligibility(campaign, profile, "balanced")).toBe(true);
    });

    it("experience level matching is case-insensitive", () => {
      const campaign = { ...untargetedCampaign, audience_experience_level: "Senior (6–10 years)" };
      const profile = { ...noMatchProfile, experience_level: "senior (6–10 years)" };
      expect(meetsMinimumEligibility(campaign, profile, "balanced")).toBe(true);
    });
  });

  describe("hard filters (strict mode)", () => {
    it("with hard filters, only checks those dimensions", () => {
      // Profile matches industry but not interests
      const profile = { ...noMatchProfile, industry: "technology" };
      // Without hard filters: strict requires ALL → fail (interests don't match)
      expect(meetsMinimumEligibility(targetedCampaign, profile, "strict")).toBe(false);
      // With hard filter on industry only → pass
      expect(meetsMinimumEligibility(targetedCampaign, profile, "strict", ["industry"])).toBe(true);
    });

    it("fails if hard filter dimension doesn't match", () => {
      const profile = { ...partialMatchProfile }; // matches interests but not industry
      expect(meetsMinimumEligibility(targetedCampaign, profile, "strict", ["industry"])).toBe(false);
    });

    it("with multiple hard filters, all must match", () => {
      // Matches interests but not industry
      const profile = { ...partialMatchProfile };
      expect(meetsMinimumEligibility(targetedCampaign, profile, "strict", ["interests", "industry"])).toBe(false);
      // Matches both
      const fullProfile = { ...fullMatchProfile };
      expect(meetsMinimumEligibility(targetedCampaign, fullProfile, "strict", ["interests", "industry"])).toBe(true);
    });

    it("hard filters on non-targeted dimensions pass through", () => {
      // Campaign only targets interests, hard filter is on industry (not targeted)
      const campaign = { ...untargetedCampaign, target_interests: ["SaaS"] };
      const profile = { ...noMatchProfile }; // no interests match, no industry
      expect(meetsMinimumEligibility(campaign, profile, "strict", ["industry"])).toBe(true);
    });

    it("hard filters ignored in balanced mode", () => {
      // Profile matches interests but not industry
      const profile = { ...partialMatchProfile };
      // balanced mode ignores hard filters — any overlap passes
      expect(meetsMinimumEligibility(targetedCampaign, profile, "balanced", ["industry"])).toBe(true);
    });

    it("hard filters ignored in broad mode", () => {
      expect(meetsMinimumEligibility(targetedCampaign, noMatchProfile, "broad", ["industry"])).toBe(true);
    });

    it("empty hard filters in strict = all dimensions required (existing behavior)", () => {
      expect(meetsMinimumEligibility(targetedCampaign, partialMatchProfile, "strict", [])).toBe(false);
      expect(meetsMinimumEligibility(targetedCampaign, fullMatchProfile, "strict", [])).toBe(true);
    });
  });
});

/* ─── classifyMatchBucket ─── */

describe("classifyMatchBucket", () => {
  it("classifies score >= 70 as core", () => {
    expect(classifyMatchBucket(70)).toBe("core");
    expect(classifyMatchBucket(85)).toBe("core");
    expect(classifyMatchBucket(100)).toBe("core");
  });

  it("classifies score 40-69 as adjacent", () => {
    expect(classifyMatchBucket(40)).toBe("adjacent");
    expect(classifyMatchBucket(55)).toBe("adjacent");
    expect(classifyMatchBucket(69)).toBe("adjacent");
  });

  it("classifies score < 40 as off_target", () => {
    expect(classifyMatchBucket(0)).toBe("off_target");
    expect(classifyMatchBucket(39)).toBe("off_target");
  });

  it("classifies incomplete profile score (30) as off_target", () => {
    expect(classifyMatchBucket(DEFAULTS.MATCH_SCORE_INCOMPLETE)).toBe("off_target");
  });

  it("classifies empty-dimension baseline (~38) as off_target", () => {
    // A completed profile with zero overlap scores ~38 (all unknown fractions)
    expect(classifyMatchBucket(38)).toBe("off_target");
  });

  it("uses threshold constants from DEFAULTS", () => {
    expect(classifyMatchBucket(DEFAULTS.MATCH_BUCKET_CORE_THRESHOLD)).toBe("core");
    expect(classifyMatchBucket(DEFAULTS.MATCH_BUCKET_CORE_THRESHOLD - 1)).toBe("adjacent");
    expect(classifyMatchBucket(DEFAULTS.MATCH_BUCKET_ADJACENT_THRESHOLD)).toBe("adjacent");
    expect(classifyMatchBucket(DEFAULTS.MATCH_BUCKET_ADJACENT_THRESHOLD - 1)).toBe("off_target");
  });
});
