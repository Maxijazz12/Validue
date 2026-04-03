"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import type {
  CampaignDraft,
  CampaignDraftGeneration,
} from "@/lib/ai/types";
import { generateCampaignDraft } from "@/lib/ai/generate-campaign";
import { repairCampaignDraft } from "@/lib/ai/repair-campaign-draft";
import { runQualityPass } from "@/lib/ai/quality-pass";
import { publishCampaign, saveDraft } from "@/app/dashboard/ideas/new/actions";
import { createFundingSession } from "@/app/dashboard/ideas/new/payment-actions";
import {
  getUserTier,
  fetchReciprocalAssignments,
  type ReciprocalAssignment,
} from "@/app/dashboard/ideas/new/reciprocal-actions";
import { useToast } from "@/components/ui/Toast";
import ScribbleStep from "./ScribbleStep";
import GeneratingStep from "./GeneratingStep";
import DraftReviewStep from "./DraftReviewStep";

type Step = "scribble" | "generating" | "review";

function DebugPanel({ status }: { status: string }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="fixed bottom-4 left-4 bg-black text-green-400 font-mono text-[11px] px-3 py-2 rounded-lg z-50 opacity-80">
      [{elapsed}s] {status}
    </div>
  );
}

const AUTOSAVE_KEY = "vldta-draft-autosave";

type AutosaveState = {
  step: Step;
  scribbleText: string;
  draft: CampaignDraft | null;
  generationInfo: CampaignDraftGeneration | null;
};

function loadAutosave(): AutosaveState | null {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.step) return null;
    return {
      step: parsed.step,
      scribbleText: parsed.scribbleText ?? "",
      draft: parsed.draft ?? null,
      generationInfo: parsed.generationInfo ?? null,
    };
  } catch { return null; }
}

function saveAutosave(
  step: Step,
  scribbleText: string,
  draft: CampaignDraft | null,
  generationInfo: CampaignDraftGeneration | null
) {
  try {
    if (step === "generating") return;
    localStorage.setItem(
      AUTOSAVE_KEY,
      JSON.stringify({ step, scribbleText, draft, generationInfo, savedAt: Date.now() })
    );
  } catch { /* quota exceeded — ignore */ }
}

function clearAutosave() {
  try { localStorage.removeItem(AUTOSAVE_KEY); } catch { /* ignore */ }
}

function normalizeGeneratedDraft(draft: CampaignDraft, scribbleText: string): CampaignDraft {
  const repairedDraft = repairCampaignDraft(draft);
  return runQualityPass(repairedDraft, scribbleText).draft;
}

function scoreDraft(draft: CampaignDraft, scribbleText: string): CampaignDraft {
  return runQualityPass(draft, scribbleText || draft.summary).draft;
}

