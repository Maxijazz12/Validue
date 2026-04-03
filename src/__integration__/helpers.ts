import postgres from "postgres";

/**
 * Integration test helpers — direct DB access for seeding, cleanup, and assertions.
 * Bypasses Supabase SDK and RLS to test raw DB behavior.
 */

const TEST_DB_URL =
  process.env.TEST_DATABASE_URL ||
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

let _sql: ReturnType<typeof postgres> | null = null;
let _testDbAvailability: Promise<boolean> | null = null;

export function getTestDb() {
  if (!_sql) {
    _sql = postgres(TEST_DB_URL, {
      max: 5,
      idle_timeout: 10,
      connect_timeout: 2,
      prepare: false,
    });
  }
  return _sql;
}

export async function closeTestDb() {
  if (_sql) {
    await _sql.end();
    _sql = null;
  }
  _testDbAvailability = null;
}

/** Check if test DB is reachable. Call in beforeAll to skip tests if no DB. */
export async function canConnectToTestDb(): Promise<boolean> {
  if (!_testDbAvailability) {
    _testDbAvailability = (async () => {
      try {
        const sql = getTestDb();
        await sql`SELECT 1`;
        return true;
      } catch {
        return false;
      }
    })();
  }
  return _testDbAvailability;
}

/* ─── Seed Helpers ─── */

export async function seedUser(id: string, name = "Test User") {
  const sql = getTestDb();
  // Create auth.users entry (local Supabase only)
  await sql`
    INSERT INTO auth.users (id, email, raw_user_meta_data, role, aud, created_at, updated_at)
    VALUES (
      ${id}::uuid,
      ${`${id}@test.com`},
      ${JSON.stringify({ full_name: name })}::jsonb,
      'authenticated', 'authenticated', now(), now()
    )
    ON CONFLICT (id) DO NOTHING
  `;
  // Create profile
  await sql`
    INSERT INTO profiles (id, full_name, role)
    VALUES (${id}::uuid, ${name}, 'founder')
    ON CONFLICT (id) DO NOTHING
  `;
}

export async function seedRespondent(id: string, name = "Test Respondent") {
  const sql = getTestDb();
  await sql`
    INSERT INTO auth.users (id, email, raw_user_meta_data, role, aud, created_at, updated_at)
    VALUES (
      ${id}::uuid,
      ${`${id}@test.com`},
      ${JSON.stringify({ full_name: name })}::jsonb,
      'authenticated', 'authenticated', now(), now()
    )
    ON CONFLICT (id) DO NOTHING
  `;
  await sql`
    INSERT INTO profiles (id, full_name, role)
    VALUES (${id}::uuid, ${name}, 'respondent')
    ON CONFLICT (id) DO NOTHING
  `;
}

export type SeedCampaignOpts = {
  id?: string;
  creatorId: string;
  status?: string;
  rewardAmount?: number;
  distributableAmount?: number;
  rankingStatus?: string;
  payoutStatus?: string | null;
  reachServed?: number;
  effectiveReachUnits?: number;
  campaignStrength?: number;
  qualityScore?: number;
};

export async function seedCampaign(opts: SeedCampaignOpts) {
  const sql = getTestDb();
  const id = opts.id || crypto.randomUUID();
  const [campaign] = await sql`
    INSERT INTO campaigns (
      id, creator_id, title, description, status,
      reward_amount, distributable_amount,
      ranking_status, payout_status,
      reach_served, effective_reach_units, total_reach_units,
      baseline_reach_units, campaign_strength, quality_score,
      target_responses, current_responses, match_priority
    ) VALUES (
      ${id}::uuid, ${opts.creatorId}::uuid,
      'Test Campaign', 'Test description',
      ${opts.status || "active"},
      ${opts.rewardAmount ?? 50},
      ${opts.distributableAmount ?? 42.5},
      ${opts.rankingStatus || "unranked"},
      ${opts.payoutStatus ?? null},
      ${opts.reachServed ?? 0},
      ${opts.effectiveReachUnits ?? 100},
      ${opts.effectiveReachUnits ?? 100},
      75,
      ${opts.campaignStrength ?? 3},
      ${opts.qualityScore ?? 50},
      50, 0, 1
    )
    RETURNING *
  `;
  return campaign;
}

