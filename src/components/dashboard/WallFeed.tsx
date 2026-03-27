"use client";

import { useState, useMemo } from "react";
import WallCard, { type WallCardProps } from "@/components/dashboard/WallCard";
import { CATEGORY_OPTIONS } from "@/lib/constants";

/* ─── Tabs ─── */

const tabs = ["Best Matches", "High Reward Matches", "Closing Soon", "Trending in Your Interests", "Explore More"] as const;
type Tab = (typeof tabs)[number];

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

/* ─── Scoring: "Best Matches" composite rank (match-aware) ─── */

function scoreBestMatches(idea: WallCardProps): number {
  const now = Date.now();
  let score = 0;

  // Match relevance: dominant signal — personalized by server
  score += (idea.matchScore / 100) * 35; // up to 35 pts

  // Freshness: exponential decay — newer ideas score higher
  const ageHours = (now - new Date(idea.createdAt).getTime()) / (1000 * 60 * 60);
  score += Math.max(0, 25 - ageHours * 0.35); // up to 25 pts

  // Reward signal: higher reward = more attractive
  score += Math.min(idea.rewardAmount / 5, 15); // up to 15 pts ($75+ maxes out)

  // Activity / velocity: response fill ratio signals community interest
  const fillRatio = idea.targetResponses > 0 ? idea.currentResponses / idea.targetResponses : 0;
  score += fillRatio * 10; // up to 10 pts

  // Urgency boost: closing soon gets a bump
  if (idea.deadline) {
    const hoursLeft = (new Date(idea.deadline).getTime() - now) / (1000 * 60 * 60);
    if (hoursLeft > 0 && hoursLeft < 72) score += 10;
  }
  if (idea.targetResponses > 0 && fillRatio >= 0.7) score += 5;

  // Reward quality signals: campaigns investing in quality are more attractive
  if (idea.bonusAvailable) score += 3;
  if (idea.rewardsTopAnswers) score += 2;

  return score;
}

/* ─── Scoring: "Trending" velocity rank ─── */

function scoreTrending(idea: WallCardProps): number {
  let score = 0;

  // Response velocity: high current_responses relative to age = trending
  const ageHours = Math.max(1, (Date.now() - new Date(idea.createdAt).getTime()) / (1000 * 60 * 60));
  const velocity = idea.currentResponses / ageHours;
  score += velocity * 50; // responses per hour, amplified

  // Fill ratio as secondary signal
  const fillRatio = idea.targetResponses > 0 ? idea.currentResponses / idea.targetResponses : 0;
  score += fillRatio * 30;

  // Reward interest
  score += Math.min(idea.rewardAmount / 10, 10);

  // Recency tiebreaker
  score += Math.max(0, 10 - (Date.now() - new Date(idea.createdAt).getTime()) / (1000 * 60 * 60 * 24));

  return score;
}

/* ─── Apply filters ─── */

