"use client";

import { tickerFacts } from "@/lib/constants";

export default function Ticker() {
  const items = [...tickerFacts, ...tickerFacts];

  return (
    <div className="border-t border-b border-[#EDE8E3]/50 py-[14px] overflow-hidden relative bg-transparent">
      <div className="flex w-max animate-[ticker_60s_linear_infinite]">
        {items.map((fact, i) => (
          <div
            key={i}
            className="shrink-0 px-[48px] flex items-center gap-[12px] text-[13px] text-[#78716C] whitespace-nowrap"
          >
            <span className="w-[4px] h-[4px] rounded-full bg-[#D4A088]/50" />
            {fact}
          </div>
        ))}
      </div>
    </div>
  );
}
