import { BASELINE_QUESTIONS } from "@/lib/baseline-questions";
import {
  getClient,
  MODELS,
  cachedSystem,
  cachedTools,
} from "@/lib/ai/client";
import { buildGeneratePrompt, SYSTEM_PROMPT } from "@/lib/ai/prompts";
import {
  AICampaignDraftSchema,
  GENERATE_CAMPAIGN_TOOL,
  type AICampaignDraftRaw,
} from "@/lib/ai/schemas";
import {
  questionId,
  type CampaignDraft,
  type CampaignDraftFallbackReason,
  type DraftAudience,
  type DraftQuestion,
} from "@/lib/ai/types";

const BASELINE_BY_ID = new Map(
  BASELINE_QUESTIONS.map((question) => [question.id, question] as const)
);

export class GenerateCampaignAIError extends Error {
  constructor(
    message: string,
    public readonly reason: CampaignDraftFallbackReason = "api_error",
    public readonly issues: string[] = []
  ) {
    super(message);
    this.name = "GenerateCampaignAIError";
  }
}

function validationError(message: string, issues: string[]) {
  return new GenerateCampaignAIError(message, "validation_failed", issues);
}

function sanitizeTextList(values: string[]): string[] {
  return values.map((value) => value.trim()).filter(Boolean);
}

function sanitizeAudience(raw: AICampaignDraftRaw["audience"]): DraftAudience {
  return {
    interests: sanitizeTextList(raw.interests),
    expertise: sanitizeTextList(raw.expertise),
    ageRanges: sanitizeTextList(raw.ageRanges),
    location: raw.location?.trim() ?? "",
    occupation: raw.occupation?.trim() ?? "",
    industry: raw.industry?.trim() ?? "",
    experienceLevel: raw.experienceLevel?.trim() ?? "",
    nicheQualifier: raw.nicheQualifier?.trim() ?? "",
  };
}

function toDraftQuestion(
  question:
    | AICampaignDraftRaw["openQuestions"][number]
    | AICampaignDraftRaw["followupQuestions"][number],
  section: "open" | "followup",
  assumptionsCount: number
): DraftQuestion {
  const trimmedText = question.text.trim();
  const isMultipleChoice = question.questionType === "multiple_choice";
  const options = sanitizeTextList(question.options ?? []);
  const anchors = sanitizeTextList(question.anchors ?? []).slice(0, 3);

  if (isMultipleChoice && options.length < 3) {
    throw validationError("AI returned an invalid multiple-choice question.", [
      `Question "${trimmedText}" did not include at least 3 non-empty options.`,
    ]);
  }

  const safeAssumptionIndex = Math.min(
    Math.max(question.assumptionIndex, 0),
    Math.max(assumptionsCount - 1, 0)
  );

  return {
    id: questionId(),
    text: trimmedText,
    type: isMultipleChoice ? "multiple_choice" : "open",
    options: isMultipleChoice ? options : null,
    section,
    isBaseline: false,
    category: question.evidenceCategory,
    assumptionIndex: safeAssumptionIndex,
    anchors: !isMultipleChoice && anchors.length > 0 ? anchors : undefined,
  };
}

export function adaptAICampaignDraft(raw: AICampaignDraftRaw): CampaignDraft {
  const title = raw.title.trim();
  const summary = raw.summary.trim();
  const tags = sanitizeTextList(raw.tags).slice(0, 5);
  const assumptions = sanitizeTextList(raw.assumptions).slice(0, 5);
  const baselineIds = sanitizeTextList(raw.baselineQuestionIds).slice(0, 3);

  if (!title || !summary) {
    throw validationError("AI returned an empty title or summary.", [
      "Title and summary must both be non-empty after trimming.",
    ]);
  }

  if (tags.length === 0) {
    throw validationError("AI returned empty audience tags.", [
      "At least one non-empty tag is required.",
    ]);
  }

  if (assumptions.length < 2) {
    throw validationError("AI returned too few usable assumptions.", [
      "At least 2 non-empty assumptions are required.",
    ]);
  }

  if (baselineIds.length !== 3) {
    throw validationError("AI returned the wrong number of baseline IDs.", [
      `Expected exactly 3 baseline IDs but received ${baselineIds.length}.`,
    ]);
  }

  const invalidBaselineIds = baselineIds.filter((id) => !BASELINE_BY_ID.has(id));
  if (invalidBaselineIds.length > 0) {
    throw validationError("AI returned unknown baseline question IDs.", invalidBaselineIds);
  }

  if (new Set(baselineIds).size !== baselineIds.length) {
    throw validationError("AI returned duplicate baseline question IDs.", baselineIds);
  }

  const customQuestions = [
    ...raw.openQuestions.map((question) =>
      toDraftQuestion(question, "open", assumptions.length)
    ),
    ...raw.followupQuestions.map((question) =>
      toDraftQuestion(question, "followup", assumptions.length)
    ),
  ];

  const baselineQuestions: DraftQuestion[] = baselineIds.map((baselineId) => {
    const baseline = BASELINE_BY_ID.get(baselineId)!;
    return {
      id: questionId(),
      text: baseline.text,
      type: "multiple_choice",
      options: [...baseline.options],
      section: "baseline",
      isBaseline: true,
      baselineId: baseline.id,
      category: baseline.category,
    };
  });

  return {
    title,
    summary,
    category: raw.category,
    tags,
    assumptions,
    questions: [...customQuestions, ...baselineQuestions],
    audience: sanitizeAudience(raw.audience),
    format: "quick",
  };
}

export async function generateCampaignDraftWithAI(
  scribbleText: string
): Promise<CampaignDraft> {
  const client = getClient();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  try {
    const response = await client.messages.create(
      {
        model: MODELS.generation,
        max_tokens: 2400,
        system: cachedSystem(SYSTEM_PROMPT),
        messages: [
          {
            role: "user",
            content: buildGeneratePrompt(scribbleText),
          },
        ],
        tools: cachedTools([GENERATE_CAMPAIGN_TOOL]),
        tool_choice: { type: "tool", name: "create_campaign_draft" },
      },
      { signal: controller.signal }
    );

    const toolBlock = response.content.find((block) => block.type === "tool_use");
    if (!toolBlock || toolBlock.type !== "tool_use") {
      throw validationError("AI did not return a campaign draft tool call.", [
        "Missing tool_use block.",
      ]);
    }

    const parsed = AICampaignDraftSchema.safeParse(toolBlock.input);
    if (!parsed.success) {
      throw validationError(
        "AI campaign draft failed schema validation.",
        parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      );
    }

    return adaptAICampaignDraft(parsed.data);
  } finally {
    clearTimeout(timeout);
  }
}
