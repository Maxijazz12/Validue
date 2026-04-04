import {
  questionId,
  type CampaignDraft,
  type DraftQuestion,
  type EvidenceCategory,
  type QuestionType,
} from "@/lib/ai/types";
import { enforceLength, MAX_LENGTHS } from "@/lib/content-filter";
import type { CampaignFormat } from "@/lib/payout-math";

export type StoredDraftCampaignRecord = {
  title: string | null;
  description: string | null;
  category: string | null;
  tags: unknown;
  reward_amount: number | null;
  reward_type?: string | null;
  bonus_available?: boolean | null;
  rewards_top_answers?: boolean | null;
  format: string | null;
  estimated_minutes?: number | null;
  key_assumptions: unknown;
  target_interests: unknown;
  target_expertise: unknown;
  target_age_ranges: unknown;
  target_location: string | null;
  audience_occupation: string | null;
  audience_industry: string | null;
  audience_experience_level: string | null;
  audience_niche_qualifier: string | null;
  targeting_mode: string | null;
  quality_scores: unknown;
  quality_score?: number | null;
};

export type StoredDraftQuestionRecord = {
  text: string;
  type: string;
  sort_order: number | null;
  options: unknown;
  is_baseline: boolean | null;
  category: string | null;
  assumption_index: number | null;
  anchors: unknown;
};

export type PersistedCampaignDraft = {
  title: string;
  summary: string;
  category: string;
  tags: string[];
  estimatedMinutes: number;
  rewardAmount: number;
  rewardType: "pool" | "top_only";
  bonusAvailable: boolean;
  rewardsTopAnswers: boolean;
  format: CampaignFormat;
  keyAssumptions: string[];
  targetInterests: string[];
  targetExpertise: string[];
  targetAgeRanges: string[];
  targetLocation: string | null;
  audienceOccupation: string | null;
  audienceIndustry: string | null;
  audienceExperienceLevel: string | null;
  audienceNicheQualifier: string | null;
  targetingMode: "broad" | "balanced" | "strict";
  qualityScoresJson: string | null;
  qualityScores: CampaignDraft["qualityScores"] | null;
  qualityScore: number;
};

export type PersistedQuestionRecord = {
  text: string;
  type: QuestionType;
  sortOrder: number;
  options: string[] | null;
  optionsJson: string | null;
  isBaseline: boolean;
  category: EvidenceCategory | null;
  assumptionIndex: number | null;
  anchors: string[] | null;
  anchorsJson: string | null;
};

function normalizeFormat(
  format: string | null | undefined,
  estimatedMinutes?: number | null
): CampaignFormat {
  if (format === "standard") return "standard";
  if (format === "quick") return "quick";
  return Number(estimatedMinutes ?? 0) >= 5 ? "standard" : "quick";
}

function normalizeRewardType(
  rewardType: string | null | undefined
): "pool" | "top_only" {
  return rewardType === "top_only" ? "top_only" : "pool";
}

function normalizeTargetingMode(
  mode: string | null | undefined
): "broad" | "balanced" | "strict" {
  if (mode === "broad") return "broad";
  if (mode === "strict") return "strict";
  return "balanced";
}

function coerceStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;

  return value.filter((item): item is string => typeof item === "string");
}

function coerceQualityScores(
  value: unknown
): CampaignDraft["qualityScores"] | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as CampaignDraft["qualityScores"];
}

function inferDraftQuestionSection(
  isBaseline: boolean,
  index: number,
  totalQuestions: number
): DraftQuestion["section"] {
  if (isBaseline) return "baseline";
  return index < totalQuestions - 2 ? "open" : "followup";
}

function buildPersistedQuestionRecord(
  input: {
    text: string;
    type: QuestionType;
    sortOrder: number;
    options: string[] | null;
    isBaseline: boolean;
    category: string | null | undefined;
    assumptionIndex: number | null | undefined;
    anchors: string[] | null | undefined;
  }
): PersistedQuestionRecord {
  return {
    text: input.text,
    type: input.type,
    sortOrder: input.sortOrder,
    options: input.options ?? null,
    optionsJson: input.options ? JSON.stringify(input.options) : null,
    isBaseline: input.isBaseline,
    category: (input.category as EvidenceCategory | null | undefined) ?? null,
    assumptionIndex: input.assumptionIndex ?? null,
    anchors: input.anchors ?? null,
    anchorsJson: input.anchors ? JSON.stringify(input.anchors) : null,
  };
}

export function buildPersistedCampaignDraft(
  draft: CampaignDraft
): PersistedCampaignDraft {
  const format = normalizeFormat(draft.format);
  const qualityScores = draft.qualityScores ?? null;

  return {
    title: draft.title,
    summary: draft.summary,
    category: draft.category,
    tags: draft.tags.map((tag) => enforceLength(tag, MAX_LENGTHS.TAG).text),
    estimatedMinutes: format === "standard" ? 5 : 3,
    rewardAmount: draft.rewardPool || 0,
    rewardType: normalizeRewardType(draft.rewardType),
    bonusAvailable: !!draft.bonusAvailable,
    rewardsTopAnswers: !!draft.rewardsTopAnswers,
    format,
    keyAssumptions: draft.assumptions
      .filter((assumption) => assumption.trim().length > 0)
      .map((assumption) => enforceLength(assumption, 500).text),
    targetInterests: draft.audience.interests,
    targetExpertise: draft.audience.expertise,
    targetAgeRanges: draft.audience.ageRanges,
    targetLocation: draft.audience.location || null,
    audienceOccupation: draft.audience.occupation || null,
    audienceIndustry: draft.audience.industry || null,
    audienceExperienceLevel: draft.audience.experienceLevel || null,
    audienceNicheQualifier: draft.audience.nicheQualifier || null,
    targetingMode: normalizeTargetingMode(draft.targetingMode),
    qualityScoresJson: qualityScores ? JSON.stringify(qualityScores) : null,
    qualityScores,
    qualityScore: qualityScores?.overall ?? 0,
  };
}

