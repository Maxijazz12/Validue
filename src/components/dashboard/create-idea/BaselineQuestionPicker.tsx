"use client";

import { BASELINE_QUESTIONS, type BaselineQuestion } from "@/lib/baseline-questions";
import type { DraftQuestion, BaselineCategory } from "@/lib/ai/types";

interface BaselineQuestionPickerProps {
  currentQuestionId: string;
  currentBaselines: DraftQuestion[];
  onSelect: (questionId: string, baseline: BaselineQuestion) => void;
  onClose: () => void;
}

const CATEGORY_LABELS: Record<BaselineCategory, string> = {
  interest: "Interest",
  willingness: "Willingness",
  payment: "Payment",
  behavior: "Behavior",
  pain: "Pain Intensity",
};

const CATEGORY_COLORS: Record<BaselineCategory, string> = {
  interest: "bg-[#dbeafe] text-[#1d4ed8]",
  willingness: "bg-[#dcfce7] text-[#166534]",
  payment: "bg-[#fef9c3] text-[#854d0e]",
  behavior: "bg-[#f3e8ff] text-[#7c3aed]",
  pain: "bg-[#fee2e2] text-[#991b1b]",
};

export default function BaselineQuestionPicker({
  currentQuestionId,
  currentBaselines,
  onSelect,
  onClose,
}: BaselineQuestionPickerProps) {
  // IDs and texts of baselines already in the survey (excluding the one being swapped)
  // Track by both baselineId and text to catch manually-edited baselines without IDs
  const otherBaselines = currentBaselines.filter((q) => q.id !== currentQuestionId);
  const usedBaselineIds = new Set(
    otherBaselines.filter((q) => q.baselineId).map((q) => q.baselineId)
  );
  const usedBaselineTexts = new Set(
    otherBaselines.map((q) => q.text.toLowerCase().trim())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-[16px]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] max-w-[560px] w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-[24px] pb-[16px] border-b border-[#ebebeb]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[16px] font-semibold text-[#111111]">
                Swap Baseline Question
              </h2>
              <p className="text-[13px] text-[#555555] mt-[2px]">
                Pick from the curated library. These create comparable signal
                across campaigns.
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-[32px] h-[32px] rounded-lg flex items-center justify-center text-[#999999] hover:bg-[#f5f2ed] hover:text-[#555555] transition-all cursor-pointer border-none bg-transparent"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Question list */}
        <div className="overflow-y-auto p-[24px] flex flex-col gap-[10px]">
          {BASELINE_QUESTIONS.map((bq) => {
            const isUsed = usedBaselineIds.has(bq.id) || usedBaselineTexts.has(bq.text.toLowerCase().trim());
            const isCurrent = currentBaselines.find(
              (q) => q.id === currentQuestionId
            )?.baselineId === bq.id;

            return (
              <button
                key={bq.id}
                onClick={() => {
                  if (!isUsed) {
                    onSelect(currentQuestionId, bq);
                    onClose();
                  }
                }}
                disabled={isUsed}
                className={`text-left p-[16px] rounded-xl border transition-all cursor-pointer ${
                  isCurrent
                    ? "border-[#e8b87a] bg-[#e8b87a]/5"
                    : isUsed
                      ? "border-[#ebebeb] bg-[#fafafa] opacity-40 cursor-not-allowed"
                      : "border-[#ebebeb] bg-white hover:border-[#d4d4d4] hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                }`}
              >
                <div className="flex items-center gap-[8px] mb-[6px]">
                  <span
                    className={`text-[10px] font-semibold tracking-[1px] uppercase px-[8px] py-[2px] rounded-full ${
                      CATEGORY_COLORS[bq.category]
                    }`}
                  >
                    {CATEGORY_LABELS[bq.category]}
                  </span>
                  {isCurrent && (
                    <span className="text-[10px] font-medium text-[#e8b87a]">
                      Current
                    </span>
                  )}
                  {isUsed && !isCurrent && (
                    <span className="text-[10px] text-[#999999]">
                      Already in survey
                    </span>
                  )}
                </div>
                <p className="text-[14px] text-[#111111] leading-[1.4] mb-[6px]">
                  {bq.text}
                </p>
                <div className="flex flex-wrap gap-[4px]">
                  {bq.options.map((opt) => (
                    <span
                      key={opt}
                      className="text-[11px] px-[8px] py-[2px] rounded-full border border-[#ebebeb] text-[#555555] bg-[#fafafa]"
                    >
                      {opt}
                    </span>
                  ))}
                </div>
                <p className="text-[11px] text-[#999999] mt-[6px]">
                  {bq.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
