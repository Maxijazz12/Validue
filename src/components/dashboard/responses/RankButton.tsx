"use client";

import { useTransition, useState, useRef, useEffect, useCallback } from "react";
import Button from "@/components/ui/Button";
import {
  rankCampaignResponses,
  getRankingProgress,
} from "@/app/dashboard/ideas/[id]/responses/actions";

type RankButtonProps = {
  campaignId: string;
  unrankedCount: number;
  rankingStatus: string;
};

export default function RankButton({
  campaignId,
  unrankedCount,
  rankingStatus,
}: RankButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ranked: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{
    ranked: number;
    total: number;
  } | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isRanking = isPending || rankingStatus === "ranking";

  const clearPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Clean up polling on unmount
  useEffect(() => clearPolling, [clearPolling]);

  function startPolling() {
    clearPolling();
    intervalRef.current = setInterval(async () => {
      try {
        const p = await getRankingProgress(campaignId);
        setProgress(p);
      } catch {
        // Polling failure is non-critical — ignore
      }
    }, 2000);
  }

  function handleRank() {
    setError(null);
    setProgress(null);

    // Start polling after a short delay to let the first response start scoring
    setTimeout(startPolling, 1500);

    startTransition(async () => {
      try {
        const res = await rankCampaignResponses(campaignId);
        setResult(res);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ranking failed");
      } finally {
        clearPolling();
      }
    });
  }

  if (result) {
    return (
      <div className="flex items-center gap-[8px] p-[12px] rounded-xl bg-success/10">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span className="text-[13px] font-semibold text-success">
          {result.ranked} response{result.ranked !== 1 ? "s" : ""} ranked
        </span>
      </div>
    );
  }

  const progressPct =
    progress && progress.total > 0
      ? Math.round((progress.ranked / progress.total) * 100)
      : 0;

  return (
    <div>
      <Button
        onClick={handleRank}
        disabled={isRanking || unrankedCount === 0}
        className={`px-[20px] py-[12px] text-[14px] ${
          isRanking || unrankedCount === 0 ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        {isRanking
          ? progress && progress.total > 0
            ? `Ranking ${progress.ranked} of ${progress.total}...`
            : "Ranking responses..."
          : `Rank ${unrankedCount} Response${unrankedCount !== 1 ? "s" : ""}`}
      </Button>

      {/* Progress bar */}
      {isRanking && progress && progress.total > 0 && (
        <div className="mt-[8px] h-[4px] rounded-full bg-bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-success-mid transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}

      {error && (
        <p className="text-[12px] text-error mt-[8px]">{error}</p>
      )}
    </div>
  );
}
