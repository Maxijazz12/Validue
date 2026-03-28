import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClient, isAIAvailable, MODELS } from "@/lib/ai/client";
import { SYSTEM_PROMPT, buildRegenerateQuestionPrompt } from "@/lib/ai/prompts";
import { AIRegeneratedQuestionSchema, REGENERATE_QUESTION_TOOL } from "@/lib/ai/schemas";
import { logGeneration } from "@/lib/ai/logger";
import type { DraftQuestion, RegenerateQuestionRequest } from "@/lib/ai/types";
import { rateLimit } from "@/lib/rate-limit";

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
  const limit = rateLimit(`generate-question:${user.id}`, 3600000, 50);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Regeneration limit reached. Please try again later." },
      { status: 429 }
    );
  }

  // ─── Parse request ───
  const body: RegenerateQuestionRequest = await request.json();
  const { scribbleText, campaignSummary, assumptions, audience, currentQuestion, allQuestions } = body;

  if (!scribbleText || !currentQuestion) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
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
      system: SYSTEM_PROMPT,
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
      tools: [REGENERATE_QUESTION_TOOL],
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

    const result: DraftQuestion = {
      ...currentQuestion,
      text: parsed.data.text,
      section: parsed.data.section,
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
  "What would make you stop using your current solution and switch to something new?",
  "Describe the last time this problem really got in your way. What happened?",
  "If you could redesign how this works from scratch, what would you change first?",
  "What's the one thing about this problem that nobody talks about but everyone deals with?",
  "Walk me through a situation where this problem cost you time, money, or energy.",
];

const FALLBACK_FOLLOWUP = [
  "What would your ideal solution look like? Be as specific as possible.",
  "Who else in your life or work is affected by this problem?",
  "What's the minimum this would need to do for you to give it a real shot?",
  "How would you describe this problem to a friend in one sentence?",
  "What's the biggest risk you see with a solution like this?",
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
