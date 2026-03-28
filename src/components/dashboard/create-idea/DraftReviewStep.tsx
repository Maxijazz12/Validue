"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import type { CampaignDraft, DraftQuestion, DraftAudience } from "@/lib/ai/types";
import type { BaselineQuestion } from "@/lib/baseline-questions";
import SurveyEditor from "./SurveyEditor";
import BaselineQuestionPicker from "./BaselineQuestionPicker";
import SignalStrengthMeter from "./SignalStrengthMeter";
import AudienceTargetingPanel from "./AudienceTargetingPanel";
import { CATEGORY_OPTIONS } from "@/lib/constants";
import CampaignStrengthMeter from "@/components/dashboard/CampaignStrengthMeter";
import { calculateReach, getFundingPresets, estimateFillSpeed } from "@/lib/reach";
import { PLAN_CONFIG, type PlanTier } from "@/lib/plans";

const selectClass =
  "text-[14px] px-[16px] py-[12px] rounded-lg border border-[#E2E8F0] bg-white text-[#111111] outline-none focus:border-[#CBD5E1] focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23999%22%20stroke-width%3D%222%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_12px_center] bg-no-repeat pr-[32px]";

interface DraftReviewStepProps {
  draft: CampaignDraft;
  onChange: (draft: CampaignDraft) => void;
  onBack: () => void;
  onPublish: () => void;
  isPublishing: boolean;
  tier?: PlanTier;
  qualityScore?: number;
}

export default function DraftReviewStep({
  draft,
  onChange,
  onBack,
  onPublish,
  isPublishing,
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
        <h1 className="text-[28px] font-bold text-[#111111] tracking-[-0.5px]">
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
                  className="w-full px-[16px] py-[12px] rounded-lg border border-[#E2E8F0] bg-white text-[15px] text-[#111111] font-sans placeholder:text-[#94A3B8] outline-none transition-all duration-200 focus:border-[#CBD5E1] focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)]"
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
                  className="w-full px-[16px] py-[12px] rounded-lg border border-[#E2E8F0] bg-white text-[15px] text-[#111111] font-sans placeholder:text-[#94A3B8] outline-none transition-all duration-200 focus:border-[#CBD5E1] focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] resize-y min-h-[100px]"
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
                      className="flex-1 px-[12px] py-[8px] rounded-lg border border-[#E2E8F0] bg-white text-[13px] text-[#111111] font-sans outline-none focus:border-[#CBD5E1] focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] transition-all"
                    />
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
                {draft.assumptions.length < 5 && (
                  <button
                    onClick={addAssumption}
                    className="self-start text-[12px] font-medium text-[#64748B] px-[12px] py-[6px] rounded-lg border border-[#E2E8F0] hover:border-[#CBD5E1] hover:text-[#111111] transition-all cursor-pointer bg-transparent mt-[4px]"
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
                        className="w-full pl-[32px] pr-[16px] py-[12px] rounded-lg border border-[#E2E8F0] bg-white text-[15px] text-[#111111] font-mono outline-none focus:border-[#CBD5E1] focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] transition-all"
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

              {/* Reward type */}
              {(draft.rewardPool ?? 0) > 0 && (
                <>
                  <div className="flex flex-col gap-[6px]">
                    <label className="text-[13px] font-medium text-[#64748B]">
                      How to divide rewards
                    </label>
                    <div className="flex gap-[8px]">
                      {(
                        [
                          {
                            value: "pool",
                            label: "Split among top responses",
                            desc: "Your budget is shared among the best responses, ranked by quality",
                          },
                          {
                            value: "top_only",
                            label: "Winners only",
                            desc: "Bigger individual payouts for fewer winners — attracts deeper effort",
                          },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() =>
                            updateField("rewardType", opt.value)
                          }
                          className={`flex-1 text-left px-[14px] py-[12px] rounded-lg border text-[13px] transition-all cursor-pointer ${
                            (draft.rewardType || "pool") === opt.value
                              ? "border-[#111111] bg-[#111111] text-white"
                              : "border-[#E2E8F0] bg-white text-[#111111] hover:border-[#CBD5E1]"
                          }`}
                        >
                          <span className="font-semibold block">
                            {opt.label}
                          </span>
                          <span
                            className={`text-[11px] ${
                              (draft.rewardType || "pool") === opt.value
                                ? "text-white/70"
                                : "text-[#94A3B8]"
                            }`}
                          >
                            {opt.desc}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Toggles */}
                  <div className="flex flex-col gap-[10px]">
                    <label className="flex items-center gap-[10px] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!draft.rewardsTopAnswers}
                        onChange={(e) =>
                          updateField("rewardsTopAnswers", e.target.checked)
                        }
                        className="w-[18px] h-[18px] rounded accent-[#111111] cursor-pointer"
                      />
                      <span className="text-[13px] text-[#64748B]">
                        Highlight that thoughtful responses earn more
                      </span>
                    </label>
                    <label className="flex items-center gap-[10px] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!draft.bonusAvailable}
                        onChange={(e) =>
                          updateField("bonusAvailable", e.target.checked)
                        }
                        className="w-[18px] h-[18px] rounded accent-[#111111] cursor-pointer"
                      />
                      <span className="text-[13px] text-[#64748B]">
                        Show &quot;Bonus available&quot; badge on The Wall
                      </span>
                    </label>
                  </div>
                </>
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
              disabled={isPublishing}
              className="inline-flex items-center justify-center px-[32px] py-[14px] rounded-xl text-[15px] font-semibold bg-[#111111] text-white hover:bg-[#222222] hover:shadow-[0_4px_16px_rgba(0,0,0,0.15)] transition-all cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPublishing
                ? "Publishing…"
                : (draft.rewardPool ?? 0) > 0
                  ? "Publish & Fund"
                  : "Publish Campaign"}
            </button>
            <button
              onClick={onBack}
              disabled={isPublishing}
              className="inline-flex items-center justify-center px-[32px] py-[14px] rounded-xl text-[15px] font-medium text-[#64748B] hover:text-[#111111] transition-all cursor-pointer border-none bg-transparent disabled:opacity-50"
            >
              Back to Scribble
            </button>
          </div>
        </div>

        {/* Right column — Survey Quality Score (sticky) */}
        <div className="max-lg:order-first">
          <div className="sticky top-[24px]">
            <SignalStrengthMeter draft={draft} />
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
