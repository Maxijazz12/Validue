"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

const statusColors: Record<string, string> = {
  draft: "bg-[#F1F5F9] text-[#94A3B8]",
  pending_funding: "bg-[#E5654E]/10 text-[#E5654E]",
  active: "bg-[#22c55e]/10 text-[#22c55e]",
  completed: "bg-[#3b82f6]/10 text-[#3b82f6]",
  paused: "bg-[#E5654E]/10 text-[#E5654E]",
};

const statusLabel: Record<string, string> = {
  draft: "Draft",
  pending_funding: "Pending Funding",
  active: "Active",
  completed: "Completed",
  paused: "Paused",
};

function getRewardLabel(amount: number, type: string | null): string {
  switch (type) {
    case "fixed": return `$${amount} per response`;
    case "pool": return `$${amount} reward pool`;
    case "top_only": return `$${amount} for top answers`;
    default: return `$${amount} reward`;
  }
}

export type IdeaItem = {
  id: string;
  title: string;
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
};

type StatusFilter = "all" | "draft" | "active" | "completed" | "pending_funding" | "paused";

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

  // Only show filter tabs for statuses that exist
  const availableStatuses: StatusFilter[] = useMemo(() => {
    const statuses: StatusFilter[] = ["all"];
    for (const s of ["active", "draft", "completed", "pending_funding", "paused"] as const) {
      if (statusCounts[s]) statuses.push(s);
    }
    return statuses;
  }, [statusCounts]);

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

    return result;
  }, [ideas, statusFilter, search]);

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
            placeholder="Search ideas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-[34px] pr-[12px] py-[8px] rounded-xl border border-[#E2E8F0] text-[13px] text-[#111111] bg-white placeholder:text-[#94A3B8] outline-none focus:border-[#CBD5E1] focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] transition-all duration-200"
          />
        </div>

        {/* Status filter tabs */}
        {availableStatuses.length > 2 && (
          <div className="flex gap-[4px] p-[4px] rounded-lg bg-[#F3F4F6] shrink-0">
            {availableStatuses.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`text-[12px] font-semibold py-[6px] px-[10px] rounded-md transition-all cursor-pointer border-none whitespace-nowrap ${
                  statusFilter === s
                    ? "bg-white text-[#111111] shadow-sm"
                    : "bg-transparent text-[#64748B] hover:text-[#111111]"
                }`}
              >
                {s === "all" ? "All" : statusLabel[s] || s}
                <span className="ml-[3px] text-[#94A3B8] font-normal text-[11px]">
                  {s === "all" ? ideas.length : statusCounts[s] || 0}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="text-center py-[32px] text-[13px] text-[#94A3B8]">
          {search.trim() ? `No ideas matching "${search}"` : "No ideas in this category."}
        </div>
      ) : (
        <div className="flex flex-col gap-[12px]">
          {filtered.map((idea) => {
            const progress =
              idea.target_responses > 0
                ? Math.min((idea.current_responses / idea.target_responses) * 100, 100)
                : 0;
            const hasReward = idea.reward_amount > 0;
            const targetTags = [
              ...(idea.target_interests || []),
              ...(idea.target_expertise || []),
            ].slice(0, 4);

            const ideaHref = idea.status === "draft"
              ? `/dashboard/ideas/${idea.id}/edit`
              : `/dashboard/ideas/${idea.id}`;

            return (
              <Link
                key={idea.id}
                href={ideaHref}
                className="block bg-white border border-[#E2E8F0] rounded-2xl p-[20px] hover:border-[#CBD5E1] hover:shadow-[0_4px_12px_rgba(0,0,0,0.04),0_1px_3px_rgba(232,193,176,0.06)] transition-all duration-200 no-underline"
              >
                {/* Top row: title + status */}
                <div className="flex items-center justify-between gap-[12px] mb-[12px] max-md:flex-col max-md:items-start max-md:gap-[8px]">
                  <div className="text-[15px] font-semibold text-[#111111]">
                    {idea.title}
                  </div>
                  <div className="flex items-center gap-[8px] shrink-0">
                    {hasReward && (
                      <span className="text-[12px] font-mono font-medium text-[#111111]">
                        {getRewardLabel(idea.reward_amount, idea.reward_type)}
                      </span>
                    )}
                    <span
                      className={`px-[10px] py-[4px] rounded-full text-[11px] font-semibold uppercase tracking-[0.5px] ${
                        statusColors[idea.status] || statusColors.draft
                      }`}
                    >
                      {statusLabel[idea.status] || idea.status}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-[12px]">
                  <div className="h-[4px] rounded-full bg-[#F3F4F6] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#34D399] transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-[6px]">
                    <span className="text-[12px] text-[#94A3B8]">
                      <span className="font-mono font-semibold text-[#111111]">
                        {idea.current_responses}
                      </span>
                      /{idea.target_responses} responses
                    </span>
                    {idea.status === "active" && idea.current_responses > 0 && (
                      <span className="text-[11px] text-[#22c55e] font-medium">
                        Collecting
                      </span>
                    )}
                  </div>
                </div>

                {/* Audience quality + targeting tags */}
                <div className="flex items-center justify-between gap-[12px] max-md:flex-col max-md:items-start max-md:gap-[8px]">
                  <div className="flex items-center gap-[8px] min-w-0">
                    <span className={`text-[12px] font-semibold ${idea.audienceColor}`}>
                      {idea.audienceText}
                    </span>
                    {idea.matched_responses > 0 && idea.current_responses > 0 && (
                      <span className="text-[11px] text-[#94A3B8]">
                        {idea.matched_responses}/{idea.current_responses} from matched profiles
                      </span>
                    )}
                  </div>
                  {targetTags.length > 0 && (
                    <div className="flex items-center gap-[4px] shrink-0 flex-wrap">
                      <span className="text-[11px] text-[#94A3B8]">Targeting:</span>
                      {targetTags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] px-[6px] py-[2px] rounded-full bg-[#F3F4F6] text-[#64748B]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
