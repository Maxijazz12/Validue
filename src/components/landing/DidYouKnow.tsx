"use client";

import { useState, useEffect, useCallback } from "react";
import { startupQuotes } from "@/lib/constants";

export default function DidYouKnow() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fading, setFading] = useState(false);

  const showNext = useCallback(() => {
    setFading(true);
    setTimeout(() => {
      setCurrentIndex((prev) => {
        let next;
        do {
          next = Math.floor(Math.random() * startupQuotes.length);
        } while (next === prev && startupQuotes.length > 1);
        return next;
      });
      setFading(false);
    }, 400);
  }, []);

  useEffect(() => {
    const interval = setInterval(showNext, 8000);
    return () => clearInterval(interval);
  }, [showNext]);

  const quote = startupQuotes[currentIndex];

  return (
    <section className="text-center relative">
      <div className="text-[12px] tracking-[0.06em] uppercase font-medium mb-[48px]">
        <span className="text-[#94A3B8]">{"// "}</span><span className="text-gradient-warm">While You Wait</span>
      </div>
      <div className="max-w-[600px] mx-auto p-[48px_40px] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] border border-[#E2E8F0] rounded-2xl relative overflow-hidden">
        <div className="text-[12px] tracking-[0.06em] uppercase mb-[8px] font-medium text-[#94A3B8]">
          Did You Know?
        </div>

        <div className="flex gap-[4px] justify-center mb-[28px]">
          <span className="w-[5px] h-[5px] bg-[#CBD5E1]/50 rounded-full animate-[loadDot_1.4s_ease_infinite]" />
          <span className="w-[5px] h-[5px] bg-[#CBD5E1]/50 rounded-full animate-[loadDot_1.4s_ease_infinite] [animation-delay:0.2s]" />
          <span className="w-[5px] h-[5px] bg-[#CBD5E1]/50 rounded-full animate-[loadDot_1.4s_ease_infinite] [animation-delay:0.4s]" />
        </div>

        <div
          className={`text-[17px] leading-[1.7] text-[#111111] min-h-[54px] transition-opacity duration-400 ${
            fading ? "opacity-0" : "opacity-100"
          }`}
        >
          {quote.text}
        </div>
        <div
          className={`text-[12px] text-[#94A3B8] mt-[16px] tracking-[0.5px] transition-opacity duration-400 ${
            fading ? "opacity-0" : "opacity-100"
          }`}
        >
          {quote.source}
        </div>

        <button
          onClick={showNext}
          className="mt-[24px] bg-transparent border border-[#E2E8F0] text-[#94A3B8] text-[12px] px-[20px] py-[8px] rounded-xl cursor-pointer tracking-[0.5px] transition-all duration-200 hover:border-[#CBD5E1] hover:text-[#111111] font-medium"
        >
          Next fact
        </button>
      </div>
      <p className="text-[14px] text-[#94A3B8] mt-[24px]">
        Every great company started as an unproven idea. <span className="font-semibold">Validue</span> helps you prove yours.
      </p>
    </section>
  );
}
