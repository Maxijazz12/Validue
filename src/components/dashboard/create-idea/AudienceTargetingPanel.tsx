"use client";

import { useState } from "react";
import type { DraftAudience, DraftQuestion } from "@/lib/ai/types";
import { improveAudience } from "@/lib/ai/generate-audience";
import ChipSelect from "@/components/ui/ChipSelect";
import Input from "@/components/ui/Input";
import {
  INTEREST_OPTIONS,
  EXPERTISE_OPTIONS,
  AGE_RANGE_OPTIONS,
  INDUSTRY_OPTIONS,
  EXPERIENCE_LEVEL_OPTIONS,
} from "@/lib/constants";

const selectClass =
  "text-[14px] px-[16px] py-[12px] rounded-xl border border-border-light bg-white text-text-primary outline-none focus:border-border-muted focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] transition-all duration-200 cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23999%22%20stroke-width%3D%222%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_12px_center] bg-no-repeat pr-[32px]";

type TargetingMode = "broad" | "balanced" | "strict";

const TARGETING_MODE_DESCRIPTIONS: Record<TargetingMode, string> = {
  broad: "Anyone can respond. Targeting only affects ranking order.",
  balanced: "Respondents must match at least one targeting dimension.",
  strict: "Respondents must match all targeting dimensions. Fewer but more relevant responses.",
};

type TargetingDimensionName = "interests" | "expertise" | "age_range" | "industry" | "experience_level";

const DIMENSION_LABELS: Record<TargetingDimensionName, string> = {
  interests: "Interests",
  expertise: "Expertise",
  age_range: "Age range",
  industry: "Industry",
  experience_level: "Experience level",
};

interface AudienceTargetingPanelProps {
  audience: DraftAudience;
  onChange: (audience: DraftAudience) => void;
  targetingMode: TargetingMode;
  onTargetingModeChange: (mode: TargetingMode) => void;
  hardFilterDimensions: string[];
  onHardFilterDimensionsChange: (dims: string[]) => void;
  scribbleText?: string;
  assumptions?: string[];
  questions?: DraftQuestion[];
}

