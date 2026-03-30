"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { checkContent, enforceLength, MAX_LENGTHS } from "@/lib/content-filter";
import { DEFAULTS } from "@/lib/defaults";
import { logOps } from "@/lib/ops-logger";
import { rateLimit } from "@/lib/rate-limit";
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

  // Fetch campaign (include V2 fields)
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, creator_id, status, current_responses, target_responses, expires_at, economics_version")
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
    .select("id, status")
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
    // Resume in-progress response
    return { responseId: existing.id };
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

  // Create new response (reserves a slot)
  const { data: response, error } = await supabase
    .from("responses")
    .insert({
      campaign_id: campaignId,
      respondent_id: user.id,
      status: "in_progress",
      ...(campaign.economics_version === 2 ? { money_state: "pending_qualification" } : {}),
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
    .select("id, status, campaign_id, money_state")
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

    // Hard time floor — reject impossibly fast submissions
    const minTime =
      campaign.format === "quick"
        ? DEFAULTS.SUBMIT_MIN_TIME_QUICK_MS
        : DEFAULTS.SUBMIT_MIN_TIME_STANDARD_MS;
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
