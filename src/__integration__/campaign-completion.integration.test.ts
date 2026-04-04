import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { completeCampaignWithinTransaction } from "@/lib/campaign-completion";
import type { SqlRunner } from "@/lib/postgres-types";
import {
  getTestDb,
  closeTestDb,
  canConnectToTestDb,
  cleanupCampaignData,
  seedUser,
  seedRespondent,
  seedCampaign,
  seedResponse,
  getCampaign,
  getResponse,
  testId,
} from "./helpers";

describe("campaign completion helper", () => {
  const sql = getTestDb();
  const founderId = testId(340);
  const respondentId = testId(341);
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
    await seedUser(founderId, "Completion Founder");
    await seedRespondent(respondentId, "Completion Respondent");
  });

  afterEach(async () => {
    if (dbAvailable) await cleanupCampaignData();
  });

  afterAll(async () => {
    if (dbAvailable) await cleanupCampaignData();
    await closeTestDb();
  });

  it("skips automatic completion before the response target is reached", runIfDb(async () => {
    const campaign = await seedCampaign({
      creatorId: founderId,
      status: "active",
      payoutStatus: "allocated",
    });

    await sql`
      UPDATE campaigns
      SET target_responses = 3,
          current_responses = 2
      WHERE id = ${campaign.id}::uuid
    `;

    const result = await sql.begin((tx) =>
      completeCampaignWithinTransaction(tx as unknown as SqlRunner, {
        campaignId: campaign.id,
        requireTargetReached: true,
      })
    );

    expect(result).toEqual({
      kind: "skipped",
      reason: "target_not_reached",
    });

    const updatedCampaign = await getCampaign(campaign.id);
    expect(updatedCampaign.status).toBe("active");
    expect(updatedCampaign.payout_status).toBe("allocated");
  }));

  it("completes the campaign and settles locked payouts once the target is reached", runIfDb(async () => {
    const campaign = await seedCampaign({
      creatorId: founderId,
      status: "active",
      payoutStatus: "allocated",
    });

    await sql`
      UPDATE campaigns
      SET target_responses = 1,
          current_responses = 1
      WHERE id = ${campaign.id}::uuid
    `;

    const response = await seedResponse(campaign.id, respondentId, "ranked", 88, 0.95, "ai");

    await sql`
      UPDATE responses
      SET payout_amount = 6.5,
          money_state = 'locked'
      WHERE id = ${response.id}::uuid
    `;

    await sql`
      UPDATE profiles
      SET pending_balance_cents = 650
      WHERE id = ${respondentId}::uuid
    `;

    await sql`
      INSERT INTO payouts (response_id, campaign_id, founder_id, respondent_id, amount, platform_fee, status)
      VALUES (${response.id}::uuid, ${campaign.id}::uuid, ${founderId}::uuid, ${respondentId}::uuid, 6.5, 0, 'pending')
    `;

    const result = await sql.begin((tx) =>
      completeCampaignWithinTransaction(tx as unknown as SqlRunner, {
        campaignId: campaign.id,
        requireTargetReached: true,
      })
    );

    expect(result).toEqual({
      kind: "completed",
      title: "Test Campaign",
      releasedCount: 1,
    });

    const updatedCampaign = await getCampaign(campaign.id);
    const updatedResponse = await getResponse(response.id);
    expect(updatedCampaign.status).toBe("completed");
    expect(updatedCampaign.payout_status).toBe("completed");
    expect(updatedResponse.money_state).toBe("available");

    const [profile] = await sql`
      SELECT pending_balance_cents, available_balance_cents
      FROM profiles
      WHERE id = ${respondentId}::uuid
    `;
    expect(profile.pending_balance_cents).toBe(0);
    expect(profile.available_balance_cents).toBe(650);
  }));
});
