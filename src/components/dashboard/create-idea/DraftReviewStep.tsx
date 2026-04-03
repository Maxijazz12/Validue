"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import type {
  CampaignDraft,
  CampaignDraftGeneration,
  DraftQuestion,
  DraftAudience,
  QualityWarning,
} from "@/lib/ai/types";
import type { BaselineQuestion } from "@/lib/baseline-questions";
import SurveyEditor from "./SurveyEditor";
import BaselineQuestionPicker from "./BaselineQuestionPicker";
import SignalStrengthMeter from "./SignalStrengthMeter";
import WallCardUnified from "@/components/dashboard/WallCardUnified";
import AudienceTargetingPanel from "./AudienceTargetingPanel";
import { CATEGORY_OPTIONS } from "@/lib/constants";
import CampaignStrengthMeter from "@/components/dashboard/CampaignStrengthMeter";
import { calculateReach, getFundingPresets, estimateFillSpeed } from "@/lib/reach";
import { PLAN_CONFIG, PLATFORM_FEE_RATE, type PlanTier } from "@/lib/plans";

const selectClass =
  "text-[14px] px-[16px] py-[12px] rounded-xl border border-border-light bg-white text-text-primary outline-none focus:border-border-muted focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] transition-all duration-200 cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23999%22%20stroke-width%3D%222%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_12px_center] bg-no-repeat pr-[32px]";

interface DraftReviewStepProps {
  draft: CampaignDraft;
  generationInfo?: CampaignDraftGeneration | null;
  onChange: (draft: CampaignDraft) => void;
  onBack: () => void;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
  onPublish: () => void;
  isPublishing: boolean;
  onSaveDraft?: () => void;
  isSaving?: boolean;
  tier?: PlanTier;
  qualityScore?: number;
}

