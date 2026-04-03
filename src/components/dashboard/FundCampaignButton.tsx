"use client";

import { useState } from "react";
import { createFundingSession } from "@/app/dashboard/ideas/new/payment-actions";
import { updateCampaignFunding } from "@/app/dashboard/ideas/[id]/funding-actions";

export default function FundCampaignButton({
  campaignId,
  rewardAmount,
  label,
}: {
  campaignId: string;
  rewardAmount: number;
  label?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState(rewardAmount > 0 ? String(rewardAmount) : "");

  const needsAmount = rewardAmount <= 0;

  async function handleFund() {
    setLoading(true);
    setError(null);

    try {
      // If no reward amount set, update it first
      if (needsAmount) {
        const parsed = parseFloat(amount);
        if (!amount || isNaN(parsed) || parsed <= 0) {
          setError("Enter a valid reward amount.");
          setLoading(false);
          return;
        }

        const updateResult = await updateCampaignFunding(campaignId, parsed);
        if ("error" in updateResult) {
          setError(updateResult.error);
          setLoading(false);
          return;
        }
      }

      // Now create the Stripe checkout session
      const result = await createFundingSession(campaignId);
      if ("error" in result) {
        setError(result.error);
        setLoading(false);
        return;
      }
      window.location.href = result.url;
    } catch {
      setError("Payment couldn't be started. Check your connection and try again.");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-[6px]">
      <div className="flex items-center gap-[8px]">
        {needsAmount && (
          <div className="relative">
            <span className="absolute left-[10px] top-1/2 -translate-y-1/2 text-[14px] text-slate">
              $
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Min 5"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={loading}
              className="w-[100px] pl-[22px] pr-[8px] py-[9px] text-[14px] rounded-xl border border-border-light bg-white text-text-primary outline-none focus:border-border-muted focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] transition-all duration-200 disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
        )}
        <button
          onClick={handleFund}
          disabled={loading}
          className="px-[20px] py-[10px] rounded-xl bg-accent text-white text-[14px] font-medium hover:bg-accent hover:shadow-card-hover hover:-translate-y-[1px] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 cursor-pointer"
        >
          {loading
            ? "Redirecting to payment..."
            : label ?? (needsAmount
                ? "Set & Pay"
                : `Pay & Go Live — $${rewardAmount.toFixed(2)}`)}
        </button>
      </div>
      <span className="text-[11px] text-slate">Secure payment via Stripe</span>
      {error && (
        <span className="text-[12px] text-red-500">{error}</span>
      )}
    </div>
  );
}
