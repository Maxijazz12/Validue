import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClient, isAIAvailable, MODELS } from "@/lib/ai/client";
import { AUDIENCE_IMPROVE_SYSTEM_PROMPT, buildImproveAudiencePrompt } from "@/lib/ai/prompts";
import { AIImprovedAudienceSchema, IMPROVE_AUDIENCE_TOOL } from "@/lib/ai/schemas";
import { logGeneration } from "@/lib/ai/logger";
import type { DraftAudience, ImproveAudienceRequest } from "@/lib/ai/types";
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

  // ─── Rate limit: 30 audience improvements per user per hour ───
  const limit = rateLimit(`generate-audience:${user.id}`, 3600000, 30);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Improvement limit reached. Please try again later." },
      { status: 429 }
    );
  }

  // ─── Parse request ───
  const body: ImproveAudienceRequest = await request.json();
  const { scribbleText, currentAudience, assumptions, questions } = body;

  if (!scribbleText || !currentAudience) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // ─── Fallback if no API key ───
  if (!isAIAvailable()) {
    logGeneration({
      event: "audience.improved",
      fieldsChanged: [],
      latencyMs: Date.now() - startTime,
      model: "fallback",
      source: "fallback",
    });
    return NextResponse.json(currentAudience);
  }

  // ─── AI improvement ───
  try {
    const client = getClient();
    const response = await client.messages.create({
      model: MODELS.light,
      max_tokens: 512,
      system: AUDIENCE_IMPROVE_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: buildImproveAudiencePrompt(
            scribbleText,
            currentAudience,
            assumptions,
            questions
          ),
        },
      ],
      tools: [IMPROVE_AUDIENCE_TOOL],
      tool_choice: { type: "tool", name: "improve_audience" },
    });

    const toolBlock = response.content.find(
      (block) => block.type === "tool_use"
    );

    if (!toolBlock || toolBlock.type !== "tool_use") {
      logGeneration({
        event: "audience.improved",
        fieldsChanged: [],
        latencyMs: Date.now() - startTime,
        model: "fallback",
        source: "fallback",
      });
      return NextResponse.json(currentAudience);
    }

    const parsed = AIImprovedAudienceSchema.safeParse(toolBlock.input);

    if (!parsed.success) {
      console.error("[audience] Zod validation failed:", parsed.error.issues);
      logGeneration({
        event: "audience.improved",
        fieldsChanged: [],
        latencyMs: Date.now() - startTime,
        model: "fallback",
        source: "fallback",
      });
      return NextResponse.json(currentAudience);
    }

    const improved: DraftAudience = {
      interests: parsed.data.interests,
      expertise: parsed.data.expertise,
      ageRanges: parsed.data.ageRanges,
      location: parsed.data.location ?? "",
      occupation: parsed.data.occupation ?? "",
      industry: parsed.data.industry ?? "",
      experienceLevel: parsed.data.experienceLevel ?? "",
      nicheQualifier: parsed.data.nicheQualifier ?? "",
    };

    // Track which fields actually changed
    const fieldsChanged: string[] = [];
    if (JSON.stringify(improved.interests) !== JSON.stringify(currentAudience.interests)) fieldsChanged.push("interests");
    if (JSON.stringify(improved.expertise) !== JSON.stringify(currentAudience.expertise)) fieldsChanged.push("expertise");
    if (JSON.stringify(improved.ageRanges) !== JSON.stringify(currentAudience.ageRanges)) fieldsChanged.push("ageRanges");
    if (improved.location !== currentAudience.location) fieldsChanged.push("location");
    if (improved.occupation !== currentAudience.occupation) fieldsChanged.push("occupation");
    if (improved.industry !== currentAudience.industry) fieldsChanged.push("industry");
    if (improved.experienceLevel !== currentAudience.experienceLevel) fieldsChanged.push("experienceLevel");
    if (improved.nicheQualifier !== currentAudience.nicheQualifier) fieldsChanged.push("nicheQualifier");

    logGeneration({
      event: "audience.improved",
      fieldsChanged,
      latencyMs: Date.now() - startTime,
      model: MODELS.light,
      source: "ai",
    });

    return NextResponse.json(improved);
  } catch (error) {
    console.error("[audience] AI improvement failed:", error);
    logGeneration({
      event: "audience.improved",
      fieldsChanged: [],
      latencyMs: Date.now() - startTime,
      model: "fallback",
      source: "fallback",
    });
    return NextResponse.json(currentAudience);
  }
}
