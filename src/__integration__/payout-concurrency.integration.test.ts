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
  getCampaign,
  getPayoutsForCampaign,
  testId,
} from "./helpers";

describe("payout allocation atomicity", () => {
  const sql = getTestDb();
  const founderId = testId(20);
  const resp1Id = testId(21);
  const resp2Id = testId(22);

  beforeAll(async () => {
    const connected = await canConnectToTestDb();
    if (!connected) {
      console.warn("Skipping — no test database");
      return;
    }
    await cleanupCampaignData();
    await seedUser(founderId, "Founder");
    await seedRespondent(resp1Id, "Respondent 1");
    await seedRespondent(resp2Id, "Respondent 2");
  });

  afterEach(async () => {
    await cleanupCampaignData();
  });

  afterAll(async () => {
    await cleanupCampaignData();
    await closeTestDb();
  });

  /**
   * Simulates the allocatePayouts CAS lock pattern.
   * Returns true if lock acquired, false otherwise.
   */
  async function tryAllocate(
    campaignId: string,
    allocations: { responseId: string; respondentId: string; amount: number }[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Atomic CAS — only succeeds if NOT already allocated
      const locked = await sql`
        UPDATE campaigns
        SET payout_status = 'allocated'
        WHERE id = ${campaignId}::uuid
          AND creator_id = ${founderId}::uuid
          AND (payout_status IS NULL OR payout_status != 'allocated')
        RETURNING id
      `;

      if (locked.length === 0) {
        return { success: false, error: "Already allocated" };
      }

      // Insert payouts
      for (const alloc of allocations) {
        await sql`
          INSERT INTO payouts (response_id, campaign_id, founder_id, respondent_id, amount, platform_fee, status)
          VALUES (${alloc.responseId}::uuid, ${campaignId}::uuid, ${founderId}::uuid,
                  ${alloc.respondentId}::uuid, ${alloc.amount}, 0, 'pending')
        `;
        await sql`
          UPDATE responses SET payout_amount = ${alloc.amount}
          WHERE id = ${alloc.responseId}::uuid
        `;
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  it("concurrent allocatePayouts — only one succeeds", async () => {
    const campaign = await seedCampaign({
      creatorId: founderId,
      rewardAmount: 10,
      distributableAmount: 8.5,
    });
    const r1 = await seedResponse(campaign.id, resp1Id, "ranked", 80, 0.9, "ai");
    const r2 = await seedResponse(campaign.id, resp2Id, "ranked", 60, 0.8, "ai");

    const allocations = [
      { responseId: r1.id, respondentId: resp1Id, amount: 5.0 },
      { responseId: r2.id, respondentId: resp2Id, amount: 3.5 },
    ];

    // Launch two allocation attempts concurrently
    const results = await Promise.allSettled([
      tryAllocate(campaign.id, allocations),
      tryAllocate(campaign.id, allocations),
    ]);

    const outcomes = results.map((r) =>
      r.status === "fulfilled" ? r.value : { success: false, error: "rejected" }
    );

    const successes = outcomes.filter((o) => o.success);
    const failures = outcomes.filter((o) => !o.success);

    expect(successes.length).toBe(1);
    expect(failures.length).toBe(1);
  });

  it("after allocation, payout records match exactly", async () => {
    const campaign = await seedCampaign({
      creatorId: founderId,
      rewardAmount: 10,
      distributableAmount: 8.5,
    });
    const r1 = await seedResponse(campaign.id, resp1Id, "ranked", 80, 0.9, "ai");
    const r2 = await seedResponse(campaign.id, resp2Id, "ranked", 60, 0.8, "ai");

    await tryAllocate(campaign.id, [
      { responseId: r1.id, respondentId: resp1Id, amount: 5.0 },
      { responseId: r2.id, respondentId: resp2Id, amount: 3.5 },
    ]);

    const payouts = await getPayoutsForCampaign(campaign.id);
    expect(payouts.length).toBe(2);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(payouts.every((p: any) => Number(p.platform_fee) === 0)).toBe(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const totalPaid = payouts.reduce((s: number, p: any) => s + Number(p.amount), 0);
    expect(totalPaid).toBe(8.5);

    const updatedCampaign = await getCampaign(campaign.id);
    expect(updatedCampaign.payout_status).toBe("allocated");
  });

  it("unique index prevents duplicate payout per response", async () => {
    const campaign = await seedCampaign({
      creatorId: founderId,
      rewardAmount: 10,
      distributableAmount: 8.5,
    });
    const r1 = await seedResponse(campaign.id, resp1Id, "ranked", 80, 0.9, "ai");

    // First payout
    await sql`
      INSERT INTO payouts (response_id, campaign_id, founder_id, respondent_id, amount, platform_fee, status)
      VALUES (${r1.id}::uuid, ${campaign.id}::uuid, ${founderId}::uuid, ${resp1Id}::uuid, 5.00, 0, 'pending')
    `;

    // Duplicate should fail (unique index on response_id WHERE status != 'failed')
    await expect(
      sql`INSERT INTO payouts (response_id, campaign_id, founder_id, respondent_id, amount, platform_fee, status)
          VALUES (${r1.id}::uuid, ${campaign.id}::uuid, ${founderId}::uuid, ${resp1Id}::uuid, 5.00, 0, 'pending')`
    ).rejects.toThrow(/idx_payouts_response_unique|duplicate key/);
  });
});
