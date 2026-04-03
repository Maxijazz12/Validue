"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { checkContent, enforceLength, MAX_LENGTHS } from "@/lib/content-filter";
import { DEFAULTS } from "@/lib/defaults";
import { logOps } from "@/lib/ops-logger";
import { createNotification } from "@/lib/notifications";
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

function sanitizeCounter(value: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return 0;
  return Math.floor(numeric);
}

function sanitizeMetadata(m: AnswerMetadata, text: string): AnswerMetadata {
  return {
    pasteDetected: m.pasteDetected === true,
    pasteCount: sanitizeCounter(m.pasteCount),
    timeSpentMs: sanitizeCounter(m.timeSpentMs),
    // Derive character count from the persisted answer text, not the client payload.
    charCount: text.length,
  };
}

function elapsedMsSince(createdAt: string | null): number {
  if (!createdAt) return 0;
  const startedAt = new Date(createdAt).getTime();
  if (!Number.isFinite(startedAt)) return 0;
  return Math.max(0, Date.now() - startedAt);
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
  if ((campaign.target_responses ?? 0) <= 0) {
    throw new Error("This campaign is not accepting responses yet.");
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
    .select("id, status, money_state, assigned_question_ids, is_partial")
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
    // Verify money_state is still valid for resume (null is OK for V1 responses)
    if (
      existing.money_state &&
      existing.money_state !== "pending_qualification"
    ) {
      throw new Error("This response is no longer eligible for completion.");
    }
    // Resume in-progress response (preserve original assignment)
    return {
      responseId: existing.id,
      assignedQuestionIds: existing.assigned_question_ids ?? null,
    };
  }

  // V2: Fill cap — checked atomically at INSERT time below (see guardedInsertV2).
  // V1: pre-check (atomic insert below enforces the hard cap)
  if (campaign.economics_version !== 2) {
    if (
      (campaign.target_responses ?? 0) > 0 &&
      (campaign.current_responses ?? 0) >= (campaign.target_responses ?? 0)
    )
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

  if (campaign.economics_version === 2) {
    // Atomic fill-cap INSERT: only inserts if active slots < target_responses.
    // Prevents race condition where concurrent users both pass a separate COUNT check.
    const targetResponses = campaign.target_responses || 0;
    const [inserted] = await sql`
      INSERT INTO responses (campaign_id, respondent_id, status, money_state, assigned_question_ids, is_partial)
      SELECT
        ${campaignId}, ${user.id}, 'in_progress', 'pending_qualification',
        ${assignedQuestionIds ?? null}::uuid[], ${isPartial}
      WHERE (
        SELECT COUNT(*)
        FROM responses
        WHERE campaign_id = ${campaignId}
          AND status IN ('in_progress', 'submitted', 'ranked')
      ) < ${targetResponses}
      RETURNING id
    `;
    if (!inserted) {
      throw new Error("This campaign has reached its response limit.");
    }
    return { responseId: inserted.id, assignedQuestionIds };
  }

  // V1: atomic insert with fill-cap guard (prevents concurrent overshoot)
  const targetResponses = campaign.target_responses || 0;
  const [inserted] = await sql`
    INSERT INTO responses (campaign_id, respondent_id, status, assigned_question_ids, is_partial)
    SELECT
      ${campaignId}, ${user.id}, 'in_progress',
      ${assignedQuestionIds ?? null}::uuid[], ${isPartial}
    WHERE (
      SELECT COUNT(*)
      FROM responses
      WHERE campaign_id = ${campaignId}
        AND status IN ('in_progress', 'submitted', 'ranked')
    ) < ${targetResponses}
    RETURNING id
  `;
  if (!inserted) {
    throw new Error("Campaign has reached its response target");
  }

  return { responseId: inserted.id, assignedQuestionIds };
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

  // Verify this response belongs to the authenticated user
  const { data: ownerCheck } = await supabase
    .from("responses")
    .select("id, status, campaign_id, is_partial, assigned_question_ids")
    .eq("id", responseId)
    .eq("respondent_id", user.id)
    .maybeSingle();
  if (!ownerCheck) throw new Error("Response not found");
  if (ownerCheck.status !== "in_progress") {
    throw new Error("This response is no longer editable.");
  }

  const { data: question } = await supabase
    .from("questions")
    .select("id")
    .eq("id", questionId)
    .eq("campaign_id", ownerCheck.campaign_id)
    .maybeSingle();
  if (!question) {
    throw new Error("Question not found for this response.");
  }

  if (ownerCheck.is_partial && (!ownerCheck.assigned_question_ids || ownerCheck.assigned_question_ids.length === 0)) {
    throw new Error("This partial response no longer has assigned questions.");
  }

  if (
    ownerCheck.is_partial &&
    ownerCheck.assigned_question_ids?.length &&
    !ownerCheck.assigned_question_ids.includes(questionId)
  ) {
    throw new Error("This question is not assigned to your response.");
  }

  // Rate limit: 120 saves per hour (rapid typing/navigation is normal)
  const rl = rateLimit(`save:${user.id}`, 3600000, 300);
  if (!rl.allowed) throw new Error("Too many requests. Please slow down.");

  // Sanitize metadata + content moderation + length enforcement
  const { text: safeText } = enforceLength(text, MAX_LENGTHS.ANSWER_TEXT);
  const safeMetadata = sanitizeMetadata(metadata, safeText);
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
    .select("id, status, campaign_id, money_state, assigned_question_ids, is_partial, created_at")
    .eq("id", responseId)
    .eq("respondent_id", user.id)
    .single();

  if (!response) throw new Error("Response not found");
  if (response.status !== "in_progress")
    throw new Error("Response already submitted");

  // Verify campaign hasn't expired since the response was started
  const { data: campaignCheck } = await supabase
    .from("campaigns")
    .select("status, expires_at")
    .eq("id", response.campaign_id)
    .single();

  if (
    campaignCheck &&
    (campaignCheck.status !== "active" ||
      (campaignCheck.expires_at && new Date() >= new Date(campaignCheck.expires_at)))
  ) {
    throw new Error("This campaign has expired. Your response can no longer be submitted.");
  }

  // Determine required questions: assigned subset (partial) or all (full)
  const isPartial = response.is_partial && response.assigned_question_ids?.length;
  let requiredQuestionIds: string[];

  if (response.is_partial && (!response.assigned_question_ids || response.assigned_question_ids.length === 0)) {
    throw new Error("Partial response has no assigned questions. Please start a new response.");
  }

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

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("economics_version, format")
    .eq("id", response.campaign_id)
    .single();

  if (campaign?.economics_version === 2) {
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
      const perQuestionFloor = requiredQuestionIds.length * DEFAULTS.PARTIAL_MIN_TIME_PER_QUESTION_MS;
      minTime = Math.max(perQuestionFloor, Math.round(minTime * ratio));
    }

    const serverDurationMs = elapsedMsSince(response.created_at);
    if (serverDurationMs < minTime) {
      throw new Error(
        "Your response was submitted too quickly. Please take more time to provide thoughtful answers."
      );
    }
  }

  // Submit + increment atomically (CAS prevents double-submission)
  const [submitted] = await sql`
    WITH cas AS (
      UPDATE responses
      SET status = 'submitted',
          submitted_duration_ms = GREATEST(
            0,
            FLOOR(EXTRACT(EPOCH FROM (NOW() - COALESCE(created_at, NOW()))) * 1000)
          )::int
      WHERE id = ${responseId} AND status = 'in_progress'
      RETURNING campaign_id
    )
    UPDATE campaigns
    SET current_responses = current_responses + 1,
        ranking_status = CASE
          WHEN ranking_status = 'ranking' THEN 'ranking'
          ELSE 'unranked'
        END
    WHERE id = (SELECT campaign_id FROM cas)
    RETURNING id
  `;

  if (!submitted) throw new Error("Response already submitted or not found.");

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
    await createNotification({
      userId: campaignForNotif.creator_id,
      type: "new_response",
      title: "New response received",
      body: `"${campaignForNotif.title}" — ${count}/${target} responses`,
      campaignId: response.campaign_id,
      link: `/dashboard/ideas/${response.campaign_id}/responses`,
    });
  }

  revalidatePath("/dashboard/the-wall");
  revalidatePath(`/dashboard/ideas/${response.campaign_id}`);

  return { success: true };
}
