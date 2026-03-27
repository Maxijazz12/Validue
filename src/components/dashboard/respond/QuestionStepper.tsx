"use client";

import { useState, useCallback, useTransition } from "react";
import ProgressBar from "./ProgressBar";
import OpenEndedAnswer, { MIN_CHARS } from "./OpenEndedAnswer";
import MultipleChoiceAnswer from "./MultipleChoiceAnswer";
import Button from "@/components/ui/Button";
import { saveAnswer, submitResponse } from "@/app/dashboard/the-wall/[id]/actions";
import type { AnswerMetadata } from "@/app/dashboard/the-wall/[id]/actions";

export type Question = {
  id: string;
  text: string;
  type: "open" | "multiple_choice";
  sortOrder: number;
  options: string[] | null;
  isBaseline: boolean;
  category: string | null;
};

type StoredAnswer = {
  text: string;
  pasteCount: number;
  timeSpentMs: number;
};

type QuestionStepperProps = {
  questions: Question[];
  responseId: string;
  initialAnswers?: Map<string, StoredAnswer>;
  onSubmitted: () => void;
};

function getQuestionLabel(q: Question): string {
  if (q.isBaseline) return "Baseline";
  if (q.type === "multiple_choice") return "Multiple choice";
  return "Open-ended";
}

export default function QuestionStepper({
  questions,
  responseId,
  initialAnswers,
  onSubmitted,
}: QuestionStepperProps) {
  // Find first unanswered question for resume
  const firstUnanswered = initialAnswers
    ? questions.findIndex((q) => !initialAnswers.has(q.id))
    : 0;

  const [currentIndex, setCurrentIndex] = useState(
    firstUnanswered === -1 ? questions.length - 1 : firstUnanswered
  );
  const [answers, setAnswers] = useState<Map<string, StoredAnswer>>(
    initialAnswers || new Map()
  );
  const [currentText, setCurrentText] = useState(
    () => initialAnswers?.get(questions[currentIndex]?.id)?.text || ""
  );
  const [pasteCount, setPasteCount] = useState(0);
  const [timeSpentMs, setTimeSpentMs] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const question = questions[currentIndex];
  const isLast = currentIndex === questions.length - 1;

  const isValid =
    question.type === "open"
      ? currentText.trim().length >= MIN_CHARS
      : currentText.trim().length > 0;

  const handleSaveAndNext = useCallback(() => {
    setError(null);
    const metadata: AnswerMetadata = {
      pasteDetected: pasteCount > 0,
      pasteCount,
      timeSpentMs,
      charCount: currentText.length,
    };

    startTransition(async () => {
      try {
        await saveAnswer(responseId, question.id, currentText, metadata);

        // Store locally
        const updated = new Map(answers);
        updated.set(question.id, {
          text: currentText,
          pasteCount,
          timeSpentMs,
        });
        setAnswers(updated);

        if (isLast) {
          await submitResponse(responseId);
          onSubmitted();
        } else {
          const nextIndex = currentIndex + 1;
          const nextQ = questions[nextIndex];
          setCurrentIndex(nextIndex);
          setCurrentText(updated.get(nextQ.id)?.text || "");
          setPasteCount(0);
          setTimeSpentMs(0);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }, [
    responseId,
    question,
    currentText,
    pasteCount,
    timeSpentMs,
    answers,
    isLast,
    currentIndex,
    questions,
    onSubmitted,
  ]);

  const handleBack = useCallback(() => {
    if (currentIndex === 0) return;
    // Save current state locally before going back
    const updated = new Map(answers);
    updated.set(question.id, {
      text: currentText,
      pasteCount,
      timeSpentMs,
    });
    setAnswers(updated);

    const prevIndex = currentIndex - 1;
    const prevQ = questions[prevIndex];
    setCurrentIndex(prevIndex);
    setCurrentText(updated.get(prevQ.id)?.text || "");
    setPasteCount(updated.get(prevQ.id)?.pasteCount || 0);
    setTimeSpentMs(0);
  }, [currentIndex, answers, question, currentText, pasteCount, timeSpentMs, questions]);

  const handleTimeUpdate = useCallback((ms: number) => {
    setTimeSpentMs(ms);
  }, []);

  if (!question) return null;

  return (
    <div>
      <ProgressBar
        currentIndex={currentIndex}
        total={questions.length}
        questionLabel={getQuestionLabel(question)}
      />

      {/* Question text */}
      <div className="bg-white border border-[#ebebeb] rounded-2xl p-[24px] mb-[16px]">
        <p className="text-[16px] font-medium text-[#111111] leading-[1.5]">
          {question.text}
        </p>
      </div>

      {/* Answer input */}
      <div className="mb-[20px]">
        {question.type === "open" ? (
          <OpenEndedAnswer
            key={question.id}
            value={currentText}
            onChange={setCurrentText}
            onPaste={() => setPasteCount((c) => c + 1)}
            onTimeUpdate={handleTimeUpdate}
          />
        ) : (
          <MultipleChoiceAnswer
            key={question.id}
            options={question.options || []}
            value={currentText}
            onChange={setCurrentText}
            onTimeUpdate={handleTimeUpdate}
          />
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="text-[13px] text-[#ef4444] mb-[12px] p-[12px] rounded-xl bg-[#ef4444]/5">
          {error}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between gap-[12px]">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentIndex === 0}
          className={`px-[20px] py-[12px] text-[14px] ${
            currentIndex === 0 ? "opacity-40 cursor-not-allowed" : ""
          }`}
        >
          Back
        </Button>

        <Button
          onClick={handleSaveAndNext}
          disabled={!isValid || isPending}
          className={`px-[24px] py-[12px] text-[14px] ${
            !isValid || isPending ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {isPending
            ? isLast
              ? "Submitting..."
              : "Saving..."
            : isLast
              ? "Submit"
              : "Next"}
        </Button>
      </div>
    </div>
  );
}
