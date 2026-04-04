import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { durableRateLimitWithDb } from "@/lib/durable-rate-limit";
import { getTestDb, closeTestDb, canConnectToTestDb } from "./helpers";

describe("durable rate limit", () => {
  const sql = getTestDb();
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

    await sql`
      CREATE TABLE IF NOT EXISTS rate_limit_events (
        id BIGSERIAL PRIMARY KEY,
        scope TEXT NOT NULL,
        key_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_rate_limit_events_scope_key_hash_created_at
        ON rate_limit_events (scope, key_hash, created_at DESC)
    `;
    await sql`DELETE FROM rate_limit_events`;
  });

  afterEach(async () => {
    if (!dbAvailable) return;
    await sql`DELETE FROM rate_limit_events`;
  });

  afterAll(async () => {
    if (dbAvailable) {
      await sql`DELETE FROM rate_limit_events`;
    }
    await closeTestDb();
  });

  it("blocks requests after the configured limit for the same key", runIfDb(async () => {
    const first = await durableRateLimitWithDb(sql, "publish:user-1", 60_000, 2);
    const second = await durableRateLimitWithDb(sql, "publish:user-1", 60_000, 2);
    const third = await durableRateLimitWithDb(sql, "publish:user-1", 60_000, 2);

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(third.allowed).toBe(false);
  }));

  it("tracks different keys independently", runIfDb(async () => {
    const first = await durableRateLimitWithDb(sql, "publish:user-1", 60_000, 1);
    const second = await durableRateLimitWithDb(sql, "publish:user-2", 60_000, 1);

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
  }));
});
