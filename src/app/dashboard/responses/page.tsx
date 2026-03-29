import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SectionHeader from "@/components/ui/SectionHeader";
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
      .in("status", ["submitted", "ranked"]);
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
      current_responses: c.current_responses,
      target_responses: c.target_responses,
      ranking_status: c.ranking_status || "unranked",
      totalResponses: stats.total,
      rankedCount: stats.ranked,
      avgScore: stats.ranked > 0 ? Math.round(stats.scoreSum / stats.ranked) : null,
    };
  });

  const hasCampaigns = campaignsWithStats.length > 0;

  return (
    <>
      <div className="mb-[32px]">
        <SectionHeader size="page" label="All Responses" title="Responses" subtitle="See feedback on your ideas" />
      </div>

      {hasCampaigns ? (
        <ResponsesOverviewList campaigns={campaignsWithStats} />
      ) : (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-[48px] text-center">
          <div className="w-[56px] h-[56px] rounded-2xl bg-gradient-to-br from-[#E8C1B0]/10 to-[#E5654E]/5 flex items-center justify-center mx-auto mb-[16px]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E5654E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
          </div>
          <h2 className="text-[20px] font-bold text-[#111111] mb-[8px]">
            No responses yet
          </h2>
          <p className="text-[14px] text-[#64748B] max-w-[360px] mx-auto">
            Once respondents start answering your campaigns, their feedback will
            appear here.
          </p>
        </div>
      )}
    </>
  );
}
