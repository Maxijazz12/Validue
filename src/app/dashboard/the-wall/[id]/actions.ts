"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { checkContent, enforceLength, MAX_LENGTHS } from "@/lib/content-filter";
import { logOps } from "@/lib/ops-logger";
import sql from "@/lib/db";

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

export async function startResponse(campaignId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // Fetch campaign
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, creator_id, status, current_responses, target_responses")
    .eq("id", campaignId)
    .single();

  if (!campaign) throw new Error("Campaign not found");
  if (campaign.status !== "active") throw new Error("Campaign is not active");
  if (campaign.creator_id === user.id)
    throw new Error("Cannot respond to your own campaign");
  if (campaign.current_responses >= campaign.target_responses)
    throw new Error("Campaign has reached its response target");

  // Check for existing response
  const { data: existing } = await supabase
    .from("responses")
    .select("id, status")
    .eq("campaign_id", campaignId)
    .eq("respondent_id", user.id)
    .maybeSingle();

  if (existing) {
    if (existing.status === "submitted")
      throw new Error("You have already submitted a response");
    // Resume in-progress response
    return { responseId: existing.id };
  }

  // Create new response
  const { data: response, error } = await supabase
    .from("responses")
    .insert({
      campaign_id: campaignId,
      respondent_id: user.id,
      status: "in_progress",
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  return { responseId: response.id };
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

  // Verify response belongs to user and is in_progress
  const { data: response } = await supabase
    .from("responses")
    .select("id, status, campaign_id")
    .eq("id", responseId)
    .eq("respondent_id", user.id)
    .single();

  if (!response) throw new Error("Response not found");
  if (response.status !== "in_progress")
    throw new Error("Response already submitted");

  // Verify all questions are answered
  const { data: questions } = await supabase
    .from("questions")
    .select("id")
    .eq("campaign_id", response.campaign_id);

  const { data: answers } = await supabase
    .from("answers")
    .select("question_id")
    .eq("response_id", responseId);

  const answeredIds = new Set((answers || []).map((a) => a.question_id));
  const unanswered = (questions || []).filter((q) => !answeredIds.has(q.id));

  if (unanswered.length > 0)
    throw new Error(`${unanswered.length} questions still unanswered`);

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

  revalidatePath("/dashboard/the-wall");

  return { success: true };
}
