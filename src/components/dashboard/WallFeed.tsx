"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import WallCard, { type WallCardProps } from "@/components/dashboard/WallCard";
import WallCardImmersive from "@/components/dashboard/WallCardImmersive";
import WallCardTracker from "@/components/dashboard/WallCardTracker";
import TrendingRow from "@/components/dashboard/TrendingRow";
import FeedInterstitial from "@/components/dashboard/FeedInterstitial";
import type { Achievement } from "@/components/dashboard/AchievementBanner";
import ActivityTicker, { type ActivityItem } from "@/components/dashboard/ActivityTicker";
import type { WeeklyDigest } from "@/components/dashboard/WeeklyDigestBanner";
import KeyboardHint from "@/components/dashboard/KeyboardHint";
import { CATEGORY_OPTIONS } from "@/lib/constants";

/* ─── Re-export WallUserProfile type for server page ─── */
export type { WallUserProfile } from "@/components/dashboard/RespondentStatsBar";
import type { WallUserProfile } from "@/components/dashboard/RespondentStatsBar";

/* ─── Tabs ─── */

const tabs = [
  { key: "Best Matches", label: "Best Matches" },
  { key: "High Reward Matches", label: "High Reward" },
  { key: "Closing Soon", label: "Closing Soon" },
  { key: "Trending in Your Interests", label: "Trending" },
  { key: "Explore More", label: "Explore" },
] as const;
type Tab = (typeof tabs)[number]["key"];

/* ─── Filter options ─── */
const AUDIENCE_TYPES = ["Developers", "Marketers", "Designers", "Founders", "Students", "Enterprise", "Consumers", "Healthcare", "Finance"] as const;
const REWARD_LEVELS = ["Any", "$10+", "$25+", "$50+", "$100+"] as const;
const TIME_LEVELS = ["Any", "< 5 min", "5–10 min", "10–20 min", "20+ min"] as const;
const SORT_OPTIONS = ["Relevant", "Newest", "Most Active"] as const;

type Filters = {
  category: string;
  audience: string;
  reward: string;
  time: string;
  sort: string;
};

const defaultFilters: Filters = {
  category: "Any",
  audience: "Any",
  reward: "Any",
  time: "Any",
  sort: "Relevant",
};

/* ─── Achievement definitions ─── */

const ACHIEVEMENT_DEFS: {
  key: string;
  check: (u: WallUserProfile) => boolean;
  title: string;
  subtitle: string;
  accent: string;
  icon: React.ReactNode;
}[] = [
  {
    key: "first-response",
    check: (u) => u.has_responded && u.total_responses_completed <= 1,
    title: "First Response!",
    subtitle: "You've taken the first step — welcome to The Wall",
    accent: "#4F7BE8",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4F7BE8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  },
  {
    key: "five-complete",
    check: (u) => u.total_responses_completed >= 5,
    title: "High Five!",
    subtitle: "5 responses completed — you're building momentum",
    accent: "#F59E0B",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  },
  {
    key: "quality-champion",
    check: (u) => u.average_quality_score >= 70,
    title: "Quality Champion",
    subtitle: "Your responses are consistently excellent",
    accent: "#22C55E",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>,
  },
  {
    key: "100-club",
    check: (u) => u.total_earned >= 100,
    title: "$100 Club",
    subtitle: "You've earned $100+ from your feedback",
    accent: "#E8C1B0",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E8C1B0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
  },
];

/* ─── Scoring functions ─── */

function scoreBestMatches(idea: WallCardProps): number {
  const now = Date.now();
  let score = 0;
  score += (idea.matchScore / 100) * 35;
  const ageHours = (now - new Date(idea.createdAt).getTime()) / (1000 * 60 * 60);
  score += Math.max(0, 25 - ageHours * 0.35);
  score += Math.min(idea.rewardAmount / 5, 15);
  const fillRatio = idea.targetResponses > 0 ? idea.currentResponses / idea.targetResponses : 0;
  score += fillRatio * 10;
  if (idea.deadline) {
    const hoursLeft = (new Date(idea.deadline).getTime() - now) / (1000 * 60 * 60);
    if (hoursLeft > 0 && hoursLeft < 72) score += 10;
  }
  if (idea.targetResponses > 0 && fillRatio >= 0.7) score += 5;
  if (idea.bonusAvailable) score += 3;
  if (idea.rewardsTopAnswers) score += 2;
  return score;
}

