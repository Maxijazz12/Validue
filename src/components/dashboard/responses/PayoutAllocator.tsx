"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import Button from "@/components/ui/Button";
import {
  suggestDistribution,
  allocatePayouts,
  type PayoutSuggestion,
  type PayoutAllocation,
} from "@/app/dashboard/ideas/[id]/responses/payout-actions";

type PayoutAllocatorProps = {
  campaignId: string;
  rewardAmount: number;
  distributableAmount: number;
  payoutStatus: string;
  rankedCount: number;
  onScrollToResponse?: (responseId: string) => void;
};

type AllocationMode = "ai" | "manual" | "topn";

export default function PayoutAllocator({
  campaignId,
  rewardAmount,
  distributableAmount,
  payoutStatus,
  rankedCount,
  onScrollToResponse,
}: PayoutAllocatorProps) {
  const [mode, setMode] = useState<AllocationMode>("ai");
  const [suggestions, setSuggestions] = useState<PayoutSuggestion[]>([]);
  const [manualAmounts, setManualAmounts] = useState<Map<string, number>>(
    new Map()
  );
  const [topN, setTopN] = useState(3);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    count: number;
  } | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // Load AI suggestions on mount
  useEffect(() => {
    suggestDistribution(campaignId)
      .then((result) => {
        setSuggestions(result.suggestions);
        // Initialize manual amounts from suggestions
        const initial = new Map<string, number>();
        result.suggestions.forEach((s) =>
          initial.set(s.responseId, s.suggestedAmount)
        );
        setManualAmounts(initial);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load")
      )
      .finally(() => setIsLoading(false));
  }, [campaignId]);

  const getAllocations = useCallback((): PayoutAllocation[] => {
    if (mode === "ai") {
      return suggestions.map((s) => ({
        responseId: s.responseId,
        amount: s.suggestedAmount,
      }));
    }

    if (mode === "manual") {
      return Array.from(manualAmounts.entries())
        .filter(([, amount]) => amount > 0)
        .map(([responseId, amount]) => ({ responseId, amount }));
    }

    // Top N mode
    return suggestions.slice(0, topN).map((s) => {
      const weight = Math.pow(s.qualityScore, 2);
      const topSuggestions = suggestions.slice(0, topN);
      const totalWeight = topSuggestions.reduce(
        (sum, t) => sum + Math.pow(t.qualityScore, 2),
        0
      );
      return {
        responseId: s.responseId,
        amount:
          totalWeight > 0
            ? Math.round(((weight / totalWeight) * distributableAmount) * 100) /
              100
            : 0,
      };
    });
  }, [mode, suggestions, manualAmounts, topN, distributableAmount]);

  const totalAllocated = getAllocations().reduce(
    (sum, a) => sum + a.amount,
    0
  );
  const remaining = distributableAmount - totalAllocated;

  function handleConfirm() {
    setError(null);
    setShowConfirm(false);
    startTransition(async () => {
      try {
        const result = await allocatePayouts(campaignId, getAllocations());
        setSuccess(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Allocation failed");
      }
    });
  }

  function handleDistributeRemaining() {
    const nonZero = [...manualAmounts.entries()].filter(([, v]) => v > 0);
    if (nonZero.length === 0 || remaining <= 0.01) return;
    const total = nonZero.reduce((s, [, v]) => s + v, 0);
    const next = new Map(manualAmounts);
    for (const [id, amt] of nonZero) {
      next.set(
        id,
        Math.round((amt + (amt / total) * remaining) * 100) / 100
      );
    }
    setManualAmounts(next);
  }

  if (payoutStatus === "allocated" || success) {
    return (
      <div className="bg-[#22c55e]/5 border border-[#22c55e]/20 rounded-2xl p-[24px]">
        <div className="flex items-center gap-[8px] mb-[8px]">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#22c55e"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <h3 className="text-[16px] font-semibold text-[#111111]">
            Payouts Allocated
          </h3>
        </div>
        <p className="text-[13px] text-[#64748B]">
          {success
            ? `${success.count} respondent${success.count !== 1 ? "s" : ""} will receive payouts.`
            : "Payouts have been allocated for this campaign."}
          {" "}Respondents can see their earnings in their dashboard.
        </p>
      </div>
    );
  }

  if (rewardAmount <= 0) return null;
  if (rankedCount === 0) return null;

  const recipientCount = getAllocations().filter((a) => a.amount >= 0.5).length;

  return (
    <div className="bg-white border border-[#E5654E]/30 rounded-2xl p-[24px] relative">
      <h3 className="text-[16px] font-semibold text-[#111111] mb-[4px]">
        Allocate Rewards
      </h3>
      <p className="text-[13px] text-[#64748B] mb-[16px]">
        Distribute ${distributableAmount.toFixed(2)} among your best
        respondents.
        <span className="text-[#94A3B8]">
          {" "}(${rewardAmount.toFixed(2)} pool minus 15% platform fee)
        </span>
      </p>

      {/* Mode tabs */}
      <div className="flex gap-[4px] mb-[20px] p-[4px] rounded-lg bg-[#F3F4F6]">
        {(
          [
            { key: "ai", label: "AI Recommended" },
            { key: "manual", label: "Manual" },
            { key: "topn", label: "Top N" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setMode(tab.key)}
            className={`flex-1 text-[12px] font-semibold py-[8px] px-[12px] rounded-md transition-all cursor-pointer border-none ${
              mode === tab.key
                ? "bg-white text-[#111111] shadow-sm"
                : "bg-transparent text-[#64748B] hover:text-[#111111]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center py-[24px]">
          <div className="flex gap-[4px] justify-center">
            <span className="w-[5px] h-[5px] bg-[#CBD5E1]/50 rounded-full animate-[loadDot_1.4s_ease_infinite]" />
            <span className="w-[5px] h-[5px] bg-[#CBD5E1]/50 rounded-full animate-[loadDot_1.4s_ease_infinite] [animation-delay:0.2s]" />
            <span className="w-[5px] h-[5px] bg-[#CBD5E1]/50 rounded-full animate-[loadDot_1.4s_ease_infinite] [animation-delay:0.4s]" />
          </div>
          <p className="text-[12px] text-[#94A3B8] mt-[8px]">Calculating distribution</p>
        </div>
      ) : (
        <>
          {/* Top N slider */}
          {mode === "topn" && (
            <div className="mb-[16px]">
              <label className="text-[13px] font-medium text-[#64748B] block mb-[6px]">
                Reward top {topN} response{topN !== 1 ? "s" : ""}
              </label>
              <input
                type="range"
                min={1}
                max={Math.min(suggestions.length, 10)}
                value={topN}
                onChange={(e) => setTopN(Number(e.target.value))}
                className="w-full accent-[#111111]"
              />
            </div>
          )}

          {/* Allocation list */}
          <div className="flex flex-col gap-[8px] mb-[16px] max-h-[320px] overflow-y-auto">
            {suggestions.map((s, i) => {
              const currentAllocation = getAllocations().find(
                (a) => a.responseId === s.responseId
              );
              const amount = currentAllocation?.amount ?? 0;
              const isIncluded = amount > 0;
              const isLowConf =
                s.scoringSource === "fallback" ||
                s.scoringSource === "ai_low_confidence" ||
                s.scoringConfidence < 0.5;

              return (
                <div
                  key={s.responseId}
                  className={`flex items-center gap-[12px] p-[12px] rounded-xl border transition-all ${
                    isIncluded
                      ? "border-[#22c55e]/20 bg-[#22c55e]/3"
                      : "border-[#E2E8F0] bg-white opacity-60"
                  }`}
                >
                  <span className="text-[12px] font-bold text-[#64748B] w-[24px] shrink-0">
                    #{i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    {onScrollToResponse ? (
                      <button
                        type="button"
                        onClick={() => onScrollToResponse(s.responseId)}
                        className="text-[13px] font-medium text-[#111111] hover:text-[#E5654E] underline-offset-2 hover:underline truncate text-left block max-w-full cursor-pointer bg-transparent border-none p-0"
                      >
                        {s.respondentName}
                      </button>
                    ) : (
                      <span className="text-[13px] font-medium text-[#111111] block truncate">
                        {s.respondentName}
                      </span>
                    )}
                    <span className="text-[11px] text-[#94A3B8] flex items-center gap-[4px]">
                      Score: {s.qualityScore}
                      {isLowConf && (
                        <span className="text-[10px] px-[5px] py-[0.5px] rounded-full bg-[#FEF3C7] text-[#92400E] font-medium">
                          {s.scoringSource === "fallback" ? "Heuristic" : "Low conf"}
                        </span>
                      )}
                    </span>
                  </div>

                  {mode === "manual" ? (
                    <div className="relative w-[90px] shrink-0">
                      <span className="absolute left-[8px] top-1/2 -translate-y-1/2 text-[12px] text-[#94A3B8]">
                        $
                      </span>
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        value={manualAmounts.get(s.responseId) ?? 0}
                        onChange={(e) => {
                          const next = new Map(manualAmounts);
                          next.set(
                            s.responseId,
                            Math.max(0, Number(e.target.value))
                          );
                          setManualAmounts(next);
                        }}
                        className="w-full pl-[22px] pr-[8px] py-[6px] rounded-lg border border-[#E2E8F0] text-[13px] font-mono text-right outline-none focus:border-[#CBD5E1] focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)]"
                      />
                    </div>
                  ) : (
                    <span
                      className={`text-[14px] font-mono font-semibold shrink-0 ${
                        isIncluded ? "text-[#22c55e]" : "text-[#94A3B8]"
                      }`}
                    >
                      ${amount.toFixed(2)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Totals */}
          <div className="flex items-center justify-between p-[12px] rounded-xl bg-[#F3F4F6] mb-[16px]">
            <span className="text-[13px] text-[#64748B]">Total allocated</span>
            <div className="text-right">
              <span
                className={`text-[16px] font-mono font-bold ${
                  remaining < -0.01 ? "text-[#ef4444]" : "text-[#111111]"
                }`}
              >
                ${totalAllocated.toFixed(2)}
              </span>
              <span className="text-[12px] text-[#94A3B8] ml-[4px]">
                / ${distributableAmount.toFixed(2)}
              </span>
              {remaining > 0.01 && (
                <span className="block text-[11px] text-[#E5654E]">
                  ${remaining.toFixed(2)} unallocated
                </span>
              )}
            </div>
          </div>

          {/* Distribute remaining (manual mode only) */}
          {mode === "manual" && remaining > 0.01 && (
            <div className="mb-[16px]">
              <button
                type="button"
                onClick={handleDistributeRemaining}
                className="text-[12px] text-[#E5654E] font-medium cursor-pointer bg-transparent border-none p-0 hover:underline"
              >
                Distribute remaining ${remaining.toFixed(2)}
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="text-[12px] text-[#ef4444] mb-[12px] p-[10px] rounded-xl bg-[#ef4444]/5">
              {error}
            </div>
          )}

          {/* Confirm button or confirmation panel */}
          {showConfirm ? (
            <div className="border border-[#E5654E]/20 rounded-xl p-[16px] bg-[#FFF7ED]">
              <h4 className="text-[14px] font-semibold text-[#111111] mb-[8px]">
                Confirm Payout Allocation
              </h4>
              <div className="text-[13px] text-[#64748B] mb-[12px] space-y-[4px]">
                <p>
                  <span className="font-mono font-semibold text-[#111111]">
                    ${totalAllocated.toFixed(2)}
                  </span>{" "}
                  to{" "}
                  <span className="font-semibold text-[#111111]">
                    {recipientCount} respondent{recipientCount !== 1 ? "s" : ""}
                  </span>
                </p>
                {/* Top 3 preview */}
                <div className="text-[12px] text-[#94A3B8] pl-[8px] border-l-2 border-[#E2E8F0]">
                  {getAllocations()
                    .filter((a) => a.amount >= 0.5)
                    .slice(0, 3)
                    .map((a) => {
                      const s = suggestions.find(
                        (sg) => sg.responseId === a.responseId
                      );
                      return (
                        <div key={a.responseId}>
                          {s?.respondentName || "Anonymous"} — ${a.amount.toFixed(2)}
                        </div>
                      );
                    })}
                  {recipientCount > 3 && (
                    <div>+{recipientCount - 3} more</div>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-[#E5654E] mb-[12px]">
                This action is irreversible. Respondents will be notified.
              </p>
              <div className="flex gap-[8px]">
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 py-[10px] text-[13px] font-semibold text-[#64748B] bg-white border border-[#E2E8F0] rounded-lg cursor-pointer hover:bg-[#F9FAFB] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={isPending}
                  className={`flex-1 py-[10px] text-[13px] font-semibold text-white bg-[#E5654E] rounded-lg cursor-pointer hover:bg-[#D4544D] transition-colors border-none ${
                    isPending ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {isPending ? "Allocating..." : `Yes, Allocate $${totalAllocated.toFixed(2)}`}
                </button>
              </div>
            </div>
          ) : (
            <Button
              onClick={() => setShowConfirm(true)}
              disabled={isPending || totalAllocated <= 0 || remaining < -0.01}
              className={`w-full py-[14px] text-[15px] ${
                isPending || totalAllocated <= 0 || remaining < -0.01
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }`}
            >
              {isPending
                ? "Allocating..."
                : `Confirm Payouts (${recipientCount} recipients)`}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
