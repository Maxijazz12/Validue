import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import {
  canConnectToTestDb,
  getTestDb,
  closeTestDb,
  seedUser,
  seedRespondent,
  seedCampaign,
  seedAnswer,
  cleanupCampaignData,
  cleanupAll,
  testId,
} from "./helpers";
import { getEvidenceByAssumption, getBriefMethodology } from "@/lib/ai/assumption-evidence";
import { DecisionBriefSchema } from "@/lib/ai/brief-schemas";

/* ─── Setup ─── */

const FOUNDER_ID = testId(100);
const RESPONDENT_1 = testId(201);
const RESPONDENT_2 = testId(202);
const RESPONDENT_3 = testId(203);

let dbAvailable = false;

beforeAll(async () => {
  dbAvailable = await canConnectToTestDb();
  if (!dbAvailable) return;

  await cleanupAll();
  await seedUser(FOUNDER_ID, "Pipeline Founder");
  await seedRespondent(RESPONDENT_1, "Respondent A");
  await seedRespondent(RESPONDENT_2, "Respondent B");
  await seedRespondent(RESPONDENT_3, "Respondent C");
});

afterEach(async () => {
  if (dbAvailable) await cleanupCampaignData();
});

afterAll(async () => {
  if (dbAvailable) await cleanupAll();
  await closeTestDb();
});

/* ─── Seed Helpers ─── */

async function seedQuestionWithAssumption(
  campaignId: string,
  text: string,
  sortOrder: number,
  assumptionIndex: number,
  isBaseline = false,
  category: string | null = null
) {
  const sql = getTestDb();
  const [q] = await sql`
    INSERT INTO questions (campaign_id, text, type, sort_order, is_baseline, category, assumption_index)
    VALUES (${campaignId}::uuid, ${text}, 'open', ${sortOrder}, ${isBaseline}, ${category}, ${assumptionIndex})
    RETURNING *
  `;
  return q;
}

async function seedScoredResponse(
  campaignId: string,
  respondentId: string,
  qualityScore: number,
  dims: { depth?: number; authenticity?: number; relevance?: number; consistency?: number } = {}
) {
  const sql = getTestDb();
  const [r] = await sql`
    INSERT INTO responses (
      campaign_id, respondent_id, status,
      quality_score, scoring_confidence, scoring_source, scoring_dimensions
    ) VALUES (
      ${campaignId}::uuid, ${respondentId}::uuid, 'submitted',
      ${qualityScore}, 0.8, 'ai', ${JSON.stringify(dims)}::jsonb
    )
    RETURNING *
  `;
  return r;
}

/* ─── Tests ─── */

describe("Pipeline: evidence grouping by assumption", () => {
  it.skipIf(!dbAvailable)("groups evidence by assumption_index sorted by quality", async () => {
    const campaign = await seedCampaign({ creatorId: FOUNDER_ID });

    // 2 questions testing different assumptions
    const q0 = await seedQuestionWithAssumption(campaign.id, "How do you currently solve this?", 0, 0);
    const q1 = await seedQuestionWithAssumption(campaign.id, "Would you pay for a solution?", 1, 1);
    const qBaseline = await seedQuestionWithAssumption(campaign.id, "How often does this happen?", 2, 0, true, "behavior");

    // 3 respondents with different quality scores
    const r1 = await seedScoredResponse(campaign.id, RESPONDENT_1, 75, { depth: 80, authenticity: 70 });
    const r2 = await seedScoredResponse(campaign.id, RESPONDENT_2, 60, { depth: 55, authenticity: 65 });
    const r3 = await seedScoredResponse(campaign.id, RESPONDENT_3, 85, { depth: 90, authenticity: 80 });

    // Answers — each respondent answers each question
    await seedAnswer(r1.id, q0.id, "I use spreadsheets but they break constantly when the data gets complex");
    await seedAnswer(r1.id, q1.id, "Yes, I would pay $15/month if it saved me 2+ hours weekly");
    await seedAnswer(r1.id, qBaseline.id, "About 3 times per week on average");

    await seedAnswer(r2.id, q0.id, "I cobbled together some scripts that sort of work");
    await seedAnswer(r2.id, q1.id, "Maybe, depends on the price point honestly");
    await seedAnswer(r2.id, qBaseline.id, "Nearly every day at this point");

    await seedAnswer(r3.id, q0.id, "Manual process with a team of two people reviewing everything by hand each week");
    await seedAnswer(r3.id, q1.id, "Absolutely, we already budget $500/month for similar tooling that barely works");
    await seedAnswer(r3.id, qBaseline.id, "Multiple times daily across the team");

    const evidenceMap = await getEvidenceByAssumption(campaign.id);

    // Should have 2 assumption groups (0 and 1)
    expect(evidenceMap.size).toBe(2);

    // Assumption 0: q0 + qBaseline = 6 evidence items (3 respondents × 2 questions)
    const a0 = evidenceMap.get(0)!;
    expect(a0.length).toBe(6);
    // Sorted by quality_score DESC — r3 (85) first
    expect(a0[0].qualityScore).toBe(85);

    // Assumption 1: q1 = 3 evidence items
    const a1 = evidenceMap.get(1)!;
    expect(a1.length).toBe(3);

    // Respondent labels are anonymous
    expect(a0[0].respondentLabel).toMatch(/^Respondent \d+$/);
  });

  it.skipIf(!dbAvailable)("returns empty map when no responses exist", async () => {
    const campaign = await seedCampaign({ creatorId: FOUNDER_ID });
    await seedQuestionWithAssumption(campaign.id, "Test question", 0, 0);

    const evidenceMap = await getEvidenceByAssumption(campaign.id);
    expect(evidenceMap.size).toBe(0);
  });

  it.skipIf(!dbAvailable)("excludes in_progress responses", async () => {
    const campaign = await seedCampaign({ creatorId: FOUNDER_ID });
    const q = await seedQuestionWithAssumption(campaign.id, "Test question", 0, 0);

    // in_progress response should be excluded
    const sql = getTestDb();
    const [r] = await sql`
      INSERT INTO responses (campaign_id, respondent_id, status, quality_score)
      VALUES (${campaign.id}::uuid, ${RESPONDENT_1}::uuid, 'in_progress', 50)
      RETURNING *
    `;
    await seedAnswer(r.id, q.id, "Incomplete answer text here but fairly detailed");

    const evidenceMap = await getEvidenceByAssumption(campaign.id);
    expect(evidenceMap.size).toBe(0);
  });
});

