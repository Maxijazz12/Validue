import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { adminRateLimitWithDb } from "@/lib/admin-rate-limit";
import { getTestDb, closeTestDb, canConnectToTestDb } from "./helpers";

describe("admin rate limit", () => {
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
      CREATE TABLE IF NOT EXISTS admin_rate_limit_events (
        id BIGSERIAL PRIMARY KEY,
        scope TEXT NOT NULL,
        identifier_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_admin_rate_limit_events_scope_identifier_created_at
        ON admin_rate_limit_events (scope, identifier_hash, created_at DESC)
    `;
    await sql`DELETE FROM admin_rate_limit_events`;
  });

  afterEach(async () => {
    if (!dbAvailable) return;
    await sql`DELETE FROM admin_rate_limit_events`;
  });

  afterAll(async () => {
    if (dbAvailable) {
      await sql`DELETE FROM admin_rate_limit_events`;
    }
    await closeTestDb();
  });

  it("blocks requests after the configured limit for the same requester", runIfDb(async () => {
    const request = new Request("http://localhost/api/admin/diagnostics", {
      headers: {
        "x-admin-key": "test-admin-key",
        "x-forwarded-for": "203.0.113.10",
        "user-agent": "vitest",
      },
    });

    const first = await adminRateLimitWithDb(sql, request, "admin:test", 60_000, 2);
    const second = await adminRateLimitWithDb(sql, request, "admin:test", 60_000, 2);
    const third = await adminRateLimitWithDb(sql, request, "admin:test", 60_000, 2);

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(third.allowed).toBe(false);
  }));

  it("tracks different request fingerprints independently", runIfDb(async () => {
    const firstRequest = new Request("http://localhost/api/admin/diagnostics", {
      headers: {
        "x-admin-key": "test-admin-key",
        "x-forwarded-for": "203.0.113.11",
        "user-agent": "vitest-a",
      },
    });
    const secondRequest = new Request("http://localhost/api/admin/diagnostics", {
      headers: {
        "x-admin-key": "test-admin-key",
        "x-forwarded-for": "203.0.113.12",
        "user-agent": "vitest-b",
      },
    });

    const first = await adminRateLimitWithDb(sql, firstRequest, "admin:test", 60_000, 1);
    const second = await adminRateLimitWithDb(sql, secondRequest, "admin:test", 60_000, 1);

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
  }));
});
