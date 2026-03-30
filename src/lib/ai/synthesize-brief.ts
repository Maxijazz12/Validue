import { getClient, isAIAvailable, MODELS, cachedSystem, cachedTools } from "./client";
import { SYNTHESIZE_BRIEF_TOOL, DecisionBriefSchema } from "./brief-schemas";
import type { DecisionBrief } from "./brief-schemas";
import { BRIEF_SYSTEM_PROMPT, buildSynthesisPrompt } from "./brief-prompts";
import { getEvidenceByAssumption, getBriefMethodology, computeAllCoverage } from "./assumption-evidence";
import type { AssumptionCoverage } from "./assumption-evidence";
import { extractPriceSignal } from "./extract-price-signal";
import type { PriceSignal } from "./extract-price-signal";
import { logGeneration } from "./logger";

/* ─── Fallback Brief ─── */

/**
 * Deterministic fallback when AI is unavailable or evidence is too thin.
 * Returns a PAUSE recommendation with INSUFFICIENT_DATA on all assumptions.
 */
function buildFallbackBrief(
  assumptions: string[],
  responseCount: number
): DecisionBrief {
  return {
    recommendation: "PAUSE",
    confidence: "LOW",
    confidenceRationale:
      responseCount < 3
        ? `Only ${responseCount} response${responseCount === 1 ? "" : "s"} received. Need at least 5 for directional signal, 8+ for confidence.`
        : "AI synthesis unavailable. Manual review of responses recommended.",
    uncomfortableTruth:
      responseCount < 3
        ? `Not enough responses to draw meaningful conclusions. ${responseCount} response${responseCount === 1 ? "" : "s"} received — need at least 5 for directional signal.`
        : "AI synthesis is currently unavailable. Review the raw responses manually to extract insights.",
    signalSummary:
      responseCount < 3
        ? "Insufficient data to synthesize meaning. Collect more responses before drawing conclusions."
        : "Responses collected but AI synthesis unavailable. Review raw responses for patterns.",
    assumptionVerdicts: assumptions.map((assumption, i) => ({
      assumption,
      assumptionIndex: i,
      verdict: "INSUFFICIENT_DATA" as const,
      confidence: "LOW" as const,
      evidenceSummary:
        responseCount < 3
          ? "Too few responses to evaluate this assumption."
          : "AI synthesis unavailable — manual review required.",
      supportingCount: 0,
      contradictingCount: 0,
      totalResponses: 0,
      quotes: [],
    })),
    strongestSignals: ["Collect more responses to identify patterns."],
    nextSteps: [
      {
        action: "Share the campaign link with your target audience to collect more responses",
        effort: "Low" as const,
        timeline: "This week",
        whatItTests: "Whether your target audience engages with the questions",
      },
      {
        action: "Post in 2-3 relevant online communities where your target users gather",
        effort: "Low" as const,
        timeline: "1-2 days",
        whatItTests: "Whether the problem resonates enough for people to respond",
      },
    ],
    cheapestTest:
      "Post your one-sentence idea description in a relevant subreddit or Discord and count how many people ask follow-up questions vs. scroll past.",
  };
}

/* ─── AI Synthesis ─── */

/**
 * Attempts a single Claude synthesis call. Returns the parsed brief
 * or throws if the response is invalid.
 */
async function callSynthesis(
  campaignTitle: string,
  campaignDescription: string,
  assumptions: string[],
  evidenceByAssumption: Awaited<ReturnType<typeof getEvidenceByAssumption>>,
  methodology: Awaited<ReturnType<typeof getBriefMethodology>>
): Promise<DecisionBrief> {
  const client = getClient();

  const userMessage = buildSynthesisPrompt(
    campaignTitle,
    campaignDescription,
    assumptions,
    evidenceByAssumption,
    methodology
  );

  const response = await client.messages.create({
    model: MODELS.generation,
    max_tokens: 4096,
    system: cachedSystem(BRIEF_SYSTEM_PROMPT),
    tools: cachedTools([SYNTHESIZE_BRIEF_TOOL]),
    tool_choice: { type: "tool", name: "create_decision_brief" },
    messages: [{ role: "user", content: userMessage }],
  });

  const toolBlock = response.content.find((b) => b.type === "tool_use");
  if (!toolBlock || toolBlock.type !== "tool_use") {
    throw new Error("AI did not return a tool use response for brief synthesis");
  }

  const parsed = DecisionBriefSchema.safeParse(toolBlock.input);
  if (!parsed.success) {
    throw new Error(`Invalid brief structure: ${parsed.error.message}`);
  }

  return parsed.data;
}

