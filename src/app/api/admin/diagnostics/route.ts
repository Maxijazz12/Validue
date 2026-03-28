import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { isAdminAuthorized } from "@/lib/admin-auth";

/**
 * GET /api/admin/diagnostics
 *
 * System health snapshot: campaign states, scoring distribution,
 * payout status, reach delivery, reputation breakdown, stuck states.
 *
 * Protected by X-Admin-Key header.
 */
export async function GET(request: Request) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 10 diagnostics requests per minute
  const limit = rateLimit("admin:diagnostics", 60000, 10);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    // Run all diagnostic queries in parallel
    const [
      campaignsByStatus,
      stuckPendingFunding,
      stuckRanking,
      reachExhausted,
      lowQualityCampaigns,
      scoringBySource,
      scoreStats,
      scoreDistribution,
      payoutStats,
      pendingPayouts,
      reachStats,
      overServed,
      reputationByTier,
      reputationStats,
    ] = await Promise.all([
      // Campaign status breakdown
      sql`SELECT status, COUNT(*)::int AS count FROM campaigns GROUP BY status`,

      // Stuck in pending_funding > 3 days
      sql`SELECT id, created_at,
            EXTRACT(DAY FROM now() - created_at)::int AS days_pending
          FROM campaigns
          WHERE status = 'pending_funding'
            AND created_at < now() - interval '3 days'
          ORDER BY created_at ASC LIMIT 20`,

      // Stuck in ranking status
      sql`SELECT id, ranking_status, updated_at AS stuck_since
          FROM campaigns
          WHERE ranking_status = 'ranking'
            AND updated_at < now() - interval '10 minutes'
          LIMIT 10`,

      // Reach exhausted (served >= effective)
      sql`SELECT id, reach_served, effective_reach_units
          FROM campaigns
          WHERE status = 'active'
            AND reach_served >= COALESCE(effective_reach_units, total_reach_units, 9999)
          LIMIT 20`,

      // Low quality active campaigns (score < 30)
      sql`SELECT id, quality_score, title
          FROM campaigns
          WHERE status = 'active' AND quality_score IS NOT NULL AND quality_score < 30
          LIMIT 20`,

      // Scoring source breakdown
      sql`SELECT scoring_source, COUNT(*)::int AS count
          FROM responses WHERE status = 'ranked' AND scoring_source IS NOT NULL
          GROUP BY scoring_source`,

      // Score stats
      sql`SELECT
            COUNT(*)::int AS total_ranked,
            ROUND(AVG(quality_score)::numeric, 1) AS avg_score,
            ROUND(AVG(scoring_confidence)::numeric, 2) AS avg_confidence,
            MIN(quality_score) AS min_score,
            MAX(quality_score) AS max_score
          FROM responses WHERE status = 'ranked'`,

      // Score distribution buckets
      sql`SELECT
            COUNT(*) FILTER (WHERE quality_score BETWEEN 0 AND 25)::int AS "0_25",
            COUNT(*) FILTER (WHERE quality_score BETWEEN 26 AND 50)::int AS "26_50",
            COUNT(*) FILTER (WHERE quality_score BETWEEN 51 AND 75)::int AS "51_75",
            COUNT(*) FILTER (WHERE quality_score BETWEEN 76 AND 100)::int AS "76_100"
          FROM responses WHERE status = 'ranked'`,

      // Payout stats
      sql`SELECT
            COUNT(DISTINCT campaign_id)::int AS campaigns_allocated,
            COUNT(*)::int AS total_payouts,
            ROUND(SUM(amount)::numeric, 2) AS total_distributed,
            ROUND(AVG(amount)::numeric, 2) AS avg_payout
          FROM payouts WHERE status != 'failed'`,

      // Pending payouts
      sql`SELECT COUNT(*)::int AS count FROM payouts WHERE status = 'pending'`,

      // Reach delivery stats
      sql`SELECT
            COUNT(*)::int AS total_impressions,
            ROUND(AVG(
              CASE WHEN effective_reach_units > 0
                THEN reach_served::numeric / effective_reach_units
                ELSE 0
              END
            ), 2) AS avg_delivery_rate
          FROM campaigns
          WHERE status IN ('active', 'completed') AND effective_reach_units > 0`,

      // Over-served campaigns (reach_served > effective + 10)
      sql`SELECT COUNT(*)::int AS count
          FROM campaigns
          WHERE reach_served > COALESCE(effective_reach_units, total_reach_units, 0) + 10`,

      // Reputation tier breakdown
      sql`SELECT reputation_tier, COUNT(*)::int AS count
          FROM profiles
          WHERE role = 'respondent' AND reputation_tier IS NOT NULL
          GROUP BY reputation_tier`,

      // Reputation stats
      sql`SELECT
            COUNT(*) FILTER (WHERE reputation_score > 0)::int AS with_reputation,
            ROUND(AVG(CASE WHEN reputation_score > 0 THEN reputation_score END)::numeric, 1) AS avg_score
          FROM profiles WHERE role = 'respondent'`,
    ]);

    const statusMap: Record<string, number> = {};
    for (const row of campaignsByStatus) {
      statusMap[row.status] = row.count;
    }

    const sourceMap: Record<string, number> = {};
    for (const row of scoringBySource) {
      sourceMap[row.scoring_source] = row.count;
    }

    const tierMap: Record<string, number> = {};
    for (const row of reputationByTier) {
      tierMap[row.reputation_tier] = row.count;
    }

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      campaigns: {
        total: Object.values(statusMap).reduce((a, b) => a + b, 0),
        byStatus: statusMap,
        stuckPendingFunding: stuckPendingFunding.map((r) => ({
          id: r.id,
          createdAt: r.created_at,
          daysPending: r.days_pending,
        })),
        stuckRanking: stuckRanking.map((r) => ({
          id: r.id,
          rankingStatus: r.ranking_status,
          stuckSince: r.stuck_since,
        })),
        reachExhausted: reachExhausted.map((r) => ({
          id: r.id,
          reachServed: r.reach_served,
          effectiveReach: r.effective_reach_units,
        })),
        lowQuality: lowQualityCampaigns.map((r) => ({
          id: r.id,
          qualityScore: r.quality_score,
          title: r.title,
        })),
      },
      scoring: {
        totalRanked: scoreStats[0]?.total_ranked ?? 0,
        bySource: sourceMap,
        avgScore: Number(scoreStats[0]?.avg_score ?? 0),
        avgConfidence: Number(scoreStats[0]?.avg_confidence ?? 0),
        scoreDistribution: {
          "0-25": scoreDistribution[0]?.["0_25"] ?? 0,
          "26-50": scoreDistribution[0]?.["26_50"] ?? 0,
          "51-75": scoreDistribution[0]?.["51_75"] ?? 0,
          "76-100": scoreDistribution[0]?.["76_100"] ?? 0,
        },
      },
      payouts: {
        campaignsAllocated: payoutStats[0]?.campaigns_allocated ?? 0,
        totalPayouts: payoutStats[0]?.total_payouts ?? 0,
        totalDistributed: Number(payoutStats[0]?.total_distributed ?? 0),
        avgPayout: Number(payoutStats[0]?.avg_payout ?? 0),
        pendingCount: pendingPayouts[0]?.count ?? 0,
      },
      reach: {
        totalImpressions: reachStats[0]?.total_impressions ?? 0,
        avgDeliveryRate: Number(reachStats[0]?.avg_delivery_rate ?? 0),
        campaignsOverServed: overServed[0]?.count ?? 0,
      },
      reputation: {
        byTier: tierMap,
        respondentsWithReputation: reputationStats[0]?.with_reputation ?? 0,
        avgScore: Number(reputationStats[0]?.avg_score ?? 0),
      },
    });
  } catch (err) {
    console.error("[admin/diagnostics] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
