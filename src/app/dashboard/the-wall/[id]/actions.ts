"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { checkContent, enforceLength, MAX_LENGTHS } from "@/lib/content-filter";
import { DEFAULTS } from "@/lib/defaults";
import { logOps } from "@/lib/ops-logger";
import { rateLimit } from "@/lib/rate-limit";
import sql from "@/lib/db";
import {
  assignQuestions,
  type CampaignQuestion,
  type AssumptionCoverageCount,
} from "@/lib/question-assignment";
import type { RespondentProfile } from "@/lib/wall-ranking";

export type AnswerMetadata = {
  pasteDetected: boolean;
  pasteCount: number;
  timeSpentMs: number;
  charCount: number;
};

function sanitizeMetadata(m: AnswerMetadata): AnswerMetadata {
  return {
    pasteDetected: m.pasteDetected === true,
    pasteCount: Math.max(0, Math.floor(Number(m.pasteCount) || 0)),
    timeSpentMs: Math.max(0, Math.floor(Number(m.timeSpentMs) || 0)),
    charCount: Math.max(0, Math.floor(Number(m.charCount) || 0)),
  };
}

export async function startResponse(campaignId: string): Promise<{
  responseId: string;
  assignedQuestionIds: string[] | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // Fetch campaign (include V2 + targeting fields for question assignment)
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, creator_id, status, current_responses, target_responses, expires_at, economics_version, target_interests, target_expertise, target_age_ranges, tags")
    .eq("id", campaignId)
    .single();

  if (!campaign) throw new Error("Campaign not found");
  if (campaign.status !== "active") throw new Error("Campaign is not active");
  if (campaign.creator_id === user.id)
    throw new Error("Cannot respond to your own campaign");

  // V2: Expiration check
  if (campaign.expires_at && new Date() >= new Date(campaign.expires_at)) {
    throw new Error("This campaign has expired.");
  }

  // V2: Clean up stale in-progress responses for this user (> 60 min old)
  if (campaign.economics_version === 2) {
    await sql`
      UPDATE responses
      SET status = 'abandoned'
      WHERE respondent_id = ${user.id}
        AND status = 'in_progress'
        AND created_at < NOW() - INTERVAL '1 millisecond' * ${DEFAULTS.STALE_RESPONSE_TIMEOUT_MS}
    `;
  }

  // Check for existing response to this campaign
  const { data: existing } = await supabase
    .from("responses")
    .select("id, status, assigned_question_ids, is_partial")
    .eq("campaign_id", campaignId)
    .eq("respondent_id", user.id)
    .maybeSingle();

  if (existing) {
    if (existing.status === "submitted" || existing.status === "ranked")
      throw new Error("You have already submitted a response");
    if (existing.status === "abandoned") {
      // Don't allow re-entry after abandonment — treat as used slot
      throw new Error("Your previous response to this campaign timed out.");
    }
    // Resume in-progress response (preserve original assignment)
    return {
      responseId: existing.id,
      assignedQuestionIds: existing.assigned_question_ids ?? null,
    };
  }

  // V2: Fill cap — count qualifying + in-progress responses toward target (no overfill)
  if (campaign.economics_version === 2) {
    const [{ count: activeSlots }] = await sql`
      SELECT COUNT(*)::int AS count
      FROM responses
      WHERE campaign_id = ${campaignId}
        AND status IN ('in_progress', 'submitted', 'ranked')
    `;
    if (activeSlots >= (campaign.target_responses || 0)) {
      throw new Error("This campaign has reached its response limit.");
    }
  } else {
    // V1: original fill check
    if (campaign.current_responses >= campaign.target_responses)
      throw new Error("Campaign has reached its response target");
  }

  // V2: Daily completed-response cap
  if (campaign.economics_version === 2) {
    const [{ count: todayCount }] = await sql`
      SELECT COUNT(*)::int AS count
      FROM responses
      WHERE respondent_id = ${user.id}
        AND status IN ('submitted', 'ranked')
        AND created_at > NOW() - INTERVAL '24 hours'
    `;
    if (todayCount >= DEFAULTS.MAX_DAILY_RESPONSES) {
      throw new Error("You've reached today's response limit. Come back tomorrow.");
    }
  }

  // V2: Concurrent in-progress cap
  if (campaign.economics_version === 2) {
    const [{ count: inProgressCount }] = await sql`
      SELECT COUNT(*)::int AS count
      FROM responses
      WHERE respondent_id = ${user.id}
        AND status = 'in_progress'
    `;
    if (inProgressCount >= DEFAULTS.MAX_CONCURRENT_RESPONSES) {
      throw new Error("Please finish your current responses before starting new ones.");
    }
  }

  // ─── Question Assignment (partial response mode) ───
  // Fetch questions + respondent profile + coverage counts for assignment
  let assignedQuestionIds: string[] | null = null;

  const { data: campaignQuestions } = await supabase
    .from("questions")
    .select("id, text, type, sort_order, options, is_baseline, category, assumption_index")
    .eq("campaign_id", campaignId)
    .order("sort_order", { ascending: true });

  const questions: CampaignQuestion[] = (campaignQuestions || []).map((q) => ({
    id: q.id,
    text: q.text,
    type: q.type as "open" | "multiple_choice",
    category: q.category,
    assumptionIndex: q.assumption_index,
    isBaseline: q.is_baseline ?? false,
    sortOrder: q.sort_order,
  }));

  // Only run partial assignment if there are enough questions (>= 6)
  // Campaigns with few questions should remain full-response
  const usePartialAssignment = questions.length >= 6;

  if (usePartialAssignment) {
    // Fetch respondent profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("interests, expertise, age_range, reputation_score, total_responses_completed")
      .eq("id", user.id)
      .single();

    const respondentProfile: RespondentProfile = {
      interests: (profile?.interests as string[]) ?? [],
      expertise: (profile?.expertise as string[]) ?? [],
      age_range: (profile?.age_range as string | null) ?? null,
      profile_completed: !!profile?.interests?.length,
      reputation_score: Number(profile?.reputation_score ?? 0),
      total_responses_completed: Number(profile?.total_responses_completed ?? 0),
    };

    // Get per-assumption coverage counts (how many submitted answers exist per assumption)
    const coverageRows = await sql`
      SELECT q.assumption_index, COUNT(*)::int AS count
      FROM answers a
      JOIN questions q ON q.id = a.question_id
      JOIN responses r ON r.id = a.response_id
      WHERE r.campaign_id = ${campaignId}
        AND r.status IN ('submitted', 'ranked')
        AND q.assumption_index IS NOT NULL
      GROUP BY q.assumption_index
    `;
    const coverageCounts: AssumptionCoverageCount = {};
    for (const row of coverageRows) {
      coverageCounts[row.assumption_index as number] = row.count as number;
    }

    // Check if respondent already answered some questions (e.g. from reciprocal)
    const { data: priorAnswers } = await supabase
      .from("answers")
      .select("question_id")
      .in(
        "response_id",
        (await supabase
          .from("responses")
          .select("id")
          .eq("campaign_id", campaignId)
          .eq("respondent_id", user.id)
        ).data?.map((r) => r.id) ?? []
      );
    const excludeIds = new Set((priorAnswers || []).map((a) => a.question_id));

    const assignment = assignQuestions(
      questions,
      coverageCounts,
      respondentProfile,
      {
        targetInterests: (campaign.target_interests as string[]) ?? [],
        targetExpertise: (campaign.target_expertise as string[]) ?? [],
        targetAgeRanges: (campaign.target_age_ranges as string[]) ?? [],
        tags: (campaign.tags as string[]) ?? [],
      },
      { excludeQuestionIds: excludeIds.size > 0 ? excludeIds : undefined }
    );

    if (assignment) {
      assignedQuestionIds = assignment.questionIds;
    }
    // If assignment fails (not enough questions), fall back to full response
  }

  // Create new response (reserves a slot)
  const isPartial = assignedQuestionIds !== null;
  const { data: response, error } = await supabase
    .from("responses")
    .insert({
      campaign_id: campaignId,
      respondent_id: user.id,
      status: "in_progress",
      ...(campaign.economics_version === 2 ? { money_state: "pending_qualification" } : {}),
      ...(isPartial ? { assigned_question_ids: assignedQuestionIds, is_partial: true } : {}),
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  return { responseId: response.id, assignedQuestionIds };
}

export async function saveAnswer(
  responseId: string,
  questionId: string,
  text: string,
  metadata: AnswerMetadata
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // Rate limit: 120 saves per hour (rapid typing/navigation is normal)
  const rl = rateLimit(`save:${user.id}`, 3600000, 120);
  if (!rl.allowed) throw new Error("Too many requests. Please slow down.");

  // Sanitize metadata + content moderation + length enforcement
  const safeMetadata = sanitizeMetadata(metadata);
  const { text: safeText } = enforceLength(text, MAX_LENGTHS.ANSWER_TEXT);
  const contentCheck = checkContent(safeText);
  if (!contentCheck.allowed) {
    logOps({ event: "content.flagged", userId: user.id, fieldName: "answer", action: "blocked", reason: contentCheck.reason ?? "", entryPoint: "saveAnswer" });
    throw new Error(contentCheck.reason ?? "Content policy violation.");
  }
  if (contentCheck.flagged) {
    logOps({ event: "content.flagged", userId: user.id, fieldName: "answer", action: "flagged", reason: contentCheck.reason ?? "", entryPoint: "saveAnswer" });
  }

  // Check if answer already exists
  const { data: existing } = await supabase
    .from("answers")
    .select("id")
    .eq("response_id", responseId)
    .eq("question_id", questionId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("answers")
      .update({ text: safeText, metadata: safeMetadata })
      .eq("id", existing.id);

    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("answers").insert({
      response_id: responseId,
      question_id: questionId,
      text: safeText,
      metadata: safeMetadata,
    });

    if (error) throw new Error(error.message);
  }

  return { success: true };
}

export async function submitResponse(responseId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // Rate limit: 10 submissions per hour
  const rl = rateLimit(`submit:${user.id}`, 3600000, 10);
  if (!rl.allowed) throw new Error("Too many submissions. Please wait before submitting again.");

  // Verify response belongs to user and is in_progress
  const { data: response } = await supabase
    .from("responses")
    .select("id, status, campaign_id, money_state, assigned_question_ids, is_partial")
    .eq("id", responseId)
    .eq("respondent_id", user.id)
    .single();

  if (!response) throw new Error("Response not found");
  if (response.status !== "in_progress")
    throw new Error("Response already submitted");

  // Determine required questions: assigned subset (partial) or all (full)
  const isPartial = response.is_partial && response.assigned_question_ids?.length;
  let requiredQuestionIds: string[];

  if (isPartial) {
    requiredQuestionIds = response.assigned_question_ids as string[];
  } else {
    const { data: questions } = await supabase
      .from("questions")
      .select("id")
      .eq("campaign_id", response.campaign_id);
    requiredQuestionIds = (questions || []).map((q) => q.id);
  }

  const { data: answers } = await supabase
    .from("answers")
    .select("question_id")
    .eq("response_id", responseId);

  const answeredIds = new Set((answers || []).map((a) => a.question_id));
  const unanswered = requiredQuestionIds.filter((id) => !answeredIds.has(id));

  if (unanswered.length > 0)
    throw new Error(`${unanswered.length} questions still unanswered`);

  // Behavioral screening: fetch answer metadata and check quality signals
  const { data: answerDetails } = await supabase
    .from("answers")
    .select("metadata")
    .eq("response_id", responseId);

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("economics_version, format")
    .eq("id", response.campaign_id)
    .single();

  if (campaign?.economics_version === 2 && answerDetails) {
    let totalTimeMs = 0;
    let pasteHeavyCount = 0;

    for (const a of answerDetails) {
      const meta = (a.metadata || {}) as Record<string, unknown>;
      totalTimeMs += Math.max(0, Number(meta.timeSpentMs) || 0);
      const pasteCount = Math.max(0, Number(meta.pasteCount) || 0);
      if (pasteCount >= DEFAULTS.SPAM_MAX_PASTE_COUNT) pasteHeavyCount++;
    }

    // Scale time threshold for partial responses
    // Full: 90s standard / 45s quick. Partial: scale by (assigned / total) with 15s floor
    let minTime: number =
      campaign.format === "quick"
        ? DEFAULTS.SUBMIT_MIN_TIME_QUICK_MS
        : DEFAULTS.SUBMIT_MIN_TIME_STANDARD_MS;

    if (isPartial) {
      const totalQuestionCount = (await supabase
        .from("questions")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", response.campaign_id)
      ).count ?? requiredQuestionIds.length;

      const ratio = requiredQuestionIds.length / Math.max(1, totalQuestionCount);
      minTime = Math.max(15_000, Math.round(minTime * ratio));
    }

    if (totalTimeMs < minTime) {
      throw new Error(
        "Your response was submitted too quickly. Please take more time to provide thoughtful answers."
      );
    }

    // Paste-heavy screening — reject if majority of answers are paste-heavy
    if (
      answerDetails.length > 0 &&
      pasteHeavyCount / answerDetails.length >= DEFAULTS.SPAM_PASTE_ANSWER_RATIO
    ) {
      console.log(
        "[screening] Paste-rejected:",
        JSON.stringify({ userId: user.id, responseId, pasteHeavyCount, totalAnswers: answerDetails.length })
      );
      throw new Error(
        "Your response was flagged for excessive pasted content. Please provide original answers."
      );
    }
  }

  // Submit
  const { error: submitError } = await supabase
    .from("responses")
    .update({ status: "submitted" })
    .eq("id", responseId);

  if (submitError) throw new Error(submitError.message);

  // Atomically increment campaign response count
  await sql`
    UPDATE campaigns
    SET current_responses = current_responses + 1
    WHERE id = ${response.campaign_id}
  `;

  // Mark respondent as having responded
  await supabase
    .from("profiles")
    .update({ has_responded: true })
    .eq("id", user.id);

  // Notify the campaign creator about the new response
  const { data: campaignForNotif } = await supabase
    .from("campaigns")
    .select("title, creator_id, current_responses, target_responses")
    .eq("id", response.campaign_id)
    .single();

  if (campaignForNotif) {
    const count = campaignForNotif.current_responses;
    const target = campaignForNotif.target_responses;
    await supabase.from("notifications").insert({
      user_id: campaignForNotif.creator_id,
      type: "new_response",
      title: "New response received",
      body: `"${campaignForNotif.title}" — ${count}/${target} responses`,
      campaign_id: response.campaign_id,
      link: `/dashboard/ideas/${response.campaign_id}/responses`,
    });
  }

  revalidatePath("/dashboard/the-wall");
  revalidatePath(`/dashboard/ideas/${response.campaign_id}`);

  return { success: true };
}