export async function seedResponse(
  campaignId: string,
  respondentId: string,
  status = "submitted",
  qualityScore: number | null = null,
  scoringConfidence: number | null = null,
  scoringSource: string | null = null
) {
  const sql = getTestDb();
  const [response] = await sql`
    INSERT INTO responses (
      campaign_id, respondent_id, status,
      quality_score, scoring_confidence, scoring_source
    ) VALUES (
      ${campaignId}::uuid, ${respondentId}::uuid, ${status},
      ${qualityScore}, ${scoringConfidence}, ${scoringSource}
    )
    RETURNING *
  `;
  return response;
}

export async function seedAnswer(
  responseId: string,
  questionId: string,
  text = "Test answer text with enough detail",
  metadata: Record<string, unknown> = {}
) {
  const sql = getTestDb();
  const defaultMeta = {
    charCount: text.length,
    timeSpentMs: 15000,
    pasteDetected: false,
    pasteCount: 0,
    ...metadata,
  };
  await sql`
    INSERT INTO answers (response_id, question_id, text, metadata)
    VALUES (${responseId}::uuid, ${questionId}::uuid, ${text}, ${sql.json(defaultMeta)})
    ON CONFLICT (response_id, question_id) DO NOTHING
  `;
}

export async function seedQuestion(
  campaignId: string,
  text = "What do you think?",
  type = "open",
  sortOrder = 0
) {
  const sql = getTestDb();
  const [question] = await sql`
    INSERT INTO questions (campaign_id, text, type, sort_order, is_baseline, category)
    VALUES (${campaignId}::uuid, ${text}, ${type}, ${sortOrder}, false, null)
    RETURNING *
  `;
  return question;
}

export async function seedSubscription(userId: string, tier = "free") {
  const sql = getTestDb();
  await sql`
    INSERT INTO subscriptions (user_id, tier, status, campaigns_used_this_period)
    VALUES (${userId}::uuid, ${tier}, 'active', 0)
    ON CONFLICT (user_id) DO UPDATE SET
      tier = ${tier},
      campaigns_used_this_period = 0
  `;
}

/* ─── Query Helpers ─── */

export async function getCampaign(id: string) {
  const sql = getTestDb();
  const [campaign] = await sql`SELECT * FROM campaigns WHERE id = ${id}::uuid`;
  return campaign;
}

export async function getResponse(id: string) {
  const sql = getTestDb();
  const [response] = await sql`SELECT * FROM responses WHERE id = ${id}::uuid`;
  return response;
}

export async function getPayoutsForCampaign(campaignId: string) {
  const sql = getTestDb();
  return sql`SELECT * FROM payouts WHERE campaign_id = ${campaignId}::uuid`;
}

export async function getReachImpressions(campaignId: string) {
  const sql = getTestDb();
  return sql`SELECT * FROM reach_impressions WHERE campaign_id = ${campaignId}::uuid`;
}

/* ─── Cleanup ─── */

export async function cleanupAll() {
  if (!(await canConnectToTestDb())) return;
  const sql = getTestDb();
  // DELETE in FK order: children before parents
  await sql`DELETE FROM reach_impressions`;
  await sql`DELETE FROM payouts`;
  await sql`DELETE FROM answers`;
  await sql`DELETE FROM responses`;
  await sql`DELETE FROM questions`;
  await sql`DELETE FROM campaigns`;
  await sql`DELETE FROM subscriptions`;
  await sql`DELETE FROM profiles`;
}

/** Lighter cleanup — just campaign-level data, preserving users/profiles/subscriptions */
export async function cleanupCampaignData() {
  if (!(await canConnectToTestDb())) return;
  const sql = getTestDb();
  await sql`DELETE FROM reach_impressions`;
  await sql`DELETE FROM payouts`;
  await sql`DELETE FROM answers`;
  await sql`DELETE FROM responses`;
  await sql`DELETE FROM questions`;
  await sql`DELETE FROM campaigns`;
}

/**
 * Generate a deterministic UUID from a short name for readable tests.
 * Uses UUID v5-like approach with zero namespace.
 */
export function testId(n: number): string {
  return `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
}
