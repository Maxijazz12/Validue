import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

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
        <h1 className="text-[28px] font-bold text-[#111111] tracking-[-0.5px]">
          Responses
        </h1>
        <p className="text-[15px] text-[#555555] mt-[4px]">
          See feedback on your ideas
        </p>
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
                className="block bg-white border border-[#ebebeb] rounded-xl p-[20px] hover:shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-shadow no-underline"
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
                              ? "#65a30d"
                              : c.avgScore >= 40
                                ? "#e8b87a"
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
                            ? "bg-[#e8b87a]/10 text-[#e8b87a]"
                            : "bg-[#f5f2ed] text-[#999999]"
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
                  <div className="h-[4px] rounded-full bg-[#f5f2ed] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#65a30d] transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-[6px]">
                    <span className="text-[12px] text-[#999999]">
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
        <div className="bg-white border border-[#ebebeb] rounded-2xl p-[48px] text-center">
          <div className="text-[40px] mb-[16px]">&#x1f4ac;</div>
          <h2 className="text-[20px] font-bold text-[#111111] mb-[8px]">
            No responses yet
          </h2>
          <p className="text-[14px] text-[#555555] max-w-[360px] mx-auto">
            Once respondents start answering your campaigns, their feedback will
            appear here.
          </p>
        </div>
      )}
    </>
  );
}