function scoreTrending(idea: WallCardProps): number {
  let score = 0;
  const ageHours = Math.max(1, (Date.now() - new Date(idea.createdAt).getTime()) / (1000 * 60 * 60));
  const velocity = idea.currentResponses / ageHours;
  score += velocity * 50;
  const fillRatio = idea.targetResponses > 0 ? idea.currentResponses / idea.targetResponses : 0;
  score += fillRatio * 30;
  score += Math.min(idea.rewardAmount / 10, 10);
  score += Math.max(0, 10 - (Date.now() - new Date(idea.createdAt).getTime()) / (1000 * 60 * 60 * 24));
  return score;
}

/* ─── Apply filters ─── */

function applyFilters(ideas: WallCardProps[], filters: Filters, query: string): WallCardProps[] {
  let result = ideas;
  if (query.trim()) {
    const q = query.toLowerCase();
    result = result.filter(
      (idea) =>
        idea.title.toLowerCase().includes(q) ||
        (idea.description && idea.description.toLowerCase().includes(q)) ||
        (idea.category && idea.category.toLowerCase().includes(q)) ||
        idea.tags.some((t) => t.toLowerCase().includes(q)) ||
        idea.creatorName.toLowerCase().includes(q)
    );
  }
  if (filters.category !== "Any") result = result.filter((idea) => idea.category === filters.category);
  if (filters.audience !== "Any") result = result.filter((idea) => idea.tags.some((t) => t === filters.audience));
  if (filters.reward !== "Any") {
    const min = parseInt(filters.reward.replace(/[^0-9]/g, ""), 10) || 0;
    result = result.filter((idea) => idea.rewardAmount >= min);
  }
  if (filters.time !== "Any") {
    result = result.filter((idea) => {
      switch (filters.time) {
        case "< 5 min": return idea.estimatedMinutes < 5;
        case "5–10 min": return idea.estimatedMinutes >= 5 && idea.estimatedMinutes <= 10;
        case "10–20 min": return idea.estimatedMinutes > 10 && idea.estimatedMinutes <= 20;
        case "20+ min": return idea.estimatedMinutes > 20;
        default: return true;
      }
    });
  }
  return result;
}

/* ─── Apply tab ranking ─── */

function rankByTab(ideas: WallCardProps[], tab: Tab, sortOverride: string): WallCardProps[] {
  const now = Date.now();
  if (sortOverride === "Newest") return [...ideas].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  if (sortOverride === "Most Active") return [...ideas].sort((a, b) => b.currentResponses - a.currentResponses);

  switch (tab) {
    case "Best Matches":
      return [...ideas].sort((a, b) => scoreBestMatches(b) - scoreBestMatches(a));
    case "High Reward Matches":
      return [...ideas]
        .filter((idea) => idea.rewardAmount > 0 || idea.bonusAvailable)
        .sort((a, b) => {
          const diff = (b.rewardAmount + (b.bonusAvailable ? 10 : 0)) - (a.rewardAmount + (a.bonusAvailable ? 10 : 0));
          return diff !== 0 ? diff : b.matchScore - a.matchScore;
        });
    case "Closing Soon":
      return ideas
        .filter((idea) => {
          if (idea.targetResponses > 0 && idea.currentResponses / idea.targetResponses >= 0.7) return true;
          if (idea.deadline && new Date(idea.deadline).getTime() - now < 72 * 60 * 60 * 1000) return true;
          return false;
        })
        .sort((a, b) => {
          const fillA = a.targetResponses > 0 ? a.currentResponses / a.targetResponses : 0;
          const fillB = b.targetResponses > 0 ? b.currentResponses / b.targetResponses : 0;
          return fillB - fillA;
        });
    case "Trending in Your Interests":
      return [...ideas].filter((idea) => idea.matchScore >= 30).sort((a, b) => scoreTrending(b) - scoreTrending(a));
    case "Explore More":
      return [...ideas].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    default:
      return ideas;
  }
}

/* ─── Filter bar select ─── */

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: readonly string[]; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-[4px]">
      <label className="text-[11px] font-semibold text-[#A8A29E] uppercase tracking-[1px]">{label}</label>
      <select
        value={value} onChange={(e) => onChange(e.target.value)}
        className="text-[13px] px-[10px] py-[7px] rounded-xl border border-[#EDE8E3] bg-white text-[#1C1917] outline-none focus:border-[#E5654E] focus:shadow-[0_0_0_3px_rgba(229,101,78,0.1)] transition-all duration-300 cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23666%22%20stroke-width%3D%222%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_10px_center] bg-no-repeat pr-[28px]"
      >
        {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  );
}

