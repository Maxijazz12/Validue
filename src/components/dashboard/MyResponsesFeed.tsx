"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";

const tabs = ["All", "In Progress", "Submitted", "Ranked"] as const;
type Tab = (typeof tabs)[number];

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  in_progress: { label: "In Progress", bg: "bg-[#E5654E]/10", text: "text-[#CC5340]" },
  submitted: { label: "Submitted", bg: "bg-[#3b82f6]/10", text: "text-[#3b82f6]" },
  ranked: { label: "Ranked", bg: "bg-[#22c55e]/10", text: "text-[#22c55e]" },
};

const tabToStatus: Record<Tab, string | null> = {
  All: null,
  "In Progress": "in_progress",
  Submitted: "submitted",
  Ranked: "ranked",
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

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
    if (!status) return responses;
    return responses.filter((r) => r.status === status);
  }, [responses, activeTab]);

  const rankedCount = responses.filter((r) => r.status === "ranked").length;

  if (responses.length === 0) {
    return (
      <div className="bg-[#FAF9FA] border border-[#E2E8F0] rounded-2xl p-[48px] text-center relative overflow-hidden">
        <div className="absolute top-0 left-[10%] right-[10%] h-[2px] bg-gradient-to-r from-transparent via-[#E8C1B0]/20 to-transparent" />
        <div className="w-[56px] h-[56px] rounded-2xl bg-gradient-to-br from-[#E8C1B0]/10 to-[#E5654E]/5 flex items-center justify-center mx-auto mb-[16px]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E5654E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <h2 className="text-[20px] font-bold text-[#111111] mb-[8px]">
          No responses <span className="italic font-normal text-gradient-warm">yet</span>
        </h2>
        <p className="text-[14px] text-[#64748B] max-w-[360px] mx-auto mb-[28px]">
          Head to The Wall — your expertise is worth something.
        </p>
        <Button href="/dashboard/the-wall">
          Browse The Wall
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Tab pills */}
      <div className="flex flex-wrap gap-[8px] mb-[16px]">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-[14px] py-[6px] rounded-full text-[13px] font-medium transition-all duration-200 cursor-pointer border ${
              activeTab === tab
                ? "bg-[#111111] text-white border-[#111111] shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
                : "bg-white border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1] hover:text-[#111111]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Info line */}
      <div className="flex items-center gap-[6px] text-[12px] text-[#94A3B8] mb-[16px]">
        <span>{filtered.length} {filtered.length === 1 ? "response" : "responses"}</span>
        {rankedCount > 0 && (
          <>
            <span>·</span>
            <span>{rankedCount} ranked</span>
          </>
        )}
      </div>

      {/* Response list */}
      {filtered.length > 0 ? (
        <div className="flex flex-col gap-[12px]">
          {filtered.map((response) => {
            const config = statusConfig[response.status] || statusConfig.submitted;
            const hasScore = response.status === "ranked" && response.quality_score !== null;
            const score = Number(response.quality_score) || 0;
            const isInProgress = response.status === "in_progress";

            return (
              <div
                key={response.id}
                className="bg-white border border-[#E2E8F0] rounded-2xl p-[20px] hover:border-[#CBD5E1] hover:shadow-[0_4px_16px_rgba(232,193,176,0.06)] transition-all duration-300"
              >
                <div className="flex items-center justify-between gap-[12px] mb-[8px] max-md:flex-col max-md:items-start max-md:gap-[8px]">
                  <div className="min-w-0">
                    <span className="text-[15px] font-semibold text-[#111111] block truncate">
                      {response.campaign?.title || "Unknown Campaign"}
                    </span>
                    {response.campaign?.category && (
                      <span className="text-[11px] text-[#94A3B8] uppercase tracking-[0.5px]">
                        {response.campaign.category}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-[8px] shrink-0">
                    {hasScore && (
                      <span
                        className="text-[13px] font-mono font-bold"
                        style={{
                          color: score >= 70 ? "#22c55e" : score >= 40 ? "#E5654E" : "#ef4444",
                        }}
                      >
                        {score}/100
                      </span>
                    )}
                    <span
                      className={`px-[10px] py-[4px] rounded-full text-[11px] font-semibold uppercase tracking-[0.5px] ${config.bg} ${config.text}`}
                    >
                      {config.label}
                    </span>
                  </div>
                </div>

                {response.payout_amount != null && Number(response.payout_amount) > 0 && (
                  <div className="flex items-center gap-[6px] mb-[8px] p-[10px] rounded-lg bg-[#22c55e]/5">
                    <span className="text-[12px] text-[#22c55e] font-semibold">You earned</span>
                    <span className="font-mono text-[14px] font-bold text-[#22c55e]">
                      ${Number(response.payout_amount).toFixed(2)}
                    </span>
                  </div>
                )}

                {response.status === "ranked" && !!response.ai_feedback && (
                  <div className="mb-[8px] p-[10px] rounded-lg bg-[#F3F4F6] border border-[#E2E8F0]/50">
                    <span className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-[0.5px]">
                      Quality feedback
                    </span>
                    <p className="text-[12px] text-[#64748B] mt-[4px] leading-[1.5]">
                      {response.ai_feedback as string}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-[#94A3B8]">
                    {isInProgress ? "Started" : "Submitted"} {formatDate(response.created_at)}
                  </span>
                  {isInProgress && response.campaign && (
                    <Link
                      href={`/dashboard/the-wall/${response.campaign.id}`}
                      className="text-[13px] font-medium text-[#111111] underline hover:text-[#64748B] transition-colors"
                    >
                      Resume
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-[48px] text-center">
          <p className="text-[14px] text-[#94A3B8]">No {activeTab.toLowerCase()} responses.</p>
        </div>
      )}
    </>
  );
}
