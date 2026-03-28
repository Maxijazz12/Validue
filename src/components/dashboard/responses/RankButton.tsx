"use client";

import { useTransition, useState } from "react";
import Button from "@/components/ui/Button";
import { rankCampaignResponses } from "@/app/dashboard/ideas/[id]/responses/actions";

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

  const isRanking = isPending || rankingStatus === "ranking";

  function handleRank() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await rankCampaignResponses(campaignId);
        setResult(res);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ranking failed");
      }
    });
  }

  if (result) {
    return (
      <div className="flex items-center gap-[8px] p-[12px] rounded-xl bg-[#22c55e]/10">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span className="text-[13px] font-semibold text-[#22c55e]">
          {result.ranked} response{result.ranked !== 1 ? "s" : ""} ranked
        </span>
      </div>
    );
  }

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
          ? "Ranking responses..."
          : `Rank ${unrankedCount} Response${unrankedCount !== 1 ? "s" : ""}`}
      </Button>
      {error && (
        <p className="text-[12px] text-[#ef4444] mt-[8px]">{error}</p>
      )}
    </div>
  );
}
