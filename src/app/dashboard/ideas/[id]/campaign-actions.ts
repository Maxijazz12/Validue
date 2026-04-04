"use server";

import { createClient } from "@/lib/supabase/server";
import sql from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { logOps } from "@/lib/ops-logger";
import { createNotification } from "@/lib/notifications";
import { captureWarning } from "@/lib/sentry";
import { durableRateLimit } from "@/lib/durable-rate-limit";
import { completeCampaignWithinTransaction } from "@/lib/campaign-completion";
import {
  buildCopiedCampaignDraft,
  buildCopiedQuestionRecords,
} from "@/lib/campaign-draft-persistence";

export async function completeCampaign(
  campaignId: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  const rl = await durableRateLimit(`complete:${user.id}`, 60000, 5);
  if (!rl.allowed) return { error: "Too many requests. Please slow down." };

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TransactionSql loses call signature
    const result = await sql.begin(async (tx: any) => {
      return completeCampaignWithinTransaction(tx, {
        campaignId,
        creatorId: user.id,
      });
    });

    if (result.kind !== "completed") {
      return { error: "Campaign not found or already completed." };
    }
    logOps({ event: "campaign.status_changed", campaignId, fromStatus: "active", toStatus: "completed", triggeredBy: "user" });

    await createNotification({
      userId: user.id,
      type: "campaign_completed",
      title: "Campaign complete!",
      body:
        result.releasedCount > 0
          ? `"${result.title}" is complete. ${result.releasedCount} payout${result.releasedCount === 1 ? "" : "s"} ${result.releasedCount === 1 ? "is" : "are"} now available.`
          : `"${result.title}" has reached its response target.`,
      campaignId,
      link: `/dashboard/ideas/${campaignId}/responses`,
    });
  } catch (err) {
    console.error("[completeCampaign] DB error:", err);
    captureWarning(`completeCampaign failed: ${(err as Error).message}`, { campaignId, operation: "campaign.complete" });
    return { error: "Failed to complete campaign." };
  }

  revalidatePath(`/dashboard/ideas/${campaignId}`);
  revalidatePath(`/dashboard/ideas/${campaignId}/responses`);
  revalidatePath("/dashboard/earnings");
  return { success: true };
}

export async function pauseCampaign(
  campaignId: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  const rl = await durableRateLimit(`pause:${user.id}`, 60000, 10);
  if (!rl.allowed) return { error: "Too many requests. Please slow down." };

  try {
    const result = await sql`
      UPDATE campaigns
      SET status = 'paused', updated_at = NOW()
      WHERE id = ${campaignId}
        AND creator_id = ${user.id}
        AND status = 'active'
      RETURNING id
    `;
    if (result.length === 0) return { error: "Campaign not found or not active." };
    logOps({ event: "campaign.status_changed", campaignId, fromStatus: "active", toStatus: "paused", triggeredBy: "user" });
  } catch (err) {
    console.error("[pauseCampaign] DB error:", err);
    captureWarning(`pauseCampaign failed: ${(err as Error).message}`, { campaignId, operation: "campaign.pause" });
    return { error: "Failed to pause campaign." };
  }

  revalidatePath(`/dashboard/ideas/${campaignId}`);
  return { success: true };
}

export async function resumeCampaign(
  campaignId: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  const rl = await durableRateLimit(`pause:${user.id}`, 60000, 10);
  if (!rl.allowed) return { error: "Too many requests. Please slow down." };

  try {
    const result = await sql`
      UPDATE campaigns
      SET status = 'active',
          expires_at = CASE
            WHEN expires_at IS NOT NULL
            THEN expires_at + (NOW() - updated_at)
            ELSE NULL
          END,
          updated_at = NOW()
      WHERE id = ${campaignId}
        AND creator_id = ${user.id}
        AND status = 'paused'
      RETURNING id
    `;
    if (result.length === 0) return { error: "Campaign not found or not paused." };
    logOps({ event: "campaign.status_changed", campaignId, fromStatus: "paused", toStatus: "active", triggeredBy: "user" });
  } catch (err) {
    console.error("[resumeCampaign] DB error:", err);
    captureWarning(`resumeCampaign failed: ${(err as Error).message}`, { campaignId, operation: "campaign.resume" });
    return { error: "Failed to resume campaign." };
  }

  revalidatePath(`/dashboard/ideas/${campaignId}`);
  return { success: true };
}

