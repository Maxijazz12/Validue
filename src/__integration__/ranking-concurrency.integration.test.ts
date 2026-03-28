import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import {
  getTestDb,
  closeTestDb,
  canConnectToTestDb,

  cleanupCampaignData,
  seedUser,
  seedRespondent,
  seedCampaign,
  getCampaign,
  testId,
} from "./helpers";

describe("ranking status concurrency", () => {
  const sql = getTestDb();
  const founderId = testId(30);
  const resp1Id = testId(31);

  beforeAll(async () => {
    const connected = await canConnectToTestDb();
    if (!connected) {
      console.warn("Skipping — no test database");
      return;
    }
    await cleanupCampaignData();
    await seedUser(founderId, "Founder");
    await seedRespondent(resp1Id, "Respondent");
  });

  afterEach(async () => {
    await cleanupCampaignData();
  });

  afterAll(async () => {
    await cleanupCampaignData();
    await closeTestDb();
  });

  /**
   * Simulates the CAS lock from rankCampaignResponses.
   * Returns the locked campaign id or null.
   */
  async function tryAcquireRankingLock(
    campaignId: string
  ): Promise<string | null> {
    const locked = await sql`
      UPDATE campaigns
      SET ranking_status = 'ranking'
      WHERE id = ${campaignId}::uuid
        AND ranking_status = 'unranked'
      RETURNING id
    `;
    return locked.length > 0 ? locked[0].id : null;
  }

  it("concurrent ranking — only one acquires lock", async () => {
    const campaign = await seedCampaign({
      creatorId: founderId,
      rankingStatus: "unranked",
    });

    // Launch two lock attempts concurrently
    const results = await Promise.allSettled([
      tryAcquireRankingLock(campaign.id),
      tryAcquireRankingLock(campaign.id),
    ]);

    const outcomes = results.map((r) =>
      r.status === "fulfilled" ? r.value : null
    );

    const acquired = outcomes.filter((o) => o !== null);
    const failed = outcomes.filter((o) => o === null);

    expect(acquired.length).toBe(1);
    expect(failed.length).toBe(1);

    // Verify campaign is in 'ranking' state
    const updated = await getCampaign(campaign.id);
    expect(updated.ranking_status).toBe("ranking");
  });

  it("already-ranked campaign rejects new ranking", async () => {
    const campaign = await seedCampaign({
      creatorId: founderId,
      rankingStatus: "unranked",
    });

    // First ranking — succeeds
    const first = await tryAcquireRankingLock(campaign.id);
    expect(first).not.toBeNull();

    // Mark as ranked (simulating completion)
    await sql`UPDATE campaigns SET ranking_status = 'ranked' WHERE id = ${campaign.id}::uuid`;

    // Second attempt — fails (status is 'ranked', not 'unranked')
    const second = await tryAcquireRankingLock(campaign.id);
    expect(second).toBeNull();
  });

  it("failed ranking can be reset and retried", async () => {
    const campaign = await seedCampaign({
      creatorId: founderId,
      rankingStatus: "unranked",
    });

    // Acquire lock
    await tryAcquireRankingLock(campaign.id);

    // Simulate failure — reset to unranked (as the error handler does)
    await sql`UPDATE campaigns SET ranking_status = 'unranked' WHERE id = ${campaign.id}::uuid`;

    // Retry should succeed
    const retry = await tryAcquireRankingLock(campaign.id);
    expect(retry).not.toBeNull();
  });
});
