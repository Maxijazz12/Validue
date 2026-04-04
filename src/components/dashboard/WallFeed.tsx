"use client";

import { useState, useSyncExternalStore, useMemo, useCallback } from "react";
import WallCardUnified, { type WallCardProps } from "@/components/dashboard/WallCardUnified";
import WallCardTracker from "@/components/dashboard/WallCardTracker";
import { FEATURES } from "@/lib/feature-flags";

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
  if (FEATURES.RESPONDENT_PAYOUTS) {
    score += Math.min(idea.rewardAmount / 5, 15);
  }
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
  userProfile: _userProfile,
}: {
  ideas: WallCardProps[];
  userProfile: WallUserProfile;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("for-you");

  // Bookmarks (localStorage via useSyncExternalStore to avoid SSR mismatch)
  const savedIdsRaw = useSyncExternalStore(
    (cb) => { window.addEventListener("storage", cb); return () => window.removeEventListener("storage", cb); },
    () => localStorage.getItem("wall-saved") ?? "[]",
    () => "[]"
  );
  const savedIds = useMemo(() => { try { return new Set<string>(JSON.parse(savedIdsRaw)); } catch { return new Set<string>(); } }, [savedIdsRaw]);

  const toggleSave = useCallback((id: string) => {
    const current = (() => { try { return new Set<string>(JSON.parse(localStorage.getItem("wall-saved") ?? "[]")); } catch { return new Set<string>(); } })();
    if (current.has(id)) current.delete(id); else current.add(id);
    localStorage.setItem("wall-saved", JSON.stringify([...current]));
    window.dispatchEvent(new StorageEvent("storage"));
  }, []);

  const results = useMemo(() => {
    let filtered = ideas;
    if (activeTab === "saved") filtered = filtered.filter((idea) => savedIds.has(idea.id));
    return rankByTab(filtered, activeTab);
  }, [ideas, activeTab, savedIds]);

  return (
    <div className="wall-page-bleed min-h-[100dvh] pb-12 selection:bg-brand/20 font-sans relative">

      {/* Header */}
      <div className="max-w-7xl mx-auto px-5 mb-[24px]">
        <h1 className="text-[24px] font-medium tracking-tight text-text-primary">
          The Wall
        </h1>
        <p className="text-[14px] text-text-secondary mt-[4px]">Ideas looking for honest feedback</p>
      </div>

      {/* Pane Controller (Upgraded to V2 Precision layout) */}
      <div className="sticky top-0 z-50 w-full pt-[24px] pb-[16px] px-5 pointer-events-none">
        <div className="max-w-7xl mx-auto flex items-center justify-center pointer-events-auto">
          <div className="flex bg-white overflow-hidden p-[6px] rounded-full border border-border-light/60 shadow-card-sm">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative px-[24px] py-[10px] rounded-full text-[12px] font-medium uppercase tracking-wide transition-all duration-400 ease-out flex items-center justify-center outline-none border-none cursor-pointer ${
                  activeTab === tab.key 
                    ? "text-white bg-accent shadow-[0_2px_12px_rgba(28,25,23,0.15)] bg-clip-padding" 
                    : "text-text-muted hover:text-text-primary hover:bg-bg-muted"
                }`}
              >
                <span className="relative z-10">{tab.label}</span>
                {tab.key === "saved" && savedIds.size > 0 && (
                  <span className={`relative z-10 ml-2 inline-flex items-center justify-center min-w-[20px] h-[20px] text-[10px] font-bold tracking-wider rounded-full transition-colors ${
                    activeTab === tab.key ? "bg-white/20 text-white" : "bg-black/5 text-text-muted"
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
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-[12px] md:gap-[24px] auto-rows-min">
            {results.map((idea, i) => {
              const isHighMatch = activeTab === "for-you" && i === 0;

              return (
                <div
                  key={idea.id}
                  className={`wall-card-stagger-v2 flex h-full ${
                    isHighMatch ? "col-span-2 lg:col-span-2" : "col-span-1"
                  }`}
                  style={{
                    animationDelay: `${Math.min(i, 12) * 60}ms`,
                  }}
                >
                  <WallCardTracker campaignId={idea.id}>
                    {() => (
                      <WallCardUnified
                        idea={idea}
                        isSaved={savedIds.has(idea.id)}
                        onToggleSave={toggleSave}
                        isHero={isHighMatch}
                      />
                    )}
                  </WallCardTracker>
                </div>
              );
            })}

            <div className="col-span-full pt-[40px] pb-[60px] flex flex-col items-center justify-center gap-[12px]">
              <div className="w-1.5 h-1.5 rounded-full bg-border-muted animate-pulse"></div>
              <p className="font-mono text-[11px] font-medium uppercase tracking-wide text-text-muted">EOF Reached</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-[120px] text-center px-4">
             <div className="flex flex-col items-center justify-center border border-dashed border-border-light rounded-[32px] bg-white/90 shadow-card-sm p-[64px] max-w-lg w-full">
               <span className="font-mono text-[11px] font-medium tracking-wide text-text-muted uppercase mb-4">Nothing here yet</span>
               <h3 className="text-[20px] md:text-[24px] font-medium tracking-tight text-text-primary mb-[8px]">
                 {activeTab === "saved" ? "No saved campaigns" : "No campaigns available"}
               </h3>
               <p className="text-text-secondary text-[14px] font-medium max-w-[280px]">
                 {activeTab === "saved"
                   ? "Bookmark campaigns from the feed to find them here later."
                   : "New campaigns are posted daily. Check back soon or update your interests in Settings."}
               </p>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
