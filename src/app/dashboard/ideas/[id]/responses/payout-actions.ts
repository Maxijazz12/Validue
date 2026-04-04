"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { updateRespondentReputation } from "@/lib/reputation";
import { safeNumber, safePositive } from "@/lib/defaults";
import { createNotifications } from "@/lib/notifications";
import {
  qualifyResponse,
  distributePayoutsV2,
  distributeSubsidizedPayouts,
  type ScoredResponse,
  type ResponseMetadata,
  type CampaignFormat,
} from "@/lib/payout-math";
import { logOps } from "@/lib/ops-logger";
import { captureError, captureWarning } from "@/lib/sentry";
import { rateLimit } from "@/lib/rate-limit";
import { isValidUuid } from "@/lib/validate-uuid";
import sql from "@/lib/db";

export type PayoutSuggestion = {
  responseId: string;
  respondentId: string;
  respondentName: string;
  qualityScore: number;
  suggestedAmount: number;
  weight: number;
  scoringSource: string;
  scoringConfidence: number;
  qualified?: boolean;
  basePayout?: number;
  bonusPayout?: number;
  disqualificationReasons?: string[];
};

export async function suggestDistribution(campaignId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // Verify ownership
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, creator_id, reward_amount, distributable_amount, format, is_subsidized")
    .eq("id", campaignId)
    .eq("creator_id", user.id)
    .single();

  if (!campaign) throw new Error("Campaign not found");

  const distributable = safePositive(campaign.distributable_amount);
  if (distributable <= 0) return { suggestions: [], distributable: 0 };

  return suggestDistributionV2(supabase, campaign, distributable);
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Payout distribution (V2 economics)
 * ═══════════════════════════════════════════════════════════════════════════ */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function suggestDistributionV2(_supabase: any, campaign: any, distributable: number) {
  const format: CampaignFormat = campaign.format === "quick" ? "quick" : "standard";
  const isSubsidized = campaign.is_subsidized === true;

  const responses = await sql`
    SELECT
      r.id,
      r.respondent_id,
      r.quality_score,
      r.scoring_confidence,
      r.submitted_duration_ms,
      p.full_name AS respondent_name
    FROM responses r
    LEFT JOIN profiles p ON p.id = r.respondent_id
    WHERE r.campaign_id = ${campaign.id}
      AND r.status = 'ranked'
    ORDER BY r.quality_score DESC NULLS LAST
  `;

  if (responses.length === 0)
    return { suggestions: [], distributable };

  const responseIds = responses.map((response) => response.id);
  const answerRows = responseIds.length === 0
    ? []
    : await sql`
        SELECT a.response_id, a.text, q.type
        FROM answers a
        JOIN questions q ON q.id = a.question_id
        WHERE a.response_id = ANY(${responseIds}::uuid[])
      `;

  const answersByResponse = new Map<string, { text: string | null; type: string | null }[]>();
  for (const row of answerRows) {
    const existing = answersByResponse.get(row.response_id) ?? [];
    existing.push({ text: row.text, type: row.type });
    answersByResponse.set(row.response_id, existing);
  }

  // Build ScoredResponse[] and ResponseMetadata[] for qualification
  const scoredResponses: ScoredResponse[] = [];
  const metadataMap = new Map<string, ResponseMetadata>();

  for (const r of responses) {
    scoredResponses.push({
      responseId: r.id,
      respondentId: r.respondent_id,
      respondentName: r.respondent_name || "Anonymous",
      qualityScore: safePositive(r.quality_score),
      confidence: safeNumber(r.scoring_confidence, 0.7),
    });

    // Qualification uses server-derived response duration and persisted answer text.
    const answers = answersByResponse.get(r.id) ?? [];
    const openAnswers: { charCount: number }[] = [];

    for (const a of answers) {
      if (a.type !== "open") continue;
      const charCount = (a.text || "").trim().length;
      if (charCount > 0) {
        openAnswers.push({ charCount });
      }
    }

    metadataMap.set(r.id, {
      totalTimeMs: Math.max(0, safeNumber(r.submitted_duration_ms, 0)),
      openAnswers,
      // Client-supplied paste telemetry is still stored for analytics/ranking,
      // but payout qualification only trusts server-derived signals.
      spamFlagged: false,
    });
  }

  // Run qualification on each response
  const qualResults = scoredResponses.map((sr) => {
    const meta = metadataMap.get(sr.responseId)!;
    return qualifyResponse(sr, format, meta);
  });

  // Distribute payouts
  let allocations;
  if (isSubsidized) {
    allocations = distributeSubsidizedPayouts(scoredResponses, qualResults);
  } else {
    allocations = distributePayoutsV2(scoredResponses, distributable, qualResults);
  }

  // Map to PayoutSuggestion format for backward compatibility with UI
  const suggestions: PayoutSuggestion[] = allocations.map((a) => {
    const sr = scoredResponses.find((s) => s.responseId === a.responseId)!;
    return {
      responseId: a.responseId,
      respondentId: a.respondentId,
      respondentName: a.respondentName,
      qualityScore: a.qualityScore,
      suggestedAmount: a.suggestedAmount,
      weight: a.weight,
      scoringSource: "ai",
      scoringConfidence: sr.confidence,
      // V2 additions
      qualified: a.qualified,
      basePayout: a.basePayout,
      bonusPayout: a.bonusPayout,
      disqualificationReasons: a.disqualificationReasons,
    };
  });

  return { suggestions, distributable };
}

/* ─── V2 Payout Allocation (writes to DB) ─── */

export type PayoutAllocationV2Input = {
  responseId: string;
  amount: number;
  basePayout: number;
  bonusPayout: number;
  qualified: boolean;
  disqualificationReasons?: string[];
};

export async function allocatePayoutsV2(
  campaignId: string,
  allocations: PayoutAllocationV2Input[]
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // Verify ownership and get campaign
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, creator_id, reward_amount, distributable_amount, payout_status, status")
    .eq("id", campaignId)
    .eq("creator_id", user.id)
    .single();

  if (!campaign) throw new Error("Campaign not found");
  if (campaign.payout_status === "allocated" || campaign.payout_status === "completed")
    throw new Error("Payouts already allocated");

  // Rate limit
  const rl = rateLimit(`payout:${user.id}`, 3600000, 5);
  if (!rl.allowed) throw new Error("Too many payout attempts. Please wait.");

  const distributable = safePositive(campaign.distributable_amount);

  // Validate
  for (const a of allocations) {
    if (!Number.isFinite(a.amount) || a.amount < 0)
      throw new Error(`Invalid payout amount: ${a.amount}`);
  }

  const qualifiedAllocations = allocations.filter((a) => a.qualified && a.amount > 0);
  // Use integer cents to avoid float accumulation errors
  const totalAllocatedCents = qualifiedAllocations.reduce((s, a) => s + Math.round(a.amount * 100), 0);
  const distributableCents = Math.round(distributable * 100);
  const totalAllocated = totalAllocatedCents / 100; // Dollar value for logging

  if (totalAllocatedCents > distributableCents + 1)
    throw new Error(
      `Total ($${totalAllocated.toFixed(2)}) exceeds distributable ($${distributable.toFixed(2)})`
    );

  // Validate all response IDs are valid UUIDs
  const responseIds = allocations.map((a) => a.responseId);
  if (responseIds.some((id) => !isValidUuid(id))) throw new Error("Invalid response ID in allocations");
  const { data: responses } = await supabase
    .from("responses")
    .select("id, respondent_id")
    .eq("campaign_id", campaignId)
    .in("id", responseIds);

  if (!responses || responses.length !== responseIds.length) {
    throw new Error("Some responses not found or don't belong to this campaign");
  }
  const respondentMap = new Map(responses.map((r: { id: string; respondent_id: string }) => [r.id, r.respondent_id]));

  let settledImmediately = false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await sql.begin(async (tx: any) => {
      const [lockedCampaign] = await tx`
        SELECT status, payout_status
        FROM campaigns
        WHERE id = ${campaignId}
          AND creator_id = ${user.id}
        FOR UPDATE
      `;

      if (!lockedCampaign) {
        throw new Error("CAMPAIGN_NOT_FOUND");
      }

      const currentPayoutStatus = String(lockedCampaign.payout_status ?? "none");
      if (currentPayoutStatus !== "none") {
        throw new Error("PAYOUT_ALREADY_ALLOCATED");
      }

      settledImmediately = lockedCampaign.status === "completed";

      await tx`
        UPDATE campaigns
        SET payout_status = ${settledImmediately ? "completed" : "allocated"}
        WHERE id = ${campaignId}
      `;

      for (const allocation of allocations) {
        const respondentId = respondentMap.get(allocation.responseId);
        if (!respondentId) continue;

        if (allocation.qualified && allocation.amount > 0) {
          // Create payout record
          await tx`
            INSERT INTO payouts (response_id, campaign_id, founder_id, respondent_id, amount, base_amount, bonus_amount, platform_fee, status)
            VALUES (${allocation.responseId}, ${campaignId}, ${user.id}, ${respondentId}, ${allocation.amount}, ${allocation.basePayout}, ${allocation.bonusPayout}, 0, ${settledImmediately ? "processing" : "pending"})
          `;
          const [updatedResp] = settledImmediately
            ? await tx`
                UPDATE responses
                SET payout_amount = ${allocation.amount},
                    base_payout = ${allocation.basePayout},
                    bonus_payout = ${allocation.bonusPayout},
                    is_qualified = true,
                    disqualification_reasons = ARRAY[]::text[],
                    money_state = 'available',
                    locked_at = NULL,
                    available_at = NOW()
                WHERE id = ${allocation.responseId}
                  AND money_state = 'pending_qualification'
                RETURNING id
              `
            : await tx`
                UPDATE responses
                SET payout_amount = ${allocation.amount},
                    base_payout = ${allocation.basePayout},
                    bonus_payout = ${allocation.bonusPayout},
                    is_qualified = true,
                    disqualification_reasons = ARRAY[]::text[],
                    money_state = 'locked',
                    locked_at = NOW(),
                    available_at = NULL
                WHERE id = ${allocation.responseId}
                  AND money_state = 'pending_qualification'
                RETURNING id
              `;
          if (!updatedResp) {
            throw new Error(`Response ${allocation.responseId} already in unexpected money_state`);
          }
          const amountCents = Math.round(allocation.amount * 100);
          if (settledImmediately) {
            await tx`
              UPDATE profiles
              SET available_balance_cents = available_balance_cents + ${amountCents}
              WHERE id = ${respondentId}
            `;
          } else {
            await tx`
              UPDATE profiles
              SET pending_balance_cents = pending_balance_cents + ${amountCents}
              WHERE id = ${respondentId}
            `;
          }
        } else {
          const [updatedResp] = await tx`
            UPDATE responses
            SET payout_amount = 0,
                base_payout = 0,
                bonus_payout = 0,
                is_qualified = false,
                disqualification_reasons = ${allocation.disqualificationReasons || []},
                money_state = 'not_qualified',
                locked_at = NULL,
                available_at = NULL
            WHERE id = ${allocation.responseId}
              AND money_state = 'pending_qualification'
            RETURNING id
          `;
          if (!updatedResp) {
            throw new Error(`Response ${allocation.responseId} already in unexpected money_state`);
          }
        }
      }
    });
  } catch (err) {
    const message = (err as Error).message;
    if (message === "PAYOUT_ALREADY_ALLOCATED") {
      throw new Error("Payouts already allocated (concurrent request).");
    }
    if (message === "CAMPAIGN_NOT_FOUND") {
      throw new Error("Campaign not found");
    }
    console.error("[allocatePayoutsV2] Transaction failed:", err);
    captureError(err, { campaignId, operation: "payout.allocate.v2", userId: user.id }, "fatal");
    throw new Error("Payout allocation failed. Please contact support.");
  }

  // Notify respondents
  const { data: campaignForNotif } = await supabase
    .from("campaigns")
    .select("title")
    .eq("id", campaignId)
    .single();

  const v2Notifications = allocations
    .filter((a) => a.qualified && a.amount > 0 && respondentMap.get(a.responseId))
    .map((a) => ({
      userId: respondentMap.get(a.responseId)!,
      type: "payout_earned" as const,
      title: "You earned money!",
      body: `$${a.amount.toFixed(2)} from "${campaignForNotif?.title || "a campaign"}"`,
      campaignId,
      amount: a.amount,
      link: "/dashboard/earnings",
    }));
  if (v2Notifications.length > 0) {
    await createNotifications(v2Notifications);
  }

  // Update reputation for qualified respondents (best-effort — payouts already committed)
  const qualifiedRespondentIds = new Set(
    qualifiedAllocations
      .map((a) => respondentMap.get(a.responseId))
      .filter(Boolean) as string[]
  );
  try {
    await Promise.all(
      Array.from(qualifiedRespondentIds).map((rid) => updateRespondentReputation(rid))
    );
  } catch (repErr) {
    console.error("[allocatePayoutsV2] Reputation update failed (payouts committed):", repErr);
    captureError(repErr, { campaignId, operation: "payout.v2.reputation", respondentCount: qualifiedRespondentIds.size }, "error");
  }

  // Logging
  const amounts = qualifiedAllocations.map((a) => a.amount);
  logOps({
    event: "payout.allocated",
    campaignId,
    distributable,
    totalDistributed: Math.round(totalAllocated * 100) / 100,
    respondentCount: qualifiedAllocations.length,
    avgPayout: amounts.length > 0 ? Math.round((amounts.reduce((a, b) => a + b, 0) / amounts.length) * 100) / 100 : 0,
    minPayout: amounts.length > 0 ? Math.min(...amounts) : 0,
    maxPayout: amounts.length > 0 ? Math.max(...amounts) : 0,
  });

  // Anomaly check
  const delta = Math.round((distributable - totalAllocated) * 100) / 100;
  if (Math.abs(delta) > 0.01) {
    logOps({
      event: "payout.anomaly",
      campaignId,
      anomalyType: "sum_mismatch",
      distributable,
      totalAllocated: Math.round(totalAllocated * 100) / 100,
      delta,
    });
    captureWarning(`V2 Payout sum mismatch: delta=$${delta}`, { campaignId, operation: "payout.anomaly.v2", distributable, totalAllocated: Math.round(totalAllocated * 100) / 100 });
  }

  revalidatePath(`/dashboard/ideas/${campaignId}/responses`);
  revalidatePath("/dashboard/my-responses");
  revalidatePath("/dashboard/earnings");

  return { success: true, count: qualifiedAllocations.length, settledImmediately };
}
