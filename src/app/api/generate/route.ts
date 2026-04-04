import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { MODELS, isAIAvailable } from "@/lib/ai/client";
import {
  GenerateCampaignAIError,
  generateCampaignDraftWithAI,
} from "@/lib/ai/generate-campaign-ai";
import { generateCampaignDraftFallback } from "@/lib/ai/generate-campaign-fallback";
import { repairCampaignDraft } from "@/lib/ai/repair-campaign-draft";
import { runQualityPass } from "@/lib/ai/quality-pass";
import { logGeneration, logQualityScores } from "@/lib/ai/logger";
import { PROMPT_VERSION, GENERATION_VERSION } from "@/lib/ai/prompts";
import { durableRateLimit } from "@/lib/durable-rate-limit";
import type {
  CampaignDraft,
  CampaignDraftFallbackReason,
  GenerateCampaignResponse,
} from "@/lib/ai/types";

function buildSuccessResponse(
  draft: CampaignDraft,
  startTime: number,
  source: "ai" | "fallback",
  model: string,
  fallbackReason?: CampaignDraftFallbackReason
) {
  logGeneration({
    event: "generation.success",
    latencyMs: Date.now() - startTime,
    model,
    promptVersion: PROMPT_VERSION,
    generationVersion: GENERATION_VERSION,
    baselineIds: draft.questions
      .filter((question) => question.baselineId)
      .map((question) => question.baselineId!),
    qualityOverall: draft.qualityScores?.overall ?? 0,
    source,
  });
  logQualityScores(draft.qualityScores!);

  const payload: GenerateCampaignResponse = {
    status: "done",
    draft,
    source,
    ...(fallbackReason ? { fallbackReason } : {}),
  };

  return NextResponse.json(payload);
}

export async function POST(request: Request) {
  const startTime = Date.now();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = await durableRateLimit(`generate:${user.id}`, 3600000, 10);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Generation limit reached. Please try again later." }, { status: 429 });
  }

  const body = await request.json();
  const scribbleText: string = body.scribbleText;
  if (!scribbleText || typeof scribbleText !== "string" || scribbleText.trim().length < 50) {
    return NextResponse.json({ error: "Scribble text must be at least 50 characters" }, { status: 400 });
  }
  if (scribbleText.length > 10_000) {
    return NextResponse.json({ error: "Scribble text must be under 10,000 characters" }, { status: 400 });
  }

  logGeneration({ event: "generation.started", scribbleLength: scribbleText.length, userId: user.id });

  async function fallbackResponse(reason: CampaignDraftFallbackReason) {
    const fallbackDraft = await generateCampaignDraftFallback(scribbleText);
    const repairedDraft = repairCampaignDraft(fallbackDraft);
    const { draft } = runQualityPass(repairedDraft, scribbleText);
    return buildSuccessResponse(draft, startTime, "fallback", "fallback", reason);
  }

  if (!isAIAvailable()) {
    logGeneration({ event: "generation.fallback", reason: "no_api_key" });
    return fallbackResponse("no_api_key");
  }

  try {
    const aiDraft = await generateCampaignDraftWithAI(scribbleText);
    const repairedDraft = repairCampaignDraft(aiDraft);
    const { draft } = runQualityPass(repairedDraft, scribbleText);
    return buildSuccessResponse(draft, startTime, "ai", MODELS.generation);
  } catch (error) {
    if (error instanceof GenerateCampaignAIError && error.reason === "validation_failed") {
      console.error("[generate] Validation failed:", error.issues);
      logGeneration({ event: "generation.validation_failed", issues: error.issues });
      logGeneration({
        event: "generation.fallback",
        reason: "validation_failed",
        errorMessage: error.message,
      });
      return fallbackResponse("validation_failed");
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[generate] AI generation failed:", error);
    logGeneration({
      event: "generation.fallback",
      reason: "api_error",
      errorMessage,
    });
    return fallbackResponse("api_error");
  }
}
