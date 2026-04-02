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
      <div className="relative bg-white/60 backdrop-blur-3xl rounded-[32px] border border-white/80 shadow-[0_40px_80px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.8)] max-w-[560px] w-full max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-[32px] pb-[24px] border-b border-white/40 border-dashed">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-mono text-[14px] font-bold uppercase tracking-widest text-[#1C1917] mb-[8px]">
                [ SWAP BASELINE NODE ]
              </h2>
              <p className="font-mono text-[10px] text-[#A8A29E] uppercase tracking-wider">
                Select replacement from standardized library.
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-[32px] h-[32px] rounded-lg flex items-center justify-center text-[#94A3B8] hover:bg-[#F3F4F6] hover:text-[#64748B] transition-all cursor-pointer border-none bg-transparent"
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
                    ? "border-[#E5654E] bg-[#E5654E]/10 backdrop-blur-md shadow-[0_8px_24px_rgba(229,101,78,0.1)]"
                    : isUsed
                      ? "border-white/40 bg-white/20 opacity-50 cursor-not-allowed"
                      : "border-white/60 bg-white/40 hover:border-white/80 hover:bg-white/60 hover:shadow-[0_8px_32px_rgba(0,0,0,0.05)]"
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
                    <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-[#E5654E]">
                      {"// "}CURRENTLY BOUND
                    </span>
                  )}
                  {isUsed && !isCurrent && (
                    <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-[#A8A29E]">
                      {"// "}ACTIVE IN POOL
                    </span>
                  )}
                </div>
                <p className="text-[15px] font-medium tracking-tight text-[#1C1917] leading-[1.4] mb-[12px]">
                  {bq.text}
                </p>
                <div className="flex flex-wrap gap-[6px]">
                  {bq.options.map((opt) => (
                    <span
                      key={opt}
                      className="font-mono text-[9px] font-bold uppercase tracking-widest px-[10px] py-[4px] rounded-full border border-black/5 bg-black/5 text-[#1C1917]"
                    >
                      {opt}
                    </span>
                  ))}
                </div>
                <p className="font-mono text-[10px] text-[#A8A29E] mt-[12px]">
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
