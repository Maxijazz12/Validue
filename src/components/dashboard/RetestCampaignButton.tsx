"use client";

import { useTransition, useState } from "react";
import { retestCampaign } from "@/app/dashboard/ideas/[id]/campaign-actions";

type RetestCampaignButtonProps = {
  campaignId: string;
};

export default function RetestCampaignButton({ campaignId }: RetestCampaignButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleRetest() {
    setError(null);
    startTransition(async () => {
      const result = await retestCampaign(campaignId);
      if (result && "error" in result) {
        setError(result.error);
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleRetest}
        disabled={isPending}
        className={`inline-flex items-center gap-[6px] px-[16px] py-[10px] rounded-xl text-[13px] font-semibold border border-[#3b82f6]/20 text-[#3b82f6] bg-[#3b82f6]/5 hover:bg-[#3b82f6]/10 hover:border-[#3b82f6]/30 transition-all duration-200 cursor-pointer ${
          isPending ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 4 23 10 17 10" />
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
        </svg>
        {isPending ? "Creating retest..." : "Retest"}
      </button>
      {error && (
        <p className="text-[12px] text-[#ef4444] mt-[6px]">{error}</p>
      )}
    </div>
  );
}
