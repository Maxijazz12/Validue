import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import {
  getTestDb,
  closeTestDb,
  canConnectToTestDb,
  cleanupAll,
  cleanupCampaignData,
  seedUser,
  seedRespondent,
  seedCampaign,
  seedQuestion,
  seedAnswer,
  testId,
} from "./helpers";
import {
  qualifyResponse,
  distributeSubsidizedPayouts,
  type ScoredResponse,
  type ResponseMetadata,
} from "@/lib/payout-math";
import { DEFAULTS } from "@/lib/defaults";

/**
 * Integration tests for subsidized campaign payouts.
 *
 * Subsidized campaigns use a flat payout model capped at SUBSIDY_TARGET_RESPONSES.
 * Validates: qualification, budget exhaustion, disqualification reasons,
 * sum invariants, and edge cases.
 */

const FOUNDER = testId(500);
const RESPONDENTS = Array.from({ length: 8 }, (_, i) => testId(501 + i));

let dbAvailable = false;

beforeAll(async () => {
  dbAvailable = await canConnectToTestDb();
  if (!dbAvailable) return;

  await cleanupAll();
  await seedUser(FOUNDER, "Subsidy Founder");
  for (let i = 0; i < RESPONDENTS.length; i++) {
    await seedRespondent(RESPONDENTS[i], `Respondent ${i}`);
  }
});

afterEach(async () => {
  if (dbAvailable) await cleanupCampaignData();
});

afterAll(async () => {
  if (dbAvailable) await cleanupAll();
  await closeTestDb();
});

/* ─── Helpers ─── */

function makeScoredResponse(
  responseId: string,
  respondentId: string,
  qualityScore: number
): ScoredResponse {
  return {
    responseId,
    respondentId,
    respondentName: `Respondent ${respondentId.slice(-2)}`,
    qualityScore,
    confidence: 0.8,
  };
}

function makeQualifiedMeta(): ResponseMetadata {
  return {
    totalTimeMs: 120_000,
    openAnswers: [{ charCount: 200 }],
    spamFlagged: false,
  };
}

function makeLowQualityMeta(): ResponseMetadata {
  return {
    totalTimeMs: 5_000, // too fast
    openAnswers: [{ charCount: 10 }], // too short
    spamFlagged: false,
  };
}

