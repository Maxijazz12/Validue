import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { isAdminAuthorized } from "@/lib/admin-auth";
import { isValidUuid } from "@/lib/validate-uuid";
import { logOps } from "@/lib/ops-logger";

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TransactionSql loses call signature
    const result = await sql.begin(async (tx: any) => {
      const [updatedDispute] = await tx`
        UPDATE disputes
        SET status = ${status},
            admin_notes = ${adminNotes || null},
            resolved_at = ${status.startsWith("resolved_") ? tx`NOW()` : null}
        WHERE id = ${disputeId}
          AND NOT status LIKE 'resolved_%'
        RETURNING response_id, respondent_id, campaign_id
      `;

      if (!updatedDispute) {
        const [existing] = await tx`
          SELECT status FROM disputes WHERE id = ${disputeId}
        `;
        if (!existing) {
          return { error: "Dispute not found", status: 404 } as const;
        }
        return {
          error: "Dispute already resolved — cannot modify",
          status: 409,
        } as const;
      }

      if (status === "resolved_overturned") {
        const [payoutContext] = await tx`
          SELECT
            c.creator_id,
            c.distributable_amount,
            ROUND(AVG(p.amount)::numeric, 2) AS avg_payout
          FROM campaigns c
          LEFT JOIN payouts p
            ON p.campaign_id = c.id
           AND p.status != 'failed'
          WHERE c.id = ${updatedDispute.campaign_id}
          GROUP BY c.creator_id, c.distributable_amount
        `;

        const [response] = await tx`
          UPDATE responses
          SET money_state = 'available',
              available_at = NOW(),
              payout_amount = GREATEST(
                COALESCE(
                  NULLIF(base_payout, 0),
                  NULLIF(payout_amount, 0),
                  ${Number(payoutContext?.avg_payout) || 0},
                  ${Number(payoutContext?.distributable_amount) || 0}
                ),
                0
              ),
              base_payout = GREATEST(
                COALESCE(
                  NULLIF(base_payout, 0),
                  NULLIF(payout_amount, 0),
                  ${Number(payoutContext?.avg_payout) || 0},
                  ${Number(payoutContext?.distributable_amount) || 0}
                ),
                0
              ),
              bonus_payout = 0,
              is_qualified = true,
              disqualification_reasons = ARRAY[]::text[]
          WHERE id = ${updatedDispute.response_id}
            AND money_state = 'not_qualified'
          RETURNING base_payout, payout_amount
        `;

        if (response) {
          const payoutAmount = Math.max(
            Number(response.base_payout) || Number(response.payout_amount) || 0,
            0
          );
          const payoutCents = Math.round(payoutAmount * 100);

          if (payoutCents > 0) {
            const [existingPayout] = await tx`
              SELECT id
              FROM payouts
              WHERE response_id = ${updatedDispute.response_id}
                AND status != 'failed'
              LIMIT 1
            `;

            if (existingPayout) {
              await tx`
                UPDATE payouts
                SET amount = ${payoutAmount},
                    base_amount = ${payoutAmount},
                    bonus_amount = 0,
                    status = 'processing'
                WHERE id = ${existingPayout.id}
              `;
            } else if (payoutContext?.creator_id) {
              await tx`
                INSERT INTO payouts (
                  response_id,
                  campaign_id,
                  founder_id,
                  respondent_id,
                  amount,
                  base_amount,
                  bonus_amount,
                  platform_fee,
                  status
                )
                VALUES (
                  ${updatedDispute.response_id},
                  ${updatedDispute.campaign_id},
                  ${payoutContext.creator_id},
                  ${updatedDispute.respondent_id},
                  ${payoutAmount},
                  ${payoutAmount},
                  0,
                  0,
                  'processing'
                )
              `;
            }

            await tx`
              UPDATE profiles
              SET available_balance_cents = available_balance_cents + ${payoutCents}
              WHERE id = ${updatedDispute.respondent_id}
            `;
          }

          return {
            ok: true,
            overturned: true,
            disputeId,
            responseId: updatedDispute.response_id,
            respondentId: updatedDispute.respondent_id,
            amountCents: payoutCents,
          } as const;
        }
      }

      return { ok: true } as const;
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    if ("overturned" in result && result.overturned) {
      logOps({
        event: "admin.dispute.overturned",
        disputeId: result.disputeId,
        responseId: result.responseId,
        respondentId: result.respondentId,
        amountCents: result.amountCents,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin/disputes] Update failed:", err);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
