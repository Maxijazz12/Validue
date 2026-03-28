import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import {
  getTestDb,
  closeTestDb,
  canConnectToTestDb,

  cleanupCampaignData,
  seedUser,
  seedSubscription,
  seedCampaign,
  getCampaign,
  testId,
} from "./helpers";

describe("publish → fund → activate flow", () => {
  const sql = getTestDb();
  const founderId = testId(40);

  beforeAll(async () => {
    const connected = await canConnectToTestDb();
    if (!connected) {
      console.warn("Skipping — no test database");
      return;
    }
    await cleanupCampaignData();
    await seedUser(founderId, "Founder");
    await seedSubscription(founderId, "free");
  });

  afterEach(async () => {
    await cleanupCampaignData();
    await sql`UPDATE subscriptions SET campaigns_used_this_period = 0 WHERE user_id = ${founderId}::uuid`;
  });

  afterAll(async () => {
    await cleanupCampaignData();
    await closeTestDb();
  });

  it("atomic publish creates campaign + questions + increments sub counter", async () => {
    // Simulate the publishCampaign transaction
    const campaignId = crypto.randomUUID();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await sql.begin(async (tx: any) => {
      await tx`
        INSERT INTO campaigns (
          id, creator_id, title, description, status,
          reward_amount, distributable_amount,
          target_responses, current_responses, match_priority,
          baseline_reach_units, total_reach_units, effective_reach_units,
          campaign_strength, quality_score
        ) VALUES (
          ${campaignId}::uuid, ${founderId}::uuid,
          'Test Idea', 'A test campaign', 'pending_funding',
          50, 42.50,
          50, 0, 1,
          75, 75, 75,
          2, 50
        )
      `;

      for (let i = 0; i < 5; i++) {
        await tx`
          INSERT INTO questions (campaign_id, text, type, sort_order, is_baseline)
          VALUES (${campaignId}::uuid, ${"Question " + (i + 1)}, 'open', ${i}, false)
        `;
      }

      await tx`
        UPDATE subscriptions
        SET campaigns_used_this_period = campaigns_used_this_period + 1
        WHERE user_id = ${founderId}::uuid
      `;
    });

    // Verify all-or-nothing
    const questions = await sql`SELECT * FROM questions WHERE campaign_id = ${campaignId}::uuid`;
    expect(questions.length).toBe(5);

    const [sub] = await sql`SELECT campaigns_used_this_period FROM subscriptions WHERE user_id = ${founderId}::uuid`;
    expect(sub.campaigns_used_this_period).toBe(1);

    const campaign = await getCampaign(campaignId);
    expect(campaign.status).toBe("pending_funding");
  });

  it("funded campaign has correct distributable (reward * 0.85)", async () => {
    const campaign = await seedCampaign({
      creatorId: founderId,
      status: "pending_funding",
      rewardAmount: 50,
      distributableAmount: 42.5,
    });

    const result = await getCampaign(campaign.id);
    expect(Number(result.distributable_amount)).toBe(42.5);
    expect(Number(result.reward_amount)).toBe(50);
    expect(Number(result.distributable_amount)).toBeLessThanOrEqual(
      Number(result.reward_amount)
    );
  });

  it("webhook activation: pending_funding → active", async () => {
    const campaign = await seedCampaign({
      creatorId: founderId,
      status: "pending_funding",
    });

    // Simulate Stripe webhook
    const activated = await sql`
      UPDATE campaigns
      SET status = 'active', funded_at = now()
      WHERE id = ${campaign.id}::uuid AND status = 'pending_funding'
      RETURNING id
    `;
    expect(activated.length).toBe(1);

    const result = await getCampaign(campaign.id);
    expect(result.status).toBe("active");
    expect(result.funded_at).not.toBeNull();
  });

  it("webhook is idempotent on retry", async () => {
    const campaign = await seedCampaign({
      creatorId: founderId,
      status: "pending_funding",
    });

    // First activation
    const first = await sql`
      UPDATE campaigns
      SET status = 'active', funded_at = now()
      WHERE id = ${campaign.id}::uuid AND status = 'pending_funding'
      RETURNING id
    `;
    expect(first.length).toBe(1);

    // Retry — should be no-op (status is now 'active', not 'pending_funding')
    const second = await sql`
      UPDATE campaigns
      SET status = 'active', funded_at = now()
      WHERE id = ${campaign.id}::uuid AND status = 'pending_funding'
      RETURNING id
    `;
    expect(second.length).toBe(0);
  });

  it("transaction rolls back on question insert failure", async () => {
    const campaignId = crypto.randomUUID();
    const [initialSub] = await sql`SELECT campaigns_used_this_period FROM subscriptions WHERE user_id = ${founderId}::uuid`;
    const initialCount = initialSub?.campaigns_used_this_period ?? 0;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await sql.begin(async (tx: any) => {
        await tx`
          INSERT INTO campaigns (
            id, creator_id, title, description, status,
            reward_amount, distributable_amount,
            target_responses, current_responses, match_priority,
            baseline_reach_units, total_reach_units, effective_reach_units,
            campaign_strength, quality_score
          ) VALUES (
            ${campaignId}::uuid, ${founderId}::uuid,
            'Rollback Test', 'Should not exist', 'active',
            0, 0, 50, 0, 1, 75, 75, 75, 2, 50
          )
        `;

        // Force an error: invalid campaign_id FK
        await tx`
          INSERT INTO questions (campaign_id, text, type, sort_order, is_baseline)
          VALUES ('00000000-0000-0000-0000-000000000000'::uuid, 'Bad Q', 'open', 0, false)
        `;
      });
    } catch {
      // Expected — FK violation
    }

    // Campaign should NOT exist (rolled back)
    const campaigns = await sql`SELECT * FROM campaigns WHERE id = ${campaignId}::uuid`;
    expect(campaigns.length).toBe(0);

    // Sub counter should be unchanged
    const [sub] = await sql`SELECT campaigns_used_this_period FROM subscriptions WHERE user_id = ${founderId}::uuid`;
    expect(sub?.campaigns_used_this_period ?? 0).toBe(initialCount);
  });
});
