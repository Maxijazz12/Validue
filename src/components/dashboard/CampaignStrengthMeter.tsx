"use client";

import { useState } from "react";
import { getStrengthColors } from "@/lib/strength-colors";

/* ─── Types ─── */

type StrengthMeterProps = {
  strength: number; // 1–10
  strengthLabel: string;
  estimatedResponsesLow: number;
  estimatedResponsesHigh: number;
  effectiveReach: number;
  fillSpeedLabel: string;
  qualityModifier: number;
  qualityScore?: number;
  compact?: boolean;
};

/* ─── Tooltip ─── */

function Tooltip({
  text,
  children,
}: {
  text: string;
  children: React.ReactNode;
}) {
  const [show, setShow] = useState(false);
  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-[6px] px-[10px] py-[6px] text-[11px] text-white bg-[#111111] rounded-lg whitespace-normal max-w-[240px] leading-[1.4] z-10 pointer-events-none shadow-lg">
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-l-transparent border-r-transparent border-t-[#111111]" />
        </span>
      )}
    </span>
  );
}

/* ─── Info icon ─── */

function InfoIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-[#94A3B8] cursor-help"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

/* ─── Main component ─── */

export default function CampaignStrengthMeter({
  strength,
  strengthLabel,
  estimatedResponsesLow,
  estimatedResponsesHigh,
  effectiveReach,
  fillSpeedLabel,
  qualityModifier,
  qualityScore,
  compact = false,
}: StrengthMeterProps) {
  const colors = getStrengthColors(strength);
  const qualityBonus = Math.round((qualityModifier - 1) * 100);
  const qualityIsPositive = qualityBonus >= 0;

  if (compact) {
    return (
      <div className="flex items-center gap-[10px]">
        <div
          className="flex items-center justify-center w-[36px] h-[36px] rounded-lg font-mono font-bold text-[16px]"
          style={{ backgroundColor: colors.bgTint, color: colors.strokeStyle, WebkitTextStrokeWidth: '0.6px', WebkitTextStrokeColor: colors.strokeStyle, WebkitTextFillColor: colors.fillStyle }}
        >
          {strength}
        </div>
        <div>
          <div className="text-[12px] font-semibold text-[#111111]">
            Campaign Strength
          </div>
          <div className="text-[11px] text-[#64748B]">{strengthLabel}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/60 backdrop-blur-3xl border border-white/80 shadow-[0_8px_32px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.8)] rounded-[24px] p-[24px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-[20px]">
        <div className="flex items-center gap-[12px]">
          <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-[#1C1917]">
            [ ENGINE PROPULSION ]
          </span>
          <Tooltip text="Campaign Strength is a 1–10 score that estimates how many qualified people will see your campaign. It's based on your plan, funding, and survey quality. You can improve it by increasing your fund or sharpening your questions.">
            <InfoIcon />
          </Tooltip>
        </div>
        <div className="flex items-baseline gap-[2px]">
          <span
            className="font-mono font-bold text-[24px] leading-none"
            style={{ WebkitTextStrokeWidth: '0.8px', WebkitTextStrokeColor: colors.strokeStyle, WebkitTextFillColor: colors.fillStyle }}
          >
            {strength}
          </span>
          <span className="text-[14px] text-[#94A3B8] font-normal">/10</span>
        </div>
      </div>

      {/* Strength bar */}
      <div className="flex gap-[3px] mb-[8px]">
        {Array.from({ length: 10 }, (_, i) => {
          if (i >= strength) {
            return <div key={i} className="h-[6px] flex-1 rounded-full" style={{ backgroundColor: "#F1F5F9" }} />;
          }
          const progress = strength <= 1 ? 1 : i / (strength - 1);
          const opacity = 0.35 + 0.65 * progress;
          return (
            <div
              key={i}
              className="h-[6px] flex-1 rounded-full transition-all duration-300"
              style={{ backgroundColor: colors.barColor, opacity }}
            />
          );
        })}
      </div>

      {/* Label */}
      <p className="font-mono text-[10px] text-[#A8A29E] uppercase tracking-widest mb-[24px]">{"// "}{strengthLabel}</p>

      {/* Secondary metrics */}
      <div className="grid grid-cols-3 gap-[16px] pt-[20px] border-t border-black/5">
        {/* Estimated Responses */}
        <div>
          <div className="flex items-center gap-[8px] mb-[6px]">
            <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-[#A8A29E]">
              EST. YIELD
            </span>
            <Tooltip text="The estimated number of completed responses. This is a range, not a guarantee — actual results depend on your audience, reward, and question quality.">
              <InfoIcon />
            </Tooltip>
          </div>
          <div className="text-[15px] font-semibold text-[#111111] font-mono">
            ~{estimatedResponsesLow}–{estimatedResponsesHigh}
          </div>
        </div>

        {/* Expected Visibility */}
        <div>
          <div className="flex items-center gap-[4px] mb-[4px]">
            <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-[#A8A29E]">
              VISIBILITY
            </span>
            <Tooltip text="How many people in your target audience will see your campaign. Higher plans and more funding increase this number.">
              <InfoIcon />
            </Tooltip>
          </div>
          <div className="text-[16px] font-bold text-[#1C1917] font-mono tracking-tight">
            ~{effectiveReach.toLocaleString()}
          </div>
        </div>

        {/* Fill Speed */}
        <div>
          <div className="flex items-center gap-[8px] mb-[6px]">
            <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-[#A8A29E]">
              VELOCITY
            </span>
            <Tooltip text="How quickly you can expect responses to come in. This is an estimate based on typical activity — not a guarantee.">
              <InfoIcon />
            </Tooltip>
          </div>
          <div className="font-mono text-[11px] font-bold uppercase tracking-widest text-[#1C1917] mt-1">
            {fillSpeedLabel}
          </div>
        </div>
      </div>

      {/* Quality impact notice */}
      {qualityScore !== undefined && (
        <div
          className="mt-[16px] px-[12px] py-[8px] rounded-lg text-[12px]"
          style={{
            backgroundColor: qualityIsPositive
              ? "rgba(34,197,94,0.06)"
              : "rgba(232,114,92,0.06)",
            color: qualityIsPositive ? "#22c55e" : "#CC5340",
          }}
        >
          {qualityIsPositive ? (
            <>
              Your survey quality ({qualityScore}/100) is boosting your reach
              by <strong>{qualityBonus}%</strong>.
            </>
          ) : (
            <>
              Your survey quality ({qualityScore}/100) is limiting your reach
              by <strong>{Math.abs(qualityBonus)}%</strong>.{" "}
              <span className="underline cursor-pointer">
                Improving your questions
              </span>{" "}
              will increase visibility.
            </>
          )}
        </div>
      )}
    </div>
  );
}
