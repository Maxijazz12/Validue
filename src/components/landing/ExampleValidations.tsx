"use client";

import { useState } from "react";
import SectionHeader from "@/components/ui/SectionHeader";
import ScrollReveal from "@/components/ui/ScrollReveal";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import { exampleValidations } from "@/lib/constants";

type Validation = (typeof exampleValidations)[number];

const verdictColor = {
  CONFIRMED: { bg: "bg-[#22c55e]/10", text: "text-[#22c55e]", dot: "bg-[#22c55e]" },
  CHALLENGED: { bg: "bg-[#f59e0b]/10", text: "text-[#f59e0b]", dot: "bg-[#f59e0b]" },
  REFUTED: { bg: "bg-[#ef4444]/10", text: "text-[#ef4444]", dot: "bg-[#ef4444]" },
  INSUFFICIENT_DATA: { bg: "bg-[#3b82f6]/10", text: "text-[#3b82f6]", dot: "bg-[#3b82f6]" },
} as const;

const recommendationStyle = {
  PROCEED: { bg: "bg-[#22c55e]/10", text: "text-[#22c55e]", label: "PROCEED" },
  PIVOT: { bg: "bg-[#f59e0b]/10", text: "text-[#f59e0b]", label: "PIVOT" },
  PAUSE: { bg: "bg-[#ef4444]/10", text: "text-[#ef4444]", label: "PAUSE" },
} as const;

function BriefCard({ validation }: { validation: Validation }) {
  const rec = recommendationStyle[validation.recommendation];

  return (
    <div className="bg-white/60 backdrop-blur-3xl rounded-[24px] p-[28px] shadow-card border border-white/80 transition-all duration-500 hover:shadow-[0_16px_48px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,1)] relative overflow-hidden">
      {/* Top accent line */}
      <div className="absolute top-0 left-[15%] right-[15%] h-[1px] bg-gradient-to-r from-transparent via-[#E5654E]/30 to-transparent" />

      {/* Header: category + title + founder */}
      <div className="flex items-start justify-between gap-[12px] mb-[20px]">
        <div className="min-w-0">
          <span className="font-mono text-[9px] font-bold uppercase tracking-widest px-[8px] py-[4px] rounded-md bg-[#1C1917] text-white inline-block mb-[10px]">
            [{validation.category}]
          </span>
          <h3 className="text-[17px] font-semibold text-[#1C1917] tracking-tight leading-[1.3]">
            {validation.title}
          </h3>
        </div>
      </div>

      {/* Recommendation badge + response count */}
      <div className="flex items-center gap-[12px] mb-[20px]">
        <span className={`font-mono text-[10px] font-bold uppercase tracking-widest px-[10px] py-[5px] rounded-md ${rec.bg} ${rec.text}`}>
          [ {rec.label} ]
        </span>
        <span className={`font-mono text-[10px] font-bold uppercase tracking-widest px-[10px] py-[5px] rounded-md bg-black/5 text-[#A8A29E]`}>
          {validation.confidence} CONFIDENCE
        </span>
        <div className="flex items-center gap-[6px] ml-auto">
          <Avatar name={validation.founder} size={16} />
          <span className="text-[12px] text-[#A8A29E]">{validation.founder}</span>
        </div>
      </div>

      {/* Signal summary */}
      <p className="text-[13px] text-[#78716C] leading-[1.7] mb-[20px]">
        {validation.signalSummary}
      </p>

      {/* Uncomfortable truth */}
      <div className="bg-[#FBF6F3] border border-[#E8C1B0]/30 rounded-[12px] p-[16px] mb-[20px]">
        <div className="font-mono text-[9px] font-bold uppercase tracking-widest text-[#E5654E] mb-[8px]">
          [ UNCOMFORTABLE_TRUTH ]
        </div>
        <p className="text-[13px] text-[#1C1917] leading-[1.6] italic">
          {validation.uncomfortableTruth}
        </p>
      </div>

      {/* Assumption verdicts */}
      <div className="flex flex-col gap-[12px] mb-[20px]">
        {validation.assumptions.map((a) => {
          const vc = verdictColor[a.verdict];
          return (
            <div
              key={a.assumption}
              className="border border-black/5 rounded-[12px] p-[14px] bg-white/50"
            >
              <div className="flex items-center justify-between gap-[8px] mb-[8px]">
                <span className="text-[13px] font-medium text-[#1C1917] leading-[1.4] flex-1">
                  {a.assumption}
                </span>
                <span className={`shrink-0 font-mono text-[9px] font-bold uppercase tracking-widest px-[8px] py-[3px] rounded-md ${vc.bg} ${vc.text} flex items-center gap-[5px]`}>
                  <span className={`w-[5px] h-[5px] rounded-full ${vc.dot}`} />
                  {a.verdict}
                </span>
              </div>
              <div className="flex items-center gap-[12px] mb-[8px]">
                {/* Evidence bar */}
                <div className="flex-1 h-[4px] rounded-full bg-[#EDE8E3] overflow-hidden flex">
                  <div
                    className="h-full bg-[#22c55e] rounded-l-full"
                    style={{ width: `${(a.supporting / (a.supporting + a.contradicting)) * 100}%` }}
                  />
                  <div
                    className="h-full bg-[#ef4444] rounded-r-full"
                    style={{ width: `${(a.contradicting / (a.supporting + a.contradicting)) * 100}%` }}
                  />
                </div>
                <span className="font-mono text-[10px] text-[#A8A29E] shrink-0">
                  {a.supporting}/{a.supporting + a.contradicting}
                </span>
              </div>
              <p className="text-[12px] text-[#78716C] leading-[1.5] italic">
                &ldquo;{a.quote}&rdquo;
              </p>
            </div>
          );
        })}
      </div>

      {/* Next step */}
      <div className="border-t border-black/5 pt-[16px]">
        <div className="font-mono text-[9px] font-bold uppercase tracking-widest text-[#A8A29E] mb-[8px]">
          [ CHEAPEST_NEXT_TEST ]
        </div>
        <p className="text-[13px] text-[#1C1917] leading-[1.6]">
          {validation.nextStep}
        </p>
      </div>

      {/* Response count footer */}
      <div className="flex items-center justify-between mt-[16px] pt-[12px] border-t border-black/5">
        <span className="font-mono text-[10px] text-[#A8A29E] tracking-widest">
          {validation.responses} RESPONSES SYNTHESIZED
        </span>
        <span className="font-mono text-[10px] text-[#A8A29E] tracking-widest">
          ${validation.funded} FUNDED
        </span>
      </div>
    </div>
  );
}

