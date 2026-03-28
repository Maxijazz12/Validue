import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import {
  getTestDb,
  closeTestDb,
  canConnectToTestDb,

  cleanupCampaignData,
  seedUser,
  seedCampaign,
  seedRespondent,
  seedResponse,
  testId,
} from "./helpers";

describe("DB constraints & state machine", () => {
  const sql = getTestDb();
  const founderId = testId(1);
  const respondentId = testId(2);

  beforeAll(async () => {
    const connected = await canConnectToTestDb();
    if (!connected) {
      console.warn("Skipping integration tests — no test database available");
      return;
    }
    await cleanupCampaignData();
    await seedUser(founderId, "Founder");
    await seedRespondent(respondentId, "Respondent");
  });

  afterEach(async () => {
    await cleanupCampaignData();
  });

  afterAll(async () => {
    await cleanupCampaignData();
    await closeTestDb();
  });

  /* ─── Campaign State Machine ─── */

  it("blocks completed → active transition", async () => {
    const campaign = await seedCampaign({
      creatorId: founderId,
      status: "active",
    });
    // First complete it
    await sql`UPDATE campaigns SET status = 'completed' WHERE id = ${campaign.id}`;

    // Then try to reactivate
    await expect(
      sql`UPDATE campaigns SET status = 'active' WHERE id = ${campaign.id}`
    ).rejects.toThrow(/Cannot transition from completed/);
  });

  it("blocks active → draft transition", async () => {
    const campaign = await seedCampaign({
      creatorId: founderId,
      status: "active",
    });

    await expect(
      sql`UPDATE campaigns SET status = 'draft' WHERE id = ${campaign.id}`
    ).rejects.toThrow(/active can only transition to/);
  });

  it("allows active → paused → active → completed", async () => {
    const campaign = await seedCampaign({
      creatorId: founderId,
      status: "active",
    });

    await sql`UPDATE campaigns SET status = 'paused' WHERE id = ${campaign.id}`;
    const [paused] = await sql`SELECT status FROM campaigns WHERE id = ${campaign.id}`;
    expect(paused.status).toBe("paused");

    await sql`UPDATE campaigns SET status = 'active' WHERE id = ${campaign.id}`;
    const [active] = await sql`SELECT status FROM campaigns WHERE id = ${campaign.id}`;
    expect(active.status).toBe("active");

    await sql`UPDATE campaigns SET status = 'completed' WHERE id = ${campaign.id}`;
    const [completed] = await sql`SELECT status FROM campaigns WHERE id = ${campaign.id}`;
    expect(completed.status).toBe("completed");
  });

  it("allows pending_funding → active only", async () => {
    const campaign = await seedCampaign({
      creatorId: founderId,
      status: "pending_funding",
    });

    // Should reject pending_funding → paused
    await expect(
      sql`UPDATE campaigns SET status = 'paused' WHERE id = ${campaign.id}`
    ).rejects.toThrow(/pending_funding can only transition to active/);

    // Should allow pending_funding → active
    await sql`UPDATE campaigns SET status = 'active' WHERE id = ${campaign.id}`;
    const [result] = await sql`SELECT status FROM campaigns WHERE id = ${campaign.id}`;
    expect(result.status).toBe("active");
  });

  /* ─── Response State Machine ─── */

  it("blocks ranked → submitted transition", async () => {
    const campaign = await seedCampaign({ creatorId: founderId });
    const response = await seedResponse(
      campaign.id,
      respondentId,
      "ranked",
      75,
      0.8,
      "ai"
    );

    await expect(
      sql`UPDATE responses SET status = 'submitted' WHERE id = ${response.id}`
    ).rejects.toThrow(/Cannot revert from ranked/);
  });

  it("blocks in_progress → ranked (must go through submitted)", async () => {
    const campaign = await seedCampaign({ creatorId: founderId });
    const response = await seedResponse(campaign.id, respondentId, "in_progress");

    await expect(
      sql`UPDATE responses SET status = 'ranked' WHERE id = ${response.id}`
    ).rejects.toThrow(/in_progress can only transition to submitted/);
  });

  /* ─── CHECK Constraints ─── */

  it("rejects quality_score > 100", async () => {
    const campaign = await seedCampaign({ creatorId: founderId });
    const response = await seedResponse(campaign.id, respondentId, "submitted");

    await expect(
      sql`UPDATE responses SET quality_score = 150, status = 'ranked' WHERE id = ${response.id}`
    ).rejects.toThrow(/chk_quality_score_range/);
  });

  it("rejects quality_score < 0", async () => {
    const campaign = await seedCampaign({ creatorId: founderId });
    const response = await seedResponse(campaign.id, respondentId, "submitted");

    await expect(
      sql`UPDATE responses SET quality_score = -5, status = 'ranked' WHERE id = ${response.id}`
    ).rejects.toThrow(/chk_quality_score_range/);
  });

  it("rejects distributable_amount > reward_amount", async () => {
    await expect(
      seedCampaign({
        creatorId: founderId,
        rewardAmount: 50,
        distributableAmount: 100,
      })
    ).rejects.toThrow(/chk_distributable_lte_reward/);
  });

  it("rejects negative reward_amount", async () => {
    await expect(
      seedCampaign({
        creatorId: founderId,
        rewardAmount: -10,
        distributableAmount: -10,
      })
    ).rejects.toThrow(/violates check constraint/);
  });

  it("rejects payout platform_fee != 0", async () => {
    const campaign = await seedCampaign({ creatorId: founderId });
    const response = await seedResponse(
      campaign.id,
      respondentId,
      "ranked",
      75,
      0.8,
      "ai"
    );

    await expect(
      sql`INSERT INTO payouts (response_id, campaign_id, founder_id, respondent_id, amount, platform_fee, status)
          VALUES (${response.id}::uuid, ${campaign.id}::uuid, ${founderId}::uuid, ${respondentId}::uuid, 5.00, 0.75, 'pending')`
    ).rejects.toThrow(/chk_payout_fee_zero/);
  });

  it("rejects campaign_strength outside [1, 10]", async () => {
    await expect(
      seedCampaign({
        creatorId: founderId,
        campaignStrength: 15,
      })
    ).rejects.toThrow(/chk_campaign_strength_range/);
  });
});
