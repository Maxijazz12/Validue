"use client";

import { useState, useEffect } from "react";
import Skeleton from "@/components/ui/Skeleton";

const STEPS = [
  { label: "LOADING_CAMPAIGN", desc: "Reading campaign context and assumptions" },
  { label: "GATHERING_EVIDENCE", desc: "Extracting quotes and signals per assumption" },
  { label: "SCORING_RESPONSES", desc: "Evaluating response quality and consistency" },
  { label: "DETECTING_PATTERNS", desc: "Finding agreement clusters and contradictions" },
  { label: "CALLING_SYNTHESIS", desc: "AI is generating your Decision Brief" },
  { label: "GROUNDING_CHECK", desc: "Validating recommendations against evidence" },
  { label: "RENDERING_BRIEF", desc: "Assembling your final report" },
];

// Approximate timing: steps appear progressively over ~12s
const STEP_DELAYS = [0, 800, 2000, 3500, 5500, 9000, 11000];

export default function BriefLoading() {
  const [visibleSteps, setVisibleSteps] = useState(0);

  useEffect(() => {
    const timers = STEP_DELAYS.map((delay, i) =>
      setTimeout(() => setVisibleSteps(i + 1), delay)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <article className="max-w-[720px] mx-auto px-4 py-12 pb-24">
      {/* Header */}
      <div className="mb-10">
        <div className="font-mono text-[10px] uppercase tracking-widest text-text-secondary mb-4">
          {"// "}SYNTHESIS_ENGINE
        </div>
        <h1 className="text-[24px] font-medium tracking-tight text-text-primary mb-2">
          Generating Decision Brief
        </h1>
        <p className="text-[14px] text-text-secondary">
          Analyzing responses and synthesizing insights...
        </p>
      </div>

      {/* Build log */}
      <div className="rounded-2xl border border-border-light bg-[#1C1917] p-[24px] mb-8 font-mono text-[12px] overflow-hidden">
        <div className="flex flex-col gap-[8px]">
          {STEPS.map((step, i) => {
            const isVisible = i < visibleSteps;
            const isActive = i === visibleSteps - 1;
            const isComplete = i < visibleSteps - 1;

            return (
              <div
                key={step.label}
                className={`flex items-start gap-[10px] transition-all duration-500 ${
                  isVisible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-[8px] h-0 overflow-hidden"
                }`}
              >
                {/* Status indicator */}
                <span className="shrink-0 w-[16px] mt-[2px]">
                  {isComplete ? (
                    <span className="text-[#34D399]">&#10003;</span>
                  ) : isActive ? (
                    <span className="inline-block w-[6px] h-[6px] rounded-full bg-[#E5654E] animate-pulse mt-[4px]" />
                  ) : null}
                </span>

                {/* Step text */}
                <div className="min-w-0">
                  <span
                    className={`uppercase tracking-widest text-[10px] font-bold ${
                      isComplete
                        ? "text-white/40"
                        : isActive
                        ? "text-white"
                        : "text-white/20"
                    }`}
                  >
                    [{step.label}]
                  </span>
                  <span
                    className={`ml-[8px] tracking-wide text-[11px] ${
                      isComplete
                        ? "text-white/30"
                        : isActive
                        ? "text-white/60"
                        : "text-white/15"
                    }`}
                  >
                    {step.desc}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Blinking cursor */}
        <div className="mt-[12px] ml-[26px]">
          <span className="inline-block w-[8px] h-[14px] bg-[#E5654E]/60 animate-pulse" />
        </div>
      </div>

      {/* Skeleton preview of what's coming */}
      <div className="opacity-30">
        {/* Recommendation */}
        <div className="rounded-2xl border border-border-light bg-white p-[32px] mb-8 text-center">
          <Skeleton className="h-[12px] w-[120px] mx-auto mb-4" />
          <Skeleton className="h-[48px] w-[200px] mx-auto mb-3" />
          <Skeleton className="h-[14px] w-[160px] mx-auto mb-2" />
          <Skeleton className="h-[14px] w-[400px] mx-auto" />
        </div>

        {/* Verdicts */}
        <div className="mb-8">
          <Skeleton className="h-[12px] w-[160px] mb-4" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl border border-border-light bg-white p-[24px]">
                <div className="flex items-center justify-between mb-3">
                  <Skeleton className="h-[16px] w-[70%]" />
                  <Skeleton className="h-[24px] w-[90px] rounded-full" />
                </div>
                <Skeleton className="h-[14px] w-full mb-2" />
                <Skeleton className="h-[14px] w-[80%]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}
