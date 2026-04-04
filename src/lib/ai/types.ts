/* ─── Shared UID Generator ─── */

/** Generate a unique question ID. Safe in both server and browser contexts. */
export function questionId(): string {
  return `q-${crypto.randomUUID()}`;
}

/* ─── Create-an-Idea Flow Types ─── */

export type QuestionType = "open" | "multiple_choice";

export type EvidenceCategory =
  | "behavior"
  | "attempts"
  | "willingness"
  | "price"
  | "pain"
  | "negative";

/** @deprecated Use EvidenceCategory instead */
export type BaselineCategory = EvidenceCategory;

export interface DraftQuestion {
  id: string;
  text: string;
  type: QuestionType;
  options: string[] | null;
  section: "open" | "followup" | "baseline";
  isBaseline: boolean;
  baselineId?: string; // references BaselineQuestion.id when swapped from library
  category?: EvidenceCategory;
  assumptionIndex?: number; // 0-based index into campaign assumptions array — which assumption this question tests
  anchors?: string[]; // 2-3 response anchor hints for open-ended questions (e.g. "Include: what tools you used, how often, what didn't work")
}

/**
 * All string fields default to "" (empty string), never null or undefined.
 * When loading from the database, coerce null values to "" before passing to components.
 */
export interface DraftAudience {
  interests: string[];
  expertise: string[];
  ageRanges: string[];
  location: string;
  occupation: string;
  industry: string;
  experienceLevel: string;
  nicheQualifier: string;
}

/* ─── Quality Scoring ─── */

export interface QualityWarning {
  severity: "low" | "medium" | "high";
  dimension: string;
  message: string;
  questionId?: string;
}

export interface QualityScores {
  audienceClarity: number;         // 0–100
  questionQuality: number;         // 0–100
  behavioralCoverage: number;      // 0–100
  monetizationCoverage: number;    // 0–100
  assumptionSpecificity: number;   // 0–100
  overall: number;                 // 0–100
  warnings: QualityWarning[];
}

/* ─── Campaign Draft ─── */

export interface CampaignDraft {
  title: string;
  summary: string;
  category: string;
  tags: string[];
  assumptions: string[];
  questions: DraftQuestion[];
  audience: DraftAudience;
  qualityScores?: QualityScores;
  rewardPool?: number;
  /** V2: campaign format — defaults to 'quick' */
  format?: "quick" | "standard";
  rewardType?: "pool" | "top_only";
  bonusAvailable?: boolean;
  rewardsTopAnswers?: boolean;
  /** Targeting strictness: broad (ranking only), balanced (any overlap), strict (all overlap) */
  targetingMode?: "broad" | "balanced" | "strict";
  /** In strict mode, only these dimensions are hard gates (empty = all targeted required) */
  hardFilterDimensions?: string[];
}

/* ─── Signal Strength (UI display) ─── */

export interface SignalStrengthResult {
  score: number; // 0–100
  label: string;
  color: string;
  tips: SignalTip[];
  dimensions?: {
    audienceClarity: number;
    questionQuality: number;
    behavioralCoverage: number;
    monetizationCoverage: number;
    assumptionSpecificity: number;
  };
}

export interface SignalTip {
  type: "warning" | "success" | "info";
  message: string;
  questionId?: string;
}

/* ─── API Request/Response Types ─── */

export interface GenerateCampaignRequest {
  scribbleText: string;
}

export type CampaignDraftSource = "ai" | "fallback";

export type CampaignDraftFallbackReason =
  | "no_api_key"
  | "api_error"
  | "validation_failed";

export interface CampaignDraftGeneration {
  source: CampaignDraftSource;
  fallbackReason?: CampaignDraftFallbackReason;
}

export interface GenerateCampaignResponse extends CampaignDraftGeneration {
  status: "done";
  draft: CampaignDraft;
}

export interface RegenerateQuestionRequest {
  scribbleText: string;
  campaignSummary: string;
  assumptions: string[];
  audience: DraftAudience;
  currentQuestion: DraftQuestion;
  allQuestions: DraftQuestion[];
}

export interface ImproveAudienceRequest {
  scribbleText: string;
  currentAudience: DraftAudience;
  assumptions: string[];
  questions: DraftQuestion[];
}

/* ─── Response Ranking ─── */

export interface ResponseScoreDimensions {
  depth: number;       // 0–10
  relevance: number;   // 0–10
  authenticity: number; // 0–10
  consistency: number; // 0–10
}

export interface ResponseScore {
  score: number;          // 0–100 (confidence-adjusted in V2)
  feedback: string;       // one-sentence summary
  dimensions: ResponseScoreDimensions;
  confidence: number;     // 0.0–1.0 — how confident the scoring source is
  source: "ai" | "ai_low_confidence" | "fallback"; // which scoring system produced this result
}

export interface AnswerWithMeta {
  questionId: string;
  questionText: string;
  questionType: "open" | "multiple_choice";
  answerText: string;
  metadata: {
    pasteDetected?: boolean;
    pasteCount?: number;
    timeSpentMs?: number;
    charCount?: number;
  };
}
