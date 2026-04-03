"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

const tabs = ["All", "In Progress", "Submitted", "Ranked"] as const;
type Tab = (typeof tabs)[number];

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  in_progress: { label: "Draft", bg: "bg-transparent border border-border-light", text: "text-text-primary" },
  submitted: { label: "Submitted", bg: "bg-bg-muted", text: "text-text-secondary" },
  ranked: { label: "Ranked", bg: "bg-success/15", text: "text-success" },
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
      <div className="flex flex-col items-center justify-center py-[100px] border border-dashed border-border-light rounded-[32px] bg-white/90 shadow-card-sm text-center relative overflow-hidden">
        <span className="font-mono text-[11px] font-medium tracking-wide text-text-muted uppercase mb-4">Database Empty</span>
        <h2 className="text-[20px] md:text-[24px] font-medium tracking-tight text-text-primary mb-[8px]">
          No recorded activity
        </h2>
        <p className="text-[14px] font-medium text-text-secondary max-w-[360px] mx-auto mb-[32px]">
          Your expertise is requested on the grid.
        </p>
        <Link 
          href="/dashboard/the-wall"
          className="inline-flex items-center justify-center px-[32px] py-[12px] rounded-full text-[12px] font-medium uppercase tracking-wide bg-accent text-white transition-all duration-500 hover:bg-[#2A8AF6] hover:shadow-[0_0_24px_rgba(42,138,246,0.3)] cursor-pointer no-underline"
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

      {/* Pane Controller */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-[20px] mb-[40px] p-[8px] bg-white rounded-full border border-border-light/50 shadow-card-sm">
        <div className="flex items-center gap-[6px] w-full md:w-auto p-[4px] overflow-x-auto hide-scrollbar">
          {tabs.map((tab) => {
             const isActive = activeTab === tab;
             return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`text-[12px] font-medium uppercase tracking-wide py-[8px] px-[20px] rounded-full transition-all duration-300 cursor-pointer border-none flex items-center whitespace-nowrap ${
                  isActive
                    ? "bg-accent text-white shadow-md"
                    : "bg-transparent text-text-muted hover:text-text-primary hover:bg-bg-muted"
                }`}
              >
                {tab}
              </button>
            )
          })}
        </div>

        <div className="hidden md:flex items-center gap-[12px] px-[16px]">
           <span className="font-mono text-[11px] font-medium uppercase tracking-wide text-text-muted">
              {filtered.length} Indexed
           </span>
           {rankedCount > 0 && (
             <span className="font-mono text-[11px] font-medium uppercase tracking-wide text-success flex items-center gap-1.5">
               <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
               {rankedCount} Verified
             </span>
           )}
        </div>
      </div>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-[12px] md:gap-[24px] auto-rows-min">
          {filtered.map((response, index) => {
            const config = statusConfig[response.status] || statusConfig.submitted;
            const hasScore = response.status === "ranked" && response.quality_score !== null;
            const score = Number(response.quality_score) || 0;
            const isInProgress = response.status === "in_progress";
            const isFeatureCard = response.status === "ranked";

            return (
              <div
                key={response.id}
                style={staggerDelay(index)}
                className={`glow-hover bento-card flex flex-col justify-between bg-white border border-border-light shadow-card transition-all duration-400 ${
                  isFeatureCard
                    ? "col-span-2 lg:col-span-2 min-h-[260px] rounded-[28px] p-[28px]"
                    : "col-span-1 rounded-[20px] px-[14px] py-[20px] md:rounded-[28px] md:p-[28px] md:min-h-[260px]"
                }`}
              >
                <div className={`flex flex-col ${isFeatureCard ? "gap-[16px]" : "gap-[10px] md:gap-[16px]"}`}>
                  <div className="flex items-start justify-between">
                    <span
                      className={`px-[8px] py-[3px] rounded-md text-[10px] font-semibold tracking-tight ${config.bg} ${config.text}`}
                    >
                      {config.label}
                    </span>

                    {hasScore && (
                      <span className="text-[14px] font-semibold tracking-tight" style={{ color: score >= 70 ? "var(--color-success)" : score >= 40 ? "var(--color-brand)" : "var(--color-error)" }}>
                        {score}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <span className={`font-medium tracking-tight text-text-primary block leading-[1.2] ${
                      isFeatureCard ? "text-[28px]" : "text-[15px] md:text-[20px]"
                    }`}>
                      {response.campaign?.title || "Unknown"}
                    </span>
                  </div>
                </div>

                <div className={`flex flex-col gap-[12px] ${isFeatureCard ? "pt-[24px]" : "pt-[16px] md:pt-[24px]"}`}>
                  {response.payout_amount != null && Number(response.payout_amount) > 0 && (
                    <span className="text-[13px] font-semibold tracking-tight text-success">
                      +${Number(response.payout_amount).toFixed(2)}
                    </span>
                  )}

                  {response.status === "ranked" && !!response.ai_feedback && (
                    <div className={`bg-bg-muted/60 rounded-[12px] p-[12px] border border-border-light/40 mt-auto ${isFeatureCard ? "" : "hidden md:block"}`}>
                      <p className="text-[12px] font-medium text-text-secondary leading-[1.5] line-clamp-2">
                        <span className="font-bold text-text-primary mr-[6px]">Feedback:</span>
                        {response.ai_feedback as string}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-[12px] border-t border-border-light/40 mt-auto">
                    {isInProgress && response.campaign ? (
                      <Link
                        href={`/dashboard/the-wall/${response.campaign.id}`}
                        className="font-mono text-[11px] uppercase tracking-wide font-medium text-text-primary hover:text-text-secondary hover:bg-bg-muted transition-all no-underline flex items-center gap-1.5 px-[12px] py-[6px] rounded-full bg-transparent ml-auto"
                      >
                        [ RESUME ]
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                      </Link>
                    ) : (
                      <span className="font-mono text-[11px] uppercase tracking-wide font-medium text-text-muted ml-auto">
                        Completed
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-[64px] border border-dashed border-border-light rounded-[28px] bg-white/90 text-center">
          <p className="font-mono text-[11px] font-medium text-text-muted uppercase tracking-wide">No results</p>
        </div>
      )}
    </div>
  );
}
