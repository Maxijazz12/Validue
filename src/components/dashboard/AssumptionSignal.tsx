"use client";

import { useEffect, useState, useCallback } from "react";

/* ─── Types (mirrors AssumptionCoverage from assumption-evidence.ts) ─── */

interface CoverageData {
  responseCount: number;
  avgQuality: number;
  avgMatch: number;
  categoryCount: number;
  categories: string[];
  hasNegative: boolean;
  strength: "strong" | "moderate" | "thin";
}

interface Props {
  campaignId: string;
  assumptions: string[];
  initialCoverage: CoverageData[];
  /** Whether the campaign is active (controls polling) */
  isActive: boolean;
}

const POLL_INTERVAL_MS = 30_000;

/* ─── Signal strength score (deterministic, mirrors old inline logic) ─── */

function computeStrengthScore(c: CoverageData): number {
  const countScore = Math.min(c.responseCount / 8, 1) * 40;
  const catScore = Math.min(c.categoryCount / 3, 1) * 30;
  const qualScore = (c.avgQuality / 100) * 30;
  return Math.round(countScore + catScore + qualScore);
}

function strengthColor(score: number): string {
  if (score >= 60) return "#22c55e";
  if (score >= 30) return "#E5654E";
  return "#94A3B8";
}

/* ─── Component ─── */

export default function AssumptionSignal({ campaignId, assumptions, initialCoverage, isActive }: Props) {
  const [coverage, setCoverage] = useState<CoverageData[]>(initialCoverage);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchSignal = useCallback(async () => {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/signal`);
      if (!res.ok) return;
      const data: CoverageData[] = await res.json();
      setCoverage(data);
      setLastUpdated(new Date());
    } catch {
      // Silently fail — stale data is fine
    }
  }, [campaignId]);

  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(fetchSignal, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isActive, fetchSignal]);

  if (assumptions.length === 0) return null;

  return (
    <div className="bg-white border border-border-light rounded-2xl p-[32px] mb-[24px]">
      <div className="flex items-center justify-between mb-[16px]">
        <h2 className="text-[16px] font-semibold text-text-primary">
          Assumption Signal
        </h2>
        {isActive && (
          <span className="text-[10px] text-slate">
            Updated {formatTimeAgo(lastUpdated)}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-[16px]">
        {assumptions.map((a, i) => {
          const c = coverage[i];
          const hasData = c && c.responseCount > 0;
          const strength = hasData ? computeStrengthScore(c) : 0;
          const color = strengthColor(strength);

          return (
            <div key={i} className="border border-bg-muted rounded-xl p-[16px]">
              <div className="flex items-start gap-[10px] mb-[10px]">
                <span className="text-[12px] text-slate font-mono w-[20px] shrink-0 mt-[2px]">
                  {i + 1}.
                </span>
                <p className="text-[14px] text-text-primary leading-[1.5] flex-1">{a}</p>
              </div>

              {hasData ? (
                <div className="ml-[30px]">
                  {/* Strength bar */}
                  <div className="flex items-center gap-[8px] mb-[8px]">
                    <div className="flex-1 h-[4px] rounded-full bg-bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${strength}%`, backgroundColor: color }}
                      />
                    </div>
                    <span className="text-[11px] font-bold w-[24px] text-right" style={{ color }}>
                      {strength}
                    </span>
                  </div>

                  {/* Stats row */}
                  <div className="flex flex-wrap gap-x-[16px] gap-y-[4px] text-[11px] text-text-secondary">
                    <span>{c.responseCount} response{c.responseCount !== 1 ? "s" : ""}</span>
                    <span>{c.categoryCount} categor{c.categoryCount !== 1 ? "ies" : "y"}</span>
                    <span>avg quality {c.avgQuality}</span>
                    <span>avg match {c.avgMatch}</span>
                    {!c.hasNegative && c.categoryCount > 0 && (
                      <span className="text-brand">no disconfirmation</span>
                    )}
                  </div>
                </div>
              ) : (
                <p className="ml-[30px] text-[11px] text-slate">No evidence yet</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Helpers ─── */

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}
