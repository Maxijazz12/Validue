"use client";

import { useCallback } from "react";
import Avatar from "@/components/ui/Avatar";
import type { WallCardProps } from "@/components/dashboard/WallCard";

/* ─── Helpers ─── */

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getRewardLabel(
  rewardAmount: number,
  targetResponses: number,
  isSubsidized: boolean,
  economicsVersion: number,
  bonusAvailable: boolean,
): string {
  if (economicsVersion !== 2) {
    if (!rewardAmount) return "Free";
    return `$${rewardAmount}${bonusAvailable ? "+" : ""}`;
  }
  if (isSubsidized) return "$0.30+";
  if (!rewardAmount) return "Free";
  const basePay = (rewardAmount * 0.85 * 0.60) / Math.max(targetResponses, 1);
  return `$${basePay.toFixed(0)}+`;
}

/* ─── Compact immersive tile ─── */

export default function WallCardImmersive({
  idea,
  isSaved = false,
  onToggleSave,
  sectionLabel,
}: {
  idea: WallCardProps;
  isSaved?: boolean;
  onToggleSave?: (id: string) => void;
  sectionLabel?: string;
}) {
  const {
    id, title, estimatedMinutes,
    rewardAmount, currentResponses, targetResponses, createdAt,
    creatorName, creatorAvatar, bonusAvailable,
    matchScore, isSubsidized, economicsVersion,
  } = idea;

  const progress = targetResponses > 0 ? (currentResponses / targetResponses) * 100 : 0;
  const reward = getRewardLabel(rewardAmount, targetResponses, isSubsidized ?? false, economicsVersion ?? 1, bonusAvailable);

  const handleSave = useCallback(() => {
    onToggleSave?.(id);
  }, [id, onToggleSave]);

  return (
    <a
      href={`/dashboard/the-wall/${id}`}
      className="immersive-slide group no-underline flex flex-col"
      id={`wall-card-${id}`}
    >
      <div className="flex flex-col p-[20px] h-full">

        {/* ── Top row: label + save ── */}
        <div className="flex items-center justify-between mb-[14px]">
          <div className="flex items-center gap-[8px]">
            {sectionLabel && (
              <span className="text-[10px] font-semibold uppercase" style={{ background: "rgba(229, 101, 78, 0.06)", border: "1px solid rgba(229, 101, 78, 0.1)", color: "#E5654E", letterSpacing: "0.1em", padding: "4px 10px", borderRadius: "6px" }}>
                {sectionLabel}
              </span>
            )}
            <Avatar name={creatorName} imageUrl={creatorAvatar} size={24} />
            <span className="text-[11px] text-[#78716C]">{creatorName}</span>
            <span className="text-[10px] text-[#A8A29E]">{timeAgo(createdAt)}</span>
          </div>
          <button
            onClick={(e) => { e.preventDefault(); handleSave(); }}
            className={`w-[28px] h-[28px] rounded-full flex items-center justify-center transition-all cursor-pointer bg-transparent border-none ${
              isSaved ? "bg-[#E5654E]/8" : "hover:bg-black/[0.03]"
            }`}
            aria-label="Save"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
              fill={isSaved ? "currentColor" : "none"} stroke="currentColor"
              className={isSaved ? "text-[#E5654E]" : "text-[#A8A29E]"}
            >
              <path d="M5 3h14a1 1 0 011 1v16.5l-8-5.5-8 5.5V4a1 1 0 011-1z" />
            </svg>
          </button>
        </div>

        {/* ── Title ── */}
        <h3 className="text-[16px] font-bold text-[#1C1917] leading-[1.3] tracking-[-0.01em] mb-[16px] line-clamp-3">
          {title}
        </h3>

        {/* ── Spacer ── */}
        <div className="flex-1" />

        {/* ── Stats row ── */}
        <div className="grid grid-cols-3 gap-[8px] mb-[14px]">
          <div className="immersive-stat-panel !p-[10px_12px]">
            <span className="text-[8px] font-semibold text-[#A8A29E] uppercase tracking-[0.1em]">Reward</span>
            <span className="text-[16px] font-mono font-bold text-[#1C1917] leading-tight mt-[4px]">{reward}</span>
          </div>
          <div className="immersive-stat-panel !p-[10px_12px]">
            <span className="text-[8px] font-semibold text-[#A8A29E] uppercase tracking-[0.1em]">Duration</span>
            <span className="text-[16px] font-mono font-bold text-[#1C1917] leading-tight mt-[4px]">{estimatedMinutes} min</span>
          </div>
          <div className="immersive-stat-panel !p-[10px_12px]">
            <span className="text-[8px] font-semibold text-[#A8A29E] uppercase tracking-[0.1em]">Responses</span>
            <div className="flex items-baseline gap-[2px] mt-[4px]">
              <span className="text-[16px] font-mono font-bold text-[#1C1917] leading-tight">{currentResponses}</span>
              <span className="text-[10px] font-mono text-[#A8A29E]">/{targetResponses}</span>
            </div>
            {/* Progress bar */}
            <div className="w-full h-[2px] rounded-full bg-[#EDE8E3] overflow-hidden mt-[6px]">
              <div
                className="h-full rounded-full bg-[#E5654E]/40 transition-all duration-500"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* ── Bottom: match score ── */}
        {matchScore >= 50 && (
          <p className="text-[10px] text-[#A8A29E] font-mono tabular-nums">
            {matchScore}% match
          </p>
        )}
      </div>
    </a>
  );
}
