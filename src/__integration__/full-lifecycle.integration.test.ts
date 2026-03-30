import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import {
  getTestDb,
  closeTestDb,
  canConnectToTestDb,
  cleanupAll,
  cleanupCampaignData,
  seedUser,
  seedRespondent,
  seedCampaign,
  seedQuestion,
  seedAnswer,
  getCampaign,
  testId,
} from "./helpers";
import {
  qualifyResponse,
  distributePayoutsV2,
  type ScoredResponse,
  type ResponseMetadata,
} from "@/lib/payout-math";
import { DEFAULTS } from "@/lib/defaults";

/**
 * Full lifecycle integration test — exercises the complete campaign pipeline:
 * publish → respond (varied quality) → rank → qualify → payout → brief evidence
 *
 * Uses seeded data at the DB level (no AI calls) to validate the end-to-end
 * data flow and behavioral screening enforcement.
 */

const FOUNDER = testId(300);
const GOOD_RESPONDENT = testId(301);
const MID_RESPONDENT = testId(302);
const SPAM_RESPONDENT = testId(303);
const FAST_RESPONDENT = testId(304);

let dbAvailable = false;

beforeAll(async () => {
  dbAvailable = await canConnectToTestDb();
  if (!dbAvailable) return;

  await cleanupAll();
  await seedUser(FOUNDER, "Lifecycle Founder");
  await seedRespondent(GOOD_RESPONDENT, "Good Respondent");
  await seedRespondent(MID_RESPONDENT, "Mid Respondent");
  await seedRespondent(SPAM_RESPONDENT, "Spam Respondent");
  await seedRespondent(FAST_RESPONDENT, "Fast Respondent");
});

afterEach(async () => {
  if (dbAvailable) await cleanupCampaignData();
});

afterAll(async () => {
  if (dbAvailable) await cleanupAll();
  await closeTestDb();
});

/* ─── Helpers ─── */

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
  confidence = 0.8
) {
  const sql = getTestDb();
  const [r] = await sql`
    INSERT INTO responses (
      campaign_id, respondent_id, status,
      quality_score, scoring_confidence, scoring_source
    ) VALUES (
      ${campaignId}::uuid, ${respondentId}::uuid, 'submitted',
      ${qualityScore}, ${confidence}, 'ai'
    )
    RETURNING *
  `;
  return r;
}

/* ─── Tests ─── */

