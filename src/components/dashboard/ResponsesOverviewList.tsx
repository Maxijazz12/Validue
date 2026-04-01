"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

export type CampaignWithStats = {
  id: string;
  title: string;
  current_responses: number;
  target_responses: number;
  ranking_status: string;
  totalResponses: number;
  rankedCount: number;
  avgScore: number | null;
};

type RankingFilter = "all" | "ranked" | "unranked" | "ranking";

export default function ResponsesOverviewList({ campaigns }: { campaigns: CampaignWithStats[] }) {
  const [search, setSearch] = useState("");
  const [rankingFilter, setRankingFilter] = useState<RankingFilter>("all");

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const camp of campaigns) {
      const rs = camp.ranking_status || "unranked";
      c[rs] = (c[rs] || 0) + 1;
    }
    return c;
  }, [campaigns]);

  const availableFilters: RankingFilter[] = useMemo(() => {
    const filters: RankingFilter[] = ["all"];
    for (const s of ["unranked", "ranking", "ranked"] as const) {
      if (counts[s]) filters.push(s);
    }
    return filters;
  }, [counts]);

  const filtered = useMemo(() => {
    let result = campaigns;

    if (rankingFilter !== "all") {
      result = result.filter((c) => (c.ranking_status || "unranked") === rankingFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter((c) => c.title.toLowerCase().includes(q));
    }

    return result;
  }, [campaigns, rankingFilter, search]);

  return (
    <div>
      {/* Search + filter row */}
      <div className="flex items-center gap-[12px] mb-[16px] max-md:flex-col max-md:items-stretch">
        {/* Search */}
        <div className="relative flex-1">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#94A3B8"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="absolute left-[12px] top-1/2 -translate-y-1/2"
          >
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search campaigns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-[34px] pr-[12px] py-[8px] rounded-xl border border-[#E2E8F0] text-[13px] text-[#111111] bg-white placeholder:text-[#94A3B8] outline-none focus:border-[#CBD5E1] focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] transition-all duration-200"
          />
        </div>

        {/* Ranking filter tabs */}
        {availableFilters.length > 2 && (
          <div className="flex gap-[4px] p-[4px] rounded-lg bg-[#F3F4F6] shrink-0">
            {availableFilters.map((f) => {
              const label = f === "all" ? "All" : f === "ranked" ? "Ranked" : f === "ranking" ? "Ranking" : "Unranked";
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setRankingFilter(f)}
                  className={`text-[12px] font-semibold py-[6px] px-[10px] rounded-md transition-all cursor-pointer border-none whitespace-nowrap ${
                    rankingFilter === f
                      ? "bg-white text-[#111111] shadow-sm"
                      : "bg-transparent text-[#64748B] hover:text-[#111111]"
                  }`}
                >
                  {label}
                  <span className="ml-[3px] text-[#94A3B8] font-normal text-[11px]">
                    {f === "all" ? campaigns.length : counts[f] || 0}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="text-center py-[32px] text-[13px] text-[#94A3B8]">
          {search.trim() ? `No campaigns matching "${search}"` : "No campaigns in this category."}
        </div>
      ) : (
        <div className="flex flex-col gap-[12px]">
          {filtered.map((c) => {
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
      )}
    </div>
  );
}
