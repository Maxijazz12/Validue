"use server";

import { createClient } from "@/lib/supabase/server";
import sql from "@/lib/db";
import { getSubscription } from "@/lib/plan-guard";
import { calculateReach, validateFunding } from "@/lib/reach";
import { PLAN_CONFIG, PLATFORM_FEE_RATE } from "@/lib/plans";
import { defaultTargetResponses, type CampaignFormat } from "@/lib/payout-math";
import { DEFAULTS } from "@/lib/defaults";
import { revalidatePath } from "next/cache";
import { logOps } from "@/lib/ops-logger";
import { captureError } from "@/lib/sentry";

/**
 * Updates a pending_funding campaign's reward amount and recalculates reach.
 * Allows founders to set/change funding from the campaign detail page.
 */
export async function updateCampaignFunding(
  campaignId: string,
  rewardAmount: number
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  // Verify ownership and status
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, creator_id, status")
    .eq("id", campaignId)
    .eq("creator_id", user.id)
    .single();

  if (!campaign) return { error: "Campaign not found." };
  if (campaign.status !== "pending_funding") {
    return { error: "Campaign can only be updated while pending funding." };
  }

  // Validate amount against tier
  const sub = await getSubscription(user.id);
  const fundingCheck = validateFunding(sub.tier, rewardAmount);
  if (!fundingCheck.valid) {
    return { error: fundingCheck.reason ?? "Invalid funding amount." };
  }

  // Fetch quality score and format from campaign for reach + target calculation
  const { data: campaignData } = await supabase
    .from("campaigns")
    .select("quality_score, format")
    .eq("id", campaignId)
    .single();

  const qualityScore = campaignData?.quality_score ?? DEFAULTS.QUALITY_SCORE;
  const format: CampaignFormat = (campaignData?.format as CampaignFormat) || "quick";

  // Calculate reach and distributable amount (with quality modifier)
  const reach = calculateReach(sub.tier, rewardAmount, { qualityScore });
  const planConfig = PLAN_CONFIG[sub.tier];
  const distributableAmount = rewardAmount > 0
    ? Math.round(rewardAmount * (1 - PLATFORM_FEE_RATE) * 100) / 100
    : 0;
  const targetResponses = distributableAmount > 0
    ? defaultTargetResponses(distributableAmount, format)
    : 0;

  try {
    await sql`
      UPDATE campaigns
      SET reward_amount = ${rewardAmount},
          distributable_amount = ${distributableAmount},
          target_responses = ${targetResponses || null},
          baseline_reach_units = ${reach.baselineRU},
          funded_reach_units = ${reach.fundedRU},
          total_reach_units = ${reach.totalRU},
          effective_reach_units = ${reach.effectiveReach},
          campaign_strength = ${reach.campaignStrength},
          estimated_responses_low = ${reach.estimatedResponsesLow},
          estimated_responses_high = ${reach.estimatedResponsesHigh},
          match_priority = ${planConfig.matchPriority},
          updated_at = NOW()
      WHERE id = ${campaignId}
        AND creator_id = ${user.id}
        AND status = 'pending_funding'
    `;
  } catch (err) {
    console.error("[updateCampaignFunding] DB error:", err);
    captureError(err, { campaignId, userId: user.id, operation: "campaign.funding" });
    return { error: "Failed to update campaign. Please try again." };
  }

  logOps({
    event: "campaign.published",
    campaignId,
    creatorId: user.id,
    tier: sub.tier,
    fundingAmount: rewardAmount,
    status: "pending_funding",
    qualityScore,
    effectiveReach: reach.effectiveReach,
    campaignStrength: reach.campaignStrength,
  });

  revalidatePath(`/dashboard/ideas/${campaignId}`);
  return { success: true };
}
