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

const filterLabels: Record<RankingFilter, string> = {
  all: "ALL",
  ranked: "RANKED",
  ranking: "RANKING",
  unranked: "UNRANKED",
};

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

  const staggerDelay = (index: number) => ({
    opacity: 0,
    animation: `cardEntranceV2 0.6s cubic-bezier(0.2, 0.9, 0.3, 1) ${Math.min(index, 12) * 50}ms forwards`,
  });

  return (
    <div className="relative z-10 w-full max-w-7xl mx-auto">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes cardEntranceV2 {
          0% { opacity: 0; transform: translateY(24px) scale(0.96) rotateX(-4deg); }
          100% { opacity: 1; transform: translateY(0) scale(1) rotateX(0); }
        }
        .glow-hover:hover {
          box-shadow: 0 0 0 1px rgba(0,0,0,0.05), 0 12px 32px -8px rgba(0,0,0,0.08);
          transform: translateY(-2px);
        }
      `}} />

      {/* Search + filter pane */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-[20px] mb-[40px] p-[8px] bg-white rounded-full border border-border-light/50 shadow-card-sm">
        <div className="relative flex-1 w-full flex items-center shrink-0">
          <svg className="absolute left-[20px]" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D6D3D1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search campaigns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-[52px] pr-[20px] py-[12px] bg-transparent text-[15px] font-medium tracking-tight text-text-primary placeholder:text-text-muted outline-none"
          />
        </div>

        {availableFilters.length > 2 && (
          <div className="flex gap-[6px] shrink-0 pr-[8px]">
            {availableFilters.map((f) => {
              const isActive = rankingFilter === f;
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setRankingFilter(f)}
                  className={`text-[12px] font-medium uppercase tracking-wide py-[8px] px-[18px] rounded-full transition-all duration-300 cursor-pointer border-none flex items-center gap-2 ${
                    isActive
                      ? "bg-accent text-white shadow-md"
                      : "bg-transparent text-text-muted hover:text-text-primary hover:bg-bg-muted"
                  }`}
                >
                  {filterLabels[f]}
                  <span className="text-[10px] opacity-80">
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
        <div className="flex flex-col items-center justify-center py-[100px] border border-dashed border-border-light rounded-[32px] bg-white/90 text-center">
          <span className="font-mono text-[11px] font-medium tracking-wide text-text-muted uppercase mb-4 block">Query returned zero nodes</span>
          <p className="text-[20px] font-medium tracking-tight text-text-primary">
            {search.trim() ? `No campaigns matching "${search}"` : "No campaigns in this category"}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-[12px]">
          {filtered.map((c, index) => {
            const progress =
              c.target_responses > 0
                ? Math.min((c.current_responses / c.target_responses) * 100, 100)
                : 0;

            return (
              <Link
                key={c.id}
                href={`/dashboard/ideas/${c.id}/responses`}
                style={staggerDelay(index)}
                className="glow-hover block bg-white border border-border-light shadow-card-interactive rounded-[24px] p-[24px] transition-all duration-400 no-underline"
              >
                <div className="flex items-center justify-between gap-[12px] mb-[16px] max-md:flex-col max-md:items-start max-md:gap-[8px]">
                  <span className="text-[17px] font-medium tracking-tight text-text-primary">
                    {c.title}
                  </span>
                  <div className="flex items-center gap-[8px] shrink-0">
                    {c.avgScore !== null && (
                      <span
                        className="font-mono text-[12px] font-bold"
                        style={{
                          color:
                            c.avgScore >= 70
                              ? "#22c55e"
                              : c.avgScore >= 40
                                ? "#E5654E"
                                : "#ef4444",
                        }}
                      >
                        AVG {c.avgScore}
                      </span>
                    )}
                    <span
                      className={`px-[10px] py-[4px] rounded-md font-mono text-[11px] font-medium uppercase tracking-wide ${
                        c.ranking_status === "ranked"
                          ? "bg-success/15 text-success"
                          : c.ranking_status === "ranking"
                            ? "bg-brand/10 text-brand"
                            : "bg-bg-muted text-text-muted"
                      }`}
                    >
                      {c.ranking_status === "ranked"
                        ? "RANKED"
                        : c.ranking_status === "ranking"
                          ? "RANKING"
                          : "UNRANKED"}
                    </span>
                  </div>
                </div>

                {/* Progress */}
                <div className="flex items-end justify-between font-mono text-[11px] font-medium text-text-muted mb-[8px] uppercase tracking-wide">
                  <span>{c.totalResponses} Response{c.totalResponses !== 1 && "s"}</span>
                  <span className="text-border-muted">{c.rankedCount} Ranked</span>
                </div>
                <div className="h-[3px] w-full bg-bg-muted overflow-hidden">
                  <div
                    className={`h-full transition-all duration-1000 ease-[cubic-bezier(0.2,0.9,0.3,1)] ${
                      c.ranking_status === "ranked" ? "bg-success" : "bg-accent"
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
