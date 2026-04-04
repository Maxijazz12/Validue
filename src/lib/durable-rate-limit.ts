import { createHash } from "crypto";
import sql from "@/lib/db";

type SqlClient = {
  begin<T>(fn: (tx: unknown) => Promise<T>): Promise<T>;
};

function splitScope(key: string): { scope: string; keyHash: string } {
  const scope = key.split(":")[0] || "global";
  const keyHash = createHash("sha256").update(key).digest("hex");
  return { scope, keyHash };
}

export async function durableRateLimit(
  key: string,
  windowMs: number,
  maxRequests: number
): Promise<{ allowed: boolean; remaining: number }> {
  return durableRateLimitWithDb(sql, key, windowMs, maxRequests);
}

export async function durableRateLimitWithDb(
  db: SqlClient,
  key: string,
  windowMs: number,
  maxRequests: number
): Promise<{ allowed: boolean; remaining: number }> {
  const { scope, keyHash } = splitScope(key);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TransactionSql loses call signature
  return db.begin(async (tx: any) => {
    await tx`
      SELECT pg_advisory_xact_lock(
        hashtext(${scope}),
        hashtext(${keyHash})
      )
    `;

    await tx`
      DELETE FROM rate_limit_events
      WHERE scope = ${scope}
        AND key_hash = ${keyHash}
        AND created_at <= NOW() - ${windowMs} * INTERVAL '1 millisecond'
    `;

    await tx`
      INSERT INTO rate_limit_events (scope, key_hash)
      VALUES (${scope}, ${keyHash})
    `;

    const [row] = await tx`
      SELECT COUNT(*)::int AS count
      FROM rate_limit_events
      WHERE scope = ${scope}
        AND key_hash = ${keyHash}
    `;

    await tx`
      DELETE FROM rate_limit_events
      WHERE created_at <= NOW() - INTERVAL '7 days'
    `;

    const used = Number(row?.count ?? 0);
    return {
      allowed: used <= maxRequests,
      remaining: Math.max(0, maxRequests - used),
    };
  });
}
