import sql from "@/lib/db";

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
      q.category
    FROM answers a
    JOIN questions q ON q.id = a.question_id
    JOIN responses r ON r.id = a.response_id
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
  const respondentMap = new Map<string, { pastSpending: string | null; priceCeiling: string | null; qualityScore: number }>();

  for (const row of rows) {
    const rid = row.respondent_id as string;
    if (!respondentMap.has(rid)) {
      respondentMap.set(rid, {
        pastSpending: null,
        priceCeiling: null,
        qualityScore: Number(row.quality_score ?? 0),
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
    }
  }

  if (respondentMap.size === 0) return null;

  // Build distributions
  const pastSpendingDist: Record<string, number> = {};
  const priceCeilingDist: Record<string, number> = {};

  for (const [, data] of respondentMap) {
    if (data.pastSpending) {
      pastSpendingDist[data.pastSpending] = (pastSpendingDist[data.pastSpending] || 0) + 1;
    }
    if (data.priceCeiling) {
      priceCeilingDist[data.priceCeiling] = (priceCeilingDist[data.priceCeiling] || 0) + 1;
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

  // Check for match skew — compare high-quality (top half) vs low-quality respondents
  const respondents = Array.from(respondentMap.entries());
  respondents.sort((a, b) => b[1].qualityScore - a[1].qualityScore);
  const midpoint = Math.ceil(respondents.length / 2);
  const topHalf = respondents.slice(0, midpoint);
  const bottomHalf = respondents.slice(midpoint);

  let matchSkew: string | null = null;
  if (topHalf.length >= 2 && bottomHalf.length >= 2) {
    const topCeilings = topHalf.map(([, d]) => d.priceCeiling).filter(Boolean);
    const bottomCeilings = bottomHalf.map(([, d]) => d.priceCeiling).filter(Boolean);

    const topFreeRatio = topCeilings.filter((c) => c === "Only free tools").length / (topCeilings.length || 1);
    const bottomFreeRatio = bottomCeilings.filter((c) => c === "Only free tools").length / (bottomCeilings.length || 1);

    if (topFreeRatio > 0.5 && bottomFreeRatio < 0.3) {
      matchSkew = "Higher-quality respondents lean toward free — price resistance may be stronger than it appears.";
    } else if (topFreeRatio < 0.3 && bottomFreeRatio > 0.5) {
      matchSkew = "Higher-quality respondents show willingness to pay — price signal may be stronger than raw distribution suggests.";
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

  return {
    respondentCount: total,
    pastSpendingDistribution: pastSpendingDist,
    priceCeilingDistribution: priceCeilingDist,
    dominantCeiling,
    matchSkew,
    interpretation,
  };
}
