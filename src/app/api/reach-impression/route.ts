import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import sql from "@/lib/db";
import { logOps } from "@/lib/ops-logger";
import { captureWarning } from "@/lib/sentry";
import { rateLimit } from "@/lib/rate-limit";
import { isValidUuid } from "@/lib/validate-uuid";

/**
 * POST /api/reach-impression
 *
 * Increments reach_served for a single campaign when a respondent
 * actually views the campaign card (via intersection observer).
 *
 * V2.1: Per-user deduplication — only the first impression per user per
 * campaign counts toward reach_served. Prevents over-serving from
 * page reloads or navigation.
 *
 * Body: { campaignId: string }
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit: 50 impressions per user per minute
    const limit = rateLimit(`reach:${user.id}`, 60000, 50);
    if (!limit.allowed) {
      return NextResponse.json({ ok: true }); // Silent 200 — don't reveal rate limiting to client
    }

    const body = await request.json();
    const { campaignId } = body;

    if (!campaignId || typeof campaignId !== "string" || !isValidUuid(campaignId)) {
      return NextResponse.json(
        { error: "campaignId is required" },
        { status: 400 }
      );
    }

    // Block founders from inflating their own campaign's reach
    const [campaign] = await sql`
      SELECT creator_id FROM campaigns WHERE id = ${campaignId}::uuid
    `;
    if (!campaign || campaign.creator_id === user.id) {
      return NextResponse.json({ ok: true }); // Silent 200 — don't reveal the check
    }

    // Atomic: INSERT impression + UPDATE reach_served in a single CTE.
    // Prevents race where concurrent impressions all see the same reach_served
    // and over-increment past the reach budget.
    await sql`
      WITH new_impression AS (
        INSERT INTO reach_impressions (user_id, campaign_id)
        VALUES (${user.id}, ${campaignId})
        ON CONFLICT (user_id, campaign_id) DO NOTHING
        RETURNING id
      )
      UPDATE campaigns
      SET reach_served = reach_served + 1
      WHERE id = ${campaignId}
        AND status = 'active'
        AND reach_served < COALESCE(effective_reach_units, total_reach_units)
        AND EXISTS (SELECT 1 FROM new_impression)
    `;

    return NextResponse.json({ ok: true });
  } catch (err) {
    const body = await request.clone().json().catch(() => ({}));
    const errMsg = (err as Error).message;
    logOps({
      event: "reach.error",
      campaignId: body?.campaignId ?? "unknown",
      userId: "unknown",
      error: errMsg,
    });
    captureWarning(`Reach impression error: ${errMsg}`, { campaignId: body?.campaignId, operation: "reach.impression" });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
