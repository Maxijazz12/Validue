import { BASELINE_QUESTIONS } from "@/lib/baseline-questions";

/* ─── Question Text → Baseline ID Lookup ─── */

const TEXT_TO_BASELINE_ID = new Map<string, string>(
  BASELINE_QUESTIONS.map((bq) => [bq.text, bq.id])
);

/* ─── Types ─── */

export interface ConsistencyGap {
  respondentId: string;
  respondentLabel: string;
  gapType: "price_mismatch" | "urgency_mismatch" | "severity_mismatch" | "forward_price_mismatch";
  statedAnswer: string;
  behavioralAnswer: string;
  statedQuestion: string;
  behavioralQuestion: string;
  severity: "high" | "medium";
  qualityScore: number;
}

export interface ConsistencyReport {
  gaps: ConsistencyGap[];
  /** e.g. "3 of 7 respondents show stated-vs-behavioral contradictions" */
  summary: string | null;
}

/* ─── Answer Lookup by Baseline ID ─── */

interface RespondentAnswers {
  respondentId: string;
  qualityScore: number;
  /** Map of baseline question ID → selected option text */
  baselineAnswers: Map<string, string>;
}

/* ─── Detection Rules ─── */

/** Answers indicating the respondent has NOT spent money */
const FREE_ONLY_ANSWERS = new Set([
  "$0 — only free options",
  "Only free tools",
]);

/** Answers indicating willingness to pay real money */
const PAID_CEILING_ANSWERS = new Set([
  "$10–$30/month",
  "$30+/month",
  "One-time purchase",
]);

/** Answers indicating active solution-seeking */
const ACTIVE_SEEKING_ANSWERS = new Set([
  "Every week",
  "Every month",
  "This week",
  "This month",
  "Currently using something",
]);

/** Answers indicating no real engagement with the problem */
const NO_ENGAGEMENT_ANSWERS = new Set([
  "I've never looked",
  "Rarely or never",
  "Never tried anything",
  "I don't have this problem",
]);

/** Answers indicating high problem frequency */
const HIGH_FREQUENCY_ANSWERS = new Set([
  "Daily",
  "Multiple times a day",
]);

/** Answers indicating low time waste */
const LOW_TIME_WASTE_ANSWERS = new Set([
  "None",
  "Under 30 minutes",
]);

/** Answers indicating no active solution */
const NO_SOLUTION_ANSWERS = new Set([
  "Nothing — I just deal with it",
  "Nothing — it's not really a problem for me",
]);

/* ─── Gap Detection Logic ─── */

/**
 * Detect price_mismatch: respondent's stated price ceiling suggests willingness
 * to pay, but their actual spending history shows they've only used free tools.
 */
function detectPriceMismatch(answers: RespondentAnswers): ConsistencyGap | null {
  const pastSpending = answers.baselineAnswers.get("bl-payment-1");
  const priceCeiling = answers.baselineAnswers.get("bl-payment-2");

  // Need both answers to detect a mismatch
  if (!pastSpending || !priceCeiling) return null;

  // Mismatch: says they'd pay $10-30+/month but has only used free tools
  const claimsWillPay = PAID_CEILING_ANSWERS.has(priceCeiling);
  const neverPaid = FREE_ONLY_ANSWERS.has(pastSpending);

  if (!claimsWillPay || !neverPaid) return null;

  return {
    respondentId: answers.respondentId,
    respondentLabel: "", // filled later
    gapType: "price_mismatch",
    statedAnswer: priceCeiling,
    behavioralAnswer: pastSpending,
    statedQuestion: "What's the most you've paid for a single tool in this category?",
    behavioralQuestion: "How much have you spent on tools or services for this problem in the past year?",
    severity: answers.qualityScore > 60 ? "high" : "medium",
    qualityScore: answers.qualityScore,
  };
}

/**
 * Detect urgency_mismatch: respondent claims to be actively seeking a solution
 * but behavioral answers show no real engagement with the problem.
 */
