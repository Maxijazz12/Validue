import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { isAdminAuthorized } from "@/lib/admin-auth";
import { isValidUuid } from "@/lib/validate-uuid";

/**
 * GET /api/admin/disputes?status=open
 * List disputes, optionally filtered by status.
 *
 * PATCH /api/admin/disputes
 * Resolve a dispute: { disputeId, status, adminNotes }
 */
export async function GET(request: Request) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = rateLimit("admin:disputes", 60000, 20);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get("status") || "open";

  try {
    const disputes = await sql`
      SELECT
        d.id, d.reason, d.status, d.admin_notes, d.created_at, d.resolved_at,
        d.response_id, d.campaign_id,
        p.full_name AS respondent_name, p.id AS respondent_id,
        r.quality_score, r.money_state, r.disqualification_reasons,
        c.title AS campaign_title
      FROM disputes d
      JOIN profiles p ON p.id = d.respondent_id
      JOIN responses r ON r.id = d.response_id
      JOIN campaigns c ON c.id = d.campaign_id
      WHERE d.status = ${statusFilter}
      ORDER BY d.created_at DESC
      LIMIT 50
    `;

    return NextResponse.json({ disputes });
  } catch (err) {
    console.error("[admin/disputes] Fetch failed:", err);
    return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { disputeId, status, adminNotes } = await request.json();

  if (!disputeId || !status || !isValidUuid(disputeId)) {
    return NextResponse.json({ error: "Missing or invalid disputeId or status" }, { status: 400 });
  }

  if (!["under_review", "resolved_upheld", "resolved_overturned"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  try {
    // Verify dispute exists and is in a resolvable state
    const [existing] = await sql`
      SELECT status FROM disputes WHERE id = ${disputeId}
    `;
    if (!existing) {
      return NextResponse.json({ error: "Dispute not found" }, { status: 404 });
    }
    if (existing.status.startsWith("resolved_")) {
      return NextResponse.json(
        { error: "Dispute already resolved — cannot modify" },
        { status: 409 }
      );
    }

    const resolved = status.startsWith("resolved_") ? "NOW()" : null;

    await sql`
      UPDATE disputes
      SET status = ${status},
          admin_notes = ${adminNotes || null},
          resolved_at = ${resolved ? sql`NOW()` : null}
      WHERE id = ${disputeId}
        AND NOT status LIKE 'resolved_%'
    `;

    // If overturned, re-qualify the response and add to respondent balance
    if (status === "resolved_overturned") {
      const [dispute] = await sql`
        SELECT response_id, respondent_id FROM disputes WHERE id = ${disputeId}
      `;

      if (dispute) {
        // Get the campaign's distributable info to calculate a fair payout
        const [response] = await sql`
          SELECT r.campaign_id, r.base_payout, r.payout_amount
          FROM responses r WHERE r.id = ${dispute.response_id}
        `;

        if (response) {
          const payoutAmount = Number(response.base_payout) || Number(response.payout_amount) || 0;
          const payoutCents = Math.round(payoutAmount * 100);

          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TransactionSql loses call signature
          await sql.begin(async (tx: any) => {
            // Re-qualify the response
            await tx`
              UPDATE responses
              SET money_state = 'available',
                  is_qualified = true,
                  disqualification_reasons = '{}'
              WHERE id = ${dispute.response_id}
            `;

            // Credit the respondent if there's a payout amount
            if (payoutCents > 0) {
              await tx`
                UPDATE profiles
                SET available_balance_cents = available_balance_cents + ${payoutCents}
                WHERE id = ${dispute.respondent_id}
              `;
            }
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin/disputes] Update failed:", err);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
