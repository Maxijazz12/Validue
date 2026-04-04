"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { startupQuotes } from "@/lib/constants";
import type { ReciprocalAssignment } from "@/app/dashboard/ideas/new/reciprocal-actions";
import { saveReciprocalAnswer } from "@/app/dashboard/ideas/new/reciprocal-actions";

/* ─── Types ─── */

type Props = {
  /** null = still loading tier, undefined = paid (no assignments needed) */
  assignments: ReciprocalAssignment[] | null;
  /** Called when all reciprocal assignments are completed */
  onReciprocalComplete: () => void;
};

/* ─── Progress Stages (shown for paid tier / skeleton) ─── */

const PROGRESS_STAGES = [
  { label: "Reading", icon: "read" },
  { label: "Questions", icon: "questions" },
  { label: "Audience", icon: "audience" },
  { label: "Quality", icon: "quality" },
  { label: "Polish", icon: "polish" },
] as const;

/* ─── Main Component ─── */

export default function GeneratingStep({ assignments, onReciprocalComplete }: Props) {
  const isFreeWithAssignments = assignments && assignments.length > 0;
  const [flowComplete, setFlowComplete] = useState(false);

  const handleComplete = useCallback(() => {
    setFlowComplete(true);
    onReciprocalComplete();
  }, [onReciprocalComplete]);

  // Show completion state briefly before parent transitions to review
  if (flowComplete) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-[fadeUp_0.4s_cubic-bezier(0.16,1,0.3,1)_forwards]">
        <div className="w-[48px] h-[48px] rounded-full bg-success/10 flex items-center justify-center mb-[16px]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p className="font-mono text-[11px] font-medium uppercase tracking-wide text-success">
          Done
        </p>
        <p className="text-[13px] text-text-muted mt-[8px]">
          Loading your campaign draft...
        </p>
      </div>
    );
  }

  if (isFreeWithAssignments) {
    return (
      <ReciprocalFlow
        assignments={assignments}
        onComplete={handleComplete}
      />
    );
  }

  return <PaidGeneratingView />;
}

/* ═══════════════════════════════════════════════════════════════════════
 * Paid / Non-gate Generating View (original trivia + skeleton)
 * ═══════════════════════════════════════════════════════════════════════ */

