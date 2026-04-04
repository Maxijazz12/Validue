import sql from "@/lib/db";
import { computeMatchScore, classifyMatchBucket, type MatchBucket } from "@/lib/wall-ranking";

/* ─── Types ─── */

export interface AssumptionEvidence {
  questionText: string;
  answerText: string;
  qualityScore: number;
  authenticityScore: number;
  depthScore: number;
  respondentLabel: string;
  evidenceCategory: string;
  /** 0-100 audience match score between respondent profile and campaign targeting */
  audienceMatch: number;
  /** Fit bucket classification: core (>=70), adjacent (40-69), off_target (<40) */
  matchBucket: MatchBucket;
}

export interface BriefMethodology {
  responseCount: number;
  avgQuality: number;
  completionRate: number;
}

/* ─── Evidence Query ─── */

/**
 * Retrieves all scored responses for a campaign, grouped by the assumption
 * each question tests. Evidence within each group is sorted by quality
 * (best first) so the synthesis prompt sees the strongest signal up top.
 */
export async function getEvidenceByAssumption(
  campaignId: string
): Promise<Map<number, AssumptionEvidence[]>> {
  const rows = await sql`
    SELECT
      q.assumption_index,
      q.text        AS question_text,
      q.category    AS evidence_category,
      a.text        AS answer_text,
      r.quality_score,
      r.scoring_dimensions,
      r.respondent_id,
      r.match_score_at_start,
      p.interests   AS respondent_interests,
      p.expertise   AS respondent_expertise,
      p.age_range   AS respondent_age_range,
      p.industry    AS respondent_industry,
      p.experience_level AS respondent_experience_level,
      p.reputation_score AS respondent_reputation,
      p.total_responses_completed AS respondent_total_responses,
      c.target_interests,
      c.target_expertise,
      c.target_age_ranges,
      c.tags        AS campaign_tags,
      c.audience_industry,
      c.audience_experience_level
    FROM answers a
    JOIN questions q  ON q.id = a.question_id
    JOIN responses r  ON r.id = a.response_id
    JOIN campaigns c  ON c.id = r.campaign_id
    LEFT JOIN profiles p ON p.id = r.respondent_id
    WHERE r.campaign_id = ${campaignId}
      AND r.status IN ('submitted', 'ranked')
      AND q.assumption_index IS NOT NULL
      AND a.text IS NOT NULL
      AND a.text <> ''
    ORDER BY q.assumption_index ASC, r.quality_score DESC NULLS LAST
  `;

  const evidenceMap = new Map<number, AssumptionEvidence[]>();
  // Counter per assumption for anonymous labels
  const labelCounters = new Map<number, number>();

  for (const row of rows) {
    const idx = row.assumption_index as number;
    if (!evidenceMap.has(idx)) {
      evidenceMap.set(idx, []);
      labelCounters.set(idx, 0);
    }

    const dims = (row.scoring_dimensions as {
      depth?: number;
      authenticity?: number;
    }) ?? {};

    // Use stored match score from response start (WS3) when available,
    // fall back to recomputing for pre-WS3 rows
    const storedScore = row.match_score_at_start != null ? Number(row.match_score_at_start) : null;
    const audienceMatch = storedScore ?? computeMatchScore(
      {
        target_interests: (row.target_interests as string[]) ?? [],
        target_expertise: (row.target_expertise as string[]) ?? [],
        target_age_ranges: (row.target_age_ranges as string[]) ?? [],
        tags: (row.campaign_tags as string[]) ?? [],
        audience_industry: (row.audience_industry as string | null) ?? null,
        audience_experience_level: (row.audience_experience_level as string | null) ?? null,
      },
      {
        interests: (row.respondent_interests as string[]) ?? [],
        expertise: (row.respondent_expertise as string[]) ?? [],
        age_range: (row.respondent_age_range as string | null) ?? null,
        industry: (row.respondent_industry as string | null) ?? null,
        experience_level: (row.respondent_experience_level as string | null) ?? null,
        profile_completed: true,
        reputation_score: Number(row.respondent_reputation ?? 0),
        total_responses_completed: Number(row.respondent_total_responses ?? 0),
      }
    );

    const count = (labelCounters.get(idx) ?? 0) + 1;
    labelCounters.set(idx, count);

    evidenceMap.get(idx)!.push({
      questionText: row.question_text as string,
      answerText: row.answer_text as string,
      qualityScore: Number(row.quality_score ?? 0),
      authenticityScore: Number(dims.authenticity ?? 0),
      depthScore: Number(dims.depth ?? 0),
      respondentLabel: `Respondent ${count}`,
      evidenceCategory: (row.evidence_category as string) ?? "behavior",
      audienceMatch: Math.round(audienceMatch),
      matchBucket: classifyMatchBucket(Math.round(audienceMatch)),
    });
  }

  // Re-sort each assumption's evidence by weighted score (quality × match) so
  // the synthesis prompt sees the strongest AND most-relevant evidence first.
  // Cap at 8 per assumption to bound token usage. Reserve at least 1 slot for
  // "negative" category evidence to preserve disconfirming signal that might
  // otherwise be dropped when all high-weight evidence is same-category.
  const MAX_EVIDENCE_PER_ASSUMPTION = 8;
  const MIN_NEGATIVE_SLOTS = 1;
  for (const [key, items] of evidenceMap) {
    items.sort((a, b) => {
      const weightA = a.qualityScore * (0.6 + 0.4 * (a.audienceMatch / 100));
      const weightB = b.qualityScore * (0.6 + 0.4 * (b.audienceMatch / 100));
      return weightB - weightA;
    });
    if (items.length > MAX_EVIDENCE_PER_ASSUMPTION) {
      // Separate negative evidence from the rest
      const negative = items.filter((e) => e.evidenceCategory === "negative");
      const nonNegative = items.filter((e) => e.evidenceCategory !== "negative");

      if (negative.length > 0) {
        // Guarantee at least MIN_NEGATIVE_SLOTS negative items survive the cap
        const negativesToKeep = negative.slice(0, MIN_NEGATIVE_SLOTS);
        const remaining = MAX_EVIDENCE_PER_ASSUMPTION - negativesToKeep.length;
        evidenceMap.set(key, [...nonNegative.slice(0, remaining), ...negativesToKeep]);
      } else {
        evidenceMap.set(key, items.slice(0, MAX_EVIDENCE_PER_ASSUMPTION));
      }
    }
  }

  return evidenceMap;
}

