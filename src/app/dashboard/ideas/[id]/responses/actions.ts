"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { scoreResponse } from "@/lib/ai/rank-responses";
import type { AnswerWithMeta } from "@/lib/ai/types";
import { updateRespondentReputation } from "@/lib/reputation";

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

  // Set ranking status
  await supabase
    .from("campaigns")
    .update({ ranking_status: "ranking" })
    .eq("id", campaignId);

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

    // Score each response sequentially
    let rankedCount = 0;
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

      await supabase
        .from("responses")
        .update({
          quality_score: result.score,
          ai_feedback: result.feedback,
          status: "ranked",
          ranked_at: new Date().toISOString(),
        })
        .eq("id", response.id);

      rankedCount++;
    }

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

    revalidatePath(`/dashboard/ideas/${campaignId}/responses`);
    revalidatePath(`/dashboard/ideas/${campaignId}`);

    return { ranked: rankedCount };
  } catch (err) {
    // Reset ranking status on failure
    await supabase
      .from("campaigns")
      .update({ ranking_status: "unranked" })
      .eq("id", campaignId);
    throw err;
  }
}
