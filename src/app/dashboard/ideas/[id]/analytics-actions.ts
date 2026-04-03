"use server";

import { createClient } from "@/lib/supabase/server";

export type AnalyticsData = {
  responsesByDay: { date: string; count: number }[];
  scoreDistribution: { bucket: string; count: number }[];
  respondentDemographics: {
    interests: { label: string; count: number }[];
    expertise: { label: string; count: number }[];
    tiers: { label: string; count: number }[];
  };
  avgTimePerResponse: number;
  totalPasteDetected: number;
};

export async function getCampaignAnalytics(
  campaignId: string
): Promise<AnalyticsData | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Verify ownership
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, creator_id")
    .eq("id", campaignId)
    .eq("creator_id", user.id)
    .single();

  if (!campaign) return null;

  // Fetch all responses with respondent profiles
  const { data: responses } = await supabase
    .from("responses")
    .select(
      "id, status, quality_score, created_at, respondent:profiles!respondent_id(interests, expertise, reputation_tier)"
    )
    .eq("campaign_id", campaignId)
    .in("status", ["submitted", "ranked"])
    .order("created_at", { ascending: true });

  if (!responses || responses.length === 0) return null;

  // Fetch answer metadata for time/paste stats
  const responseIds = responses.map((r) => r.id);
  const { data: answers } = await supabase
    .from("answers")
    .select("response_id, metadata")
    .in("response_id", responseIds);

  // 1. Responses by day
  const dayCounts = new Map<string, number>();
  for (const r of responses) {
    if (!r.created_at) continue;

    const day = new Date(r.created_at).toISOString().split("T")[0];
    dayCounts.set(day, (dayCounts.get(day) || 0) + 1);
  }
  const responsesByDay = [...dayCounts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  // 2. Score distribution (buckets of 10)
  const buckets = new Map<string, number>();
  const ranked = responses.filter(
    (r) => r.status === "ranked" && r.quality_score != null
  );
  for (const r of ranked) {
    const score = Number(r.quality_score);
    const bucketStart = Math.floor(score / 10) * 10;
    const label = `${bucketStart}-${bucketStart + 9}`;
    buckets.set(label, (buckets.get(label) || 0) + 1);
  }
  // Ensure all buckets exist
  const scoreDistribution: { bucket: string; count: number }[] = [];
  for (let i = 0; i <= 90; i += 10) {
    const label = `${i}-${i + 9}`;
    scoreDistribution.push({ bucket: label, count: buckets.get(label) || 0 });
  }

  // 3. Respondent demographics
  const interestCounts = new Map<string, number>();
  const expertiseCounts = new Map<string, number>();
  const tierCounts = new Map<string, number>();

  for (const r of responses) {
    const respondentRaw = r.respondent as unknown;
    const respondent = (
      Array.isArray(respondentRaw) ? respondentRaw[0] : respondentRaw
    ) as {
      interests: string[] | null;
      expertise: string[] | null;
      reputation_tier: string | null;
    } | null;

    if (respondent) {
      for (const i of respondent.interests || []) {
        interestCounts.set(i, (interestCounts.get(i) || 0) + 1);
      }
      for (const e of respondent.expertise || []) {
        expertiseCounts.set(e, (expertiseCounts.get(e) || 0) + 1);
      }
      const tier = respondent.reputation_tier || "new";
      tierCounts.set(tier, (tierCounts.get(tier) || 0) + 1);
    }
  }

  const sortDesc = (map: Map<string, number>) =>
    [...map.entries()]
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([label, count]) => ({ label, count }));

  // 4. Average time per response + paste detection
  let totalTimeMs = 0;
  let answerCount = 0;
  let totalPasteDetected = 0;

  for (const a of answers || []) {
    const meta = (a.metadata as Record<string, unknown>) || {};
    if (typeof meta.timeSpentMs === "number" && meta.timeSpentMs > 0) {
      totalTimeMs += meta.timeSpentMs;
      answerCount++;
    }
    if (meta.pasteDetected) {
      totalPasteDetected++;
    }
  }

  const avgTimePerResponse =
    answerCount > 0 ? Math.round(totalTimeMs / answerCount / 1000) : 0;

  return {
    responsesByDay,
    scoreDistribution,
    respondentDemographics: {
      interests: sortDesc(interestCounts),
      expertise: sortDesc(expertiseCounts),
      tiers: sortDesc(tierCounts),
    },
    avgTimePerResponse,
    totalPasteDetected,
  };
}