function applyFilters(ideas: WallCardProps[], filters: Filters, query: string): WallCardProps[] {
  let result = ideas;

  // Search
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

  // Category
  if (filters.category !== "Any") {
    result = result.filter((idea) => idea.category === filters.category);
  }

  // Audience
  if (filters.audience !== "Any") {
    result = result.filter((idea) => idea.tags.some((t) => t === filters.audience));
  }

  // Reward level
  if (filters.reward !== "Any") {
    const min = parseInt(filters.reward.replace(/[^0-9]/g, ""), 10) || 0;
    result = result.filter((idea) => idea.rewardAmount >= min);
  }

  // Time to answer
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

  // Sort override from filters takes precedence within any tab
  if (sortOverride === "Newest") {
    return [...ideas].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  if (sortOverride === "Most Active") {
    return [...ideas].sort((a, b) => b.currentResponses - a.currentResponses);
  }

  switch (tab) {
    case "Best Matches":
      return [...ideas].sort((a, b) => scoreBestMatches(b) - scoreBestMatches(a));

    case "High Reward Matches":
      return [...ideas]
        .filter((idea) => idea.rewardAmount > 0 || idea.bonusAvailable)
        .sort((a, b) => {
          const aScore = a.rewardAmount + (a.bonusAvailable ? 10 : 0);
          const bScore = b.rewardAmount + (b.bonusAvailable ? 10 : 0);
          if (bScore !== aScore) return bScore - aScore;
          return b.matchScore - a.matchScore; // tiebreak by match
        });

    case "Closing Soon":
      return ideas
        .filter((idea) => {
          if (idea.targetResponses > 0 && idea.currentResponses / idea.targetResponses >= 0.7)
            return true;
          if (idea.deadline && new Date(idea.deadline).getTime() - now < 72 * 60 * 60 * 1000)
            return true;
          return false;
        })
        .sort((a, b) => {
          const fillA = a.targetResponses > 0 ? a.currentResponses / a.targetResponses : 0;
          const fillB = b.targetResponses > 0 ? b.currentResponses / b.targetResponses : 0;
          return fillB - fillA;
        });

    case "Trending in Your Interests":
      return [...ideas]
        .filter((idea) => idea.matchScore >= 30)
        .sort((a, b) => scoreTrending(b) - scoreTrending(a));

    case "Explore More":
      return [...ideas].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

    default:
      return ideas;
  }
}

/* ─── Filter bar select ─── */

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-[4px]">
      <label className="text-[11px] font-medium text-[#999999] uppercase tracking-[1px]">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-[13px] px-[10px] py-[7px] rounded-lg border border-[#ebebeb] bg-white text-[#111111] outline-none focus:border-[#d4d4d4] focus:shadow-[0_0_0_3px_rgba(232,184,122,0.1)] transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23999%22%20stroke-width%3D%222%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_10px_center] bg-no-repeat pr-[28px]"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

/* ─── Main component ─── */

export default function WallFeed({ ideas }: { ideas: WallCardProps[] }) {
  const [activeTab, setActiveTab] = useState<Tab>("Best Matches");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [showFilters, setShowFilters] = useState(false);

  const hasActiveFilters =
    filters.category !== "Any" ||
    filters.audience !== "Any" ||
    filters.reward !== "Any" ||
    filters.time !== "Any" ||
    filters.sort !== "Relevant";

  const results = useMemo(() => {
    const filtered = applyFilters(ideas, filters, query);
    return rankByTab(filtered, activeTab, filters.sort);
  }, [ideas, filters, query, activeTab]);

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function clearFilters() {
    setFilters(defaultFilters);
    setQuery("");
  }

  return (
    <>
      {/* Search bar */}
      <div className="relative mb-[16px]">
        <div className="absolute left-[12px] top-1/2 -translate-y-1/2 text-[#999999]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Search by keyword, problem, audience, or category..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-[36px] pr-[12px] py-[10px] text-[14px] rounded-lg border border-[#ebebeb] bg-white text-[#111111] placeholder:text-[#999999] outline-none focus:border-[#d4d4d4] focus:shadow-[0_0_0_3px_rgba(232,184,122,0.1)] transition-all"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-[12px] top-1/2 -translate-y-1/2 text-[#999999] hover:text-[#555555] bg-transparent border-none cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* Filter toggle + active count */}
      <div className="flex items-center justify-between mb-[16px]">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-[6px] text-[13px] font-medium px-[12px] py-[7px] rounded-lg border transition-all cursor-pointer ${
            showFilters || hasActiveFilters
              ? "border-[#111111] bg-[#111111] text-white"
              : "border-[#ebebeb] bg-white text-[#555555] hover:border-[#d4d4d4]"
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="6" x2="20" y2="6" /><line x1="8" y1="12" x2="20" y2="12" /><line x1="12" y1="18" x2="20" y2="18" />
          </svg>
          Filters
          {hasActiveFilters && (
            <span className="bg-white text-[#111111] text-[10px] font-bold w-[16px] h-[16px] rounded-full flex items-center justify-center">
              {[filters.category, filters.audience, filters.reward, filters.time, filters.sort].filter((v) => v !== "Any" && v !== "Relevant").length}
            </span>
          )}
        </button>
        {(hasActiveFilters || query) && (
          <button
            onClick={clearFilters}
            className="text-[12px] text-[#999999] hover:text-[#555555] bg-transparent border-none cursor-pointer underline"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Filter bar */}
      {showFilters && (
        <div className="grid grid-cols-5 gap-[12px] mb-[20px] p-[16px] bg-white border border-[#ebebeb] rounded-xl max-md:grid-cols-2 max-sm:grid-cols-1">
          <FilterSelect
            label="Category"
            value={filters.category}
            options={["Any", ...CATEGORY_OPTIONS]}
            onChange={(v) => updateFilter("category", v)}
          />
          <FilterSelect
            label="Audience"
            value={filters.audience}
            options={["Any", ...AUDIENCE_TYPES]}
            onChange={(v) => updateFilter("audience", v)}
          />
          <FilterSelect
            label="Reward"
            value={filters.reward}
            options={REWARD_LEVELS}
            onChange={(v) => updateFilter("reward", v)}
          />
          <FilterSelect
            label="Time"
            value={filters.time}
            options={TIME_LEVELS}
            onChange={(v) => updateFilter("time", v)}
          />
          <FilterSelect
            label="Sort"
            value={filters.sort}
            options={SORT_OPTIONS}
            onChange={(v) => updateFilter("sort", v)}
          />
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-[24px] border-b border-[#ebebeb] mb-[24px] overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`text-[13px] pb-[10px] px-[4px] whitespace-nowrap transition-all cursor-pointer bg-transparent border-none border-b-2 ${
              activeTab === tab
                ? "border-[#111111] text-[#111111] font-semibold"
                : "border-transparent text-[#999999] hover:text-[#555555]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Incentive framing */}
      <div className="flex items-center gap-[16px] text-[12px] text-[#999999] mb-[16px] py-[10px] px-[16px] bg-[#faf8f5] rounded-lg border border-[#ebebeb]/50">
        <span className="flex items-center gap-[6px]">
          <span className="w-[4px] h-[4px] rounded-full bg-[#e8b87a]" />
          Matched to your profile
        </span>
        <span className="flex items-center gap-[6px]">
          <span className="w-[4px] h-[4px] rounded-full bg-[#e8b87a]" />
          Thoughtful responses earn more
        </span>
        <span className="flex items-center gap-[6px] max-md:hidden">
          <span className="w-[4px] h-[4px] rounded-full bg-[#e8b87a]" />
          Founders reward top insights
        </span>
      </div>

      {/* Results count */}
      <div className="text-[12px] text-[#999999] mb-[12px]">
        {results.length} {results.length === 1 ? "idea" : "ideas"}
        {query && <> matching &ldquo;{query}&rdquo;</>}
      </div>

      {/* Card list */}
      {results.length > 0 ? (
        <div className="flex flex-col gap-[12px]">
          {results.map((idea) => (
            <WallCard key={idea.id} {...idea} />
          ))}
        </div>
      ) : (
        <div className="py-[48px] text-center">
          <p className="text-[14px] text-[#999999] mb-[4px]">
            No ideas match this filter yet.
          </p>
          {(hasActiveFilters || query) && (
            <button
              onClick={clearFilters}
              className="text-[13px] text-[#555555] hover:text-[#111111] bg-transparent border-none cursor-pointer underline"
            >
              Clear filters
            </button>
          )}
        </div>
      )}
    </>
  );
}
