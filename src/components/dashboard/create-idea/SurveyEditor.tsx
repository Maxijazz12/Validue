"use client";

import { useState } from "react";
import {
  questionId,
  type DraftQuestion,
  type DraftAudience,
  type EvidenceCategory,
} from "@/lib/ai/types";
import { regenerateQuestion as regenerateQuestionAPI } from "@/lib/ai/generate-question";
import { buildSyntheticQuestion } from "@/lib/ai/repair-campaign-draft";

/* ─── Props ─── */

interface SurveyEditorProps {
  questions: DraftQuestion[];
  onChange: (questions: DraftQuestion[]) => void;
  onSwapBaseline: (questionId: string) => void;
  scribbleText: string;
  campaignSummary?: string;
  assumptions?: string[];
  audience?: DraftAudience;
}

/* ─── QuestionCard ─── */

function QuestionCard({
  question,
  index,
  total,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onRegenerate,
  onAIRewrite,
  onSwapBaseline,
  isRewriting = false,
}: {
  question: DraftQuestion;
  index: number;
  total: number;
  onUpdate: (q: DraftQuestion) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRegenerate: () => void;
  onAIRewrite: () => void;
  onSwapBaseline: () => void;
  isRewriting?: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(question.text);

  function saveEdit() {
    if (editText.trim()) {
      onUpdate({ ...question, text: editText.trim() });
    }
    setIsEditing(false);
  }

  return (
    <div className="group flex flex-col md:flex-row gap-[16px] p-[20px] rounded-[24px] border border-border-light bg-white shadow-sm hover:border-border-light hover:shadow-[0_8px_24px_rgba(0,0,0,0.04)] transition-all duration-300 relative overflow-hidden">
      {/* Numbering */}
      <div className="flex-shrink-0 w-[32px] h-[32px] rounded-full bg-white flex items-center justify-center border border-border-light shadow-sm relative z-10">
        <span className="font-mono text-[11px] font-bold text-text-primary">
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 relative z-10">
        {/* Type badge */}
        <div className="flex items-center gap-[12px] mb-[12px]">
          <span
            className={`font-mono text-[11px] font-medium uppercase tracking-wide px-[10px] py-[4px] rounded-full shadow-sm ${
              question.isBaseline
                ? "bg-brand/10 text-brand border border-brand/20"
                : question.type === "open"
                  ? "bg-accent/5 text-text-primary border border-accent/10"
                  : "bg-success/10 text-success border border-success/20"
            }`}
          >
            {question.isBaseline
              ? "[ BASELINE_NODE ]"
              : question.type === "open"
                ? "[ OPEN_NODE ]"
                : "[ MULTI_NODE ]"}
          </span>
          {question.category && (
            <span className="font-mono text-[11px] text-text-muted uppercase tracking-widest">
              {"// "}{question.category}
            </span>
          )}
        </div>

        {/* Question text */}
        {isEditing ? (
          <div className="flex flex-col gap-[12px]">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={2}
              autoFocus
              className="w-full px-[16px] py-[12px] rounded-[12px] border border-border-muted bg-white text-[15px] font-medium text-text-primary font-sans outline-none resize-none focus:border-accent focus:shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-all"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  saveEdit();
                }
                if (e.key === "Escape") {
                  setEditText(question.text);
                  setIsEditing(false);
                }
              }}
            />
            <div className="flex gap-[8px]">
              <button
                onClick={saveEdit}
                className="font-mono text-[11px] font-medium uppercase tracking-wide text-white px-[16px] py-[8px] rounded-full bg-accent hover:bg-brand hover:shadow-[0_0_12px_rgba(229,101,78,0.3)] transition-all cursor-pointer border-none"
              >
                [ COMMIT ]
              </button>
              <button
                onClick={() => {
                  setEditText(question.text);
                  setIsEditing(false);
                }}
                className="font-mono text-[11px] font-medium uppercase tracking-wide text-text-muted px-[16px] py-[8px] rounded-full hover:text-text-primary hover:bg-white transition-all cursor-pointer border border-transparent hover:border-border-light"
              >
                [ REVERT ]
              </button>
            </div>
          </div>
        ) : (
          <p
            className="text-[16px] font-medium tracking-tight text-text-primary leading-[1.5] cursor-pointer hover:text-brand transition-colors"
            onClick={() => {
              if (question.isBaseline) return;
              setEditText(question.text);
              setIsEditing(true);
            }}
          >
            {question.text}
          </p>
        )}

        {/* Options for MC questions */}
        {question.options && question.options.length > 0 && !isEditing && (
          <div className="flex flex-wrap gap-[6px] mt-[10px]">
            {question.options.map((opt) => (
              <span
                key={opt}
                className="text-[12px] px-[10px] py-[4px] rounded-full border border-border-light text-text-secondary bg-bg-muted"
              >
                {opt}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 flex flex-col gap-[4px] opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Move up */}
        <button
          onClick={onMoveUp}
          disabled={index === 0}
          className="w-[28px] h-[28px] rounded-md flex items-center justify-center text-slate hover:bg-bg-muted hover:text-text-secondary disabled:opacity-20 disabled:hover:bg-transparent transition-all cursor-pointer border-none bg-transparent"
          title="Move up"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>

        {/* Move down */}
        <button
          onClick={onMoveDown}
          disabled={index === total - 1}
          className="w-[28px] h-[28px] rounded-md flex items-center justify-center text-slate hover:bg-bg-muted hover:text-text-secondary disabled:opacity-20 disabled:hover:bg-transparent transition-all cursor-pointer border-none bg-transparent"
          title="Move down"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {/* Regenerate (free, deterministic) */}
        {!question.isBaseline && (
          <button
            onClick={onRegenerate}
            className="w-[28px] h-[28px] rounded-md flex items-center justify-center text-slate hover:bg-bg-muted hover:text-text-secondary transition-all cursor-pointer border-none bg-transparent"
            title="Regenerate from templates (free)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </button>
        )}

        {/* AI Rewrite (premium, API call) */}
        {!question.isBaseline && (
          <button
            onClick={onAIRewrite}
            disabled={isRewriting}
            className={`w-[28px] h-[28px] rounded-md flex items-center justify-center text-[#a855f7] hover:bg-[#f3e8ff] transition-all cursor-pointer border-none bg-transparent disabled:opacity-40 ${isRewriting ? "animate-spin" : ""}`}
            title="AI rewrite (uses credits)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
              <path d="M19 15l.5 1.5L21 17.5l-1.5.5L19 19.5l-.5-1.5L17 17.5l1.5-.5L19 15z" />
            </svg>
          </button>
        )}

        {/* Swap baseline */}
        {question.isBaseline && (
          <button
            onClick={onSwapBaseline}
            className="w-[28px] h-[28px] rounded-md flex items-center justify-center text-brand hover:bg-brand/10 transition-all cursor-pointer border-none bg-transparent"
            title="Swap baseline question"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="17 1 21 5 17 9" />
              <path d="M3 11V9a4 4 0 0 1 4-4h14" />
              <polyline points="7 23 3 19 7 15" />
              <path d="M21 13v2a4 4 0 0 1-4 4H3" />
            </svg>
          </button>
        )}

        {/* Delete */}
        <button
          onClick={onDelete}
          className="w-[28px] h-[28px] rounded-md flex items-center justify-center text-slate hover:bg-red-50 hover:text-red-500 transition-all cursor-pointer border-none bg-transparent"
          title="Delete question"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/* ─── Main Component ─── */

export default function SurveyEditor({
  questions,
  onChange,
  onSwapBaseline,
  scribbleText,
  campaignSummary,
  assumptions,
  audience,
}: SurveyEditorProps) {
  const openQs = questions.filter((q) => q.section === "open");
  const followupQs = questions.filter((q) => q.section === "followup");
  const baselineQs = questions.filter((q) => q.section === "baseline");

  function updateQuestion(id: string, updated: DraftQuestion) {
    onChange(questions.map((q) => (q.id === id ? updated : q)));
  }

  function deleteQuestion(id: string) {
    onChange(questions.filter((q) => q.id !== id));
  }

  function moveQuestion(id: string, direction: "up" | "down") {
    const idx = questions.findIndex((q) => q.id === id);
    if (idx === -1) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= questions.length) return;
    const next = [...questions];
    [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
    onChange(next);
  }

  /* ─── Deterministic regenerate (free, instant) ─── */
  function handleRegenerate(id: string) {
    const q = questions.find((qn) => qn.id === id);
    if (!q || q.isBaseline) return;
    const assumptionIndex = q.assumptionIndex ?? 0;
    const fallbackCategory: EvidenceCategory =
      q.category ?? (q.section === "followup" ? "willingness" : "behavior");
    const replacement = buildSyntheticQuestion(
      assumptions?.[assumptionIndex] ?? campaignSummary ?? scribbleText,
      campaignSummary ?? scribbleText,
      fallbackCategory,
      assumptionIndex
    );

    onChange(
      questions.map((qn) =>
        qn.id === id
          ? {
              ...qn,
              text: replacement.text,
              type: replacement.type,
              options: replacement.options,
              anchors: replacement.anchors,
              category: replacement.category,
            }
          : qn
      )
    );
  }

  /* ─── AI rewrite (premium, API call) ─── */
  const [rewritingId, setRewritingId] = useState<string | null>(null);
  const [rewriteError, setRewriteError] = useState<string | null>(null);

  async function handleAIRewrite(id: string) {
    const q = questions.find((qn) => qn.id === id);
    if (!q || q.isBaseline) return;
    setRewritingId(id);
    setRewriteError(null);
    try {
      const replacement = await regenerateQuestionAPI(
        scribbleText,
        q,
        questions,
        campaignSummary,
        assumptions,
        audience
      );
      onChange(
        questions.map((qn) =>
          qn.id === id
            ? {
                ...qn,
                text: replacement.text,
                type: replacement.type,
                options: replacement.options,
                anchors: replacement.anchors,
                category: replacement.category,
              }
            : qn
        )
      );
    } catch {
      setRewriteError("AI rewrite failed — try again or edit manually.");
      setTimeout(() => setRewriteError(null), 4000);
    } finally {
      setRewritingId(null);
    }
  }

  function addQuestion(section: "open" | "followup") {
    const newQ: DraftQuestion = {
      id: questionId(),
      text: "New question — click to edit",
      type: "open",
      options: null,
      section,
      isBaseline: false,
    };
    const sectionQs = questions.filter((q) => q.section === section);
    const lastIdx =
      sectionQs.length > 0
        ? questions.indexOf(sectionQs[sectionQs.length - 1])
        : questions.length - 1;
    const next = [...questions];
    next.splice(lastIdx + 1, 0, newQ);
    onChange(next);
  }

  function renderSection(
    title: string,
    subtitle: string,
    sectionQs: DraftQuestion[],
    sectionKey: "open" | "followup" | "baseline"
  ) {
    return (
      <div>
        <div className="flex items-center justify-between mb-[16px]">
          <div>
            <h3 className="font-mono text-[11px] font-bold tracking-widest text-text-primary">
              {title}
            </h3>
            <p className="font-mono text-[11px] font-medium uppercase tracking-wide text-text-muted mt-[4px]">{subtitle}</p>
          </div>
          {sectionKey !== "baseline" && (
            <button
              onClick={() => addQuestion(sectionKey)}
              className="font-mono text-[11px] font-medium uppercase tracking-wide text-text-primary px-[14px] py-[8px] rounded-full border border-border-muted hover:border-accent bg-white transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md"
            >
              [ + ADD_NODE ]
            </button>
          )}
        </div>

        <div className="flex flex-col gap-[8px]">
          {sectionQs.map((q) => (
            <QuestionCard
              key={q.id}
              question={q}
              index={questions.indexOf(q)}
              total={questions.length}
              onUpdate={(updated) => updateQuestion(q.id, updated)}
              onDelete={() => deleteQuestion(q.id)}
              onMoveUp={() => moveQuestion(q.id, "up")}
              onMoveDown={() => moveQuestion(q.id, "down")}
              onRegenerate={() => handleRegenerate(q.id)}
              onAIRewrite={() => handleAIRewrite(q.id)}
              isRewriting={rewritingId === q.id}
              onSwapBaseline={() => onSwapBaseline(q.id)}
            />
          ))}
          {sectionQs.length === 0 && (
            <p className="text-[13px] text-slate py-[16px] text-center">
              No questions in this section.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-border-light shadow-card rounded-[32px] p-[32px] md:p-[40px]">
      <div className="flex items-end justify-between mb-[28px]">
        <div>
          <h2 className="font-mono text-[12px] font-medium uppercase tracking-wide text-text-primary mb-[8px]">
            [ 02: VALIDATION TOPOLOGY ]
          </h2>
          <p className="font-mono text-[11px] uppercase font-medium tracking-wide text-text-muted">
            Edit node sequences or run automated regeneration protocol.
          </p>
        </div>
      </div>

      {rewriteError && (
        <div className="mb-[24px] px-[20px] py-[16px] rounded-[16px] bg-error/10 border border-error/20">
          <span className="font-mono text-[11px] font-medium uppercase tracking-wide text-error">[ ERR: {rewriteError} ]</span>
        </div>
      )}

      <div className="flex flex-col gap-[40px]">
        {renderSection(
          "[ CORE_QUALITATIVE ]",
          "Open-ended probes analyzing core pain points.",
          openQs,
          "open"
        )}
        {renderSection(
          "[ TARGETED_PROBES ]",
          "Follow-up sequence evaluating solution specific behaviors.",
          followupQs,
          "followup"
        )}
        {renderSection(
          "[ STANDARDIZED_METRICS ]",
          "Immutable quant signals pulled from standardized library.",
          baselineQs,
          "baseline"
        )}
      </div>
    </div>
  );
}
