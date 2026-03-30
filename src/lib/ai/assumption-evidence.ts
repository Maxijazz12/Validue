import sql from "@/lib/db";
import { computeMatchScore } from "@/lib/wall-ranking";

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
      p.interests   AS respondent_interests,
      p.expertise   AS respondent_expertise,
      p.age_range   AS respondent_age_range,
      p.reputation_score AS respondent_reputation,
      p.total_responses_completed AS respondent_total_responses,
      c.target_interests,
      c.target_expertise,
      c.target_age_ranges,
      c.tags        AS campaign_tags
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

    // Compute audience match using existing wall-ranking logic
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
    });
  }

  return evidenceMap;
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
