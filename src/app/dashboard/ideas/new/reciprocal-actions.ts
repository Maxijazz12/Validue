"use server";

import { createClient } from "@/lib/supabase/server";
import { checkContent, enforceLength, MAX_LENGTHS } from "@/lib/content-filter";
import { logOps } from "@/lib/ops-logger";
import { checkGate, RECIPROCAL_REQUIRED, RECIPROCAL_QUESTIONS_PER_RESPONSE } from "@/lib/reciprocal-gate";
import {
  assignQuestions,
  type CampaignQuestion,
  type AssumptionCoverageCount,
} from "@/lib/question-assignment";
import type { RespondentProfile } from "@/lib/wall-ranking";
import sql from "@/lib/db";
import { DEFAULTS } from "@/lib/defaults";
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

// Keep the old type for backward compat with ReciprocateStep
export type ReciprocalQuestion = {
  id: string;
  text: string;
  type: "open" | "multiple_choice";
  options: string[] | null;
  campaignId: string;
  campaignTitle: string;
};

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

  const { data: userResponses } = await supabase
    .from("responses")
    .select("campaign_id")
    .eq("respondent_id", user.id)
    .in("status", ["in_progress", "submitted", "ranked"]);

  const respondedCampaignIds = new Set(
    (userResponses || []).map((r) => r.campaign_id)
  );

  let query = supabase
    .from("campaigns")
    .select("id")
    .eq("status", "active")
    .neq("creator_id", user.id)
    .limit(1);

  if (respondedCampaignIds.size > 0) {
    query = query.not("id", "in", `(${[...respondedCampaignIds].join(",")})`);
  }

  const { data } = await query;
  return !!data && data.length > 0;
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

  // Get campaigns the user has already responded to
  const { data: userResponses } = await supabase
    .from("responses")
    .select("campaign_id")
    .eq("respondent_id", user.id)
    .in("status", ["in_progress", "submitted", "ranked"]);

  const respondedCampaignIds = new Set(
    (userResponses || []).map((r) => r.campaign_id)
  );

  // Find active campaigns the user didn't create and hasn't responded to
  let query = supabase
    .from("campaigns")
    .select("id, title, target_interests, target_expertise, target_age_ranges, tags")
    .eq("status", "active")
    .neq("creator_id", user.id)
    .order("current_responses", { ascending: true }) // prefer under-served
    .limit(30);

  if (respondedCampaignIds.size > 0) {
    query = query.not("id", "in", `(${[...respondedCampaignIds].join(",")})`);
  }

  const { data: campaigns } = await query;
  if (!campaigns || campaigns.length === 0) return [];

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

  const assignments: ReciprocalAssignment[] = [];

  for (const campaign of campaigns) {
    if (assignments.length >= RECIPROCAL_REQUIRED) break;

    // Fetch questions for this campaign
    const { data: campaignQuestions } = await supabase
      .from("questions")
      .select("id, text, type, sort_order, options, is_baseline, category, assumption_index")
      .eq("campaign_id", campaign.id)
      .order("sort_order", { ascending: true });

    if (!campaignQuestions || campaignQuestions.length < 3) continue;

    const questions: CampaignQuestion[] = campaignQuestions.map((q) => ({
      id: q.id,
      text: q.text,
      type: q.type as "open" | "multiple_choice",
      category: q.category,
      assumptionIndex: q.assumption_index,
      isBaseline: q.is_baseline ?? false,
      sortOrder: q.sort_order,
    }));

    // Get assumption coverage for smart assignment
    const coverageRows = await sql`
      SELECT q.assumption_index, COUNT(*)::int AS count
      FROM answers a
      JOIN questions q ON q.id = a.question_id
      JOIN responses r ON r.id = a.response_id
      WHERE r.campaign_id = ${campaign.id}
        AND r.status IN ('submitted', 'ranked')
        AND q.assumption_index IS NOT NULL
      GROUP BY q.assumption_index
    `;
    const coverageCounts: AssumptionCoverageCount = {};
    for (const row of coverageRows) {
      coverageCounts[row.assumption_index as number] = row.count as number;
    }

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

    // Create partial response row
    const { data: responseRow, error } = await supabase
      .from("responses")
      .insert({
        campaign_id: campaign.id,
        respondent_id: user.id,
        status: "in_progress",
        is_partial: true,
        assigned_question_ids: assignment.questionIds,
      })
      .select("id")
      .single();

    if (error || !responseRow) continue;

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
      responseId: responseRow.id,
      questions: assignedQuestions,
    });
  }

  return assignments;
}

/**
 * Legacy fetch for backward compat with existing ReciprocateStep.
 * Flattens assignments into individual questions.
 */
export async function fetchReciprocalQuestions(opts?: {
  mcqCount?: number;
  includeOpenEnded?: boolean;
}): Promise<ReciprocalQuestion[]> {
  const assignments = await fetchReciprocalAssignments();
  const result: ReciprocalQuestion[] = [];

  for (const a of assignments) {
    for (const q of a.questions) {
      result.push({
        id: q.id,
        text: q.text,
        type: q.type,
        options: q.options,
        campaignId: a.campaignId,
        campaignTitle: a.campaignTitle,
      });
    }
  }

  // Respect the old limits if provided
  const mcqCount = opts?.mcqCount ?? 3;
  const includeOpenEnded = opts?.includeOpenEnded ?? true;
  const mcqs = result.filter((q) => q.type === "multiple_choice").slice(0, mcqCount);
  const opens = includeOpenEnded ? result.filter((q) => q.type === "open").slice(0, 1) : [];
  return [...mcqs, ...opens];
}