export async function retestCampaign(campaignId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  // Fetch original campaign
  const { data: original } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .eq("creator_id", user.id)
    .single();

  if (!original) return { error: "Campaign not found." };
  if (original.status !== "completed") return { error: "Only completed campaigns can be retested." };

  // Rate limit: reuse same clone bucket
  const rl = await durableRateLimit(`clone:${user.id}`, 3600000, 10);
  if (!rl.allowed) return { error: "Too many operations. Please wait." };

  // Compute round number and title
  const newRound = (original.round_number ?? 1) + 1;
  const strippedTitle = (original.title as string).replace(/^Round \d+: /, "");
  const newTitle = `Round ${newRound}: ${strippedTitle}`;

  // Fetch original questions
  const { data: questions } = await supabase
    .from("questions")
    .select("text, type, sort_order, options, is_baseline, category, assumption_index, anchors")
    .eq("campaign_id", campaignId)
    .order("sort_order", { ascending: true });
  const copiedCampaign = buildCopiedCampaignDraft(original, {
    title: newTitle,
    rewardAmount: 0,
  });
  const copiedQuestions = buildCopiedQuestionRecords(questions || []);

  let newId: string;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TransactionSql loses call signature
    const result = await sql.begin(async (tx: any) => {
      const [campaign] = await tx`
        INSERT INTO campaigns (
          creator_id, title, description, status, category, tags,
          estimated_minutes, reward_amount, reward_type,
          bonus_available, rewards_top_answers,
          format,
          target_interests, target_expertise, target_age_ranges, target_location,
          key_assumptions,
          audience_occupation, audience_industry, audience_experience_level, audience_niche_qualifier,
          quality_scores, quality_score,
          parent_campaign_id, round_number
        ) VALUES (
          ${user.id}, ${copiedCampaign.title}, ${copiedCampaign.summary}, 'draft',
          ${copiedCampaign.category}, ${copiedCampaign.tags},
          ${copiedCampaign.estimatedMinutes}, ${copiedCampaign.rewardAmount}, ${copiedCampaign.rewardType},
          ${copiedCampaign.bonusAvailable}, ${copiedCampaign.rewardsTopAnswers},
          ${copiedCampaign.format},
          ${copiedCampaign.targetInterests}, ${copiedCampaign.targetExpertise}, ${copiedCampaign.targetAgeRanges}, ${copiedCampaign.targetLocation},
          ${copiedCampaign.keyAssumptions},
          ${copiedCampaign.audienceOccupation}, ${copiedCampaign.audienceIndustry}, ${copiedCampaign.audienceExperienceLevel}, ${copiedCampaign.audienceNicheQualifier},
          ${copiedCampaign.qualityScoresJson}::jsonb, ${copiedCampaign.qualityScore},
          ${campaignId}, ${newRound}
        )
        RETURNING id
      `;

      for (const question of copiedQuestions) {
        await tx`
          INSERT INTO questions (campaign_id, text, type, sort_order, options, is_baseline, category, assumption_index, anchors)
          VALUES (${campaign.id}, ${question.text}, ${question.type}, ${question.sortOrder}, ${question.optionsJson}::jsonb, ${question.isBaseline}, ${question.category}, ${question.assumptionIndex}, ${question.anchorsJson}::jsonb)
        `;
      }

      return campaign;
    });

    newId = result.id;

    logOps({
      event: "campaign.retested",
      originalCampaignId: campaignId,
      newCampaignId: newId,
      creatorId: user.id,
      roundNumber: newRound,
    });
  } catch (err) {
    console.error("[retestCampaign] DB error:", err);
    captureWarning(`retestCampaign failed: ${(err as Error).message}`, { campaignId, operation: "campaign.retest" });
    return { error: "Failed to create retest campaign." };
  }

  redirect(`/dashboard/ideas/${newId}`);
}

