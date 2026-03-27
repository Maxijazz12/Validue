"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { CampaignDraft } from "@/lib/ai/types";
import { generateCampaignDraft } from "@/lib/ai/generate-campaign";
import { publishCampaign } from "@/app/dashboard/ideas/new/actions";
import { createFundingSession } from "@/app/dashboard/ideas/new/payment-actions";
import ScribbleStep from "./ScribbleStep";
import GeneratingStep from "./GeneratingStep";
import DraftReviewStep from "./DraftReviewStep";

type Step = "scribble" | "generating" | "review";

export default function CreateIdeaFlow() {
  const [step, setStep] = useState<Step>("scribble");
  const [scribbleText, setScribbleText] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [draft, setDraft] = useState<CampaignDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pendingText = useRef<string | null>(null);

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
          "Something went wrong generating your campaign. Please try again."
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
        // No reward pool — go straight to ideas list
        window.location.href = "/dashboard/ideas";
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(`Failed to publish: ${message}`);
      setIsPublishing(false);
    }
  }, [draft]);

  return (
    <div>
      {error && (
        <div className="mb-[16px] px-[16px] py-[12px] rounded-lg bg-red-50 border border-red-200 text-[13px] text-red-700">
          {error}
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
        />
      )}
    </div>
  );
}