/* ─── Main component ─── */

export default function WallFeed({
  ideas,
  userProfile,
  activityItems = [],
  weeklyDigest,
}: {
  ideas: WallCardProps[];
  userProfile: WallUserProfile;
  activityItems?: ActivityItem[];
  weeklyDigest?: WeeklyDigest;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("Best Matches");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [showFilters, setShowFilters] = useState(false);

  // Feed view mode — default to immersive, hydrate from localStorage after mount
  const [viewMode, setViewMode] = useState<"grid" | "immersive">("immersive");
  const viewModeHydrated = useRef(false);

  useEffect(() => {
    if (viewModeHydrated.current) return;
    viewModeHydrated.current = true;
    try {
      const stored = localStorage.getItem("wall-view-mode") as "grid" | "immersive" | null;
      if (stored === "grid") setViewMode("grid");
    } catch { /* ignore */ }
  }, []);

  const toggleViewMode = useCallback(() => {
    setViewMode((prev) => {
      const next = prev === "grid" ? "immersive" : "grid";
      try { localStorage.setItem("wall-view-mode", next); } catch { /* ignore */ }
      return next;
    });
  }, []);

  // Bookmarks (localStorage)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [showSaved, setShowSaved] = useState(false);
  const savedHydrated = useRef(false);

  useEffect(() => {
    try { const raw = localStorage.getItem("wall-saved"); if (raw) setSavedIds(new Set(JSON.parse(raw))); } catch { /* ignore */ }
    savedHydrated.current = true;
  }, []);

  useEffect(() => {
    if (!savedHydrated.current) return;
    localStorage.setItem("wall-saved", JSON.stringify([...savedIds]));
  }, [savedIds]);

  const toggleSave = useCallback((id: string) => {
    setSavedIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }, []);

  // Search overlay & filter sheet
  const [showSearch, setShowSearch] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showSearch) setTimeout(() => searchInputRef.current?.focus(), 100);
  }, [showSearch]);

  // Peek expansion
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => {
      const next = prev === id ? null : id;
      if (next) setTimeout(() => document.getElementById(`wall-card-${next}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 100);
      return next;
    });
  }, []);

  // Keyboard navigation
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [showKbHint, setShowKbHint] = useState(false);
  const kbHintSeen = useRef(false);

  useEffect(() => {
    try { kbHintSeen.current = localStorage.getItem("wall-kb-hint-seen") === "1"; } catch { /* ignore */ }
    if (!kbHintSeen.current) setShowKbHint(true);
  }, []);

  // Achievement banners
  const [dismissedAchievements, setDismissedAchievements] = useState<Set<string>>(new Set());

  useEffect(() => {
    try { const raw = localStorage.getItem("wall-achievements-dismissed"); if (raw) setDismissedAchievements(new Set(JSON.parse(raw))); } catch { /* ignore */ }
  }, []);

  const dismissAchievement = useCallback((key: string) => {
    setDismissedAchievements((prev) => {
      const next = new Set(prev);
      next.add(key);
      localStorage.setItem("wall-achievements-dismissed", JSON.stringify([...next]));
      return next;
    });
  }, []);

  const currentAchievement = useMemo<Achievement | null>(() => {
    for (const def of ACHIEVEMENT_DEFS) {
      if (def.check(userProfile) && !dismissedAchievements.has(def.key)) {
        return { key: def.key, title: def.title, subtitle: def.subtitle, accent: def.accent, icon: def.icon };
      }
    }
    return null;
  }, [userProfile, dismissedAchievements]);

  // Earnings potential banner
  const [earningsDismissed, setEarningsDismissed] = useState(false);
  useEffect(() => {
    try { setEarningsDismissed(localStorage.getItem("wall-earnings-dismissed") === "1"); } catch { /* ignore */ }
  }, []);

  const earningsPotential = useMemo(
    () => ideas.filter((i) => i.matchScore >= 50).reduce((sum, i) => sum + i.rewardAmount, 0),
    [ideas]
  );

  // Filters & results
  const hasActiveFilters = filters.category !== "Any" || filters.audience !== "Any" || filters.reward !== "Any" || filters.time !== "Any" || filters.sort !== "Relevant";

  const results = useMemo(() => {
    let filtered = applyFilters(ideas, filters, query);
    if (showSaved) filtered = filtered.filter((idea) => savedIds.has(idea.id));
    return rankByTab(filtered, activeTab, filters.sort);
  }, [ideas, filters, query, activeTab, showSaved, savedIds]);

  const matchCount = useMemo(() => ideas.filter((i) => i.matchScore >= 50).length, [ideas]);

  const trendingItems = useMemo(() => {
    if (activeTab !== "Best Matches") return [];
    return [...ideas].filter((i) => i.currentResponses > 0).sort((a, b) => scoreTrending(b) - scoreTrending(a)).slice(0, 8);
  }, [ideas, activeTab]);

  const interstitialData = useMemo(() => {
    const topCategories = new Set(results.slice(0, 5).map((r) => r.category).filter(Boolean));
    const hotIdea = ideas.filter((i) => i.category && !topCategories.has(i.category)).sort((a, b) => scoreBestMatches(b) - scoreBestMatches(a))[0] || null;
    const totalVelocity = ideas.reduce((sum, i) => {
      // eslint-disable-next-line react-hooks/purity -- display-only heuristic in useMemo
      const ageHours = Math.max(1, (Date.now() - new Date(i.createdAt).getTime()) / (1000 * 60 * 60));
      return sum + i.currentResponses / ageHours;
    }, 0);
    return { hotIdea, matchCount, totalVelocity: Math.round(totalVelocity) };
  }, [ideas, results, matchCount]);

  // Keyboard navigation handler
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (document.activeElement?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;

      if (e.key === "j" || e.key === "k") {
        e.preventDefault();
        if (showKbHint) {
          setShowKbHint(false);
          localStorage.setItem("wall-kb-hint-seen", "1");
        }
        setFocusedIndex((prev) => {
          const len = results.length;
          if (len === 0) return null;
          if (prev === null) return e.key === "j" ? 0 : len - 1;
          const next = e.key === "j" ? Math.min(prev + 1, len - 1) : Math.max(prev - 1, 0);
          setTimeout(() => document.getElementById(`wall-card-${results[next].id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 0);
          return next;
        });
      } else if (e.key === "Enter" && focusedIndex !== null) {
        e.preventDefault();
        toggleExpand(results[focusedIndex].id);
      } else if (e.key === "s" && focusedIndex !== null) {
        e.preventDefault();
        toggleSave(results[focusedIndex].id);
      } else if (e.key === "o" && focusedIndex !== null) {
        e.preventDefault();
        window.location.href = `/dashboard/the-wall/${results[focusedIndex].id}`;
      } else if (e.key === "r" && focusedIndex !== null) {
        e.preventDefault();
        window.location.href = `/dashboard/the-wall/${results[focusedIndex].id}`;
      } else if (e.key === "/") {
        e.preventDefault();
        document.getElementById("wall-search")?.focus();
      } else if (e.key === "Escape") {
        if (expandedId) setExpandedId(null);
        else if (document.activeElement?.id === "wall-search") {
          (document.activeElement as HTMLElement).blur();
        } else setFocusedIndex(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [results, focusedIndex, expandedId, showKbHint, toggleExpand, toggleSave]);

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function clearFilters() {
    setFilters(defaultFilters);
    setQuery("");
    setShowSaved(false);
  }

  const gridCards = results;

  function renderCard(idea: WallCardProps, globalIndex: number, variant: "featured" | "standard" = "standard") {
    return (
      <WallCardTracker key={idea.id} campaignId={idea.id} animationDelay={Math.min(globalIndex * 50, 400)}>
        {(isVisible) => (
          <WallCard
            {...idea}
            variant={variant}
            isVisible={isVisible}
            isSaved={savedIds.has(idea.id)}
            onToggleSave={toggleSave}
            isExpanded={expandedId === idea.id}
            onToggleExpand={toggleExpand}
            isFocused={focusedIndex === globalIndex}
          />
        )}
      </WallCardTracker>
    );
  }

  const activeFilterCount = [filters.category, filters.audience, filters.reward, filters.time, filters.sort].filter((v) => v !== "Any" && v !== "Relevant").length;

  return (
    <div id="wall-feed" className="wall-background">
      {/* ─── Header ─── */}
      <div className="flex items-end justify-between mb-[32px] relative z-[1]">
        <div>
          <h1 className="text-[32px] max-md:text-[28px] font-bold leading-[1.1]" style={{ fontFamily: "var(--font-wall-body)", letterSpacing: "-0.5px", color: "#1C1917" }}>The Wall</h1>
          {matchCount > 0 && (
            <p className="text-[13px] mt-[6px]" style={{ color: "#78716C", fontFamily: "var(--font-wall-body)" }}>
              <span className="font-medium" style={{ color: "#1C1917" }}>{matchCount}</span> campaigns matched to you
            </p>
          )}
        </div>
        <button
          onClick={toggleViewMode}
          className="wall-floating-btn !w-[36px] !h-[36px]"
          aria-label={viewMode === "immersive" ? "Switch to grid view" : "Switch to immersive view"}
          title={viewMode === "immersive" ? "Grid view" : "Immersive view"}
        >
          {viewMode === "immersive" ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="18" rx="2" /><line x1="8" y1="21" x2="8" y2="3" />
            </svg>
          )}
        </button>
      </div>

      {/* ─── Tab navigation ─── */}
      <div className="flex gap-[6px] overflow-x-auto scrollbar-none mb-[20px] pb-[4px] -mx-[4px] px-[4px] relative z-[1]" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`wall-glass-pill whitespace-nowrap font-medium cursor-pointer shrink-0 ${activeTab === tab.key ? "wall-glass-pill-active" : ""}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Active filters indicator ─── */}
      {(hasActiveFilters || query || showSaved) && (
        <div className="text-[11px] mb-[12px] relative z-[1]" style={{ color: "#78716C" }}>
          {results.length} result{results.length !== 1 && "s"}{query && <> for &ldquo;{query}&rdquo;</>}{showSaved && " (saved)"}
          <button onClick={clearFilters} className="text-[11px] bg-transparent border-none cursor-pointer underline transition-colors ml-[8px]" style={{ color: "#A8A29E" }}>Clear</button>
        </div>
      )}

      {/* ─── Feed layout ─── */}
      <div className="relative z-[1]">
      {results.length > 0 ? (
        viewMode === "immersive" ? (
          /* ── Immersive: full-height scroll-snap feed ── */
          <div className="immersive-feed">
            {results.map((idea, index) => {
              const section = index === 0 ? "For you"
                : index === 1 && trendingItems.includes(idea) ? "Trending"
                : undefined;
              return (
                <WallCardImmersive
                  key={idea.id}
                  idea={idea}
                  isSaved={savedIds.has(idea.id)}
                  onToggleSave={toggleSave}
                  sectionLabel={section}
                />
              );
            })}
          </div>
        ) : (
          /* ── Editorial Stack: Massive feature sections ── */
          <div className="flex flex-col gap-[20px]">
            {trendingItems.length >= 4 && <TrendingRow ideas={trendingItems} />}
            {gridCards.length > 0 && (
              <div className="w-full max-w-[1000px] mx-auto py-[60px] md:py-[80px] flex flex-col gap-[80px] md:gap-[160px]">
                {gridCards.map((idea, index) => {
                  const isLeft = index % 2 === 0;
                  
                  return (
                    <React.Fragment key={idea.id}>
                      {/* Interstitial items */}
                      {index === 4 && interstitialData.hotIdea && (
                        <div className="w-full"><FeedInterstitial type="hot-category" hotIdea={interstitialData.hotIdea} /></div>
                      )}
                      {index === 8 && interstitialData.matchCount > 0 && (
                        <div className="w-full"><FeedInterstitial type="match-power" matchCount={interstitialData.matchCount} /></div>
                      )}
                      {index === 12 && interstitialData.totalVelocity > 0 && (
                        <div className="w-full"><FeedInterstitial type="social-proof" totalVelocity={interstitialData.totalVelocity} /></div>
                      )}

                      {/* Editorial Feature Card */}
                      <WallCard
                        {...idea}
                        isExpanded={expandedId === idea.id}
                        isFocused={focusedIndex === index}
                        onToggleExpand={toggleExpand}
                        onToggleSave={toggleSave}
                        isSaved={savedIds.has(idea.id)}
                      />
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </div>
        )
      ) : (
        <div className="py-[48px] text-center">
          <p className="text-[14px] mb-[4px]" style={{ color: "#78716C" }}>{showSaved ? "No saved ideas yet. Bookmark ideas to find them here." : (hasActiveFilters || query) ? "No ideas match this filter yet." : "No campaigns available right now. Check back soon."}</p>
          {(hasActiveFilters || query || showSaved) && (
            <button onClick={clearFilters} className="text-[13px] bg-transparent border-none cursor-pointer underline transition-colors" style={{ color: "#A8A29E" }}>Clear filters</button>
          )}
        </div>
      )}
      </div>

      {/* ─── Floating action bar ─── */}
      <div className="wall-floating-bar">
        {/* Search button */}
        <button
          onClick={() => setShowSearch(!showSearch)}
          className={`wall-floating-btn ${showSearch ? "wall-floating-btn-active" : ""}`}
          aria-label="Search"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>

        {/* Bookmarks button */}
        <button
          onClick={() => setShowSaved(!showSaved)}
          className={`wall-floating-btn relative ${showSaved ? "wall-floating-btn-active" : ""}`}
          aria-label="Bookmarks"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill={showSaved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 3h14a1 1 0 011 1v16.5l-8-5.5-8 5.5V4a1 1 0 011-1z" />
          </svg>
          {savedIds.size > 0 && (
            <span className="absolute -top-[4px] -right-[4px] text-[9px] font-bold w-[16px] h-[16px] rounded-full flex items-center justify-center bg-[#E5654E] text-white">{savedIds.size}</span>
          )}
        </button>

        {/* Filters button */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`wall-floating-btn relative ${showFilters || hasActiveFilters ? "wall-floating-btn-active" : ""}`}
          aria-label="Filters"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="6" x2="20" y2="6" /><line x1="8" y1="12" x2="20" y2="12" /><line x1="12" y1="18" x2="20" y2="18" />
          </svg>
          {activeFilterCount > 0 && (
            <span className="absolute -top-[4px] -right-[4px] text-[9px] font-bold w-[16px] h-[16px] rounded-full flex items-center justify-center bg-[#E5654E] text-white">{activeFilterCount}</span>
          )}
        </button>
      </div>

      {/* ─── Search overlay ─── */}
      {showSearch && (
        <div className="wall-search-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowSearch(false); }}>
          <div className="w-full max-w-[480px] px-[16px]">
            <div className="relative">
              <div className="absolute left-[16px] top-1/2 -translate-y-1/2 text-[#A8A29E]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
              <input
                ref={searchInputRef}
                id="wall-search"
                type="text"
                placeholder="Search ideas..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-[44px] pr-[44px] py-[14px] text-[16px] rounded-2xl border border-[#EDE8E3] bg-white text-[#1C1917] placeholder:text-[#A8A29E] outline-none focus:border-[#E5654E] focus:shadow-[0_0_0_3px_rgba(229,101,78,0.1)] transition-all duration-200 backdrop-blur-xl"
                onKeyDown={(e) => { if (e.key === "Escape") setShowSearch(false); }}
              />
              <button
                onClick={() => { setQuery(""); setShowSearch(false); }}
                className="absolute right-[14px] top-1/2 -translate-y-1/2 text-[#A8A29E] hover:text-[#78716C] bg-transparent border-none cursor-pointer transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            {query && (
              <p className="text-[12px] text-[#A8A29E] mt-[12px] text-center">{results.length} result{results.length !== 1 ? "s" : ""}</p>
            )}
          </div>
        </div>
      )}

      {/* ─── Filter bottom sheet ─── */}
      {showFilters && (
        <div className="wall-filter-sheet">
          <div className="flex items-center justify-between mb-[16px]">
            <h3 className="text-[14px] font-semibold text-[#1C1917]">Filters</h3>
            <div className="flex items-center gap-[8px]">
              {hasActiveFilters && (
                <button onClick={clearFilters} className="text-[12px] bg-transparent border-none cursor-pointer transition-colors" style={{ color: "#A8A29E" }}>Clear all</button>
              )}
              <button onClick={() => setShowFilters(false)} className="text-[#A8A29E] hover:text-[#78716C] bg-transparent border-none cursor-pointer transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-[12px] max-sm:grid-cols-1">
            <FilterSelect label="Category" value={filters.category} options={["Any", ...CATEGORY_OPTIONS]} onChange={(v) => updateFilter("category", v)} />
            <FilterSelect label="Audience" value={filters.audience} options={["Any", ...AUDIENCE_TYPES]} onChange={(v) => updateFilter("audience", v)} />
            <FilterSelect label="Reward" value={filters.reward} options={REWARD_LEVELS} onChange={(v) => updateFilter("reward", v)} />
            <FilterSelect label="Time" value={filters.time} options={TIME_LEVELS} onChange={(v) => updateFilter("time", v)} />
            <FilterSelect label="Sort" value={filters.sort} options={SORT_OPTIONS} onChange={(v) => updateFilter("sort", v)} />
          </div>
        </div>
      )}

      {/* Keyboard hint */}
      <KeyboardHint visible={showKbHint} />
    </div>
  );
}
