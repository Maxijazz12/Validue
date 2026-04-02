"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

const statusColors: Record<string, string> = {
  draft: "bg-[#F5F5F4] text-[#78716C]",
  pending_funding: "bg-[#E5654E]/10 text-[#E5654E]",
  pending_gate: "bg-[#E5654E]/10 text-[#E5654E]",
  active: "bg-[#1C1A1A] text-white",
  completed: "bg-[#F5F5F4] text-[#A8A29E]",
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

type StatusFilter = "all" | "draft" | "active" | "completed" | "pending_funding" | "pending_gate" | "paused";

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
    // Sort so Active items are generally first for the Bento grid
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
        
        .bento-card {
          position: relative;
        }
        .bento-card::before {
          content: "";
          position: absolute;
          inset: -1px;
          border-radius: inherit;
          background: conic-gradient(from 180deg at 50% 50%, #2A8AF6 0deg, #A853BA 180deg, #E92A67 360deg);
          opacity: 0;
          z-index: -1;
          transition: opacity 0.5s ease;
        }
        .bento-card:hover::before {
          opacity: 0; /* Keep it subtle initially unless explicitly wanted */
        }
        .glow-hover:hover {
          box-shadow: 0 0 0 1px rgba(0,0,0,0.05), 0 12px 32px -8px rgba(0,0,0,0.08);
          transform: translateY(-2px);
        }
      `}} />
      
      {/* Precision Search & Filter Pane */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-[20px] mb-[40px] p-[8px] bg-white rounded-full border border-[#E7E5E4]/50 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
        <div className="relative flex-1 w-full flex items-center shrink-0">
          <svg className="absolute left-[20px]" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D6D3D1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Command and index campaigns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-[52px] pr-[20px] py-[12px] bg-transparent text-[15px] font-medium tracking-tight text-[#1C1917] placeholder:text-[#A8A29E] outline-none"
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
                  className={`text-[12px] font-bold uppercase tracking-widest py-[8px] px-[18px] rounded-full transition-all duration-300 cursor-pointer border-none flex items-center gap-2 ${
                    isActive
                      ? "bg-[#1C1917] text-white shadow-md relative overflow-hidden"
                      : "bg-transparent text-[#A8A29E] hover:text-[#1C1917] hover:bg-[#F5F5F4]"
                  }`}
                >
                  {s === "all" ? "ALL" : statusLabel[s] || s}
                  <span className={`text-[10px] bg-transparent opacity-80`}>
                    {s === "all" ? ideas.length : statusCounts[s] || 0}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-[100px] border border-dashed border-[#E7E5E4] rounded-[32px] bg-white/40 backdrop-blur-sm">
          <span className="font-mono text-[11px] font-bold tracking-widest text-[#A8A29E] uppercase mb-4">Query returned zero nodes</span>
          <span className="text-[20px] md:text-[24px] font-medium tracking-tight text-[#1C1917]">
             No campaigns found
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[24px] auto-rows-min">
          {filtered.map((idea, index) => {
            const progress = idea.target_responses > 0 ? Math.min((idea.current_responses / idea.target_responses) * 100, 100) : 0;
            const hasReward = idea.reward_amount > 0;
            const targetTags = [...(idea.target_interests || []), ...(idea.target_expertise || [])].slice(0, 3);
            const ideaHref = idea.status === "draft" ? `/dashboard/ideas/${idea.id}/edit` : `/dashboard/ideas/${idea.id}`;
            const isFeatureCard = idea.status === "active"; // Bento sizing

            return (
              <Link
                key={idea.id}
                href={ideaHref}
                style={staggerDelay(index)}
                className={`glow-hover bento-card flex flex-col justify-between bg-white/60 backdrop-blur-3xl border border-white/80 shadow-[0_8px_32px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.8)] p-[28px] transition-all duration-400 no-underline rounded-[28px] ${
                  isFeatureCard ? "md:col-span-2 lg:col-span-2 row-span-2 min-h-[300px]" : "col-span-1 min-h-[220px]"
                }`}
              >
                <div className="flex flex-col gap-[16px]">
                  {/* Metadata Row */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-[12px] py-[4px] rounded-full text-[10px] font-bold uppercase tracking-[0.1em] ${
                        statusColors[idea.status] || statusColors.draft
                      }`}
                    >
                      {statusLabel[idea.status] || idea.status}
                    </span>
                    {hasReward && (
                      <span className="text-[12px] font-mono font-bold text-[#E5654E]">
                        ${idea.reward_amount.toFixed(2)}
                      </span>
                    )}
                  </div>
                  
                  {/* Title */}
                  <h3 className={`font-medium tracking-tight text-[#1C1917] leading-[1.1] m-0 ${isFeatureCard ? 'text-[28px] md:text-[36px]' : 'text-[20px]'}`}>
                    {idea.title}
                  </h3>

                  {/* Targeting Tags */}
                  {targetTags.length > 0 && (
                    <div className="flex items-center gap-[6px] shrink-0 flex-wrap mt-[4px]">
                      {targetTags.map((tag) => (
                        <span key={tag} className="text-[10px] px-[8px] py-[3px] rounded-md font-mono font-semibold uppercase bg-[#F5F5F4] text-[#A8A29E]">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Progress / Status Bar Footer */}
                <div className="pt-[24px] mt-[16px]">
                  <div className="flex items-end justify-between font-mono text-[11px] font-bold text-[#78716C] mb-[8px] uppercase tracking-widest">
                    <span>{idea.current_responses} Node{idea.current_responses !== 1 && 's'}</span>
                    <span className="text-[#D6D3D1]">{idea.target_responses} Max</span>
                  </div>
                  <div className="h-[2px] w-full bg-[#F5F5F4] overflow-hidden rounded-full">
                    <div
                      className={`h-full transition-all duration-1000 ease-[cubic-bezier(0.2,0.9,0.3,1)] ${idea.status === "active" ? "bg-[#1C1917]" : "bg-[#D6D3D1]"}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  
                  {isFeatureCard && idea.matched_responses > 0 && (
                    <div className="flex items-center gap-[8px] mt-[16px]">
                       <div className="w-1.5 h-1.5 rounded-full bg-[#2ca05a] animate-pulse" />
                       <span className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-[#2ca05a]">
                         {Math.round((idea.matched_responses / idea.current_responses) * 100)}% Index Match Quality
                       </span>
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
