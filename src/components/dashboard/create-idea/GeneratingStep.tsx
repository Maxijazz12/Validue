"use client";

import { useState, useEffect, useCallback } from "react";
import { startupQuotes } from "@/lib/constants";

const PROGRESS_STAGES = [
  "Reading your idea…",
  "Crafting questions for your audience…",
  "Building audience profile…",
  "Making sure every question earns its place…",
  "Polishing the final details…",
];

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

  useEffect(() => {
    const interval = setInterval(() => {
      setStageIndex((prev) => Math.min(prev + 1, PROGRESS_STAGES.length - 1));
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

  return (
    <div
      className={`flex flex-col items-center justify-center min-h-[60vh] transition-opacity duration-500 ${
        mounted ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Progress bar */}
      <div className="w-full max-w-[400px] h-[3px] rounded-full bg-[#F3F4F6] overflow-hidden mb-[48px]">
        <div
          className="h-full rounded-full bg-[#E5654E] animate-[indeterminate_1.5s_ease-in-out_infinite]"
          style={{ width: "40%" }}
        />
      </div>

      {/* Heading */}
      <div className="flex items-center gap-[10px] mb-[40px]">
        <span className="flex gap-[4px]">
          <span className="w-[6px] h-[6px] rounded-full bg-[#E5654E] animate-[loadDot_1.4s_ease_infinite]" />
          <span className="w-[6px] h-[6px] rounded-full bg-[#E5654E] animate-[loadDot_1.4s_ease_infinite] [animation-delay:0.2s]" />
          <span className="w-[6px] h-[6px] rounded-full bg-[#E5654E] animate-[loadDot_1.4s_ease_infinite] [animation-delay:0.4s]" />
        </span>
        <span className="text-[15px] font-medium text-[#64748B]">
          {PROGRESS_STAGES[stageIndex]}
        </span>
      </div>

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
