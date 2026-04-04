"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import DisputeButton from "@/components/dashboard/DisputeButton";

const tabs = ["All", "In Progress", "Submitted", "Ranked"] as const;
type Tab = (typeof tabs)[number];

const statusConfig: Record<string, { label: string; className: string }> = {
  in_progress: { label: "IN PROGRESS", className: "bg-brand/10 text-brand" },
  submitted: { label: "SUBMITTED", className: "bg-bg-muted text-text-secondary" },
  ranked: { label: "RANKED", className: "bg-success/15 text-success" },
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
  money_state: string | null;
  disqualification_reasons: unknown;
  ai_feedback: unknown;
  created_at: string;
  campaign: {
    id: string;
    title: string;
    category: string | null;
    reward_amount: number;
    reward_type: string | null;
  } | null;
  alreadyDisputed?: boolean;
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/* Twist: mini quality score ring for ranked responses */
function ScoreRing({ score }: { score: number }) {
  const size = 36;
  const stroke = 3;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? "var(--color-success)" : score >= 40 ? "var(--color-brand)" : "var(--color-error, #ef4444)";

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--color-border-light, #e7e5e4)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
      </svg>
      <span className="absolute text-[11px] font-semibold tracking-tight" style={{ color }}>{score}</span>
    </div>
  );
}

