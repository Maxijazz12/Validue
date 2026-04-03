"use client";

import { useState } from "react";
import { calculateReach } from "@/lib/reach";
import type { PlanTier } from "@/lib/plans";

const tiers: { label: string; tier: PlanTier; featured: boolean }[] = [
  { label: "Free", tier: "free", featured: false },
  { label: "Pro", tier: "pro", featured: true },
];

const amounts = [10, 25, 50, 100];

function roundToNearest5(n: number): number {
  return Math.round(n / 5) * 5 || 5;
}

export default function PricingCalculator() {
  const [selectedAmount, setSelectedAmount] = useState(25);

  const results = tiers.map(({ label, tier, featured }) => {
    const est = calculateReach(tier, selectedAmount, { qualityScore: 70 });
    return {
      label,
      featured,
      responses: roundToNearest5(est.estimatedResponsesLow),
    };
  });

  const maxResponses = Math.max(...results.map((r) => r.responses));

  return (
    <div className="mt-[48px]">
      <div className="bg-white/60 backdrop-blur-3xl rounded-[24px] border border-white/80 shadow-card p-[40px] max-md:p-[28px_20px]">
        {/* Header */}
        <div className="text-center mb-[32px]">
          <h3 className="font-mono text-[14px] font-bold uppercase tracking-widest text-[#1C1917] mb-[8px]">
            [ TEST_BUDGET: ${selectedAmount} ]
          </h3>
          <p className="text-[13px] text-[#A8A29E] tracking-tight">
            See how each plan turns the same budget into more validated signal.
          </p>
        </div>

        {/* Amount selector */}
        <div className="flex items-center justify-center mb-[40px]">
          <div className="inline-flex bg-black/5 rounded-full p-[4px]">
            {amounts.map((amount) => (
              <button
                key={amount}
                onClick={() => setSelectedAmount(amount)}
                className={`px-[24px] py-[8px] rounded-full font-mono text-[11px] font-bold uppercase tracking-widest transition-all duration-300 cursor-pointer ${
                  selectedAmount === amount
                    ? "bg-white text-[#1C1917] shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
                    : "text-[#A8A29E] hover:text-[#1C1917]"
                }`}
              >
                ${amount}
              </button>
            ))}
          </div>
        </div>

        {/* Comparison bars */}
        <div className="flex flex-col gap-[16px] max-w-[560px] mx-auto">
          {results.map((result) => {
            const widthPercent = (result.responses / maxResponses) * 100;

            return (
              <div key={result.label} className="flex items-center gap-[16px] h-[24px]">
                {/* Tier label */}
                <span className={`font-mono text-[10px] uppercase tracking-widest w-[72px] shrink-0 text-right ${
                  result.featured
                    ? "font-bold text-[#1C1917]"
                    : "font-medium text-[#A8A29E]"
                }`}>
                  {result.label}
                </span>

                {/* Bar track */}
                <div className="flex-1 h-[4px] rounded-full bg-black/5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ease-out ${
                      result.featured ? "bg-[#1C1917]" : "bg-black/20"
                    }`}
                    style={{
                      width: `${widthPercent}%`,
                    }}
                  />
                </div>

                {/* Response count */}
                <span className={`font-mono text-[10px] uppercase tracking-widest shrink-0 w-[110px] text-right ${
                  result.featured ? "font-bold text-[#1C1917]" : "text-[#A8A29E]"
                }`}>
                  {result.responses} RESPONSES
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
