"use client";

import { useState, useCallback, useTransition } from "react";
import { toggleReaction } from "@/app/dashboard/the-wall/[id]/reaction-actions";

/* ─── Custom brand-tinted reaction icons ─── */

const REACTIONS = [
  {
    type: "fire",
    label: "This is hot",
    color: "#E5654E",
    icon: (stroke: string) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22c4.97 0 8-3.03 8-8 0-4-2.5-7.5-4-9-1 2-2 3-3.5 3C11 8 12 5 11 2c-1 1.5-4.5 4-5 8-.5 4 1 8 6 12z" />
      </svg>
    ),
  },
  {
    type: "lightbulb",
    label: "Great idea",
    color: "#E8C1B0",
    icon: (stroke: string) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18h6" /><path d="M10 22h4" />
        <path d="M12 2a7 7 0 00-4 12.7V17h8v-2.3A7 7 0 0012 2z" />
      </svg>
    ),
  },
  {
    type: "thumbsup",
    label: "I'd use this",
    color: "#9BC4C8",
    icon: (stroke: string) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z" />
        <path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
      </svg>
    ),
  },
  {
    type: "thinking",
    label: "Interesting",
    color: "#94A3B8",
    icon: (stroke: string) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        <circle cx="12" cy="10" r="0.5" fill={stroke} /><circle cx="8" cy="10" r="0.5" fill={stroke} /><circle cx="16" cy="10" r="0.5" fill={stroke} />
      </svg>
    ),
  },
] as const;

export default function WallReactionBar({
  campaignId,
  reactionCounts: initialCounts,
  userReactions: initialUserReactions,
}: {
  campaignId: string;
  reactionCounts: Record<string, number>;
  userReactions: string[];
}) {
  const [counts, setCounts] = useState(initialCounts);
  const [userReacted, setUserReacted] = useState(new Set(initialUserReactions));
  const [, startTransition] = useTransition();
  const [bouncingType, setBouncingType] = useState<string | null>(null);

  const handleReaction = useCallback((type: string) => {
    // Optimistic update
    const wasActive = userReacted.has(type);
    setUserReacted((prev) => {
      const next = new Set(prev);
      if (wasActive) next.delete(type);
      else next.add(type);
      return next;
    });
    setCounts((prev) => ({
      ...prev,
      [type]: Math.max(0, (prev[type] || 0) + (wasActive ? -1 : 1)),
    }));

    // Bounce animation
    if (!wasActive) {
      setBouncingType(type);
      setTimeout(() => setBouncingType(null), 300);
    }

    // Server action
    startTransition(async () => {
      try {
        await toggleReaction(campaignId, type);
      } catch {
        // Revert on error
        setUserReacted((prev) => {
          const next = new Set(prev);
          if (wasActive) next.add(type);
          else next.delete(type);
          return next;
        });
        setCounts((prev) => ({
          ...prev,
          [type]: Math.max(0, (prev[type] || 0) + (wasActive ? 1 : -1)),
        }));
      }
    });
  }, [campaignId, userReacted]);

  return (
    <div className="flex items-center gap-[4px]" onClick={(e) => e.stopPropagation()}>
      {REACTIONS.map((r) => {
        const isActive = userReacted.has(r.type);
        const count = counts[r.type] || 0;
        return (
          <button
            key={r.type}
            onClick={(e) => { e.stopPropagation(); handleReaction(r.type); }}
            aria-label={r.label}
            aria-pressed={isActive}
            title={r.label}
            className={`flex items-center gap-[3px] px-[6px] py-[3px] rounded-full border transition-all duration-150 cursor-pointer ${
              isActive
                ? "border-transparent"
                : "border-transparent hover:border-[#E2E8F0]"
            } ${bouncingType === r.type ? "bookmark-bounce" : ""}`}
            style={{
              backgroundColor: isActive ? `${r.color}15` : "transparent",
            }}
          >
            {r.icon(isActive ? r.color : "#CBD5E1")}
            {count > 0 && (
              <span
                className="text-[10px] font-semibold"
                style={{ color: isActive ? r.color : "#94A3B8" }}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