export default function MyResponsesFeed({ responses }: { responses: ResponseItem[] }) {
  const [activeTab, setActiveTab] = useState<Tab>("All");

  const filtered = useMemo(() => {
    const status = tabToStatus[activeTab];
    let result = responses;
    if (status) result = responses.filter((r) => r.status === status);
    result.sort((a, b) => {
      if (a.status === "ranked" && b.status !== "ranked") return -1;
      if (b.status === "ranked" && a.status !== "ranked") return 1;
      return 0;
    });
    return result;
  }, [responses, activeTab]);

  const rankedCount = responses.filter((r) => r.status === "ranked").length;

  const staggerDelay = (index: number) => ({
    opacity: 0,
    animation: `cardEntranceV2 0.6s cubic-bezier(0.2, 0.9, 0.3, 1) ${Math.min(index, 12) * 50}ms forwards`,
  });

  if (responses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-[100px] border border-dashed border-border-light rounded-[32px] bg-white/90 text-center">
        <span className="font-mono text-[11px] font-medium tracking-wide text-text-muted uppercase mb-4">No results</span>
        <h2 className="text-[20px] md:text-[24px] font-medium tracking-tight text-text-primary mb-[8px]">
          No recorded responses
        </h2>
        <p className="text-[14px] font-medium text-text-secondary max-w-[360px] mx-auto mb-[32px]">
          Head to The Wall to find campaigns worth responding to.
        </p>
        <Link
          href="/dashboard/the-wall"
          className="inline-flex items-center justify-center px-[32px] py-[12px] rounded-full text-[12px] font-medium uppercase tracking-wide bg-accent text-white transition-all duration-300 hover:shadow-md cursor-pointer no-underline"
        >
          Browse The Wall
        </Link>
      </div>
    );
  }

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
        <div className="flex items-center gap-[6px] w-full md:w-auto p-[4px] overflow-x-auto hide-scrollbar">
          {tabs.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`text-[12px] font-medium uppercase tracking-wide py-[8px] px-[20px] rounded-full transition-all duration-300 cursor-pointer border-none whitespace-nowrap ${
                  isActive
                    ? "bg-accent text-white shadow-md"
                    : "bg-transparent text-text-muted hover:text-text-primary hover:bg-bg-muted"
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        <div className="hidden md:flex items-center gap-[12px] px-[16px]">
          <span className="text-[11px] font-medium tracking-tight text-text-muted">
            {filtered.length} response{filtered.length !== 1 && "s"}
          </span>
          {rankedCount > 0 && (
            <span className="text-[11px] font-medium tracking-tight text-success flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              {rankedCount} ranked
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
            const hasPayout = response.payout_amount != null && Number(response.payout_amount) > 0;

            // Money state
            const moneyState = response.money_state || "pending_qualification";
            const reasons = Array.isArray(response.disqualification_reasons)
              ? response.disqualification_reasons.filter((v): v is string => typeof v === "string")
              : [];
            const isUnpaid = reasons.includes("unpaid_campaign");
            const isDisqualified = moneyState === "not_qualified" && !isUnpaid;

            const moneyStateConfig: Record<string, { label: string; className: string }> = {
              pending_qualification: { label: "PENDING", className: "bg-[#94A3B8]/10 text-text-secondary" },
              locked: { label: "LOCKED", className: "bg-warning/10 text-[#D97706]" },
              available: { label: "AVAILABLE", className: "bg-success/10 text-success" },
              paid_out: { label: "PAID OUT", className: "bg-info/10 text-info" },
              not_qualified: { label: "NOT QUALIFIED", className: "bg-error/10 text-error" },
            };
            const moneyConfig = isUnpaid
              ? { label: "UNPAID", className: "bg-bg-muted text-text-secondary" }
              : (moneyStateConfig[moneyState] || moneyStateConfig.pending_qualification);

            return (
              <div
                key={response.id}
                style={staggerDelay(index)}
                className="glow-hover relative flex flex-col justify-between bg-white border border-border-light shadow-card transition-all duration-400 col-span-1 rounded-[20px] px-[14px] py-[20px] md:rounded-[28px] md:p-[28px]"
              >
                {/* Content Top */}
                <div className="flex flex-col gap-[10px] md:gap-[14px]">
                  {/* Metadata Row */}
                  <div className="flex items-center justify-between">
                    <span className={`px-[8px] py-[3px] rounded-md text-[10px] font-semibold tracking-tight ${config.className}`}>
                      {config.label}
                    </span>
                    <span className="text-[11px] font-medium tracking-tight text-text-muted">
                      {timeAgo(response.created_at)}
                    </span>
                  </div>

                  {/* Campaign Title */}
                  <h3 className="font-medium tracking-tight text-text-primary leading-[1.2] m-0 text-[15px] md:text-[20px]">
                    {response.campaign?.title || "Unknown Campaign"}
                  </h3>

                  {/* Category tag */}
                  {response.campaign?.category && (
                    <div className="hidden md:flex">
                      <span className="px-[8px] py-[3px] rounded-md text-[11px] font-medium tracking-tight bg-bg-muted text-text-secondary leading-none">
                        {response.campaign.category}
                      </span>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="mt-auto pt-[16px] md:pt-[24px]">
                  {/* Score ring + payout row */}
                  {(hasScore || hasPayout || response.status === "ranked") && (
                    <div className="flex items-center justify-between mb-[12px] md:mb-[16px]">
                      {hasScore && <ScoreRing score={score} />}
                      <div className="flex items-center gap-[8px] ml-auto">
                        {hasPayout && (
                          <span className="text-[13px] font-semibold tracking-tight text-success">
                            +${Number(response.payout_amount).toFixed(2)}
                          </span>
                        )}
                        {(isDisqualified || isUnpaid) && (
                          <span className="text-[12px] text-text-muted font-medium">$0.00</span>
                        )}
                        {response.status === "ranked" && (
                          <span className={`px-[8px] py-[3px] rounded-md text-[10px] font-medium uppercase tracking-tight ${moneyConfig.className}`}>
                            {moneyConfig.label}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* AI Feedback snippet */}
                  {response.status === "ranked" && !!response.ai_feedback && (
                    <div className="bg-bg-muted/60 rounded-[12px] p-[10px] border border-border-light/40 mb-[12px] hidden md:block">
                      <p className="text-[12px] font-medium text-text-secondary leading-[1.5] m-0" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}>
                        {response.ai_feedback as string}
                      </p>
                    </div>
                  )}

                  {/* Disqualification reason + dispute */}
                  {isDisqualified && (
                    <div className="mb-[12px]">
                      {reasons.filter((r) => r !== "unpaid_campaign").length > 0 && (
                        <p className="text-[12px] text-text-secondary mb-[4px]">
                          Reason: {reasons.filter((r) => r !== "unpaid_campaign").join(", ")}
                        </p>
                      )}
                      <DisputeButton
                        responseId={response.id}
                        alreadyDisputed={response.alreadyDisputed ?? false}
                      />
                    </div>
                  )}
                  {isUnpaid && (
                    <p className="text-[12px] text-text-secondary mb-[12px]">
                      This campaign did not offer monetary rewards.
                    </p>
                  )}

                  {/* Action row */}
                  <div className="flex items-center justify-end">
                    {isInProgress && response.campaign ? (
                      <Link
                        href={`/dashboard/the-wall/${response.campaign.id}`}
                        className="uppercase tracking-wide font-semibold text-[11px] text-text-primary hover:text-success transition-colors duration-300 no-underline flex items-center gap-1.5"
                      >
                        Resume
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                      </Link>
                    ) : (
                      <span className="text-[11px] font-medium tracking-tight text-text-muted uppercase">
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
        <div className="flex flex-col items-center justify-center py-[64px] border border-dashed border-border-light rounded-[32px] bg-white/90">
          <span className="font-mono text-[11px] font-medium tracking-wide text-text-muted uppercase">No results</span>
        </div>
      )}
    </div>
  );
}