function detectUrgencyMismatch(answers: RespondentAnswers): ConsistencyGap | null {
  // Check if they claim active seeking
  const seekFrequency = answers.baselineAnswers.get("bl-interest-1");
  const seekRecency = answers.baselineAnswers.get("bl-interest-2");
  const switchBehavior = answers.baselineAnswers.get("bl-willingness-1");

  const claimsActive =
    (seekFrequency && ACTIVE_SEEKING_ANSWERS.has(seekFrequency)) ||
    (seekRecency && ACTIVE_SEEKING_ANSWERS.has(seekRecency)) ||
    (switchBehavior && ACTIVE_SEEKING_ANSWERS.has(switchBehavior));

  if (!claimsActive) return null;

  // Check if behavioral answers contradict
  const hasNoEngagement =
    (seekFrequency && NO_ENGAGEMENT_ANSWERS.has(seekFrequency)) ||
    (seekRecency && NO_ENGAGEMENT_ANSWERS.has(seekRecency)) ||
    (switchBehavior && NO_ENGAGEMENT_ANSWERS.has(switchBehavior));

  // Also check: claims active seeking but never tried anything
  const neverTried = switchBehavior && NO_ENGAGEMENT_ANSWERS.has(switchBehavior);
  const claimsSeekingRecently =
    (seekRecency && ACTIVE_SEEKING_ANSWERS.has(seekRecency));

  if (!hasNoEngagement && !(neverTried && claimsSeekingRecently)) return null;

  // Find the specific contradicting pair
  let statedAnswer: string;
  let statedQuestion: string;
  let behavioralAnswer: string;
  let behavioralQuestion: string;

  if (claimsSeekingRecently && neverTried) {
    statedAnswer = seekRecency!;
    statedQuestion = "When was the last time you searched for a solution to this problem?";
    behavioralAnswer = switchBehavior!;
    behavioralQuestion = "What's the closest thing you've tried for this problem, and how long did you use it?";
  } else if (seekFrequency && ACTIVE_SEEKING_ANSWERS.has(seekFrequency) && switchBehavior && NO_ENGAGEMENT_ANSWERS.has(switchBehavior)) {
    statedAnswer = seekFrequency;
    statedQuestion = "How often do you actively look for a better way to handle this?";
    behavioralAnswer = switchBehavior;
    behavioralQuestion = "What's the closest thing you've tried for this problem, and how long did you use it?";
  } else {
    // Generic fallback — pick the first contradicting pair found
    statedAnswer = seekFrequency ?? seekRecency ?? switchBehavior ?? "";
    statedQuestion = "Solution-seeking frequency";
    behavioralAnswer = switchBehavior ?? seekRecency ?? seekFrequency ?? "";
    behavioralQuestion = "Actual switching behavior";
  }

  return {
    respondentId: answers.respondentId,
    respondentLabel: "",
    gapType: "urgency_mismatch",
    statedAnswer,
    behavioralAnswer,
    statedQuestion,
    behavioralQuestion,
    severity: answers.qualityScore > 60 ? "high" : "medium",
    qualityScore: answers.qualityScore,
  };
}

/**
 * Detect severity_mismatch: respondent claims high problem frequency
 * but reports low time waste and no active solution.
 */
function detectSeverityMismatch(answers: RespondentAnswers): ConsistencyGap | null {
  const frequency = answers.baselineAnswers.get("bl-behavior-2");
  const timeWaste = answers.baselineAnswers.get("bl-pain-2");
  const currentTool = answers.baselineAnswers.get("bl-behavior-1");

  if (!frequency || !HIGH_FREQUENCY_ANSWERS.has(frequency)) return null;

  // Must have either low time waste or no solution to create a contradiction
  const lowTimeWaste = timeWaste && LOW_TIME_WASTE_ANSWERS.has(timeWaste);
  const noSolution = currentTool && NO_SOLUTION_ANSWERS.has(currentTool);

  if (!lowTimeWaste && !noSolution) return null;

  // Pick the strongest contradiction
  const behavioralAnswer = lowTimeWaste ? timeWaste! : currentTool!;
  const behavioralQuestion = lowTimeWaste
    ? "How much time do you waste on this problem per week?"
    : "What do you currently use to handle this?";

  return {
    respondentId: answers.respondentId,
    respondentLabel: "",
    gapType: "severity_mismatch",
    statedAnswer: frequency,
    behavioralAnswer,
    statedQuestion: "How many times in the past week did you run into this problem?",
    behavioralQuestion,
    severity: answers.qualityScore > 60 ? "high" : "medium",
    qualityScore: answers.qualityScore,
  };
}

