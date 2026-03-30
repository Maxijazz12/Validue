import { z } from "zod";
import {
  CATEGORY_OPTIONS,
  INTEREST_OPTIONS,
  EXPERTISE_OPTIONS,
  AGE_RANGE_OPTIONS,
  INDUSTRY_OPTIONS,
  EXPERIENCE_LEVEL_OPTIONS,
} from "@/lib/constants";

/* ─── Helper: convert readonly tuple to writable for Zod enum ─── */

function asWritable<T extends readonly [string, ...string[]]>(arr: T): [...T] {
  return [...arr] as [...T];
}

/* ─── Audience Schema ─── */

export const AIDraftAudienceSchema = z.object({
  interests: z.array(z.enum(asWritable(INTEREST_OPTIONS))).min(1).max(6),
  expertise: z.array(z.enum(asWritable(EXPERTISE_OPTIONS))).min(1).max(4),
  ageRanges: z.array(z.enum(asWritable(AGE_RANGE_OPTIONS))).min(1).max(5),
  location: z.string().default(""),
  occupation: z.string().default(""),
  industry: z.enum(["", ...asWritable(INDUSTRY_OPTIONS)]).default(""),
  experienceLevel: z.enum(["", ...asWritable(EXPERIENCE_LEVEL_OPTIONS)]).default(""),
  nicheQualifier: z.string().default(""),
});

/* ─── Question Schemas ─── */

export const EVIDENCE_CATEGORIES = ["behavior", "attempts", "willingness", "price", "pain", "negative"] as const;

export const AIOpenQuestionSchema = z.object({
  text: z.string().min(10),
  section: z.enum(["open", "followup"]),
  assumptionIndex: z.number().int().min(0).max(4),
  anchors: z.array(z.string()).min(2).max(3),
  evidenceCategory: z.enum(EVIDENCE_CATEGORIES),
});

export const AIBaselinePickSchema = z.object({
  baselineId: z.string(),
});

/* ─── Main Campaign Draft Schema (what the AI tool returns) ─── */

export const AICampaignDraftSchema = z.object({
  title: z.string().min(5).max(120),
  summary: z.string().min(20).max(500),
  category: z.enum(asWritable(CATEGORY_OPTIONS)),
  tags: z.array(z.string()).min(1).max(5),
  assumptions: z.array(z.string().min(10)).min(2).max(5),
  openQuestions: z.array(AIOpenQuestionSchema).min(2).max(4),
  followupQuestions: z.array(AIOpenQuestionSchema).min(1).max(3),
  baselineQuestionIds: z.array(z.string()).length(3),
  audience: AIDraftAudienceSchema,
});

export type AICampaignDraftRaw = z.infer<typeof AICampaignDraftSchema>;

/* ─── Single Question Regeneration Schema ─── */

export const AIRegeneratedQuestionSchema = z.object({
  text: z.string().min(10),
  section: z.enum(["open", "followup"]),
  evidenceCategory: z.enum(EVIDENCE_CATEGORIES),
});

export type AIRegeneratedQuestionRaw = z.infer<typeof AIRegeneratedQuestionSchema>;

/* ─── Audience Improvement Schema ─── */

export const AIImprovedAudienceSchema = AIDraftAudienceSchema;

export type AIImprovedAudienceRaw = z.infer<typeof AIImprovedAudienceSchema>;

/* ─── Tool Definitions for Claude API ─── */