function PaidGeneratingView() {
  const [factIndex, setFactIndex] = useState(0);
  const [fading, setFading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setFactIndex(Math.floor(Math.random() * startupQuotes.length));
      setMounted(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setStageIndex((prev) => {
        if (prev >= 3) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const showNext = useCallback(() => {
    setFading(true);
    setTimeout(() => {
      setFactIndex((prev) => {
        let next;
        do {
          next = Math.floor(Math.random() * startupQuotes.length);
        } while (next === prev && startupQuotes.length > 1);
        return next;
      });
      setFading(false);
    }, 300);
  }, []);

  useEffect(() => {
    const interval = setInterval(showNext, 5000);
    return () => clearInterval(interval);
  }, [showNext]);

  const quote = startupQuotes[factIndex];
  const progressPercent = ((stageIndex + 1) / PROGRESS_STAGES.length) * 100;

  return (
    <div
      className={`flex flex-col items-center justify-center min-h-[60vh] transition-opacity duration-500 ${
        mounted ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Stage stepper */}
      <div className="w-full max-w-[600px] mb-[64px]">
        <div className="flex items-center justify-between mb-[12px]">
          {PROGRESS_STAGES.map((stage, i) => {
            const isComplete = i < stageIndex;
            const isCurrent = i === stageIndex;
            return (
              <div key={i} className="flex flex-col items-center gap-[12px] flex-1">
                <div
                  className={`w-[8px] h-[8px] md:w-[12px] md:h-[12px] rounded-full flex items-center justify-center transition-all duration-300 ${
                    isComplete
                      ? "bg-success shadow-[0_0_12px_rgba(44,160,90,0.8)]"
                      : isCurrent
                        ? "bg-brand animate-pulse shadow-[0_0_16px_rgba(229,101,78,0.25)]"
                        : "bg-border-muted"
                  }`}
                />
                <span className={`font-mono text-[9px] md:text-[10px] uppercase tracking-[0.15em] text-center transition-colors duration-200 ${
                  isComplete ? "text-success" : isCurrent ? "text-text-primary font-bold" : "text-border-muted"
                }`}>
                  {stage.label}
                </span>
              </div>
            );
          })}
        </div>
        <div className="h-[3px] rounded-full bg-bg-muted overflow-hidden mt-2">
          <div
            className="h-full rounded-full bg-accent transition-all duration-1000 ease-[cubic-bezier(0.2,0.9,0.3,1)]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Skeleton glass preview */}
      <div className="w-full max-w-[500px] mb-[40px] rounded-[20px] md:rounded-[28px] border border-border-light p-[20px] md:p-[28px] bg-white shadow-card relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand/5 to-transparent h-[150%] -translate-y-full animate-[scan_3s_linear_infinite]" />
        <div className={`h-[24px] rounded-[6px] mb-[12px] transition-all duration-500 ${
          stageIndex >= 0 ? "bg-accent/20 w-[80%]" : "bg-accent/5 w-[80%]"
        }`} />
        <div className={`h-[12px] rounded-[4px] mb-[8px] transition-all duration-500 delay-100 ${
          stageIndex >= 1 ? "bg-text-muted/30 w-full" : "bg-accent/5 w-full"
        }`} />
        <div className={`h-[12px] rounded-[4px] mb-[24px] transition-all duration-500 delay-200 ${
          stageIndex >= 1 ? "bg-text-muted/30 w-[60%]" : "bg-accent/5 w-[60%]"
        }`} />
        <div className="flex flex-col gap-[12px] mb-[24px] pt-[24px] border-t border-white/50">
          {[0, 1, 2].map((qi) => (
            <div key={qi} className={`h-[14px] rounded-[4px] transition-all duration-500 ${
              stageIndex >= 2 ? "bg-accent/10" : "bg-accent/5"
            }`} style={{ width: `${85 - qi * 10}%`, transitionDelay: `${qi * 150}ms` }} />
          ))}
        </div>
        <div className="flex gap-[8px]">
          {[0, 1].map((ti) => (
            <div key={ti} className={`h-[24px] rounded-full transition-all duration-500 ${
              stageIndex >= 3 ? "bg-success/20" : "bg-accent/5"
            }`} style={{ width: `${80 + ti * 20}px`, transitionDelay: `${ti * 100}ms` }} />
          ))}
        </div>
      </div>

      {stageIndex >= 3 && (
        <p className="font-mono text-[11px] font-medium uppercase tracking-wide text-text-muted mb-[24px] animate-pulse">
          Almost there — finalizing your draft
        </p>
      )}

      {/* Fact card */}
      <div className="w-full max-w-[520px] text-center relative mt-12 border-t border-black/5 pt-[24px]">
        <div className="font-mono text-[9px] font-bold tracking-[0.2em] text-text-muted uppercase mb-[16px]">
          While you wait
        </div>
        <div
          className={`font-mono text-[13px] leading-[1.8] text-text-primary font-medium min-h-[60px] transition-opacity duration-300 ${
            fading ? "opacity-0" : "opacity-100"
          }`}
        >
          &ldquo;{quote.text}&rdquo;
        </div>
        <div
          className={`text-[12px] text-text-muted mt-[12px] transition-opacity duration-300 ${
            fading ? "opacity-0" : "opacity-100"
          }`}
        >
          — {quote.source}
        </div>
        <button
          onClick={showNext}
          type="button"
          className="mt-[24px] bg-transparent border-none text-text-muted text-[10px] uppercase font-mono font-medium cursor-pointer hover:text-text-primary transition-all duration-200 tracking-wide"
        >
          Another one
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
 * Free-Tier Reciprocal Flow — answer questions while AI generates
 * ═══════════════════════════════════════════════════════════════════════ */

type QuestionItem = {
  assignmentIndex: number;
  questionIndex: number;
  question: ReciprocalAssignment["questions"][number];
  campaignTitle: string;
  campaignId: string;
  responseId: string;
};

function flattenAssignments(assignments: ReciprocalAssignment[]): QuestionItem[] {
  const items: QuestionItem[] = [];
  for (let ai = 0; ai < assignments.length; ai++) {
    const a = assignments[ai];
    for (let qi = 0; qi < a.questions.length; qi++) {
      items.push({
        assignmentIndex: ai,
        questionIndex: qi,
        question: a.questions[qi],
        campaignTitle: a.campaignTitle,
        campaignId: a.campaignId,
        responseId: a.responseId,
      });
    }
  }
  return items;
}

function ReciprocalFlow({
  assignments,
  onComplete,
}: {
  assignments: ReciprocalAssignment[];
  onComplete: () => void;
}) {
  const allQuestions = useMemo(() => flattenAssignments(assignments), [assignments]);
  const totalQuestions = allQuestions.length;
  const totalAssignments = assignments.length;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [completedAssignments, setCompletedAssignments] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skippable, setSkippable] = useState(false);
  const questionStartTime = useRef(0);

  useEffect(() => {
    questionStartTime.current = Date.now();
    requestAnimationFrame(() => setMounted(true));
  }, []);

  // Reset timer when question changes
  useEffect(() => {
    questionStartTime.current = Date.now();
  }, [currentIndex]);

  const current = allQuestions[currentIndex];
  const isLastQuestion = currentIndex >= totalQuestions - 1;
  const isMultipleChoice = current?.question.type === "multiple_choice";

  const handleSubmitAnswer = useCallback(
    async (answerText: string) => {
      if (!current || saving) return;
      setSaving(true);
      setError(null);

      const timeSpentMs = Date.now() - questionStartTime.current;
      const result = await saveReciprocalAnswer(
        current.responseId,
        current.question.id,
        answerText,
        { timeSpentMs }
      );

      if (!result.success) {
        setError(result.error ?? "We couldn't save that answer. Please try again.");
        setSkippable(true);
        setSaving(false);
        return;
      }

      // Track completed assignments
      if (result.autoSubmitted) {
        setCompletedAssignments((prev) => prev + 1);
      }

      if (isLastQuestion) {
        // All questions answered — signal completion
        onComplete();
      } else {
        // Transition to next question
        setTransitioning(true);
        setTimeout(() => {
          setCurrentIndex((prev) => prev + 1);
          setAnswer("");
          setSaving(false);
          setTransitioning(false);
        }, 300);
      }
    },
    [current, saving, isLastQuestion, onComplete]
  );

  const handleSkipCampaign = useCallback(() => {
    if (!current) return;
    const currentAssignment = current.assignmentIndex;
    // Find the first question from the next assignment
    const nextIndex = allQuestions.findIndex(
      (q, i) => i > currentIndex && q.assignmentIndex !== currentAssignment
    );
    setError(null);
    setSkippable(false);
    if (nextIndex === -1) {
      // No more assignments — complete the flow
      onComplete();
    } else {
      setTransitioning(true);
      setTimeout(() => {
        setCurrentIndex(nextIndex);
        setAnswer("");
        setSaving(false);
        setTransitioning(false);
      }, 300);
    }
  }, [current, currentIndex, allQuestions, onComplete]);

  const handleMCQSelect = useCallback(
    (option: string) => {
      handleSubmitAnswer(option);
    },
    [handleSubmitAnswer]
  );

  const handleOpenSubmit = useCallback(() => {
    if (answer.trim().length < 10) return;
    handleSubmitAnswer(answer.trim());
  }, [answer, handleSubmitAnswer]);

  if (!current) return null;

  return (
    <div
      className={`flex flex-col items-center justify-center min-h-[60vh] transition-opacity duration-500 ${
        mounted ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Header */}
      <div className="w-full max-w-[560px] text-center mb-[32px]">
        <div className="font-mono text-[9px] font-bold tracking-[0.2em] text-text-muted uppercase mb-[8px]">
          Building your campaign
        </div>
        <p className="font-mono text-[12px] text-text-secondary leading-relaxed">
          While we build your survey, help other founders by answering a few questions.
          This unlocks your campaign.
        </p>
      </div>

      {error && (
        <div className="w-full max-w-[560px] mb-[20px] rounded-[14px] border border-[#ef4444]/20 bg-[#ef4444]/8 px-[14px] py-[10px] text-[13px] text-[#991b1b] flex items-center justify-between gap-[12px]">
          <span>{error}</span>
          {skippable && (
            <button
              type="button"
              onClick={handleSkipCampaign}
              className="shrink-0 px-[12px] py-[4px] rounded-full border border-[#ef4444]/30 bg-white text-[11px] font-mono font-medium uppercase tracking-wide text-[#991b1b] cursor-pointer hover:bg-[#ef4444]/10 transition-colors duration-200"
            >
              Skip campaign
            </button>
          )}
        </div>
      )}

      {/* Progress dots */}
      <div className="flex items-center gap-[8px] mb-[32px]">
        {allQuestions.map((_, i) => (
          <div
            key={i}
            className={`w-[8px] h-[8px] rounded-full transition-all duration-300 ${
              i < currentIndex
                ? "bg-success shadow-[0_0_8px_rgba(44,160,90,0.6)]"
                : i === currentIndex
                  ? "bg-accent scale-125"
                  : "bg-border-light"
            }`}
          />
        ))}
      </div>

      {/* Campaign context label */}
      <div className="w-full max-w-[520px] mb-[12px]">
        <span className="font-mono text-[9px] font-bold tracking-[0.15em] text-text-muted uppercase">
          {current.campaignTitle}
        </span>
      </div>

      {/* Question card */}
      <div
        className={`w-full max-w-[520px] rounded-[20px] md:rounded-[28px] border border-border-light px-[14px] py-[20px] md:p-[28px] bg-white shadow-card transition-all duration-300 ${
          transitioning ? "opacity-0 translate-y-[8px]" : "opacity-100 translate-y-0"
        }`}
      >
        <p className="font-mono text-[14px] font-bold text-text-primary leading-[1.7] mb-[20px]">
          {current.question.text}
        </p>

        {isMultipleChoice && current.question.options ? (
          <div className="flex flex-col gap-[8px]">
            {current.question.options.map((option, i) => (
              <button
                key={i}
                type="button"
                disabled={saving}
                onClick={() => handleMCQSelect(option)}
                className="w-full text-left px-[16px] py-[12px] rounded-[12px] border border-border-light bg-white/80 font-mono text-[12px] text-text-primary cursor-pointer hover:border-accent hover:bg-accent hover:text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {option}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-[12px]">
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Share your honest perspective..."
              rows={3}
              disabled={saving}
              className="w-full px-[16px] py-[12px] rounded-[12px] border border-border-light bg-white/80 font-mono text-[12px] text-text-primary placeholder:text-border-muted resize-none focus:outline-none focus:border-accent transition-colors duration-200 disabled:opacity-50"
            />
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] text-border-muted uppercase tracking-widest">
                {answer.trim().length < 10
                  ? `${10 - answer.trim().length} more chars needed`
                  : "Ready to submit"}
              </span>
              <button
                type="button"
                disabled={saving || answer.trim().length < 10}
                onClick={handleOpenSubmit}
                className="px-[20px] py-[8px] rounded-full bg-accent text-white font-mono text-[11px] font-medium uppercase tracking-wide border border-transparent cursor-pointer hover:bg-white hover:text-text-primary hover:border-accent transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : "Submit"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom status */}
      <div className="mt-[24px] flex items-center gap-[16px]">
        <div className="flex items-center gap-[6px]">
          <div className="w-[6px] h-[6px] rounded-full bg-success animate-pulse" />
          <span className="font-mono text-[11px] text-text-muted uppercase tracking-widest">
            Campaign generating in background
          </span>
        </div>
        <span className="font-mono text-[9px] text-border-muted">|</span>
        <span className="font-mono text-[11px] text-text-muted uppercase tracking-widest">
          {completedAssignments}/{totalAssignments} campaigns helped
        </span>
      </div>
    </div>
  );
}
