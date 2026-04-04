"use server";

import { submitResponse } from "@/app/dashboard/the-wall/[id]/actions";
import { createClient } from "@/lib/supabase/server";
import {
  hasRemainingReachBudget,
  isCampaignOpenForResponses,
} from "@/lib/campaign-availability";
import { checkContent, enforceLength, MAX_LENGTHS } from "@/lib/content-filter";
import { rateLimit } from "@/lib/rate-limit";
import { logOps } from "@/lib/ops-logger";
import { RECIPROCAL_REQUIRED, RECIPROCAL_QUESTIONS_PER_RESPONSE } from "@/lib/reciprocal-gate";
import {
  assignQuestions,
  MIN_QUESTIONS_FOR_PARTIAL_ASSIGNMENT,
  type CampaignQuestion,
  type AssumptionCoverageCount,
} from "@/lib/question-assignment";
import { computeMatchScore, type RespondentProfile } from "@/lib/wall-ranking";
import sql from "@/lib/db";
import { getSubscription } from "@/lib/plan-guard";
import type { PlanTier } from "@/lib/plans";

/**
 * Returns the current user's plan tier for client-side gating decisions.
 */
export async function getUserTier(): Promise<PlanTier> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "free";

  const sub = await getSubscription(user.id);
  return sub.tier;
}

export type ReciprocalAssignment = {
  /** The campaign this assignment belongs to */
  campaignId: string;
  /** Shown to the founder so they know what the idea is about */
  campaignTitle: string;
  /** The response row ID for this assignment */
  responseId: string;
  /** Questions assigned to this reciprocal response */
  questions: {
    id: string;
    text: string;
    type: "open" | "multiple_choice";
    options: string[] | null;
  }[];
};

type ReciprocalCampaignRow = {
  id: string;
  title: string;
  status: string;
  current_responses: number | null;
  target_responses: number | null;
  expires_at: string | null;
  reach_served: number | null;
  effective_reach_units: number | null;
  total_reach_units: number | null;
  target_interests: string[] | null;
  target_expertise: string[] | null;
  target_age_ranges: string[] | null;
  tags: string[] | null;
};

type ReciprocalQuestionRow = {
  id: string;
  text: string;
  type: string;
  sort_order: number;
  options: string[] | null;
  is_baseline: boolean | null;
  category: string | null;
  assumption_index: number | null;
};

async function loadRespondentProfile(userId: string): Promise<RespondentProfile> {
  const [profile] = await sql`
    SELECT interests, expertise, age_range, profile_completed, reputation_score, total_responses_completed
    FROM profiles
    WHERE id = ${userId}
  `;

  return {
    interests: (profile?.interests as string[]) ?? [],
    expertise: (profile?.expertise as string[]) ?? [],
    age_range: (profile?.age_range as string | null) ?? null,
    profile_completed: !!profile?.profile_completed,
    reputation_score: Number(profile?.reputation_score ?? 0),
    total_responses_completed: Number(profile?.total_responses_completed ?? 0),
  };
}

async function getEligibleReciprocalCampaigns(
  userId: string
): Promise<ReciprocalCampaignRow[]> {
  const campaigns = await sql`
    SELECT
      c.id,
      c.title,
      c.status,
      c.current_responses,
      c.target_responses,
      c.expires_at,
      c.reach_served,
      c.effective_reach_units,
      c.total_reach_units,
      c.target_interests,
      c.target_expertise,
      c.target_age_ranges,
      c.tags
    FROM campaigns c
    WHERE c.status = 'active'
      AND c.creator_id <> ${userId}
      AND NOT EXISTS (
        SELECT 1
        FROM responses r
        WHERE r.campaign_id = c.id
          AND r.respondent_id = ${userId}
          AND r.status IN ('in_progress', 'submitted', 'ranked', 'abandoned')
      )
    ORDER BY c.current_responses ASC NULLS FIRST
    LIMIT 30
  `;

  return ([...campaigns] as ReciprocalCampaignRow[]).filter(
    (campaign) =>
      isCampaignOpenForResponses(campaign) &&
      hasRemainingReachBudget(campaign)
  );
}

async function getCoverageCounts(
  campaignId: string
): Promise<AssumptionCoverageCount> {
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

  return coverageCounts;
}

