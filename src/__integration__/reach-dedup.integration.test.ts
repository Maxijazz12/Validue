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
  getReachImpressions,
  testId,
} from "./helpers";

describe("reach impression deduplication", () => {
  const sql = getTestDb();
  const founderId = testId(10);
  const user1Id = testId(11);
  const user2Id = testId(12);
  let _campaignId: string;
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
    await seedRespondent(user1Id, "User 1");
    await seedRespondent(user2Id, "User 2");
  });

  afterEach(async () => {
    if (dbAvailable) await cleanupCampaignData();
  });

  afterAll(async () => {
    if (dbAvailable) await cleanupCampaignData();
    await closeTestDb();
  });

  it("first impression increments reach_served", runIfDb(async () => {
    const campaign = await seedCampaign({
      creatorId: founderId,
      status: "active",
      reachServed: 0,
      effectiveReachUnits: 100,
    });

    // Insert impression (simulating the route handler logic)
    const inserted = await sql`
      INSERT INTO reach_impressions (user_id, campaign_id)
      VALUES (${user1Id}::uuid, ${campaign.id}::uuid)
      ON CONFLICT (user_id, campaign_id) DO NOTHING
      RETURNING id
    `;
    expect(inserted.length).toBe(1);

    if (inserted.length > 0) {
      await sql`
        UPDATE campaigns SET reach_served = reach_served + 1
        WHERE id = ${campaign.id}::uuid
          AND status = 'active'
          AND reach_served < COALESCE(effective_reach_units, total_reach_units)
      `;
    }

    const updated = await getCampaign(campaign.id);
    expect(updated.reach_served).toBe(1);
  }));

  it("duplicate impression from same user is no-op", runIfDb(async () => {
    const campaign = await seedCampaign({
      creatorId: founderId,
      status: "active",
      reachServed: 0,
      effectiveReachUnits: 100,
    });

    // First impression
    const first = await sql`
      INSERT INTO reach_impressions (user_id, campaign_id)
      VALUES (${user1Id}::uuid, ${campaign.id}::uuid)
      ON CONFLICT (user_id, campaign_id) DO NOTHING
      RETURNING id
    `;
    expect(first.length).toBe(1);
    await sql`
      UPDATE campaigns SET reach_served = reach_served + 1
      WHERE id = ${campaign.id}::uuid AND status = 'active'
        AND reach_served < effective_reach_units
    `;

    // Duplicate — should return 0 rows
    const second = await sql`
      INSERT INTO reach_impressions (user_id, campaign_id)
      VALUES (${user1Id}::uuid, ${campaign.id}::uuid)
      ON CONFLICT (user_id, campaign_id) DO NOTHING
      RETURNING id
    `;
    expect(second.length).toBe(0);

    // reach_served should still be 1
    const updated = await getCampaign(campaign.id);
    expect(updated.reach_served).toBe(1);
  }));

  it("different users both count as separate impressions", runIfDb(async () => {
    const campaign = await seedCampaign({
      creatorId: founderId,
      status: "active",
      reachServed: 0,
      effectiveReachUnits: 100,
    });

    for (const userId of [user1Id, user2Id]) {
      const inserted = await sql`
        INSERT INTO reach_impressions (user_id, campaign_id)
        VALUES (${userId}::uuid, ${campaign.id}::uuid)
        ON CONFLICT (user_id, campaign_id) DO NOTHING
        RETURNING id
      `;
      if (inserted.length > 0) {
        await sql`
          UPDATE campaigns SET reach_served = reach_served + 1
          WHERE id = ${campaign.id}::uuid AND status = 'active'
            AND reach_served < effective_reach_units
        `;
      }
    }

    const updated = await getCampaign(campaign.id);
    expect(updated.reach_served).toBe(2);

    const impressions = await getReachImpressions(campaign.id);
    expect(impressions.length).toBe(2);
  }));

  it("reach cap is respected", runIfDb(async () => {
    const campaign = await seedCampaign({
      creatorId: founderId,
      status: "active",
      reachServed: 99,
      effectiveReachUnits: 100,
    });

    // User 1 — should succeed (99 → 100)
    await sql`
      INSERT INTO reach_impressions (user_id, campaign_id)
      VALUES (${user1Id}::uuid, ${campaign.id}::uuid)
      ON CONFLICT (user_id, campaign_id) DO NOTHING
    `;
    await sql`
      UPDATE campaigns SET reach_served = reach_served + 1
      WHERE id = ${campaign.id}::uuid AND status = 'active'
        AND reach_served < effective_reach_units
    `;

    // User 2 — should be blocked by WHERE clause (100 < 100 = false)
    await sql`
      INSERT INTO reach_impressions (user_id, campaign_id)
      VALUES (${user2Id}::uuid, ${campaign.id}::uuid)
      ON CONFLICT (user_id, campaign_id) DO NOTHING
    `;
    const result = await sql`
      UPDATE campaigns SET reach_served = reach_served + 1
      WHERE id = ${campaign.id}::uuid AND status = 'active'
        AND reach_served < effective_reach_units
      RETURNING id
    `;
    // 0 rows updated — cap reached
    expect(result.length).toBe(0);

    const updated = await getCampaign(campaign.id);
    expect(updated.reach_served).toBe(100);
  }));
});
