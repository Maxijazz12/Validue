"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { scoreResponse } from "@/lib/ai/rank-responses";
import type { AnswerWithMeta } from "@/lib/ai/types";
import { updateRespondentReputation } from "@/lib/reputation";
import { logOps } from "@/lib/ops-logger";
import { captureError } from "@/lib/sentry";

export async function rankCampaignResponses(campaignId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // Verify ownership
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, creator_id, title, description, ranking_status")
    .eq("id", campaignId)
    .single();

  if (!campaign) throw new Error("Campaign not found");
  if (campaign.creator_id !== user.id) throw new Error("Not your campaign");
  if (campaign.ranking_status === "ranking")
    throw new Error("Ranking already in progress");

  // Atomic lock: only transitions from 'unranked' to 'ranking'.
  // Prevents concurrent ranking runs via compare-and-swap.
  const { data: locked } = await supabase
    .from("campaigns")
    .update({ ranking_status: "ranking" })
    .eq("id", campaignId)
    .eq("ranking_status", "unranked")
    .select("id");

  if (!locked || locked.length === 0) {
    throw new Error("Ranking already in progress or completed");
  }

  let rankedCount = 0;

  try {
    // Fetch submitted responses
    const { data: responses } = await supabase
      .from("responses")
      .select("id, respondent_id")
      .eq("campaign_id", campaignId)
      .eq("status", "submitted");

    if (!responses || responses.length === 0) {
      await supabase
        .from("campaigns")
        .update({ ranking_status: "ranked" })
        .eq("id", campaignId);
      return { ranked: 0 };
    }

    // Fetch questions
    const { data: questions } = await supabase
      .from("questions")
      .select("id, text, type")
      .eq("campaign_id", campaignId)
      .order("sort_order", { ascending: true });

    const questionMap = new Map(
      (questions || []).map((q) => [q.id, q])
    );

    const rankingStart = Date.now();
    logOps({ event: "ranking.started", campaignId, responseCount: responses.length });

    // Score each response sequentially
    let aiCount = 0;
    let fallbackCount = 0;
    let lowConfCount = 0;
    let scoreSum = 0;
    for (const response of responses) {
      const { data: answers } = await supabase
        .from("answers")
        .select("question_id, text, metadata")
        .eq("response_id", response.id);

      const answersWithMeta: AnswerWithMeta[] = (answers || []).map((a) => {
        const q = questionMap.get(a.question_id);
        const meta = (a.metadata as Record<string, unknown>) || {};
        return {
          questionId: a.question_id,
          questionText: q?.text || "Unknown question",
          questionType: (q?.type as "open" | "multiple_choice") || "open",
          answerText: a.text || "",
          metadata: {
            pasteDetected: meta.pasteDetected as boolean | undefined,
            pasteCount: meta.pasteCount as number | undefined,
            timeSpentMs: meta.timeSpentMs as number | undefined,
            charCount: meta.charCount as number | undefined,
          },
        };
      });

      const result = await scoreResponse(
        campaignId,
        response.id,
        campaign.title,
        campaign.description || "",
        answersWithMeta
      );

      // Clamp score and confidence to valid DB ranges before write
      const clampedScore = Math.min(Math.max(result.score, 0), 100);
      const clampedConfidence = Math.min(Math.max(result.confidence, 0), 1);

      await supabase
        .from("responses")
        .update({
          quality_score: clampedScore,
          ai_feedback: result.feedback,
          scoring_source: result.source,
          scoring_confidence: clampedConfidence,
          scoring_dimensions: result.dimensions,
          status: "ranked",
          ranked_at: new Date().toISOString(),
        })
        .eq("id", response.id);

      rankedCount++;
      scoreSum += clampedScore;
      if (result.source === "ai") aiCount++;
      else if (result.source === "fallback") fallbackCount++;
      else if (result.source === "ai_low_confidence") lowConfCount++;
    }

    logOps({
      event: "ranking.completed",
      campaignId,
      rankedCount,
      aiCount,
      fallbackCount,
      lowConfidenceCount: lowConfCount,
      avgScore: rankedCount > 0 ? Math.round((scoreSum / rankedCount) * 10) / 10 : 0,
      minScore: 0, // individual scores already logged by ai/logger.ts
      maxScore: 0,
      latencyMs: Date.now() - rankingStart,
    });

    // Mark campaign as ranked
    await supabase
      .from("campaigns")
      .update({ ranking_status: "ranked" })
      .eq("id", campaignId);

    // Update reputation for all ranked respondents
    const respondentIds = new Set(responses.map((r) => r.respondent_id));
    for (const rid of respondentIds) {
      await updateRespondentReputation(rid);
    }

    // Notify founder that ranking is complete
    await supabase.from("notifications").insert({
      user_id: user.id,
      type: "ranking_complete",
      title: "Ranking complete",
      body: `${rankedCount} response${rankedCount !== 1 ? "s" : ""} ranked for "${campaign.title}"`,
      campaign_id: campaignId,
      link: `/dashboard/ideas/${campaignId}/responses`,
    });

    revalidatePath(`/dashboard/ideas/${campaignId}/responses`);
    revalidatePath(`/dashboard/ideas/${campaignId}`);

    return { ranked: rankedCount };
  } catch (err) {
    logOps({
      event: "ranking.failed",
      campaignId,
      error: (err as Error).message,
      responsesScoredBeforeFailure: rankedCount,
    });
    captureError(err, { campaignId, userId: user?.id, operation: "ranking" });
    // Reset ranking status on failure
    await supabase
      .from("campaigns")
      .update({ ranking_status: "unranked" })
      .eq("id", campaignId);
    throw err;
  }
}

/** Lightweight progress check for polling during ranking */
export async function getRankingProgress(campaignId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // Verify the user owns this campaign
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("creator_id")
    .eq("id", campaignId)
    .single();

  if (!campaign || campaign.creator_id !== user.id) {
    throw new Error("Not your campaign");
  }

  const { count: rankedCount } = await supabase
    .from("responses")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .eq("status", "ranked");

  const { count: totalCount } = await supabase
    .from("responses")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .in("status", ["submitted", "ranked"]);

  return { ranked: rankedCount ?? 0, total: totalCount ?? 0 };
}