async function reserveReciprocalResponse(
  campaign: ReciprocalCampaignRow,
  userId: string,
  assignedQuestionIds: string[]
): Promise<string | null> {
  const moneyState = "pending_qualification";

  const [response] = await sql`
    INSERT INTO responses (
      campaign_id,
      respondent_id,
      status,
      money_state,
      assigned_question_ids,
      is_partial
    )
    SELECT
      ${campaign.id},
      ${userId},
      'in_progress',
      ${moneyState},
      ${assignedQuestionIds}::uuid[],
      true
    FROM campaigns c
    WHERE c.id = ${campaign.id}
      AND c.status = 'active'
      AND COALESCE(c.target_responses, 0) > 0
      AND COALESCE(c.current_responses, 0) < COALESCE(c.target_responses, 0)
      AND (c.expires_at IS NULL OR c.expires_at > NOW())
      AND COALESCE(c.effective_reach_units, c.total_reach_units, 0) > 0
      AND COALESCE(c.reach_served, 0) < COALESCE(c.effective_reach_units, c.total_reach_units)
    ON CONFLICT DO NOTHING
    RETURNING id
  `;

  return response?.id ?? null;
}

/**
 * Server-side check: are there any campaigns available for the reciprocal gate?
 * Used at publish time to verify cold-start exemption.
 */
export async function hasReciprocalCampaigns(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const campaigns = await getEligibleReciprocalCampaigns(user.id);
  return campaigns.length > 0;
}

/**
 * Fetch reciprocal assignments for the gate. Returns RECIPROCAL_REQUIRED
 * assignments (one per campaign), each with 3 questions selected via the
 * question assignment module.
 *
 * Each assignment creates an in_progress partial response row so answers
 * are tracked properly from the start.
 */
export async function fetchReciprocalAssignments(): Promise<ReciprocalAssignment[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const rl = rateLimit(`recip-fetch:${user.id}`, 60000, 5);
  if (!rl.allowed) return [];

  // Clean up stale reciprocal in_progress responses (> 30 min) to prevent orphan buildup
  await sql`
    UPDATE responses
    SET status = 'abandoned'
    WHERE respondent_id = ${user.id}
      AND status = 'in_progress'
      AND is_partial = true
      AND created_at < NOW() - INTERVAL '30 minutes'
  `;

  const campaigns = await getEligibleReciprocalCampaigns(user.id);
  if (campaigns.length === 0) return [];

  const respondentProfile = await loadRespondentProfile(user.id);

  // Sort by targeting match score (best match first), then by fill need
  campaigns.sort((a, b) => {
    const scoreA = computeMatchScore(
      { target_interests: (a.target_interests as string[]) ?? [], target_expertise: (a.target_expertise as string[]) ?? [], target_age_ranges: (a.target_age_ranges as string[]) ?? [], tags: (a.tags as string[]) ?? [] },
      respondentProfile
    );
    const scoreB = computeMatchScore(
      { target_interests: (b.target_interests as string[]) ?? [], target_expertise: (b.target_expertise as string[]) ?? [], target_age_ranges: (b.target_age_ranges as string[]) ?? [], tags: (b.tags as string[]) ?? [] },
      respondentProfile
    );
    if (scoreB !== scoreA) return scoreB - scoreA;
    return (a.current_responses ?? 0) - (b.current_responses ?? 0);
  });

  const assignments: ReciprocalAssignment[] = [];

  for (const campaign of campaigns) {
    if (assignments.length >= RECIPROCAL_REQUIRED) break;

    const campaignQuestions = await sql`
      SELECT id, text, type, sort_order, options, is_baseline, category, assumption_index
      FROM questions
      WHERE campaign_id = ${campaign.id}
      ORDER BY sort_order ASC
    ` as ReciprocalQuestionRow[];

    if (!campaignQuestions || campaignQuestions.length < MIN_QUESTIONS_FOR_PARTIAL_ASSIGNMENT) continue;

    const questions: CampaignQuestion[] = campaignQuestions.map((q) => ({
      id: q.id,
      text: q.text,
      type: q.type as "open" | "multiple_choice",
      category: q.category,
      assumptionIndex: q.assumption_index,
      isBaseline: q.is_baseline ?? false,
      sortOrder: q.sort_order,
    }));

    const coverageCounts = await getCoverageCounts(campaign.id);

    // Run assignment
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
      { assignCount: RECIPROCAL_QUESTIONS_PER_RESPONSE }
    );

    if (!assignment) continue;

    const responseId = await reserveReciprocalResponse(
      campaign,
      user.id,
      assignment.questionIds
    );
    if (!responseId) continue;

    // Build the question list in assigned order
    const assignedSet = new Set(assignment.questionIds);
    const assignedQuestions = campaignQuestions
      .filter((q) => assignedSet.has(q.id))
      .map((q) => ({
        id: q.id,
        text: q.text,
        type: q.type as "open" | "multiple_choice",
        options: q.options as string[] | null,
      }));

    assignments.push({
      campaignId: campaign.id,
      campaignTitle: campaign.title,
      responseId,
      questions: assignedQuestions,
    });
  }

  return assignments;
}

