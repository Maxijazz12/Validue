"use client";

import { useState, useEffect, useCallback } from "react";
import { startupQuotes } from "@/lib/constants";

const PROGRESS_STAGES = [
  { label: "Reading your idea", icon: "read" },
  { label: "Crafting questions", icon: "questions" },
  { label: "Building audience profile", icon: "audience" },
  { label: "Quality check", icon: "quality" },
  { label: "Final polish", icon: "polish" },
] as const;

export default function GeneratingStep() {
  const [factIndex, setFactIndex] = useState(() =>
    Math.floor(Math.random() * startupQuotes.length)
  );
  const [fading, setFading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);

  // Advance through first 3 stages on a timer, then hold on "Quality check"
  // until the actual API response arrives (parent unmounts this component).
  // This avoids showing "Final polish" before the API has responded.
  useEffect(() => {
    const interval = setInterval(() => {
      setStageIndex((prev) => {
        if (prev >= 3) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const showNext = useCallback(() => {
    setFading(true);
    setTimeout(() => {
      setFactIndex((prev) => {
        let next;
        do {
          next = Math.floor(Math.random() * startupQuotes.length);
        } while (next === prev && startupQuotes.length > 1);
        return next;
      });
      setFading(false);
    }, 300);
  }, []);

  useEffect(() => {
    const interval = setInterval(showNext, 5000);
    return () => clearInterval(interval);
  }, [showNext]);

  const quote = startupQuotes[factIndex];
  const progressPercent = ((stageIndex + 1) / PROGRESS_STAGES.length) * 100;

  return (
    <div
      className={`flex flex-col items-center justify-center min-h-[60vh] transition-opacity duration-500 ${
        mounted ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Stage stepper */}
      <div className="w-full max-w-[480px] mb-[40px]">
        <div className="flex items-center justify-between mb-[12px]">
          {PROGRESS_STAGES.map((stage, i) => {
            const isComplete = i < stageIndex;
            const isCurrent = i === stageIndex;
            return (
              <div key={i} className="flex flex-col items-center gap-[6px] flex-1">
                <div
                  className={`w-[28px] h-[28px] rounded-full flex items-center justify-center transition-all duration-300 ${
                    isComplete
                      ? "bg-[#22C55E] text-white"
                      : isCurrent
                        ? "bg-[#E5654E] text-white animate-[stepPulse_2s_ease_infinite]"
                        : "bg-[#F3F4F6] text-[#CBD5E1]"
                  }`}
                >
                  {isComplete ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <span className="text-[11px] font-bold">{i + 1}</span>
                  )}
                </div>
                <span className={`text-[10px] font-medium text-center leading-tight transition-colors duration-200 ${
                  isComplete ? "text-[#22C55E]" : isCurrent ? "text-[#111111]" : "text-[#CBD5E1]"
                }`}>
                  {stage.label}
                </span>
              </div>
            );
          })}
        </div>
        {/* Progress bar */}
        <div className="h-[3px] rounded-full bg-[#F3F4F6] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#E5654E] to-[#E8C1B0] transition-all duration-1000 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Skeleton card preview */}
      <div className="w-full max-w-[400px] mb-[40px] rounded-2xl border border-[#E2E8F0] p-[20px] bg-white">
        {/* Title skeleton */}
        <div className={`h-[16px] rounded-md mb-[8px] transition-all duration-500 ${
          stageIndex >= 0 ? "bg-[#111111]/10 w-[70%]" : "bg-[#F3F4F6] w-[70%]"
        }`} />
        {/* Description skeleton */}
        <div className={`h-[12px] rounded-md mb-[4px] transition-all duration-500 delay-100 ${
          stageIndex >= 1 ? "bg-[#94A3B8]/15 w-full" : "bg-[#F3F4F6] w-full"
        }`} />
        <div className={`h-[12px] rounded-md mb-[12px] transition-all duration-500 delay-200 ${
          stageIndex >= 1 ? "bg-[#94A3B8]/15 w-[60%]" : "bg-[#F3F4F6] w-[60%]"
        }`} />
        {/* Question skeletons */}
        <div className="flex flex-col gap-[6px] mb-[12px] pt-[12px] border-t border-[#F1F5F9]">
          {[0, 1, 2].map((qi) => (
            <div key={qi} className={`h-[10px] rounded-md transition-all duration-500 ${
              stageIndex >= 2 ? "bg-[#E5654E]/10" : "bg-[#F3F4F6]"
            }`} style={{ width: `${80 - qi * 15}%`, transitionDelay: `${qi * 150}ms` }} />
          ))}
        </div>
        {/* Tags skeleton */}
        <div className="flex gap-[6px]">
          {[0, 1].map((ti) => (
            <div key={ti} className={`h-[20px] rounded-full transition-all duration-500 ${
              stageIndex >= 3 ? "bg-[#E8C1B0]/15" : "bg-[#F3F4F6]"
            }`} style={{ width: `${60 + ti * 20}px`, transitionDelay: `${ti * 100}ms` }} />
          ))}
        </div>
      </div>

      {/* Time estimate */}
      {stageIndex >= 3 && (
        <p className="text-[12px] text-[#94A3B8] mb-[24px]">
          Almost there — this usually takes 10-15 seconds
        </p>
      )}

      {/* Fact card */}
      <div className="w-full max-w-[520px] text-center relative">
        <div className="absolute top-0 left-[20%] right-[20%] h-[3px] rounded-full bg-gradient-to-r from-[#E5654E] to-[#E5654E]/30" />
        <div className="text-[11px] text-[#94A3B8] tracking-[2px] uppercase mb-[20px] mt-[16px] font-medium">
          Did You Know?
        </div>

        <div
          className={`text-[17px] leading-[1.8] text-[#111111] min-h-[60px] transition-opacity duration-300 ${
            fading ? "opacity-0" : "opacity-100"
          }`}
        >
          {quote.text}
        </div>
        <div
          className={`text-[12px] text-[#94A3B8] mt-[14px] tracking-[0.5px] transition-opacity duration-300 ${
            fading ? "opacity-0" : "opacity-100"
          }`}
        >
          {quote.source}
        </div>

        <button
          onClick={showNext}
          type="button"
          className="mt-[24px] bg-transparent border border-[#E2E8F0] text-[#94A3B8] text-[12px] px-[20px] py-[8px] rounded-lg cursor-pointer tracking-[0.5px] transition-all duration-200 hover:border-[#CBD5E1] hover:text-[#64748B] hover:bg-[#FCFCFD] font-medium"
        >
          Next fact
        </button>
      </div>
    </div>
  );
}
