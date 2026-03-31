import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClient, isAIAvailable, MODELS, cachedSystem, cachedTools } from "@/lib/ai/client";
import { ASSUMPTION_IMPROVE_SYSTEM_PROMPT, buildImproveAssumptionPrompt } from "@/lib/ai/prompts";
import { AIImprovedAssumptionSchema, IMPROVE_ASSUMPTION_TOOL } from "@/lib/ai/schemas";
import { logGeneration } from "@/lib/ai/logger";
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

  // ─── Rate limit: 50 assumption improvements per user per hour ───
  const limit = rateLimit(`generate-assumption:${user.id}`, 3600000, 50);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Improvement limit reached. Please try again later." },
      { status: 429 }
    );
  }

  // ─── Parse request ───
  const body = await request.json();
  const { scribbleText, currentAssumption, allAssumptions, audienceSummary } = body as {
    scribbleText: string;
    currentAssumption: string;
    allAssumptions: string[];
    audienceSummary: string;
  };

  if (!scribbleText || !currentAssumption) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // ─── Fallback if no API key ───
  if (!isAIAvailable()) {
    logGeneration({
      event: "assumption.improved",
      latencyMs: Date.now() - startTime,
      model: "fallback",
      source: "fallback",
    });
    return NextResponse.json({ assumption: currentAssumption });
  }

  // ─── AI improvement ───
  try {
    const client = getClient();
    const response = await client.messages.create({
      model: MODELS.light,
      max_tokens: 512,
      system: cachedSystem(ASSUMPTION_IMPROVE_SYSTEM_PROMPT),
      messages: [
        {
          role: "user",
          content: buildImproveAssumptionPrompt(
            scribbleText,
            currentAssumption,
            allAssumptions,
            audienceSummary
          ),
        },
      ],
      tools: cachedTools([IMPROVE_ASSUMPTION_TOOL]),
      tool_choice: { type: "tool", name: "improve_assumption" },
    });

    const toolBlock = response.content.find(
      (block) => block.type === "tool_use"
    );

    if (!toolBlock || toolBlock.type !== "tool_use") {
      logGeneration({
        event: "assumption.improved",
        latencyMs: Date.now() - startTime,
        model: "fallback",
        source: "fallback",
      });
      return NextResponse.json({ assumption: currentAssumption });
    }

    const parsed = AIImprovedAssumptionSchema.safeParse(toolBlock.input);

    if (!parsed.success) {
      console.error("[assumption-improve] Zod validation failed:", parsed.error.issues);
      logGeneration({
        event: "assumption.improved",
        latencyMs: Date.now() - startTime,
        model: "fallback",
        source: "fallback",
      });
      return NextResponse.json({ assumption: currentAssumption });
    }

    logGeneration({
      event: "assumption.improved",
      latencyMs: Date.now() - startTime,
      model: MODELS.light,
      source: "ai",
    });

    return NextResponse.json({ assumption: parsed.data.assumption });
  } catch (error) {
    console.error("[assumption-improve] AI improvement failed:", error);
    logGeneration({
      event: "assumption.improved",
      latencyMs: Date.now() - startTime,
      model: "fallback",
      source: "fallback",
    });
    return NextResponse.json({ assumption: currentAssumption });
  }
}
