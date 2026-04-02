"use client";

import { useState, useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import type { CampaignDraft } from "@/lib/ai/types";
import { generateCampaignDraft } from "@/lib/ai/generate-campaign";
import { publishCampaign, saveDraft } from "@/app/dashboard/ideas/new/actions";
import { createFundingSession } from "@/app/dashboard/ideas/new/payment-actions";
import ScribbleStep from "./ScribbleStep";
import GeneratingStep from "./GeneratingStep";
import DraftReviewStep from "./DraftReviewStep";

type Step = "scribble" | "generating" | "review";

const AUTOSAVE_KEY = "vldta-draft-autosave";

function loadAutosave(): { step: Step; scribbleText: string; draft: CampaignDraft | null } | null {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.step) return null;
    return parsed;
  } catch { return null; }
}

function saveAutosave(step: Step, scribbleText: string, draft: CampaignDraft | null) {
  try {
    if (step === "generating") return; // don't save transient state
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ step, scribbleText, draft, savedAt: Date.now() }));
  } catch { /* quota exceeded — ignore */ }
}

function clearAutosave() {
  try { localStorage.removeItem(AUTOSAVE_KEY); } catch { /* ignore */ }
}

export default function CreateIdeaFlow() {
  const [step, setStep] = useState<Step>("scribble");
  const [scribbleText, setScribbleText] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draft, setDraft] = useState<CampaignDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const pendingText = useRef<string | null>(null);

  const noop = useCallback(() => () => {}, []);
  const hasAutosave = useSyncExternalStore(
    noop,
    () => {
      const saved = loadAutosave();
      return !!(saved && (saved.draft || saved.scribbleText));
    },
    () => false,
  );
  const showRestore = hasAutosave && !dismissed;

  function handleRestore() {
    const saved = loadAutosave();
    if (!saved) return;
    setStep(saved.step === "generating" ? "scribble" : saved.step);
    setScribbleText(saved.scribbleText || "");
    setDraft(saved.draft);
    setDismissed(true);
  }

  function handleDiscardRestore() {
    clearAutosave();
    setDismissed(true);
  }

  // Auto-save on every meaningful state change
  useEffect(() => {
    if (showRestore) return; // don't overwrite saved state before user decides
    saveAutosave(step, scribbleText, draft);
  }, [step, scribbleText, draft, showRestore, dismissed]);

  const handleScribbleSubmit = useCallback((text: string) => {
    setScribbleText(text);
    setError(null);
    pendingText.current = text;
    setStep("generating");
  }, []);

  // Start AI generation when entering generating step
  useEffect(() => {
    if (step !== "generating" || !pendingText.current) return;
    const text = pendingText.current;
    pendingText.current = null;

    generateCampaignDraft(text)
      .then((result) => {
        setDraft(result);
        setStep("review");
      })
      .catch(() => {
        setError(
          "We couldn't generate your campaign this time. Your idea is saved — try again?"
        );
        setStep("scribble");
      });
  }, [step]);

  const handleBack = useCallback(() => {
    setStep("scribble");
  }, []);

  const handleDraftChange = useCallback((updated: CampaignDraft) => {
    setDraft(updated);
  }, []);

  const handleSaveDraft = useCallback(async () => {
    if (!draft) return;
    setIsSaving(true);
    setError(null);

    try {
      const result = await saveDraft(draft);
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
  }, [draft]);

  const handlePublish = useCallback(async () => {
    if (!draft) return;
    setIsPublishing(true);
    setError(null);

    try {
      const result = await publishCampaign(draft);
      if ("error" in result) {
        setError(result.error);
        setIsPublishing(false);
        return;
      }

      clearAutosave();

      // Reciprocal gate pending — redirect to campaign page (shows gate progress)
      if (result.gatePending) {
        window.location.href = `/dashboard/ideas/${result.id}`;
        return;
      }

      // Campaign created with pending_funding — redirect to Stripe Checkout
      if (draft.rewardPool && draft.rewardPool > 0) {
        const funding = await createFundingSession(result.id);
        if ("error" in funding) {
          setError(funding.error);
          setIsPublishing(false);
          return;
        }
        window.location.href = funding.url;
      } else {
        // No reward pool — show the campaign detail page so founder sees metrics
        window.location.href = `/dashboard/ideas/${result.id}`;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(`Failed to publish: ${message}`);
      setIsPublishing(false);
    }
  }, [draft]);

  return (
    <div>
      {showRestore && (
        <div className="mb-[16px] p-[16px] rounded-[16px] bg-white/40 backdrop-blur-xl border border-white/60 shadow-sm flex items-center justify-between gap-[12px]">
          <p className="font-mono text-[10px] uppercase font-bold tracking-widest text-[#1C1917]">
            [ SUSPENDED SESSION DETECTED INCORPORATING SAVED CACHE ]
          </p>
          <div className="flex items-center gap-[8px] shrink-0">
            <button
              onClick={handleRestore}
              className="px-[16px] py-[8px] rounded-full bg-[#1C1917] text-white font-mono text-[10px] font-bold uppercase tracking-widest border border-transparent cursor-pointer hover:bg-white hover:text-[#1C1917] hover:border-[#1C1917] hover:shadow-md transition-all duration-300"
            >
              [ RESTORE ]
            </button>
            <button
              onClick={handleDiscardRestore}
              className="px-[16px] py-[8px] rounded-full font-mono text-[10px] uppercase tracking-widest font-bold text-[#A8A29E] bg-transparent border border-[#E7E5E4] cursor-pointer hover:border-[#1C1917] hover:text-[#1C1917] transition-all duration-300"
            >
              [ PURGE ]
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-[16px] px-[20px] py-[16px] rounded-[16px] bg-[#ef4444]/10 border border-[#ef4444]/20 backdrop-blur-md flex items-center justify-between gap-[12px]">
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#ef4444]">[ ERR: {error} ]</span>
          {error.includes("Upgrade") && (
            <Link
              href="/#pricing"
              className="shrink-0 px-[16px] py-[8px] rounded-full bg-[#ef4444] text-white font-mono text-[10px] uppercase tracking-widest font-bold no-underline hover:shadow-[0_0_16px_rgba(239,68,68,0.3)] transition-all duration-300"
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

      {step === "generating" && <GeneratingStep />}

      {step === "review" && draft && (
        <DraftReviewStep
          draft={draft}
          onChange={handleDraftChange}
          onBack={handleBack}
          onPublish={handlePublish}
          isPublishing={isPublishing}
          onSaveDraft={handleSaveDraft}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}
