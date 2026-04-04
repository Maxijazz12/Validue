import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { settleLockedCampaignPayouts } from "@/lib/campaign-settlement";
import {
  getTestDb,
  closeTestDb,
  canConnectToTestDb,
  cleanupCampaignData,
  seedUser,
  seedRespondent,
  seedCampaign,
  seedResponse,
  getResponse,
  getPayoutsForCampaign,
  testId,
} from "./helpers";

describe("campaign payout settlement", () => {
  const sql = getTestDb();
  const founderId = testId(300);
  const resp1Id = testId(301);
  const resp2Id = testId(302);
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
  });

  afterEach(async () => {
    if (dbAvailable) await cleanupCampaignData();
  });

  afterAll(async () => {
    if (dbAvailable) await cleanupCampaignData();
    await closeTestDb();
  });

  it("releases locked payouts into available balances", runIfDb(async () => {
    const campaign = await seedCampaign({
      creatorId: founderId,
      payoutStatus: "allocated",
    });

    const r1 = await seedResponse(campaign.id, resp1Id, "ranked", 80, 0.9, "ai");
    const r2 = await seedResponse(campaign.id, resp2Id, "ranked", 72, 0.8, "ai");

    await sql`
      UPDATE responses
      SET payout_amount = 5.25,
          money_state = 'locked'
      WHERE id = ${r1.id}::uuid
    `;
    await sql`
      UPDATE responses
      SET payout_amount = 3.25,
          money_state = 'locked'
      WHERE id = ${r2.id}::uuid
    `;

    await sql`
      UPDATE profiles
      SET pending_balance_cents = 525
      WHERE id = ${resp1Id}::uuid
    `;
    await sql`
      UPDATE profiles
      SET pending_balance_cents = 325
      WHERE id = ${resp2Id}::uuid
    `;

    await sql`
      INSERT INTO payouts (response_id, campaign_id, founder_id, respondent_id, amount, platform_fee, status)
      VALUES (${r1.id}::uuid, ${campaign.id}::uuid, ${founderId}::uuid, ${resp1Id}::uuid, 5.25, 0, 'pending')
    `;
    await sql`
      INSERT INTO payouts (response_id, campaign_id, founder_id, respondent_id, amount, platform_fee, status)
      VALUES (${r2.id}::uuid, ${campaign.id}::uuid, ${founderId}::uuid, ${resp2Id}::uuid, 3.25, 0, 'pending')
    `;

    const result = await settleLockedCampaignPayouts(sql, campaign.id);
    expect(result.lockedCount).toBe(2);
    expect(result.respondentCount).toBe(2);

    const updatedR1 = await getResponse(r1.id);
    const updatedR2 = await getResponse(r2.id);
    expect(updatedR1.money_state).toBe("available");
    expect(updatedR2.money_state).toBe("available");

    const payouts = await getPayoutsForCampaign(campaign.id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(payouts.every((p: any) => p.status === "processing")).toBe(true);

    const [profile1] = await sql`
      SELECT pending_balance_cents, available_balance_cents
      FROM profiles
      WHERE id = ${resp1Id}::uuid
    `;
    const [profile2] = await sql`
      SELECT pending_balance_cents, available_balance_cents
      FROM profiles
      WHERE id = ${resp2Id}::uuid
    `;

    expect(profile1.pending_balance_cents).toBe(0);
    expect(profile1.available_balance_cents).toBe(525);
    expect(profile2.pending_balance_cents).toBe(0);
    expect(profile2.available_balance_cents).toBe(325);
  }));
});
