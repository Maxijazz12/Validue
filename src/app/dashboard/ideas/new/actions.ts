"use server";

import { createClient } from "@/lib/supabase/server";
import sql from "@/lib/db";
import type { CampaignDraft } from "@/lib/ai/types";
import { canCreateCampaign, isFirstCampaign, checkSubsidyEligibility } from "@/lib/plan-guard";
import { calculateReach, validateFunding } from "@/lib/reach";
import { PLAN_CONFIG, PLATFORM_FEE_RATE, normalizeTier } from "@/lib/plans";
import { DEFAULTS } from "@/lib/defaults";
import {
  defaultTargetResponses,
  defaultUnpaidTargetResponses,
  type CampaignFormat,
} from "@/lib/payout-math";
import { logOps } from "@/lib/ops-logger";
import { captureError } from "@/lib/sentry";
import { checkMultipleFields, enforceLength, MAX_LENGTHS } from "@/lib/content-filter";
import { durableRateLimit } from "@/lib/durable-rate-limit";
import { rateLimit } from "@/lib/rate-limit";
import { initialGateStatus, requiresGate } from "@/lib/reciprocal-gate";
import { hasReciprocalCampaigns } from "@/app/dashboard/ideas/new/reciprocal-actions";

export async function publishCampaign(
  draft: CampaignDraft,
  opts?: { gatePreCleared?: boolean; coldStart?: boolean }
): Promise<{ id: string; gatePending?: boolean } | { error: string }> {
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

  // Rate limit: 5 publishes per hour
  const rl = await durableRateLimit(`publish:${user.id}`, 3600000, 5);
  if (!rl.allowed) {
    return { error: "Too many campaigns created. Please wait before publishing again." };
  }
  // Double-publish guard: 1 publish per 10 seconds
  const dedup = await durableRateLimit(`publish-dedup:${user.id}`, 10000, 1);
  if (!dedup.allowed) {
    return { error: "Campaign already being published. Please wait." };
  }

  // 2. Check tier allowance
  const allowance = await canCreateCampaign(user.id);
  if (!allowance.allowed) {
    return { error: allowance.reason ?? "Campaign limit reached for this period." };
  }

  // 3. Input validation — emptiness, length, and count guards
  if (!draft.title?.trim()) return { error: "Title is required." };
  if (!draft.summary?.trim()) return { error: "Summary is required." };
  draft.title = enforceLength(draft.title, MAX_LENGTHS.TITLE).text;
  draft.summary = enforceLength(draft.summary, MAX_LENGTHS.SUMMARY).text;
  if (draft.tags && draft.tags.length > 5) return { error: "Maximum 5 tags allowed." };

  // 3a. Content moderation check
  const contentFields = [
    { name: "title", text: draft.title },
    { name: "summary", text: draft.summary },
    ...draft.assumptions.map((a, i) => ({ name: `assumption_${i}`, text: a })),
    ...draft.tags.map((t, i) => ({ name: `tag_${i}`, text: enforceLength(t, MAX_LENGTHS.TAG).text })),
    ...draft.questions.map((q, i) => ({ name: `question_${i}`, text: q.text })),
  ];
  const contentCheck = checkMultipleFields(contentFields);
  if (!contentCheck.allowed) {
    logOps({ event: "content.flagged", userId: user.id, fieldName: contentCheck.fieldName ?? "unknown", action: "blocked", reason: contentCheck.reason ?? "", entryPoint: "publishCampaign" });
    return { error: contentCheck.reason ?? "Content policy violation." };
  }
  if (contentCheck.flagged) {
    logOps({ event: "content.flagged", userId: user.id, fieldName: contentCheck.fieldName ?? "unknown", action: "flagged", reason: contentCheck.reason ?? "", entryPoint: "publishCampaign" });
  }

  // Enforce tag length limits
  draft.tags = draft.tags.map((t) => enforceLength(t, MAX_LENGTHS.TAG).text);

  // 3b. Enforce behavioral screening — at least 1 baseline question required
  const baselineCount = draft.questions.filter((q) => q.isBaseline).length;
  if (baselineCount === 0) {
    return { error: "Campaign must include at least 1 behavioral screening question. Re-generate or add a baseline question." };
  }

  // 3c. Minimum total question count
  if (draft.questions.length < 3) {
    return { error: "Campaign must have at least 3 questions." };
  }

  // 3d. Validate question types and MC options
  const VALID_QUESTION_TYPES = new Set(["open", "multiple_choice"]);
  for (const q of draft.questions) {
    if (!VALID_QUESTION_TYPES.has(q.type)) {
      return { error: `Invalid question type: ${q.type}` };
    }
    if (q.type === "multiple_choice" && (!q.options || q.options.length < 2)) {
      return { error: "Multiple choice questions need at least 2 options." };
    }
  }

  // 4. Validate funding amount against tier minimum
  let fundingAmount = draft.rewardPool || 0;
  let isSubsidized = false;

  // V2: Check subsidy eligibility for $0 campaigns
  if (fundingAmount === 0) {
    const subsidy = await checkSubsidyEligibility(user.id);
    if (subsidy.eligible) {
      isSubsidized = true;
      fundingAmount = 0; // stays 0 — platform funds internally
    }
    // If not eligible and fundingAmount is 0, let it through as a free (unfunded) campaign
  }

  if (!isSubsidized && fundingAmount > 0) {
    const fundingCheck = validateFunding(allowance.tier, fundingAmount);
    if (!fundingCheck.valid) {
      return { error: fundingCheck.reason ?? "Invalid funding amount." };
    }
  }

  // 4. Calculate reach units (with quality modifier)
  const firstMonth = allowance.isFirstMonth;
  const firstCampaign = allowance.tier === "free" && firstMonth
    ? await isFirstCampaign(user.id)
    : false;

  const qualityScore = draft.qualityScores?.overall ?? 70;

  const reach = calculateReach(allowance.tier, fundingAmount, {
    isFirstMonth: firstMonth,
    isFirstCampaign: firstCampaign,
    qualityScore,
    rankedResponseCount: 0,
  });

  const planConfig = PLAN_CONFIG[allowance.tier];

  // 5. Prepare values
  const format: CampaignFormat = isSubsidized ? "quick" : (draft.format === "standard" ? "standard" : "quick");
  const estimatedMinutes = format === "quick" ? 3 : 5;

  // Subsidized campaigns: platform-funded, no platform fee
  const distributableAmount = isSubsidized
    ? DEFAULTS.SUBSIDY_BUDGET_PER_CAMPAIGN
    : (fundingAmount ? Math.round(fundingAmount * (1 - PLATFORM_FEE_RATE) * 100) / 100 : 0);
  const targetResponses = isSubsidized
    ? DEFAULTS.SUBSIDY_TARGET_RESPONSES
    : distributableAmount > 0
      ? defaultTargetResponses(distributableAmount, format)
      : defaultUnpaidTargetResponses(reach.estimatedResponsesLow);

  // V2 publish-time constraint: payout per response >= MIN_BASE_PAYOUT
  // V2 uses flat equal split of full distributable pool (no base/bonus split)
  if (distributableAmount > 0) {
    const payPerResponse = distributableAmount / Math.max(targetResponses, 1);
    if (payPerResponse < DEFAULTS.MIN_BASE_PAYOUT) {
      return { error: `Budget too low for target response count. Minimum pay per response is $${DEFAULTS.MIN_BASE_PAYOUT.toFixed(2)}.` };
    }
  }

  const keyAssumptions = draft.assumptions
    .filter((a) => a.trim().length > 0)
    .map((a) => enforceLength(a, 500).text);
  if (keyAssumptions.length === 0) {
    return { error: "At least one assumption is required." };
  }
  // Determine initial status:
  // - Subsidized → active immediately
  // - Paid campaigns → pending_funding until Stripe funding clears
  // - Unpaid campaigns → active immediately unless reciprocal gate is pending
  const gateRequired = requiresGate(allowance.tier) && !isSubsidized;

  // Verify gate clearance server-side — don't trust the client flag alone
  let gateAlreadyCleared = false;
  if (gateRequired && opts?.gatePreCleared) {
    const [reciprocalCheck] = await sql`
      SELECT COUNT(*)::int AS completed
      FROM responses
      WHERE respondent_id = ${user.id}
        AND status IN ('submitted', 'ranked')
        AND created_at > NOW() - INTERVAL '1 hour'
    `;
    gateAlreadyCleared = (reciprocalCheck?.completed ?? 0) >= 1;
  }

  // Cold-start exemption: no campaigns available for the gate
  if (gateRequired && !gateAlreadyCleared && opts?.coldStart) {
    const hasCampaigns = await hasReciprocalCampaigns();
    if (!hasCampaigns) {
      gateAlreadyCleared = true;
      logOps({
        event: "reciprocal_gate.cold_start_exempt",
        userId: user.id,
        reason: "No eligible campaigns available for reciprocal gate",
      });
    }
  }
  const gateStatus = isSubsidized
    ? null
    : gateAlreadyCleared
      ? ("cleared" as const)
      : initialGateStatus(allowance.tier);
  // If the reciprocal gate is required but not cleared, reject the publish.
  // The pre-publish reciprocal flow (GeneratingStep) should always clear it;
  // pending_gate had no activation path (incrementReciprocalGate was never called).
  if (gateRequired && !gateAlreadyCleared) {
    return { error: "Please complete the reciprocal questions before publishing." };
  }

  const initialStatus = isSubsidized
    ? "active"
    : fundingAmount > 0
      ? "pending_funding"
      : "active";
  // Subsidized: use subsidy budget as reward_amount for display; funded: use actual amount
  const effectiveRewardAmount = isSubsidized ? DEFAULTS.SUBSIDY_BUDGET_PER_CAMPAIGN : fundingAmount;

  // 6. Atomic transaction: profile + campaign + questions
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TransactionSql loses call signature via Omit<Sql>
    const result = await sql.begin(async (tx: any) => {
      // Advisory lock on user to prevent concurrent publishes racing past the limit check
      await tx`SELECT pg_advisory_xact_lock(hashtext('publish:' || ${user.id}))`;

      // Re-check campaign count inside transaction to close TOCTOU window
      const [subscriptionRow] = await tx`
        SELECT tier, current_period_start, current_period_end
        FROM subscriptions
        WHERE user_id = ${user.id}
        LIMIT 1
      `;

      const subTier = normalizeTier(subscriptionRow?.tier) ?? "free";
      const [countRow] = subscriptionRow?.current_period_end && subTier !== "free"
        ? await tx`
            SELECT COUNT(*)::int AS count
            FROM campaigns
            WHERE creator_id = ${user.id}
              AND status != 'draft'
              AND created_at >= ${subscriptionRow.current_period_start}
              AND created_at < ${subscriptionRow.current_period_end}
          `
        : await tx`
            SELECT COUNT(*)::int AS count
            FROM campaigns
            WHERE creator_id = ${user.id}
              AND status != 'draft'
              AND created_at >= NOW() - INTERVAL '1 day' * ${DEFAULTS.FREE_TIER_RESET_DAYS}
          `;
      if (countRow.count >= allowance.limit) {
        throw new Error("CAMPAIGN_LIMIT_REACHED");
      }

      // Ensure profile exists (trigger may not have fired)
      await tx`
        INSERT INTO profiles (id, full_name, role)
        VALUES (${user.id}, ${user.user_metadata?.full_name || user.email || "User"}, 'founder')
        ON CONFLICT (id) DO NOTHING
      `;

      // Set expires_at when campaign goes active at publish.
      const needsExpiry = isSubsidized || (fundingAmount <= 0 && (!gateRequired || gateAlreadyCleared));
      const expiresAt = needsExpiry ? sql`NOW() + (${DEFAULTS.CAMPAIGN_EXPIRY_DAYS} * INTERVAL '1 day')` : null;

      const [campaign] = await tx`
        INSERT INTO campaigns (
          creator_id, title, description, status,
          category, tags, estimated_minutes,
          reward_amount, reward_type, bonus_available, rewards_top_answers,
          distributable_amount, target_responses,
          format, economics_version, is_subsidized, expires_at,
          target_interests, target_expertise, target_age_ranges, target_location,
          key_assumptions,
          audience_occupation, audience_industry, audience_experience_level, audience_niche_qualifier,
          quality_scores, quality_score,
          baseline_reach_units, funded_reach_units, total_reach_units,
          effective_reach_units, campaign_strength,
          estimated_responses_low, estimated_responses_high, match_priority,
          reciprocal_gate_status
        ) VALUES (
          ${user.id}, ${draft.title}, ${draft.summary}, ${initialStatus},
          ${draft.category}, ${draft.tags}, ${estimatedMinutes},
          ${effectiveRewardAmount}, ${draft.rewardType || "pool"}, ${!!draft.bonusAvailable}, ${!!draft.rewardsTopAnswers},
          ${distributableAmount}, ${targetResponses || null},
          ${format}, ${2}, ${isSubsidized}, ${needsExpiry ? expiresAt : null},
          ${draft.audience.interests}, ${draft.audience.expertise}, ${draft.audience.ageRanges}, ${draft.audience.location || null},
          ${keyAssumptions},
          ${draft.audience.occupation || null}, ${draft.audience.industry || null}, ${draft.audience.experienceLevel || null}, ${draft.audience.nicheQualifier || null},
          ${draft.qualityScores ? JSON.stringify(draft.qualityScores) : null}::jsonb, ${qualityScore},
          ${reach.baselineRU}, ${reach.fundedRU}, ${reach.totalRU},
          ${reach.effectiveReach}, ${reach.campaignStrength},
          ${reach.estimatedResponsesLow}, ${reach.estimatedResponsesHigh}, ${planConfig.matchPriority},
          ${gateStatus}
        )
        RETURNING id
      `;

      for (let i = 0; i < draft.questions.length; i++) {
        const q = draft.questions[i];
        await tx`
          INSERT INTO questions (campaign_id, text, type, sort_order, options, is_baseline, category, assumption_index, anchors)
          VALUES (
            ${campaign.id},
            ${q.text},
            ${q.type},
            ${i},
            ${q.options ? JSON.stringify(q.options) : null}::jsonb,
            ${q.isBaseline},
            ${q.category || null},
            ${q.assumptionIndex ?? null},
            ${q.anchors ? JSON.stringify(q.anchors) : null}::jsonb
          )
        `;
      }

      // Increment usage counter inside the transaction for atomicity
      const updated = await tx`
        UPDATE subscriptions
        SET campaigns_used_this_period = campaigns_used_this_period + 1,
            updated_at = now()
        WHERE user_id = ${user.id}
        RETURNING id
      `;
      if (updated.length === 0) {
        await tx`
          INSERT INTO subscriptions (user_id, tier, status, campaigns_used_this_period)
          VALUES (${user.id}, 'free', 'active', 1)
          ON CONFLICT (user_id) DO UPDATE
            SET campaigns_used_this_period = subscriptions.campaigns_used_this_period + 1,
                updated_at = now()
        `;
      }

      // Mark subsidy as used inside the transaction to prevent double-spend
      if (isSubsidized) {
        await tx`
          UPDATE profiles
          SET subsidized_campaign_used = true
          WHERE id = ${user.id}
        `;
      }

      return campaign;
    });

    logOps({
      event: "campaign.published",
      campaignId: result.id,
      creatorId: user.id,
      tier: allowance.tier,
      fundingAmount,
      status: initialStatus,
      qualityScore,
      effectiveReach: reach.effectiveReach,
      campaignStrength: reach.campaignStrength,
      format,
      economicsVersion: 2,
      targetResponses,
    });

    // Mark founder as having posted (for onboarding progress)
    const supabase = await createClient();
    await supabase
      .from("profiles")
      .update({ has_posted: true })
      .eq("id", user.id);

    return { id: result.id, gatePending: gateRequired && !gateAlreadyCleared };
  } catch (err) {
    const message = (err as Error).message || "Unknown database error";
    console.error("[publishCampaign] DB error:", message);
    captureError(err, { userId: user.id, operation: "campaign.publish" });

    if (message === "CAMPAIGN_LIMIT_REACHED") {
      return { error: "Campaign limit reached for this period." };
    }
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

/* ═══════════════════════════════════════════════════════════════════════════
 * Save Draft — lightweight save without tier checks, funding, or reach calc
 * ═══════════════════════════════════════════════════════════════════════════ */

export async function saveDraft(
  draft: CampaignDraft
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { error: "Not authenticated. Please sign in again." };
  const user = data.user;

  const rl = rateLimit(`save-draft:${user.id}`, 3600000, 20);
  if (!rl.allowed) return { error: "Too many saves. Please wait before saving again." };

  // Content moderation
  const contentFields = [
    { name: "title", text: draft.title },
    { name: "summary", text: draft.summary },
    ...draft.assumptions.map((a, i) => ({ name: `assumption_${i}`, text: a })),
    ...draft.questions.map((q, i) => ({ name: `question_${i}`, text: q.text })),
  ];
  const contentCheck = checkMultipleFields(contentFields);
  if (!contentCheck.allowed) return { error: contentCheck.reason ?? "Content policy violation." };

  const keyAssumptions = draft.assumptions
    .filter((a) => a.trim().length > 0)
    .map((a) => enforceLength(a, 500).text);
  const qualityScore = draft.qualityScores?.overall ?? 0;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await sql.begin(async (tx: any) => {
      await tx`
        INSERT INTO profiles (id, full_name, role)
        VALUES (${user.id}, ${user.user_metadata?.full_name || user.email || "User"}, 'founder')
        ON CONFLICT (id) DO NOTHING
      `;

      const [campaign] = await tx`
        INSERT INTO campaigns (
          creator_id, title, description, status,
          category, tags, estimated_minutes,
          reward_amount, format, economics_version,
          target_interests, target_expertise, target_age_ranges, target_location,
          key_assumptions,
          audience_occupation, audience_industry, audience_experience_level, audience_niche_qualifier,
          quality_scores, quality_score
        ) VALUES (
          ${user.id}, ${draft.title}, ${draft.summary}, 'draft',
          ${draft.category}, ${draft.tags.map((t) => enforceLength(t, MAX_LENGTHS.TAG).text)}, ${draft.format === "standard" ? 5 : 3},
          ${draft.rewardPool || 0}, ${draft.format || "quick"}, ${2},
          ${draft.audience.interests}, ${draft.audience.expertise}, ${draft.audience.ageRanges}, ${draft.audience.location || null},
          ${keyAssumptions},
          ${draft.audience.occupation || null}, ${draft.audience.industry || null}, ${draft.audience.experienceLevel || null}, ${draft.audience.nicheQualifier || null},
          ${draft.qualityScores ? JSON.stringify(draft.qualityScores) : null}::jsonb, ${qualityScore}
        )
        RETURNING id
      `;

      for (let i = 0; i < draft.questions.length; i++) {
        const q = draft.questions[i];
        await tx`
          INSERT INTO questions (campaign_id, text, type, sort_order, options, is_baseline, category, assumption_index, anchors)
          VALUES (
            ${campaign.id}, ${q.text}, ${q.type}, ${i},
            ${q.options ? JSON.stringify(q.options) : null}::jsonb,
            ${q.isBaseline}, ${q.category || null}, ${q.assumptionIndex ?? null},
            ${q.anchors ? JSON.stringify(q.anchors) : null}::jsonb
          )
        `;
      }

      return campaign;
    });

    logOps({ event: "campaign.draft_saved", campaignId: result.id, creatorId: user.id });
    return { id: result.id };
  } catch (err) {
    console.error("[saveDraft] DB error:", (err as Error).message);
    captureError(err, { userId: user.id, operation: "campaign.save_draft" });
    return { error: "Failed to save draft. Please try again." };
  }
}

