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
      <div className="text-[13px] tracking-[2px] uppercase text-[#999999] font-medium mb-[48px]">
        While You Wait
      </div>
      <div className="max-w-[600px] mx-auto p-[48px_40px] bg-white border border-[#ebebeb] rounded-xl relative overflow-hidden">
        <div className="text-[11px] text-[#999999] tracking-[2px] uppercase mb-[8px] font-medium">
          Did You Know?
        </div>

        <div className="flex gap-[4px] justify-center mb-[28px]">
          <span className="w-[5px] h-[5px] bg-[#e8b87a] rounded-full animate-[loadDot_1.4s_ease_infinite]" />
          <span className="w-[5px] h-[5px] bg-[#e8b87a] rounded-full animate-[loadDot_1.4s_ease_infinite] [animation-delay:0.2s]" />
          <span className="w-[5px] h-[5px] bg-[#e8b87a] rounded-full animate-[loadDot_1.4s_ease_infinite] [animation-delay:0.4s]" />
        </div>

        <div
          className={`text-[17px] leading-[1.7] text-[#111111] min-h-[54px] transition-opacity duration-400 ${
            fading ? "opacity-0" : "opacity-100"
          }`}
        >
          {quote.text}
        </div>
        <div
          className={`text-[12px] text-[#999999] mt-[16px] tracking-[0.5px] transition-opacity duration-400 ${
            fading ? "opacity-0" : "opacity-100"
          }`}
        >
          {quote.source}
        </div>

        <button
          onClick={showNext}
          className="mt-[24px] bg-transparent border border-[#ebebeb] text-[#999999] text-[12px] px-[20px] py-[8px] rounded-lg cursor-pointer tracking-[0.5px] transition-all duration-200 hover:border-[#d4d4d4] hover:text-[#555555] hover:bg-[#fafafa] font-medium"
        >
          Next fact
        </button>
      </div>
    </section>
  );
}
