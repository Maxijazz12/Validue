"use client";

import { useMemo } from "react";
import type { CampaignDraft } from "@/lib/ai/types";
import { computeSignalStrength } from "@/lib/ai/signal-strength";

interface SignalStrengthMeterProps {
  draft: CampaignDraft;
}

function DimensionBar({
  label,
  score,
}: {
  label: string;
  score: number;
}) {
  let color: string;
  if (score >= 70) color = "#22c55e";
  else if (score >= 40) color = "#E5654E";
  else color = "#ef4444";

  return (
    <div className="flex items-center gap-[8px]">
      <span className="text-[11px] text-[#64748B] w-[90px] shrink-0">{label}</span>
      <div className="flex-1 h-[4px] rounded-full bg-[#F3F4F6] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${score}%`, background: color }}
        />
      </div>
      <span className="text-[10px] font-semibold w-[24px] text-right" style={{ color }}>
        {score}
      </span>
    </div>
  );
}

export default function SignalStrengthMeter({ draft }: SignalStrengthMeterProps) {
  const result = useMemo(() => computeSignalStrength(draft), [draft]);

  const MAX_WARNINGS = 5;
  const MAX_INFOS = 3;
  const allWarnings = result.tips.filter((t) => t.type === "warning");
  const allInfos = result.tips.filter((t) => t.type === "info");
  const warnings = allWarnings.slice(0, MAX_WARNINGS);
  const infos = allInfos.slice(0, MAX_INFOS);
  const successes = result.tips.filter((t) => t.type === "success");
  const hiddenCount = (allWarnings.length - warnings.length) + (allInfos.length - infos.length);

  return (
    <div className="bg-white border border-[#E5654E]/30 rounded-xl p-[20px]">
      <h3 className="text-[14px] font-semibold text-[#111111] mb-[16px]">
        Survey Strength
      </h3>

      {/* Overall score bar */}
      <div className="mb-[16px]">
        <div className="flex items-center justify-between mb-[6px]">
          <span className="text-[12px] text-[#64748B]">Overall</span>
          <div className="flex items-center gap-[6px]">
            <span
              className="w-[6px] h-[6px] rounded-full"
              style={{ background: result.color }}
            />
            <span
              className="text-[13px] font-semibold"
              style={{ color: result.color }}
            >
              {result.score}/100 — {result.label}
            </span>
          </div>
        </div>
        <div className="h-[6px] rounded-full bg-[#F3F4F6] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${result.score}%`,
              background: result.color,
            }}
          />
        </div>
      </div>

      {/* Dimension breakdown */}
      {result.dimensions && (
        <div className="flex flex-col gap-[6px] mb-[16px]">
          <span className="text-[10px] font-semibold tracking-[1.5px] uppercase text-[#94A3B8] mb-[2px]">
            Breakdown
          </span>
          <DimensionBar label="Audience" score={result.dimensions.audienceClarity} />
          <DimensionBar label="Questions" score={result.dimensions.questionQuality} />
          <DimensionBar label="Behavioral" score={result.dimensions.behavioralCoverage} />
          <DimensionBar label="Monetization" score={result.dimensions.monetizationCoverage} />
        </div>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-[8px] mb-[16px]">
        <div className="flex items-center gap-[6px]">
          <span className="text-[11px] text-[#64748B]">Questions</span>
          <span className="text-[11px] font-semibold text-[#111111]">
            {draft.questions.length}
          </span>
        </div>
        <div className="flex items-center gap-[6px]">
          <span className="text-[11px] text-[#64748B]">Assumptions</span>
          <span className="text-[11px] font-semibold text-[#111111]">
            {draft.assumptions.length}
          </span>
        </div>
        <div className="flex items-center gap-[6px]">
          <span className="text-[11px] text-[#64748B]">Open-ended</span>
          <span className="text-[11px] font-semibold text-[#111111]">
            {draft.questions.filter((q) => q.type === "open").length}
          </span>
        </div>
        <div className="flex items-center gap-[6px]">
          <span className="text-[11px] text-[#64748B]">Quant</span>
          <span className="text-[11px] font-semibold text-[#111111]">
            {draft.questions.filter((q) => q.type === "multiple_choice").length}
          </span>
        </div>
      </div>

      {/* Coaching tips */}
      <div className="border-t border-[#E2E8F0] pt-[14px] flex flex-col gap-[8px]">
        <span className="text-[10px] font-semibold tracking-[1.5px] uppercase text-[#94A3B8]">
          Coaching
        </span>

        {warnings.map((tip, i) => (
          <div key={`w-${i}`} className="flex items-start gap-[6px]">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#E5654E"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0 mt-[1px]"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span className="text-[11px] text-[#64748B] leading-[1.4]">
              {tip.message}
            </span>
          </div>
        ))}

        {infos.map((tip, i) => (
          <div key={`i-${i}`} className="flex items-start gap-[6px]">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#0891b2"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0 mt-[1px]"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span className="text-[11px] text-[#64748B] leading-[1.4]">
              {tip.message}
            </span>
          </div>
        ))}

        {successes.map((tip, i) => (
          <div key={`s-${i}`} className="flex items-start gap-[6px]">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#22c55e"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0 mt-[1px]"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span className="text-[11px] text-[#64748B] leading-[1.4]">
              {tip.message}
            </span>
          </div>
        ))}

        {hiddenCount > 0 && (
          <p className="text-[10px] text-[#94A3B8] mt-[2px]">
            + {hiddenCount} more {hiddenCount === 1 ? "suggestion" : "suggestions"}
          </p>
        )}

        {result.tips.length === 0 && (
          <p className="text-[11px] text-[#94A3B8]">
            Looking good. Small improvements to your questions can meaningfully increase response quality.
          </p>
        )}
      </div>
    </div>
  );
}