describe("Full lifecycle: publish → respond → rank → qualify → payout → brief", () => {
  it("end-to-end with varied response quality", async () => {
    if (!dbAvailable) return;
    const sql = getTestDb();

    // ── Step 1: Publish campaign with questions ──
    const campaign = await seedCampaign({
      creatorId: FOUNDER,
      rewardAmount: 25,
      distributableAmount: 21.25, // 25 * 0.85
      status: "active",
      rankingStatus: "unranked",
    });

    const q0 = await seedQuestionWithAssumption(
      campaign.id, "How do you currently solve this problem?", 0, 0
    );
    const q1 = await seedQuestionWithAssumption(
      campaign.id, "Would you pay for a solution?", 1, 1
    );
    const qBaseline = await seedQuestionWithAssumption(
      campaign.id, "How often does this problem occur?", 2, 0, true, "behavior"
    );

    // Verify campaign is active with questions
    const savedCampaign = await getCampaign(campaign.id);
    expect(savedCampaign.status).toBe("active");

    const questions = await sql`
      SELECT * FROM questions WHERE campaign_id = ${campaign.id}::uuid ORDER BY sort_order
    `;
    expect(questions.length).toBe(3);

    // ── Step 2: Respondents submit answers with varied quality ──

    // Good respondent: thoughtful, original answers, proper time
    const rGood = await seedScoredResponse(campaign.id, GOOD_RESPONDENT, 82);
    await seedAnswer(rGood.id, q0.id,
      "I currently use a complex spreadsheet system that breaks whenever we add new data sources. It takes about 4 hours per week to maintain and I still miss important patterns.",
      { timeSpentMs: 45000, charCount: 170, pasteDetected: false, pasteCount: 0 }
    );
    await seedAnswer(rGood.id, q1.id,
      "Absolutely — we budget $200/month for tools in this category and the current solution is terrible. I would switch immediately if something better existed.",
      { timeSpentMs: 38000, charCount: 160, pasteDetected: false, pasteCount: 0 }
    );
    await seedAnswer(rGood.id, qBaseline.id,
      "Multiple times per week, usually 3-4 times. It is the most frequent pain point in our workflow.",
      { timeSpentMs: 20000, charCount: 95, pasteDetected: false, pasteCount: 0 }
    );

    // Mid respondent: okay answers, moderate time
    const rMid = await seedScoredResponse(campaign.id, MID_RESPONDENT, 55);
    await seedAnswer(rMid.id, q0.id,
      "We use some scripts that kind of work but are not great. Could be better for sure.",
      { timeSpentMs: 25000, charCount: 80, pasteDetected: false, pasteCount: 0 }
    );
    await seedAnswer(rMid.id, q1.id,
      "Maybe, it depends on the price and what features it includes honestly.",
      { timeSpentMs: 18000, charCount: 68, pasteDetected: false, pasteCount: 0 }
    );
    await seedAnswer(rMid.id, qBaseline.id,
      "About once a week or so, not too often but enough to be annoying.",
      { timeSpentMs: 12000, charCount: 62, pasteDetected: false, pasteCount: 0 }
    );

    // Spam respondent: paste-heavy, low quality
    const rSpam = await seedScoredResponse(campaign.id, SPAM_RESPONDENT, 25);
    await seedAnswer(rSpam.id, q0.id,
      "According to recent industry reports the market for data management solutions is growing at a CAGR of 12.5% indicating strong demand.",
      { timeSpentMs: 5000, charCount: 140, pasteDetected: true, pasteCount: 4 }
    );
    await seedAnswer(rSpam.id, q1.id,
      "The total addressable market for enterprise solutions in this space exceeds $50B annually with significant room for disruption.",
      { timeSpentMs: 3000, charCount: 130, pasteDetected: true, pasteCount: 5 }
    );
    await seedAnswer(rSpam.id, qBaseline.id,
      "Studies show that 78% of organizations face this challenge on a daily basis according to Gartner research published in 2024.",
      { timeSpentMs: 2000, charCount: 120, pasteDetected: true, pasteCount: 3 }
    );

    // Fast respondent: too quick, low effort
    const rFast = await seedScoredResponse(campaign.id, FAST_RESPONDENT, 35);
    await seedAnswer(rFast.id, q0.id,
      "idk we just deal with it",
      { timeSpentMs: 3000, charCount: 25, pasteDetected: false, pasteCount: 0 }
    );
    await seedAnswer(rFast.id, q1.id,
      "nah probably not",
      { timeSpentMs: 2000, charCount: 16, pasteDetected: false, pasteCount: 0 }
    );
    await seedAnswer(rFast.id, qBaseline.id,
      "sometimes",
      { timeSpentMs: 1000, charCount: 9, pasteDetected: false, pasteCount: 0 }
    );

    // ── Step 3: Rank responses ──
    await sql`
      UPDATE campaigns SET ranking_status = 'ranking'
      WHERE id = ${campaign.id}::uuid AND ranking_status = 'unranked'
    `;

    for (const r of [rGood, rMid, rSpam, rFast]) {
      await sql`
        UPDATE responses
        SET status = 'ranked', ranked_at = now()
        WHERE id = ${r.id}::uuid
      `;
    }

    await sql`
      UPDATE campaigns SET ranking_status = 'ranked'
      WHERE id = ${campaign.id}::uuid
    `;

    // ── Step 4: Qualify with behavioral screening ──
    const scoredResponses: ScoredResponse[] = [
      { responseId: rGood.id, respondentId: GOOD_RESPONDENT, respondentName: "Good", qualityScore: 82, confidence: 0.8 },
      { responseId: rMid.id, respondentId: MID_RESPONDENT, respondentName: "Mid", qualityScore: 55, confidence: 0.8 },
      { responseId: rSpam.id, respondentId: SPAM_RESPONDENT, respondentName: "Spam", qualityScore: 25, confidence: 0.8 },
      { responseId: rFast.id, respondentId: FAST_RESPONDENT, respondentName: "Fast", qualityScore: 35, confidence: 0.8 },
    ];

    // Build metadata from seeded answers (mirrors suggestDistributionV2 logic)
    const metadataMap = new Map<string, ResponseMetadata>();

    for (const sr of scoredResponses) {
      const answers = await sql`
        SELECT metadata FROM answers WHERE response_id = ${sr.responseId}::uuid
      `;
      let totalTimeMs = 0;
      const openAnswers: { charCount: number }[] = [];
      let pasteHeavyCount = 0;

      for (const a of answers) {
        const meta = (a.metadata || {}) as Record<string, unknown>;
        totalTimeMs += Math.max(0, Number(meta.timeSpentMs) || 0);
        const charCount = Math.max(0, Number(meta.charCount) || 0);
        if (charCount > 0) openAnswers.push({ charCount });
        const pasteCount = Math.max(0, Number(meta.pasteCount) || 0);
        if (pasteCount >= DEFAULTS.SPAM_MAX_PASTE_COUNT) pasteHeavyCount++;
      }

      const spamFlagged =
        answers.length > 0 &&
        pasteHeavyCount / answers.length >= DEFAULTS.SPAM_PASTE_ANSWER_RATIO;

      metadataMap.set(sr.responseId, { totalTimeMs, openAnswers, spamFlagged });
    }

    // Qualify each
    const qualResults = scoredResponses.map((sr) => {
      const meta = metadataMap.get(sr.responseId)!;
      return qualifyResponse(sr, "standard", meta);
    });

    // Good respondent: qualified (score 82, 103s total, good answers)
    const goodQual = qualResults.find((q) => q.responseId === rGood.id)!;
    expect(goodQual.qualified).toBe(true);
    expect(goodQual.reasons).toEqual([]);

    // Mid respondent: qualified (score 55, 55s total — below standard minimum but above quick)
    const midQual = qualResults.find((q) => q.responseId === rMid.id)!;
    // 55s total < 90s standard minimum → should fail on time
    expect(midQual.qualified).toBe(false);
    expect(midQual.reasons).toContain("insufficient_time");

    // Spam respondent: disqualified (score 25 below threshold + spam flagged)
    const spamQual = qualResults.find((q) => q.responseId === rSpam.id)!;
    expect(spamQual.qualified).toBe(false);
    expect(spamQual.reasons).toContain("quality_score_below_threshold");
    expect(spamQual.reasons).toContain("spam_detected");

    // Fast respondent: disqualified (insufficient time + short answers)
    const fastQual = qualResults.find((q) => q.responseId === rFast.id)!;
    expect(fastQual.qualified).toBe(false);
    expect(fastQual.reasons).toContain("insufficient_time");
    expect(fastQual.reasons).toContain("open_answer_too_short");

    // ── Step 5: Payout distribution ──
    // Only good respondent qualifies — gets entire pool
    const allocations = distributePayoutsV2(scoredResponses, 21.25, qualResults);

    expect(allocations.length).toBe(4);

    const goodAlloc = allocations.find((a) => a.responseId === rGood.id)!;
    expect(goodAlloc.qualified).toBe(true);
    expect(goodAlloc.suggestedAmount).toBe(21.25); // sole qualifier gets full pool

    const spamAlloc = allocations.find((a) => a.responseId === rSpam.id)!;
    expect(spamAlloc.qualified).toBe(false);
    expect(spamAlloc.suggestedAmount).toBe(0);

    const fastAlloc = allocations.find((a) => a.responseId === rFast.id)!;
    expect(fastAlloc.qualified).toBe(false);
    expect(fastAlloc.suggestedAmount).toBe(0);

    // Total payout = distributable (money reconciles)
    const totalPaid = allocations
      .filter((a) => a.qualified)
      .reduce((s, a) => s + a.suggestedAmount, 0);
    expect(Math.round(totalPaid * 100) / 100).toBe(21.25);

    // ── Step 6: Brief evidence — verify data is queryable for synthesis ──
    // Query evidence grouped by assumption (mirrors getEvidenceByAssumption)
    const evidenceRows = await sql`
      SELECT q.assumption_index, a.text AS answer_text, r.quality_score
      FROM answers a
      JOIN questions q ON q.id = a.question_id
      JOIN responses r ON r.id = a.response_id
      WHERE r.campaign_id = ${campaign.id}::uuid
        AND r.status IN ('submitted', 'ranked')
        AND q.assumption_index IS NOT NULL
      ORDER BY q.assumption_index ASC, r.quality_score DESC NULLS LAST
    `;

    // Assumption 0: q0 + qBaseline → 4 respondents × 2 questions = 8
    const a0 = evidenceRows.filter(// eslint-disable-next-line @typescript-eslint/no-explicit-any
    (r: any) => r.assumption_index === 0);
    expect(a0.length).toBe(8);
    expect(Number(a0[0].quality_score)).toBe(82); // best first

    // Assumption 1: q1 → 4 respondents
    const a1 = evidenceRows.filter(// eslint-disable-next-line @typescript-eslint/no-explicit-any
    (r: any) => r.assumption_index === 1);
    expect(a1.length).toBe(4);

    // Brief methodology stats (mirrors getBriefMethodology)
    const [stats] = await sql`
      SELECT
        COUNT(*) FILTER (WHERE status IN ('submitted', 'ranked')) AS submitted_count,
        AVG(quality_score) FILTER (WHERE status IN ('submitted', 'ranked')) AS avg_quality
      FROM responses
      WHERE campaign_id = ${campaign.id}::uuid
    `;
    expect(Number(stats.submitted_count)).toBe(4);
    expect(Number(Number(stats.avg_quality).toFixed(1))).toBeCloseTo((82 + 55 + 25 + 35) / 4, 0);
  });

  it("spam flag correctly derived from paste metadata", async () => {
    if (!dbAvailable) return;
    // Verify the exact spam detection logic matches DEFAULTS thresholds
    const campaign = await seedCampaign({ creatorId: FOUNDER });
    const q = await seedQuestion(campaign.id, "Test question");

    // Response where exactly SPAM_PASTE_ANSWER_RATIO of answers are paste-heavy
    const sql = getTestDb();
    const [r] = await sql`
      INSERT INTO responses (campaign_id, respondent_id, status, quality_score, scoring_confidence, scoring_source)
      VALUES (${campaign.id}::uuid, ${GOOD_RESPONDENT}::uuid, 'submitted', 50, 0.8, 'ai')
      RETURNING *
    `;

    // 2 answers: 1 paste-heavy (count >= SPAM_MAX_PASTE_COUNT), 1 clean
    // ratio = 1/2 = 0.5 = SPAM_PASTE_ANSWER_RATIO → should flag
    const q2 = await seedQuestion(campaign.id, "Second question", "open", 1);
    await seedAnswer(r.id, q.id, "Pasted content from a report about market trends and industry analysis that was copied.",
      { timeSpentMs: 45000, charCount: 85, pasteDetected: true, pasteCount: DEFAULTS.SPAM_MAX_PASTE_COUNT }
    );
    await seedAnswer(r.id, q2.id, "Original thoughtful answer about my experience with this problem.",
      { timeSpentMs: 45000, charCount: 65, pasteDetected: false, pasteCount: 0 }
    );

    // Compute spam flag the same way payout-actions does
    const answers = await sql`SELECT metadata FROM answers WHERE response_id = ${r.id}::uuid`;
    let pasteHeavyCount = 0;
    for (const a of answers) {
      const meta = (a.metadata || {}) as Record<string, unknown>;
      if (Number(meta.pasteCount) >= DEFAULTS.SPAM_MAX_PASTE_COUNT) pasteHeavyCount++;
    }
    const spamFlagged = answers.length > 0 && pasteHeavyCount / answers.length >= DEFAULTS.SPAM_PASTE_ANSWER_RATIO;

    expect(spamFlagged).toBe(true);

    // Verify qualification rejects it
    const result = qualifyResponse(
      { responseId: r.id, respondentId: GOOD_RESPONDENT, respondentName: "Test", qualityScore: 50, confidence: 0.8 },
      "standard",
      { totalTimeMs: 90000, openAnswers: [{ charCount: 85 }, { charCount: 65 }], spamFlagged }
    );
    expect(result.qualified).toBe(false);
    expect(result.reasons).toContain("spam_detected");
  });

  it("response just below paste threshold is not flagged", async () => {
    if (!dbAvailable) return;
    const campaign = await seedCampaign({ creatorId: FOUNDER });
    const q = await seedQuestion(campaign.id, "Test question");
    const q2 = await seedQuestion(campaign.id, "Second question", "open", 1);
    const q3 = await seedQuestion(campaign.id, "Third question", "open", 2);

    const sql = getTestDb();
    const [r] = await sql`
      INSERT INTO responses (campaign_id, respondent_id, status, quality_score, scoring_confidence, scoring_source)
      VALUES (${campaign.id}::uuid, ${MID_RESPONDENT}::uuid, 'submitted', 60, 0.8, 'ai')
      RETURNING *
    `;

    // 3 answers: 1 paste-heavy, 2 clean → ratio = 1/3 ≈ 0.33 < 0.5 → not flagged
    await seedAnswer(r.id, q.id, "Pasted content from somewhere that was copied and pasted into the answer field.",
      { timeSpentMs: 35000, charCount: 80, pasteDetected: true, pasteCount: 4 }
    );
    await seedAnswer(r.id, q2.id, "Original answer about my personal experience with this particular problem.",
      { timeSpentMs: 35000, charCount: 75, pasteDetected: false, pasteCount: 0 }
    );
    await seedAnswer(r.id, q3.id, "Another genuine answer reflecting my actual usage patterns and frustrations.",
      { timeSpentMs: 30000, charCount: 80, pasteDetected: false, pasteCount: 0 }
    );

    const answers = await sql`SELECT metadata FROM answers WHERE response_id = ${r.id}::uuid`;
    let pasteHeavyCount = 0;
    for (const a of answers) {
      const meta = (a.metadata || {}) as Record<string, unknown>;
      if (Number(meta.pasteCount) >= DEFAULTS.SPAM_MAX_PASTE_COUNT) pasteHeavyCount++;
    }
    const spamFlagged = answers.length > 0 && pasteHeavyCount / answers.length >= DEFAULTS.SPAM_PASTE_ANSWER_RATIO;

    expect(spamFlagged).toBe(false);

    // Qualifies (score 60, time 100s, good char count, not spam)
    const result = qualifyResponse(
      { responseId: r.id, respondentId: MID_RESPONDENT, respondentName: "Test", qualityScore: 60, confidence: 0.8 },
      "standard",
      { totalTimeMs: 100000, openAnswers: [{ charCount: 80 }, { charCount: 75 }, { charCount: 80 }], spamFlagged }
    );
    expect(result.qualified).toBe(true);
  });
});
