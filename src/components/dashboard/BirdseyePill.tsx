"use client";

import MiniPeach from "@/components/ui/MiniPeach";
import type { WallCardProps } from "@/components/dashboard/WallCardUnified";

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

export default function BirdseyePill({
  idea,
  isSaved = false,
  onToggleSave,
}: {
  idea: WallCardProps;
  isSaved?: boolean;
  onToggleSave?: (id: string) => void;
}) {
  const {
    id, title, rewardAmount, targetResponses,
    creatorName, bonusAvailable, isSubsidized, economicsVersion,
  } = idea;

  const reward = getRewardLabel(rewardAmount, targetResponses, isSubsidized ?? false, economicsVersion ?? 1, bonusAvailable);

  return (
    <a
      href={`/dashboard/the-wall/${id}`}
      className="w-full flex items-center gap-[10px] bg-white/92 backdrop-blur-xl rounded-2xl px-[18px] h-[68px] shadow-[0_4px_16px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.03)] border border-black/[0.06] no-underline transition-all duration-200 hover:shadow-[0_6px_20px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.04)] active:scale-[0.99] text-left"
    >
      <MiniPeach accent="blue" size={24} />

      <span className="text-[13px] text-[#78716C] font-medium truncate flex-1 min-w-0">
        <span className="text-[#57534E] font-semibold">{creatorName}</span>
        {" posted: "}
        {title}
      </span>

      {reward !== "Free" && (
        <span className="text-[11px] font-mono font-semibold text-[#1C1917] bg-[#F5F0EB] px-[8px] py-[2px] rounded-full shrink-0">
          {reward}
        </span>
      )}

      {/* Save button */}
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleSave?.(id); }}
        className={`w-[28px] h-[28px] rounded-full flex items-center justify-center shrink-0 bg-transparent border-none cursor-pointer transition-all ${
          isSaved ? "bg-[#E5654E]/8" : "hover:bg-black/[0.03]"
        }`}
        aria-label={isSaved ? "Unsave" : "Save"}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
          fill={isSaved ? "currentColor" : "none"} stroke="currentColor"
          className={isSaved ? "text-[#E5654E]" : "text-[#A8A29E]"}
        >
          <path d="M5 3h14a1 1 0 011 1v16.5l-8-5.5-8 5.5V4a1 1 0 011-1z" />
        </svg>
      </button>

      <svg
        width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A8A29E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        className="shrink-0"
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </a>
  );
}
