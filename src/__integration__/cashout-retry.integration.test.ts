import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { claimFailedCashoutRetry } from "@/lib/cashout-retry";
import {
  getTestDb,
  closeTestDb,
  canConnectToTestDb,
  cleanupCampaignData,
  seedRespondent,
  testId,
} from "./helpers";

describe("cashout retry claiming", () => {
  const sql = getTestDb();
  const respondentId = testId(320);
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
    await seedRespondent(respondentId, "Retry Respondent");
  });

  afterEach(async () => {
    if (!dbAvailable) return;
    await sql`DELETE FROM cashouts`;
    await sql`
      UPDATE profiles
      SET available_balance_cents = 0,
          pending_balance_cents = 0,
          last_cashout_at = NULL
      WHERE id = ${respondentId}::uuid
    `;
  });

  afterAll(async () => {
    if (!dbAvailable) return;
    await sql`DELETE FROM cashouts`;
    await closeTestDb();
  });

  it("only one concurrent retry claim succeeds", runIfDb(async () => {
    await sql`
      UPDATE profiles
      SET available_balance_cents = 800
      WHERE id = ${respondentId}::uuid
    `;

    const [cashout] = await sql`
      INSERT INTO cashouts (respondent_id, amount_cents, status, attempt_count, failure_reason)
      VALUES (${respondentId}::uuid, 500, 'failed', 1, 'transfer_failed')
      RETURNING id
    `;

    const claim = async () =>
      sql.begin(async (tx) =>
        claimFailedCashoutRetry(tx, cashout.id as string, respondentId, 500)
      );

    const results = await Promise.allSettled([claim(), claim()]);
    const winners = results.filter(
      (result) => result.status === "fulfilled" && result.value !== null
    );
    const misses = results.filter(
      (result) => result.status === "fulfilled" && result.value === null
    );

    expect(winners.length).toBe(1);
    expect(misses.length).toBe(1);

    const [updatedCashout] = await sql`
      SELECT status, attempt_count
      FROM cashouts
      WHERE id = ${cashout.id}::uuid
    `;
    expect(updatedCashout.status).toBe("processing");
    expect(updatedCashout.attempt_count).toBe(2);

    const [profile] = await sql`
      SELECT available_balance_cents
      FROM profiles
      WHERE id = ${respondentId}::uuid
    `;
    expect(profile.available_balance_cents).toBe(300);
  }));

  it("rolls back the claim when balance is insufficient", runIfDb(async () => {
    await sql`
      UPDATE profiles
      SET available_balance_cents = 100
      WHERE id = ${respondentId}::uuid
    `;

    const [cashout] = await sql`
      INSERT INTO cashouts (respondent_id, amount_cents, status, attempt_count, failure_reason)
      VALUES (${respondentId}::uuid, 500, 'failed', 1, 'transfer_failed')
      RETURNING id
    `;

    await expect(
      sql.begin(async (tx) =>
        claimFailedCashoutRetry(tx, cashout.id as string, respondentId, 500)
      )
    ).rejects.toThrow("INSUFFICIENT_BALANCE");

    const [updatedCashout] = await sql`
      SELECT status, attempt_count
      FROM cashouts
      WHERE id = ${cashout.id}::uuid
    `;
    expect(updatedCashout.status).toBe("failed");
    expect(updatedCashout.attempt_count).toBe(1);
  }));
});