export function buildPersistedQuestionRecords(
  questions: DraftQuestion[]
): PersistedQuestionRecord[] {
  return questions.map((question, index) =>
    buildPersistedQuestionRecord({
      text: question.text,
      type: question.type,
      sortOrder: index,
      options: question.options,
      isBaseline: question.isBaseline,
      category: question.category,
      assumptionIndex: question.assumptionIndex,
      anchors: question.anchors,
    })
  );
}

export function buildCopiedCampaignDraft(
  campaign: StoredDraftCampaignRecord,
  overrides?: {
    title?: string;
    rewardAmount?: number;
  }
): PersistedCampaignDraft {
  const format = normalizeFormat(campaign.format, campaign.estimated_minutes);
  const qualityScores = coerceQualityScores(campaign.quality_scores);

  return {
    title: overrides?.title ?? campaign.title ?? "",
    summary: campaign.description ?? "",
    category: campaign.category ?? "Other",
    tags: coerceStringArray(campaign.tags) ?? [],
    estimatedMinutes: format === "standard" ? 5 : 3,
    rewardAmount:
      overrides?.rewardAmount ?? (Number(campaign.reward_amount) || 0),
    rewardType: normalizeRewardType(campaign.reward_type),
    bonusAvailable: !!campaign.bonus_available,
    rewardsTopAnswers: !!campaign.rewards_top_answers,
    format,
    keyAssumptions: coerceStringArray(campaign.key_assumptions) ?? [],
    targetInterests: coerceStringArray(campaign.target_interests) ?? [],
    targetExpertise: coerceStringArray(campaign.target_expertise) ?? [],
    targetAgeRanges: coerceStringArray(campaign.target_age_ranges) ?? [],
    targetLocation: campaign.target_location ?? null,
    audienceOccupation: campaign.audience_occupation ?? null,
    audienceIndustry: campaign.audience_industry ?? null,
    audienceExperienceLevel: campaign.audience_experience_level ?? null,
    audienceNicheQualifier: campaign.audience_niche_qualifier ?? null,
    targetingMode: normalizeTargetingMode(campaign.targeting_mode),
    qualityScoresJson: qualityScores ? JSON.stringify(qualityScores) : null,
    qualityScores,
    qualityScore:
      qualityScores?.overall ?? (Number(campaign.quality_score) || 0),
  };
}

export function buildCopiedQuestionRecords(
  questions: StoredDraftQuestionRecord[]
): PersistedQuestionRecord[] {
  return questions.map((question, index) =>
    buildPersistedQuestionRecord({
      text: question.text,
      type:
        question.type === "multiple_choice" ? "multiple_choice" : "open",
      sortOrder:
        Number.isFinite(question.sort_order) && question.sort_order !== null
          ? question.sort_order
          : index,
      options: coerceStringArray(question.options),
      isBaseline: !!question.is_baseline,
      category: question.category,
      assumptionIndex: question.assumption_index,
      anchors: coerceStringArray(question.anchors),
    })
  );
}

export function buildDraftFromStoredCampaign(
  campaign: StoredDraftCampaignRecord,
  questions: StoredDraftQuestionRecord[]
): CampaignDraft {
  const persistedCampaign = buildCopiedCampaignDraft(campaign);
  const totalQuestions = questions.length;

  return {
    title: persistedCampaign.title,
    summary: persistedCampaign.summary,
    category: persistedCampaign.category,
    tags: persistedCampaign.tags,
    assumptions: persistedCampaign.keyAssumptions,
    questions: buildCopiedQuestionRecords(questions).map((question, index) => ({
      id: questionId(),
      text: question.text,
      type: question.type,
      options: question.options,
      section: inferDraftQuestionSection(
        question.isBaseline,
        index,
        totalQuestions
      ),
      isBaseline: question.isBaseline,
      category: question.category ?? undefined,
      assumptionIndex: question.assumptionIndex ?? undefined,
      anchors: question.anchors ?? undefined,
    })),
    audience: {
      interests: persistedCampaign.targetInterests,
      expertise: persistedCampaign.targetExpertise,
      ageRanges: persistedCampaign.targetAgeRanges,
      location: persistedCampaign.targetLocation || "",
      occupation: persistedCampaign.audienceOccupation || "",
      industry: persistedCampaign.audienceIndustry || "",
      experienceLevel: persistedCampaign.audienceExperienceLevel || "",
      nicheQualifier: persistedCampaign.audienceNicheQualifier || "",
    },
    qualityScores: persistedCampaign.qualityScores ?? undefined,
    rewardPool: persistedCampaign.rewardAmount,
    format: persistedCampaign.format,
    rewardType: persistedCampaign.rewardType,
    bonusAvailable: persistedCampaign.bonusAvailable,
    rewardsTopAnswers: persistedCampaign.rewardsTopAnswers,
    targetingMode: persistedCampaign.targetingMode,
  };
}
