"use server";

import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";
import { revalidatePath } from "next/cache";
import { scoreResponse } from "@/lib/ai/rank-responses";
import type { AnswerWithMeta } from "@/lib/ai/types";
import { updateRespondentReputation } from "@/lib/reputation";
import { logOps } from "@/lib/ops-logger";
import { captureError } from "@/lib/sentry";
import { rateLimit } from "@/lib/rate-limit";

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

  // Rate limit: 5 ranking runs per hour
  const rl = rateLimit(`rank:${user.id}`, 3600000, 5);
  if (!rl.allowed) throw new Error("Too many ranking requests. Please wait.");

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

    // Batch-fetch all answers upfront to avoid N+1 queries
    const responseIds = responses.map((r) => r.id);
    const { data: allAnswers } = await supabase
      .from("answers")
      .select("response_id, question_id, text, metadata")
      .in("response_id", responseIds);
    const answersByResponse = new Map<string, typeof allAnswers>();
    for (const a of allAnswers || []) {
      const existing = answersByResponse.get(a.response_id) || [];
      existing.push(a);
      answersByResponse.set(a.response_id, existing);
    }

    // Score each response sequentially (AI calls must be sequential for rate limits)
    const rankingNotifications: { user_id: string; type: string; title: string; body: string; campaign_id: string }[] = [];
    let aiCount = 0;
    let fallbackCount = 0;
    let lowConfCount = 0;
    let scoreSum = 0;
    for (const response of responses) {
      const answers = answersByResponse.get(response.id) || [];

      const answersWithMeta: AnswerWithMeta[] = (answers).map((a) => {
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
      const scoringDimensions: Json = result.dimensions
        ? {
            depth: result.dimensions.depth,
            relevance: result.dimensions.relevance,
            authenticity: result.dimensions.authenticity,
            consistency: result.dimensions.consistency,
          }
        : null;

      await supabase
        .from("responses")
        .update({
          quality_score: clampedScore,
          ai_feedback: result.feedback,
          scoring_source: result.source,
          scoring_confidence: clampedConfidence,
          scoring_dimensions: scoringDimensions,
          status: "ranked",
          ranked_at: new Date().toISOString(),
        })
        .eq("id", response.id);

      // Collect notification for batch insert
      const dims = result.dimensions as { depth?: number; relevance?: number; authenticity?: number; consistency?: number } | null;
      const bestDim = dims
        ? Object.entries(dims).sort(([, a], [, b]) => (b as number) - (a as number))[0]
        : null;
      const tipText = clampedScore >= 70
        ? bestDim ? `Strength: ${bestDim[0]}.` : "Great work!"
        : bestDim ? `Tip: Focus on improving ${Object.entries(dims || {}).sort(([, a], [, b]) => (a as number) - (b as number))[0]?.[0] || "depth"} for higher scores.` : "";

      rankingNotifications.push({
        user_id: response.respondent_id,
        type: "quality_feedback",
        title: `Your response scored ${clampedScore}/100`,
        body: `"${campaign.title}" — ${tipText}`,
        campaign_id: campaignId,
      });

      rankedCount++;
      scoreSum += clampedScore;
      if (result.source === "ai") aiCount++;
      else if (result.source === "fallback") fallbackCount++;
      else if (result.source === "ai_low_confidence") lowConfCount++;
    }

    // Batch insert all ranking notifications
    if (rankingNotifications.length > 0) {
      await supabase.from("notifications").insert(rankingNotifications);
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

    // Update reputation for all ranked respondents in parallel
    const respondentIds = new Set(responses.map((r) => r.respondent_id));
    await Promise.all(
      Array.from(respondentIds).map((rid) => updateRespondentReputation(rid))
    );

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
