"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { ReciprocalQuestion } from "@/app/dashboard/ideas/new/reciprocal-actions";
import { saveReciprocalAnswer } from "@/app/dashboard/ideas/new/reciprocal-actions";

type ReciprocateStepProps = {
  questions: ReciprocalQuestion[];
  onComplete: () => void;
};

const MIN_OPEN_CHARS = 30;

export default function ReciprocateStep({
  questions,
  onComplete,
}: ReciprocateStepProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const startTimeRef = useRef(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const question = questions[currentIndex];
  const isLast = currentIndex === questions.length - 1;
  const isOpen = question?.type === "open";

  // Reset timer + open text when question changes
  const [openText, setOpenText] = useState("");
  const lastResetIndex = useRef(-1);
  useEffect(() => {
    if (lastResetIndex.current !== currentIndex) {
      lastResetIndex.current = currentIndex;
      startTimeRef.current = performance.now();
    }
  }, [currentIndex]);

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.max(el.scrollHeight, 100) + "px";
  }, [openText]);

  const saveAndAdvance = useCallback(
    async (answerText: string) => {
      if (!question || saving) return;

      setSaving(true);
      const timeSpentMs = Math.round(performance.now() - startTimeRef.current);

      const result = await saveReciprocalAnswer(
        question.campaignId,
        question.id,
        answerText,
        { timeSpentMs }
      );

      setSaving(false);

      if (!result.success) {
        // Silent fail — don't block the create flow
        console.warn("[reciprocate] save failed:", result.error);
      }

      if (isLast) {
        onComplete();
      } else {
        setCurrentIndex((i) => i + 1);
        setOpenText("");
      }
    },
    [question, saving, isLast, onComplete]
  );

  const handleMcqSelect = useCallback(
    (option: string) => {
      saveAndAdvance(option);
    },
    [saveAndAdvance]
  );

  const handleOpenSubmit = useCallback(() => {
    if (openText.trim().length >= MIN_OPEN_CHARS) {
      saveAndAdvance(openText.trim());
    }
  }, [openText, saveAndAdvance]);

  if (!question) {
    onComplete();
    return null;
  }

  // Parse options safely
  const safeOptions: string[] = Array.isArray(question.options)
    ? question.options
    : typeof question.options === "string"
      ? (() => {
          try {
            return JSON.parse(question.options as string);
          } catch {
            return [];
          }
        })()
      : [];

  return (
    <div className="max-w-[720px] mx-auto">
      {/* Header */}
      <div className="mb-[32px]">
        <h1 className="text-[28px] font-bold text-[#111111] tracking-[-0.03em]">
          While we prepare your draft...
        </h1>
        <p className="text-[15px] text-[#64748B] mt-[4px]">
          Help test a few assumptions from other founders. Quick answers only.
        </p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-[8px] mb-[24px]">
        {questions.map((_, i) => (
          <div
            key={i}
            className={`h-[3px] flex-1 rounded-full transition-all duration-300 ${
              i < currentIndex
                ? "bg-[#22C55E]"
                : i === currentIndex
                  ? "bg-[#E5654E]"
                  : "bg-[#E2E8F0]"
            }`}
          />
        ))}
      </div>

      {/* Question card */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-[32px] relative">
        {/* Accent line */}
        <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl bg-gradient-to-r from-[#E5654E] to-[#E5654E]/30" />

        {/* Campaign context */}
        <div className="flex items-center gap-[8px] mb-[16px]">
          <span className="text-[11px] font-medium tracking-[0.08em] uppercase text-[#94A3B8]">
            {question.campaignTitle}
          </span>
          <span className="text-[11px] text-[#CBD5E1]">
            {currentIndex + 1} of {questions.length}
          </span>
        </div>

        {/* Question text */}
        <p className="text-[17px] leading-[1.6] text-[#111111] mb-[24px]">
          {question.text}
        </p>

        {/* Answer area */}
        {isOpen ? (
          <div>
            <textarea
              ref={textareaRef}
              value={openText}
              onChange={(e) => setOpenText(e.target.value)}
              placeholder="Share your honest take..."
              className="w-full min-h-[100px] px-[16px] py-[14px] rounded-xl border border-[#E2E8F0] bg-white text-[14px] text-[#111111] leading-[1.6] resize-none outline-none focus:border-[#CBD5E1] focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] transition-all duration-200 placeholder:text-[#94A3B8]"
            />
            <div className="flex items-center justify-between mt-[10px]">
              <span className="text-[12px] text-[#94A3B8]">
                {openText.trim().length < MIN_OPEN_CHARS
                  ? `${MIN_OPEN_CHARS - openText.trim().length} more characters`
                  : `${openText.trim().length} characters`}
              </span>
              <button
                onClick={handleOpenSubmit}
                disabled={openText.trim().length < MIN_OPEN_CHARS || saving}
                className="px-[20px] py-[10px] rounded-xl text-[14px] font-medium bg-[#111111] text-white hover:bg-[#1a1a1a] hover:shadow-[0_4px_20px_rgba(232,193,176,0.15),0_1px_4px_rgba(232,193,176,0.08)] hover:-translate-y-[1px] transition-all duration-200 cursor-pointer border-none disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:translate-y-0 disabled:hover:bg-[#111111]"
              >
                {saving ? "Saving..." : isLast ? "Done" : "Next"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-[8px]">
            {safeOptions.map((option: string) => (
              <button
                key={option}
                type="button"
                onClick={() => handleMcqSelect(option)}
                disabled={saving}
                className="w-full text-left px-[16px] py-[14px] rounded-xl border border-[#E2E8F0] bg-white text-[14px] text-[#111111] transition-all duration-200 cursor-pointer hover:border-[#CBD5E1] hover:bg-[#FCFCFD] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {option}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Skip link */}
      <div className="text-center mt-[16px]">
        <button
          onClick={onComplete}
          className="text-[12px] text-[#CBD5E1] hover:text-[#94A3B8] transition-colors bg-transparent border-none cursor-pointer"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
