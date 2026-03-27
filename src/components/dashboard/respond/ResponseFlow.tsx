"use client";

import { useState, useTransition, useCallback } from "react";
import CampaignDetail from "./CampaignDetail";
import QuestionStepper from "./QuestionStepper";
import SubmissionConfirmation from "./SubmissionConfirmation";
import { startResponse } from "@/app/dashboard/the-wall/[id]/actions";
import type { Question } from "./QuestionStepper";

type ResponseFlowProps = {
  campaign: {
    id: string;
    title: string;
    description: string | null;
    category: string | null;
    tags: string[];
    estimatedMinutes: number;
    rewardAmount: number;
    currentResponses: number;
    targetResponses: number;
    deadline: string | null;
    creatorName: string;
    creatorAvatar: string | null;
    bonusAvailable: boolean;
    rewardsTopAnswers: boolean;
    rewardType: string | null;
  };
  questions: Question[];
  existingResponse: { id: string; status: string } | null;
  existingAnswers: { question_id: string; text: string; metadata: Record<string, unknown> }[] | null;
  isOwnCampaign: boolean;
  isFull: boolean;
  isActive: boolean;
};

type Stage = "detail" | "responding" | "submitted";

export default function ResponseFlow({
  campaign,
  questions,
  existingResponse,
  existingAnswers,
  isOwnCampaign,
  isFull,
  isActive,
}: ResponseFlowProps) {
  // Determine initial stage
  const initialStage: Stage = existingResponse?.status === "submitted"
    ? "submitted"
    : existingResponse?.status === "in_progress"
      ? "responding"
      : "detail";

  const [stage, setStage] = useState<Stage>(initialStage);
  const [responseId, setResponseId] = useState<string | null>(
    existingResponse?.id || null
  );
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Build initial answers map from existing data
  const initialAnswers = existingAnswers
    ? new Map(
        existingAnswers.map((a) => [
          a.question_id,
          {
            text: a.text || "",
            pasteCount: 0,
            timeSpentMs: 0,
          },
        ])
      )
    : undefined;

  const openCount = questions.filter((q) => q.type === "open").length;
  const mcCount = questions.filter((q) => q.type === "multiple_choice").length;

  const handleStart = useCallback(() => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await startResponse(campaign.id);
        setResponseId(result.responseId);
        setStage("responding");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to start");
      }
    });
  }, [campaign.id]);

  const handleSubmitted = useCallback(() => {
    setStage("submitted");
  }, []);

  return (
    <div className="max-w-[640px] mx-auto">
      {error && (
        <div className="text-[13px] text-[#ef4444] mb-[16px] p-[12px] rounded-xl bg-[#ef4444]/5">
          {error}
        </div>
      )}

      {stage === "detail" && (
        <CampaignDetail
          campaign={campaign}
          questionCount={questions.length}
          openCount={openCount}
          mcCount={mcCount}
          isOwnCampaign={isOwnCampaign}
          isFull={isFull}
          hasSubmitted={existingResponse?.status === "submitted"}
          isActive={isActive}
          isLoading={isPending}
          onStart={handleStart}
        />
      )}

      {stage === "responding" && responseId && (
        <QuestionStepper
          questions={questions}
          responseId={responseId}
          initialAnswers={initialAnswers}
          onSubmitted={handleSubmitted}
        />
      )}

      {stage === "submitted" && <SubmissionConfirmation />}
    </div>
  );
}
