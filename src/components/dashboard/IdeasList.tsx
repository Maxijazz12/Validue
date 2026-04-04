"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

const statusColors: Record<string, string> = {
  draft: "bg-bg-muted text-text-secondary",
  pending_funding: "bg-brand/10 text-brand",
  pending_gate: "bg-brand/10 text-brand",
  active: "bg-[#1C1A1A] text-white",
  completed: "bg-bg-muted text-text-muted",
  paused: "bg-[#fde047]/10 text-[#a16207]",
};

const statusLabel: Record<string, string> = {
  draft: "DRAFT",
  pending_funding: "PENDING",
  pending_gate: "GATE",
  active: "LIVE",
  completed: "DONE",
  paused: "PAUSED",
};

export type IdeaItem = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  reward_amount: number;
  reward_type: string | null;
  current_responses: number;
  target_responses: number;
  target_interests: string[] | null;
  target_expertise: string[] | null;
  matched_responses: number;
  audienceText: string;
  audienceColor: string;
  created_at?: string | null;
};

type StatusFilter = "all" | "draft" | "active" | "completed" | "pending_funding" | "pending_gate" | "paused";

function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getCtaLabel(status: string): string {
  switch (status) {
    case "draft": return "Edit";
    case "pending_funding": return "Fund";
    case "pending_gate": return "Continue";
    case "active": return "Manage";
    case "completed": return "View Brief";
    case "paused": return "Resume";
    default: return "View";
  }
}

