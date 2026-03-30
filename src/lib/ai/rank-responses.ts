import { getClient, isAIAvailable, MODELS, cachedSystem, cachedTools } from "./client";
import { SCORE_RESPONSE_TOOL, ResponseScoreSchema } from "./schemas";
import { logGeneration } from "./logger";
import type { ResponseScore, AnswerWithMeta } from "./types";
import { DEFAULTS, safeNumber } from "../defaults";
import { sanitizeForPrompt } from "./sanitize-prompt";

/* ─── Confidence Shrinkage ─── */

/**
 * V2: Shrinks a raw score toward the population mean proportional to uncertainty.
 * High confidence → score stays close to raw. Low confidence → pulled toward center.
 *
 * Example: raw=92, confidence=0.5 → 92×0.5 + 55×0.5 = 73.5
 * Example: raw=92, confidence=0.95 → 92×0.95 + 55×0.05 = 90.1
 */
function applyConfidence(rawScore: number, confidence: number): number {
  const effectiveConfidence = Math.max(
    DEFAULTS.MIN_AI_CONFIDENCE,
    Math.min(1.0, confidence)
  );
  return Math.round(
    rawScore * effectiveConfidence +
      DEFAULTS.POPULATION_MEAN_SCORE * (1 - effectiveConfidence)
  );
}

/* ─── AI Scoring ─── */

const RANKING_SYSTEM_PROMPT = `You are a response quality evaluator for a business idea validation platform. Founders post campaigns with questions. Respondents answer them. Your job is to score the quality of a single respondent's answers.

## Scoring Rubric (each dimension 0–10)

**Depth (30% weight):** How specific and detailed are the open-ended answers?
- 8–10: Cites specific examples, numbers, timeframes, tools, or personal experiences
- 5–7: Provides some detail but mostly general statements
- 2–4: Vague, one-sentence answers with no specifics
- 0–1: Empty or nonsensical

**Relevance (25% weight):** Does each answer directly address the question?
- 8–10: Every answer clearly responds to what was asked
- 5–7: Most answers are on-topic, some tangential
- 2–4: Several answers miss the point or are off-topic
- 0–1: Answers seem random or copy-pasted

**Authenticity (25% weight):** Does this sound like real experience or hypothetical?
- 8–10: First-person language, names specific products/tools/companies, describes real scenarios
- 5–7: Mix of real and hypothetical language
- 2–4: Mostly "I would..." / "I think..." without evidence of experience
- 0–1: Generic AI-sounding text or pure speculation

**Consistency (20% weight):** Do answers align with each other?
- 8–10: Behavioral context matches across answers, story is coherent
- 5–7: Mostly consistent with minor gaps
- 2–4: Contradictory statements between answers
- 0–1: Answers seem written by different people or nonsensical

## Anti-Gaming Signals

Metadata is provided per answer. Factor these in:
- pasteDetected=true on multiple answers → likely copied from external source, reduce authenticity score
- timeSpentMs < 5000 on open-ended → suspiciously fast, may indicate low-effort
- charCount < 30 on open-ended → too thin to be useful

## Confidence

Rate your confidence 0.0–1.0 in your overall score. Lower confidence if:
- Answers are very short (hard to evaluate)
- Questions are ambiguous (hard to judge relevance)
- Response is borderline between score levels
- Anti-gaming signals are contradictory (e.g. high detail but paste detected)

## Output

Use the score_response tool. The overall score should be 0–100, computed as:
  depth × 3 + relevance × 2.5 + authenticity × 2.5 + consistency × 2

Write a one-sentence feedback summary (max 200 chars) that helps the founder understand the response quality at a glance. Be direct. Examples: "Detailed firsthand experience with strong behavioral evidence." or "Generic answers lacking specifics — likely hypothetical."`;

function buildRankingPrompt(
  campaignTitle: string,
  campaignDescription: string,
  answersWithMeta: AnswerWithMeta[]
): string {
  const answersBlock = answersWithMeta
    .map(
      (a, i) =>
        `Question ${i + 1} (${a.questionType}): ${sanitizeForPrompt(a.questionText)}\nAnswer: ${sanitizeForPrompt(a.answerText || "(no answer)")}\nMetadata: charCount=${a.metadata.charCount ?? 0}, timeSpentMs=${a.metadata.timeSpentMs ?? 0}, pasteDetected=${a.metadata.pasteDetected ?? false}, pasteCount=${a.metadata.pasteCount ?? 0}`
    )
    .join("\n\n");

  return `Campaign: "${sanitizeForPrompt(campaignTitle)}"
Description: ${sanitizeForPrompt(campaignDescription || "No description")}

---

${answersBlock}

---

Score this response using the score_response tool.`;
}

