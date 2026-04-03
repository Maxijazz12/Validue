"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { updateRespondentReputation } from "@/lib/reputation";
import { DEFAULTS, safeNumber, safePositive } from "@/lib/defaults";
import { PLATFORM_FEE_RATE } from "@/lib/plans";
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
  // V2 fields (only present when economics_version = 2)
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
    .select("id, creator_id, reward_amount, distributable_amount, economics_version, format, is_subsidized")
    .eq("id", campaignId)
    .eq("creator_id", user.id)
    .single();

  if (!campaign) throw new Error("Campaign not found");

  const distributable = safePositive(campaign.distributable_amount);
  if (distributable <= 0) return { suggestions: [], distributable: 0 };

  // ═══ V2 Economics Branch ═══
  if (campaign.economics_version === 2) {
    return suggestDistributionV2(supabase, campaign, distributable);
  }

  // ═══ V1 Legacy Path (below) ═══

  // Integrity check: distributable must match reward * (1 - fee)
  const expectedDistributable =
    Math.round(safePositive(campaign.reward_amount) * (1 - PLATFORM_FEE_RATE) * 100) / 100;
  if (Math.abs(distributable - expectedDistributable) > 0.02) {
    const err = new Error(
      `Distributable mismatch: stored=${distributable}, expected=${expectedDistributable}. Halting payout.`
    );
    captureError(err, { campaignId, operation: "payout.distributable_check", distributable, expected: expectedDistributable }, "fatal");
    throw err;
  }

  // Fetch ranked responses with confidence for payout gating
  const { data: responses } = await supabase
    .from("responses")
    .select("id, respondent_id, quality_score, scoring_confidence, scoring_source, respondent:profiles!respondent_id(full_name)")
    .eq("campaign_id", campaignId)
    .eq("status", "ranked")
    .order("quality_score", { ascending: false, nullsFirst: false });

  if (!responses || responses.length === 0)
    return { suggestions: [], distributable };

  // Separate high-confidence (weighted) and low-confidence (equal share) responses
  const highConf = responses.filter(
    (r) => safeNumber(r.scoring_confidence, 0) >= DEFAULTS.PAYOUT_CONFIDENCE_THRESHOLD
  );
  const lowConf = responses.filter(
    (r) => safeNumber(r.scoring_confidence, 0) < DEFAULTS.PAYOUT_CONFIDENCE_THRESHOLD
  );

  // Reserve a proportional share for low-confidence responses (equal split)
  const lowConfShare =
    lowConf.length > 0
      ? (lowConf.length / responses.length) * distributable
      : 0;
  const highConfPool = distributable - lowConfShare;

  // V2: Softer power-law weighting (exponent 1.5, threshold 25)
  const scored = highConf.map((r) => {
    const score = safePositive(r.quality_score);
    const shifted = Math.max(score - 25, 0);
    const weight = Math.pow(shifted, 1.5);
    const respondentRaw = r.respondent as unknown;
    const respondent = (
      Array.isArray(respondentRaw) ? respondentRaw[0] : respondentRaw
    ) as { full_name: string } | null;
    return {
      responseId: r.id,
      respondentId: r.respondent_id,
      respondentName: respondent?.full_name || "Anonymous",
      qualityScore: score,
      weight,
      scoringSource: (r.scoring_source as string) || "ai",
      scoringConfidence: safeNumber(r.scoring_confidence, 0.7),
    };
  });

  const totalWeight = scored.reduce((sum, r) => sum + r.weight, 0);

  // Zero-weight fallback: if all high-conf responses score ≤ 25, distribute equally
  const useEqualDistribution = totalWeight === 0;

  let suggestions: PayoutSuggestion[] = [];

  if (useEqualDistribution && scored.length > 0) {
    const equalShare = Math.round((highConfPool / scored.length) * 100) / 100;
    suggestions = scored.map((r) => ({
      ...r,
      suggestedAmount: equalShare,
    }));
  } else if (scored.length > 0) {
    // Initial proportional allocation
    const initialSuggestions: PayoutSuggestion[] = scored.map((r) => ({
      responseId: r.responseId,
      respondentId: r.respondentId,
      respondentName: r.respondentName,
      qualityScore: r.qualityScore,
      suggestedAmount:
        Math.round(((r.weight / totalWeight) * highConfPool) * 100) / 100,
      weight: r.weight,
      scoringSource: r.scoringSource,
      scoringConfidence: r.scoringConfidence,
    }));

    // Proportional redistribution of sub-minimum amounts
    const aboveMin = initialSuggestions.filter(
      (s) => s.suggestedAmount >= DEFAULTS.MIN_PAYOUT
    );
    const belowMinTotal = initialSuggestions
      .filter((s) => s.suggestedAmount < DEFAULTS.MIN_PAYOUT)
      .reduce((sum, s) => sum + s.suggestedAmount, 0);

    suggestions = aboveMin;

    if (belowMinTotal > 0 && suggestions.length > 0) {
      const remainingWeight = suggestions.reduce((s, r) => s + r.weight, 0);
      if (remainingWeight > 0) {
        for (const s of suggestions) {
          s.suggestedAmount += (s.weight / remainingWeight) * belowMinTotal;
          s.suggestedAmount = Math.round(s.suggestedAmount * 100) / 100;
        }
      }
    }
  }

  // Add low-confidence responses with equal share
  if (lowConf.length > 0) {
    const equalLowShare = Math.round((lowConfShare / lowConf.length) * 100) / 100;
    for (const r of lowConf) {
      const respondentRaw = r.respondent as unknown;
      const respondent = (
        Array.isArray(respondentRaw) ? respondentRaw[0] : respondentRaw
      ) as { full_name: string } | null;
      suggestions.push({
        responseId: r.id,
        respondentId: r.respondent_id,
        respondentName: respondent?.full_name || "Anonymous",
        qualityScore: safePositive(r.quality_score),
        suggestedAmount: equalLowShare,
        weight: 0,
        scoringSource: (r.scoring_source as string) || "fallback",
        scoringConfidence: safeNumber(r.scoring_confidence, 0),
      });
    }
  }

  // Remainder reconciliation: ensure sum === distributable to the cent
  const totalAllocated = suggestions.reduce((s, a) => s + a.suggestedAmount, 0);
  const remainder = Math.round((distributable - totalAllocated) * 100) / 100;
  if (suggestions.length > 0 && remainder !== 0) {
    // Sort descending by amount; adjust the top earner
    suggestions.sort((a, b) => b.suggestedAmount - a.suggestedAmount);
    suggestions[0].suggestedAmount =
      Math.round((suggestions[0].suggestedAmount + remainder) * 100) / 100;
  }

  return { suggestions, distributable };
}

