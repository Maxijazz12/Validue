import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateCampaignDraftFallback } from "@/lib/ai/generate-campaign-fallback";
import { runQualityPass } from "@/lib/ai/quality-pass";
import { logGeneration, logQualityScores } from "@/lib/ai/logger";
import { PROMPT_VERSION, GENERATION_VERSION } from "@/lib/ai/prompts";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const startTime = Date.now();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = rateLimit(`generate:${user.id}`, 3600000, 10);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Generation limit reached. Please try again later." }, { status: 429 });
  }

  const body = await request.json();
  const scribbleText: string = body.scribbleText;
  if (!scribbleText || scribbleText.trim().length < 50) {
    return NextResponse.json({ error: "Scribble text must be at least 50 characters" }, { status: 400 });
  }

  logGeneration({ event: "generation.started", scribbleLength: scribbleText.length, userId: user.id });

  const fallback = await generateCampaignDraftFallback(scribbleText);
  const { draft } = runQualityPass(fallback, scribbleText);

  logGeneration({
    event: "generation.success", latencyMs: Date.now() - startTime,
    model: "fallback", promptVersion: PROMPT_VERSION, generationVersion: GENERATION_VERSION,
    baselineIds: draft.questions.filter((q) => q.baselineId).map((q) => q.baselineId!),
    qualityOverall: draft.qualityScores?.overall ?? 0, source: "fallback",
  });
  logQualityScores(draft.qualityScores!);

  return NextResponse.json({ status: "done", draft });
}
