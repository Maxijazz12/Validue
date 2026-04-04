import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { isAdminAuthorized } from "@/lib/admin-auth";
import { adminRateLimit } from "@/lib/admin-rate-limit";

/**
 * GET /api/admin/users?q=<search>
 *
 * Search users by name, email, or UUID.
 * Protected by X-Admin-Key header.
 */
export async function GET(request: Request) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = await adminRateLimit(request, "admin:users", 60000, 20);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query || query.length < 2) {
    return NextResponse.json({ error: "Search query must be at least 2 characters" }, { status: 400 });
  }

  try {
    // UUID exact match or ILIKE name search
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(query);

    let users;
    if (isUuid) {
      users = await sql`
        SELECT
          p.id, p.full_name, p.role, p.reputation_score, p.reputation_tier,
          p.available_balance_cents, p.pending_balance_cents, p.total_earned,
          p.total_responses_completed, p.stripe_connect_account_id,
          p.stripe_connect_onboarding_complete, p.created_at,
          u.email
        FROM profiles p
        LEFT JOIN auth.users u ON u.id = p.id
        WHERE p.id = ${query}
        LIMIT 1
      `;
    } else {
      const pattern = `%${query}%`;
      users = await sql`
        SELECT
          p.id, p.full_name, p.role, p.reputation_score, p.reputation_tier,
          p.available_balance_cents, p.pending_balance_cents, p.total_earned,
          p.total_responses_completed, p.stripe_connect_account_id,
          p.stripe_connect_onboarding_complete, p.created_at,
          u.email
        FROM profiles p
        LEFT JOIN auth.users u ON u.id = p.id
        WHERE p.full_name ILIKE ${pattern}
           OR u.email ILIKE ${pattern}
        ORDER BY p.created_at DESC
        LIMIT 20
      `;
    }

    return NextResponse.json({ users });
  } catch (err) {
    console.error("[admin/users] Search failed:", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
