"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import ResponseCard from "./ResponseCard";
import type { ReputationTier } from "@/lib/reputation-config";

export type ResponseItem = {
  responseId: string;
  rank: number;
  respondentName: string;
  respondentAvatar: string | null;
  respondentTier: ReputationTier;
  qualityScore: number | null;
  aiFeedback: string | null;
  status: string;
  submittedAt: string;
  answers: {
    questionText: string;
    questionType: string;
    answerText: string;
    charCount: number;
    timeSpentMs: number;
  }[];
  isTop: boolean;
  scoringSource?: string;
  scoringConfidence?: number;
  dimensions?: {
    depth: number;
    relevance: number;
    authenticity: number;
    consistency: number;
  } | null;
};

type FilterTab = "all" | "ranked" | "unranked";
type SortOption = "score" | "newest" | "oldest";

type ResponseListProps = {
  responses: ResponseItem[];
  onScrollReady?: (scrollFn: (responseId: string) => void) => void;
};

export default function ResponseList({
  responses,
  onScrollReady,
}: ResponseListProps) {
  const [filter, setFilter] = useState<FilterTab>("all");
  const [sort, setSort] = useState<SortOption>("score");
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToResponse = useCallback(
    (responseId: string) => {
      const el = document.getElementById(`response-${responseId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setHighlightedId(responseId);
        if (highlightTimer.current) clearTimeout(highlightTimer.current);
        highlightTimer.current = setTimeout(() => setHighlightedId(null), 2000);
      }
    },
    []
  );

  // Expose scroll function to parent
  useEffect(() => {
    if (onScrollReady) {
      onScrollReady(scrollToResponse);
    }
  }, [onScrollReady, scrollToResponse]);

  // Filter
  const filtered = responses.filter((r) => {
    if (filter === "ranked") return r.status === "ranked";
    if (filter === "unranked") return r.status !== "ranked";
    return true;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (sort === "score") {
      return (b.qualityScore ?? -1) - (a.qualityScore ?? -1);
    }
    if (sort === "newest") {
      return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
    }
    // oldest
    return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
  });

  const rankedCount = responses.filter((r) => r.status === "ranked").length;
  const unrankedCount = responses.length - rankedCount;

  const filterTabs: { key: FilterTab; label: string; count: number }[] = [
    { key: "all", label: "All", count: responses.length },
    { key: "ranked", label: "Ranked", count: rankedCount },
    { key: "unranked", label: "Unranked", count: unrankedCount },
  ];

  return (
    <div>
      {/* Controls row */}
      <div className="flex items-center justify-between mb-[12px] gap-[12px] max-md:flex-col max-md:items-stretch">
        {/* Filter tabs */}
        <div className="flex gap-[4px] p-[4px] rounded-lg bg-[#F3F4F6]">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={`text-[12px] font-semibold py-[6px] px-[12px] rounded-md transition-all cursor-pointer border-none ${
                filter === tab.key
                  ? "bg-white text-[#111111] shadow-sm"
                  : "bg-transparent text-[#64748B] hover:text-[#111111]"
              }`}
            >
              {tab.label}
              <span className="ml-[4px] text-[#94A3B8] font-normal">
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Sort dropdown */}
        <div className="flex items-center gap-[6px]">
          <span className="text-[12px] text-[#94A3B8]">Sort by</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="text-[12px] border border-[#E2E8F0] rounded-lg px-[8px] py-[6px] text-[#111111] bg-white outline-none focus:border-[#CBD5E1] cursor-pointer"
          >
            <option value="score">Score</option>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </select>
        </div>
      </div>

      {/* Response cards */}
      {sorted.length === 0 ? (
        <div className="text-center py-[32px] text-[13px] text-[#94A3B8]">
          No responses match this filter.
        </div>
      ) : (
        <div className="flex flex-col gap-[12px]">
          {sorted.map((response, index) => (
            <ResponseCard
              key={response.responseId}
              responseId={response.responseId}
              rank={index + 1}
              respondentName={response.respondentName}
              respondentAvatar={response.respondentAvatar}
              respondentTier={response.respondentTier}
              qualityScore={response.qualityScore}
              aiFeedback={response.aiFeedback}
              status={response.status}
              submittedAt={response.submittedAt}
              answers={response.answers}
              isTop={index < 3 && response.status === "ranked" && sort === "score" && filter !== "unranked"}
              scoringSource={response.scoringSource}
              scoringConfidence={response.scoringConfidence}
              dimensions={response.dimensions}
              highlighted={highlightedId === response.responseId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
