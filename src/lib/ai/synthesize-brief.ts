import { getClient, isAIAvailable, MODELS, cachedSystem, cachedTools } from "./client";
import { SYNTHESIZE_BRIEF_TOOL, DecisionBriefSchema } from "./brief-schemas";
import type { DecisionBrief } from "./brief-schemas";
import { BRIEF_SYSTEM_PROMPT, buildSynthesisPrompt } from "./brief-prompts";
import { getEvidenceByAssumption, getBriefMethodology, computeAllCoverage } from "./assumption-evidence";
import type { AssumptionCoverage } from "./assumption-evidence";
import { extractPriceSignal } from "./extract-price-signal";
import type { PriceSignal } from "./extract-price-signal";
import { detectConsistencyGaps } from "./detect-consistency-gaps";
import type { ConsistencyReport } from "./detect-consistency-gaps";
import { detectSegmentDisagreements } from "./segment-disagreements";
import type { SegmentReport } from "./segment-disagreements";
import { logGeneration } from "./logger";
import { checkGrounding, applyGroundingCorrections } from "./grounding-check";
import sql from "@/lib/db";

/* ─── Prior Round Types ─── */

export interface PriorRoundVerdicts {
  recommendation: string;
  verdicts: { assumption: string; verdict: string; confidence: string }[];
}

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
      responseCount < 2
        ? `Only ${responseCount} response${responseCount === 1 ? "" : "s"} received. Need at least 3 for directional signal, 8+ for confidence.`
        : "AI synthesis unavailable. Manual review of responses recommended.",
    uncomfortableTruth:
      responseCount < 2
        ? `Not enough responses to draw meaningful conclusions. ${responseCount} response${responseCount === 1 ? "" : "s"} received — need at least 3 for directional signal.`
        : "AI synthesis is currently unavailable. Review the raw responses manually to extract insights.",
    signalSummary:
      responseCount < 2
        ? "Insufficient data to synthesize meaning. Collect more responses before drawing conclusions."
        : "Responses collected but AI synthesis unavailable. Review raw responses for patterns.",
    assumptionVerdicts: assumptions.map((assumption, i) => ({
      assumption,
      assumptionIndex: i,
      verdict: "INSUFFICIENT_DATA" as const,
      confidence: "LOW" as const,
      evidenceSummary:
        responseCount < 2
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
  methodology: Awaited<ReturnType<typeof getBriefMethodology>>,
  priceSignal: PriceSignal | null,
  consistencyReport: ConsistencyReport | null,
  segmentReport: SegmentReport | null,
  priorRoundVerdicts: PriorRoundVerdicts | null = null
): Promise<DecisionBrief> {
  const client = getClient();

  const userMessage = buildSynthesisPrompt(
    campaignTitle,
    campaignDescription,
    assumptions,
    evidenceByAssumption,
    methodology,
    priceSignal,
    consistencyReport,
    segmentReport,
    priorRoundVerdicts
  );

  console.log("[brief] Calling AI synthesis...");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  let response;
  try {
    response = await client.messages.create(
      {
        model: MODELS.generation,
        max_tokens: 4096,
        system: cachedSystem(BRIEF_SYSTEM_PROMPT),
        tools: cachedTools([SYNTHESIZE_BRIEF_TOOL]),
        tool_choice: { type: "tool", name: "create_decision_brief" },
        messages: [{ role: "user", content: userMessage }],
      },
      { signal: controller.signal }
    );
  } finally {
    clearTimeout(timeout);
  }
  console.log("[brief] AI response received, stop_reason:", response.stop_reason);

  const toolBlock = response.content.find((b) => b.type === "tool_use");
  if (!toolBlock || toolBlock.type !== "tool_use") {
    throw new Error("AI did not return a tool use response for brief synthesis");
  }

  const parsed = DecisionBriefSchema.safeParse(toolBlock.input);
  if (!parsed.success) {
    throw new Error(`Invalid brief structure: ${parsed.error.message}`);
  }

  // Verify AI returned a verdict for every assumption
  if (parsed.data.assumptionVerdicts.length !== assumptions.length) {
    throw new Error(
      `Verdict count mismatch: AI returned ${parsed.data.assumptionVerdicts.length} verdicts for ${assumptions.length} assumptions`
    );
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
  /** Stated-vs-behavioral consistency gaps across respondents */
  consistencyReport: ConsistencyReport | null;
  /** High-match vs low-match audience segment disagreements */
  segmentReport: SegmentReport | null;
  /** Which round this campaign is (1 = first, 2+ = retest) */
  roundNumber: number;
  /** Cached verdict summary from the parent campaign's brief (null if round 1 or parent has no brief) */
  parentVerdicts: PriorRoundVerdicts | null;
}

type SynthesizeBriefOptions = {
  persist?: boolean;
};

type BriefCacheMetadata = {
  cachedResult: BriefResult | null;
  briefResponseCount: number | null;
  roundNumber: number;
  parentVerdicts: PriorRoundVerdicts | null;
};

async function loadBriefCacheMetadata(
  campaignId: string
): Promise<BriefCacheMetadata> {
  const [cached] = await sql`
    SELECT brief_cache, brief_response_count, parent_campaign_id, round_number
    FROM campaigns WHERE id = ${campaignId}
  `;

  const roundNumber = Number(cached?.round_number ?? 1);
  let parentVerdicts: PriorRoundVerdicts | null = null;
  if (cached?.parent_campaign_id) {
    const [parent] = await sql`
      SELECT brief_verdicts FROM campaigns WHERE id = ${cached.parent_campaign_id}
    `;
    if (parent?.brief_verdicts) {
      parentVerdicts = parent.brief_verdicts as PriorRoundVerdicts;
    }
  }

  let cachedResult: BriefResult | null = null;
  if (cached?.brief_cache) {
    const raw = cached.brief_cache;
    cachedResult = (typeof raw === "string" ? JSON.parse(raw) : raw) as BriefResult;
  }

  return {
    cachedResult,
    briefResponseCount:
      cached?.brief_response_count != null
        ? Number(cached.brief_response_count)
        : null,
    roundNumber,
    parentVerdicts,
  };
}

export async function loadFreshCachedBrief(
  campaignId: string,
  currentResponseCount: number
): Promise<{ result: BriefResult | null; isStale: boolean }> {
  try {
    const metadata = await loadBriefCacheMetadata(campaignId);

    if (
      metadata.cachedResult &&
      metadata.briefResponseCount != null &&
      metadata.briefResponseCount === currentResponseCount
    ) {
      return {
        result: {
          ...metadata.cachedResult,
          roundNumber: metadata.roundNumber,
          parentVerdicts: metadata.parentVerdicts,
        },
        isStale: false,
      };
    }

    return {
      result: null,
      isStale: metadata.cachedResult !== null,
    };
  } catch {
    return { result: null, isStale: false };
  }
}

/* ─── Main Entry Point ─── */

/**
 * Synthesizes a Decision Brief for a campaign.
 *
 * 1. Checks for a cached brief (same response count → cache hit)
 * 2. If cache miss: retrieves evidence, calls Claude once, applies
 *    deterministic grounding corrections, caches the result
 * 3. If too few responses, returns a deterministic fallback
 * 4. On AI failure, retries once, then falls back to deterministic
 *
 * Never throws — the brief page must always render something.
 */
export async function synthesizeBrief(
  campaignId: string,
  campaignTitle: string,
  campaignDescription: string,
  assumptions: string[],
  options: SynthesizeBriefOptions = {}
): Promise<BriefResult> {
  const start = Date.now();

  // ─── Check cache first ───
  // If we have a cached brief and the response count hasn't changed, return it.
  try {
    const metadata = await loadBriefCacheMetadata(campaignId);

    if (metadata.cachedResult && metadata.briefResponseCount != null) {
      // Check current response count to decide if cache is stale
      const [{ count: currentCount }] = await sql`
        SELECT COUNT(*)::int as count FROM responses
        WHERE campaign_id = ${campaignId} AND status IN ('submitted', 'ranked')
      `;

      if (currentCount === metadata.briefResponseCount) {
        // Cache hit — return without calling AI
        logGeneration({
          event: "response.ranked",
          campaignId,
          responseId: "brief-synthesis-cached",
          score: 0,
          source: "ai",
          confidence: 1,
          latencyMs: Date.now() - start,
        });
        return {
          ...metadata.cachedResult,
          roundNumber: metadata.roundNumber,
          parentVerdicts: metadata.parentVerdicts,
        };
      }
    }

    // Cache miss — fall through to synthesis
    return await synthesizeFresh(
      campaignId,
      campaignTitle,
      campaignDescription,
      assumptions,
      metadata.roundNumber,
      metadata.parentVerdicts,
      start,
      options
    );
  } catch {
    // Cache check failed — synthesize fresh
    return await synthesizeFresh(
      campaignId,
      campaignTitle,
      campaignDescription,
      assumptions,
      1,
      null,
      start,
      options
    );
  }
}

/**
 * Fresh synthesis path — called on cache miss or when response count has changed.
 * Makes exactly 1 AI call (+ 1 retry on failure). Applies deterministic grounding
 * corrections instead of re-synthesizing. Caches the result.
 */
async function synthesizeFresh(
  campaignId: string,
  campaignTitle: string,
  campaignDescription: string,
  assumptions: string[],
  roundNumber: number,
  parentVerdicts: PriorRoundVerdicts | null,
  start: number,
  options: SynthesizeBriefOptions
): Promise<BriefResult> {
  // Gather evidence
  let evidenceByAssumption: Awaited<ReturnType<typeof getEvidenceByAssumption>>;
  let methodology: Awaited<ReturnType<typeof getBriefMethodology>>;

  let priceSignal: PriceSignal | null = null;
  let consistencyReport: ConsistencyReport | null = null;

  try {
    [evidenceByAssumption, methodology, priceSignal, consistencyReport] = await Promise.all([
      getEvidenceByAssumption(campaignId),
      getBriefMethodology(campaignId),
      extractPriceSignal(campaignId),
      detectConsistencyGaps(campaignId),
    ]);
  } catch (err) {
    console.error("[brief] Evidence gathering failed:", err instanceof Error ? err.message : err);
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
    return { brief: buildFallbackBrief(assumptions, 0), coverage: emptyCoverage, priceSignal: null, consistencyReport: null, segmentReport: null, roundNumber, parentVerdicts };
  }

  // Compute coverage and segment analysis (deterministic)
  const coverage = computeAllCoverage(evidenceByAssumption, assumptions.length);
  const segmentReport = detectSegmentDisagreements(evidenceByAssumption, assumptions);

  // Too few responses for meaningful synthesis
  // Threshold: 2 responses minimum (partial responses mean more respondents
  // each answering fewer questions — per-assumption thresholds in the prompt
  // handle individual assumption sufficiency)
  if (methodology.responseCount < 2) {
    logGeneration({
      event: "response.ranked",
      campaignId,
      responseId: "brief-synthesis",
      score: 0,
      source: "fallback",
      confidence: 0,
      latencyMs: Date.now() - start,
    });
    const result = {
      brief: buildFallbackBrief(assumptions, methodology.responseCount),
      coverage,
      priceSignal,
      consistencyReport,
      segmentReport,
      roundNumber,
      parentVerdicts,
    };
    if (options.persist) {
      await persistCachedBrief(campaignId, result, methodology.responseCount);
    }
    return result;
  }

  // Attempt AI synthesis — single call + deterministic grounding corrections
  if (isAIAvailable()) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        let brief = await callSynthesis(
          campaignTitle,
          campaignDescription,
          assumptions,
          evidenceByAssumption,
          methodology,
          priceSignal,
          consistencyReport,
          segmentReport,
          parentVerdicts
        );

        // Deterministic grounding check — fix issues without re-calling AI
        const grounding = checkGrounding(brief, evidenceByAssumption);
        if (!grounding.passed) {
          brief = applyGroundingCorrections(brief, grounding.failures);
        }

        logGeneration({
          event: "response.ranked",
          campaignId,
          responseId: attempt === 0 ? "brief-synthesis" : "brief-synthesis-retry",
          score: methodology.avgQuality,
          source: "ai",
          confidence: grounding.passed ? 1 : 0.7,
          latencyMs: Date.now() - start,
        });

        const result: BriefResult = { brief, coverage, priceSignal, consistencyReport, segmentReport, roundNumber, parentVerdicts };

        if (options.persist) {
          await persistSuccessfulBrief(campaignId, brief, result, methodology.responseCount);
        }

        return result;
      } catch (err) {
        console.error(`[brief] Synthesis attempt ${attempt + 1} failed:`, err instanceof Error ? err.message : err);
        if (attempt === 1) break; // Retry exhausted, fall through to fallback
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

  const result = {
    brief: buildFallbackBrief(assumptions, methodology.responseCount),
    coverage,
    priceSignal,
    consistencyReport,
    segmentReport,
    roundNumber,
    parentVerdicts,
  };
  if (options.persist) {
    await persistCachedBrief(campaignId, result, methodology.responseCount);
  }
  return result;
}

async function persistSuccessfulBrief(
  campaignId: string,
  brief: DecisionBrief,
  result: BriefResult,
  responseCount: number
): Promise<void> {
  try {
    await Promise.all([
      persistVerdicts(campaignId, brief),
      cacheBrief(campaignId, result, responseCount),
    ]);
  } catch (err) {
    console.error("[brief] Persisting successful brief failed:", err);
  }
}

async function persistCachedBrief(
  campaignId: string,
  result: BriefResult,
  responseCount: number
): Promise<void> {
  try {
    await cacheBrief(campaignId, result, responseCount);
  } catch (err) {
    console.error("[brief] Cache write failed:", err);
  }
}

/* ─── Brief Cache Persistence ─── */

/**
 * Cache the full BriefResult in the campaigns row.
 * Stores the response count so we know when to invalidate.
 * Called from explicit mutation paths to persist a generated brief.
 */
async function cacheBrief(
  campaignId: string,
  result: BriefResult,
  responseCount: number
): Promise<void> {
  await sql`
    UPDATE campaigns
    SET brief_cache = ${JSON.stringify(result)},
        brief_cached_at = NOW(),
        brief_response_count = ${responseCount}
    WHERE id = ${campaignId}
  `;
}

/* ─── Verdict Persistence ─── */

/**
 * Persist a lightweight verdict summary to the campaign row.
 * Write-once: only writes if brief_verdicts is currently NULL.
 * Called from explicit mutation paths after a successful synthesis.
 */
async function persistVerdicts(
  campaignId: string,
  brief: DecisionBrief
): Promise<void> {
  const summary: PriorRoundVerdicts = {
    recommendation: brief.recommendation,
    verdicts: brief.assumptionVerdicts.map((v) => ({
      assumption: v.assumption,
      verdict: v.verdict,
      confidence: v.confidence,
    })),
  };

  await sql`
    UPDATE campaigns SET brief_verdicts = ${JSON.stringify(summary)}
    WHERE id = ${campaignId} AND brief_verdicts IS NULL
  `;
}
