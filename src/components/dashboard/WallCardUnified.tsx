"use client";

import { memo, useState } from "react";
import WallReactionBar from "@/components/dashboard/WallReactionBar";

/* ─── Types ─── */

export type WallCardProps = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  tags: string[];
  estimatedMinutes: number;
  rewardAmount: number;
  currentResponses: number;
  targetResponses: number;
  createdAt: string;
  deadline: string | null;
  creatorName: string;
  creatorAvatar: string | null;
  bonusAvailable: boolean;
  rewardsTopAnswers: boolean;
  rewardType: string | null;
  matchScore: number;
  matchReasons?: string[];
  firstQuestion?: { id: string; text: string; type: string; options: string[] | null } | null;
  reactionCounts?: Record<string, number>;
  userReactions?: string[];
  isSubsidized?: boolean;
  economicsVersion?: number;
  format?: string | null;
};

export default memo(function WallCardUnified({
  idea,
  isSaved = false,
  onToggleSave,
  isHero = false,
}: {
  idea: WallCardProps;
  isSaved?: boolean;
  onToggleSave?: (id: string) => void;
  isHero?: boolean;
}) {
  const {
    id, title, description, category,
    rewardAmount, currentResponses, targetResponses,
    creatorName, matchScore, matchReasons,
    reactionCounts, userReactions, tags
  } = idea;

  // Deterministic color for creator bubble
  const bubbleColors = ["#E5654E", "#3b82f6", "#22C55E", "#8b5cf6", "#F59E0B", "#ec4899"];
  let nameHash = 0;
  for (let i = 0; i < creatorName.length; i++) nameHash = creatorName.charCodeAt(i) + ((nameHash << 5) - nameHash);
  const bubbleColor = bubbleColors[Math.abs(nameHash) % bubbleColors.length];

  const progress = targetResponses > 0 ? Math.round((currentResponses / targetResponses) * 100) : 0;
  const isHighMatch = matchScore >= 75;
  const isNearlyFull = progress >= 75 && progress < 100;
  const [showMatchTip, setShowMatchTip] = useState(false);

  return (
      <div
        id={`wall-card-${id}`}
        className={`glow-hover bento-card relative flex flex-col justify-between w-full bg-white border transition-all duration-400 shadow-card cursor-default overflow-hidden ${
          isHighMatch ? "border-brand/30" : "border-border-light"
        } ${isHero ? "rounded-[28px] p-[28px]" : "rounded-[20px] px-[14px] py-[20px] md:rounded-[28px] md:p-[28px]"}`}
      >
        {isHighMatch && (
          <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-transparent via-brand/60 to-transparent"></div>
        )}

        {/* Content Top Half */}
        <div className="flex flex-col gap-[12px]">
          {/* Metadata Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-[8px]">
              {isHighMatch ? (
                <span
                  className="relative px-[8px] py-[3px] rounded-md text-[10px] font-semibold tracking-tight bg-brand text-white cursor-help"
                  onMouseEnter={() => setShowMatchTip(true)}
                  onMouseLeave={() => setShowMatchTip(false)}
                  onClick={(e) => { e.stopPropagation(); setShowMatchTip((p) => !p); }}
                >
                  Match {matchScore}%
                  {showMatchTip && (
                    <span className="absolute top-full left-0 mt-[6px] w-[200px] p-[10px] rounded-xl bg-accent text-white text-[11px] font-medium tracking-normal leading-[1.5] shadow-[0_8px_24px_rgba(0,0,0,0.2)] z-50 pointer-events-none">
                      Based on your interests, expertise, and profile.
                      {matchReasons && matchReasons.length > 0 && (
                        <span className="block mt-[4px] text-white/60">
                          {matchReasons.slice(0, 2).join(" · ")}
                        </span>
                      )}
                    </span>
                  )}
                </span>
              ) : (
                <span className="px-[8px] py-[3px] rounded-md text-[10px] font-semibold tracking-tight bg-accent text-white">
                  {category || "General"}
                </span>
              )}
            </div>
            {rewardAmount > 0 ? (
              <span className="text-[13px] font-semibold tracking-tight text-success">
                +${rewardAmount.toFixed(2)}
              </span>
            ) : (
              <span className="px-[8px] py-[3px] rounded-md text-[10px] font-semibold tracking-tight bg-bg-muted text-text-secondary">
                UNPAID
              </span>
            )}
          </div>

          {/* Core Title */}
          <h2 className={`font-medium tracking-tight text-text-primary leading-[1.2] m-0 ${isHero ? "text-[18px] md:text-[20px]" : "text-[15px] md:text-[20px]"}`}>
            {title}
          </h2>

          {/* Description snippet — hidden on compact mobile cards */}
          {description && (
            <p className={`text-[14px] text-text-secondary leading-[1.4] m-0 overflow-hidden ${isHero ? "" : "hidden md:block"}`} style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" } as React.CSSProperties}>
              {description}
            </p>
          )}

          {/* Tags Row — hidden on compact mobile cards */}
          {tags.length > 0 && (
            <div className={`flex flex-wrap gap-[6px] ${isHero ? "" : "hidden md:flex"}`}>
              {tags.slice(0, 3).map((tag, i) => (
                <span key={i} className="px-[8px] py-[3px] rounded-md text-[11px] font-medium tracking-tight bg-bg-muted text-text-secondary leading-none">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Footer Bottom Half */}
        <div className={`mt-auto ${isHero ? "pt-[24px]" : "pt-[16px] md:pt-[24px]"}`}>
          {/* Progression Header */}
          <div className="flex items-end justify-between mb-[8px]">
            <span className={`flex items-center gap-[6px] font-medium tracking-tight text-text-secondary ${isHero ? "text-[12px]" : "text-[11px] md:text-[12px]"}`}>
              <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-[12px] h-[12px] shrink-0">
                <ellipse cx="32" cy="36" rx="24" ry="24" fill={bubbleColor} fillOpacity="0.15" stroke={bubbleColor} strokeWidth="3" />
                <ellipse cx="32" cy="36" rx="22" ry="22" fill="white" opacity="0.12" />
                <path d="M32 13 Q29 34 32 59" stroke={bubbleColor} strokeWidth="1.5" fill="none" opacity="0.3" />
              </svg>
              <span className={isHero ? "" : "truncate"}>{creatorName}</span>
              {isNearlyFull && <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse"></span>}
            </span>
            <span className="text-[11px] font-semibold tracking-tight text-text-muted">
               {currentResponses}/{targetResponses}
            </span>
          </div>

          {/* Hard Line Progress Bar */}
          <div className={`h-[3px] w-full bg-bg-muted overflow-hidden ${isHero ? "mb-[20px]" : "mb-[12px] md:mb-[20px]"}`}>
            <div
              className="h-full transition-all duration-1000 ease-[cubic-bezier(0.2,0.9,0.3,1)] bg-success"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>

          {/* Actions Row */}
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-[8px] ${isHero ? "" : "hidden md:flex"}`}>
              {reactionCounts && userReactions && (
                <WallReactionBar campaignId={id} reactionCounts={reactionCounts} userReactions={userReactions} />
              )}
              <button
                onClick={(e) => { e.stopPropagation(); onToggleSave?.(id); }}
                className={`flex items-center justify-center w-[28px] h-[28px] rounded-full transition-all duration-300 border-none cursor-pointer ${
                  isSaved ? "text-brand bg-transparent" : "text-border-muted hover:text-text-primary bg-transparent"
                }`}
              >
                <svg className={`w-[16px] h-[16px] ${isSaved ? "fill-current" : "fill-none"}`} viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isSaved ? 1.5 : 2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </button>
            </div>

            <a
              href={`/dashboard/the-wall/${id}`}
              className={`uppercase tracking-wide font-semibold text-text-primary hover:text-success transition-all duration-300 no-underline flex items-center gap-1.5 border-none rounded-full bg-transparent ${isHero ? "text-[11px] px-[14px] py-[6px]" : "text-[11px] px-[8px] py-[4px] md:text-[11px] md:px-[14px] md:py-[6px] ml-auto"}`}
            >
              Respond
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </a>
          </div>
        </div>
      </div>
  );
});