export default function IdeasList({ ideas }: { ideas: IdeaItem[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const idea of ideas) {
      counts[idea.status] = (counts[idea.status] || 0) + 1;
    }
    return counts;
  }, [ideas]);

  const availableStatuses: StatusFilter[] = useMemo(() => {
    const statuses: StatusFilter[] = ["all"];
    for (const s of ["active", "draft", "completed", "pending_funding", "pending_gate", "paused"] as const) {
      if (statusCounts[s]) statuses.push(s);
    }
    return statuses;
  }, [statusCounts]);

  const staggerDelay = (index: number) => ({
    opacity: 0,
    animation: `cardEntranceV2 0.6s cubic-bezier(0.2, 0.9, 0.3, 1) ${Math.min(index, 12) * 50}ms forwards`,
  });

  const filtered = useMemo(() => {
    let result = ideas;
    if (statusFilter !== "all") {
      result = result.filter((i) => i.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter((i) => {
        const tags = [...(i.target_interests || []), ...(i.target_expertise || [])];
        return (
          i.title.toLowerCase().includes(q) ||
          tags.some((t) => t.toLowerCase().includes(q))
        );
      });
    }
    result.sort((a, b) => {
      if (a.status === "active" && b.status !== "active") return -1;
      if (b.status === "active" && a.status !== "active") return 1;
      return 0;
    });
    return result;
  }, [ideas, statusFilter, search]);

  return (
    <div className="relative z-10 w-full max-w-7xl mx-auto">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes cardEntranceV2 {
          0% { opacity: 0; transform: translateY(24px) scale(0.96) rotateX(-4deg); }
          100% { opacity: 1; transform: translateY(0) scale(1) rotateX(0); }
        }
        .glow-hover:hover {
          box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 8px 24px -4px rgba(0,0,0,0.08);
          transform: translateY(-1px);
        }
      `}} />

      {/* Filter Bar */}
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

        {availableStatuses.length > 2 && (
          <div className="flex gap-[6px] shrink-0 pr-[8px]">
            {availableStatuses.map((s) => {
              const isActive = statusFilter === s;
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`text-[12px] font-medium uppercase tracking-wide py-[8px] px-[18px] rounded-full transition-all duration-300 cursor-pointer border-none flex items-center gap-2 ${
                    isActive
                      ? "bg-accent text-white shadow-md"
                      : "bg-transparent text-text-muted hover:text-text-primary hover:bg-bg-muted"
                  }`}
                >
                  {s === "all" ? "ALL" : statusLabel[s] || s}
                  <span className="text-[10px] opacity-80">
                    {s === "all" ? ideas.length : statusCounts[s] || 0}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-[100px] border border-dashed border-border-light rounded-[32px] bg-white/90">
          <span className="font-mono text-[11px] font-medium tracking-wide text-text-muted uppercase mb-4">No results</span>
          <span className="text-[20px] md:text-[24px] font-medium tracking-tight text-text-primary">
             No campaigns found
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-[12px] md:gap-[24px] auto-rows-min">
          {filtered.map((idea, index) => {
            const progress = idea.target_responses > 0 ? Math.min((idea.current_responses / idea.target_responses) * 100, 100) : 0;
            const hasReward = idea.reward_amount > 0;
            const targetTags = [...(idea.target_interests || []), ...(idea.target_expertise || [])].slice(0, 3);
            const ideaHref = idea.status === "draft" ? `/dashboard/ideas/${idea.id}/edit` : `/dashboard/ideas/${idea.id}`;
            const ctaLabel = getCtaLabel(idea.status);
            // Deterministic hash for per-card jitter
            let idHash = 0;
            for (let j = 0; j < idea.id.length; j++) idHash = idea.id.charCodeAt(j) + ((idHash << 5) - idHash);
            const isHero = Math.abs(idHash) % 10 === 0; // ~1 in 10

            // Cascading staircase: left tallest → steps down to the right, with jitter
            const col = index % 3;
            const basePad = [0, 24, 48][col];
            const jitter = ((Math.abs(idHash) % 3) - 1) * 8;
            const extraPad = Math.max(0, basePad + jitter);

            return (
              <Link
                key={idea.id}
                href={ideaHref}
                style={{ ...staggerDelay(index), ...(!isHero ? { paddingBottom: `${20 + extraPad}px` } : {}) }}
                className={`glow-hover relative flex flex-col justify-between bg-white border border-border-light shadow-card transition-all duration-400 no-underline overflow-hidden rounded-[20px] px-[14px] py-[20px] md:rounded-[28px] md:p-[28px] ${
                  isHero ? "col-span-2 lg:col-span-2" : "col-span-1"
                }`}
              >
                {/* Active accent bar */}
                {idea.status === "active" && (
                  <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-transparent via-success/60 to-transparent" />
                )}

                {/* Content Top */}
                <div className="flex flex-col gap-[10px] md:gap-[14px]">
                  {/* Metadata Row — status + reward */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-[8px] py-[3px] rounded-md text-[10px] font-semibold tracking-tight ${
                        statusColors[idea.status] || statusColors.draft
                      }`}
                    >
                      {statusLabel[idea.status] || idea.status}
                    </span>
                    {hasReward ? (
                      <span className="text-[13px] font-semibold tracking-tight text-success">
                        ${idea.reward_amount.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium tracking-tight text-text-muted">
                        {timeAgo(idea.created_at)}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className={`font-medium tracking-tight text-text-primary leading-[1.2] m-0 ${isHero ? "text-[18px] md:text-[20px]" : "text-[15px] md:text-[20px]"}`}>
                    {idea.title}
                  </h3>

                  {/* Description — hidden on compact mobile cards, visible on hero */}
                  {idea.description && (
                    <p className={`text-[14px] text-text-secondary leading-[1.4] m-0 overflow-hidden ${isHero ? "" : "hidden md:block"}`} style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" } as React.CSSProperties}>
                      {idea.description}
                    </p>
                  )}

                  {/* Tags — hidden on compact mobile, visible on hero */}
                  {targetTags.length > 0 && (
                    <div className={`flex items-center gap-[6px] shrink-0 flex-wrap ${isHero ? "" : "hidden md:flex"}`}>
                      {targetTags.map((tag) => (
                        <span key={tag} className="px-[8px] py-[3px] rounded-md text-[11px] font-medium tracking-tight bg-bg-muted text-text-secondary leading-none">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="mt-auto pt-[16px] md:pt-[24px]">
                  {/* Progress header */}
                  <div className="flex items-end justify-between mb-[8px]">
                    <span className="font-medium tracking-tight text-text-secondary text-[11px] md:text-[12px]">
                      {idea.current_responses} response{idea.current_responses !== 1 && "s"}
                    </span>
                    <span className="text-[11px] font-semibold tracking-tight text-text-muted">
                      {idea.current_responses}/{idea.target_responses}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-[3px] w-full bg-bg-muted overflow-hidden mb-[12px] md:mb-[20px]">
                    <div
                      className={`h-full transition-all duration-1000 ease-[cubic-bezier(0.2,0.9,0.3,1)] ${idea.status === "active" ? "bg-success" : "bg-border-muted"}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  {/* Action row */}
                  <div className="flex items-center justify-between">
                    {/* Audience quality indicator */}
                    <div className="flex items-center gap-[6px]">
                      {idea.status === "active" && idea.current_responses > 0 && (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                          <span className="text-[11px] font-medium tracking-tight text-success hidden md:inline">
                            Collecting
                          </span>
                        </>
                      )}
                    </div>

                    {/* CTA */}
                    <span className="uppercase tracking-wide font-semibold text-[11px] text-text-primary hover:text-brand transition-colors duration-300 flex items-center gap-1.5 ml-auto">
                      {ctaLabel}
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    </span>
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
