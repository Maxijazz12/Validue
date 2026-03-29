"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import Avatar from "@/components/ui/Avatar";
import WallReactionBar from "@/components/dashboard/WallReactionBar";

export type WallComment = {
  id: string;
  content: string;
  createdAt: string;
  authorName: string;
  authorAvatar: string | null;
  isOwn: boolean;
};

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
  /* Wave 2 props */
  isVisible?: boolean;
  isSaved?: boolean;
  onToggleSave?: (id: string) => void;
  isExpanded?: boolean;
  onToggleExpand?: (id: string) => void;
  /* Wave 3 props */
  matchReasons?: string[];
  firstQuestion?: { id: string; text: string; type: string; options: string[] | null } | null;
  isFocused?: boolean;
  /* Wave 4 props */
  comments?: WallComment[];
  /* Wave 5 props */
  reactionCounts?: Record<string, number>;
  userReactions?: string[];
  recentRespondents?: Array<{ name: string; avatar: string | null }>;
  lastActivityLabel?: string | null;
};

/* ─── useCountUp hook ─── */

function useCountUp(target: number, isVisible: boolean, duration = 600): number {
  const [value, setValue] = useState(0);
  const [started, setStarted] = useState(false);
  const hasFiredRef = useRef(false);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!isVisible || hasFiredRef.current || target <= 0) return;
    hasFiredRef.current = true;
    setStarted(true); // eslint-disable-line react-hooks/set-state-in-effect -- one-time animation trigger
    const start = performance.now();

    function tick(now: number) {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setValue(Math.round(eased * target));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isVisible, target, duration]);

  if (!started) return 0;
  return value;
}

/* ─── Category theme map ─── */

type CategoryTheme = {
  accent: string;
  gradient: string;
  icon: React.ReactNode;
};

