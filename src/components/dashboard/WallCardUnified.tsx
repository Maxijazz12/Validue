"use client";

import { useState, useCallback } from "react";
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
  variant?: "featured" | "standard";
  isVisible?: boolean;
  isSaved?: boolean;
  onToggleSave?: (id: string) => void;
  isExpanded?: boolean;
  onToggleExpand?: (id: string) => void;
  matchReasons?: string[];
  firstQuestion?: { id: string; text: string; type: string; options: string[] | null } | null;
  isFocused?: boolean;
  reactionCounts?: Record<string, number>;
  userReactions?: string[];
  recentRespondents?: Array<{ name: string; avatar: string | null }>;
  lastActivityLabel?: string | null;
  isSubsidized?: boolean;
  economicsVersion?: number;
  format?: string | null;
  align?: "left" | "right";
};

export default function WallCardUnified({
  idea,
  isSaved = false,
  onToggleSave,
}: {
  idea: WallCardProps;
  isSaved?: boolean;
  onToggleSave?: (id: string) => void;
  isExpanded?: boolean;
  onToggleExpand?: (id: string) => void;
  isFocused?: boolean;
  tier?: "featured" | "standard";
}) {
  const {
    id, title, category,
    rewardAmount, currentResponses, targetResponses,
    creatorName, matchScore, firstQuestion,
    reactionCounts, userReactions, tags
  } = idea;

  const progress = targetResponses > 0 ? Math.round((currentResponses / targetResponses) * 100) : 0;
  const isHighMatch = matchScore >= 75;
  const isNearlyFull = progress >= 75 && progress < 100;

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
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
          opacity: 0; /* Enable or increase for strong glow */
        }
        .glow-hover:hover {
          box-shadow: 0 0 0 1px rgba(0,0,0,0.05), 0 12px 32px -8px rgba(0,0,0,0.08);
          transform: translateY(-2px);
        }
      `}} />

      <div
        id={`wall-card-${id}`}
        className={`glow-hover bento-card relative flex flex-col justify-between w-full bg-white/60 backdrop-blur-3xl border transition-all duration-400 rounded-[28px] p-[28px] shadow-[0_8px_32px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.8)] cursor-default overflow-hidden ${
          isHighMatch ? "border-[#E5654E]/30" : "border-white/80"
        }`}
      >
        {isHighMatch && (
          <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-transparent via-[#E5654E]/60 to-transparent"></div>
        )}

        {/* Content Top Half */}
        <div className="flex flex-col gap-[16px]">
          {/* Metadata Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-[8px]">
              {isHighMatch ? (
                <span className="px-[10px] py-[4px] rounded-md font-mono text-[10px] font-bold uppercase tracking-[0.1em] bg-[#E5654E]/10 text-[#E5654E]">
                  MATCH {matchScore}%
                </span>
              ) : (
                <span className="px-[10px] py-[4px] rounded-md font-mono text-[10px] font-bold uppercase tracking-[0.1em] bg-[#F5F5F4] text-[#A8A29E]">
                  {category || "SYS.NODE"}
                </span>
              )}
            </div>
            {rewardAmount > 0 && (
              <span className="font-mono text-[13px] font-bold text-[#2ca05a]">
                +${rewardAmount.toFixed(2)}
              </span>
            )}
          </div>

          {/* Core Title */}
          <h2 className="font-medium tracking-tight text-[#1C1917] leading-[1.25] text-[18px] md:text-[20px] m-0">
            {firstQuestion ? `"${firstQuestion.text}"` : title}
          </h2>

          {/* Options / Tags Row (Minimal) */}
          <div className="flex flex-wrap gap-[6px] pt-[4px]">
            {firstQuestion?.options?.slice(0, 3).map((opt, i) => (
              <span key={i} className="px-3 py-1.5 bg-white text-[#1C1917] rounded-md text-[12px] font-bold border border-[#E7E5E4]/80 shadow-sm leading-none">
                {opt}
              </span>
            ))}
            {(!firstQuestion || !firstQuestion.options) && tags.slice(0, 3).map((tag, i) => (
              <span key={i} className="px-[8px] py-[4px] rounded-md font-mono text-[10px] font-semibold uppercase tracking-[0.05em] bg-[#F5F5F4] text-[#A8A29E] leading-none">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Footer Bottom Half */}
        <div className="pt-[32px] mt-auto">
          {/* Progression Header */}
          <div className="flex items-end justify-between font-mono text-[10px] font-bold text-[#A8A29E] mb-[8px] uppercase tracking-widest">
            <span className="flex items-center gap-[6px]">
              {creatorName}
              {isNearlyFull && <span className="w-1.5 h-1.5 rounded-full bg-[#E5654E] animate-pulse"></span>}
            </span>
            <span className="text-[#D6D3D1]">
               {currentResponses} / {targetResponses}
            </span>
          </div>

          {/* Hard Line Progress Bar */}
          <div className="h-[2px] w-full bg-[#F5F5F4] overflow-hidden mb-[20px]">
            <div 
              className={`h-full transition-all duration-1000 ease-[cubic-bezier(0.2,0.9,0.3,1)] ${isNearlyFull ? "bg-[#E5654E]" : "bg-[#1C1917]"}`} 
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>

          {/* Actions Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-[8px]">
              {reactionCounts && userReactions && (
                <WallReactionBar campaignId={id} reactionCounts={reactionCounts} userReactions={userReactions} />
              )}
              <button
                onClick={(e) => { e.stopPropagation(); onToggleSave?.(id); }}
                className={`flex items-center justify-center w-[28px] h-[28px] rounded-full transition-all duration-300 border-none cursor-pointer ${
                  isSaved ? "text-[#E5654E] bg-transparent" : "text-[#D6D3D1] hover:text-[#1C1917] bg-transparent"
                }`}
              >
                <svg className={`w-[16px] h-[16px] ${isSaved ? "fill-current" : "fill-none"}`} viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isSaved ? 1.5 : 2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </button>
            </div>
            
            <a
              href={`/dashboard/the-wall/${id}`}
              className="font-mono text-[11px] uppercase tracking-widest font-bold text-[#1C1917] hover:text-[#2A8AF6] transition-colors no-underline flex items-center gap-1.5 bg-transparent border-none p-0"
            >
              [ EXECUTE ]
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
