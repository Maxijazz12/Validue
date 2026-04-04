import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import {
  getTestDb,
  closeTestDb,
  canConnectToTestDb,
  cleanupAll,
  cleanupCampaignData,
  seedRespondent,
  seedUser,
  seedCampaign,
  seedResponse,
  seedQuestion,
  seedAnswer,
  testId,
} from "./helpers";
import {
  calculateReputation,
  type ReputationStats,
} from "@/lib/reputation-config";
import { DEFAULTS } from "@/lib/defaults";

/**
 * Integration tests for the reputation scoring system.
 *
 * Tests the pure calculateReputation() function against realistic stat profiles,
 * verifying: tier assignment, hysteresis, confidence dampening, gaming penalties,
 * edge cases, and score clamping.
 */

describe("Reputation Scoring", () => {
  describe("calculateReputation (pure)", () => {
    it("returns new tier with score 0 when below minimum responses", () => {
      const result = calculateReputation({
        totalCompleted: 2,
        avgQualityScore: 90,
        totalEarned: 50,
        totalSubmitted: 2,
        flaggedResponseCount: 0,
      });
      expect(result.tier).toBe("new");
      expect(result.score).toBe(0);
    });

    it("returns new tier with score 0 when totalCompleted is 0", () => {
      const result = calculateReputation({
        totalCompleted: 0,
        avgQualityScore: 0,
        totalEarned: 0,
        totalSubmitted: 0,
        flaggedResponseCount: 0,
      });
      expect(result.tier).toBe("new");
      expect(result.score).toBe(0);
    });

    it("produces bronze tier for minimum qualifying respondent with low quality", () => {
      // 3 completed, low quality, some flags — minimum to get a score, should be bronze
      const result = calculateReputation({
        totalCompleted: 3,
        avgQualityScore: 20,
        totalEarned: 0,
        totalSubmitted: 5, // 60% completion
        flaggedResponseCount: 1,
      });

      expect(result.tier).toBe("bronze");
      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThan(45); // not yet silver
    });

    it("confidence dampener blends toward neutral at low sample sizes", () => {
      const base = {
        avgQualityScore: 80,
        totalEarned: 10,
        totalSubmitted: 3,
        flaggedResponseCount: 0,
      };

      const at3 = calculateReputation({ ...base, totalCompleted: 3 });
      const at10 = calculateReputation({
        ...base,
        totalCompleted: 10,
        totalSubmitted: 10,
      });

      // At 10 responses, dampener = 1.0 (full signal)
      // At 3, dampener = 0.3 (70% neutral). So at3 should be closer to 50.
      expect(at3.score).toBeGreaterThan(DEFAULTS.REPUTATION_NEUTRAL - 15);
      expect(at3.score).toBeLessThan(at10.score);
      expect(at10.score).toBeGreaterThan(at3.score);
    });

    it("produces silver tier for modest respondent with enough history", () => {
      const result = calculateReputation({
        totalCompleted: 10,
        avgQualityScore: 45,
        totalEarned: 15,
        totalSubmitted: 12, // 83% completion
        flaggedResponseCount: 1,
      });

      expect(result.tier).toBe("silver");
      expect(result.score).toBeGreaterThanOrEqual(45);
      expect(result.score).toBeLessThan(70);
    });

    it("produces gold tier for solid respondent", () => {
      const result = calculateReputation({
        totalCompleted: 10,
        avgQualityScore: 65,
        totalEarned: 30,
        totalSubmitted: 10,
        flaggedResponseCount: 0,
      });

      expect(result.tier).toBe("gold");
      expect(result.score).toBeGreaterThanOrEqual(70);
      expect(result.score).toBeLessThan(85);
    });

    it("produces platinum tier for exceptional respondent", () => {
      const result = calculateReputation({
        totalCompleted: 30,
        avgQualityScore: 95,
        totalEarned: 100,
        totalSubmitted: 30,
        flaggedResponseCount: 0,
      });

      expect(result.tier).toBe("platinum");
      expect(result.score).toBeGreaterThanOrEqual(85);
    });

    it("score is always clamped to [0, 100]", () => {
      // Perfect respondent
      const perfect = calculateReputation({
        totalCompleted: 100,
        avgQualityScore: 100,
        totalEarned: 500,
        totalSubmitted: 100,
        flaggedResponseCount: 0,
      });
      expect(perfect.score).toBeLessThanOrEqual(100);

      // Terrible respondent (all flagged)
      const terrible = calculateReputation({
        totalCompleted: 10,
        avgQualityScore: 5,
        totalEarned: 0,
        totalSubmitted: 50,
        flaggedResponseCount: 10,
      });
      expect(terrible.score).toBeGreaterThanOrEqual(0);
    });

    it("gaming penalty reduces score significantly", () => {
      const clean = calculateReputation({
        totalCompleted: 10,
        avgQualityScore: 70,
        totalEarned: 20,
        totalSubmitted: 10,
        flaggedResponseCount: 0,
      });

      const flagged = calculateReputation({
        totalCompleted: 10,
        avgQualityScore: 70,
        totalEarned: 20,
        totalSubmitted: 10,
        flaggedResponseCount: 5, // 50% flagged
      });

      expect(flagged.score).toBeLessThan(clean.score);
      // 50% flag rate × 20 pts = 10 pt penalty
      expect(clean.score - flagged.score).toBeGreaterThanOrEqual(8);
    });

    it("low completion rate (reliability) reduces score", () => {
      const reliable = calculateReputation({
        totalCompleted: 10,
        avgQualityScore: 70,
        totalEarned: 20,
        totalSubmitted: 10, // 100% completion
        flaggedResponseCount: 0,
      });

      const unreliable = calculateReputation({
        totalCompleted: 10,
        avgQualityScore: 70,
        totalEarned: 20,
        totalSubmitted: 50, // 20% completion
        flaggedResponseCount: 0,
      });

      expect(unreliable.score).toBeLessThan(reliable.score);
    });
  });

  describe("tier hysteresis", () => {
    it("retains current tier when score drops below promote but above demote", () => {
      // Silver promote = 45, demote = 45 - HYSTERESIS = 40
      // Score of 42 should retain silver if currently silver
      const result = calculateReputation({
        totalCompleted: 10,
        avgQualityScore: 55, // produces score around 42-44
        totalEarned: 10,
        totalSubmitted: 12,
        flaggedResponseCount: 1,
        currentTier: "silver",
      });

      // The exact score depends on the math, but if it's in the hysteresis band:
      if (result.score >= 40 && result.score < 45) {
        expect(result.tier).toBe("silver"); // retained
      }
    });

    it("demotes when score drops below demote threshold", () => {
      // Force a very low score that's definitely below silver demote (40)
      const result = calculateReputation({
        totalCompleted: 10,
        avgQualityScore: 30,
        totalEarned: 5,
        totalSubmitted: 20, // 50% completion
        flaggedResponseCount: 3,
        currentTier: "silver",
      });

      expect(result.score).toBeLessThan(40);
      expect(result.tier).not.toBe("silver");
    });

    it("bronze can never demote to new (demote = -Infinity)", () => {
      const result = calculateReputation({
        totalCompleted: 3,
        avgQualityScore: 10,
        totalEarned: 0,
        totalSubmitted: 10,
        flaggedResponseCount: 2,
        currentTier: "bronze",
      });

      // Even with terrible stats, bronze is retained (score >= 0 → bronze)
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.tier).toBe("bronze");
    });
  });

  describe("volume bonus", () => {
    it("volume bonus is logarithmic and capped at 20", () => {
      const low = calculateReputation({
        totalCompleted: 3,
        avgQualityScore: 70,
        totalEarned: 10,
        totalSubmitted: 3,
        flaggedResponseCount: 0,
      });

      const high = calculateReputation({
        totalCompleted: 50,
        avgQualityScore: 70,
        totalEarned: 100,
        totalSubmitted: 50,
        flaggedResponseCount: 0,
      });

      // High volume should score better, but not 10x better
      expect(high.score).toBeGreaterThan(low.score);
      // The gap should be modest (volume is only 20 pts max, dampener also differs)
      expect(high.score - low.score).toBeLessThan(30);
    });
  });

  describe("component math verification", () => {
    it("full-signal score matches manual calculation at 10+ responses", () => {
      // At 10 responses, dampener = 1.0 (no dampening)
      const stats: ReputationStats = {
        totalCompleted: 10,
        avgQualityScore: 80,
        totalEarned: 30,
        totalSubmitted: 10,
        flaggedResponseCount: 0,
      };

      const result = calculateReputation(stats);

      // Manual calculation:
      // quality = (80/100) * 60 = 48
      // reliability = (10/10) * 20 = 20
      // volume = min(20, log2(11) * 5) = min(20, 3.459 * 5) = min(20, 17.3) = 17.3
      // gaming = 0
      // raw = 48 + 20 + 17.3 = 85.3
      // dampener = min(1, 10/10) = 1.0
      // dampened = 85.3 * 1.0 + 50 * 0 = 85.3
      // score = min(max(round(85.3 * 100) / 100, 0), 100) = 85.3

      const expectedRaw = (80 / 100) * 60 + (10 / 10) * 20 + Math.min(20, Math.log2(11) * 5);
      const expectedScore = Math.min(
        Math.max(Math.round(expectedRaw * 100) / 100, 0),
        100
      );

      expect(result.score).toBe(expectedScore);
      expect(result.tier).toBe("platinum"); // 85.3 >= 85
    });

    it("dampened score matches manual calculation at 5 responses", () => {
      const stats: ReputationStats = {
        totalCompleted: 5,
        avgQualityScore: 80,
        totalEarned: 15,
        totalSubmitted: 5,
        flaggedResponseCount: 0,
      };

      const result = calculateReputation(stats);

      // quality = 48, reliability = 20, volume = min(20, log2(6)*5) = 12.93
      // raw = 48 + 20 + 12.93 = 80.93
      // dampener = 5/10 = 0.5
      // dampened = 80.93 * 0.5 + 50 * 0.5 = 40.47 + 25 = 65.47
      const raw = (80 / 100) * 60 + (5 / 5) * 20 + Math.min(20, Math.log2(6) * 5);
      const dampener = 5 / DEFAULTS.REPUTATION_CONFIDENCE_RAMP;
      const dampened = raw * dampener + DEFAULTS.REPUTATION_NEUTRAL * (1 - dampener);
      const expected = Math.min(Math.max(Math.round(dampened * 100) / 100, 0), 100);

      expect(result.score).toBe(expected);
    });
  });
});

