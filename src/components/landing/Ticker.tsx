"use client";

import { tickerFacts } from "@/lib/constants";

export default function Ticker() {
  const items = [...tickerFacts, ...tickerFacts];

  return (
    <div className="border-t border-b border-[#ebebeb] py-[14px] overflow-hidden relative -mx-[64px] max-md:-mx-[24px] bg-[#fafafa]">
      <div className="flex w-max animate-[ticker_60s_linear_infinite]">
        {items.map((fact, i) => (
          <div
            key={i}
            className="shrink-0 px-[48px] flex items-center gap-[12px] text-[13px] text-[#555555] whitespace-nowrap"
          >
            <span className="w-[4px] h-[4px] rounded-full bg-[#d4d4d4]" />
            {fact}
          </div>
        ))}
      </div>
    </div>
  );
}
