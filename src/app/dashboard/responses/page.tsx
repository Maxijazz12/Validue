import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import SectionHeader from "@/components/ui/SectionHeader";

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

  // For each campaign, count ranked responses and avg score
  const campaignsWithStats = await Promise.all(
    (campaigns || []).map(async (c) => {
      const { data: responses } = await supabase
        .from("responses")
        .select("quality_score, status")
        .eq("campaign_id", c.id)
        .in("status", ["submitted", "ranked"]);

      const ranked = (responses || []).filter((r) => r.status === "ranked");
      const avgScore =
        ranked.length > 0
          ? Math.round(
              ranked.reduce((s, r) => s + (Number(r.quality_score) || 0), 0) /
                ranked.length
            )
          : null;

      return {
        ...c,
        totalResponses: responses?.length || 0,
        rankedCount: ranked.length,
        avgScore,
      };
    })
  );

  const hasCampaigns = campaignsWithStats.length > 0;

  return (
    <>
      <div className="mb-[32px]">
        <SectionHeader size="page" label="All Responses" title="Responses" subtitle="See feedback on your ideas" />
      </div>

      {hasCampaigns ? (
        <div className="flex flex-col gap-[12px]">
          {campaignsWithStats.map((c) => {
            const progress =
              c.target_responses > 0
                ? Math.min((c.current_responses / c.target_responses) * 100, 100)
                : 0;

            return (
              <Link
                key={c.id}
                href={`/dashboard/ideas/${c.id}/responses`}
                className="block bg-white border border-[#E2E8F0] rounded-xl p-[20px] hover:shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-shadow no-underline"
              >
                <div className="flex items-center justify-between gap-[12px] mb-[12px] max-md:flex-col max-md:items-start max-md:gap-[8px]">
                  <span className="text-[15px] font-semibold text-[#111111]">
                    {c.title}
                  </span>
                  <div className="flex items-center gap-[8px] shrink-0">
                    {c.avgScore !== null && (
                      <span
                        className="text-[12px] font-mono font-semibold"
                        style={{
                          color:
                            c.avgScore >= 70
                              ? "#22c55e"
                              : c.avgScore >= 40
                                ? "#E5654E"
                                : "#ef4444",
                        }}
                      >
                        Avg: {c.avgScore}
                      </span>
                    )}
                    <span
                      className={`px-[10px] py-[4px] rounded-full text-[11px] font-semibold uppercase tracking-[0.5px] ${
                        c.ranking_status === "ranked"
                          ? "bg-[#22c55e]/10 text-[#22c55e]"
                          : c.ranking_status === "ranking"
                            ? "bg-[#E5654E]/10 text-[#E5654E]"
                            : "bg-[#F3F4F6] text-[#94A3B8]"
                      }`}
                    >
                      {c.ranking_status === "ranked"
                        ? "Ranked"
                        : c.ranking_status === "ranking"
                          ? "Ranking..."
                          : "Unranked"}
                    </span>
                  </div>
                </div>

                {/* Progress */}
                <div className="mb-[8px]">
                  <div className="h-[4px] rounded-full bg-[#F3F4F6] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#34D399] transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-[6px]">
                    <span className="text-[12px] text-[#94A3B8]">
                      <span className="font-mono font-semibold text-[#111111]">
                        {c.totalResponses}
                      </span>{" "}
                      responses · {c.rankedCount} ranked
                    </span>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#999999"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
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