export async function updateDraft(
  campaignId: string,
  draft: CampaignDraft
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { error: "Not authenticated. Please sign in again." };
  const user = data.user;

  // Verify ownership and draft status
  const [existing] = await sql`
    SELECT id, status, creator_id FROM campaigns WHERE id = ${campaignId}
  `;
  if (!existing) return { error: "Campaign not found." };
  if (existing.creator_id !== user.id) return { error: "Not authorized." };
  if (existing.status !== "draft") return { error: "Only draft campaigns can be edited." };

  // Content moderation
  const contentFields = [
    { name: "title", text: draft.title },
    { name: "summary", text: draft.summary },
    ...draft.assumptions.map((a, i) => ({ name: `assumption_${i}`, text: a })),
    ...draft.questions.map((q, i) => ({ name: `question_${i}`, text: q.text })),
  ];
  const contentCheck = checkMultipleFields(contentFields);
  if (!contentCheck.allowed) return { error: contentCheck.reason ?? "Content policy violation." };

  const keyAssumptions = draft.assumptions
    .filter((a) => a.trim().length > 0)
    .map((a) => enforceLength(a, 500).text);
  const qualityScore = draft.qualityScores?.overall ?? 0;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await sql.begin(async (tx: any) => {
      await tx`
        UPDATE campaigns SET
          title = ${draft.title},
          description = ${draft.summary},
          category = ${draft.category},
          tags = ${draft.tags.map((t) => enforceLength(t, MAX_LENGTHS.TAG).text)},
          estimated_minutes = ${draft.format === "standard" ? 5 : 3},
          reward_amount = ${draft.rewardPool || 0},
          format = ${draft.format || "quick"},
          target_interests = ${draft.audience.interests},
          target_expertise = ${draft.audience.expertise},
          target_age_ranges = ${draft.audience.ageRanges},
          target_location = ${draft.audience.location || null},
          key_assumptions = ${keyAssumptions},
          audience_occupation = ${draft.audience.occupation || null},
          audience_industry = ${draft.audience.industry || null},
          audience_experience_level = ${draft.audience.experienceLevel || null},
          audience_niche_qualifier = ${draft.audience.nicheQualifier || null},
          quality_scores = ${draft.qualityScores ? JSON.stringify(draft.qualityScores) : null}::jsonb,
          quality_score = ${qualityScore},
          updated_at = NOW()
        WHERE id = ${campaignId}
      `;

      await tx`DELETE FROM questions WHERE campaign_id = ${campaignId}`;

      for (let i = 0; i < draft.questions.length; i++) {
        const q = draft.questions[i];
        await tx`
          INSERT INTO questions (campaign_id, text, type, sort_order, options, is_baseline, category, assumption_index, anchors)
          VALUES (
            ${campaignId}, ${q.text}, ${q.type}, ${i},
            ${q.options ? JSON.stringify(q.options) : null}::jsonb,
            ${q.isBaseline}, ${q.category || null}, ${q.assumptionIndex ?? null},
            ${q.anchors ? JSON.stringify(q.anchors) : null}::jsonb
          )
        `;
      }
    });

    logOps({ event: "campaign.draft_updated", campaignId, creatorId: user.id });
    return { id: campaignId };
  } catch (err) {
    console.error("[updateDraft] DB error:", (err as Error).message);
    captureError(err, { userId: user.id, operation: "campaign.update_draft" });
    return { error: "Failed to update draft. Please try again." };
  }
}