/**
 * Save a reciprocal answer. Uses the response row created by
 * fetchReciprocalAssignments. Auto-submits the response when all
 * assigned questions are answered.
 */
export async function saveReciprocalAnswer(
  responseId: string,
  questionId: string,
  text: string,
  metadata: { timeSpentMs: number }
): Promise<{ success: boolean; error?: string; autoSubmitted?: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated" };

  const rl = rateLimit(`recip-save:${user.id}`, 60000, 60);
  if (!rl.allowed) return { success: false, error: "Too many requests. Please slow down." };

  // Content moderation
  const { text: safeText } = enforceLength(text, MAX_LENGTHS.ANSWER_TEXT);

  // Look up question type to apply appropriate validation
  const [question] = await sql`
    SELECT type FROM questions WHERE id = ${questionId} LIMIT 1
  `;
  if (question?.type === "open" && safeText.length < 10) {
    return { success: false, error: "Answer too short." };
  }

  const contentCheck = checkContent(safeText);
  if (!contentCheck.allowed) {
    logOps({
      event: "content.flagged",
      userId: user.id,
      fieldName: "reciprocal_answer",
      action: "blocked",
      reason: contentCheck.reason ?? "",
      entryPoint: "saveReciprocalAnswer",
    });
    return { success: false, error: contentCheck.reason ?? "Content policy violation." };
  }

  const [existing] = await sql`
    SELECT id, status, assigned_question_ids
    FROM responses
    WHERE id = ${responseId}
      AND respondent_id = ${user.id}
    LIMIT 1
  `;

  if (!existing) {
    return {
      success: false,
      error: "Reciprocal assignment not found. Please reload and try again.",
    };
  }
  if (existing.status === "submitted" || existing.status === "ranked") {
    return { success: true };
  }
  if (existing.status === "abandoned") {
    return {
      success: false,
      error: "Your previous response to this campaign timed out.",
    };
  }

  const assignedIds = existing.assigned_question_ids as string[] | null;
  if (!assignedIds || assignedIds.length === 0) {
    return {
      success: false,
      error: "Reciprocal assignment is missing its questions. Please reload.",
    };
  }

  if (!assignedIds.includes(questionId)) {
    return { success: false, error: "Question not in assignment." };
  }

  // Upsert answer
  const answerMetadata = {
    pasteDetected: false,
    pasteCount: 0,
    timeSpentMs: Math.max(0, Math.floor(Number(metadata.timeSpentMs) || 0)),
    charCount: safeText.length,
    reciprocal: true,
  };

  try {
    await sql`
      INSERT INTO answers (response_id, question_id, text, metadata)
      VALUES (
        ${responseId},
        ${questionId},
        ${safeText},
        ${sql.json(answerMetadata)}
      )
      ON CONFLICT (response_id, question_id)
      DO UPDATE SET
        text = EXCLUDED.text,
        metadata = EXCLUDED.metadata
    `;
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to save answer.",
    };
  }

  const answerRows = await sql`
    SELECT question_id
    FROM answers
    WHERE response_id = ${responseId}
  `;

  const answeredSet = new Set(answerRows.map((a) => a.question_id as string));
  const allAnswered = assignedIds.every((id) => answeredSet.has(id));

  if (!allAnswered) {
    return { success: true, autoSubmitted: false };
  }

  try {
    await submitResponse(responseId);
    return { success: true, autoSubmitted: true };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Failed to submit reciprocal response.",
    };
  }
}