export default function AudienceTargetingPanel({
  audience,
  onChange,
  targetingMode,
  onTargetingModeChange,
  hardFilterDimensions,
  onHardFilterDimensionsChange,
  scribbleText,
  assumptions,
  questions,
}: AudienceTargetingPanelProps) {
  const [isImproving, setIsImproving] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  function update(partial: Partial<DraftAudience>) {
    onChange({ ...audience, ...partial });
  }

  async function handleAISuggest() {
    if (!scribbleText) return;
    setIsImproving(true);
    setSuggestError(null);
    try {
      const improved = await improveAudience(
        scribbleText,
        audience,
        assumptions,
        questions
      );
      onChange(improved);
    } catch {
      setSuggestError("AI suggestion failed — try again or adjust manually.");
      setTimeout(() => setSuggestError(null), 4000);
    } finally {
      setIsImproving(false);
    }
  }

  return (
    <div className="bg-white border border-border-light shadow-card rounded-[20px] md:rounded-[28px] px-[14px] py-[20px] md:p-[28px]">
      <div className="flex items-center justify-between mb-[4px]">
        <h2 className="font-mono text-[12px] font-medium uppercase tracking-wide text-text-primary">
          Audience Targeting
        </h2>
        {scribbleText && (
          <button
            onClick={handleAISuggest}
            disabled={isImproving}
            className="inline-flex items-center gap-[6px] text-[12px] font-medium text-[#a855f7] px-[12px] py-[6px] rounded-xl border border-[#a855f7]/20 hover:bg-[#f3e8ff] transition-all duration-200 cursor-pointer bg-transparent disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isImproving ? (
              <>
                <span className="w-[14px] h-[14px] border-2 border-[#a855f7]/30 border-t-[#a855f7] rounded-full animate-spin" />
                Improving…
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
                  <path d="M19 15l.5 1.5L21 17.5l-1.5.5L19 19.5l-.5-1.5L17 17.5l1.5-.5L19 15z" />
                </svg>
                AI Suggest
              </>
            )}
          </button>
        )}
      </div>
      <p className="text-[13px] text-text-muted mb-[28px]">
        Who should see and respond to this campaign.
      </p>

      {suggestError && (
        <div className="mb-[16px] px-[20px] py-[16px] rounded-[16px] bg-error/10 border border-error/20">
          <span className="text-[13px] font-medium text-error">{suggestError}</span>
        </div>
      )}

      {/* Targeting strictness selector */}
      <div className="mb-[24px]">
        <label className="text-[13px] font-medium text-text-secondary mb-[8px] block">
          Targeting strictness
        </label>
        <div className="flex rounded-xl border border-border-light overflow-hidden">
          {(["broad", "balanced", "strict"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onTargetingModeChange(mode)}
              className={`flex-1 py-[10px] px-[12px] text-[13px] font-medium transition-all duration-200 ${
                targetingMode === mode
                  ? "bg-text-primary text-white"
                  : "bg-white text-text-muted hover:bg-surface-secondary"
              }`}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
        <p className="text-[12px] text-text-muted mt-[6px]">
          {TARGETING_MODE_DESCRIPTIONS[targetingMode]}
        </p>

        {/* Hard filter dimension checkboxes — only shown in strict mode */}
        {targetingMode === "strict" && (() => {
          const activeDimensions: TargetingDimensionName[] = [];
          if (audience.interests.length > 0) activeDimensions.push("interests");
          if (audience.expertise.length > 0) activeDimensions.push("expertise");
          if ((audience.ageRanges?.length ?? 0) > 0) activeDimensions.push("age_range");
          if (audience.industry) activeDimensions.push("industry");
          if (audience.experienceLevel) activeDimensions.push("experience_level");

          if (activeDimensions.length < 2) return null;

          return (
            <div className="mt-[12px] p-[12px] rounded-lg bg-surface-secondary border border-border-light">
              <p className="text-[12px] font-medium text-text-secondary mb-[8px]">
                Required dimensions {hardFilterDimensions.length === 0 ? "(all)" : `(${hardFilterDimensions.length} of ${activeDimensions.length})`}
              </p>
              <p className="text-[11px] text-text-muted mb-[8px]">
                Select specific dimensions to require, or leave all unchecked to require every dimension.
              </p>
              <div className="flex flex-wrap gap-[8px]">
                {activeDimensions.map((dim) => {
                  const checked = hardFilterDimensions.includes(dim);
                  return (
                    <label
                      key={dim}
                      className={`inline-flex items-center gap-[6px] px-[10px] py-[6px] rounded-lg text-[12px] cursor-pointer transition-all duration-200 border ${
                        checked
                          ? "bg-text-primary text-white border-text-primary"
                          : "bg-white text-text-muted border-border-light hover:border-border-muted"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={checked}
                        onChange={() => {
                          const next = checked
                            ? hardFilterDimensions.filter((d) => d !== dim)
                            : [...hardFilterDimensions, dim];
                          onHardFilterDimensionsChange(next);
                        }}
                      />
                      {DIMENSION_LABELS[dim]}
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>

      <div className="flex flex-col gap-[24px]">
        <ChipSelect
          label="Interests"
          name="targetInterests"
          options={INTEREST_OPTIONS}
          selected={audience.interests}
          onChange={(v) => update({ interests: v })}
        />

        <ChipSelect
          label="Expertise"
          name="targetExpertise"
          options={EXPERTISE_OPTIONS}
          selected={audience.expertise}
          onChange={(v) => update({ expertise: v })}
        />

        <ChipSelect
          label="Age ranges"
          name="targetAgeRanges"
          options={AGE_RANGE_OPTIONS}
          selected={audience.ageRanges}
          onChange={(v) => update({ ageRanges: v })}
        />

        <div className="grid grid-cols-2 gap-[16px] max-md:grid-cols-1">
          <Input
            id="audience-location"
            label="Location"
            placeholder="e.g. USA, Europe, Global"
            value={audience.location}
            onChange={(e) => update({ location: e.target.value })}
          />

          <Input
            id="audience-occupation"
            label="Occupation / Role"
            placeholder="e.g. Product Manager, Freelancer"
            value={audience.occupation}
            onChange={(e) => update({ occupation: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-[16px] max-md:grid-cols-1">
          <div className="flex flex-col gap-[6px]">
            <label
              htmlFor="audience-industry"
              className="text-[13px] font-medium text-text-secondary"
            >
              Industry
            </label>
            <select
              id="audience-industry"
              value={audience.industry}
              onChange={(e) => update({ industry: e.target.value })}
              className={selectClass}
            >
              <option value="">Any industry</option>
              {INDUSTRY_OPTIONS.map((ind) => (
                <option key={ind} value={ind}>
                  {ind}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-[6px]">
            <label
              htmlFor="audience-experience"
              className="text-[13px] font-medium text-text-secondary"
            >
              Experience Level
            </label>
            <select
              id="audience-experience"
              value={audience.experienceLevel}
              onChange={(e) => update({ experienceLevel: e.target.value })}
              className={selectClass}
            >
              <option value="">Any level</option>
              {EXPERIENCE_LEVEL_OPTIONS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Input
          id="audience-niche"
          label="Niche qualifier (optional)"
          placeholder='e.g. "Uses Figma daily", "Has kids under 5"'
          value={audience.nicheQualifier}
          onChange={(e) => update({ nicheQualifier: e.target.value })}
        />
      </div>
    </div>
  );
}
