"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import type { CampaignDraft } from "@/lib/ai/types";
import { publishCampaign, updateDraft } from "@/app/dashboard/ideas/new/actions";
import { createFundingSession } from "@/app/dashboard/ideas/new/payment-actions";
import DraftReviewStep from "@/components/dashboard/create-idea/DraftReviewStep";

interface EditDraftFlowProps {
  campaignId: string;
  initialDraft: CampaignDraft;
}

export default function EditDraftFlow({ campaignId, initialDraft }: EditDraftFlowProps) {
  const [draft, setDraft] = useState<CampaignDraft>(initialDraft);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDraftChange = useCallback((updated: CampaignDraft) => {
    setDraft(updated);
  }, []);

  const handleSaveDraft = useCallback(async () => {
    setIsSaving(true);
    setError(null);

    try {
      const result = await updateDraft(campaignId, draft);
      if ("error" in result) {
        setError(result.error);
        setIsSaving(false);
        return;
      }
      window.location.href = `/dashboard/ideas/${campaignId}`;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(`Failed to save: ${message}`);
      setIsSaving(false);
    }
  }, [campaignId, draft]);

  const handlePublish = useCallback(async () => {
    setIsPublishing(true);
    setError(null);

    try {
      // Delete the draft and publish fresh (publishCampaign creates a new row)
      // Instead, update the draft first, then publish it
      const updateResult = await updateDraft(campaignId, draft);
      if ("error" in updateResult) {
        setError(updateResult.error);
        setIsPublishing(false);
        return;
      }

      const result = await publishCampaign(draft);
      if ("error" in result) {
        setError(result.error);
        setIsPublishing(false);
        return;
      }

      if (draft.rewardPool && draft.rewardPool > 0) {
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
  }, [campaignId, draft]);

  const handleBack = useCallback(() => {
    window.location.href = `/dashboard/ideas/${campaignId}`;
  }, [campaignId]);

  return (
    <div>
      {error && (
        <div className="mb-[16px] px-[16px] py-[12px] rounded-xl bg-red-50 border border-red-200 text-[13px] text-red-700 flex items-center justify-between gap-[12px]">
          <span>{error}</span>
          {error.includes("Upgrade") && (
            <Link
              href="/#pricing"
              className="shrink-0 px-[14px] py-[6px] rounded-xl bg-accent text-white text-[12px] font-medium no-underline hover:bg-accent transition-all duration-200"
            >
              View Plans
            </Link>
          )}
        </div>
      )}

      <DraftReviewStep
        draft={draft}
        onChange={handleDraftChange}
        onBack={handleBack}
        onPublish={handlePublish}
        isPublishing={isPublishing}
        onSaveDraft={handleSaveDraft}
        isSaving={isSaving}
      />
    </div>
  );
}
