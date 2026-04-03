import { NextResponse } from "next/server";
import sql from "@/lib/db";
import {
  computeRewardScore,
  computeFreshnessScore,
  computeMomentumScore,
} from "@/lib/wall-ranking";
import { getQualityModifier } from "@/lib/reach";
import { rateLimit } from "@/lib/rate-limit";
import { isAdminAuthorized } from "@/lib/admin-auth";
import { isValidUuid } from "@/lib/validate-uuid";

/**
 * GET /api/admin/campaign/[id]
 *
 * Deep diagnostic view for a single campaign: scoring breakdown,
 * reach delivery, payout state, wall ranking factors, warnings.
 *
 * Protected by X-Admin-Key header.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 10 campaign diagnostics per minute
  const limit = rateLimit("admin:campaign", 60000, 10);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { id: campaignId } = await params;

  if (!isValidUuid(campaignId)) {
    return NextResponse.json({ error: "Invalid campaign ID" }, { status: 400 });
  }

  try {
    // Campaign record
    const [campaign] = await sql`SELECT * FROM campaigns WHERE id = ${campaignId}::uuid`;
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // All responses with scoring detail
    const responses = await sql`
      SELECT r.id, r.respondent_id, r.status, r.quality_score,
             r.scoring_source, r.scoring_confidence, r.ai_feedback,
             r.payout_amount, r.created_at, r.ranked_at,
             p.full_name AS respondent_name
      FROM responses r
      LEFT JOIN profiles p ON p.id = r.respondent_id
      WHERE r.campaign_id = ${campaignId}::uuid
      ORDER BY r.quality_score DESC NULLS LAST
    `;

    // Payout records
    const payouts = await sql`
      SELECT p.id, p.response_id, p.respondent_id, p.amount,
             p.platform_fee, p.status, p.created_at
      FROM payouts p
      WHERE p.campaign_id = ${campaignId}::uuid
      ORDER BY p.amount DESC
    `;

    // Reach impressions count
    const [reachCount] = await sql`
      SELECT COUNT(*)::int AS count
      FROM reach_impressions
      WHERE campaign_id = ${campaignId}::uuid
    `;

    // Questions count
    const [questionCount] = await sql`
      SELECT COUNT(*)::int AS count
      FROM questions
      WHERE campaign_id = ${campaignId}::uuid
    `;

    // Scoring breakdown
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rankedResponses = responses.filter((r: any) => r.status === "ranked");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scores = rankedResponses.map((r: any) => Number(r.quality_score ?? 0));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const aiCount = rankedResponses.filter((r: any) => r.scoring_source === "ai").length;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fallbackCount = rankedResponses.filter((r: any) => r.scoring_source === "fallback").length;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lowConfCount = rankedResponses.filter((r: any) => r.scoring_source === "ai_low_confidence").length;

    // Payout analysis
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payoutSum = payouts.reduce((s: number, p: any) => s + Number(p.amount), 0);
    const distributable = Number(campaign.distributable_amount ?? 0);
    const payoutDelta = Math.round((distributable - payoutSum) * 100) / 100;

    // Wall ranking factors (for a neutral/median profile)
    const rewardScore = computeRewardScore({
      id: campaign.id,
      created_at: campaign.created_at,
      current_responses: campaign.current_responses ?? 0,
      target_responses: campaign.target_responses ?? 50,
      reward_amount: Number(campaign.reward_amount ?? 0),
      estimated_responses_low: campaign.estimated_responses_low ?? 1,
      quality_score: campaign.quality_score,
      match_priority: campaign.match_priority ?? 1,
      target_interests: campaign.target_interests ?? [],
      target_expertise: campaign.target_expertise ?? [],
      target_age_ranges: campaign.target_age_ranges ?? [],
      tags: campaign.tags ?? [],
    });
    const freshnessScore = computeFreshnessScore(campaign.created_at);
    const momentumScore = computeMomentumScore(
      campaign.current_responses ?? 0,
      campaign.target_responses ?? 50
    );
    const qualityModifier = getQualityModifier(
      Number(campaign.quality_score ?? 50),
      rankedResponses.length
    );

    // Warnings
    const warnings: string[] = [];
    if (campaign.status === "pending_funding") {
      const daysPending = Math.floor(
        (Date.now() - new Date(campaign.created_at).getTime()) / 86400000
      );
      if (daysPending > 3) warnings.push(`Stuck in pending_funding for ${daysPending} days`);
    }
    if (campaign.ranking_status === "ranking") {
      warnings.push("Campaign stuck in 'ranking' status — may need manual reset");
    }
    if (
      campaign.reach_served >= (campaign.effective_reach_units ?? campaign.total_reach_units ?? 0)
    ) {
      warnings.push("Reach budget fully consumed");
    }
    if (campaign.quality_score !== null && campaign.quality_score < 30) {
      warnings.push(`Low survey quality score: ${campaign.quality_score}`);
    }
    if (payoutDelta < -0.01) {
      warnings.push(`Payout anomaly: distributed $${payoutSum} exceeds distributable $${distributable} by $${Math.abs(payoutDelta)}`);
    }
    if (lowConfCount > 0 && rankedResponses.length > 0) {
      const pct = Math.round((lowConfCount / rankedResponses.length) * 100);
      warnings.push(`${pct}% of responses scored with low AI confidence`);
    }
    if (fallbackCount > 0 && rankedResponses.length > 0) {
      const pct = Math.round((fallbackCount / rankedResponses.length) * 100);
      warnings.push(`${pct}% of responses used fallback scoring (AI unavailable)`);
    }

    return NextResponse.json({
      campaign: {
        id: campaign.id,
        title: campaign.title,
        status: campaign.status,
        rankingStatus: campaign.ranking_status,
        payoutStatus: campaign.payout_status,
        createdAt: campaign.created_at,
        fundedAt: campaign.funded_at,
        rewardAmount: Number(campaign.reward_amount),
        distributableAmount: distributable,
        qualityScore: campaign.quality_score,
        campaignStrength: campaign.campaign_strength,
        targetResponses: campaign.target_responses,
        currentResponses: campaign.current_responses,
        questionCount: questionCount.count,
      },
      reach: {
        baselineRU: campaign.baseline_reach_units,
        fundedRU: campaign.funded_reach_units,
        totalRU: campaign.total_reach_units,
        effectiveRU: campaign.effective_reach_units,
        served: campaign.reach_served,
        uniqueImpressions: reachCount.count,
        deliveryRate:
          campaign.effective_reach_units > 0
            ? Math.round((campaign.reach_served / campaign.effective_reach_units) * 100)
            : 0,
        qualityModifier: Math.round(qualityModifier * 100) / 100,
      },
      scoring: {
        totalResponses: responses.length,
        ranked: rankedResponses.length,
        aiScored: aiCount,
        fallbackScored: fallbackCount,
        lowConfidence: lowConfCount,
        avgScore: scores.length > 0
          ? Math.round((scores.reduce((a: number, b: number) => a + b, 0) / scores.length) * 10) / 10
          : null,
        minScore: scores.length > 0 ? Math.min(...scores) : null,
        maxScore: scores.length > 0 ? Math.max(...scores) : null,
      },
      payouts: {
        status: campaign.payout_status,
        distributable,
        totalPaid: Math.round(payoutSum * 100) / 100,
        delta: payoutDelta,
        count: payouts.length,
        records: payouts.map((p: Record<string, unknown>) => ({
          responseId: p.response_id,
          amount: Number(p.amount),
          status: p.status,
        })),
      },
      wallFactors: {
        rewardScore,
        freshnessScore,
        momentumScore,
        qualityScore: Number(campaign.quality_score ?? 50),
        note: "Match score excluded — depends on respondent profile",
      },
      responses: responses.map((r: Record<string, unknown>) => ({
        id: r.id,
        respondentName: r.respondent_name,
        status: r.status,
        qualityScore: r.quality_score !== null ? Number(r.quality_score) : null,
        scoringSource: r.scoring_source,
        scoringConfidence: r.scoring_confidence !== null ? Number(r.scoring_confidence) : null,
        payoutAmount: r.payout_amount !== null ? Number(r.payout_amount) : null,
        feedback: r.ai_feedback,
        createdAt: r.created_at,
        rankedAt: r.ranked_at,
      })),
      warnings,
    });
  } catch (err) {
    console.error("[admin/campaign] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