export async function scoreResponseWithAI(
  campaignTitle: string,
  campaignDescription: string,
  answersWithMeta: AnswerWithMeta[]
): Promise<ResponseScore> {
  const client = getClient();

  const response = await client.messages.create({
    model: MODELS.light,
    max_tokens: 512,
    system: cachedSystem(RANKING_SYSTEM_PROMPT),
    tools: cachedTools([SCORE_RESPONSE_TOOL]),
    tool_choice: { type: "tool", name: "score_response" },
    messages: [
      {
        role: "user",
        content: buildRankingPrompt(
          campaignTitle,
          campaignDescription,
          answersWithMeta
        ),
      },
    ],
  });

  // Extract tool use result
  const toolBlock = response.content.find((b) => b.type === "tool_use");
  if (!toolBlock || toolBlock.type !== "tool_use") {
    throw new Error("AI did not return a tool use response");
  }

  const parsed = ResponseScoreSchema.safeParse(toolBlock.input);
  if (!parsed.success) {
    throw new Error(`Invalid AI score: ${parsed.error.message}`);
  }

  // Apply confidence shrinkage (guard against undefined/NaN confidence)
  const rawData = parsed.data;
  const rawConf = safeNumber(rawData.confidence, 0.7);
  const confidence = Math.max(
    DEFAULTS.MIN_AI_CONFIDENCE,
    Math.min(1.0, rawConf)
  );
  const adjustedScore = applyConfidence(rawData.score, confidence);

  // Clamp score to valid range before returning
  const clampedScore = Math.min(Math.max(adjustedScore, 0), 100);

  // Track low-confidence AI scores distinctly for audit and payout gating
  const source: "ai" | "ai_low_confidence" =
    confidence >= DEFAULTS.PAYOUT_CONFIDENCE_THRESHOLD ? "ai" : "ai_low_confidence";

  return {
    score: clampedScore,
    feedback: rawData.feedback,
    dimensions: rawData.dimensions,
    confidence,
    source,
  };
}

/* ─── Deterministic Fallback ─── */

export function scoreResponseFallback(
  answersWithMeta: AnswerWithMeta[]
): ResponseScore {
  let depthScore = 5;
  let relevanceScore = 5;
  let authenticityScore = 5;
  let consistencyScore = 5;

  const openAnswers = answersWithMeta.filter(
    (a) => a.questionType === "open"
  );
  const totalAnswers = answersWithMeta.length;

  if (totalAnswers === 0) {
    return {
      score: 0,
      feedback: "No answers provided.",
      dimensions: { depth: 0, relevance: 0, authenticity: 0, consistency: 0 },
      confidence: DEFAULTS.FALLBACK_CONFIDENCE,
      source: "fallback",
    };
  }

  // Depth: based on char count of open-ended answers
  if (openAnswers.length > 0) {
    const avgChars =
      openAnswers.reduce((sum, a) => sum + (a.metadata.charCount ?? 0), 0) /
      openAnswers.length;

    if (avgChars > 300) depthScore = 9;
    else if (avgChars > 200) depthScore = 8;
    else if (avgChars > 100) depthScore = 6;
    else if (avgChars > 50) depthScore = 4;
    else depthScore = 2;
  }

  // Relevance: all questions answered = good baseline
  const answeredCount = answersWithMeta.filter(
    (a) => (a.answerText?.trim().length ?? 0) > 0
  ).length;
  relevanceScore = Math.round((answeredCount / totalAnswers) * 10);

  // Authenticity: penalize paste detection
  const pasteCount = answersWithMeta.reduce(
    (sum, a) => sum + (a.metadata.pasteCount ?? 0),
    0
  );
  if (pasteCount > 3) authenticityScore = 3;
  else if (pasteCount > 1) authenticityScore = 4;
  else if (pasteCount === 1) authenticityScore = 5;

  // Penalize suspiciously fast open-ended answers
  const fastAnswers = openAnswers.filter(
    (a) => (a.metadata.timeSpentMs ?? 0) < 5000
  );
  if (fastAnswers.length > openAnswers.length / 2) {
    authenticityScore = Math.max(authenticityScore - 2, 1);
  }

  // Consistency: all answered + reasonable time = consistent
  if (answeredCount === totalAnswers) consistencyScore = 7;

  // Compute overall (raw, before confidence damping)
  const rawOverall = Math.round(
    depthScore * 3 +
      relevanceScore * 2.5 +
      authenticityScore * 2.5 +
      consistencyScore * 2
  );
  const rawScore = Math.min(Math.max(rawOverall, 0), 100);

  // V2: Apply confidence damping — fallback scores are always at 0.5 confidence
  const score = applyConfidence(rawScore, DEFAULTS.FALLBACK_CONFIDENCE);

  let feedback: string;
  if (score >= 70) feedback = "Solid responses with good detail across answers.";
  else if (score >= 40)
    feedback =
      "Average responses — some detail but room for more depth.";
  else feedback = "Low-effort responses with minimal detail.";

  return {
    score,
    feedback: `${feedback} (Scored using heuristics — AI unavailable.)`,
    dimensions: {
      depth: depthScore,
      relevance: relevanceScore,
      authenticity: authenticityScore,
      consistency: consistencyScore,
    },
    confidence: DEFAULTS.FALLBACK_CONFIDENCE,
    source: "fallback",
  };
}

/* ─── Main Entry Point ─── */

export async function scoreResponse(
  campaignId: string,
  responseId: string,
  campaignTitle: string,
  campaignDescription: string,
  answersWithMeta: AnswerWithMeta[]
): Promise<ResponseScore> {
  const start = Date.now();
  let result: ResponseScore;
  let source: "ai" | "ai_low_confidence" | "fallback";

  if (isAIAvailable()) {
    try {
      result = await scoreResponseWithAI(
        campaignTitle,
        campaignDescription,
        answersWithMeta
      );
      source = "ai";
    } catch {
      result = scoreResponseFallback(answersWithMeta);
      source = "fallback";
    }
  } else {
    result = scoreResponseFallback(answersWithMeta);
    source = "fallback";
  }

  logGeneration({
    event: "response.ranked",
    campaignId,
    responseId,
    score: result.score,
    source,
    confidence: result.confidence,
    latencyMs: Date.now() - start,
  });

  return result;
}