/** Answers indicating forward willingness to pay $10+/month */
const FORWARD_PAID_ANSWERS = new Set([
  "$10–$25/month",
  "$25–$50/month",
  "$50+/month",
]);

/**
 * Detect forward_price_mismatch: respondent claims they'd pay $10+/month
 * for a solution, but has zero actual spending history in this category.
 */
function detectForwardPriceMismatch(answers: RespondentAnswers): ConsistencyGap | null {
  const pastSpending = answers.baselineAnswers.get("bl-payment-1");
  const forwardWtp = answers.baselineAnswers.get("bl-payment-3");

  if (!pastSpending || !forwardWtp) return null;

  const claimsWillPay = FORWARD_PAID_ANSWERS.has(forwardWtp);
  const neverPaid = FREE_ONLY_ANSWERS.has(pastSpending);

  if (!claimsWillPay || !neverPaid) return null;

  return {
    respondentId: answers.respondentId,
    respondentLabel: "",
    gapType: "forward_price_mismatch",
    statedAnswer: forwardWtp,
    behavioralAnswer: pastSpending,
    statedQuestion: "If a tool solved this problem well, what would you realistically pay per month?",
    behavioralQuestion: "How much have you spent on tools or services for this problem in the past year?",
    severity: answers.qualityScore > 60 ? "high" : "medium",
    qualityScore: answers.qualityScore,
  };
}

/* ─── Main Entry Point ─── */

/**
 * Detects behavioral consistency gaps across respondents for a campaign.
 * Deterministic — no AI calls. Compares baseline multiple-choice answers
 * within each respondent to find stated-vs-behavioral contradictions.
 *
 * Returns null if no baseline data is available.
 */
export async function detectConsistencyGaps(
  campaignId: string
): Promise<ConsistencyReport | null> {
  const { default: sql } = await import("@/lib/db");
  const rows = await sql`
    SELECT
      r.respondent_id,
      r.quality_score,
      q.text AS question_text,
      a.text AS answer_text
    FROM answers a
    JOIN questions q ON q.id = a.question_id
    JOIN responses r ON r.id = a.response_id
    WHERE r.campaign_id = ${campaignId}
      AND r.status IN ('submitted', 'ranked')
      AND q.is_baseline = true
      AND a.text IS NOT NULL
      AND a.text <> ''
    ORDER BY r.quality_score DESC NULLS LAST
  `;

  if (rows.length === 0) return null;

  // Group answers by respondent
  const respondentMap = new Map<string, RespondentAnswers>();

  for (const row of rows) {
    const rid = row.respondent_id as string;
    if (!respondentMap.has(rid)) {
      respondentMap.set(rid, {
        respondentId: rid,
        qualityScore: Number(row.quality_score ?? 0),
        baselineAnswers: new Map(),
      });
    }

    const questionText = row.question_text as string;
    const baselineId = TEXT_TO_BASELINE_ID.get(questionText);
    if (baselineId) {
      respondentMap.get(rid)!.baselineAnswers.set(
        baselineId,
        (row.answer_text as string).trim()
      );
    }
  }

  // Run gap detection for each respondent
  const gaps: ConsistencyGap[] = [];
  let labelCounter = 0;

  for (const [, respondent] of respondentMap) {
    if (respondent.baselineAnswers.size < 2) continue; // need at least 2 baseline answers

    labelCounter++;
    const label = `Respondent ${labelCounter}`;

    const detectors = [detectPriceMismatch, detectUrgencyMismatch, detectSeverityMismatch, detectForwardPriceMismatch];
    for (const detect of detectors) {
      const gap = detect(respondent);
      if (gap) {
        gap.respondentLabel = label;
        gaps.push(gap);
      }
    }
  }

  if (gaps.length === 0) {
    return { gaps: [], summary: null };
  }

  // Sort: high severity first, then by quality score descending
  gaps.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === "high" ? -1 : 1;
    return b.qualityScore - a.qualityScore;
  });

  const total = respondentMap.size;
  const withGaps = new Set(gaps.map((g) => g.respondentId)).size;
  const summary = `${withGaps} of ${total} respondent${total === 1 ? "" : "s"} show stated-vs-behavioral contradictions`;

  return { gaps, summary };
}

/* ─── Pure Detection for Testing ─── */

export const _testExports = {
  detectPriceMismatch,
  detectUrgencyMismatch,
  detectSeverityMismatch,
  detectForwardPriceMismatch,
};