/* ─── Result Type ─── */

export interface BriefResult {
  brief: DecisionBrief;
  /** Per-assumption coverage metrics (deterministic, computed from evidence) */
  coverage: AssumptionCoverage[];
  /** Willingness-to-pay signal extracted from baseline price questions */
  priceSignal: PriceSignal | null;
}

/* ─── Main Entry Point ─── */

/**
 * Synthesizes a Decision Brief for a campaign.
 *
 * 1. Retrieves evidence grouped by assumption
 * 2. If too few responses, returns a deterministic fallback
 * 3. Calls Claude to synthesize the brief
 * 4. On failure, retries once, then falls back to deterministic
 * 5. Computes per-assumption coverage from raw evidence (deterministic)
 *
 * Never throws — the brief page must always render something.
 */
export async function synthesizeBrief(
  campaignId: string,
  campaignTitle: string,
  campaignDescription: string,
  assumptions: string[]
): Promise<BriefResult> {
  const start = Date.now();

  // Gather evidence
  let evidenceByAssumption: Awaited<ReturnType<typeof getEvidenceByAssumption>>;
  let methodology: Awaited<ReturnType<typeof getBriefMethodology>>;

  let priceSignal: PriceSignal | null = null;

  try {
    [evidenceByAssumption, methodology, priceSignal] = await Promise.all([
      getEvidenceByAssumption(campaignId),
      getBriefMethodology(campaignId),
      extractPriceSignal(campaignId),
    ]);
  } catch {
    // DB query failed — return minimal fallback
    logGeneration({
      event: "response.ranked",
      campaignId,
      responseId: "brief-synthesis",
      score: 0,
      source: "fallback",
      confidence: 0,
      latencyMs: Date.now() - start,
    });
    const emptyCoverage = computeAllCoverage(new Map(), assumptions.length);
    return { brief: buildFallbackBrief(assumptions, 0), coverage: emptyCoverage, priceSignal: null };
  }

  // Compute coverage from evidence (deterministic — same regardless of AI/fallback path)
  const coverage = computeAllCoverage(evidenceByAssumption, assumptions.length);

  // Too few responses for meaningful synthesis
  if (methodology.responseCount < 3) {
    logGeneration({
      event: "response.ranked",
      campaignId,
      responseId: "brief-synthesis",
      score: 0,
      source: "fallback",
      confidence: 0,
      latencyMs: Date.now() - start,
    });
    return { brief: buildFallbackBrief(assumptions, methodology.responseCount), coverage, priceSignal };
  }

  // Attempt AI synthesis
  if (isAIAvailable()) {
    // First attempt
    try {
      const brief = await callSynthesis(
        campaignTitle,
        campaignDescription,
        assumptions,
        evidenceByAssumption,
        methodology
      );
      logGeneration({
        event: "response.ranked",
        campaignId,
        responseId: "brief-synthesis",
        score: methodology.avgQuality,
        source: "ai",
        confidence: 1,
        latencyMs: Date.now() - start,
      });

      return { brief, coverage, priceSignal };
    } catch {
      // Retry once
      try {
        const brief = await callSynthesis(
          campaignTitle,
          campaignDescription,
          assumptions,
          evidenceByAssumption,
          methodology
        );
        logGeneration({
          event: "response.ranked",
          campaignId,
          responseId: "brief-synthesis-retry",
          score: methodology.avgQuality,
          source: "ai",
          confidence: 1,
          latencyMs: Date.now() - start,
        });

        return { brief, coverage, priceSignal };
      } catch {
        // Fall through to fallback
      }
    }
  }

  // Fallback
  logGeneration({
    event: "response.ranked",
    campaignId,
    responseId: "brief-synthesis",
    score: 0,
    source: "fallback",
    confidence: 0,
    latencyMs: Date.now() - start,
  });

  return { brief: buildFallbackBrief(assumptions, methodology.responseCount), coverage, priceSignal };
}
