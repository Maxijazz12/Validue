"use client";

import { useState } from "react";
import Avatar from "@/components/ui/Avatar";
import ReputationBadge from "@/components/ui/ReputationBadge";
import type { ReputationTier } from "@/lib/reputation-config";

type Answer = {
  questionText: string;
  questionType: string;
  answerText: string;
  charCount: number;
  timeSpentMs: number;
};

type ResponseCardProps = {
  rank: number;
  respondentName: string;
  respondentAvatar: string | null;
  respondentTier?: ReputationTier;
  qualityScore: number | null;
  aiFeedback: string | null;
  status: string;
  submittedAt: string;
  answers: Answer[];
  isTop: boolean;
};

function getScoreColor(score: number): string {
  if (score >= 70) return "#22c55e";
  if (score >= 40) return "#E5654E";
  return "#ef4444";
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatTime(ms: number): string {
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

export default function ResponseCard({
  rank,
  respondentName,
  respondentAvatar,
  respondentTier,
  qualityScore,
  aiFeedback,
  status,
  submittedAt,
  answers,
  isTop,
}: ResponseCardProps) {
  const [expanded, setExpanded] = useState(false);
  const hasScore = qualityScore !== null && status === "ranked";
  const scoreColor = hasScore ? getScoreColor(qualityScore) : "#999999";

  return (
    <div
      className={`bg-white border rounded-2xl overflow-hidden transition-all duration-300 ${
        isTop ? "border-[#E8C1B0]/40 shadow-[0_2px_12px_rgba(232,193,176,0.08)]" : "border-[#E2E8F0] hover:border-[#CBD5E1]"
      }`}
    >
      {/* Header — always visible */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-[12px] p-[16px] text-left cursor-pointer hover:bg-[#FCFCFD] transition-colors duration-200"
      >
        {/* Rank */}
        <div
          className={`w-[32px] h-[32px] rounded-full flex items-center justify-center shrink-0 ${
            isTop
              ? "bg-[#E5654E]/8 text-[#E5654E]"
              : "bg-[#F3F4F6] text-[#64748B]"
          }`}
        >
          <span className="text-[13px] font-bold">#{rank}</span>
        </div>

        {/* Respondent info */}
        <div className="flex items-center gap-[8px] min-w-0 flex-1">
          <Avatar name={respondentName} imageUrl={respondentAvatar} size={20} />
          <div className="min-w-0">
            <span className="flex items-center gap-[6px]">
              <span className="text-[14px] font-medium text-[#111111] truncate">
                {respondentName}
              </span>
              {respondentTier && <ReputationBadge tier={respondentTier} />}
            </span>
            <span className="text-[11px] text-[#94A3B8]">
              {formatDate(submittedAt)}
            </span>
          </div>
        </div>

        {/* AI feedback */}
        {aiFeedback && (
          <p className="text-[12px] text-[#64748B] flex-1 hidden md:block truncate">
            {aiFeedback}
          </p>
        )}

        {/* Score badge */}
        {hasScore ? (
          <div
            className="px-[10px] py-[4px] rounded-full text-[13px] font-bold font-mono shrink-0"
            style={{
              color: scoreColor,
              background: `${scoreColor}15`,
            }}
          >
            {qualityScore}
          </div>
        ) : (
          <span className="text-[11px] font-semibold uppercase tracking-[0.5px] px-[8px] py-[3px] rounded-full bg-[#3b82f6]/10 text-[#3b82f6] shrink-0">
            {status}
          </span>
        )}

        {/* Chevron */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#999999"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Expanded — answers */}
      {expanded && (
        <div className="border-t border-[#E2E8F0] p-[16px]">
          {/* Mobile feedback */}
          {aiFeedback && (
            <p className="text-[12px] text-[#64748B] mb-[12px] md:hidden italic">
              {aiFeedback}
            </p>
          )}

          <div className="flex flex-col gap-[16px]">
            {answers.map((answer, i) => (
              <div key={i}>
                <div className="flex items-center gap-[6px] mb-[4px]">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.5px] px-[6px] py-[1px] rounded-full bg-[#F3F4F6] text-[#64748B]">
                    Q{i + 1}
                  </span>
                  <span className="text-[11px] text-[#94A3B8]">
                    {answer.questionType === "open" ? "Open-ended" : "Multiple choice"}
                  </span>
                  {answer.timeSpentMs > 0 && (
                    <span className="text-[10px] text-[#94A3B8]">
                      · {formatTime(answer.timeSpentMs)}
                    </span>
                  )}
                </div>
                <p className="text-[13px] font-medium text-[#64748B] mb-[4px]">
                  {answer.questionText}
                </p>
                <p className="text-[14px] text-[#111111] leading-[1.5] whitespace-pre-wrap">
                  {answer.answerText || "(no answer)"}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