export const GENERATE_CAMPAIGN_TOOL = {
  name: "create_campaign_draft" as const,
  description:
    "Generate a structured validation campaign from a founder's raw business idea. Returns a complete campaign draft with title, summary, questions, audience targeting, and assumptions.",
  input_schema: {
    type: "object" as const,
    required: [
      "title",
      "summary",
      "category",
      "tags",
      "assumptions",
      "openQuestions",
      "followupQuestions",
      "baselineQuestionIds",
      "audience",
    ],
    properties: {
      title: {
        type: "string" as const,
        description: "A clear, concise campaign title (5–120 characters)",
      },
      summary: {
        type: "string" as const,
        description:
          "A polished 2–3 sentence summary of the idea, what problem it solves, and for whom (20–500 characters)",
      },
      category: {
        type: "string" as const,
        enum: [...CATEGORY_OPTIONS],
        description: "The primary category for this idea",
      },
      tags: {
        type: "array" as const,
        items: { type: "string" as const },
        minItems: 1,
        maxItems: 5,
        description:
          "1–5 audience tags that describe who this idea is for (e.g. Students, Founders, Parents)",
      },
      assumptions: {
        type: "array" as const,
        items: { type: "string" as const },
        minItems: 2,
        maxItems: 5,
        description:
          "2–5 testable assumptions this campaign validates. Each should be a declarative statement, not a question.",
      },
      openQuestions: {
        type: "array" as const,
        items: {
          type: "object" as const,
          required: ["text", "section", "assumptionIndex", "anchors", "evidenceCategory"],
          properties: {
            text: {
              type: "string" as const,
              description: "The question text",
            },
            section: {
              type: "string" as const,
              enum: ["open", "followup"],
              description:
                "'open' for broad validation questions, 'followup' for idea-specific probes",
            },
            assumptionIndex: {
              type: "number" as const,
              description: "0-based index into the assumptions array. Which assumption does this question primarily test?",
            },
            anchors: {
              type: "array" as const,
              items: { type: "string" as const },
              minItems: 2,
              maxItems: 3,
              description: "2-3 response anchor hints shown below the text area to guide respondent answers (e.g. 'Include: specific tools or apps you used', 'Mention: how often and how long ago')",
            },
            evidenceCategory: {
              type: "string" as const,
              enum: ["behavior", "attempts", "willingness", "price", "pain", "negative"],
              description: "What type of evidence this question gathers: behavior (current habits), attempts (past solutions tried), willingness (openness to switching), price (spending/WTP), pain (problem severity), negative (disconfirmation — evidence AGAINST the assumption)",
            },
          },
        },
        minItems: 2,
        maxItems: 4,
        description:
          "2–4 open-ended validation questions. Must be behavior-based, non-leading, and help the founder understand current behavior and pain.",
      },
      followupQuestions: {
        type: "array" as const,
        items: {
          type: "object" as const,
          required: ["text", "section", "assumptionIndex", "anchors", "evidenceCategory"],
          properties: {
            text: {
              type: "string" as const,
              description: "The question text",
            },
            section: {
              type: "string" as const,
              enum: ["open", "followup"],
              description: "Should be 'followup'",
            },
            assumptionIndex: {
              type: "number" as const,
              description: "0-based index into the assumptions array",
            },
            anchors: {
              type: "array" as const,
              items: { type: "string" as const },
              minItems: 2,
              maxItems: 3,
              description: "Response anchors — same format as openQuestions",
            },
            evidenceCategory: {
              type: "string" as const,
              enum: ["behavior", "attempts", "willingness", "price", "pain", "negative"],
              description: "Evidence type — same enum as openQuestions",
            },
          },
        },
        minItems: 1,
        maxItems: 3,
        description:
          "1–3 follow-up questions. Probe willingness, use cases, or objections.",
      },
      baselineQuestionIds: {
        type: "array" as const,
        items: { type: "string" as const },
        minItems: 3,
        maxItems: 3,
        description:
          "Exactly 3 IDs from the baseline question library. Pick the most relevant ones for this idea.",
      },
      audience: {
        type: "object" as const,
        required: ["interests", "expertise", "ageRanges"],
        properties: {
          interests: {
            type: "array" as const,
            items: { type: "string" as const, enum: [...INTEREST_OPTIONS] },
            minItems: 1,
            maxItems: 6,
            description: "Target interest categories",
          },
          expertise: {
            type: "array" as const,
            items: { type: "string" as const, enum: [...EXPERTISE_OPTIONS] },
            minItems: 1,
            maxItems: 4,
            description: "Target expertise types",
          },
          ageRanges: {
            type: "array" as const,
            items: { type: "string" as const, enum: [...AGE_RANGE_OPTIONS] },
            minItems: 1,
            maxItems: 5,
            description: "Target age ranges",
          },
          location: {
            type: "string" as const,
            description: "Target location (e.g. 'USA', 'Europe', 'Global'). Empty string if not specific.",
          },
          occupation: {
            type: "string" as const,
            description:
              "Target occupation or role (e.g. 'Product Manager', 'Freelancer'). Empty string if not specific.",
          },
          industry: {
            type: "string" as const,
            enum: ["", ...INDUSTRY_OPTIONS],
            description: "Target industry. Empty string if not specific.",
          },
          experienceLevel: {
            type: "string" as const,
            enum: ["", ...EXPERIENCE_LEVEL_OPTIONS],
            description: "Target experience level. Empty string if not specific.",
          },
          nicheQualifier: {
            type: "string" as const,
            description:
              "Optional niche qualifier (e.g. 'Uses Figma daily', 'Has kids under 5'). Empty string if none.",
          },
        },
      },
    },
  },
};

