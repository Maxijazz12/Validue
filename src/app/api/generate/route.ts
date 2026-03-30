import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClient, isAIAvailable, MODELS } from "@/lib/ai/client";
import { SYSTEM_PROMPT, buildGeneratePrompt, PROMPT_VERSION, GENERATION_VERSION } from "@/lib/ai/prompts";
import { AICampaignDraftSchema, GENERATE_CAMPAIGN_TOOL } from "@/lib/ai/schemas";
import { BASELINE_QUESTIONS, recommendBaseline } from "@/lib/baseline-questions";
import { generateCampaignDraftFallback } from "@/lib/ai/generate-campaign-fallback";
import { runQualityPass } from "@/lib/ai/quality-pass";
import { logGeneration, logQualityScores } from "@/lib/ai/logger";
import { questionId as uid, type CampaignDraft, type DraftQuestion } from "@/lib/ai/types";
import { rateLimit } from "@/lib/rate-limit";
import { checkMultipleFields } from "@/lib/content-filter";
import { logOps } from "@/lib/ops-logger";

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

  // ─── Rate limit: 10 generations per user per hour ───
  const limit = rateLimit(`generate:${user.id}`, 3600000, 10);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Generation limit reached. Please try again later." },
      { status: 429, headers: { "X-RateLimit-Remaining": "0" } }
    );
  }

  // ─── Parse request ───
  const body = await request.json();
  const scribbleText: string = body.scribbleText;

  if (!scribbleText || scribbleText.trim().length < 50) {
    return NextResponse.json(
      { error: "Scribble text must be at least 50 characters" },
      { status: 400 }
    );
  }

  logGeneration({
    event: "generation.started",
    scribbleLength: scribbleText.length,
    userId: user.id,
  });

  // ─── Fallback if no API key ───
  if (!isAIAvailable()) {
    logGeneration({
      event: "generation.fallback",
      reason: "no_api_key",
    });

    const fallback = await generateCampaignDraftFallback(scribbleText);
    const { draft } = runQualityPass(fallback, scribbleText);

    logGeneration({
      event: "generation.success",
      latencyMs: Date.now() - startTime,
      model: "fallback",
      promptVersion: PROMPT_VERSION,
      generationVersion: GENERATION_VERSION,
      baselineIds: draft.questions.filter((q) => q.baselineId).map((q) => q.baselineId!),
      qualityOverall: draft.qualityScores?.overall ?? 0,
      source: "fallback",
    });

    logQualityScores(draft.qualityScores!);
    return NextResponse.json(draft);
  }

  // ─── AI generation ───
  try {
    const client = getClient();
    const response = await client.messages.create({
      model: MODELS.generation,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [
        { role: "user", content: buildGeneratePrompt(scribbleText) },
      ],
      tools: [GENERATE_CAMPAIGN_TOOL],
      tool_choice: { type: "tool", name: "create_campaign_draft" },
    });

    // Extract tool_use block
    const toolBlock = response.content.find(
      (block) => block.type === "tool_use"
    );

    if (!toolBlock || toolBlock.type !== "tool_use") {
      console.error("[generate] No tool_use block in AI response");
      logGeneration({ event: "generation.fallback", reason: "api_error", errorMessage: "No tool_use block" });
      return returnFallback(scribbleText, startTime, user.id);
    }

    // Validate with Zod
    const parsed = AICampaignDraftSchema.safeParse(toolBlock.input);

    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
      console.error("[generate] Zod validation failed:", issues);
      logGeneration({ event: "generation.validation_failed", issues });
      logGeneration({ event: "generation.fallback", reason: "validation_failed" });
      return returnFallback(scribbleText, startTime, user.id);
    }

    const raw = parsed.data;

    // ─── Map baseline IDs to library questions ───
    // Start with valid AI picks, pad with fallback to reach exactly 3, dedup by ID
    const baselineMap = new Map(
      BASELINE_QUESTIONS.map((q) => [q.id, q])
    );

    const usedBaselineIds = new Set<string>();
    const baselineQuestions: DraftQuestion[] = [];

    // First: add valid AI-picked baselines
    for (const id of raw.baselineQuestionIds) {
      const bq = baselineMap.get(id);
      if (bq && !usedBaselineIds.has(bq.id)) {
        usedBaselineIds.add(bq.id);
        baselineQuestions.push({
          id: uid(),
          text: bq.text,
          type: "multiple_choice" as const,
          options: [...bq.options],
          section: "baseline" as const,
          isBaseline: true,
          baselineId: bq.id,
          category: bq.category,
        });
      }
    }

    // Second: pad with keyword-recommended baselines to reach exactly 3
    if (baselineQuestions.length < 3) {
      console.warn(`[generate] AI picked ${baselineQuestions.length}/3 valid baseline IDs, padding with fallback`);
      const recs = recommendBaseline(scribbleText);
      for (const bq of recs) {
        if (baselineQuestions.length >= 3) break;
        if (usedBaselineIds.has(bq.id)) continue;
        usedBaselineIds.add(bq.id);
        baselineQuestions.push({
          id: uid(),
          text: bq.text,
          type: "multiple_choice" as const,
          options: [...bq.options],
          section: "baseline" as const,
          isBaseline: true,
          baselineId: bq.id,
          category: bq.category,
        });
      }
    }

    // ─── Assemble CampaignDraft ───
    const openQuestions: DraftQuestion[] = raw.openQuestions.map((q) => ({
      id: uid(),
      text: q.text,
      type: "open" as const,
      options: null,
      section: q.section as "open" | "followup",
      isBaseline: false,
      assumptionIndex: q.assumptionIndex,
      anchors: q.anchors,
      category: q.evidenceCategory,
    }));

    const followupQuestions: DraftQuestion[] = raw.followupQuestions.map(
      (q) => ({
        id: uid(),
        text: q.text,
        type: "open" as const,
        options: null,
        section: "followup" as const,
        isBaseline: false,
        assumptionIndex: q.assumptionIndex,
        anchors: q.anchors,
        category: q.evidenceCategory,
      })
    );

    const rawDraft: CampaignDraft = {
      title: raw.title,
      summary: raw.summary,
      category: raw.category,
      tags: raw.tags,
      assumptions: raw.assumptions,
      format: "quick",
      questions: [...openQuestions, ...followupQuestions, ...baselineQuestions],
      audience: {
        interests: raw.audience.interests,
        expertise: raw.audience.expertise,
        ageRanges: raw.audience.ageRanges,
        location: raw.audience.location ?? "",
        occupation: raw.audience.occupation ?? "",
        industry: raw.audience.industry ?? "",
        experienceLevel: raw.audience.experienceLevel ?? "",
        nicheQualifier: raw.audience.nicheQualifier ?? "",
      },
    };

    // ─── Quality pass ───
    const { draft } = runQualityPass(rawDraft, scribbleText);

    logGeneration({
      event: "generation.success",
      latencyMs: Date.now() - startTime,
      model: MODELS.generation,
      promptVersion: PROMPT_VERSION,
      generationVersion: GENERATION_VERSION,
      baselineIds: baselineQuestions.map((q) => q.baselineId!),
      qualityOverall: draft.qualityScores?.overall ?? 0,
      source: "ai",
    });

    logQualityScores(draft.qualityScores!);

    // Content safety check on AI-generated output
    const contentFields = [
      { name: "title", text: draft.title },
      { name: "summary", text: draft.summary },
      ...draft.questions.map((q, i) => ({ name: `question_${i}`, text: q.text })),
    ];
    const contentCheck = checkMultipleFields(contentFields);
    if (!contentCheck.allowed) {
      logOps({ event: "content.flagged", userId: user.id, fieldName: contentCheck.fieldName ?? "ai_output", action: "blocked", reason: contentCheck.reason ?? "", entryPoint: "generate_ai" });
      logGeneration({ event: "generation.fallback", reason: "validation_failed", errorMessage: "AI output blocked by content filter" });
      return returnFallback(scribbleText, startTime, user.id);
    }

    return NextResponse.json(draft);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[generate] AI generation failed:", msg);
    logGeneration({ event: "generation.fallback", reason: "api_error", errorMessage: msg });
    return returnFallback(scribbleText, startTime, user.id);
  }
}

/* ─── Fallback helper ─── */

async function returnFallback(scribbleText: string, startTime: number, _userId: string) {
  const fallback = await generateCampaignDraftFallback(scribbleText);
  const { draft } = runQualityPass(fallback, scribbleText);

  logGeneration({
    event: "generation.success",
    latencyMs: Date.now() - startTime,
    model: "fallback",
    promptVersion: PROMPT_VERSION,
    generationVersion: GENERATION_VERSION,
    baselineIds: draft.questions.filter((q) => q.baselineId).map((q) => q.baselineId!),
    qualityOverall: draft.qualityScores?.overall ?? 0,
    source: "fallback",
  });

  logQualityScores(draft.qualityScores!);
  return NextResponse.json(draft);
}
