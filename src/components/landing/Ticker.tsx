"use client";

import { tickerFacts } from "@/lib/constants";

export default function Ticker() {
  const items = [...tickerFacts, ...tickerFacts];

  return (
    <div className="border-t border-b border-border-light/50 py-4 overflow-hidden">
      <div className="flex w-max animate-[ticker_60s_linear_infinite]">
        {items.map((fact, i) => (
          <div
            key={i}
            className="shrink-0 px-10 flex items-center gap-3 text-[14px] text-text-muted whitespace-nowrap"
          >
            <span className="w-1 h-1 rounded-full bg-brand/40" />
            {fact}
          </div>
        ))}
      </div>
    </div>
  );
}