const ICON_PROPS = { width: 15, height: 15, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

/* 3-tone palette matching landing page: warm (peach/coral), cool (teal/mint), neutral (slate) */
const PALETTE = {
  warm: { accent: "#E8C1B0", gradient: "linear-gradient(180deg, rgba(232,193,176,0.07) 0%, rgba(232,193,176,0.01) 100%)" },
  cool: { accent: "#9BC4C8", gradient: "linear-gradient(180deg, rgba(155,196,200,0.07) 0%, rgba(155,196,200,0.01) 100%)" },
  neutral: { accent: "#94A3B8", gradient: "linear-gradient(180deg, rgba(148,163,184,0.05) 0%, rgba(148,163,184,0.01) 100%)" },
};

const CATEGORY_THEMES: Record<string, CategoryTheme> = {
  /* ── Cool (teal/mint) ── */
  "SaaS / Software":      { ...PALETTE.cool, icon: <svg {...ICON_PROPS}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
  "Finance & FinTech":    { ...PALETTE.cool, icon: <svg {...ICON_PROPS}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg> },
  "AI & Machine Learning": { ...PALETTE.cool, icon: <svg {...ICON_PROPS}><rect x="4" y="4" width="16" height="16" rx="2"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg> },
  "Mobile Apps":          { ...PALETTE.cool, icon: <svg {...ICON_PROPS}><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg> },
  "Education":            { ...PALETTE.cool, icon: <svg {...ICON_PROPS}><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg> },
  "Real Estate":          { ...PALETTE.cool, icon: <svg {...ICON_PROPS}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
  /* ── Warm (peach/coral) ── */
  "Consumer Products":    { ...PALETTE.warm, icon: <svg {...ICON_PROPS}><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg> },
  "Health & Wellness":    { ...PALETTE.warm, icon: <svg {...ICON_PROPS}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg> },
  "Food & Beverage":      { ...PALETTE.warm, icon: <svg {...ICON_PROPS}><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg> },
  "Fashion & Apparel":    { ...PALETTE.warm, icon: <svg {...ICON_PROPS}><path d="M12 2L8 6H4l2 6h12l2-6h-4L12 2z"/><path d="M6 12v8a2 2 0 002 2h8a2 2 0 002-2v-8"/></svg> },
  "Social Impact":        { ...PALETTE.warm, icon: <svg {...ICON_PROPS}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg> },
  "Sustainability":       { ...PALETTE.warm, icon: <svg {...ICON_PROPS}><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg> },
  "Travel & Hospitality": { ...PALETTE.warm, icon: <svg {...ICON_PROPS}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg> },
  /* ── Neutral (slate) ── */
  "Marketplace":          { ...PALETTE.neutral, icon: <svg {...ICON_PROPS}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
  "Media & Entertainment": { ...PALETTE.neutral, icon: <svg {...ICON_PROPS}><polygon points="5 3 19 12 5 21 5 3"/></svg> },
};

const DEFAULT_THEME: CategoryTheme = {
  accent: "#94A3B8",
  gradient: "linear-gradient(180deg, rgba(148,163,184,0.05) 0%, rgba(148,163,184,0.01) 100%)",
  icon: <svg {...ICON_PROPS}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
};

function getTheme(category: string | null): CategoryTheme {
  if (!category) return DEFAULT_THEME;
  return CATEGORY_THEMES[category] || DEFAULT_THEME;
}

/* ─── Helpers ─── */

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isNew(dateStr: string): boolean {
  return Date.now() - new Date(dateStr).getTime() < 24 * 60 * 60 * 1000;
}

function isClosingSoon(current: number, target: number, deadline: string | null): boolean {
  if (target > 0 && current / target >= 0.8) return true;
  if (deadline) {
    return new Date(deadline).getTime() - Date.now() < 48 * 60 * 60 * 1000;
  }
  return false;
}

function getRewardLabel(amount: number, type: string | null): string {
  switch (type) {
    case "fixed": return `$${amount} per response`;
    case "pool": return `$${amount} reward pool`;
    case "top_only": return `$${amount} for top answers`;
    default: return `$${amount} reward`;
  }
}

function getVelocityLabel(currentResponses: number, createdAt: string): string | null {
  const ageHours = Math.max(1, (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60));
  const velocity = currentResponses / ageHours;
  if (velocity >= 2) return `${Math.round(velocity)} responses/hr`;
  if (velocity >= 0.5) return "Active now";
  return null;
}

/* ─── Bookmark icon ─── */

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      fill={filled ? "currentColor" : "none"} stroke="currentColor"
    >
      <path d="M5 3h14a1 1 0 011 1v16.5l-8-5.5-8 5.5V4a1 1 0 011-1z" />
    </svg>
  );
}

/* ─── Progress Ring SVG ─── */

function ProgressRing({ progress, accent, size = 28 }: { progress: number; accent: string; size?: number }) {
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // Show a minimum visible arc (5%) so the ring never looks empty
  const displayProgress = progress > 0 ? progress : 0;
  const offset = circumference - (displayProgress / 100) * circumference;

  let ringColor = accent;
  if (progress >= 70) ringColor = "#22C55E";
  else if (progress >= 40) ringColor = "#F59E0B";

  const shouldPulse = progress >= 90;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {shouldPulse && (
        <div
          className="absolute inset-0 rounded-full animate-[pulse_2.5s_ease_infinite]"
          style={{ boxShadow: `0 0 8px 2px ${ringColor}25` }}
        />
      )}
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#E2E8F0" strokeWidth={strokeWidth} />
        {displayProgress > 0 && (
          <circle
            className="progress-ring-circle"
            cx={size / 2} cy={size / 2} r={radius} fill="none"
            stroke={ringColor} strokeWidth={strokeWidth} strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={offset}
          />
        )}
      </svg>
    </div>
  );
}

/* ─── Main component ─── */

export default function WallCard({
  id,
  title,
  description,
  category,
  tags,
  estimatedMinutes,
  rewardAmount,
  currentResponses,
  targetResponses,
  createdAt,
  deadline,
  creatorName,
  creatorAvatar,
  bonusAvailable,
  rewardsTopAnswers,
  rewardType,
  matchScore,
  variant = "standard",
  isVisible = false,
  isSaved = false,
  onToggleSave,
  isExpanded = false,
  onToggleExpand,
  matchReasons,
  firstQuestion,
  isFocused = false,
  comments: _comments = [],
  reactionCounts = {},
  userReactions = [],
  recentRespondents: _recentRespondents = [],
  lastActivityLabel,
}: WallCardProps) {
  const theme = getTheme(category);
  const progress = targetResponses > 0 ? Math.min((currentResponses / targetResponses) * 100, 100) : 0;
  const showNew = isNew(createdAt);
  const showClosingSoon = isClosingSoon(currentResponses, targetResponses, deadline);
  const hasReward = rewardAmount > 0;
  const isHighReward = rewardAmount >= 50;
  const spotsLeft = targetResponses > 0 ? targetResponses - currentResponses : null;
  const showSpotsLeft = showClosingSoon && spotsLeft !== null && spotsLeft <= 10 && spotsLeft > 0;
  const velocityLabel = getVelocityLabel(currentResponses, createdAt);
  const showMatch = matchScore >= 70;
  const isFeatured = variant === "featured";

  // Animated counters
  const animatedResponses = useCountUp(currentResponses, isVisible);
  const animatedReward = useCountUp(rewardAmount, isVisible);

  // Bookmark bounce state
  const [justSaved, setJustSaved] = useState(false);

  // Quick-respond inline state
  const [inlineAnswer, setInlineAnswer] = useState("");

  const handleSave = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleSave?.(id);
    if (!isSaved) {
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 300);
    }
  }, [id, isSaved, onToggleSave]);

  const handleCardClick = useCallback(() => {
    onToggleExpand?.(id);
  }, [id, onToggleExpand]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onToggleExpand?.(id);
    }
  }, [id, onToggleExpand]);

  return (
    <div
      id={`wall-card-${id}`}
      role="article"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      className={`rounded-2xl border border-[#E2E8F0] group relative overflow-hidden transition-all duration-200 cursor-pointer select-none ${
        isExpanded
          ? "shadow-[0_8px_24px_rgba(0,0,0,0.08),0_2px_6px_rgba(232,193,176,0.08)] border-[#CBD5E1]"
          : "hover:-translate-y-[2px] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08),0_2px_6px_rgba(232,193,176,0.08)] hover:border-[#CBD5E1]"
      } ${isFeatured ? "p-[28px]" : "p-[20px]"} ${matchScore >= 80 ? "border-l-[3px]" : ""} ${isFocused ? "wall-card-focused" : ""}`}
      style={{
        background: theme.gradient,
        borderLeftColor: matchScore >= 80 ? theme.accent : undefined,
      }}
    >

      {/* ── 1. Creator Header (Instagram-style) ── */}
      <div className="flex items-center justify-between gap-[8px] mb-[14px]">
        <div className="flex items-center gap-[10px] min-w-0">
          <Avatar name={creatorName} imageUrl={creatorAvatar} size={isFeatured ? 32 : 28} />
          <div className="flex items-center gap-[6px] min-w-0">
            <span className="text-[13px] font-semibold text-[#111111] truncate">
              {creatorName}
            </span>
            <span className="text-[12px] text-[#94A3B8] shrink-0 flex items-center gap-[4px]">
              {showNew && (
                <span className="inline-block w-[7px] h-[7px] rounded-full bg-[#34D399] animate-[pulse_2.5s_ease_infinite]" />
              )}
              {timeAgo(createdAt)}
            </span>
            {showMatch && (
              <span className="text-[11px] font-semibold shrink-0">
                <span className="text-gradient-warm">{matchScore}% match</span>
                {matchReasons && matchReasons.length > 0 && (
                  <span className="text-[#94A3B8] font-normal"> · {matchReasons.slice(0, 2).join(", ")}</span>
                )}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-[6px] shrink-0">
          {/* Bookmark button */}
          <button
            onClick={handleSave}
            className={`p-[4px] rounded-lg transition-all duration-150 hover:bg-[#F3F4F6] ${
              isSaved ? "text-[#111111]" : "text-[#CBD5E1] hover:text-[#94A3B8]"
            } ${justSaved ? "bookmark-bounce" : ""}`}
            aria-label={isSaved ? "Remove bookmark" : "Save for later"}
          >
            <BookmarkIcon filled={isSaved} />
          </button>

          {/* Category pill */}
          {category && (
            <span
              className="flex items-center gap-[4px] text-[11px] font-medium px-[8px] py-[3px] rounded-full"
              style={{
                backgroundColor: `${theme.accent}10`,
                color: theme.accent,
              }}
            >
              <span className="opacity-70">{theme.icon}</span>
              <span className="max-sm:hidden">{category}</span>
            </span>
          )}
        </div>
      </div>

      {/* ── 2. Title (editorial serif) ── */}
      <h3
        className={`font-semibold text-[#111111] group-hover:text-black transition-colors mb-[4px] ${
          isFeatured ? "text-[17px]" : "text-[16px]"
        }`}
      >
        {title}
      </h3>

      {/* ── 3. Description ── */}
      {description && (
        <p className={`text-[14px] text-[#94A3B8] leading-[1.6] mb-[16px] transition-all duration-300 ${
          isExpanded ? "" : isFeatured ? "line-clamp-3" : "line-clamp-2"
        }`}>
          {description}
        </p>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex items-center gap-[6px] flex-wrap mb-[14px]">
          {(isExpanded || isFeatured ? tags : tags.slice(0, 2)).map((tag) => (
            <span
              key={tag}
              className="text-[11px] px-[8px] py-[2px] rounded-full border border-[#E2E8F0] text-[#94A3B8]"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* ── 4. Engagement Bar ── */}
      <div className="pt-[12px] border-t border-[#F1F5F9] flex flex-col gap-[8px]">

        {/* Row 1: Reward + Progress + Avatar stack + Social signals */}
        <div className="flex items-center justify-between gap-[10px]">
          {/* Left: reward badge + drain bar */}
          {hasReward && (
            <div className="flex flex-col gap-[3px] min-w-0">
              <span
                className={`font-mono font-bold text-[12px] px-[8px] py-[3px] rounded-full relative overflow-hidden ${
                  isHighReward
                    ? "text-white"
                    : rewardAmount >= 25
                      ? ""
                      : "text-[#111111]"
                } ${showClosingSoon && spotsLeft !== null && spotsLeft <= 5 ? "animate-[pulse_2s_ease_infinite]" : ""}`}
                style={{
                  backgroundColor: isHighReward ? theme.accent : `${theme.accent}12`,
                  color: isHighReward ? "#fff" : rewardAmount >= 25 ? theme.accent : undefined,
                }}
              >
                {isHighReward && <span className="absolute inset-0 wall-shimmer" />}
                <span className="relative">
                  ${animatedReward}
                  {bonusAvailable && "+"}
                </span>
              </span>
              {/* Reward pool drain bar for closing-soon cards */}
              {showClosingSoon && (
                <div className="h-[2px] w-full rounded-full bg-[#F3F4F6] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${Math.max(100 - progress, 0)}%`,
                      background: progress >= 80 ? "#E5654E" : progress >= 50 ? "#F59E0B" : theme.accent,
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Center: progress ring + count + avatar stack */}
          <div className="flex items-center gap-[8px]">
            <ProgressRing progress={progress} accent={theme.accent} size={isFeatured ? 32 : 28} />
            <div className="flex flex-col">
              <span className="text-[11px] font-mono font-semibold text-[#111111] leading-tight">
                {animatedResponses}/{targetResponses}
              </span>
              {/* Activity pulse */}
              {lastActivityLabel ? (
                <span className="flex items-center gap-[3px] text-[10px] text-[#34D399] font-medium leading-tight">
                  <span className="w-[5px] h-[5px] rounded-full bg-[#34D399] animate-[pulse_2.5s_ease_infinite]" />
                  {lastActivityLabel}
                </span>
              ) : velocityLabel ? (
                <span className="text-[10px] text-[#34D399] font-medium leading-tight">
                  {velocityLabel}
                </span>
              ) : null}
            </div>
          </div>

          {/* Right: urgency + time */}
          <div className="flex items-center gap-[6px] shrink-0">
            {showSpotsLeft && (
              <span className="text-[11px] font-semibold text-[#E5654E]">
                {spotsLeft} left
              </span>
            )}
            {showClosingSoon && !showSpotsLeft && (
              <span className="text-[11px] font-semibold px-[6px] py-[2px] rounded-full bg-[#E5654E]/8 text-[#CC5340]">
                Closing
              </span>
            )}
            <span className="flex items-center gap-[3px] text-[11px] text-[#94A3B8]">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
              {estimatedMinutes}m
            </span>
          </div>
        </div>

        {/* Row 2: Reactions */}
        <WallReactionBar campaignId={id} reactionCounts={reactionCounts} userReactions={userReactions} />
      </div>

      {/* ── 5. Peek Expansion (inline detail) ── */}
      <div className={`wall-card-peek ${isExpanded ? "wall-card-peek-open" : ""}`}>
        <div className="pt-[16px] border-t border-[#F1F5F9] mt-[12px]">
          {/* Reward detail */}
          {hasReward && (
            <div className="mb-[12px]">
              <p className="text-[13px] text-[#64748B]">
                {getRewardLabel(rewardAmount, rewardType)}
                {bonusAvailable && " — bonus available for quality responses"}
                {rewardsTopAnswers && " — top answers earn more"}
              </p>
            </div>
          )}

          {/* Time detail */}
          <p className="text-[12px] text-[#94A3B8] mb-[16px]">
            ~{estimatedMinutes} minutes to complete
          </p>

          {/* Quick-respond inline */}
          {firstQuestion && (
            <div className="mb-[14px] pt-[12px] border-t border-[#F1F5F9]">
              <p className="text-[12px] font-semibold text-[#64748B] mb-[6px]">First question:</p>
              <p className="text-[13px] text-[#111111] mb-[8px]">{firstQuestion.text}</p>
              {firstQuestion.type === "multiple_choice" && firstQuestion.options && (
                <div className="flex flex-wrap gap-[6px]">
                  {firstQuestion.options.map((opt, i) => (
                    <span
                      key={i}
                      className="text-[11px] px-[10px] py-[4px] rounded-full bg-[#F3F4F6] text-[#94A3B8] border border-[#E2E8F0] opacity-60"
                    >
                      {opt}
                    </span>
                  ))}
                </div>
              )}
              {firstQuestion.type === "open" && (
                <textarea
                  value={inlineAnswer}
                  onChange={(e) => {
                    e.stopPropagation();
                    setInlineAnswer(e.target.value);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                  placeholder="Start typing your thoughts..."
                  className="w-full min-h-[48px] rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] focus:border-[#CBD5E1] focus:shadow-[0_0_0_2px_rgba(232,193,176,0.15)] px-[12px] py-[8px] text-[13px] text-[#111111] placeholder:text-[#94A3B8] outline-none resize-none transition-all duration-200"
                />
              )}
            </div>
          )}


          {/* CTAs */}
          <div className="flex items-center gap-[10px] mt-[12px]">
            <a
              href={
                inlineAnswer.trim().length > 0
                  ? `/dashboard/the-wall/${id}?prefill=${encodeURIComponent(inlineAnswer.trim())}&qid=${firstQuestion?.id || ""}`
                  : `/dashboard/the-wall/${id}`
              }
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-[6px] px-[20px] py-[10px] bg-[#111111] text-white text-[13px] font-medium rounded-xl no-underline hover:bg-[#1a1a1a] transition-colors"
            >
              {inlineAnswer.trim().length > 0 ? "Continue" : "Answer Now"}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </a>
            <a
              href={`/dashboard/the-wall/${id}`}
              onClick={(e) => e.stopPropagation()}
              className="text-[13px] text-[#64748B] hover:text-[#111111] no-underline transition-colors"
            >
              View Details
            </a>
          </div>
        </div>
      </div>

      {/* ── 6. Action Footer ── */}
      <div className={`mt-[12px] flex items-center justify-end transition-all duration-200 ${isExpanded ? "opacity-0 h-0 mt-0 overflow-hidden" : ""}`}>
        <span className="text-[12px] text-[#94A3B8] group-hover:text-[#111111] transition-colors flex items-center gap-[4px]">
          <span className="opacity-0 group-hover:opacity-100 transition-opacity">
            Share your perspective
          </span>
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
          </svg>
        </span>
      </div>
    </div>
  );
}
