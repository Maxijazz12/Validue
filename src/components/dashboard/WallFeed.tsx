"use client";

import React, { useState, useMemo, useCallback } from "react";
import WallCardUnified, { type WallCardProps } from "@/components/dashboard/WallCardUnified";
import WallCardTracker from "@/components/dashboard/WallCardTracker";

/* ─── Re-export types for server page ─── */
export type { WallUserProfile } from "@/components/dashboard/RespondentStatsBar";
import type { WallUserProfile } from "@/components/dashboard/RespondentStatsBar";

/* ─── Tabs ─── */

const tabs = [
  { key: "for-you", label: "For You" },
  { key: "new", label: "New" },
  { key: "saved", label: "Saved" },
] as const;
type Tab = (typeof tabs)[number]["key"];

/* ─── Scoring (for-you sort) ─── */

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

/* ─── Rank by tab ─── */

function rankByTab(ideas: WallCardProps[], tab: Tab): WallCardProps[] {
  switch (tab) {
    case "for-you":
      return [...ideas].sort((a, b) => scoreBestMatches(b) - scoreBestMatches(a));
    case "new":
      return [...ideas].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    case "saved":
      return ideas;
    default:
      return ideas;
  }
}

/* ─── Main component ─── */

export default function WallFeed({
  ideas,
  userProfile,
}: {
  ideas: WallCardProps[];
  userProfile: WallUserProfile;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("for-you");

  // Bookmarks (localStorage)
  const [savedIds, setSavedIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set<string>();
    try { const raw = localStorage.getItem("wall-saved"); if (raw) return new Set<string>(JSON.parse(raw)); } catch { /* ignore */ }
    return new Set<string>();
  });

  const toggleSave = useCallback((id: string) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      localStorage.setItem("wall-saved", JSON.stringify([...next]));
      return next;
    });
  }, []);

  const results = useMemo(() => {
    let filtered = ideas;
    if (activeTab === "saved") filtered = filtered.filter((idea) => savedIds.has(idea.id));
    return rankByTab(filtered, activeTab);
  }, [ideas, activeTab, savedIds]);

  return (
    <div className="wall-page-bleed min-h-[100dvh] pb-12 selection:bg-[#E5654E]/20 font-sans relative">

      {/* Pane Controller (Upgraded to V2 Precision layout) */}
      <div className="sticky top-0 z-50 w-full pt-[24px] pb-[16px] px-5 bg-gradient-to-b from-[#FBF9F7] via-[#FBF9F7]/90 to-transparent pointer-events-none">
        <div className="max-w-7xl mx-auto flex items-center justify-center pointer-events-auto">
          <div className="flex bg-white/70 backdrop-blur-xl overflow-hidden p-[6px] rounded-full border border-[#E7E5E4]/60 shadow-[0_8px_32px_rgba(0,0,0,0.04)]">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative px-[24px] py-[10px] rounded-full text-[12px] font-bold uppercase tracking-widest transition-all duration-400 ease-out flex items-center justify-center ${
                  activeTab === tab.key 
                    ? "text-white bg-[#1C1917] shadow-[0_2px_12px_rgba(28,25,23,0.15)] bg-clip-padding" 
                    : "text-[#A8A29E] hover:text-[#1C1917] hover:bg-[#F5F5F4]"
                }`}
              >
                <span className="relative z-10">{tab.label}</span>
                {tab.key === "saved" && savedIds.size > 0 && (
                  <span className={`relative z-10 ml-2 inline-flex items-center justify-center min-w-[20px] h-[20px] text-[10px] font-bold tracking-wider rounded-full transition-colors ${
                    activeTab === tab.key ? "bg-white/20 text-white" : "bg-black/5 text-[#A8A29E]"
                  }`}>
                    {savedIds.size}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Feed Content: Bento Grid */}
      <div className="max-w-7xl mx-auto px-5 py-8">
        {results.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[24px] auto-rows-min">
            {results.map((idea, i) => {
              const isHighMatch = activeTab === "for-you" && i === 0; // For Bento visually feature the top match
              
              return (
                <div 
                  key={idea.id} 
                  className={`wall-card-stagger-v2 flex h-full ${
                    isHighMatch ? "md:col-span-2 lg:col-span-2 row-span-2" : "col-span-1"
                  }`} 
                  style={{ animationDelay: `${Math.min(i, 12) * 60}ms` }}
                >
                  <WallCardTracker campaignId={idea.id}>
                    {() => (
                      <WallCardUnified
                        idea={idea}
                        isSaved={savedIds.has(idea.id)}
                        onToggleSave={toggleSave}
                      />
                    )}
                  </WallCardTracker>
                </div>
              );
            })}
            
            <div className="col-span-full pt-[40px] pb-[60px] flex flex-col items-center justify-center gap-[12px]">
              <div className="w-1.5 h-1.5 rounded-full bg-[#D6D3D1] animate-pulse"></div>
              <p className="font-mono text-[10px] font-bold tracking-widest uppercase text-[#A8A29E]">EOF Reached</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-[120px] text-center px-4">
             <div className="flex flex-col items-center justify-center border border-dashed border-[#E7E5E4] rounded-[32px] bg-white/40 backdrop-blur-sm shadow-[0_8px_32px_rgba(0,0,0,0.01)] p-[64px] max-w-lg w-full">
               <span className="font-mono text-[11px] font-bold tracking-widest text-[#A8A29E] uppercase mb-4">Query empty space</span>
               <h3 className="text-[20px] md:text-[24px] font-medium tracking-tight text-[#1C1917] mb-[8px]">
                 {activeTab === "saved" ? "No bookmarked references" : "Stream currently empty"}
               </h3>
               <p className="text-[#78716C] text-[14px] font-medium max-w-[280px]">
                 {activeTab === "saved" 
                   ? "Terminal has no saved execution nodes. Return to the main stream." 
                   : "Check back later for new campaign indices."}
               </p>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
