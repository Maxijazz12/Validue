"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import type { CampaignDraft, DraftQuestion, DraftAudience } from "@/lib/ai/types";
import type { BaselineQuestion } from "@/lib/baseline-questions";
import SurveyEditor from "./SurveyEditor";
import BaselineQuestionPicker from "./BaselineQuestionPicker";
import SignalStrengthMeter from "./SignalStrengthMeter";
import WallCard from "@/components/dashboard/WallCard";
import AudienceTargetingPanel from "./AudienceTargetingPanel";
import { CATEGORY_OPTIONS } from "@/lib/constants";
import CampaignStrengthMeter from "@/components/dashboard/CampaignStrengthMeter";
import { calculateReach, getFundingPresets, estimateFillSpeed } from "@/lib/reach";
import { PLAN_CONFIG, type PlanTier } from "@/lib/plans";

const selectClass =
  "text-[14px] px-[16px] py-[12px] rounded-xl border border-[#E2E8F0] bg-white text-[#111111] outline-none focus:border-[#CBD5E1] focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] transition-all duration-200 cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23999%22%20stroke-width%3D%222%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_12px_center] bg-no-repeat pr-[32px]";

interface DraftReviewStepProps {
  draft: CampaignDraft;
  onChange: (draft: CampaignDraft) => void;
  onBack: () => void;
  onPublish: () => void;
  isPublishing: boolean;
  onSaveDraft?: () => void;
  isSaving?: boolean;
  tier?: PlanTier;
  qualityScore?: number;
}

