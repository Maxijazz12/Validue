"use client";

import { useState } from "react";
import { calculateReach } from "@/lib/reach";
import type { PlanTier } from "@/lib/plans";

const tiers: { label: string; tier: PlanTier; featured: boolean }[] = [
  { label: "Free", tier: "free", featured: false },
  { label: "Starter", tier: "starter", featured: false },
  { label: "Pro", tier: "pro", featured: true },
  { label: "Scale", tier: "scale", featured: false },
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
    <div className="mt-[32px]">
      <div className="bg-white rounded-2xl border border-[#EDE8E3] shadow-[0_2px_8px_rgba(180,140,110,0.07),0_1px_2px_rgba(0,0,0,0.03)] p-[40px] max-md:p-[28px_20px]">
        {/* Header */}
        <div className="text-center mb-[28px]">
          <h3 className="text-[18px] font-semibold text-[#1C1917] mb-[6px]">
            See what ${selectedAmount} gets you
          </h3>
          <p className="text-[13px] text-[#78716C]">
            Higher plans get more responses from the same budget.
          </p>
        </div>

        {/* Amount selector */}
        <div className="flex items-center justify-center mb-[32px]">
          <div className="inline-flex bg-[#F0EBE6] rounded-xl p-[3px]">
            {amounts.map((amount) => (
              <button
                key={amount}
                onClick={() => setSelectedAmount(amount)}
                className={`px-[20px] py-[8px] rounded-[10px] text-[13px] font-semibold transition-all duration-200 cursor-pointer ${
                  selectedAmount === amount
                    ? "bg-white text-[#1C1917] shadow-[0_1px_4px_rgba(180,140,110,0.12)]"
                    : "text-[#78716C] hover:text-[#1C1917]"
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
              <div key={result.label} className="flex items-center gap-[16px]">
                {/* Tier label */}
                <span className={`text-[13px] w-[56px] shrink-0 ${
                  result.featured
                    ? "font-semibold text-[#1C1917]"
                    : "font-medium text-[#78716C]"
                }`}>
                  {result.label}
                </span>

                {/* Bar track */}
                <div className="flex-1 h-[6px] rounded-full bg-[#EDE8E3] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${widthPercent}%`,
                      background: result.featured
                        ? "linear-gradient(90deg, #C4856E, #D4A088)"
                        : "#D6CFC7",
                    }}
                  />
                </div>

                {/* Response count */}
                <span className={`font-mono text-[13px] font-semibold shrink-0 w-[110px] text-right ${
                  result.featured ? "text-gradient-warm" : "text-[#1C1917]"
                }`}>
                  ~{result.responses} responses
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
