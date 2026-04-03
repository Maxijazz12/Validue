import sql from "@/lib/db";
import { computeMatchScore } from "@/lib/wall-ranking";
import { getAudienceMatchSkew } from "./price-signal-match-skew";

/* ─── Types ─── */

export interface RespondentPrice {
  /** Respondent anonymous label */
  label: string;
  /** Past spending tier from bl-payment-1 */
  pastSpending: string | null;
  /** Price ceiling from bl-payment-2 */
  priceCeiling: string | null;
  /** Audience match score */
  audienceMatch: number;
  /** Quality score */
  qualityScore: number;
}

export interface PriceSignal {
  /** Number of respondents with price data */
  respondentCount: number;
  /** Distribution of past spending answers */
  pastSpendingDistribution: Record<string, number>;
  /** Distribution of price ceiling answers */
  priceCeilingDistribution: Record<string, number>;
  /** Dominant ceiling tier (most common answer) */
  dominantCeiling: string | null;
  /** Whether high-match respondents skew differently than low-match */
  matchSkew: string | null;
  /** One-line interpretation for the brief */
  interpretation: string;
  /** Distribution of forward WTP answers (bl-payment-3) */
  forwardWtpDistribution?: Record<string, number>;
  /** Distribution of preferred payment model answers (bl-payment-4) */
  preferredModelDistribution?: Record<string, number>;
  /** Dominant forward WTP tier */
  dominantForwardWtp?: string | null;
  /** Dominant preferred payment model */
  dominantPreferredModel?: string | null;
}

/* ─── Price Tier Ordering ─── */

const CEILING_TIERS = [
  "Only free tools",
  "Under $10/month",
  "$10–$30/month",
  "$30+/month",
  "One-time purchase",
];

/* ─── Extraction ─── */

/**
 * Extracts willingness-to-pay signal from baseline price-category answers.
 * Returns null if no price data is available for this campaign.
 *
 * Deterministic — no AI calls. Runs alongside evidence gathering.
 */
