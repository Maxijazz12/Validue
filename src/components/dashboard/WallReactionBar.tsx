"use client";

import { useState, useCallback, useTransition } from "react";
import { toggleReaction } from "@/app/dashboard/the-wall/[id]/reaction-actions";

export default function WallReactionBar({
  campaignId,
  reactionCounts: initialCounts,
  userReactions: initialUserReactions,
}: {
  campaignId: string;
  reactionCounts: Record<string, number>;
  userReactions: string[];
}) {
  const totalReactions = Object.values(initialCounts).reduce((sum, n) => sum + n, 0);
  const [count, setCount] = useState(totalReactions);
  const [isActive, setIsActive] = useState(initialUserReactions.length > 0);
  const [, startTransition] = useTransition();

  const handleReaction = useCallback(() => {
    const wasActive = isActive;
    setIsActive(!wasActive);
    setCount((prev) => Math.max(0, prev + (wasActive ? -1 : 1)));

    startTransition(async () => {
      try {
        await toggleReaction(campaignId, "lightbulb");
      } catch {
        setIsActive(wasActive);
        setCount((prev) => Math.max(0, prev + (wasActive ? 1 : -1)));
      }
    });
  }, [campaignId, isActive]);

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <button
        onClick={(e) => { e.stopPropagation(); handleReaction(); }}
        aria-label="Interesting"
        aria-pressed={isActive}
        className={`flex items-center gap-[4px] px-[8px] py-[4px] rounded-full transition-all duration-150 cursor-pointer border ${
          isActive
            ? "border-bg-muted bg-bg-muted text-text-primary"
            : "border-transparent text-text-muted hover:text-text-secondary"
        }`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill={isActive ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
        </svg>
        {count > 0 && (
          <span className="text-[11px] font-medium">
            {count}
          </span>
        )}
      </button>
    </div>
  );
}
