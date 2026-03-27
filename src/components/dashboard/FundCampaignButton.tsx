"use client";

import { useState } from "react";
import { createFundingSession } from "@/app/dashboard/ideas/new/payment-actions";

export default function FundCampaignButton({
  campaignId,
}: {
  campaignId: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFund() {
    setLoading(true);
    setError(null);

    try {
      const result = await createFundingSession(campaignId);
      if ("error" in result) {
        setError(result.error);
        setLoading(false);
        return;
      }
      window.location.href = result.url;
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-[4px]">
      <button
        onClick={handleFund}
        disabled={loading}
        className="px-[20px] py-[10px] rounded-lg bg-[#f59e0b] text-white text-[14px] font-semibold hover:bg-[#d97706] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
      >
        {loading ? "Redirecting..." : "Fund Campaign"}
      </button>
      {error && (
        <span className="text-[12px] text-red-500">{error}</span>
      )}
    </div>
  );
}