export async function cloneCampaign(campaignId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  // Fetch original campaign
  const { data: original } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .eq("creator_id", user.id)
    .single();

  if (!original) return { error: "Campaign not found." };

  // Rate limit: 10 clones per hour
  const rl = await durableRateLimit(`clone:${user.id}`, 3600000, 10);
  if (!rl.allowed) return { error: "Too many duplications. Please wait." };

  // Fetch original questions
  const { data: questions } = await supabase
    .from("questions")
    .select("text, type, sort_order, options, is_baseline, category, assumption_index, anchors")
    .eq("campaign_id", campaignId)
    .order("sort_order", { ascending: true });
  const copiedCampaign = buildCopiedCampaignDraft(original, {
    title: `(Copy) ${original.title}`,
    rewardAmount: 0,
  });
  const copiedQuestions = buildCopiedQuestionRecords(questions || []);

  let newId: string;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TransactionSql loses call signature
    const result = await sql.begin(async (tx: any) => {
      const [campaign] = await tx`
        INSERT INTO campaigns (
          creator_id, title, description, status, category, tags,
          estimated_minutes, reward_amount, reward_type,
          bonus_available, rewards_top_answers,
          format,
          target_interests, target_expertise, target_age_ranges, target_location,
          key_assumptions,
          audience_occupation, audience_industry, audience_experience_level, audience_niche_qualifier,
          quality_scores, quality_score
        ) VALUES (
          ${user.id}, ${copiedCampaign.title}, ${copiedCampaign.summary}, 'draft',
          ${copiedCampaign.category}, ${copiedCampaign.tags},
          ${copiedCampaign.estimatedMinutes}, ${copiedCampaign.rewardAmount}, ${copiedCampaign.rewardType},
          ${copiedCampaign.bonusAvailable}, ${copiedCampaign.rewardsTopAnswers},
          ${copiedCampaign.format},
          ${copiedCampaign.targetInterests}, ${copiedCampaign.targetExpertise}, ${copiedCampaign.targetAgeRanges}, ${copiedCampaign.targetLocation},
          ${copiedCampaign.keyAssumptions},
          ${copiedCampaign.audienceOccupation}, ${copiedCampaign.audienceIndustry}, ${copiedCampaign.audienceExperienceLevel}, ${copiedCampaign.audienceNicheQualifier},
          ${copiedCampaign.qualityScoresJson}::jsonb, ${copiedCampaign.qualityScore}
        )
        RETURNING id
      `;

      for (const question of copiedQuestions) {
        await tx`
          INSERT INTO questions (campaign_id, text, type, sort_order, options, is_baseline, category, assumption_index, anchors)
          VALUES (${campaign.id}, ${question.text}, ${question.type}, ${question.sortOrder}, ${question.optionsJson}::jsonb, ${question.isBaseline}, ${question.category}, ${question.assumptionIndex}, ${question.anchorsJson}::jsonb)
        `;
      }

      return campaign;
    });

    newId = result.id;

    logOps({
      event: "campaign.cloned",
      originalCampaignId: campaignId,
      newCampaignId: newId,
      creatorId: user.id,
    });
  } catch (err) {
    console.error("[cloneCampaign] DB error:", err);
    captureWarning(`cloneCampaign failed: ${(err as Error).message}`, { campaignId, operation: "campaign.clone" });
    return { error: "Failed to duplicate campaign." };
  }

  redirect(`/dashboard/ideas/${newId}`);
}