describe("Subsidized Payouts", () => {
  it("pays flat amount to all qualified when count <= SUBSIDY_TARGET_RESPONSES", async () => {
    if (!dbAvailable) return;

    const campaign = await seedCampaign({
      creatorId: FOUNDER,
      status: "active",
      rewardAmount: 10,
      distributableAmount: 8.5,
    });

    // 3 qualified responses (under the cap of 5)
    const scored: ScoredResponse[] = [];
    for (let i = 0; i < 3; i++) {
      await seedQuestion(campaign.id, `Q${i}`, "open", i);
      scored.push(makeScoredResponse(crypto.randomUUID(), RESPONDENTS[i], 75));
    }

    const qualResults = scored.map((r) =>
      qualifyResponse(r, "standard", makeQualifiedMeta())
    );

    const allocations = distributeSubsidizedPayouts(scored, qualResults);

    // All 3 should be paid
    const paid = allocations.filter((a) => a.suggestedAmount > 0);
    expect(paid).toHaveLength(3);

    // Each gets the flat payout
    for (const a of paid) {
      expect(a.suggestedAmount).toBe(DEFAULTS.SUBSIDY_FLAT_PAYOUT);
      expect(a.basePayout).toBe(DEFAULTS.SUBSIDY_FLAT_PAYOUT);
      expect(a.bonusPayout).toBe(0);
      expect(a.qualified).toBe(true);
      expect(a.disqualificationReasons).toEqual([]);
    }
  });

  it("caps paid slots at SUBSIDY_TARGET_RESPONSES", async () => {
    if (!dbAvailable) return;

    const campaign = await seedCampaign({
      creatorId: FOUNDER,
      status: "active",
      rewardAmount: 10,
      distributableAmount: 8.5,
    });

    // 7 qualified responses (over the cap of 5)
    const scored: ScoredResponse[] = [];
    for (let i = 0; i < 7; i++) {
      scored.push(makeScoredResponse(crypto.randomUUID(), RESPONDENTS[i], 70));
    }

    const qualResults = scored.map((r) =>
      qualifyResponse(r, "standard", makeQualifiedMeta())
    );

    const allocations = distributeSubsidizedPayouts(scored, qualResults);

    const paid = allocations.filter((a) => a.suggestedAmount > 0);
    const budgetExhausted = allocations.filter(
      (a) => !a.qualified && a.disqualificationReasons.includes("Subsidy budget exhausted")
    );

    // Only 5 get paid (SUBSIDY_TARGET_RESPONSES)
    expect(paid).toHaveLength(DEFAULTS.SUBSIDY_TARGET_RESPONSES);

    // Remaining 2 marked not-qualified due to budget exhaustion
    expect(budgetExhausted).toHaveLength(2);
    for (const a of budgetExhausted) {
      expect(a.disqualificationReasons).toEqual(["Subsidy budget exhausted"]);
    }

    // Total spend = 5 × flat payout
    const totalSpend = paid.reduce((s, a) => s + a.suggestedAmount, 0);
    expect(totalSpend).toBe(
      DEFAULTS.SUBSIDY_TARGET_RESPONSES * DEFAULTS.SUBSIDY_FLAT_PAYOUT
    );
  });

  it("disqualified responses show actual reasons, not budget exhaustion", async () => {
    if (!dbAvailable) return;

    const scored: ScoredResponse[] = [
      makeScoredResponse(crypto.randomUUID(), RESPONDENTS[0], 75), // good
      makeScoredResponse(crypto.randomUUID(), RESPONDENTS[1], 10), // low quality
      makeScoredResponse(crypto.randomUUID(), RESPONDENTS[2], 75), // good but spam
    ];

    const qualResults = [
      qualifyResponse(scored[0], "standard", makeQualifiedMeta()),
      qualifyResponse(scored[1], "standard", makeQualifiedMeta()), // fails quality
      qualifyResponse(scored[2], "standard", {
        ...makeQualifiedMeta(),
        spamFlagged: true,
      }),
    ];

    const allocations = distributeSubsidizedPayouts(scored, qualResults);

    // First: qualified + paid
    expect(allocations[0].qualified).toBe(true);
    expect(allocations[0].suggestedAmount).toBe(DEFAULTS.SUBSIDY_FLAT_PAYOUT);
    expect(allocations[0].disqualificationReasons).toEqual([]);

    // Second: disqualified — shows quality reason
    expect(allocations[1].qualified).toBe(false);
    expect(allocations[1].suggestedAmount).toBe(0);
    expect(allocations[1].disqualificationReasons).toContain(
      "quality_score_below_threshold"
    );

    // Third: disqualified — shows spam reason
    expect(allocations[2].qualified).toBe(false);
    expect(allocations[2].suggestedAmount).toBe(0);
    expect(allocations[2].disqualificationReasons).toContain("spam_detected");
  });

  it("handles zero qualified responses", async () => {
    if (!dbAvailable) return;

    const scored: ScoredResponse[] = [
      makeScoredResponse(crypto.randomUUID(), RESPONDENTS[0], 10), // low quality
      makeScoredResponse(crypto.randomUUID(), RESPONDENTS[1], 5),  // low quality
    ];

    const qualResults = scored.map((r) =>
      qualifyResponse(r, "standard", makeLowQualityMeta())
    );

    const allocations = distributeSubsidizedPayouts(scored, qualResults);

    // Nobody paid
    const totalSpend = allocations.reduce((s, a) => s + a.suggestedAmount, 0);
    expect(totalSpend).toBe(0);

    // All disqualified with real reasons
    for (const a of allocations) {
      expect(a.qualified).toBe(false);
      expect(a.disqualificationReasons.length).toBeGreaterThan(0);
      expect(a.disqualificationReasons).not.toContain("Subsidy budget exhausted");
    }
  });

  it("handles empty responses array", () => {
    const allocations = distributeSubsidizedPayouts([], []);
    expect(allocations).toEqual([]);
  });

  it("exactly SUBSIDY_TARGET_RESPONSES qualified — all paid, none budget-exhausted", () => {
    const scored: ScoredResponse[] = Array.from(
      { length: DEFAULTS.SUBSIDY_TARGET_RESPONSES },
      (_, i) => makeScoredResponse(crypto.randomUUID(), RESPONDENTS[i], 80)
    );

    const qualResults = scored.map((r) =>
      qualifyResponse(r, "standard", makeQualifiedMeta())
    );

    const allocations = distributeSubsidizedPayouts(scored, qualResults);

    const paid = allocations.filter((a) => a.suggestedAmount > 0);
    expect(paid).toHaveLength(DEFAULTS.SUBSIDY_TARGET_RESPONSES);

    // None should show "budget exhausted"
    for (const a of allocations) {
      expect(a.disqualificationReasons).not.toContain("Subsidy budget exhausted");
    }
  });

  it("mixed qualified and disqualified — ordering preserved", () => {
    // Alternate: qualified, disqualified, qualified, disqualified, ...
    const scored: ScoredResponse[] = Array.from({ length: 6 }, (_, i) =>
      makeScoredResponse(crypto.randomUUID(), RESPONDENTS[i], i % 2 === 0 ? 80 : 10)
    );

    const qualResults = scored.map((r, i) =>
      qualifyResponse(
        r,
        "standard",
        i % 2 === 0 ? makeQualifiedMeta() : makeLowQualityMeta()
      )
    );

    const allocations = distributeSubsidizedPayouts(scored, qualResults);

    // 3 qualified (indices 0, 2, 4) — all within cap
    expect(allocations[0].qualified).toBe(true);
    expect(allocations[0].suggestedAmount).toBe(DEFAULTS.SUBSIDY_FLAT_PAYOUT);

    expect(allocations[1].qualified).toBe(false);
    expect(allocations[1].suggestedAmount).toBe(0);

    expect(allocations[2].qualified).toBe(true);
    expect(allocations[2].suggestedAmount).toBe(DEFAULTS.SUBSIDY_FLAT_PAYOUT);

    expect(allocations[3].qualified).toBe(false);
    expect(allocations[3].suggestedAmount).toBe(0);

    // Allocations array length matches input
    expect(allocations).toHaveLength(6);
  });
});
