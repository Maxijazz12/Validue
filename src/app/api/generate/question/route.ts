import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClient, isAIAvailable, MODELS, cachedSystem, cachedTools } from "@/lib/ai/client";
import { QUESTION_REGEN_SYSTEM_PROMPT, buildRegenerateQuestionPrompt } from "@/lib/ai/prompts";
import { AIRegeneratedQuestionSchema, REGENERATE_QUESTION_TOOL } from "@/lib/ai/schemas";
import { logGeneration } from "@/lib/ai/logger";
import type { DraftQuestion, RegenerateQuestionRequest } from "@/lib/ai/types";
import { durableRateLimit } from "@/lib/durable-rate-limit";

export async function POST(request: Request) {
  const startTime = Date.now();

  // ─── Auth check ───
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ─── Rate limit: 50 question regenerations per user per hour ───
  const limit = await durableRateLimit(`generate-question:${user.id}`, 3600000, 50);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Regeneration limit reached. Please try again later." },
      { status: 429 }
    );
  }

  // ─── Parse request ───
  const body: RegenerateQuestionRequest = await request.json();
  const { scribbleText, campaignSummary, assumptions, audience, currentQuestion, allQuestions } = body;

  if (!scribbleText || typeof scribbleText !== "string" || !currentQuestion || typeof currentQuestion !== "object") {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (scribbleText.length > 10_000) {
    return NextResponse.json({ error: "Input too long" }, { status: 400 });
  }

  // ─── Fallback if no API key ───
  if (!isAIAvailable()) {
    logGeneration({
      event: "question.regenerated",
      section: currentQuestion.section,
      latencyMs: Date.now() - startTime,
      model: "fallback",
      source: "fallback",
    });
    return NextResponse.json(makeFallbackQuestion(currentQuestion));
  }

  // ─── AI regeneration ───
  try {
    const client = getClient();
    const response = await client.messages.create({
      model: MODELS.light,
      max_tokens: 512,
      system: cachedSystem(QUESTION_REGEN_SYSTEM_PROMPT),
      messages: [
        {
          role: "user",
          content: buildRegenerateQuestionPrompt(
            scribbleText,
            currentQuestion,
            allQuestions,
            campaignSummary,
            assumptions,
            audience
          ),
        },
      ],
      tools: cachedTools([REGENERATE_QUESTION_TOOL]),
      tool_choice: { type: "tool", name: "regenerate_question" },
    });

    const toolBlock = response.content.find(
      (block) => block.type === "tool_use"
    );

    if (!toolBlock || toolBlock.type !== "tool_use") {
      logGeneration({
        event: "question.regenerated",
        section: currentQuestion.section,
        latencyMs: Date.now() - startTime,
        model: "fallback",
        source: "fallback",
      });
      return NextResponse.json(makeFallbackQuestion(currentQuestion));
    }

    const parsed = AIRegeneratedQuestionSchema.safeParse(toolBlock.input);

    if (!parsed.success) {
      console.error("[regenerate] Zod validation failed:", parsed.error.issues);
      logGeneration({
        event: "question.regenerated",
        section: currentQuestion.section,
        latencyMs: Date.now() - startTime,
        model: "fallback",
        source: "fallback",
      });
      return NextResponse.json(makeFallbackQuestion(currentQuestion));
    }

    const isMCQ = parsed.data.questionType === "multiple_choice" && parsed.data.options && parsed.data.options.length >= 3;
    const result: DraftQuestion = {
      ...currentQuestion,
      text: parsed.data.text,
      type: isMCQ ? "multiple_choice" as const : "open" as const,
      options: isMCQ ? parsed.data.options! : null,
      section: parsed.data.section,
      category: parsed.data.evidenceCategory,
    };

    logGeneration({
      event: "question.regenerated",
      section: currentQuestion.section,
      latencyMs: Date.now() - startTime,
      model: MODELS.light,
      source: "ai",
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[regenerate] AI regeneration failed:", error);
    logGeneration({
      event: "question.regenerated",
      section: currentQuestion.section,
      latencyMs: Date.now() - startTime,
      model: "fallback",
      source: "fallback",
    });
    return NextResponse.json(makeFallbackQuestion(currentQuestion));
  }
}

/* ─── Deterministic Fallback ─── */

const FALLBACK_OPEN = [
  "What's the main reason you WOULDN'T try a new solution for this, even if it worked well?",
  "In the past month, how many times has this problem actually gotten in your way?",
  "How do you currently handle this, and how satisfied are you with your current approach?",
  "What stopped you the last time you tried to solve this problem?",
  "Be honest — how much of a problem is this for you on a day-to-day basis?",
];

const FALLBACK_FOLLOWUP = [
  "What's the main reason you might try this once and never come back?",
  "How much have you spent trying to solve this in the past year?",
  "If you had to choose between your current approach and switching to something new, what would tip the decision?",
  "What would need to be true for you to pay for a solution to this?",
  "What's the biggest risk you see with changing how you handle this?",
];

let _fallbackIdx = 0;

function makeFallbackQuestion(current: DraftQuestion): DraftQuestion {
  const pool =
    current.section === "followup" ? FALLBACK_FOLLOWUP : FALLBACK_OPEN;
  _fallbackIdx = (_fallbackIdx + 1) % pool.length;
  return {
    ...current,
    text: pool[_fallbackIdx],
  };
}
