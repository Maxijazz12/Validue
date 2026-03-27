"use server";

import { createClient } from "@/lib/supabase/server";
import sql from "@/lib/db";
import type { CampaignDraft } from "@/lib/ai/types";
import { canCreateCampaign, incrementCampaignUsage, isFirstCampaign, isFirstMonth } from "@/lib/plan-guard";
import { calculateReach, validateFunding } from "@/lib/reach";
import { PLAN_CONFIG, PLATFORM_FEE_RATE } from "@/lib/plans";

export async function publishCampaign(
  draft: CampaignDraft
): Promise<{ id: string } | { error: string }> {
  // 1. Authenticate via Supabase SDK
  let user;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      console.error("[publishCampaign] Auth failed:", error?.message ?? "No user session");
      return { error: "Not authenticated. Please sign in again." };
    }
    user = data.user;
  } catch (err) {
    console.error("[publishCampaign] Auth exception:", err);
    return { error: "Authentication service unavailable." };
  }

  // 2. Check tier allowance
  const allowance = await canCreateCampaign(user.id);
  if (!allowance.allowed) {
    return { error: allowance.reason ?? "Campaign limit reached for this period." };
  }

  // 3. Validate funding amount against tier minimum
  const fundingAmount = draft.rewardPool || 0;
  const fundingCheck = validateFunding(allowance.tier, fundingAmount);
  if (!fundingCheck.valid) {
    return { error: fundingCheck.reason ?? "Invalid funding amount." };
  }

  // 4. Calculate reach units
  const firstMonth = allowance.isFirstMonth;
  const firstCampaign = allowance.tier === "free" && firstMonth
    ? await isFirstCampaign(user.id)
    : false;

  const reach = calculateReach(allowance.tier, fundingAmount, {
    isFirstMonth: firstMonth,
    isFirstCampaign: firstCampaign,
  });

  const planConfig = PLAN_CONFIG[allowance.tier];

  // 5. Prepare values
  const estimatedMinutes = Math.max(5, Math.ceil(draft.questions.length * 1.5));
  const distributableAmount = fundingAmount
    ? Math.round(fundingAmount * (1 - PLATFORM_FEE_RATE) * 100) / 100
    : 0;
  const keyAssumptions = draft.assumptions.filter((a) => a.trim().length > 0);

  // 6. Atomic transaction: profile + campaign + questions
  try {
    const result = await sql.begin(async (tx) => {
      // Ensure profile exists (trigger may not have fired)
      await tx`
        INSERT INTO profiles (id, full_name, role)
        VALUES (${user.id}, ${user.user_metadata?.full_name || user.email || "User"}, 'founder')
        ON CONFLICT (id) DO NOTHING
      `;

      const [campaign] = await tx`
        INSERT INTO campaigns (
          creator_id, title, description, status,
          category, tags, estimated_minutes,
          reward_amount, reward_type, bonus_available, rewards_top_answers,
          distributable_amount,
          target_interests, target_expertise, target_age_ranges, target_location,
          key_assumptions,
          audience_occupation, audience_industry, audience_experience_level, audience_niche_qualifier,
          quality_scores,
          baseline_reach_units, funded_reach_units, total_reach_units,
          estimated_responses_low, estimated_responses_high, match_priority
        ) VALUES (
          ${user.id}, ${draft.title}, ${draft.summary}, 'pending_funding',
          ${draft.category}, ${draft.tags}, ${estimatedMinutes},
          ${fundingAmount}, ${draft.rewardType || "pool"}, ${!!draft.bonusAvailable}, ${!!draft.rewardsTopAnswers},
          ${distributableAmount},
          ${draft.audience.interests}, ${draft.audience.expertise}, ${draft.audience.ageRanges}, ${draft.audience.location || null},
          ${keyAssumptions},
          ${draft.audience.occupation || null}, ${draft.audience.industry || null}, ${draft.audience.experienceLevel || null}, ${draft.audience.nicheQualifier || null},
          ${draft.qualityScores ? JSON.stringify(draft.qualityScores) : null}::jsonb,
          ${reach.baselineRU}, ${reach.fundedRU}, ${reach.totalRU},
          ${reach.estimatedResponsesLow}, ${reach.estimatedResponsesHigh}, ${planConfig.matchPriority}
        )
        RETURNING id
      `;

      for (let i = 0; i < draft.questions.length; i++) {
        const q = draft.questions[i];
        await tx`
          INSERT INTO questions (campaign_id, text, type, sort_order, options, is_baseline, category)
          VALUES (
            ${campaign.id},
            ${q.text},
            ${q.type},
            ${i},
            ${q.options ? JSON.stringify(q.options) : null}::jsonb,
            ${q.isBaseline},
            ${q.category || null}
          )
        `;
      }

      return campaign;
    });

    // Increment usage counter after successful publish
    await incrementCampaignUsage(user.id);

    return { id: result.id };
  } catch (err) {
    const message = (err as Error).message || "Unknown database error";
    console.error("[publishCampaign] DB error:", message);

    if (message.includes("password authentication failed") || message.includes("SASL")) {
      return { error: "Database connection failed. Please contact support." };
    }
    if (message.includes("violates foreign key")) {
      return { error: "Data integrity error. Please try again." };
    }
    if (message.includes("timeout") || message.includes("ECONNREFUSED")) {
      return { error: "Database temporarily unavailable. Please retry." };
    }

    return { error: "Failed to publish campaign. Please try again." };
  }
}