export const REGENERATE_QUESTION_TOOL = {
  name: "regenerate_question" as const,
  description:
    "Generate a replacement validation question for a founder's campaign.",
  input_schema: {
    type: "object" as const,
    required: ["text", "section", "evidenceCategory"],
    properties: {
      text: {
        type: "string" as const,
        description: "The new question text",
      },
      section: {
        type: "string" as const,
        enum: ["open", "followup"],
        description: "Whether this is an open-ended or follow-up question",
      },
      evidenceCategory: {
        type: "string" as const,
        enum: ["behavior", "attempts", "willingness", "price", "pain", "negative"],
        description: "What type of evidence this question gathers",
      },
    },
  },
};

export const IMPROVE_AUDIENCE_TOOL = {
  name: "improve_audience" as const,
  description:
    "Suggest improved audience targeting for a founder's validation campaign.",
  input_schema: {
    ...GENERATE_CAMPAIGN_TOOL.input_schema.properties.audience,
    required: ["interests", "expertise", "ageRanges"],
  },
};

/* ─── Response Scoring ─── */

export const ResponseScoreSchema = z.object({
  score: z.number().min(0).max(100),
  feedback: z.string().max(200),
  confidence: z.number().min(0).max(1).default(0.7),
  dimensions: z.object({
    depth: z.number().min(0).max(10),
    relevance: z.number().min(0).max(10),
    authenticity: z.number().min(0).max(10),
    consistency: z.number().min(0).max(10),
  }),
});

export type ResponseScoreRaw = z.infer<typeof ResponseScoreSchema>;

export const SCORE_RESPONSE_TOOL = {
  name: "score_response" as const,
  description:
    "Score a respondent's answers to a validation campaign. Evaluate quality based on depth, relevance, authenticity, and consistency.",
  input_schema: {
    type: "object" as const,
    required: ["score", "feedback", "confidence", "dimensions"],
    properties: {
      score: {
        type: "number" as const,
        description: "Overall quality score from 0 to 100",
      },
      feedback: {
        type: "string" as const,
        description:
          "One-sentence summary of response quality for the campaign creator (max 200 chars)",
      },
      confidence: {
        type: "number" as const,
        description:
          "Confidence in the overall score (0.0–1.0). Lower if answers are very short, questions are ambiguous, response is borderline, or anti-gaming signals are contradictory.",
      },
      dimensions: {
        type: "object" as const,
        required: ["depth", "relevance", "authenticity", "consistency"],
        properties: {
          depth: {
            type: "number" as const,
            description:
              "0–10: Specificity and detail in open-ended answers. Specific examples, numbers, and timeframes score higher.",
          },
          relevance: {
            type: "number" as const,
            description:
              "0–10: How directly each answer addresses the question asked.",
          },
          authenticity: {
            type: "number" as const,
            description:
              "0–10: Evidence of real experience vs hypothetical language. First-person accounts and specific tools/products named score higher.",
          },
          consistency: {
            type: "number" as const,
            description:
              "0–10: Whether answers align with each other across questions.",
          },
        },
      },
    },
  },
};