describe("Pipeline: brief methodology stats", () => {
  it.skipIf(!dbAvailable)("returns correct response count and avg quality", async () => {
    const campaign = await seedCampaign({ creatorId: FOUNDER_ID });

    await seedScoredResponse(campaign.id, RESPONDENT_1, 70);
    await seedScoredResponse(campaign.id, RESPONDENT_2, 80);
    await seedScoredResponse(campaign.id, RESPONDENT_3, 90);

    const methodology = await getBriefMethodology(campaign.id);

    expect(methodology.responseCount).toBe(3);
    expect(methodology.avgQuality).toBe(80);
    expect(methodology.completionRate).toBe(1);
  });

  it.skipIf(!dbAvailable)("excludes in_progress from count and avg", async () => {
    const campaign = await seedCampaign({ creatorId: FOUNDER_ID });

    await seedScoredResponse(campaign.id, RESPONDENT_1, 70);
    // Add an in_progress response that should be excluded from submitted count
    const sql = getTestDb();
    await sql`
      INSERT INTO responses (campaign_id, respondent_id, status, quality_score)
      VALUES (${campaign.id}::uuid, ${RESPONDENT_2}::uuid, 'in_progress', 20)
    `;

    const methodology = await getBriefMethodology(campaign.id);
    expect(methodology.responseCount).toBe(1);
    expect(methodology.avgQuality).toBe(70);
    // 1 submitted out of 2 total
    expect(methodology.completionRate).toBe(0.5);
  });

  it.skipIf(!dbAvailable)("returns zeros for campaign with no responses", async () => {
    const campaign = await seedCampaign({ creatorId: FOUNDER_ID });

    const methodology = await getBriefMethodology(campaign.id);
    expect(methodology.responseCount).toBe(0);
    expect(methodology.avgQuality).toBe(0);
    expect(methodology.completionRate).toBe(0);
  });
});

describe("Pipeline: fallback brief validation", () => {
  it("fallback brief with zero responses passes Zod schema", async () => {
    // Import buildFallbackBrief indirectly by testing synthesizeBrief behavior
    // Since synthesizeBrief returns fallback when responseCount < 3,
    // we validate the fallback structure matches DecisionBriefSchema
    const assumptions = [
      "Users have this problem frequently",
      "Users would pay for a solution",
      "Current workarounds are painful enough to switch",
    ];

    // Construct what buildFallbackBrief produces (it's not exported, so we replicate the contract)
    const fallback = {
      recommendation: "PAUSE" as const,
      confidence: "LOW" as const,
      confidenceRationale: "Only 0 responses received. Need at least 5 for directional signal, 8+ for confidence.",
      uncomfortableTruth: "Not enough responses to draw meaningful conclusions. 0 responses received — need at least 5 for directional signal.",
      signalSummary: "Insufficient data to synthesize meaning. Collect more responses before drawing conclusions.",
      assumptionVerdicts: assumptions.map((assumption, i) => ({
        assumption,
        assumptionIndex: i,
        verdict: "INSUFFICIENT_DATA" as const,
        confidence: "LOW" as const,
        evidenceSummary: "Too few responses to evaluate this assumption.",
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
      cheapestTest: "Post your one-sentence idea description in a relevant subreddit or Discord and count how many people ask follow-up questions vs. scroll past.",
    };

    const parsed = DecisionBriefSchema.safeParse(fallback);
    expect(parsed.success).toBe(true);
  });

  it("fallback brief with some responses passes Zod schema", () => {
    const assumptions = ["Users have this problem"];
    const fallback = {
      recommendation: "PAUSE" as const,
      confidence: "LOW" as const,
      confidenceRationale: "AI synthesis unavailable. Manual review of responses recommended.",
      uncomfortableTruth: "AI synthesis is currently unavailable. Review the raw responses manually to extract insights.",
      signalSummary: "Responses collected but AI synthesis unavailable. Review raw responses for patterns.",
      assumptionVerdicts: [{
        assumption: assumptions[0],
        assumptionIndex: 0,
        verdict: "INSUFFICIENT_DATA" as const,
        confidence: "LOW" as const,
        evidenceSummary: "AI synthesis unavailable — manual review required.",
        supportingCount: 0,
        contradictingCount: 0,
        totalResponses: 0,
        quotes: [],
      }],
      strongestSignals: ["Collect more responses to identify patterns."],
      nextSteps: [
        { action: "Share the campaign link with your target audience to collect more responses", effort: "Low" as const, timeline: "This week", whatItTests: "Whether your target audience engages with the questions" },
        { action: "Post in 2-3 relevant online communities where your target users gather", effort: "Low" as const, timeline: "1-2 days", whatItTests: "Whether the problem resonates enough for people to respond" },
      ],
      cheapestTest: "Post your one-sentence idea description in a relevant subreddit or Discord and count how many people ask follow-up questions vs. scroll past.",
    };

    const parsed = DecisionBriefSchema.safeParse(fallback);
    expect(parsed.success).toBe(true);
  });
});