export type PayoutAllocation = {
  responseId: string;
  amount: number;
};

export async function allocatePayouts(
  campaignId: string,
  allocations: PayoutAllocation[]
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // Verify ownership and get campaign
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, creator_id, reward_amount, distributable_amount, payout_status")
    .eq("id", campaignId)
    .eq("creator_id", user.id)
    .single();

  if (!campaign) throw new Error("Campaign not found");
  if (campaign.payout_status && campaign.payout_status !== "none" && campaign.payout_status !== "pending")
    throw new Error("Payouts already allocated or completed");

  // Rate limit: 5 allocation attempts per hour
  const rl = rateLimit(`payout:${user.id}`, 3600000, 5);
  if (!rl.allowed) throw new Error("Too many payout attempts. Please wait.");

  const distributable = safePositive(campaign.distributable_amount);

  // Validate all amounts are non-negative
  for (const a of allocations) {
    if (!Number.isFinite(a.amount) || a.amount < 0) {
      throw new Error(`Invalid payout amount: ${a.amount}`);
    }
  }

  // Use integer cents to avoid float accumulation errors
  const totalAllocatedCents = allocations.reduce((s, a) => s + Math.round(a.amount * 100), 0);
  const distributableCents = Math.round(distributable * 100);
  const totalAllocated = totalAllocatedCents / 100; // Dollar value for logging

  if (totalAllocatedCents > distributableCents + 1)
    throw new Error(
      `Total ($${totalAllocated.toFixed(2)}) exceeds distributable amount ($${distributable.toFixed(2)})`
    );

  // Validate all responses belong to this campaign
  const responseIds = allocations.map((a) => a.responseId);
  const { data: responses } = await supabase
    .from("responses")
    .select("id, respondent_id")
    .eq("campaign_id", campaignId)
    .in("id", responseIds);

  if (!responses || responses.length !== responseIds.length)
    throw new Error("Some responses not found");

  const respondentMap = new Map(
    responses.map((r) => [r.id, r.respondent_id])
  );

  // Atomic compare-and-swap: claim payout_status to prevent concurrent allocation.
  // Uses .eq("pending") instead of .neq("allocated") to avoid matching NULL values.
  const { data: locked, error: lockError } = await supabase
    .from("campaigns")
    .update({ payout_status: "allocated" })
    .eq("id", campaignId)
    .eq("creator_id", user.id)
    .eq("payout_status", "pending")
    .select("id");

  if (lockError || !locked || locked.length === 0) {
    throw new Error("Payouts already allocated (concurrent request).");
  }

  // Create payouts and update responses atomically.
  // Platform fee is already deducted in distributable_amount.
  // Payout amount IS the respondent's take-home. platform_fee must be 0.
  try {
    const validAllocations = allocations.filter((a) => {
      return a.amount >= DEFAULTS.MIN_PAYOUT && respondentMap.has(a.responseId);
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TransactionSql loses call signature
    await sql.begin(async (tx: any) => {
      for (const allocation of validAllocations) {
        const respondentId = respondentMap.get(allocation.responseId)!;
        await tx`
          INSERT INTO payouts (response_id, campaign_id, founder_id, respondent_id, amount, platform_fee, status)
          VALUES (${allocation.responseId}, ${campaignId}, ${user.id}, ${respondentId}, ${allocation.amount}, 0, 'pending')
        `;
        await tx`
          UPDATE responses SET payout_amount = ${allocation.amount} WHERE id = ${allocation.responseId}
        `;
      }
    });
  } catch (err) {
    // Transaction rolled back automatically — campaign is marked allocated but no payouts inserted.
    // Reset payout_status so founder can retry.
    await supabase
      .from("campaigns")
      .update({ payout_status: "pending" })
      .eq("id", campaignId)
      .eq("creator_id", user.id);
    console.error("[allocatePayouts] Transaction failed, lock released:", err);
    captureError(err, { campaignId, operation: "payout.allocate", userId: user.id }, "fatal");
    throw new Error(
      "Payout allocation partially failed. Please contact support."
    );
  }

  // Notify respondents about their earnings
  const { data: campaignForNotif } = await supabase
    .from("campaigns")
    .select("title")
    .eq("id", campaignId)
    .single();

  const payoutNotifications = allocations
    .filter((a) => a.amount >= DEFAULTS.MIN_PAYOUT && respondentMap.get(a.responseId))
    .map((a) => ({
      user_id: respondentMap.get(a.responseId)!,
      type: "payout_earned",
      title: "You earned money!",
      body: `$${a.amount} from "${campaignForNotif?.title || "a campaign"}"`,
      campaign_id: campaignId,
      amount: a.amount,
      link: "/dashboard/earnings",
    }));
  if (payoutNotifications.length > 0) {
    await supabase.from("notifications").insert(payoutNotifications);
  }

  // Update reputation for all paid respondents
  const paidRespondentIds = new Set(
    allocations
      .filter((a) => a.amount >= DEFAULTS.MIN_PAYOUT)
      .map((a) => respondentMap.get(a.responseId))
      .filter(Boolean) as string[]
  );
  await Promise.all(
    Array.from(paidRespondentIds).map((rid) => updateRespondentReputation(rid))
  );

  const paidAllocations = allocations.filter((a) => a.amount >= DEFAULTS.MIN_PAYOUT);
  const amounts = paidAllocations.map((a) => a.amount);

  logOps({
    event: "payout.allocated",
    campaignId,
    distributable,
    totalDistributed: Math.round(totalAllocated * 100) / 100,
    respondentCount: paidAllocations.length,
    avgPayout: amounts.length > 0 ? Math.round((amounts.reduce((a, b) => a + b, 0) / amounts.length) * 100) / 100 : 0,
    minPayout: amounts.length > 0 ? Math.min(...amounts) : 0,
    maxPayout: amounts.length > 0 ? Math.max(...amounts) : 0,
  });

  // Check for payout anomalies
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
    captureWarning(`Payout sum mismatch: delta=$${delta}`, { campaignId, operation: "payout.anomaly", distributable, totalAllocated: Math.round(totalAllocated * 100) / 100 });
  }

  revalidatePath(`/dashboard/ideas/${campaignId}/responses`);
  revalidatePath("/dashboard/my-responses");
  revalidatePath("/dashboard/earnings");

  return { success: true, count: paidAllocations.length };
}

/* ═══════════════════════════════════════════════════════════════════════════
 * V2 Economics — base + bonus payout distribution
 * ═══════════════════════════════════════════════════════════════════════════ */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function suggestDistributionV2(supabase: any, campaign: any, distributable: number) {
  const format: CampaignFormat = campaign.format === "quick" ? "quick" : "standard";
  const isSubsidized = campaign.is_subsidized === true;

  // Fetch ranked responses with answer metadata for qualification
  const { data: responses } = await supabase
    .from("responses")
    .select(`
      id, respondent_id, quality_score, scoring_confidence, scoring_source,
      respondent:profiles!respondent_id(full_name),
      answers(metadata)
    `)
    .eq("campaign_id", campaign.id)
    .eq("status", "ranked")
    .order("quality_score", { ascending: false, nullsFirst: false });

  if (!responses || responses.length === 0)
    return { suggestions: [], distributable };

  // Build ScoredResponse[] and ResponseMetadata[] for qualification
  const scoredResponses: ScoredResponse[] = [];
  const metadataMap = new Map<string, ResponseMetadata>();

  for (const r of responses) {
    const respondentRaw = r.respondent as unknown;
    const respondent = (
      Array.isArray(respondentRaw) ? respondentRaw[0] : respondentRaw
    ) as { full_name: string } | null;

    scoredResponses.push({
      responseId: r.id,
      respondentId: r.respondent_id,
      respondentName: respondent?.full_name || "Anonymous",
      qualityScore: safePositive(r.quality_score),
      confidence: safeNumber(r.scoring_confidence, 0.7),
    });

    // Compute total time and open answer metadata from answer records
    const answers = (r.answers || []) as { metadata: Record<string, unknown> }[];
    let totalTimeMs = 0;
    const openAnswers: { charCount: number }[] = [];
    let pasteHeavyCount = 0;

    for (const a of answers) {
      const meta = a.metadata || {};
      totalTimeMs += Math.max(0, Number(meta.timeSpentMs) || 0);
      const charCount = Math.max(0, Number(meta.charCount) || 0);
      if (charCount > 0) openAnswers.push({ charCount });
      const pasteCount = Math.max(0, Number(meta.pasteCount) || 0);
      if (pasteCount >= DEFAULTS.SPAM_MAX_PASTE_COUNT) pasteHeavyCount++;
    }

    const spamFlagged =
      answers.length > 0 &&
      pasteHeavyCount / answers.length >= DEFAULTS.SPAM_PASTE_ANSWER_RATIO;

    metadataMap.set(r.id, { totalTimeMs, openAnswers, spamFlagged });
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
    .select("id, creator_id, reward_amount, distributable_amount, payout_status, economics_version")
    .eq("id", campaignId)
    .eq("creator_id", user.id)
    .single();

  if (!campaign) throw new Error("Campaign not found");
  if (campaign.economics_version !== 2) throw new Error("Use V1 allocatePayouts for this campaign");
  if (campaign.payout_status === "allocated")
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

  // Validate all responses belong to this campaign
  const responseIds = allocations.map((a) => a.responseId);
  const { data: responses } = await supabase
    .from("responses")
    .select("id, respondent_id")
    .eq("campaign_id", campaignId)
    .in("id", responseIds);

  if (!responses || responses.length !== responseIds.length) {
    throw new Error("Some responses not found or don't belong to this campaign");
  }
  const respondentMap = new Map(responses.map((r: { id: string; respondent_id: string }) => [r.id, r.respondent_id]));

  // Atomic CAS lock — uses .eq("pending") to avoid matching NULL payout_status
  const { data: locked, error: lockError } = await supabase
    .from("campaigns")
    .update({ payout_status: "allocated" })
    .eq("id", campaignId)
    .eq("creator_id", user.id)
    .eq("payout_status", "pending")
    .select("id");

  if (lockError || !locked || locked.length === 0) {
    throw new Error("Payouts already allocated (concurrent request).");
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await sql.begin(async (tx: any) => {
      for (const allocation of allocations) {
        const respondentId = respondentMap.get(allocation.responseId);
        if (!respondentId) continue;

        if (allocation.qualified && allocation.amount > 0) {
          // Create payout record
          await tx`
            INSERT INTO payouts (response_id, campaign_id, founder_id, respondent_id, amount, base_amount, bonus_amount, platform_fee, status)
            VALUES (${allocation.responseId}, ${campaignId}, ${user.id}, ${respondentId}, ${allocation.amount}, ${allocation.basePayout}, ${allocation.bonusPayout}, 0, 'pending')
          `;
          // Update response with V2 payout fields + money state
          // Guard: only transition from pending_qualification (CAS lock prevents re-entry)
          const [updatedResp] = await tx`
            UPDATE responses
            SET payout_amount = ${allocation.amount},
                base_payout = ${allocation.basePayout},
                bonus_payout = ${allocation.bonusPayout},
                is_qualified = true,
                money_state = 'locked',
                locked_at = NOW()
            WHERE id = ${allocation.responseId}
              AND money_state = 'pending_qualification'
            RETURNING id
          `;
          if (!updatedResp) {
            throw new Error(`Response ${allocation.responseId} already in unexpected money_state`);
          }
          // Update respondent pending balance
          const amountCents = Math.round(allocation.amount * 100);
          await tx`
            UPDATE profiles
            SET pending_balance_cents = pending_balance_cents + ${amountCents}
            WHERE id = ${respondentId}
          `;
        } else {
          // Disqualified response
          await tx`
            UPDATE responses
            SET payout_amount = 0,
                base_payout = 0,
                bonus_payout = 0,
                is_qualified = false,
                disqualification_reasons = ${allocation.disqualificationReasons || []},
                money_state = 'not_qualified'
            WHERE id = ${allocation.responseId}
          `;
        }
      }
    });
  } catch (err) {
    // Release lock on failure
    await supabase
      .from("campaigns")
      .update({ payout_status: "pending" })
      .eq("id", campaignId)
      .eq("creator_id", user.id);
    console.error("[allocatePayoutsV2] Transaction failed, lock released:", err);
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
      user_id: respondentMap.get(a.responseId)!,
      type: "payout_earned",
      title: "You earned money!",
      body: `$${a.amount.toFixed(2)} from "${campaignForNotif?.title || "a campaign"}"`,
      campaign_id: campaignId,
      amount: a.amount,
      link: "/dashboard/earnings",
    }));
  if (v2Notifications.length > 0) {
    await supabase.from("notifications").insert(v2Notifications);
  }

  // Update reputation for qualified respondents
  const qualifiedRespondentIds = new Set(
    qualifiedAllocations
      .map((a) => respondentMap.get(a.responseId))
      .filter(Boolean) as string[]
  );
  await Promise.all(
    Array.from(qualifiedRespondentIds).map((rid) => updateRespondentReputation(rid))
  );

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

  return { success: true, count: qualifiedAllocations.length };
}
