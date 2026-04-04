import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ResponsesOverviewList, { type CampaignWithStats } from "@/components/dashboard/ResponsesOverviewList";

export default async function ResponsesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Fetch campaigns with responses
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id, title, status, current_responses, target_responses, ranking_status")
    .eq("creator_id", user.id)
    .gt("current_responses", 0)
    .order("created_at", { ascending: false });

  // Batch fetch response stats for all campaigns in one query
  const campaignIds = (campaigns || []).map((c) => c.id);
  const statsMap = new Map<string, { total: number; ranked: number; scoreSum: number }>();
  if (campaignIds.length > 0) {
    const { data: allResponses } = await supabase
      .from("responses")
      .select("campaign_id, quality_score, status")
      .in("campaign_id", campaignIds)
      .in("status", ["submitted", "ranked"])
      .limit(5000);
    for (const r of allResponses || []) {
      const entry = statsMap.get(r.campaign_id) || { total: 0, ranked: 0, scoreSum: 0 };
      entry.total++;
      if (r.status === "ranked") {
        entry.ranked++;
        entry.scoreSum += Number(r.quality_score) || 0;
      }
      statsMap.set(r.campaign_id, entry);
    }
  }

  const campaignsWithStats: CampaignWithStats[] = (campaigns || []).map((c) => {
    const stats = statsMap.get(c.id) || { total: 0, ranked: 0, scoreSum: 0 };
    return {
      id: c.id,
      title: c.title,
      current_responses: c.current_responses ?? 0,
      target_responses: c.target_responses ?? 0,
      ranking_status: c.ranking_status || "unranked",
      totalResponses: stats.total,
      rankedCount: stats.ranked,
      avgScore: stats.ranked > 0 ? Math.round(stats.scoreSum / stats.ranked) : null,
    };
  });

  const hasCampaigns = campaignsWithStats.length > 0;

  return (
    <>
      <div className="mb-[24px]">
        <h1 className="text-[24px] font-medium tracking-tight text-text-primary">Responses</h1>
        <p className="text-[14px] text-text-secondary mt-[4px]">See feedback on your ideas</p>
      </div>

      {hasCampaigns ? (
        <ResponsesOverviewList campaigns={campaignsWithStats} />
      ) : (
        <div className="py-[120px] text-center border border-dashed border-border-light rounded-[32px] bg-white/90">
          <span className="font-mono text-[11px] font-medium tracking-wide text-text-muted uppercase mb-4 block">Inbox Empty</span>
          <p className="text-[20px] font-medium tracking-tight text-text-primary mb-[4px]">No responses yet</p>
          <p className="text-[14px] text-text-secondary mt-[4px] max-w-[360px] mx-auto">
            Once respondents start answering your campaigns, their feedback will
            appear here.
          </p>
        </div>
      )}
    </>
  );
}