/**
 * Save a reciprocal answer. Uses the response row created by
 * fetchReciprocalAssignments. Auto-submits the response when all
 * assigned questions are answered.
 */
export async function saveReciprocalAnswer(
  campaignId: string,
  questionId: string,
  text: string,
  metadata: { timeSpentMs: number }
): Promise<{ success: boolean; error?: string; autoSubmitted?: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated" };

  // Content moderation
  const { text: safeText } = enforceLength(text, MAX_LENGTHS.ANSWER_TEXT);
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

  // Find existing response row (should have been created by fetchReciprocalAssignments)
  const { data: existing } = await supabase
    .from("responses")
    .select("id, status, assigned_question_ids")
    .eq("campaign_id", campaignId)
    .eq("respondent_id", user.id)
    .maybeSingle();

  let responseId: string;
  let assignedIds: string[] | null = null;

  if (existing) {
    if (existing.status === "submitted" || existing.status === "ranked") {
      return { success: true };
    }
    responseId = existing.id;
    assignedIds = existing.assigned_question_ids;
  } else {
    // Fallback: create response row if fetch wasn't called first
    const { data: newResponse, error } = await supabase
      .from("responses")
      .insert({
        campaign_id: campaignId,
        respondent_id: user.id,
        status: "in_progress",
        is_partial: true,
      })
      .select("id")
      .single();

    if (error || !newResponse) {
      return { success: false, error: "Failed to create response" };
    }
    responseId = newResponse.id;
  }

  // Upsert answer
  const answerMetadata = {
    pasteDetected: false,
    pasteCount: 0,
    timeSpentMs: Math.max(0, Math.floor(Number(metadata.timeSpentMs) || 0)),
    charCount: safeText.length,
    reciprocal: true,
  };

  const { data: existingAnswer } = await supabase
    .from("answers")
    .select("id")
    .eq("response_id", responseId)
    .eq("question_id", questionId)
    .maybeSingle();

  if (existingAnswer) {
    await supabase
      .from("answers")
      .update({ text: safeText, metadata: answerMetadata })
      .eq("id", existingAnswer.id);
  } else {
    await supabase.from("answers").insert({
      response_id: responseId,
      question_id: questionId,
      text: safeText,
      metadata: answerMetadata,
    });
  }

  // Auto-submit: check if all assigned questions are now answered
  let autoSubmitted = false;
  if (assignedIds && assignedIds.length > 0) {
    const { data: allAnswers } = await supabase
      .from("answers")
      .select("question_id")
      .eq("response_id", responseId);

    const answeredSet = new Set((allAnswers || []).map((a) => a.question_id));
    const allAnswered = assignedIds.every((id) => answeredSet.has(id));

    if (allAnswered) {
      // Atomic: only increment campaign count if this response wasn't already submitted
      // (prevents double-count from concurrent saves)
      const submitResult = await sql`
        WITH submitted AS (
          UPDATE responses
          SET status = 'submitted'
          WHERE id = ${responseId}
            AND status = 'in_progress'
          RETURNING campaign_id
        )
        UPDATE campaigns
        SET current_responses = current_responses + 1
        WHERE id = (SELECT campaign_id FROM submitted)
        RETURNING id
      `;

      autoSubmitted = submitResult.length > 0;
    }
  }

  return { success: true, autoSubmitted };
}

/**
 * Increment the reciprocal gate counter for a campaign and activate it
 * if the gate is now cleared. Called after a founder completes a reciprocal
 * response during the create flow.
 *
 * Returns the updated gate state so the UI can show progress.
 */
export async function incrementReciprocalGate(campaignId: string): Promise<{
  completed: number;
  required: number;
  remaining: number;
  cleared: boolean;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // Verify campaign belongs to user and has a pending gate
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, creator_id, reciprocal_gate_status, reciprocal_responses_completed")
    .eq("id", campaignId)
    .eq("creator_id", user.id)
    .single();

  if (!campaign) throw new Error("Campaign not found");

  if (campaign.reciprocal_gate_status !== "pending") {
    const gate = checkGate(
      campaign.reciprocal_gate_status,
      campaign.reciprocal_responses_completed ?? 0
    );
    return {
      completed: gate.completed,
      required: gate.required,
      remaining: gate.remaining,
      cleared: gate.canPublish,
    };
  }

  // Increment counter
  const newCount = (campaign.reciprocal_responses_completed ?? 0) + 1;
  const gate = checkGate("pending", newCount);

  if (gate.canPublish) {
    // Gate cleared — activate the campaign
    await sql`
      UPDATE campaigns
      SET reciprocal_gate_status = 'cleared',
          reciprocal_responses_completed = ${newCount},
          status = 'active',
          expires_at = NOW() + INTERVAL '${sql.unsafe(String(DEFAULTS.CAMPAIGN_EXPIRY_DAYS))} days'
      WHERE id = ${campaignId}
        AND reciprocal_gate_status = 'pending'
        AND status IN ('pending_gate', 'pending_funding')
    `;

    logOps({
      event: "reciprocal_gate.cleared",
      campaignId,
      userId: user.id,
      completedCount: newCount,
    });
  } else {
    await sql`
      UPDATE campaigns
      SET reciprocal_responses_completed = ${newCount}
      WHERE id = ${campaignId}
    `;
  }

  return {
    completed: gate.completed,
    required: gate.required,
    remaining: gate.remaining,
    cleared: gate.canPublish,
  };
}