export default function CreateIdeaFlow() {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("scribble");
  const [scribbleText, setScribbleText] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [draft, setDraft] = useState<CampaignDraft | null>(null);
  const [generationInfo, setGenerationInfo] = useState<CampaignDraftGeneration | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [hasAutosave, setHasAutosave] = useState(false);

  // Tier + reciprocal gate state
  const [isFree, setIsFree] = useState(false);
  const [assignments, setAssignments] = useState<ReciprocalAssignment[] | null>(null);
  const [gatePreCleared, setGatePreCleared] = useState(false);
  const [coldStart, setColdStart] = useState(false);

  // Dual-readiness: track both AI completion and reciprocal completion
  const aiDraftRef = useRef<CampaignDraft | null>(null);
  const aiReadyRef = useRef(false);
  const reciprocalReadyRef = useRef(false);

  // Fetch tier on mount
  useEffect(() => {
    getUserTier().then((tier) => {
      setIsFree(tier === "free");
    });
  }, []);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;
    const saved = loadAutosave();
    setHasAutosave(!!(saved && (saved.draft || saved.scribbleText)));
  }, [hasHydrated]);

  const showRestore = hasHydrated && hasAutosave && !dismissed;

  function handleRestore() {
    const saved = loadAutosave();
    if (!saved) {
      setHasAutosave(false);
      return;
    }
    setStep(saved.step === "generating" ? "scribble" : saved.step);
    setScribbleText(saved.scribbleText || "");
    setDraft(
      saved.draft ? scoreDraft(saved.draft, saved.scribbleText || saved.draft.summary) : null
    );
    setGenerationInfo(saved.generationInfo);
    setHasAutosave(false);
    setDismissed(true);
    toast("Draft restored", "success");
  }

  function handleDiscardRestore() {
    clearAutosave();
    setHasAutosave(false);
    setDismissed(true);
    toast("Saved draft removed", "info");
  }

  useEffect(() => {
    if (!hasHydrated) return;
    if (showRestore) return;
    saveAutosave(step, scribbleText, draft, generationInfo);
  }, [step, scribbleText, draft, generationInfo, showRestore, dismissed, hasHydrated]);

  const [debugStatus, setDebugStatus] = useState("idle");

  /** Try to transition to review — only succeeds when both AI and reciprocal are ready */
  const tryTransition = useCallback(() => {
    if (!aiReadyRef.current) return;
    if (isFree && !reciprocalReadyRef.current) return;
    const d = aiDraftRef.current;
    if (!d) return;
    setDraft(d);
    // Brief pause so the completion state registers visually before the view swaps
    setTimeout(() => setStep("review"), 600);
  }, [isFree]);

  const handleScribbleSubmit = useCallback((text: string) => {
    setScribbleText(text);
    setError(null);
    setStep("generating");
    setDebugStatus("starting...");

    // Reset readiness flags
    aiReadyRef.current = false;
    reciprocalReadyRef.current = !isFree; // paid tier is immediately ready
    aiDraftRef.current = null;
    setGenerationInfo(null);
    setAssignments(null);
    setGatePreCleared(false);
    setColdStart(false);

    // If free tier, fetch reciprocal assignments in parallel with AI generation
    if (isFree) {
      fetchReciprocalAssignments().then((a) => {
        if (a.length === 0) {
          // No campaigns to answer — cold-start exemption
          reciprocalReadyRef.current = true;
          setColdStart(true);
          setAssignments(null); // null = show paid UI (skeleton)
          tryTransition();
        } else {
          setAssignments(a);
        }
      });
    }

    // AI generation
    generateCampaignDraft(text)
      .then((data) => {
        if (data.status === "done" && data.draft) {
          const normalizedDraft = normalizeGeneratedDraft(data.draft, text);
          setGenerationInfo({
            source: data.source,
            ...(data.fallbackReason ? { fallbackReason: data.fallbackReason } : {}),
          });
          setDebugStatus(`done-${data.source}-${normalizedDraft.questions.length}q`);
          aiDraftRef.current = normalizedDraft;
          aiReadyRef.current = true;
          tryTransition();
          return;
        }
        throw new Error("Campaign generation did not return a draft.");
      })
      .catch((err) => {
        setDebugStatus(`ERR: ${err instanceof Error ? err.message : String(err)}`);
        setError(
          "We couldn't generate your campaign this time. Your idea is saved — try again?"
        );
        setStep("scribble");
      });
  }, [isFree, tryTransition]);

  /** Called by GeneratingStep when all reciprocal questions are answered */
  const handleReciprocalComplete = useCallback(() => {
    reciprocalReadyRef.current = true;
    setGatePreCleared(true);
    tryTransition();
  }, [tryTransition]);

  const handleBack = useCallback(() => {
    setStep("scribble");
  }, []);

  const handleDraftChange = useCallback((updated: CampaignDraft) => {
    setDraft(scoreDraft(updated, scribbleText));
  }, [scribbleText]);

  const handleSaveDraft = useCallback(async () => {
    if (!draft) return;
    const preparedDraft = scoreDraft(draft, scribbleText);
    setDraft(preparedDraft);
    setIsSaving(true);
    setError(null);

    try {
      const result = await saveDraft(preparedDraft);
      if ("error" in result) {
        setError(result.error);
        setIsSaving(false);
        return;
      }
      clearAutosave();
      window.location.href = `/dashboard/ideas/${result.id}`;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(`Failed to save: ${message}`);
      setIsSaving(false);
    }
  }, [draft, scribbleText]);

  const handlePublish = useCallback(async () => {
    if (!draft) return;
    const preparedDraft = scoreDraft(draft, scribbleText);
    setDraft(preparedDraft);
    setIsPublishing(true);
    setError(null);

    try {
      const result = await publishCampaign(preparedDraft, { gatePreCleared, coldStart });
      if ("error" in result) {
        setError(result.error);
        setIsPublishing(false);
        return;
      }

      clearAutosave();

      // Gate pending and NOT pre-cleared — redirect to campaign page (shows gate progress)
      if (result.gatePending && !gatePreCleared) {
        window.location.href = `/dashboard/ideas/${result.id}`;
        return;
      }

      // Campaign created with pending_funding — redirect to Stripe Checkout
      if (preparedDraft.rewardPool && preparedDraft.rewardPool > 0) {
        const funding = await createFundingSession(result.id);
        if ("error" in funding) {
          setError(funding.error);
          setIsPublishing(false);
          return;
        }
        window.location.href = funding.url;
      } else {
        window.location.href = `/dashboard/ideas/${result.id}`;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(`Failed to publish: ${message}`);
      setIsPublishing(false);
    }
  }, [draft, scribbleText, gatePreCleared, coldStart]);

  const handleRegenerateDraft = useCallback(async () => {
    if (!scribbleText) return;
    const shouldReplace = window.confirm(
      "Regenerate from the original idea? This replaces your current title, questions, and audience settings."
    );
    if (!shouldReplace) return;

    setIsRegenerating(true);
    setError(null);

    try {
      const data = await generateCampaignDraft(scribbleText);
      if (data.status !== "done" || !data.draft) {
        throw new Error("Campaign generation did not return a draft.");
      }

      const normalizedDraft = normalizeGeneratedDraft(data.draft, scribbleText);
      setDraft(normalizedDraft);
      setGenerationInfo({
        source: data.source,
        ...(data.fallbackReason ? { fallbackReason: data.fallbackReason } : {}),
      });
      toast("Draft regenerated", "success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(`We couldn't regenerate right now: ${message}`);
    } finally {
      setIsRegenerating(false);
    }
  }, [scribbleText, toast]);

  return (
    <div>
      <div
        suppressHydrationWarning
        className={
          showRestore
            ? "mb-[16px] p-[16px] rounded-[16px] bg-white/90 border border-border-light shadow-sm flex items-center justify-between gap-[12px]"
            : "hidden"
        }
      >
        {showRestore ? (
          <>
            <p className="font-mono text-[11px] uppercase font-medium tracking-wide text-text-primary">
              [ UNSAVED DRAFT FOUND ]
            </p>
            <div className="flex items-center gap-[8px] shrink-0">
              <button
                onClick={handleRestore}
                className="px-[16px] py-[8px] rounded-full bg-accent text-white font-mono text-[11px] font-medium uppercase tracking-wide border border-transparent cursor-pointer hover:bg-white hover:text-text-primary hover:border-accent hover:shadow-md transition-all duration-300"
              >
                [ RESTORE ]
              </button>
              <button
                onClick={handleDiscardRestore}
                className="px-[16px] py-[8px] rounded-full font-mono text-[11px] uppercase tracking-wide font-medium text-text-muted bg-transparent border border-border-light cursor-pointer hover:border-accent hover:text-text-primary transition-all duration-300"
              >
                [ PURGE ]
              </button>
            </div>
          </>
        ) : null}
      </div>

      {error && (
        <div className="mb-[16px] px-[20px] py-[16px] rounded-[16px] bg-error/10 border border-error/20 flex items-center justify-between gap-[12px]">
          <span className="font-mono text-[11px] font-medium uppercase tracking-wide text-error">[ ERR: {error} ]</span>
          {error.includes("Upgrade") && (
            <Link
              href="/#pricing"
              className="shrink-0 px-[16px] py-[8px] rounded-full bg-error text-white font-mono text-[11px] uppercase tracking-wide font-medium no-underline hover:shadow-[0_0_16px_rgba(239,68,68,0.3)] transition-all duration-300"
            >
              [ ELEVATE PERMISSIONS ]
            </Link>
          )}
        </div>
      )}

      {step === "scribble" && (
        <ScribbleStep
          onSubmit={handleScribbleSubmit}
          isGenerating={false}
          initialText={scribbleText}
        />
      )}

      {step === "generating" && (
        <>
          <GeneratingStep
            assignments={assignments}
            onReciprocalComplete={handleReciprocalComplete}
          />
          {process.env.NODE_ENV === "development" && (
            <DebugPanel status={debugStatus} />
          )}
        </>
      )}

      {step === "review" && draft && (
        <DraftReviewStep
          draft={draft}
          generationInfo={generationInfo}
          onChange={handleDraftChange}
          onBack={handleBack}
          onRegenerate={handleRegenerateDraft}
          isRegenerating={isRegenerating}
          onPublish={handlePublish}
          isPublishing={isPublishing}
          onSaveDraft={handleSaveDraft}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}