/* ─── Per-Assumption Coverage Scoring ─── */

export interface AssumptionCoverage {
  /** Number of evidence items for this assumption */
  responseCount: number;
  /** Average quality score (0-100) */
  avgQuality: number;
  /** Average audience match score (0-100) */
  avgMatch: number;
  /** Number of distinct evidence categories represented */
  categoryCount: number;
  /** Which evidence categories are present */
  categories: string[];
  /** Whether a "negative" (disconfirmation) category is present */
  hasNegative: boolean;
  /** Overall coverage strength: "strong" (5+ responses, 3+ categories, avg match 50+),
   *  "moderate" (3+ responses, 2+ categories), "thin" (everything else) */
  strength: "strong" | "moderate" | "thin";
}

/**
 * Compute coverage metrics for a single assumption's evidence.
 * Pure function — no DB calls.
 */
export function computeCoverage(evidence: AssumptionEvidence[]): AssumptionCoverage {
  if (evidence.length === 0) {
    return {
      responseCount: 0, avgQuality: 0, avgMatch: 0,
      categoryCount: 0, categories: [], hasNegative: false, strength: "thin",
    };
  }

  const avgQuality = Math.round(evidence.reduce((s, e) => s + e.qualityScore, 0) / evidence.length);
  const avgMatch = Math.round(evidence.reduce((s, e) => s + e.audienceMatch, 0) / evidence.length);
  const categories = [...new Set(evidence.map((e) => e.evidenceCategory).filter(Boolean))];
  const hasNegative = categories.includes("negative");

  // Adjusted for partial response model: each respondent answers 3-5 questions,
  // so per-assumption evidence accumulates slower than full-response mode
  let strength: "strong" | "moderate" | "thin" = "thin";
  if (evidence.length >= 4 && categories.length >= 2 && avgMatch >= 50) {
    strength = "strong";
  } else if (evidence.length >= 2 && categories.length >= 1) {
    strength = "moderate";
  }

  return {
    responseCount: evidence.length,
    avgQuality,
    avgMatch,
    categoryCount: categories.length,
    categories,
    hasNegative,
    strength,
  };
}

/**
 * Compute coverage for all assumptions in a campaign.
 */
export function computeAllCoverage(
  evidenceByAssumption: Map<number, AssumptionEvidence[]>,
  assumptionCount: number
): AssumptionCoverage[] {
  return Array.from({ length: assumptionCount }, (_, i) =>
    computeCoverage(evidenceByAssumption.get(i) ?? [])
  );
}

/* ─── Bucket Grouping ─── */

export interface BucketedEvidence {
  core: AssumptionEvidence[];
  adjacent: AssumptionEvidence[];
  off_target: AssumptionEvidence[];
}

/**
 * Groups evidence items by match bucket for brief segmentation.
 */
export function groupByBucket(evidence: AssumptionEvidence[]): BucketedEvidence {
  return {
    core: evidence.filter((e) => e.matchBucket === "core"),
    adjacent: evidence.filter((e) => e.matchBucket === "adjacent"),
    off_target: evidence.filter((e) => e.matchBucket === "off_target"),
  };
}

/* ─── Methodology Stats ─── */

/**
 * Returns aggregate stats about the campaign's response pool.
 * Used in the brief header and for confidence calibration.
 */
export async function getBriefMethodology(
  campaignId: string
): Promise<BriefMethodology> {
  const [stats] = await sql`
    SELECT
      COUNT(*) FILTER (WHERE status IN ('submitted', 'ranked'))  AS submitted_count,
      COUNT(*)                                                    AS total_count,
      AVG(quality_score) FILTER (WHERE status IN ('submitted', 'ranked'))  AS avg_quality
    FROM responses
    WHERE campaign_id = ${campaignId}
  `;

  const submitted = Number(stats.submitted_count ?? 0);
  const total = Number(stats.total_count ?? 0);

  return {
    responseCount: submitted,
    avgQuality: Number(Number(stats.avg_quality ?? 0).toFixed(1)),
    completionRate: total > 0 ? Number((submitted / total).toFixed(2)) : 0,
  };
}
