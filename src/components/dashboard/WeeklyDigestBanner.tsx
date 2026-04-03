"use client";

import { useState, useSyncExternalStore } from "react";

export type WeeklyDigest = {
  responsesThisWeek: number;
  earnedThisWeek: number;
  qualityDelta: number; // + or - compared to previous week
  percentile: number; // 0-100, respondent ranking
};

const noop = () => () => {};

function getWasDismissed() {
  const lastDismissed = localStorage.getItem("weekly-digest-dismissed");
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return !!(lastDismissed && Number(lastDismissed) >= oneWeekAgo);
}

export default function WeeklyDigestBanner({ digest }: { digest: WeeklyDigest }) {
  const wasDismissedOnLoad = useSyncExternalStore(noop, getWasDismissed, () => true);
  const [dismissed, setDismissed] = useState(wasDismissedOnLoad);

  if (dismissed) return null;
  if (digest.responsesThisWeek === 0 && digest.earnedThisWeek === 0) return null;

  function handleDismiss() {
    setDismissed(true);
    localStorage.setItem("weekly-digest-dismissed", String(Date.now()));
  }

  const shareText = `This week on Validue: ${digest.responsesThisWeek} responses, $${digest.earnedThisWeek.toFixed(0)} earned. Top ${digest.percentile}% of respondents! 🚀`;

  return (
    <div
      className="flex items-center gap-[14px] p-[14px_18px] rounded-xl border border-border-light mb-[12px] bg-bg-card bg-gradient-to-r from-[#4F7BE8]/5 to-transparent relative overflow-hidden"
      style={{ borderLeftWidth: 3, borderLeftColor: "#4F7BE8", animation: "slideInFromTop 0.4s ease-out" }}
    >
      {/* Icon */}
      <div className="w-[36px] h-[36px] rounded-full bg-[#4F7BE8]/10 flex items-center justify-center shrink-0">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4F7BE8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
        </svg>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-text-primary">
          Your week in review
        </p>
        <p className="text-[12px] text-text-secondary mt-[2px]">
          <span className="font-mono font-semibold text-text-primary">{digest.responsesThisWeek}</span> response{digest.responsesThisWeek !== 1 ? "s" : ""}
          {digest.earnedThisWeek > 0 && (
            <>, <span className="font-mono font-semibold text-success">${digest.earnedThisWeek.toFixed(0)}</span> earned</>
          )}
          {digest.qualityDelta !== 0 && (
            <>, quality score <span className={digest.qualityDelta > 0 ? "text-success" : "text-error"}>{digest.qualityDelta > 0 ? "+" : ""}{digest.qualityDelta}</span></>
          )}
          {digest.percentile > 0 && digest.percentile <= 50 && (
            <>. You&apos;re in the <span className="font-semibold text-[#4F7BE8]">top {digest.percentile}%</span> of respondents</>
          )}
        </p>
      </div>

      {/* Share button */}
      <button
        onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, "_blank")}
        className="shrink-0 text-[11px] font-medium text-[#4F7BE8] hover:text-[#3B6BD9] bg-[#4F7BE8]/8 hover:bg-[#4F7BE8]/12 px-[10px] py-[5px] rounded-lg border-none cursor-pointer transition-all"
      >
        Share
      </button>

      {/* Dismiss */}
      <button
        onClick={handleDismiss}
        className="text-slate hover:text-text-secondary bg-transparent border-none cursor-pointer p-[4px] transition-colors shrink-0"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
