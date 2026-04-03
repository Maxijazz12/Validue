"use client";

import { useState, useCallback, useTransition, useEffect, useRef } from "react";
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
  anchors: string[] | null;
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
  onSubmitted: (totalTimeMs: number) => void;
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

  // Animation states
  const [showCheckFlash, setShowCheckFlash] = useState(false);
  const [slideClass, setSlideClass] = useState("question-enter");

  // Review-before-submit mode
  const [showReview, setShowReview] = useState(false);

  const question = questions[currentIndex];
  const isLast = currentIndex === questions.length - 1;

  // Total elapsed time tracking — starts when first question renders, not on component mount
  const totalStartRef = useRef(0);
  const timerStartedRef = useRef(false);
  const [totalElapsedMs, setTotalElapsedMs] = useState(0);

  useEffect(() => {
    if (timerStartedRef.current) return;
    if (!question) return;
    timerStartedRef.current = true;
    totalStartRef.current = Date.now();
    const interval = setInterval(() => {
      setTotalElapsedMs(Date.now() - totalStartRef.current);
    }, 1000);
    return () => clearInterval(interval);
  }, [question]);

  const isValid =
    question?.type === "open"
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
          // Show review before final submit
          setShowReview(true);
        } else {
          // Celebration animation
          setShowCheckFlash(true);
          setSlideClass("question-exit");

          setTimeout(() => {
            const nextIndex = currentIndex + 1;
            const nextQ = questions[nextIndex];
            setCurrentIndex(nextIndex);
            setCurrentText(updated.get(nextQ.id)?.text || "");
            setPasteCount(0);
            setTimeSpentMs(0);
            setSlideClass("question-enter");
            setShowCheckFlash(false);
          }, 300);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "We couldn't save that answer. Try again?");
      }
    });
  }, [
    responseId, question, currentText, pasteCount, timeSpentMs,
    answers, isLast, currentIndex, questions,
  ]);

  const handleFinalSubmit = useCallback(() => {
    startTransition(async () => {
      try {
        await submitResponse(responseId);
        onSubmitted(Date.now() - totalStartRef.current);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Submission failed. Try again?");
        setShowReview(false);
      }
    });
  }, [responseId, onSubmitted]);

  const handleBack = useCallback(() => {
    if (currentIndex === 0) return;
    const updated = new Map(answers);
    updated.set(question.id, { text: currentText, pasteCount, timeSpentMs });
    setAnswers(updated);

    setSlideClass("question-exit");
    setTimeout(() => {
      const prevIndex = currentIndex - 1;
      const prevQ = questions[prevIndex];
      setCurrentIndex(prevIndex);
      setCurrentText(updated.get(prevQ.id)?.text || "");
      setPasteCount(updated.get(prevQ.id)?.pasteCount || 0);
      setTimeSpentMs(0);
      setSlideClass("question-enter");
    }, 250);
  }, [currentIndex, answers, question, currentText, pasteCount, timeSpentMs, questions]);

  const handleTimeUpdate = useCallback((ms: number) => {
    setTimeSpentMs(ms);
  }, []);

  if (!question) return null;

  // Review screen before final submit
  if (showReview) {
    return (
      <div>
        <h2 className="text-[18px] font-semibold text-text-primary mb-[4px]">Review your answers</h2>
        <p className="text-[13px] text-slate mb-[20px]">Make sure everything looks good before submitting.</p>

        <div className="flex flex-col gap-[12px] mb-[24px]">
          {questions.map((q, i) => {
            const answer = answers.get(q.id);
            return (
              <div key={q.id} className="bg-white border border-border-light rounded-xl p-[16px]">
                <div className="flex items-start justify-between gap-[12px]">
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-slate mb-[4px]">Question {i + 1}</p>
                    <p className="text-[14px] font-medium text-text-primary mb-[6px]">{q.text}</p>
                    <p className="text-[13px] text-text-secondary whitespace-pre-wrap">
                      {answer?.text || <span className="italic text-border-muted">No answer</span>}
                    </p>
                  </div>
                  <button
                    onClick={() => { setShowReview(false); setCurrentIndex(i); setCurrentText(answer?.text || ""); }}
                    className="text-[12px] text-slate hover:text-text-primary bg-transparent border-none cursor-pointer shrink-0 transition-colors"
                  >
                    Edit
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {error && (
          <div className="font-mono text-[11px] text-error tracking-wide font-medium uppercase mb-[12px] p-[12px] rounded-[12px] bg-error/5 border border-error/10">
            [ ERROR: {error.toUpperCase()} ]
          </div>
        )}

        <div className="flex items-center justify-between gap-[12px]">
          <Button variant="outline" onClick={() => setShowReview(false)} className="px-[20px] py-[12px] font-mono text-[11px] font-medium uppercase tracking-wide border-black/10 hover:border-black/30 w-full sm:w-auto">
            [ RETURN ]
          </Button>
          <Button
            onClick={handleFinalSubmit}
            disabled={isPending}
            className={`px-[24px] py-[12px] font-mono text-[11px] font-medium uppercase tracking-wide !bg-accent !text-white w-full sm:w-auto ${isPending ? "opacity-50 cursor-not-allowed" : "hover:!bg-accent-dark hover:shadow-[0_8px_24px_rgba(28,25,23,0.2)]"}`}
          >
            {isPending ? "[ SUBMITTING_PAYLOAD... ]" : "[ INITIATE_TRANSFER ]"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Checkmark flash overlay */}
      {showCheckFlash && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="check-flash">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#E5654E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
        </div>
      )}

      <ProgressBar
        currentIndex={currentIndex}
        total={questions.length}
        questionLabel={getQuestionLabel(question)}
        elapsedMs={totalElapsedMs}
      />

      {/* Question text with slide animation */}
      <div className={slideClass}>
        <div className="bg-white border border-border-light shadow-card-sm rounded-[20px] p-[24px] mb-[20px] relative overflow-hidden">
          <div className="absolute top-0 left-[15%] right-[15%] h-[1px] bg-gradient-to-r from-transparent via-accent/10 to-transparent" />
          <p className="text-[18px] font-medium tracking-tight text-text-primary leading-[1.4] m-0">
            {question.text}
          </p>
        </div>

        {/* Answer input */}
        <div className="mb-[24px]">
          {question.type === "open" ? (
            <OpenEndedAnswer
              key={question.id}
              value={currentText}
              onChange={setCurrentText}
              onPaste={() => setPasteCount((c) => c + 1)}
              onTimeUpdate={handleTimeUpdate}
              anchors={question.anchors ?? undefined}
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
      </div>

      {/* Error */}
      {error && (
        <div className="font-mono text-[11px] text-error tracking-wide font-medium uppercase mb-[12px] p-[12px] rounded-xl bg-error/5 border border-error/10">
          [ ERROR: {error.toUpperCase()} ]
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between gap-[12px]">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentIndex === 0}
          className={`px-[20px] py-[12px] font-mono text-[11px] font-medium uppercase tracking-wide border-black/10 transition-colors w-full sm:w-auto ${
            currentIndex === 0 ? "opacity-40 cursor-not-allowed" : "hover:border-black/30 bg-white"
          }`}
        >
          [ PREVIOUS_NODE ]
        </Button>

        <Button
          onClick={handleSaveAndNext}
          disabled={!isValid || isPending}
          className={`px-[24px] py-[12px] font-mono text-[11px] font-medium uppercase tracking-wide transition-all duration-300 w-full sm:w-auto ${
            !isValid || isPending 
              ? "opacity-50 cursor-not-allowed bg-black/5 text-text-muted border border-black/5" 
              : "!bg-accent !text-white hover:!bg-accent-dark hover:shadow-[0_8px_24px_rgba(28,25,23,0.2)]"
          }`}
        >
          {isPending
            ? "[ WRITING_DATA... ]"
            : isLast
              ? "[ REVIEW_PAYLOAD ]"
              : "[ NEXT_NODE ]"}
        </Button>
      </div>
    </div>
  );
}
