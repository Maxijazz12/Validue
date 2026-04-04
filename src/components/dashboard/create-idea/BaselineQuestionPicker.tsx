"use client";

import { BASELINE_QUESTIONS, type BaselineQuestion } from "@/lib/baseline-questions";
import type { DraftQuestion, EvidenceCategory } from "@/lib/ai/types";

interface BaselineQuestionPickerProps {
  currentQuestionId: string;
  currentBaselines: DraftQuestion[];
  onSelect: (questionId: string, baseline: BaselineQuestion) => void;
  onClose: () => void;
}

const CATEGORY_LABELS: Record<EvidenceCategory, string> = {
  behavior: "Behavior",
  attempts: "Attempts",
  willingness: "Willingness",
  price: "Price",
  pain: "Pain Intensity",
  negative: "Disconfirmation",
};

const CATEGORY_COLORS: Record<EvidenceCategory, string> = {
  behavior: "bg-[#f3e8ff] text-[#7c3aed]",
  attempts: "bg-[#dbeafe] text-[#1d4ed8]",
  willingness: "bg-[#dcfce7] text-[#166534]",
  price: "bg-[#fef9c3] text-[#854d0e]",
  pain: "bg-[#fee2e2] text-[#991b1b]",
  negative: "bg-[#fecaca] text-[#b91c1c]",
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
      <div className="relative bg-white rounded-[32px] border border-border-light shadow-[0_24px_48px_rgba(0,0,0,0.1)] max-w-[560px] w-full max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-[32px] pb-[24px] border-b border-white/40 border-dashed">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[16px] font-medium tracking-tight text-text-primary mb-[4px]">
                Swap Baseline Question
              </h2>
              <p className="text-[13px] text-text-muted">
                Pick a replacement from the question library.
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-[32px] h-[32px] rounded-lg flex items-center justify-center text-text-muted hover:bg-bg-muted hover:text-text-secondary transition-all cursor-pointer border-none bg-transparent"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Question list */}
        <div className="overflow-y-auto p-[32px] pt-[24px] flex flex-col gap-[16px] hide-scrollbar">
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
                className={`text-left p-[20px] rounded-[20px] border transition-all duration-300 cursor-pointer shadow-sm relative overflow-hidden ${
                  isCurrent
                    ? "border-brand bg-brand/10 shadow-[0_8px_24px_rgba(229,101,78,0.1)]"
                    : isUsed
                      ? "border-white/40 bg-white/20 opacity-50 cursor-not-allowed"
                      : "border-border-light bg-white/40 hover:border-border-light hover:bg-white/60 hover:shadow-[0_8px_32px_rgba(0,0,0,0.05)]"
                }`}
              >
                <div className="flex items-center gap-[12px] mb-[12px]">
                  <span
                    className={`font-mono text-[9px] font-bold tracking-[1.5px] uppercase px-[10px] py-[4px] rounded-full shadow-sm ${
                      CATEGORY_COLORS[bq.category]
                    }`}
                  >
                    [ {CATEGORY_LABELS[bq.category]} ]
                  </span>
                  {isCurrent && (
                    <span className="font-mono text-[11px] font-medium uppercase tracking-wide text-brand">
                      {"// "}CURRENTLY BOUND
                    </span>
                  )}
                  {isUsed && !isCurrent && (
                    <span className="font-mono text-[11px] font-medium uppercase tracking-wide text-text-muted">
                      {"// "}ACTIVE IN POOL
                    </span>
                  )}
                </div>
                <p className="text-[15px] font-medium tracking-tight text-text-primary leading-[1.4] mb-[12px]">
                  {bq.text}
                </p>
                <div className="flex flex-wrap gap-[6px]">
                  {bq.options.map((opt) => (
                    <span
                      key={opt}
                      className="font-mono text-[11px] font-medium uppercase tracking-wide px-[10px] py-[4px] rounded-full border border-border-light bg-bg-muted text-text-primary"
                    >
                      {opt}
                    </span>
                  ))}
                </div>
                <p className="font-mono text-[10px] text-text-muted mt-[12px]">
                  {"// "}{bq.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
