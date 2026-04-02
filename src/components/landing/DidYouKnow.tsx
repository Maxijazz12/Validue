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
      <div className="font-mono text-[10px] font-bold tracking-widest uppercase mb-[48px]">
        <span className="text-[#A8A29E]">{"// "}</span><span className="text-[#E5654E]">DID YOU KNOW?</span>
      </div>
      <div className="max-w-[600px] mx-auto p-[48px_40px] bg-white/80 backdrop-blur-3xl shadow-[0_4px_24px_rgba(229,101,78,0.06),inset_0_1px_0_rgba(255,255,255,0.8)] border border-white/80 rounded-[24px] relative overflow-hidden group hover:shadow-[0_16px_48px_rgba(229,101,78,0.1),inset_0_1px_0_rgba(255,255,255,1)] transition-all duration-500">
        <div className="font-mono text-[10px] font-bold tracking-widest uppercase mb-[16px] text-[#A8A29E]">
          [ STARTUP LORE ]
        </div>

        <div className="flex gap-[4px] justify-center mb-[28px]">
          <span className="w-[4px] h-[4px] bg-[#1C1917] rounded-full animate-[loadDot_1.4s_ease_infinite]" />
          <span className="w-[4px] h-[4px] bg-[#1C1917]/60 rounded-full animate-[loadDot_1.4s_ease_infinite] [animation-delay:0.2s]" />
          <span className="w-[4px] h-[4px] bg-[#1C1917]/30 rounded-full animate-[loadDot_1.4s_ease_infinite] [animation-delay:0.4s]" />
        </div>

        <div
          className={`font-mono text-[13px] leading-[1.8] text-[#1C1917] font-medium min-h-[54px] transition-opacity duration-400 ${
            fading ? "opacity-0" : "opacity-100"
          }`}
        >
          &gt; {quote.text}
        </div>
        <div
          className={`font-mono text-[10px] text-[#A8A29E] mt-[16px] uppercase tracking-widest transition-opacity duration-400 ${
            fading ? "opacity-0" : "opacity-100"
          }`}
        >
          {"// "}{quote.source}
        </div>

        <button
          onClick={showNext}
          className="mt-[32px] bg-transparent border border-black/10 text-[#1C1917] font-mono font-bold uppercase tracking-[1px] text-[10px] px-[20px] py-[8px] rounded-full cursor-pointer transition-all duration-300 hover:border-[#1C1917] hover:bg-black/5"
        >
          [ NEXT FACT ]
        </button>
      </div>
      <p className="font-mono text-[11px] uppercase tracking-widest text-[#A8A29E] mt-[32px]">
        EVERY MAJOR PRODUCT STARTED AS AN UNPROVEN IDEA. <span className="text-[#1C1917] font-bold">VALIDUE</span> CONFIRMS INTEGRITY.
      </p>
    </section>
  );
}
