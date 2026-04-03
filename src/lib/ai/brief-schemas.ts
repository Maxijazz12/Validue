import { z } from "zod";

/* ─── Brief Output Schemas ─── */

export const AssumptionVerdictSchema = z.object({
  assumption: z.string(),
  assumptionIndex: z.number().int().min(0),
  verdict: z.enum(["CONFIRMED", "CHALLENGED", "REFUTED", "INSUFFICIENT_DATA"]),
  confidence: z.enum(["HIGH", "MEDIUM", "LOW"]),
  evidenceSummary: z.string().max(600),
  supportingCount: z.number().int().min(0),
  contradictingCount: z.number().int().min(0),
  totalResponses: z.number().int().min(0),
  quotes: z
    .array(
      z.object({
        text: z.string().max(400),
        respondentLabel: z.string().max(50),
      })
    )
    .min(0)
    .max(3),
  contradictingSignal: z.string().max(400).optional(),
});

export const NextStepSchema = z.object({
  action: z.string().max(400),
  effort: z.enum(["Low", "Medium", "High"]),
  timeline: z.string().max(50),
  whatItTests: z.string().max(400),
});

export const DecisionBriefSchema = z.object({
  recommendation: z.enum(["PROCEED", "PIVOT", "PAUSE"]),
  confidence: z.enum(["HIGH", "MEDIUM", "LOW"]),
  confidenceRationale: z.string().max(600),
  uncomfortableTruth: z.string().max(800),
  signalSummary: z.string().max(800),
  assumptionVerdicts: z.array(AssumptionVerdictSchema).min(1).max(5),
  strongestSignals: z.array(z.string().max(400)).min(1).max(5),
  nextSteps: z.array(NextStepSchema).min(2).max(5),
  cheapestTest: z.string().max(500),
});

export type DecisionBrief = z.infer<typeof DecisionBriefSchema>;
export type AssumptionVerdict = z.infer<typeof AssumptionVerdictSchema>;
export type NextStep = z.infer<typeof NextStepSchema>;

/* ─── Tool Definition ─── */

export const SYNTHESIZE_BRIEF_TOOL = {
  name: "create_decision_brief" as const,
  description:
    "Synthesize scored responses into a structured Decision Brief for a founder's validation campaign.",
  input_schema: {
    type: "object" as const,
    required: [
      "recommendation",
      "confidence",
      "confidenceRationale",
      "uncomfortableTruth",
      "signalSummary",
      "assumptionVerdicts",
      "strongestSignals",
      "nextSteps",
      "cheapestTest",
    ],
    properties: {
      recommendation: {
        type: "string" as const,
        enum: ["PROCEED", "PIVOT", "PAUSE"],
        description:
          "Top-line recommendation. PROCEED = idea has strong signal, keep building. PIVOT = core insight is valid but execution needs to change. PAUSE = insufficient signal or fundamental problems.",
      },
      confidence: {
        type: "string" as const,
        enum: ["HIGH", "MEDIUM", "LOW"],
        description:
          "Confidence in the recommendation. HIGH = strong consensus with behavioral evidence. MEDIUM = directional signal but gaps. LOW = thin or split evidence.",
      },
      confidenceRationale: {
        type: "string" as const,
        maxLength: 600,
        description:
          "1-2 sentences explaining why confidence is at this level. Be specific about what's strong and what's weak in the evidence. Max 600 chars.",
      },
      uncomfortableTruth: {
        type: "string" as const,
        maxLength: 800,
        description:
          "The single hardest-to-hear finding. The thing the founder least wants to hear but most needs to hear. Lead with this — don't soften it. 2-3 sentences max. Max 800 chars.",
      },
      signalSummary: {
        type: "string" as const,
        maxLength: 800,
        description:
          "2-3 sentence synthesis of what the behavioral data collectively means. Not scores. Meaning. Max 800 chars.",
      },
      assumptionVerdicts: {
        type: "array" as const,
        items: {
          type: "object" as const,
          required: [
            "assumption",
            "assumptionIndex",
            "verdict",
            "confidence",
            "evidenceSummary",
            "supportingCount",
            "contradictingCount",
            "totalResponses",
            "quotes",
          ],
          properties: {
            assumption: {
              type: "string" as const,
              description: "The assumption statement being tested",
            },
            assumptionIndex: {
              type: "number" as const,
              description: "Index into the campaign's assumptions array",
            },
            verdict: {
              type: "string" as const,
              enum: [
                "CONFIRMED",
                "CHALLENGED",
                "REFUTED",
                "INSUFFICIENT_DATA",
              ],
            },
            confidence: {
              type: "string" as const,
              enum: ["HIGH", "MEDIUM", "LOW"],
            },
            evidenceSummary: {
              type: "string" as const,
              maxLength: 600,
              description:
                "2-3 sentences summarizing the evidence for/against this assumption. Max 600 chars.",
            },
            supportingCount: {
              type: "number" as const,
              description:
                "Number of responses that support this assumption",
            },
            contradictingCount: {
              type: "number" as const,
              description:
                "Number of responses that contradict this assumption",
            },
            totalResponses: {
              type: "number" as const,
              description:
                "Total responses with evidence relevant to this assumption",
            },
            quotes: {
              type: "array" as const,
              items: {
                type: "object" as const,
                required: ["text", "respondentLabel"],
                properties: {
                  text: {
                    type: "string" as const,
                    maxLength: 400,
                    description:
                      "Direct quote from a respondent (max 400 chars). Pick the most vivid, specific quotes.",
                  },
                  respondentLabel: {
                    type: "string" as const,
                    description:
                      "Anonymous label like 'Respondent 1' or 'Respondent 4'",
                  },
                },
              },
              description:
                "2-3 most compelling direct quotes as evidence. Prioritize quotes with specific details, not generic statements.",
            },
            contradictingSignal: {
              type: "string" as const,
              maxLength: 400,
              description:
                "Brief note on any contradicting evidence, if present. Include a quote if available. Max 400 chars.",
            },
          },
        },
        description:
          "One verdict per assumption. Every assumption must get a verdict.",
      },
      strongestSignals: {
        type: "array" as const,
        items: { type: "string" as const, maxLength: 400 },
        description:
          "3-5 bullet points of what DID resonate — the threads worth chasing. Each should be a specific, actionable signal, not a restatement of a verdict. Max 400 chars each.",
      },
      nextSteps: {
        type: "array" as const,
        items: {
          type: "object" as const,
          required: ["action", "effort", "timeline", "whatItTests"],
          properties: {
            action: {
              type: "string" as const,
              maxLength: 400,
              description: "Specific action to take. Max 400 chars.",
            },
            effort: {
              type: "string" as const,
              enum: ["Low", "Medium", "High"],
            },
            timeline: {
              type: "string" as const,
              description: "e.g. '1 week', '2 weeks'",
            },
            whatItTests: {
              type: "string" as const,
              maxLength: 400,
              description: "What this test proves or disproves. Max 400 chars.",
            },
          },
        },
        description:
          "3-5 specific next steps ranked by effort. Include at least one low-effort test.",
      },
      cheapestTest: {
        type: "string" as const,
        maxLength: 500,
        description:
          "The single cheapest test the founder can run THIS WEEK to get more signal. Be specific — name the channel, audience, and metric to track. Max 500 chars.",
      },
    },
  },
};
