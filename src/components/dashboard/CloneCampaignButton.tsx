"use client";

import { useTransition, useState } from "react";
import { cloneCampaign } from "@/app/dashboard/ideas/[id]/campaign-actions";

type CloneCampaignButtonProps = {
  campaignId: string;
};

export default function CloneCampaignButton({ campaignId }: CloneCampaignButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClone() {
    setError(null);
    startTransition(async () => {
      const result = await cloneCampaign(campaignId);
      if (result && "error" in result) {
        setError(result.error);
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClone}
        disabled={isPending}
        className={`inline-flex items-center gap-[6px] px-[16px] py-[10px] rounded-xl text-[13px] font-semibold border border-border-light text-text-secondary bg-white hover:bg-bg-muted hover:border-border-muted hover:text-text-primary transition-all duration-200 cursor-pointer ${
          isPending ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
        {isPending ? "Duplicating..." : "Duplicate"}
      </button>
      {error && (
        <p className="text-[12px] text-error mt-[6px]">{error}</p>
      )}
    </div>
  );
}
