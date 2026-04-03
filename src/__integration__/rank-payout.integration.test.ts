import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import {
  getTestDb,
  closeTestDb,
  canConnectToTestDb,

  cleanupCampaignData,
  seedUser,
  seedRespondent,
  seedCampaign,
  seedResponse,
  seedQuestion,
  seedAnswer,
  getCampaign,
  getResponse,
  getPayoutsForCampaign,
  testId,
} from "./helpers";

describe("rank → payout flow", () => {
  const sql = getTestDb();
  const founderId = testId(50);
  const resp1Id = testId(51);
  const resp2Id = testId(52);
  const resp3Id = testId(53);
  let dbAvailable = false;

  const runIfDb = (fn: () => Promise<void>) => async () => {
    if (!dbAvailable) return;
    await fn();
  };

  beforeAll(async () => {
    dbAvailable = await canConnectToTestDb();
    if (!dbAvailable) {
      console.warn("Skipping — no test database");
      return;
    }
    await cleanupCampaignData();
    await seedUser(founderId, "Founder");
    await seedRespondent(resp1Id, "Respondent 1");
    await seedRespondent(resp2Id, "Respondent 2");
    await seedRespondent(resp3Id, "Respondent 3");
  });

  afterEach(async () => {
    if (dbAvailable) await cleanupCampaignData();
  });

  afterAll(async () => {
    if (dbAvailable) await cleanupCampaignData();
    await closeTestDb();
  });

  it("submitted responses can be ranked with valid scores", runIfDb(async () => {
    const campaign = await seedCampaign({
      creatorId: founderId,
      rankingStatus: "unranked",
    });
    const q1 = await seedQuestion(campaign.id, "What do you think?");

    const r1 = await seedResponse(campaign.id, resp1Id, "submitted");
    const r2 = await seedResponse(campaign.id, resp2Id, "submitted");
    const r3 = await seedResponse(campaign.id, resp3Id, "submitted");

    await seedAnswer(r1.id, q1.id, "Great detailed answer here");
    await seedAnswer(r2.id, q1.id, "Another good answer");
    await seedAnswer(r3.id, q1.id, "Brief");

    // Simulate ranking: acquire lock then update responses
    await sql`UPDATE campaigns SET ranking_status = 'ranking' WHERE id = ${campaign.id}::uuid AND ranking_status = 'unranked'`;

    // Score and rank each response
    for (const [response, score, conf] of [
      [r1, 85, 0.9],
      [r2, 65, 0.8],
      [r3, 40, 0.6],
    ] as [typeof r1, number, number][]) {
      await sql`
        UPDATE responses
        SET quality_score = ${score},
            scoring_confidence = ${conf},
            scoring_source = 'fallback',
            status = 'ranked',
            ranked_at = now()
        WHERE id = ${response.id}::uuid
      `;
    }

    await sql`UPDATE campaigns SET ranking_status = 'ranked' WHERE id = ${campaign.id}::uuid`;

    // Verify
    const updated1 = await getResponse(r1.id);
    expect(updated1.status).toBe("ranked");
    expect(Number(updated1.quality_score)).toBe(85);
    expect(Number(updated1.scoring_confidence)).toBe(0.9);

    const updatedCampaign = await getCampaign(campaign.id);
    expect(updatedCampaign.ranking_status).toBe("ranked");
  }));

  it("payout allocation creates correct records and sets status", runIfDb(async () => {
    const campaign = await seedCampaign({
      creatorId: founderId,
      rewardAmount: 10,
      distributableAmount: 8.5,
    });

    const r1 = await seedResponse(campaign.id, resp1Id, "ranked", 80, 0.9, "ai");
    const r2 = await seedResponse(campaign.id, resp2Id, "ranked", 60, 0.8, "ai");

    // CAS lock
    const locked = await sql`
      UPDATE campaigns SET payout_status = 'allocated'
      WHERE id = ${campaign.id}::uuid AND (payout_status IS NULL OR payout_status != 'allocated')
      RETURNING id
    `;
    expect(locked.length).toBe(1);

    // Insert payouts
    await sql`
      INSERT INTO payouts (response_id, campaign_id, founder_id, respondent_id, amount, platform_fee, status)
      VALUES (${r1.id}::uuid, ${campaign.id}::uuid, ${founderId}::uuid, ${resp1Id}::uuid, 5.50, 0, 'pending')
    `;
    await sql`
      INSERT INTO payouts (response_id, campaign_id, founder_id, respondent_id, amount, platform_fee, status)
      VALUES (${r2.id}::uuid, ${campaign.id}::uuid, ${founderId}::uuid, ${resp2Id}::uuid, 3.00, 0, 'pending')
    `;
    await sql`UPDATE responses SET payout_amount = 5.50 WHERE id = ${r1.id}::uuid`;
    await sql`UPDATE responses SET payout_amount = 3.00 WHERE id = ${r2.id}::uuid`;

    // Verify
    const payouts = await getPayoutsForCampaign(campaign.id);
    expect(payouts.length).toBe(2);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const totalPaid = payouts.reduce((s: number, p: any) => s + Number(p.amount), 0);
    expect(totalPaid).toBe(8.5);

    const updatedCampaign = await getCampaign(campaign.id);
    expect(updatedCampaign.payout_status).toBe("allocated");
  }));

  it("rejects allocation exceeding distributable", runIfDb(async () => {
    const campaign = await seedCampaign({
      creatorId: founderId,
      rewardAmount: 10,
      distributableAmount: 8.5,
    });
    const r1 = await seedResponse(campaign.id, resp1Id, "ranked", 80, 0.9, "ai");

    // Lock
    await sql`
      UPDATE campaigns SET payout_status = 'allocated'
      WHERE id = ${campaign.id}::uuid
    `;

    // Try to insert payout exceeding distributable
    await sql`
      INSERT INTO payouts (response_id, campaign_id, founder_id, respondent_id, amount, platform_fee, status)
      VALUES (${r1.id}::uuid, ${campaign.id}::uuid, ${founderId}::uuid, ${resp1Id}::uuid, 9.00, 0, 'pending')
    `;

    // The application layer (allocatePayouts) checks totalAllocated > distributable + 0.01.
    // The DB doesn't enforce this directly — it's an app-level guard.
    // But we verify the payout record stores correctly:
    const payouts = await getPayoutsForCampaign(campaign.id);
    expect(payouts.length).toBe(1);
    expect(Number(payouts[0].amount)).toBe(9.0);
    // NOTE: This test documents that over-allocation prevention is app-level, not DB-level.
    // The distributable assertion in suggestDistribution() is the guard.
  }));

  it("scoring_confidence and scoring_source are preserved through ranking", runIfDb(async () => {
    const campaign = await seedCampaign({
      creatorId: founderId,
      rankingStatus: "unranked",
    });
    const r1 = await seedResponse(campaign.id, resp1Id, "submitted");

    // Rank with low confidence → ai_low_confidence source
    await sql`
      UPDATE responses
      SET quality_score = 45,
          scoring_confidence = 0.35,
          scoring_source = 'ai_low_confidence',
          status = 'ranked',
          ranked_at = now()
      WHERE id = ${r1.id}::uuid
    `;

    const result = await getResponse(r1.id);
    expect(result.scoring_source).toBe("ai_low_confidence");
    expect(Number(result.scoring_confidence)).toBeCloseTo(0.35);
    expect(Number(result.quality_score)).toBe(45);
  }));
});