export async function extractPriceSignal(
  campaignId: string
): Promise<PriceSignal | null> {
  // Fetch price-category baseline answers with respondent context
  const rows = await sql`
    SELECT
      a.text AS answer_text,
      q.text AS question_text,
      r.quality_score,
      r.respondent_id,
      q.category,
      p.interests AS respondent_interests,
      p.expertise AS respondent_expertise,
      p.age_range AS respondent_age_range,
      p.reputation_score AS respondent_reputation,
      p.total_responses_completed AS respondent_total_responses,
      c.target_interests,
      c.target_expertise,
      c.target_age_ranges,
      c.tags AS campaign_tags
    FROM answers a
    JOIN questions q ON q.id = a.question_id
    JOIN responses r ON r.id = a.response_id
    JOIN campaigns c ON c.id = r.campaign_id
    LEFT JOIN profiles p ON p.id = r.respondent_id
    WHERE r.campaign_id = ${campaignId}
      AND r.status IN ('submitted', 'ranked')
      AND q.is_baseline = true
      AND q.category = 'price'
      AND a.text IS NOT NULL
      AND a.text <> ''
    ORDER BY r.quality_score DESC NULLS LAST
  `;

  if (rows.length === 0) return null;

  // Group by respondent
  const respondentMap = new Map<string, {
    pastSpending: string | null;
    priceCeiling: string | null;
    forwardWtp: string | null;
    preferredModel: string | null;
    qualityScore: number;
    audienceMatch: number;
  }>();

  for (const row of rows) {
    const rid = row.respondent_id as string;
    if (!respondentMap.has(rid)) {
      const audienceMatch = computeMatchScore(
        {
          target_interests: (row.target_interests as string[]) ?? [],
          target_expertise: (row.target_expertise as string[]) ?? [],
          target_age_ranges: (row.target_age_ranges as string[]) ?? [],
          tags: (row.campaign_tags as string[]) ?? [],
        },
        {
          interests: (row.respondent_interests as string[]) ?? [],
          expertise: (row.respondent_expertise as string[]) ?? [],
          age_range: (row.respondent_age_range as string | null) ?? null,
          profile_completed: true,
          reputation_score: Number(row.respondent_reputation ?? 0),
          total_responses_completed: Number(row.respondent_total_responses ?? 0),
        }
      );

      respondentMap.set(rid, {
        pastSpending: null,
        priceCeiling: null,
        forwardWtp: null,
        preferredModel: null,
        qualityScore: Number(row.quality_score ?? 0),
        audienceMatch: Math.round(audienceMatch),
      });
    }
    const entry = respondentMap.get(rid)!;
    const answer = (row.answer_text as string).trim();
    const question = row.question_text as string;

    // Match answer to question type based on question text
    if (question.includes("spent") || question.includes("past year")) {
      entry.pastSpending = answer;
    } else if (question.includes("most you've paid") || question.includes("single tool")) {
      entry.priceCeiling = answer;
    } else if (question.includes("realistically pay per month") || question.includes("solved this problem well")) {
      entry.forwardWtp = answer;
    } else if (question.includes("payment model") || question.includes("Which payment model")) {
      entry.preferredModel = answer;
    }
  }

  if (respondentMap.size === 0) return null;

  // Build distributions
  const pastSpendingDist: Record<string, number> = {};
  const priceCeilingDist: Record<string, number> = {};
  const forwardWtpDist: Record<string, number> = {};
  const preferredModelDist: Record<string, number> = {};

  for (const [, data] of respondentMap) {
    if (data.pastSpending) {
      pastSpendingDist[data.pastSpending] = (pastSpendingDist[data.pastSpending] || 0) + 1;
    }
    if (data.priceCeiling) {
      priceCeilingDist[data.priceCeiling] = (priceCeilingDist[data.priceCeiling] || 0) + 1;
    }
    if (data.forwardWtp) {
      forwardWtpDist[data.forwardWtp] = (forwardWtpDist[data.forwardWtp] || 0) + 1;
    }
    if (data.preferredModel) {
      preferredModelDist[data.preferredModel] = (preferredModelDist[data.preferredModel] || 0) + 1;
    }
  }

  // Find dominant ceiling
  let dominantCeiling: string | null = null;
  let maxCount = 0;
  for (const [tier, count] of Object.entries(priceCeilingDist)) {
    if (count > maxCount) {
      maxCount = count;
      dominantCeiling = tier;
    }
  }

  const matchSkew = getAudienceMatchSkew(
    Array.from(respondentMap.values()).map((respondent) => ({
      priceCeiling: respondent.priceCeiling,
      qualityScore: respondent.qualityScore,
      audienceMatch: respondent.audienceMatch,
    }))
  );

  // Find dominant forward WTP
  let dominantForwardWtp: string | null = null;
  let forwardWtpMaxCount = 0;
  for (const [tier, count] of Object.entries(forwardWtpDist)) {
    if (count > forwardWtpMaxCount) {
      forwardWtpMaxCount = count;
      dominantForwardWtp = tier;
    }
  }

  // Find dominant preferred model
  let dominantPreferredModel: string | null = null;
  let modelMaxCount = 0;
  for (const [tier, count] of Object.entries(preferredModelDist)) {
    if (count > modelMaxCount) {
      modelMaxCount = count;
      dominantPreferredModel = tier;
    }
  }

  // Build interpretation
  const total = respondentMap.size;
  let interpretation: string;
  if (Object.keys(priceCeilingDist).length === 0) {
    interpretation = `${total} respondent${total === 1 ? "" : "s"} answered spending questions, but no ceiling data available.`;
  } else if (dominantCeiling === "Only free tools" && maxCount > total / 2) {
    interpretation = `Majority (${maxCount}/${total}) have only used free tools — price resistance is high. Consider a freemium model or proving value before charging.`;
  } else if (dominantCeiling === "$30+/month" || dominantCeiling === "$10–$30/month") {
    interpretation = `${maxCount}/${total} respondents have paid ${dominantCeiling} for similar tools — there's a validated price ceiling to test against.`;
  } else if (dominantCeiling === "Under $10/month") {
    interpretation = `Most respondents (${maxCount}/${total}) cap at under $10/month — low price ceiling. Consider whether unit economics work at this price point.`;
  } else {
    // Build a summary from the distribution
    const tiers = CEILING_TIERS.filter((t) => priceCeilingDist[t])
      .map((t) => `${priceCeilingDist[t]} at "${t}"`)
      .join(", ");
    interpretation = `Mixed price signals across ${total} respondents: ${tiers}.`;
  }

  // Append forward WTP context
  if (Object.keys(forwardWtpDist).length > 0) {
    const freeCount = forwardWtpDist["$0 — I'd only use it if free"] ?? 0;
    const paidCount = total - freeCount;
    if (paidCount > freeCount) {
      interpretation += ` Forward-looking: ${paidCount}/${total} would pay for a solution.`;
    } else {
      interpretation += ` Forward-looking: majority would only use a free tool.`;
    }
  }

  return {
    respondentCount: total,
    pastSpendingDistribution: pastSpendingDist,
    priceCeilingDistribution: priceCeilingDist,
    dominantCeiling,
    matchSkew,
    interpretation,
    forwardWtpDistribution: Object.keys(forwardWtpDist).length > 0 ? forwardWtpDist : undefined,
    preferredModelDistribution: Object.keys(preferredModelDist).length > 0 ? preferredModelDist : undefined,
    dominantForwardWtp,
    dominantPreferredModel,
  };
}