export default function DraftReviewStep({
  draft,
  onChange,
  onBack,
  onPublish,
  isPublishing,
  onSaveDraft,
  isSaving = false,
  tier = "free",
  qualityScore = 70,
}: DraftReviewStepProps) {
  const [swappingQuestionId, setSwappingQuestionId] = useState<string | null>(null);
  const [showCustomAmount, setShowCustomAmount] = useState(false);

  // Compute reach estimate and presets based on current funding + tier
  const reachEstimate = calculateReach(tier, draft.rewardPool ?? 0, { qualityScore });
  const fundingPresets = getFundingPresets(tier, qualityScore);
  const fillSpeed = estimateFillSpeed(reachEstimate.effectiveReach);

  const updateField = useCallback(
    <K extends keyof CampaignDraft>(key: K, value: CampaignDraft[K]) => {
      onChange({ ...draft, [key]: value });
    },
    [draft, onChange]
  );

  function handleSwapBaseline(questionId: string, baseline: BaselineQuestion) {
    const updated = draft.questions.map((q) =>
      q.id === questionId
        ? {
            ...q,
            text: baseline.text,
            options: [...baseline.options],
            baselineId: baseline.id,
            category: baseline.category,
          }
        : q
    );
    updateField("questions", updated);
  }

  /* ─── Assumption editing ─── */
  const [improvingAssumption, setImprovingAssumption] = useState<number | null>(null);
  const [improveError, setImproveError] = useState<string | null>(null);

  async function handleImproveAssumption(index: number) {
    setImprovingAssumption(index);
    setImproveError(null);
    try {
      const audienceSummary = [
        draft.audience.interests.join(", "),
        draft.audience.expertise.join(", "),
        draft.audience.ageRanges.join(", "),
        draft.audience.occupation,
      ].filter(Boolean).join(" | ");

      const res = await fetch("/api/generate/assumption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scribbleText: draft.summary,
          currentAssumption: draft.assumptions[index],
          allAssumptions: draft.assumptions,
          audienceSummary,
        }),
      });

      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const { assumption } = await res.json();
      const next = [...draft.assumptions];
      next[index] = assumption;
      updateField("assumptions", next);
    } catch {
      setImproveError("AI improvement failed — try editing manually.");
      setTimeout(() => setImproveError(null), 4000);
    } finally {
      setImprovingAssumption(null);
    }
  }

  function updateAssumption(index: number, value: string) {
    const next = [...draft.assumptions];
    next[index] = value;
    updateField("assumptions", next);
  }

  function removeAssumption(index: number) {
    updateField(
      "assumptions",
      draft.assumptions.filter((_, i) => i !== index)
    );
  }

  function addAssumption() {
    if (draft.assumptions.length >= 5) return;
    updateField("assumptions", [...draft.assumptions, ""]);
  }

  /* ─── Tag editing ─── */
  function removeTag(tag: string) {
    updateField(
      "tags",
      draft.tags.filter((t) => t !== tag)
    );
  }

  function addTag() {
    const tag = prompt("Enter a new tag:");
    if (tag?.trim()) {
      updateField("tags", [...draft.tags, tag.trim()]);
    }
  }

  return (
    <>
      <div className="mb-[32px]">
        <h1 className="text-[28px] font-bold text-[#111111] tracking-[-0.03em]">
          Review Your Campaign
        </h1>
        <p className="text-[15px] text-[#64748B] mt-[4px]">
          We generated a draft from your idea. Edit everything below before
          publishing.
        </p>
      </div>

      <div className="grid grid-cols-[1fr_280px] gap-[24px] max-lg:grid-cols-1">
        {/* Left column */}
        <div className="flex flex-col gap-[24px]">
          {/* ─── Idea Summary ─── */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-[32px]">
            <h2 className="text-[16px] font-semibold text-[#111111] mb-[4px]">
              Idea Summary
            </h2>
            <p className="text-[13px] text-[#64748B] mb-[24px]">
              This is what respondents will see. Edit to make it clear and
              compelling.
            </p>

            <div className="flex flex-col gap-[20px]">
              {/* Title */}
              <div className="flex flex-col gap-[6px]">
                <label
                  htmlFor="draft-title"
                  className="text-[13px] font-medium text-[#64748B]"
                >
                  Title
                </label>
                <input
                  id="draft-title"
                  value={draft.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  className="w-full px-[16px] py-[12px] rounded-xl border border-[#E2E8F0] bg-white text-[15px] text-[#111111] font-sans placeholder:text-[#94A3B8] outline-none transition-all duration-200 focus:border-[#CBD5E1] focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)]"
                />
              </div>

              {/* Summary */}
              <div className="flex flex-col gap-[6px]">
                <label
                  htmlFor="draft-summary"
                  className="text-[13px] font-medium text-[#64748B]"
                >
                  Description
                </label>
                <textarea
                  id="draft-summary"
                  value={draft.summary}
                  onChange={(e) => updateField("summary", e.target.value)}
                  rows={4}
                  className="w-full px-[16px] py-[12px] rounded-xl border border-[#E2E8F0] bg-white text-[15px] text-[#111111] font-sans placeholder:text-[#94A3B8] outline-none transition-all duration-200 focus:border-[#CBD5E1] focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] resize-y min-h-[100px]"
                />
              </div>

              {/* Category */}
              <div className="grid grid-cols-2 gap-[16px] max-md:grid-cols-1">
                <div className="flex flex-col gap-[6px]">
                  <label
                    htmlFor="draft-category"
                    className="text-[13px] font-medium text-[#64748B]"
                  >
                    Category
                  </label>
                  <select
                    id="draft-category"
                    value={draft.category}
                    onChange={(e) => updateField("category", e.target.value)}
                    className={selectClass}
                  >
                    {CATEGORY_OPTIONS.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tags */}
                <div className="flex flex-col gap-[6px]">
                  <label className="text-[13px] font-medium text-[#64748B]">
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-[6px] min-h-[44px] items-center">
                    {draft.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-[4px] text-[12px] px-[10px] py-[5px] rounded-full border border-[#E2E8F0] text-[#64748B] bg-[#FCFCFD]"
                      >
                        {tag}
                        <button
                          onClick={() => removeTag(tag)}
                          className="text-[#94A3B8] hover:text-[#64748B] transition-colors cursor-pointer border-none bg-transparent p-0 text-[14px] leading-none"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                    <button
                      onClick={addTag}
                      className="text-[12px] text-[#94A3B8] hover:text-[#64748B] transition-colors cursor-pointer border-none bg-transparent p-0"
                    >
                      + add
                    </button>
                  </div>
                </div>
              </div>

              {/* Assumptions */}
              <div className="flex flex-col gap-[8px]">
                <label className="text-[13px] font-medium text-[#64748B]">
                  Key Assumptions Being Tested
                </label>
                {draft.assumptions.map((a, i) => (
                  <div key={i} className="flex items-center gap-[8px]">
                    <span className="text-[12px] text-[#94A3B8] w-[16px] shrink-0">
                      {i + 1}.
                    </span>
                    <input
                      value={a}
                      onChange={(e) => updateAssumption(i, e.target.value)}
                      className="flex-1 px-[12px] py-[8px] rounded-xl border border-[#E2E8F0] bg-white text-[13px] text-[#111111] font-sans outline-none focus:border-[#CBD5E1] focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] transition-all duration-200"
                    />
                    <button
                      onClick={() => handleImproveAssumption(i)}
                      disabled={improvingAssumption === i}
                      className={`w-[28px] h-[28px] rounded-md flex items-center justify-center transition-all cursor-pointer border-none bg-transparent ${
                        improvingAssumption === i
                          ? "animate-spin text-[#a855f7]"
                          : "text-[#94A3B8] hover:bg-[#f3e8ff] hover:text-[#a855f7]"
                      }`}
                      title="AI improve"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        {improvingAssumption === i ? (
                          <path d="M12 2v4m0 12v4m-7.07-3.93l2.83-2.83m8.48-8.48l2.83-2.83M2 12h4m12 0h4m-3.93 7.07l-2.83-2.83M6.34 6.34L3.51 3.51" />
                        ) : (
                          <>
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                          </>
                        )}
                      </svg>
                    </button>
                    <button
                      onClick={() => removeAssumption(i)}
                      className="text-[#94A3B8] hover:text-red-500 transition-colors cursor-pointer border-none bg-transparent p-[4px]"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                ))}
                {improveError && (
                  <p className="text-[12px] text-[#ef4444] mt-[2px]">{improveError}</p>
                )}
                {draft.assumptions.length < 5 && (
                  <button
                    onClick={addAssumption}
                    className="self-start text-[12px] font-medium text-[#64748B] px-[12px] py-[6px] rounded-xl border border-[#E2E8F0] hover:border-[#CBD5E1] hover:text-[#111111] transition-all duration-200 cursor-pointer bg-transparent mt-[4px]"
                  >
                    + Add assumption
                  </button>
                )}
                {draft.assumptions.length >= 5 && (
                  <span className="text-[11px] text-[#94A3B8] mt-[4px]">
                    Maximum 5 assumptions
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ─── Survey Editor ─── */}
          <SurveyEditor
            questions={draft.questions}
            onChange={(qs: DraftQuestion[]) => updateField("questions", qs)}
            onSwapBaseline={(id: string) => setSwappingQuestionId(id)}
            scribbleText={draft.summary}
            campaignSummary={draft.summary}
            assumptions={draft.assumptions}
            audience={draft.audience}
          />

          {/* ─── Audience Targeting ─── */}
          <AudienceTargetingPanel
            audience={draft.audience}
            onChange={(a: DraftAudience) => updateField("audience", a)}
            scribbleText={draft.summary}
            assumptions={draft.assumptions}
            questions={draft.questions}
          />

          {/* ─── V2: Campaign Format Toggle ─── */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-[32px]">
            <h2 className="text-[16px] font-semibold text-[#111111] mb-[4px]">Campaign Format</h2>
            <div className="flex gap-[8px] mt-[12px]">
              {(["quick", "standard"] as const).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => updateField("format", fmt)}
                  className={`flex-1 text-left px-[14px] py-[12px] rounded-lg border text-[13px] transition-all cursor-pointer ${
                    (draft.format || "quick") === fmt
                      ? "border-[#111111] bg-[#111111] text-white"
                      : "border-[#E2E8F0] bg-white text-[#111111] hover:border-[#CBD5E1]"
                  }`}
                >
                  <span className="font-semibold block">
                    {fmt === "quick" ? "Quick" : "Standard"}
                  </span>
                  <span className={`text-[11px] ${(draft.format || "quick") === fmt ? "text-white/70" : "text-[#94A3B8]"}`}>
                    {fmt === "quick"
                      ? "3 questions \u00B7 ~3 min \u00B7 Fast validation"
                      : "5 questions \u00B7 ~5 min \u00B7 Deeper insights"}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-[#94A3B8] mt-[8px]">
              Quick is the default format for fast validation. Switch to Standard for deeper feedback.
            </p>
          </div>

          {/* ─── Campaign Funding ─── */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-[32px]">
            <h2 className="text-[16px] font-semibold text-[#111111] mb-[4px]">
              Set Your Campaign Budget
            </h2>
            <p className="text-[13px] text-[#64748B] mb-[24px]">
              Your budget goes directly toward rewarding respondents. Higher
              budgets attract more and better responses — and fill faster.
            </p>

            <div className="flex flex-col gap-[20px]">
              {/* Funding presets */}
              <div className="grid grid-cols-4 gap-[8px] max-sm:grid-cols-2">
                {fundingPresets.map((preset) => {
                  const isSelected = (draft.rewardPool ?? 0) === preset.amount && !showCustomAmount;
                  return (
                    <button
                      key={preset.amount}
                      type="button"
                      onClick={() => {
                        updateField("rewardPool", preset.amount);
                        setShowCustomAmount(false);
                      }}
                      className={`relative text-left px-[14px] py-[14px] rounded-xl border text-[13px] transition-all cursor-pointer ${
                        isSelected
                          ? "border-[#111111] bg-[#111111] text-white"
                          : "border-[#E2E8F0] bg-white text-[#111111] hover:border-[#CBD5E1]"
                      }`}
                    >
                      {preset.recommended && (
                        <span className="absolute -top-[8px] right-[8px] text-[9px] font-bold uppercase tracking-[0.5px] px-[6px] py-[2px] rounded-full bg-[#22c55e] text-white">
                          Recommended
                        </span>
                      )}
                      <span className="block font-semibold text-[14px] mb-[2px]">
                        {preset.label}{" "}
                        <span className="font-mono">
                          {preset.amount === 0 ? "($0)" : `($${preset.amount})`}
                        </span>
                      </span>
                      <span
                        className={`block text-[11px] mb-[4px] ${
                          isSelected ? "text-white/70" : "text-[#94A3B8]"
                        }`}
                      >
                        Strength: {preset.strength}/10
                      </span>
                      <span
                        className={`block text-[11px] ${
                          isSelected ? "text-white/70" : "text-[#94A3B8]"
                        }`}
                      >
                        ~{preset.estimatedResponsesLow}–
                        {preset.estimatedResponsesHigh} responses
                      </span>
                      <span
                        className={`block text-[10px] mt-[2px] ${
                          isSelected ? "text-white/50" : "text-[#bbbbbb]"
                        }`}
                      >
                        {preset.fillSpeedLabel}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Custom amount toggle + input */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowCustomAmount(!showCustomAmount)}
                  className="text-[12px] text-[#64748B] hover:text-[#111111] bg-transparent border-none cursor-pointer underline"
                >
                  {showCustomAmount ? "Use preset" : "Custom amount"}
                </button>
                {showCustomAmount && (
                  <div className="mt-[8px]">
                    <div className="relative">
                      <span className="absolute left-[16px] top-1/2 -translate-y-1/2 text-[15px] text-[#94A3B8]">
                        $
                      </span>
                      <input
                        id="reward-amount"
                        type="number"
                        min={0}
                        step={5}
                        value={draft.rewardPool || 0}
                        onChange={(e) =>
                          updateField(
                            "rewardPool",
                            Math.max(0, Number(e.target.value))
                          )
                        }
                        className="w-full pl-[32px] pr-[16px] py-[12px] rounded-xl border border-[#E2E8F0] bg-white text-[15px] text-[#111111] font-mono outline-none focus:border-[#CBD5E1] focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] transition-all duration-200"
                      />
                    </div>
                    {(draft.rewardPool ?? 0) > PLAN_CONFIG[tier].efficientZone && (
                      <p className="mt-[6px] text-[11px] text-[#E5654E]">
                        You&apos;re getting less value per dollar above ${PLAN_CONFIG[tier].efficientZone} on your current plan.{" "}
                        {tier !== "scale" && (
                          <Link href="/#pricing" className="text-[#111111] font-semibold underline">
                            A higher plan stretches this budget further.
                          </Link>
                        )}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Platform fee breakdown */}
              {(draft.rewardPool ?? 0) > 0 && (
                <div className="flex items-center gap-[8px] text-[12px] text-[#94A3B8]">
                  <span>
                    Service fee (15%):{" "}
                    <span className="font-mono">
                      ${((draft.rewardPool ?? 0) * 0.15).toFixed(2)}
                    </span>
                  </span>
                  <span className="text-[#d4d4d4]">&middot;</span>
                  <span>
                    Respondents receive:{" "}
                    <span className="font-mono font-semibold text-[#111111]">
                      ${((draft.rewardPool ?? 0) * 0.85).toFixed(2)}
                    </span>
                  </span>
                </div>
              )}

              {/* Campaign Strength Meter */}
              <CampaignStrengthMeter
                strength={reachEstimate.campaignStrength}
                strengthLabel={reachEstimate.strengthLabel}
                estimatedResponsesLow={reachEstimate.estimatedResponsesLow}
                estimatedResponsesHigh={reachEstimate.estimatedResponsesHigh}
                effectiveReach={reachEstimate.effectiveReach}
                fillSpeedLabel={fillSpeed}
                qualityModifier={reachEstimate.qualityModifier}
                qualityScore={qualityScore}
              />

              {/* Tier upgrade nudge for free/starter */}
              {(tier === "free" || tier === "starter") && (draft.rewardPool ?? 0) > 0 && (
                <div className="px-[14px] py-[10px] rounded-lg bg-[#F3F4F6] border border-[#E2E8F0]/50 text-[12px] text-[#64748B]">
                  With a {tier === "free" ? "Pro" : "Scale"} plan, this same ${draft.rewardPool} would reach significantly more people — Strength{" "}
                  <strong>
                    {calculateReach(tier === "free" ? "pro" : "scale", draft.rewardPool ?? 0, { qualityScore }).campaignStrength}
                  </strong>{" "}
                  vs {reachEstimate.campaignStrength}.{" "}
                  <Link href="/#pricing" className="text-[#111111] font-semibold underline">
                    See plans
                  </Link>
                </div>
              )}

              {/* V2: How payouts work explainer (replaces reward type + toggles) */}
              {(draft.rewardPool ?? 0) > 0 && (
                <details className="text-[12px] text-[#64748B] border border-[#E2E8F0] rounded-lg p-[14px]">
                  <summary className="font-medium text-[13px] text-[#111111] cursor-pointer">
                    How respondent payouts work
                  </summary>
                  <div className="mt-[8px] space-y-[6px]">
                    <p>
                      Every qualifying response earns a base payout.
                      Respondents who write higher-quality answers earn additional bonus.
                    </p>
                    <p>
                      Your budget &rarr; 15% platform fee &rarr; 60% base pool (split equally) &rarr; 40% quality bonus pool (earned by top scorers)
                    </p>
                  </div>
                </details>
              )}

              {(draft.rewardPool ?? 0) === 0 && (
                <p className="text-[12px] text-[#94A3B8] italic">
                  You can run without a budget, but funded campaigns typically
                  get 3x more qualified responses.
                </p>
              )}
            </div>
          </div>

          {/* ─── Actions ─── */}
          {(draft.rewardPool ?? 0) > 0 && (
            <p className="text-[12px] text-[#64748B] pt-[8px]">
              After publishing, you&apos;ll complete a secure checkout to go live.
            </p>
          )}
          <div className="flex items-center gap-[12px] pt-[8px]">
            <button
              onClick={onPublish}
              disabled={isPublishing || isSaving}
              className="inline-flex items-center justify-center px-[32px] py-[14px] rounded-xl text-[15px] font-medium bg-[#111111] text-white hover:bg-[#1a1a1a] hover:shadow-[0_4px_20px_rgba(232,193,176,0.15),0_1px_4px_rgba(232,193,176,0.08)] hover:-translate-y-[1px] transition-all duration-200 cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPublishing
                ? "Publishing…"
                : (draft.rewardPool ?? 0) > 0
                  ? "Publish & Fund"
                  : "Publish Campaign"}
            </button>
            {onSaveDraft && (
              <button
                onClick={onSaveDraft}
                disabled={isPublishing || isSaving}
                className="inline-flex items-center justify-center px-[24px] py-[14px] rounded-xl text-[15px] font-medium text-[#111111] border border-[#E2E8F0] bg-white hover:border-[#CBD5E1] hover:shadow-sm transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? "Saving…" : "Save Draft"}
              </button>
            )}
            <button
              onClick={onBack}
              disabled={isPublishing || isSaving}
              className="inline-flex items-center justify-center px-[32px] py-[14px] rounded-xl text-[15px] font-medium text-[#64748B] hover:text-[#111111] transition-all cursor-pointer border-none bg-transparent disabled:opacity-50"
            >
              Back to Scribble
            </button>
          </div>
        </div>

        {/* Right column — Survey Quality Score (sticky) */}
        <div className="max-lg:order-first">
          <div className="sticky top-[24px] flex flex-col gap-[16px]">
            <SignalStrengthMeter draft={draft} />

            {/* Live preview of how the card will appear on The Wall */}
            <div>
              <p className="text-[10px] font-semibold tracking-[1.5px] uppercase text-[#94A3B8] mb-[8px]">
                Wall Preview
              </p>
              <div className="pointer-events-none opacity-90 scale-[0.92] origin-top-left">
                <WallCard
                  id="preview"
                  title={draft.title || "Your Idea Title"}
                  description={draft.summary || "Your idea description will appear here..."}
                  category={draft.category || null}
                  tags={draft.tags.slice(0, 3)}
                  estimatedMinutes={5}
                  rewardAmount={draft.rewardPool ?? 0}
                  currentResponses={0}
                  targetResponses={50}
                  createdAt={new Date().toISOString()}
                  deadline={null}
                  creatorName="You"
                  creatorAvatar={null}
                  bonusAvailable={false}
                  rewardsTopAnswers={false}
                  rewardType={null}
                  isSubsidized={false}
                  economicsVersion={2}
                  format={draft.format ?? "quick"}
                  matchScore={85}
                  isVisible
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Baseline picker modal */}
      {swappingQuestionId && (
        <BaselineQuestionPicker
          currentQuestionId={swappingQuestionId}
          currentBaselines={draft.questions.filter((q) => q.isBaseline)}
          onSelect={handleSwapBaseline}
          onClose={() => setSwappingQuestionId(null)}
        />
      )}
    </>
  );
}
