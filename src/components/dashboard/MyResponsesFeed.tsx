"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

const tabs = ["All", "In Progress", "Submitted", "Ranked"] as const;
type Tab = (typeof tabs)[number];

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  in_progress: { label: "LOCAL DRAFT", bg: "bg-transparent border border-[#E7E5E4]", text: "text-[#1C1917]" },
  submitted: { label: "INDEXED", bg: "bg-[#F5F5F4]", text: "text-[#78716C]" },
  ranked: { label: "VERIFIED", bg: "bg-[#2ca05a]/15", text: "text-[#2ca05a]" },
};

const tabToStatus: Record<Tab, string | null> = {
  All: null,
  "In Progress": "in_progress",
  Submitted: "submitted",
  Ranked: "ranked",
};

export type ResponseItem = {
  id: string;
  status: string;
  quality_score: number | null;
  payout_amount: number | null;
  ai_feedback: unknown;
  created_at: string;
  campaign: {
    id: string;
    title: string;
    category: string | null;
    reward_amount: number;
    reward_type: string | null;
  } | null;
};

export default function MyResponsesFeed({ responses }: { responses: ResponseItem[] }) {
  const [activeTab, setActiveTab] = useState<Tab>("All");

  const filtered = useMemo(() => {
    const status = tabToStatus[activeTab];
    let result = responses;
    if (status) result = responses.filter((r) => r.status === status);
    
    // Sort so Ranked > Submitted > In Progress
    result.sort((a, b) => {
      if (a.status === "ranked" && b.status !== "ranked") return -1;
      if (b.status === "ranked" && a.status !== "ranked") return 1;
      return 0;
    });
    return result;
  }, [responses, activeTab]);

  const rankedCount = responses.filter((r) => r.status === "ranked").length;

  if (responses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-[100px] border border-dashed border-[#E7E5E4] rounded-[32px] bg-white/40 backdrop-blur-sm shadow-[0_8px_32px_rgba(0,0,0,0.01)] text-center relative overflow-hidden">
        <span className="font-mono text-[11px] font-bold tracking-widest text-[#A8A29E] uppercase mb-4">Database Empty</span>
        <h2 className="text-[20px] md:text-[24px] font-medium tracking-tight text-[#1C1917] mb-[8px]">
          No recorded activity
        </h2>
        <p className="text-[14px] font-medium text-[#78716C] max-w-[360px] mx-auto mb-[32px]">
          Your expertise is requested on the grid.
        </p>
        <Link 
          href="/dashboard/the-wall"
          className="inline-flex items-center justify-center px-[32px] py-[12px] rounded-full text-[12px] font-bold uppercase tracking-widest bg-[#1C1917] text-white transition-all duration-500 hover:bg-[#2A8AF6] hover:shadow-[0_0_24px_rgba(42,138,246,0.3)] cursor-pointer no-underline"
        >
          Initialize
        </Link>
      </div>
    );
  }

  const staggerDelay = (index: number) => ({
    animationDelay: `${Math.min(index, 12) * 50}ms`,
    opacity: 0,
    animation: "cardEntranceV2 0.6s cubic-bezier(0.2, 0.9, 0.3, 1) forwards"
  });

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
          background: conic-gradient(from 180deg at 50% 50%, #2ca05a 0deg, #A853BA 180deg, #E92A67 360deg);
          opacity: 0;
          z-index: -1;
          transition: opacity 0.5s ease;
        }
        .bento-card:hover::before {
          opacity: 0;
        }
        .glow-hover:hover {
          box-shadow: 0 0 0 1px rgba(0,0,0,0.05), 0 12px 32px -8px rgba(0,0,0,0.08);
          transform: translateY(-2px);
        }
      `}} />

      {/* Pane Controller */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-[20px] mb-[40px] p-[8px] bg-white rounded-full border border-[#E7E5E4]/50 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-[6px] w-full md:w-auto p-[4px] overflow-x-auto hide-scrollbar">
          {tabs.map((tab) => {
             const isActive = activeTab === tab;
             return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`text-[12px] font-bold uppercase tracking-widest py-[8px] px-[20px] rounded-full transition-all duration-300 cursor-pointer border-none flexitems-center whitespace-nowrap ${
                  isActive
                    ? "bg-[#1C1917] text-white shadow-md"
                    : "bg-transparent text-[#A8A29E] hover:text-[#1C1917] hover:bg-[#F5F5F4]"
                }`}
              >
                {tab}
              </button>
            )
          })}
        </div>

        <div className="hidden md:flex items-center gap-[12px] px-[16px]">
           <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#A8A29E]">
              {filtered.length} Indexed
           </span>
           {rankedCount > 0 && (
             <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#2ca05a] flex items-center gap-1.5">
               <span className="w-1.5 h-1.5 rounded-full bg-[#2ca05a] animate-pulse" />
               {rankedCount} Verified
             </span>
           )}
        </div>
      </div>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[24px] auto-rows-min">
          {filtered.map((response, index) => {
            const config = statusConfig[response.status] || statusConfig.submitted;
            const hasScore = response.status === "ranked" && response.quality_score !== null;
            const score = Number(response.quality_score) || 0;
            const isInProgress = response.status === "in_progress";
            const isFeatureCard = response.status === "ranked"; // Emphasize ranked ones

            return (
              <div
                key={response.id}
                style={staggerDelay(index)}
                className={`glow-hover bento-card flex flex-col justify-between bg-white/60 backdrop-blur-3xl border border-white/80 shadow-[0_8px_32px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.8)] p-[28px] transition-all duration-400 rounded-[28px] ${
                  isFeatureCard ? "md:col-span-2 lg:col-span-2 min-h-[260px]" : "col-span-1 min-h-[260px]"
                }`}
              >
                <div className="flex flex-col gap-[16px]">
                  <div className="flex items-start justify-between">
                    <span
                      className={`px-[10px] py-[4px] rounded-md font-mono text-[10px] font-bold uppercase tracking-[0.1em] ${config.bg} ${config.text}`}
                    >
                      {config.label}
                    </span>
                    
                    {hasScore && (
                      <div className="flex flex-col items-end">
                        <span className="font-mono text-[14px] font-bold tracking-tight" style={{ color: score >= 70 ? "#2ca05a" : score >= 40 ? "#E5654E" : "#ef4444" }}>
                          {score}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="min-w-0">
                    <span className="font-mono text-[10px] font-bold text-[#A8A29E] uppercase tracking-[0.1em] mb-[4px] block truncate">
                      {response.campaign?.category || "SYS.NODE"}
                    </span>
                    <span className={`font-medium tracking-tight text-[#1C1917] block leading-[1.1] ${isFeatureCard ? 'text-[28px]' : 'text-[20px]'}`}>
                      {response.campaign?.title || "Unknown Terminal"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-[12px] pt-[24px]">
                  {response.payout_amount != null && Number(response.payout_amount) > 0 && (
                    <div className="flex items-center gap-[8px]">
                      <svg className="w-4 h-4 text-[#2ca05a] opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-mono text-[14px] font-bold text-[#2ca05a]">
                        +${Number(response.payout_amount).toFixed(2)}
                      </span>
                    </div>
                  )}

                  {response.status === "ranked" && !!response.ai_feedback && (
                    <div className="bg-[#F5F5F4]/60 rounded-[12px] p-[12px] border border-[#E7E5E4]/40 mt-auto">
                      <p className="text-[12px] font-medium text-[#78716C] leading-[1.5] line-clamp-2">
                        <span className="font-bold text-[#1C1917] mr-[6px]">Feedback:</span>
                        {response.ai_feedback as string}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-[16px] border-t border-[#E7E5E4]/40 mt-[auto]">
                    {isInProgress && response.campaign ? (
                      <Link
                        href={`/dashboard/the-wall/${response.campaign.id}`}
                        className="font-mono text-[10px] uppercase tracking-widest font-bold text-[#1C1917] hover:text-[#2A8AF6] transition-colors no-underline flex items-center gap-1.5"
                      >
                        [ RESUME_NODE ]
                        <svg className="w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                      </Link>
                    ) : (
                      <span className="font-mono text-[10px] uppercase tracking-widest font-bold text-[#A8A29E]">
                        [ TERMINAL_LOCKED ]
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-[64px] border border-dashed border-[#E7E5E4] rounded-[28px] bg-white/40 backdrop-blur-sm text-center">
          <p className="font-mono text-[11px] font-bold text-[#A8A29E] uppercase tracking-widest">Query empty space</p>
        </div>
      )}
    </div>
  );
}
