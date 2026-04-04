import { createHash } from "crypto";
import sql from "@/lib/db";

type SqlClient = {
  begin<T>(fn: (tx: unknown) => Promise<T>): Promise<T>;
};

function getRequestFingerprint(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const cfIp = request.headers.get("cf-connecting-ip");
  const userAgent = request.headers.get("user-agent") ?? "unknown";
  const adminKey = request.headers.get("x-admin-key") ?? "";

  const ip =
    forwardedFor?.split(",")[0]?.trim() ||
    realIp?.trim() ||
    cfIp?.trim() ||
    "unknown";

  return createHash("sha256")
    .update(`${ip}:${userAgent}:${adminKey}`)
    .digest("hex");
}

export async function adminRateLimit(
  request: Request,
  scope: string,
  windowMs: number,
  maxRequests: number
): Promise<{ allowed: boolean; remaining: number }> {
  return adminRateLimitWithDb(sql, request, scope, windowMs, maxRequests);
}

export async function adminRateLimitWithDb(
  db: SqlClient,
  request: Request,
  scope: string,
  windowMs: number,
  maxRequests: number
): Promise<{ allowed: boolean; remaining: number }> {
  const fingerprint = getRequestFingerprint(request);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TransactionSql loses call signature
  return db.begin(async (tx: any) => {
    await tx`
      SELECT pg_advisory_xact_lock(
        hashtext(${scope}),
        hashtext(${fingerprint})
      )
    `;

    await tx`
      DELETE FROM admin_rate_limit_events
      WHERE scope = ${scope}
        AND identifier_hash = ${fingerprint}
        AND created_at <= NOW() - ${windowMs} * INTERVAL '1 millisecond'
    `;

    await tx`
      INSERT INTO admin_rate_limit_events (scope, identifier_hash)
      VALUES (${scope}, ${fingerprint})
    `;

    const [row] = await tx`
      SELECT COUNT(*)::int AS count
      FROM admin_rate_limit_events
      WHERE scope = ${scope}
        AND identifier_hash = ${fingerprint}
    `;

    await tx`
      DELETE FROM admin_rate_limit_events
      WHERE created_at <= NOW() - INTERVAL '7 days'
    `;

    const used = Number(row?.count ?? 0);
    return {
      allowed: used <= maxRequests,
      remaining: Math.max(0, maxRequests - used),
    };
  });
}
