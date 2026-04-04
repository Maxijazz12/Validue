"use client";

import { useState } from "react";
import ScrollReveal from "@/components/ui/ScrollReveal";
import Avatar from "@/components/ui/Avatar";
import { exampleValidations } from "@/lib/constants";

type Validation = (typeof exampleValidations)[number];

const recStyle = {
  PROCEED: { bg: "bg-green-50", text: "text-green-600", dot: "bg-green-500" },
  PIVOT: { bg: "bg-amber-50", text: "text-amber-600", dot: "bg-amber-500" },
  PAUSE: { bg: "bg-red-50", text: "text-red-600", dot: "bg-red-500" },
} as const;

const verdictStyle = {
  CONFIRMED: { text: "text-green-600", dot: "bg-green-500" },
  CHALLENGED: { text: "text-amber-600", dot: "bg-amber-500" },
  REFUTED: { text: "text-red-600", dot: "bg-red-500" },
  INSUFFICIENT_DATA: { text: "text-blue-600", dot: "bg-blue-500" },
} as const;

function BriefCard({ validation }: { validation: Validation }) {
  const rec = recStyle[validation.recommendation];

  return (
    <div className="bg-white rounded-2xl p-8 max-md:p-6 border border-border-light shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <span className="inline-block text-[12px] font-medium text-text-muted bg-bg-muted px-2.5 py-1 rounded-md mb-3">
            {validation.category}
          </span>
          <h3 className="text-[18px] font-semibold text-text-primary tracking-tight">
            {validation.title}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Avatar name={validation.founder} size={24} />
          <span className="text-[13px] text-text-muted">{validation.founder}</span>
        </div>
      </div>

      {/* Recommendation + confidence */}
      <div className="flex items-center gap-3 mb-6">
        <span className={`inline-flex items-center gap-1.5 text-[13px] font-semibold px-3 py-1.5 rounded-full ${rec.bg} ${rec.text}`}>
          <span className={`w-2 h-2 rounded-full ${rec.dot}`} />
          {validation.recommendation}
        </span>
        <span className="text-[13px] text-text-muted">
          {validation.confidence} confidence
        </span>
      </div>

      {/* Signal summary */}
      <p className="text-[14px] text-text-secondary leading-[1.7] mb-6">
        {validation.signalSummary}
      </p>

      {/* Uncomfortable truth */}
      <div className="bg-accent-warm-light border border-accent-warm/15 rounded-xl p-5 mb-6">
        <div className="text-[12px] font-semibold text-brand mb-2">Uncomfortable truth</div>
        <p className="text-[14px] text-text-primary leading-[1.6] italic">
          {validation.uncomfortableTruth}
        </p>
      </div>

      {/* Assumption verdicts */}
      <div className="flex flex-col gap-3 mb-6">
        {validation.assumptions.map((a) => {
          const vc = verdictStyle[a.verdict];
          return (
            <div key={a.assumption} className="border border-border-light rounded-xl p-4">
              <div className="flex items-center justify-between gap-3 mb-2">
                <span className="text-[14px] font-medium text-text-primary leading-[1.4] flex-1">
                  {a.assumption}
                </span>
                <span className={`shrink-0 inline-flex items-center gap-1.5 text-[12px] font-semibold ${vc.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${vc.dot}`} />
                  {a.verdict.replace("_", " ")}
                </span>
              </div>
              {/* Evidence bar */}
              <div className="flex items-center gap-3 mb-2">
                <div className="flex-1 h-1 rounded-full bg-border-light overflow-hidden flex">
                  <div className="h-full bg-green-400 rounded-l-full" style={{ width: `${(a.supporting / (a.supporting + a.contradicting)) * 100}%` }} />
                  <div className="h-full bg-red-400 rounded-r-full" style={{ width: `${(a.contradicting / (a.supporting + a.contradicting)) * 100}%` }} />
                </div>
                <span className="text-[12px] text-text-muted shrink-0">
                  {a.supporting}/{a.supporting + a.contradicting}
                </span>
              </div>
              <p className="text-[13px] text-text-muted leading-[1.5] italic">
                &ldquo;{a.quote}&rdquo;
              </p>
            </div>
          );
        })}
      </div>

      {/* Next step */}
      <div className="border-t border-border-light pt-5">
        <div className="text-[12px] font-semibold text-text-muted mb-2">Cheapest next test</div>
        <p className="text-[14px] text-text-primary leading-[1.6]">{validation.nextStep}</p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-5 pt-4 border-t border-border-light text-[13px] text-text-muted">
        <span>{validation.responses} responses</span>
        <span>${validation.funded} funded</span>
      </div>
    </div>
  );
}

export default function ExampleValidations() {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = exampleValidations[activeIndex];

  return (
    <section id="examples">
      <div className="text-center mb-16">
        <p className="text-brand text-[14px] font-medium mb-4">Example briefs</p>
        <h2 className="text-[clamp(28px,4vw,42px)] font-bold tracking-[-0.02em] leading-[1.1] text-text-primary">
          See what you get
        </h2>
        <p className="mt-5 text-[17px] text-text-secondary max-w-[500px] mx-auto leading-[1.7]">
          Real Decision Briefs from validated ideas. Every campaign ends with a clear recommendation.
        </p>
      </div>

      {/* Tab selector */}
      <div className="flex items-center justify-center gap-2 mb-10 flex-wrap">
        {exampleValidations.map((v, i) => {
          const rec = recStyle[v.recommendation];
          const isActive = i === activeIndex;
          return (
            <button
              key={v.id}
              onClick={() => setActiveIndex(i)}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-full transition-all duration-300 border text-left cursor-pointer ${
                isActive
                  ? "bg-white shadow-sm border-border-light"
                  : "bg-transparent border-transparent hover:bg-bg-muted"
              }`}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${isActive ? rec.dot : "bg-text-muted/30"}`} />
              <span className="text-[14px] font-medium text-text-primary">
                {v.title.length > 25 ? v.title.slice(0, 25) + "..." : v.title}
              </span>
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

      <div className="flex items-center justify-center mt-10">
        <a
          href="/auth/signup"
          className="inline-flex items-center px-7 py-3 rounded-full text-[15px] font-medium text-white bg-text-primary hover:bg-text-primary/90 transition-all no-underline shadow-sm hover:shadow-md"
        >
          Get your own brief
        </a>
      </div>
    </section>
  );
}