function dedupeWarnings(warnings: QualityWarning[]): QualityWarning[] {
  const seen = new Set<string>();
  return warnings.filter((warning) => {
    const key = `${warning.severity}:${warning.dimension}:${warning.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function DraftReviewStep({
  draft,
  generationInfo,
  onChange,
  onBack,
  onRegenerate,
  isRegenerating = false,
  onPublish,
  isPublishing,
  onSaveDraft,
  isSaving = false,
  tier = "free",
  qualityScore = 70,
}: DraftReviewStepProps) {
  const [swappingQuestionId, setSwappingQuestionId] = useState<string | null>(null);
  const [showCustomAmount, setShowCustomAmount] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const assumptionInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const resolvedQualityScore = draft.qualityScores?.overall ?? qualityScore;
  const qualityWarnings = dedupeWarnings(draft.qualityScores?.warnings ?? []);
  const highPriorityWarnings = qualityWarnings.filter(
    (warning) => warning.severity === "high" || warning.severity === "medium"
  );
  const polishWarnings = qualityWarnings.filter((warning) => warning.severity === "low");

  // Compute reach estimate and presets based on current funding + tier
  const reachEstimate = calculateReach(tier, draft.rewardPool ?? 0, {
    qualityScore: resolvedQualityScore,
  });
  const fundingPresets = getFundingPresets(tier, resolvedQualityScore);
  const fillSpeed = estimateFillSpeed(reachEstimate.effectiveReach);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      assumptionInputRefs.current.forEach((input) => {
        if (!input || document.activeElement === input) return;
        input.scrollLeft = 0;
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [draft.assumptions]);

  const generationBanner = generationInfo
    ? generationInfo.source === "ai"
      ? {
          tone: "border-success/20 bg-success/10 text-success",
          label: "[ LIVE_AI_DRAFT ]",
          copy: "This draft came from the live model, then passed through the quality pass.",
        }
      : {
          tone: "border-amber-500/20 bg-amber-500/10 text-amber-700",
          label: "[ BACKUP_DRAFT ]",
          copy:
            generationInfo.fallbackReason === "no_api_key"
              ? "AI is not configured in this environment, so this draft used the backup generator."
              : generationInfo.fallbackReason === "validation_failed"
                ? "The AI returned malformed draft data, so this version came from the backup generator."
                : "The AI call failed during generation, so this version came from the backup generator.",
        }
    : null;

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
    const nextTag = tagInput.trim();
    if (!nextTag) return;
    if (draft.tags.includes(nextTag)) {
      setTagInput("");
      return;
    }
    if (draft.tags.length >= 5) return;
    updateField("tags", [...draft.tags, nextTag]);
    setTagInput("");
  }

  const audienceHighlights = [
    { label: "Interests", values: draft.audience.interests },
    { label: "Expertise", values: draft.audience.expertise },
    { label: "Age", values: draft.audience.ageRanges },
  ].filter((group) => group.values.length > 0);

  const audienceDetails = [
    draft.audience.occupation
      ? { label: "Role", value: draft.audience.occupation }
      : null,
    draft.audience.industry
      ? { label: "Industry", value: draft.audience.industry }
      : null,
    draft.audience.location
      ? { label: "Location", value: draft.audience.location }
      : null,
    draft.audience.nicheQualifier
      ? { label: "Niche", value: draft.audience.nicheQualifier }
      : null,
  ].filter((detail): detail is { label: string; value: string } => Boolean(detail));

  return (
    <>
      <div className="mb-[40px] flex flex-col gap-2">
        <div className="flex flex-col gap-[16px] md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-[20px] md:text-[24px] font-bold tracking-tight text-text-primary font-mono uppercase">
              [ SYNTHESIS COMPLETE. AWAITING REVIEW ]
            </h1>
            <p className="font-mono text-[11px] font-medium tracking-wide text-text-muted uppercase">
              Verify and modify campaign nodes before execution.
            </p>
          </div>
          {onRegenerate && (
            <button
              type="button"
              onClick={onRegenerate}
              disabled={isPublishing || isSaving || isRegenerating}
              className="inline-flex items-center justify-center rounded-full border border-border-light bg-white px-[18px] py-[10px] font-mono text-[11px] font-medium uppercase tracking-wide text-text-primary transition-all duration-300 hover:border-accent hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isRegenerating ? "[ REGENERATING... ]" : "[ REGENERATE FROM SCRIBBLE ]"}
            </button>
          )}
        </div>
        {generationBanner && (
          <div className={`mt-[8px] rounded-[16px] border px-[16px] py-[12px] ${generationBanner.tone}`}>
            <p className="font-mono text-[11px] font-medium uppercase tracking-wide">
              {generationBanner.label}
            </p>
            <p className="mt-[6px] text-[13px] leading-[1.5] text-text-primary">
              {generationBanner.copy}
            </p>
          </div>
        )}
        <div
          className={`mt-[8px] rounded-[18px] border px-[18px] py-[16px] ${
            highPriorityWarnings.length > 0
              ? "border-warning/30 bg-warning/5"
              : "border-success/20 bg-success/10"
          }`}
        >
          <div className="flex flex-col gap-[10px] md:flex-row md:items-start md:justify-between">
            <div>
              <p className="font-mono text-[11px] font-medium uppercase tracking-wide text-text-primary">
                {highPriorityWarnings.length > 0
                  ? "[ REVIEW BEFORE PUBLISH ]"
                  : "[ READY FOR RESPONDENTS ]"}
              </p>
              <p className="mt-[6px] text-[13px] leading-[1.5] text-text-secondary">
                {highPriorityWarnings.length > 0
                  ? "A few things still look risky. Tightening these before publish should improve response quality and targeting."
                  : "The draft is in a healthy range. Publish now, or keep polishing the audience and payout plan if you want a stronger launch."}
              </p>
            </div>
            <div className="rounded-[14px] border border-black/5 bg-white/80 px-[14px] py-[10px] text-right">
              <p className="font-mono text-[10px] uppercase tracking-wide text-text-muted">
                Live quality
              </p>
              <p className="font-mono text-[18px] font-bold text-text-primary">
                {resolvedQualityScore}/100
              </p>
            </div>
          </div>
          {highPriorityWarnings.length > 0 && (
            <div className="mt-[14px] grid gap-[8px]">
              {highPriorityWarnings.slice(0, 3).map((warning) => (
                <div
                  key={`${warning.dimension}-${warning.message}`}
                  className="rounded-[12px] border border-warning/20 bg-white/80 px-[14px] py-[10px] text-[12px] text-text-secondary"
                >
                  <span className="font-mono text-[10px] uppercase tracking-wide text-[#92400E]">
                    {warning.dimension}
                  </span>
                  <p className="mt-[4px] leading-[1.5]">{warning.message}</p>
                </div>
              ))}
            </div>
          )}
          {highPriorityWarnings.length === 0 && polishWarnings.length > 0 && (
            <p className="mt-[12px] text-[12px] text-text-secondary">
              Small polish left: {polishWarnings[0].message}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-[1fr_280px] gap-[24px] max-lg:grid-cols-1">
        {/* Left column */}
        <div className="flex flex-col gap-[24px]">
          {/* ─── Idea Summary ─── */}
          <div className="bg-white border border-border-light shadow-card rounded-[32px] p-[32px] md:p-[40px]">
            <h2 className="font-mono text-[12px] font-medium uppercase tracking-wide text-text-primary mb-[8px]">
              [ 01: CORE METADATA ]
            </h2>
            <p className="font-mono text-[11px] uppercase font-medium tracking-wide text-text-muted mb-[24px]">
              Public-facing parameters.
            </p>

            <div className="flex flex-col gap-[20px]">
              {/* Title */}
              <div className="flex flex-col gap-[6px]">
                <label
                  htmlFor="draft-title"
                  className="text-[13px] font-medium text-text-secondary"
                >
                  Title
                </label>
                <input
                  id="draft-title"
                  value={draft.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  className="w-full px-[16px] py-[12px] rounded-xl border border-border-light bg-white text-[15px] text-text-primary font-sans placeholder:text-slate outline-none transition-all duration-200 focus:border-border-muted focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)]"
                />
              </div>

              {/* Summary */}
              <div className="flex flex-col gap-[6px]">
                <label
                  htmlFor="draft-summary"
                  className="text-[13px] font-medium text-text-secondary"
                >
                  Description
                </label>
                <textarea
                  id="draft-summary"
                  value={draft.summary}
                  onChange={(e) => updateField("summary", e.target.value)}
                  rows={4}
                  className="w-full px-[16px] py-[12px] rounded-xl border border-border-light bg-white text-[15px] text-text-primary font-sans placeholder:text-slate outline-none transition-all duration-200 focus:border-border-muted focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] resize-y min-h-[100px]"
                />
              </div>

              {/* Category */}
              <div className="grid grid-cols-2 gap-[16px] max-md:grid-cols-1">
                <div className="flex flex-col gap-[6px]">
                  <label
                    htmlFor="draft-category"
                    className="text-[13px] font-medium text-text-secondary"
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
                  <label className="text-[13px] font-medium text-text-secondary">
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-[6px] min-h-[44px] items-center">
                    {draft.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-[4px] text-[12px] px-[10px] py-[5px] rounded-full border border-border-light text-text-secondary bg-bg-muted"
                      >
                        {tag}
                        <button
                          onClick={() => removeTag(tag)}
                          className="text-slate hover:text-text-secondary transition-colors cursor-pointer border-none bg-transparent p-0 text-[14px] leading-none"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-col gap-[8px] rounded-[16px] border border-border-light/70 bg-bg-muted/40 p-[12px]">
                    <div className="flex gap-[8px] max-sm:flex-col">
                      <input
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addTag();
                          }
                        }}
                        placeholder="Add a precise audience tag"
                        className="flex-1 rounded-xl border border-border-light bg-white px-[14px] py-[10px] text-[13px] text-text-primary outline-none transition-all duration-200 focus:border-border-muted focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)]"
                      />
                      <button
                        type="button"
                        onClick={addTag}
                        disabled={!tagInput.trim() || draft.tags.length >= 5}
                        className="rounded-xl border border-border-light bg-white px-[14px] py-[10px] text-[12px] font-medium text-text-primary transition-all duration-200 hover:border-accent disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Add tag
                      </button>
                    </div>
                    <p className="text-[11px] text-text-muted">
                      Keep tags sharp and respondent-facing. 2–5 tags works best for Wall presentation and matching.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-[12px] rounded-[24px] border border-border-light/70 bg-bg-muted/30 p-[18px]">
                <div>
                  <p className="font-mono text-[11px] font-medium uppercase tracking-wide text-text-primary">
                    Audience Snapshot
                  </p>
                  <p className="mt-[4px] text-[12px] text-text-secondary">
                    This is the targeting summary respondents will feel through matching and Wall placement.
                  </p>
                </div>
                {audienceHighlights.length > 0 && (
                  <div className="grid gap-[10px]">
                    {audienceHighlights.map((group) => (
                      <div key={group.label}>
                        <p className="mb-[6px] text-[11px] font-medium uppercase tracking-wide text-text-muted">
                          {group.label}
                        </p>
                        <div className="flex flex-wrap gap-[6px]">
                          {group.values.map((value) => (
                            <span
                              key={`${group.label}-${value}`}
                              className="inline-flex rounded-full border border-border-light bg-white px-[10px] py-[5px] text-[12px] text-text-secondary"
                            >
                              {value}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {audienceDetails.length > 0 && (
                  <div className="grid gap-[8px] md:grid-cols-2">
                    {audienceDetails.map((detail) => (
                      <div
                        key={detail.label}
                        className="rounded-[16px] border border-border-light bg-white px-[14px] py-[12px]"
                      >
                        <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">
                          {detail.label}
                        </p>
                        <p className="mt-[4px] text-[13px] leading-[1.5] text-text-primary">
                          {detail.value}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                {audienceHighlights.length === 0 && audienceDetails.length === 0 && (
                  <p className="text-[12px] text-text-secondary">
                    Add a little audience detail here so matching does not have to guess who this campaign is really for.
                  </p>
                )}
              </div>

              {/* Assumptions */}
              <div className="flex flex-col gap-[8px]">
                <label className="text-[13px] font-medium text-text-secondary">
                  Key Assumptions Being Tested
                </label>
                {draft.assumptions.map((a, i) => (
                  <div key={i} className="flex items-center gap-[8px]">
                    <span className="text-[12px] text-slate w-[16px] shrink-0">
                      {i + 1}.
                    </span>
                    <input
                      ref={(node) => {
                        assumptionInputRefs.current[i] = node;
                      }}
                      value={a}
                      onChange={(e) => updateAssumption(i, e.target.value)}
                      className="flex-1 px-[12px] py-[8px] rounded-xl border border-border-light bg-white text-[13px] text-text-primary font-sans outline-none focus:border-border-muted focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] transition-all duration-200"
                    />
                    <button
                      onClick={() => handleImproveAssumption(i)}
                      disabled={improvingAssumption === i}
                      className={`w-[28px] h-[28px] rounded-md flex items-center justify-center transition-all cursor-pointer border-none bg-transparent ${
                        improvingAssumption === i
                          ? "animate-spin text-[#a855f7]"
                          : "text-slate hover:bg-[#f3e8ff] hover:text-[#a855f7]"
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
                      className="text-slate hover:text-red-500 transition-colors cursor-pointer border-none bg-transparent p-[4px]"
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
                  <p className="text-[12px] text-error mt-[2px]">{improveError}</p>
                )}
                {draft.assumptions.length < 5 && (
                  <button
                    onClick={addAssumption}
                    className="self-start text-[12px] font-medium text-text-secondary px-[12px] py-[6px] rounded-xl border border-border-light hover:border-border-muted hover:text-text-primary transition-all duration-200 cursor-pointer bg-transparent mt-[4px]"
                  >
                    + Add assumption
                  </button>
                )}
                {draft.assumptions.length >= 5 && (
                  <span className="text-[11px] text-slate mt-[4px]">
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
          <div className="bg-white border border-border-light shadow-card rounded-[32px] p-[32px] md:p-[40px]">
            <h2 className="font-mono text-[12px] font-medium uppercase tracking-wide text-text-primary mb-[8px]">[ 04: EXECUTION PROTOCOL ]</h2>
            <div className="flex gap-[12px] mt-[16px]">
              {(["quick", "standard"] as const).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => updateField("format", fmt)}
                  className={`flex-1 text-left px-[16px] py-[16px] rounded-[16px] border text-[13px] transition-all cursor-pointer ${
                    (draft.format || "quick") === fmt
                      ? "border-accent bg-accent text-white shadow-lg"
                      : "border-border-light bg-white/40 text-text-primary hover:border-border-light hover:bg-white/60"
                  }`}
                >
                  <span className="font-mono text-[11px] font-medium uppercase tracking-wide block mb-1">
                    {fmt === "quick" ? "[ QUICK_RUN ]" : "[ STD_RUN ]"}
                  </span>
                  <span className={`font-mono text-[11px] uppercase tracking-wider block ${(draft.format || "quick") === fmt ? "text-white/70" : "text-text-muted"}`}>
                    {fmt === "quick"
                      ? "3 NODES \u00B7 ~2 MIN"
                      : "5 NODES \u00B7 ~3 MIN"}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate mt-[8px]">
              Quick is the default format for fast validation. Switch to Standard for deeper feedback.
            </p>
          </div>

          {/* ─── Campaign Funding ─── */}
          <div className="bg-white border border-border-light shadow-card rounded-[32px] p-[32px] md:p-[40px]">
            <h2 className="font-mono text-[12px] font-medium uppercase tracking-wide text-text-primary mb-[8px]">
              [ 05: RESOURCE ALLOCATION ]
            </h2>
            <p className="font-mono text-[11px] uppercase font-medium tracking-wide text-text-muted mb-[28px]">
              Fuel the execution engine to increase range and speed.
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
                          ? "border-accent bg-accent text-white"
                          : "border-border-light bg-white text-text-primary hover:border-border-muted"
                      }`}
                    >
                      {preset.recommended && (
                        <span className="absolute -top-[8px] right-[8px] text-[9px] font-bold uppercase tracking-[0.5px] px-[6px] py-[2px] rounded-full bg-success text-white">
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
                          isSelected ? "text-white/70" : "text-slate"
                        }`}
                      >
                        Strength: {preset.strength}/10
                      </span>
                      <span
                        className={`block text-[11px] ${
                          isSelected ? "text-white/70" : "text-slate"
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
                  className="text-[12px] text-text-secondary hover:text-text-primary bg-transparent border-none cursor-pointer underline"
                >
                  {showCustomAmount ? "Use preset" : "Custom amount"}
                </button>
                {showCustomAmount && (
                  <div className="mt-[8px]">
                    <div className="relative">
                      <span className="absolute left-[16px] top-1/2 -translate-y-1/2 text-[15px] text-slate">
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
                        className="w-full pl-[32px] pr-[16px] py-[12px] rounded-xl border border-border-light bg-white text-[15px] text-text-primary font-mono outline-none focus:border-border-muted focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] transition-all duration-200"
                      />
                    </div>
                    {(draft.rewardPool ?? 0) > PLAN_CONFIG[tier].efficientZone && (
                      <p className="mt-[6px] text-[11px] text-brand">
                        You&apos;re getting less value per dollar above ${PLAN_CONFIG[tier].efficientZone} on your current plan.{" "}
                        {tier !== "pro" && (
                          <Link href="/#pricing" className="text-text-primary font-semibold underline">
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
                <div className="flex items-center gap-[8px] text-[12px] text-slate">
                  <span>
                    Service fee ({Math.round(PLATFORM_FEE_RATE * 100)}%):{" "}
                    <span className="font-mono">
                      ${((draft.rewardPool ?? 0) * PLATFORM_FEE_RATE).toFixed(2)}
                    </span>
                  </span>
                  <span className="text-[#d4d4d4]">&middot;</span>
                  <span>
                    Respondents receive:{" "}
                    <span className="font-mono font-semibold text-text-primary">
                      ${((draft.rewardPool ?? 0) * (1 - PLATFORM_FEE_RATE)).toFixed(2)}
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
                qualityScore={resolvedQualityScore}
              />

              {/* Tier upgrade nudge for free */}
              {tier === "free" && (draft.rewardPool ?? 0) > 0 && (
                <div className="px-[14px] py-[10px] rounded-lg bg-bg-muted border border-border-light/50 text-[12px] text-text-secondary">
                  With a Pro plan, this same ${draft.rewardPool} would reach significantly more people — Strength{" "}
                  <strong>
                    {calculateReach("pro", draft.rewardPool ?? 0, {
                      qualityScore: resolvedQualityScore,
                    }).campaignStrength}
                  </strong>{" "}
                  vs {reachEstimate.campaignStrength}.{" "}
                  <Link href="/#pricing" className="text-text-primary font-semibold underline">
                    See plans
                  </Link>
                </div>
              )}

              {/* V2: How payouts work explainer (replaces reward type + toggles) */}
              {(draft.rewardPool ?? 0) > 0 && (
                <details className="text-[12px] text-text-secondary border border-border-light rounded-lg p-[14px]">
                  <summary className="font-medium text-[13px] text-text-primary cursor-pointer">
                    How respondent payouts work
                  </summary>
                  <div className="mt-[8px] space-y-[6px]">
                    <p>
                      Every qualifying response earns a base payout.
                      Respondents who write higher-quality answers earn additional bonus.
                    </p>
                    <p>
                      Your budget &rarr; {Math.round(PLATFORM_FEE_RATE * 100)}% platform fee &rarr; remaining pool split equally among qualifying respondents
                    </p>
                  </div>
                </details>
              )}

              {(draft.rewardPool ?? 0) === 0 && (
                <p className="text-[12px] text-slate italic">
                  You can run without a budget, but funded campaigns typically
                  get 3x more qualified responses.
                </p>
              )}
            </div>
          </div>

          {/* ─── Actions ─── */}
          <div className="flex items-center gap-[12px] pt-[16px]">
            <button
              onClick={onPublish}
              disabled={isPublishing || isSaving || isRegenerating}
              className="inline-flex items-center justify-center px-[32px] py-[16px] rounded-full text-[12px] font-medium uppercase tracking-wide bg-accent text-white hover:bg-white hover:text-text-primary hover:shadow-[0_0_24px_rgba(255,255,255,0.4)] transition-all duration-300 cursor-pointer border border-accent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPublishing
                ? "[ INITIATING... ]"
                : (draft.rewardPool ?? 0) > 0
                  ? "[ DEPLOY & FUND RUN ]"
                  : "[ DEPLOY RUN ]"}
            </button>
            {onSaveDraft && (
              <button
                onClick={onSaveDraft}
                disabled={isPublishing || isSaving || isRegenerating}
                className="inline-flex items-center justify-center px-[24px] py-[16px] rounded-full text-[12px] font-medium uppercase tracking-wide text-text-primary bg-white border border-white hover:border-accent hover:shadow-sm transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? "[ SAVING CACHE... ]" : "[ SUSPEND TO CACHE ]"}
              </button>
            )}
            <button
              onClick={onBack}
              disabled={isPublishing || isSaving || isRegenerating}
              className="inline-flex items-center justify-center px-[24px] py-[16px] rounded-full text-[12px] font-medium uppercase tracking-wide text-text-muted hover:text-text-primary transition-all cursor-pointer border-none bg-transparent disabled:opacity-50"
            >
              [ ABORT TO RAW ]
            </button>
          </div>
        </div>

        {/* Right column — Survey Quality Score (sticky) */}
        <div className="max-lg:order-first">
          <div className="sticky top-[24px] flex flex-col gap-[16px]">
            <SignalStrengthMeter draft={draft} />

            {/* Live preview of how the card will appear on The Wall */}
            <div>
              <p className="text-[10px] font-semibold tracking-[1.5px] uppercase text-slate mb-[8px]">
                Wall Preview
              </p>
              <div className="pointer-events-none opacity-90 scale-[0.92] origin-top-left">
                <WallCardUnified
                  idea={{
                    id: "preview",
                    title: draft.title || "Your Idea Title",
                    description: draft.summary || "Your idea description will appear here...",
                    category: draft.category || null,
                    tags: draft.tags.slice(0, 3),
                    estimatedMinutes: 5,
                    rewardAmount: draft.rewardPool ?? 0,
                    currentResponses: 0,
                    targetResponses: 50,
                    createdAt: new Date().toISOString(),
                    deadline: null,
                    creatorName: "You",
                    creatorAvatar: null,
                    bonusAvailable: false,
                    rewardsTopAnswers: false,
                    rewardType: null,
                    isSubsidized: false,
                    economicsVersion: 2,
                    format: draft.format ?? "quick",
                    matchScore: 85,
                  }}
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
