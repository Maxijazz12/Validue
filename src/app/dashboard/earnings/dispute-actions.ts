"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { rateLimit } from "@/lib/rate-limit";
import { captureError } from "@/lib/sentry";
import sql from "@/lib/db";

/**
 * File a dispute for a disqualified or low-scored response.
 * One dispute per response (enforced by unique index).
 */
export async function fileDispute(
  responseId: string,
  reason: string
): Promise<{ disputeId: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const rl = rateLimit(`dispute:${user.id}`, 3_600_000, 5); // 5 per hour
  if (!rl.allowed) return { error: "Too many disputes. Try again later." };

  if (!reason.trim() || reason.trim().length < 20) {
    return { error: "Please explain why you disagree (at least 20 characters)." };
  }

  if (reason.length > 1000) {
    return { error: "Dispute reason must be under 1000 characters." };
  }

  // Verify the response belongs to this user and is eligible for dispute
  const [response] = await sql`
    SELECT id, campaign_id, money_state, is_qualified, quality_score, disqualification_reasons
    FROM responses
    WHERE id = ${responseId} AND respondent_id = ${user.id}
  `;

  if (!response) return { error: "Response not found" };

  // Only allow disputes on disqualified or low-scored responses
  if (response.money_state !== "not_qualified" && response.is_qualified !== false) {
    return { error: "Only disqualified responses can be disputed." };
  }
  if (Array.isArray(response.disqualification_reasons) && response.disqualification_reasons.includes("unpaid_campaign")) {
    return { error: "Unpaid campaigns are not eligible for payout disputes." };
  }

  // Check if already disputed
  const [existing] = await sql`
    SELECT id FROM disputes WHERE response_id = ${responseId}
  `;
  if (existing) return { error: "You've already filed a dispute for this response." };

  try {
    const [dispute] = await sql`
      INSERT INTO disputes (respondent_id, response_id, campaign_id, reason)
      VALUES (${user.id}, ${responseId}, ${response.campaign_id}, ${reason.trim()})
      ON CONFLICT (response_id) DO NOTHING
      RETURNING id
    `;

    if (!dispute) {
      return { error: "You've already filed a dispute for this response." };
    }

    revalidatePath("/dashboard/earnings");
    return { disputeId: dispute.id };
  } catch (err) {
    console.error("[dispute] Failed to file dispute:", err);
    captureError(err, { userId: user.id, responseId, operation: "dispute.file" });
    return { error: "Failed to file dispute. Please try again." };
  }
}
