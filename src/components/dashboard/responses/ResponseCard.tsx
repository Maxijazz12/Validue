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

type Dimensions = {
  depth: number;
  relevance: number;
  authenticity: number;
  consistency: number;
};

type ResponseCardProps = {
  responseId: string;
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
  scoringSource?: string;
  scoringConfidence?: number;
  dimensions?: Dimensions | null;
  highlighted?: boolean;
};

function getScoreColor(score: number): string {
  if (score >= 70) return "#22c55e";
  if (score >= 40) return "#E5654E";
  return "#ef4444";
}

function getDimensionColor(value: number): string {
  if (value >= 7) return "#22c55e";
  if (value >= 4) return "#E5654E";
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

function ScoringSourcePill({ source, confidence }: { source?: string; confidence?: number }) {
  if (!source) return null;

  if (source === "fallback") {
    return (
      <span className="text-[10px] px-[6px] py-[1px] rounded-full bg-[#FEF3C7] text-[#92400E] font-medium">
        Heuristic
      </span>
    );
  }

  if (source === "ai_low_confidence") {
    return (
      <span className="text-[10px] px-[6px] py-[1px] rounded-full bg-[#FEF3C7] text-[#92400E] font-medium">
        Low conf
      </span>
    );
  }

  if (source === "ai" && confidence !== undefined && confidence < 0.7) {
    return (
      <span className="text-[10px] px-[6px] py-[1px] rounded-full bg-bg-muted text-text-secondary font-medium font-mono">
        {confidence.toFixed(1)}
      </span>
    );
  }

  return null;
}

const DIMENSION_CONFIG = [
  { key: "depth" as const, label: "Depth", weight: "30%" },
  { key: "relevance" as const, label: "Relevance", weight: "25%" },
  { key: "authenticity" as const, label: "Authenticity", weight: "25%" },
  { key: "consistency" as const, label: "Consistency", weight: "20%" },
];

export default function ResponseCard({
  responseId,
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
  scoringSource,
  scoringConfidence,
  dimensions,
  highlighted,
}: ResponseCardProps) {
  const [expanded, setExpanded] = useState(false);
  const hasScore = qualityScore !== null && status === "ranked";
  const scoreColor = hasScore ? getScoreColor(qualityScore) : "#999999";

  return (
    <div
      id={`response-${responseId}`}
      className={`bg-white border rounded-[24px] overflow-hidden transition-all duration-400 shadow-card hover:shadow-card-hover hover:-translate-y-[1px] ${
        highlighted ? "ring-2 ring-brand/40 ring-offset-2" : ""
      } ${
        isTop ? "border-brand/20" : "border-border-light"
      }`}
    >
      {/* Header — always visible */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-[12px] p-[20px] text-left cursor-pointer hover:bg-bg-muted/40 transition-colors duration-300"
      >
        {/* Rank */}
        <div
          className={`w-[32px] h-[32px] rounded-full flex items-center justify-center shrink-0 ${
            isTop
              ? "bg-brand/8 text-brand"
              : "bg-bg-muted text-text-secondary"
          }`}
        >
          <span className="text-[13px] font-bold">#{rank}</span>
        </div>

        {/* Respondent info */}
        <div className="flex items-center gap-[8px] min-w-0 flex-1">
          <Avatar name={respondentName} imageUrl={respondentAvatar} size={20} />
          <div className="min-w-0">
            <span className="flex items-center gap-[6px]">
              <span className="text-[14px] font-medium text-text-primary truncate">
                {respondentName}
              </span>
              {respondentTier && <ReputationBadge tier={respondentTier} />}
            </span>
            <span className="text-[11px] text-text-muted">
              {formatDate(submittedAt)}
            </span>
          </div>
        </div>

        {/* AI feedback */}
        {aiFeedback && (
          <p className="text-[12px] text-text-secondary flex-1 hidden md:block truncate">
            {aiFeedback}
          </p>
        )}

        {/* Score badge + source indicator */}
        <div className="flex items-center gap-[4px] shrink-0">
          <ScoringSourcePill source={scoringSource} confidence={scoringConfidence} />
          {hasScore ? (
            <div
              className="px-[10px] py-[4px] rounded-full text-[13px] font-bold font-mono"
              style={{
                color: scoreColor,
                background: `${scoreColor}15`,
              }}
            >
              {qualityScore}
            </div>
          ) : (
            <span className="text-[11px] font-semibold uppercase tracking-[0.5px] px-[8px] py-[3px] rounded-full bg-info/10 text-info">
              {status}
            </span>
          )}
        </div>

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

      {/* Expanded — dimensions + answers */}
      {expanded && (
        <div className="border-t border-border-light/60 p-[20px]">
          {/* Mobile feedback */}
          {aiFeedback && (
            <p className="text-[12px] text-text-secondary mb-[12px] md:hidden italic">
              {aiFeedback}
            </p>
          )}

          {/* Dimension bars */}
          {dimensions && (
            <div className="grid grid-cols-2 gap-[8px] mb-[16px] p-[16px] rounded-[16px] bg-bg-muted/60 border border-border-light/40">
              {DIMENSION_CONFIG.map((d) => {
                const value = dimensions[d.key];
                return (
                  <div key={d.key}>
                    <div className="flex items-center justify-between mb-[2px]">
                      <span className="text-[11px] text-text-secondary">
                        {d.label}
                        <span className="text-border-muted ml-[3px]">{d.weight}</span>
                      </span>
                      <span className="text-[11px] font-mono font-semibold text-text-primary">
                        {value}/10
                      </span>
                    </div>
                    <div className="h-[4px] rounded-full bg-border-light overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${value * 10}%`,
                          backgroundColor: getDimensionColor(value),
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex flex-col gap-[16px]">
            {answers.map((answer, i) => (
              <div key={i}>
                <div className="flex items-center gap-[6px] mb-[4px]">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.5px] px-[6px] py-[1px] rounded-full bg-bg-muted text-text-secondary">
                    Q{i + 1}
                  </span>
                  <span className="text-[11px] text-text-muted">
                    {answer.questionType === "open" ? "Open-ended" : "Multiple choice"}
                  </span>
                  {answer.timeSpentMs > 0 && (
                    <span className="text-[10px] text-text-muted">
                      · {formatTime(answer.timeSpentMs)}
                    </span>
                  )}
                </div>
                <p className="text-[13px] font-medium text-text-secondary mb-[4px]">
                  {answer.questionText}
                </p>
                <p className="text-[14px] text-text-primary leading-[1.5] whitespace-pre-wrap">
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
