"use client";

import { useState } from "react";
import { questionId, type DraftQuestion, type DraftAudience } from "@/lib/ai/types";
import { regenerateQuestion as regenerateQuestionAPI } from "@/lib/ai/generate-question";

/* ─── Deterministic question templates (free, instant) ─── */

const TEMPLATE_OPEN: string[] = [
  "What would make you stop using your current solution and switch to something new?",
  "Describe the last time this problem really got in your way. What happened?",
  "If you could redesign how this works from scratch, what would you change first?",
  "What's the one thing about this problem that nobody talks about but everyone deals with?",
  "Walk me through a situation where this problem cost you time, money, or energy.",
  "How often do you run into this problem, and what do you usually do when it happens?",
  "What have you spent time or money on to try to solve this, even partially?",
];

const TEMPLATE_FOLLOWUP: string[] = [
  "What would your ideal solution look like? Be as specific as possible.",
  "Who else in your life or work is affected by this problem?",
  "What's the minimum this would need to do for you to give it a real shot?",
  "How would you describe this problem to a friend in one sentence?",
  "What's the biggest risk you see with a solution like this?",
  "If you had to choose between this and your current approach, what would tip the decision?",
  "What's the biggest reason you might NOT try something like this, even if it worked well?",
];

let _templateIdx = 0;

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
    <div className="group flex flex-col md:flex-row gap-[16px] p-[20px] rounded-[24px] border border-white/60 bg-white/40 shadow-sm backdrop-blur-md hover:border-white/80 hover:shadow-[0_8px_24px_rgba(0,0,0,0.04)] transition-all duration-300 relative overflow-hidden">
      {/* Numbering */}
      <div className="flex-shrink-0 w-[32px] h-[32px] rounded-full bg-white flex items-center justify-center border border-[#E7E5E4] shadow-sm relative z-10">
        <span className="font-mono text-[11px] font-bold text-[#1C1917]">
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 relative z-10">
        {/* Type badge */}
        <div className="flex items-center gap-[12px] mb-[12px]">
          <span
            className={`font-mono text-[9px] font-bold uppercase tracking-widest px-[10px] py-[4px] rounded-full shadow-sm ${
              question.isBaseline
                ? "bg-[#E5654E]/10 text-[#E5654E] border border-[#E5654E]/20"
                : question.type === "open"
                  ? "bg-[#1C1917]/5 text-[#1C1917] border border-[#1C1917]/10"
                  : "bg-[#2ca05a]/10 text-[#2ca05a] border border-[#2ca05a]/20"
            }`}
          >
            {question.isBaseline
              ? "[ BASELINE_NODE ]"
              : question.type === "open"
                ? "[ OPEN_NODE ]"
                : "[ MULTI_NODE ]"}
          </span>
          {question.category && (
            <span className="font-mono text-[9px] text-[#A8A29E] uppercase tracking-widest">
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
              className="w-full px-[16px] py-[12px] rounded-[12px] border border-[#D6D3D1] bg-white text-[15px] font-medium text-[#1C1917] font-sans outline-none resize-none focus:border-[#1C1917] focus:shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-all"
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
                className="font-mono text-[10px] font-bold uppercase tracking-widest text-white px-[16px] py-[8px] rounded-full bg-[#1C1917] hover:bg-[#E5654E] hover:shadow-[0_0_12px_rgba(229,101,78,0.3)] transition-all cursor-pointer border-none"
              >
                [ COMMIT ]
              </button>
              <button
                onClick={() => {
                  setEditText(question.text);
                  setIsEditing(false);
                }}
                className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#A8A29E] px-[16px] py-[8px] rounded-full hover:text-[#1C1917] hover:bg-white transition-all cursor-pointer border border-transparent hover:border-[#E7E5E4]"
              >
                [ REVERT ]
              </button>
            </div>
          </div>
        ) : (
          <p
            className="text-[16px] font-medium tracking-tight text-[#1C1917] leading-[1.5] cursor-pointer hover:text-[#E5654E] transition-colors"
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
                className="text-[12px] px-[10px] py-[4px] rounded-full border border-[#E2E8F0] text-[#64748B] bg-[#FCFCFD]"
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
          className="w-[28px] h-[28px] rounded-md flex items-center justify-center text-[#94A3B8] hover:bg-[#F3F4F6] hover:text-[#64748B] disabled:opacity-20 disabled:hover:bg-transparent transition-all cursor-pointer border-none bg-transparent"
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
          className="w-[28px] h-[28px] rounded-md flex items-center justify-center text-[#94A3B8] hover:bg-[#F3F4F6] hover:text-[#64748B] disabled:opacity-20 disabled:hover:bg-transparent transition-all cursor-pointer border-none bg-transparent"
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
            className="w-[28px] h-[28px] rounded-md flex items-center justify-center text-[#94A3B8] hover:bg-[#F3F4F6] hover:text-[#64748B] transition-all cursor-pointer border-none bg-transparent"
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
            className="w-[28px] h-[28px] rounded-md flex items-center justify-center text-[#E5654E] hover:bg-[#E5654E]/10 transition-all cursor-pointer border-none bg-transparent"
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
          className="w-[28px] h-[28px] rounded-md flex items-center justify-center text-[#94A3B8] hover:bg-red-50 hover:text-red-500 transition-all cursor-pointer border-none bg-transparent"
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
    const pool = q.section === "followup" ? TEMPLATE_FOLLOWUP : TEMPLATE_OPEN;
    _templateIdx = (_templateIdx + 1) % pool.length;
    onChange(
      questions.map((qn) =>
        qn.id === id ? { ...qn, text: pool[_templateIdx] } : qn
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
          qn.id === id ? { ...qn, text: replacement.text } : qn
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
            <h3 className="font-mono text-[11px] font-bold tracking-widest text-[#1C1917]">
              {title}
            </h3>
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase text-[#A8A29E] mt-[4px]">{subtitle}</p>
          </div>
          {sectionKey !== "baseline" && (
            <button
              onClick={() => addQuestion(sectionKey)}
              className="font-mono text-[9px] font-bold uppercase tracking-widest text-[#1C1917] px-[14px] py-[8px] rounded-full border border-[#D6D3D1] hover:border-[#1C1917] bg-white transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md"
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
            <p className="text-[13px] text-[#94A3B8] py-[16px] text-center">
              No questions in this section.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/60 backdrop-blur-3xl border border-white/80 shadow-[0_8px_32px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.8)] rounded-[32px] p-[32px] md:p-[40px]">
      <div className="flex items-end justify-between mb-[28px]">
        <div>
          <h2 className="font-mono text-[12px] font-bold uppercase tracking-widest text-[#1C1917] mb-[8px]">
            [ 02: VALIDATION TOPOLOGY ]
          </h2>
          <p className="font-mono text-[10px] uppercase font-bold tracking-widest text-[#A8A29E]">
            Edit node sequences or run automated regeneration protocol.
          </p>
        </div>
      </div>

      {rewriteError && (
        <div className="mb-[24px] px-[20px] py-[16px] rounded-[16px] bg-[#ef4444]/10 border border-[#ef4444]/20 backdrop-blur-md">
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#ef4444]">[ ERR: {rewriteError} ]</span>
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