export default function ExampleValidations() {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = exampleValidations[activeIndex];

  return (
    <section id="examples">
      <SectionHeader
        label="EXAMPLE_BRIEFS"
        title="See what you get"
        subtitle="Real Decision Briefs from validated ideas. Every campaign ends with a clear recommendation, evidence-backed verdicts, and a next step."
      />

      {/* Tab selector */}
      <div className="flex items-center justify-center gap-[8px] mt-[48px] mb-[40px] flex-wrap">
        {exampleValidations.map((v, i) => {
          const rec = recommendationStyle[v.recommendation];
          const isActive = i === activeIndex;
          return (
            <button
              key={v.id}
              onClick={() => setActiveIndex(i)}
              className={`flex items-center gap-[8px] px-[16px] py-[10px] rounded-[12px] transition-all duration-300 border text-left ${
                isActive
                  ? "bg-white shadow-card border-black/10"
                  : "bg-transparent border-transparent hover:bg-white/50 hover:border-black/5"
              }`}
            >
              <span className={`w-[6px] h-[6px] rounded-full shrink-0 ${isActive ? rec.text.replace("text-", "bg-") : "bg-[#A8A29E]"}`} />
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-[#1C1917] truncate max-w-[200px]">
                  {v.title.length > 30 ? v.title.slice(0, 30) + "..." : v.title}
                </div>
                <div className={`font-mono text-[9px] font-bold uppercase tracking-widest ${isActive ? rec.text : "text-[#A8A29E]"}`}>
                  {rec.label}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active brief */}
      <ScrollReveal key={active.id} animation="scale">
        <div className="max-w-[680px] mx-auto">
          <BriefCard validation={active} />
        </div>
      </ScrollReveal>

      {/* CTA */}
      <div className="flex items-center justify-center mt-[40px]">
        <Button variant="primary" href="/auth/signup">
          Get Your Own Brief
        </Button>
      </div>
    </section>
  );
}
