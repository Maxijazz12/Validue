import type { QualityScores } from "./types";

/* ─── Generation Event Types ─── */

type GenerationStarted = {
  event: "generation.started";
  scribbleLength: number;
  userId: string;
};

type GenerationSuccess = {
  event: "generation.success";
  latencyMs: number;
  model: string;
  promptVersion: string;
  generationVersion: string;
  baselineIds: string[];
  qualityOverall: number;
  source: "ai" | "fallback";
};

type GenerationFallback = {
  event: "generation.fallback";
  reason: "no_api_key" | "api_error" | "validation_failed";
  errorMessage?: string;
};

type GenerationValidationFailed = {
  event: "generation.validation_failed";
  issues: string[];
};

type QuestionRegenerated = {
  event: "question.regenerated";
  section: string;
  latencyMs: number;
  model: string;
  source: "ai" | "fallback";
};

type AudienceImproved = {
  event: "audience.improved";
  fieldsChanged: string[];
  latencyMs: number;
  model: string;
  source: "ai" | "fallback";
};

type QualityScored = {
  event: "quality.scores";
  scores: {
    audienceClarity: number;
    questionQuality: number;
    behavioralCoverage: number;
    monetizationCoverage: number;
    overall: number;
  };
  warningCount: number;
  highSeverityCount: number;
};

type ResponseRanked = {
  event: "response.ranked";
  campaignId: string;
  responseId: string;
  score: number;
  source: "ai" | "fallback";
  confidence: number;
  latencyMs: number;
};

type GenerationEvent =
  | GenerationStarted
  | GenerationSuccess
  | GenerationFallback
  | GenerationValidationFailed
  | QuestionRegenerated
  | AudienceImproved
  | QualityScored
  | ResponseRanked;

/* ─── Logger ─── */

/**
 * Structured JSON logging for the generation system.
 * Outputs to stdout — compatible with any log aggregator.
 */
export function logGeneration(event: GenerationEvent): void {
  const fullEvent = {
    ...event,
    timestamp: new Date().toISOString(),
    service: "validue-generation",
  };

  console.log(JSON.stringify(fullEvent));
}

/* ─── Convenience helpers ─── */

export function logQualityScores(scores: QualityScores): void {
  logGeneration({
    event: "quality.scores",
    scores: {
      audienceClarity: scores.audienceClarity,
      questionQuality: scores.questionQuality,
      behavioralCoverage: scores.behavioralCoverage,
      monetizationCoverage: scores.monetizationCoverage,
      overall: scores.overall,
    },
    warningCount: scores.warnings.length,
    highSeverityCount: scores.warnings.filter((w) => w.severity === "high").length,
  });
}