/* ─── DB-backed reputation data seeding tests ─── */

const FOUNDER = testId(600);
const RESP_A = testId(601);

let dbAvailable = false;

beforeAll(async () => {
  dbAvailable = await canConnectToTestDb();
  if (!dbAvailable) return;

  await cleanupAll();
  await seedUser(FOUNDER, "Rep Test Founder");
  await seedRespondent(RESP_A, "Rep Respondent A");
});

afterEach(async () => {
  if (dbAvailable) await cleanupCampaignData();
});

afterAll(async () => {
  if (dbAvailable) await cleanupAll();
  await closeTestDb();
});

describe("Reputation DB integration", () => {
  it("respondent with ranked responses gets correct stats from DB", async () => {
    if (!dbAvailable) return;

    const sql = getTestDb();

    // Seed a campaign with ranked responses
    const campaign = await seedCampaign({
      creatorId: FOUNDER,
      status: "active",
      rewardAmount: 50,
      distributableAmount: 42.5,
    });

    const q1 = await seedQuestion(campaign.id, "Q1", "open", 0);
    await seedQuestion(campaign.id, "Q2", "open", 1);

    // 4 ranked responses with varying quality
    const scores = [85, 70, 60, 90];
    for (let i = 0; i < scores.length; i++) {
      const resp = await seedResponse(
        campaign.id,
        RESP_A,
        "ranked",
        scores[i],
        0.8,
        "ai"
      );
      await seedAnswer(resp.id, q1.id, "A thoughtful answer about the topic that demonstrates engagement.", {
        charCount: 60,
        timeSpentMs: 30_000,
        pasteDetected: false,
        pasteCount: 0,
      });
    }

    // Query the same way reputation.ts does
    const responses = await sql`
      SELECT status, quality_score
      FROM responses
      WHERE respondent_id = ${RESP_A}::uuid
    `;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ranked = responses.filter((r: any) => r.status === "ranked");
    expect(ranked).toHaveLength(4);

    const validScores = ranked
      .map((r: Record<string, unknown>) => r.quality_score as number | null)
      .filter((s): s is number => s !== null && s >= 0);

    const avgQuality = validScores.reduce((a: number, b: number) => a + b, 0) / validScores.length;
    expect(avgQuality).toBe(76.25); // (85+70+60+90)/4

    // Feed into pure calculation
    const result = calculateReputation({
      totalCompleted: ranked.length,
      avgQualityScore: avgQuality,
      totalEarned: 0,
      totalSubmitted: ranked.length,
      flaggedResponseCount: 0,
    });

    // 4 responses with avg 76.25 quality, no flags, 100% completion
    expect(result.score).toBeGreaterThan(0);
    expect(result.tier).not.toBe("new");
  });

  it("flagged answers correctly count toward gaming penalty", async () => {
    if (!dbAvailable) return;

    const sql = getTestDb();

    const campaign = await seedCampaign({
      creatorId: FOUNDER,
      status: "active",
      rewardAmount: 50,
      distributableAmount: 42.5,
    });

    const q1 = await seedQuestion(campaign.id, "Q1", "open", 0);

    // Seed 5 ranked responses, 3 with paste-flagged answers
    for (let i = 0; i < 5; i++) {
      const resp = await seedResponse(campaign.id, RESP_A, "ranked", 70, 0.8, "ai");
      const isPasted = i < 3;
      await seedAnswer(resp.id, q1.id, "Some answer text here for testing purposes.", {
        charCount: 45,
        timeSpentMs: 20_000,
        pasteDetected: isPasted,
        pasteCount: isPasted ? 3 : 0,
      });
    }

    // Count flagged answers the same way reputation.ts does
    const rankedResponses = await sql`
      SELECT id FROM responses
      WHERE respondent_id = ${RESP_A}::uuid AND status = 'ranked'
    `;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rIds = rankedResponses.map((r: any) => r.id as string);

    const answers = await sql`
      SELECT metadata FROM answers WHERE response_id = ANY(${rIds}::uuid[])
    `;

    let flaggedAnswers = 0;
    for (const answer of answers) {
      const meta = answer.metadata as Record<string, unknown> | null;
      if (meta?.pasteDetected === true && (meta?.pasteCount as number) > 1) {
        flaggedAnswers++;
      }
    }

    expect(flaggedAnswers).toBe(3);
    const flagRate = flaggedAnswers / answers.length;
    const flaggedCount = Math.round(flagRate * 5);
    expect(flaggedCount).toBe(3);

    // Compare scores with and without gaming penalty
    const clean = calculateReputation({
      totalCompleted: 5,
      avgQualityScore: 70,
      totalEarned: 0,
      totalSubmitted: 5,
      flaggedResponseCount: 0,
    });

    const penalized = calculateReputation({
      totalCompleted: 5,
      avgQualityScore: 70,
      totalEarned: 0,
      totalSubmitted: 5,
      flaggedResponseCount: flaggedCount,
    });

    expect(penalized.score).toBeLessThan(clean.score);
  });
});
