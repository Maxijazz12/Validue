/**
 * Campaign Expiration Cron Job
 *
 * Call via GET /api/cron/expire-campaigns (protected by CRON_SECRET header).
 * Should be scheduled every 15 minutes by an external scheduler (Vercel cron, etc).
 *
 * Actions:
 * 1. Clean up stale in-progress responses (> 60 min old) globally
 * 2. Find active campaigns past their expires_at
 * 3. For each expired campaign:
 *    a. Mark completed
 *    b. If qualifying responses exist: settle bonus, move locked→available
 *    c. If 0 qualifying responses: grant platform credit to founder
 *    d. Notify founder
 */

import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { DEFAULTS } from "@/lib/defaults";
import {
  qualifyResponse,
  distributePayoutsV2,
  distributeSubsidizedPayouts,
  type ScoredResponse,
  type ResponseMetadata,
  type CampaignFormat,
} from "@/lib/payout-math";
import { logOps } from "@/lib/ops-logger";

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = {
    staleCleanedUp: 0,
    campaignsExpired: 0,
    campaignsAutoExtended: 0,
    payoutsSettled: 0,
    creditsGranted: 0,
    errors: [] as string[],
  };

  try {
    // 1. Clean up stale in-progress responses globally
    const staleResult = await sql`
      UPDATE responses
      SET status = 'abandoned'
      WHERE status = 'in_progress'
        AND created_at < NOW() - INTERVAL '1 millisecond' * ${DEFAULTS.STALE_RESPONSE_TIMEOUT_MS}
      RETURNING id
    `;
    results.staleCleanedUp = staleResult.length;

    // 2. Find expired active V2 campaigns
    const expiredCampaigns = await sql`
      SELECT id, creator_id, distributable_amount, format, is_subsidized, reward_amount,
             current_responses, target_responses, auto_extended
      FROM campaigns
      WHERE status = 'active'
        AND economics_version = 2
        AND expires_at IS NOT NULL
        AND expires_at <= NOW()
    `;

    for (const campaign of expiredCampaigns) {
      try {
        // Auto-extend: if >50% filled and not already extended, grant more time
        const fillRatio = (campaign.target_responses ?? 0) > 0
          ? (campaign.current_responses ?? 0) / campaign.target_responses
          : 0;
        if (
          fillRatio >= DEFAULTS.CAMPAIGN_AUTO_EXTEND_FILL_RATIO &&
          !campaign.auto_extended
        ) {
          await sql`
            UPDATE campaigns
            SET expires_at = NOW() + INTERVAL '1 day' * ${DEFAULTS.CAMPAIGN_AUTO_EXTEND_DAYS},
                auto_extended = true,
                updated_at = NOW()
            WHERE id = ${campaign.id} AND status = 'active'
          `;
          logOps({
            event: "campaign.auto_extended",
            campaignId: campaign.id,
            fillRatio: Math.round(fillRatio * 100),
            extensionDays: DEFAULTS.CAMPAIGN_AUTO_EXTEND_DAYS,
          });
          results.campaignsAutoExtended++;
          continue; // skip expiration — campaign got more time
        }

        // Mark campaign as completed
        await sql`
          UPDATE campaigns
          SET status = 'completed', updated_at = NOW()
          WHERE id = ${campaign.id} AND status = 'active'
        `;

        // Fetch ranked responses with answer metadata
        const responses = await sql`
          SELECT r.id, r.respondent_id, r.quality_score, r.scoring_confidence,
                 p.full_name AS respondent_name
          FROM responses r
          LEFT JOIN profiles p ON p.id = r.respondent_id
          WHERE r.campaign_id = ${campaign.id}
            AND r.status = 'ranked'
        `;

        // Fetch answer metadata for qualification
        const answerData = await sql`
          SELECT a.response_id, a.metadata
          FROM answers a
          JOIN responses r ON r.id = a.response_id
          WHERE r.campaign_id = ${campaign.id}
            AND r.status = 'ranked'
        `;

        // Group answers by response
        const answersByResponse = new Map<string, { metadata: Record<string, unknown> }[]>();
        for (const a of answerData) {
          const list = answersByResponse.get(a.response_id) || [];
          list.push({ metadata: a.metadata || {} });
          answersByResponse.set(a.response_id, list);
        }

        if (responses.length === 0) {
          // Zero qualifying responses — grant platform credit
          const distributable = Number(campaign.distributable_amount) || 0;
          if (distributable > 0 && !campaign.is_subsidized) {
            const creditCents = Math.round(distributable * 100);
            await sql`
              UPDATE profiles
              SET platform_credit_cents = platform_credit_cents + ${creditCents},
                  platform_credit_expires_at = NOW() + INTERVAL '90 days'
              WHERE id = ${campaign.creator_id}
            `;
            results.creditsGranted++;

            // Notify founder
            await sql`
              INSERT INTO notifications (user_id, type, title, body, campaign_id, amount, link)
              VALUES (
                ${campaign.creator_id},
                'campaign_completed',
                'Campaign expired — credit issued',
                ${`Your campaign received no qualifying responses. We've added $${distributable.toFixed(2)} in credit to your account.`},
                ${campaign.id},
                ${distributable},
                '/dashboard/earnings'
              )
            `;
          }

          logOps({
            event: "campaign.status_changed",
            campaignId: campaign.id,
            fromStatus: "active",
            toStatus: "completed",
            triggeredBy: "expiration_cron",
          });
          results.campaignsExpired++;
          continue;
        }

        // Build qualification data and distribute payouts
        const format: CampaignFormat = campaign.format === "quick" ? "quick" : "standard";
        const distributable = Number(campaign.distributable_amount) || 0;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const scoredResponses: ScoredResponse[] = responses.map((r: any) => ({
          responseId: r.id,
          respondentId: r.respondent_id,
          respondentName: r.respondent_name || "Anonymous",
          qualityScore: Number(r.quality_score) || 0,
          confidence: Number(r.scoring_confidence) || 0.5,
        }));

        const qualResults = scoredResponses.map((sr) => {
          const answers = answersByResponse.get(sr.responseId) || [];
          let totalTimeMs = 0;
          const openAnswers: { charCount: number }[] = [];
          for (const a of answers) {
            totalTimeMs += Math.max(0, Number(a.metadata.timeSpentMs) || 0);
            const charCount = Math.max(0, Number(a.metadata.charCount) || 0);
            if (charCount > 0) openAnswers.push({ charCount });
          }
          const meta: ResponseMetadata = { totalTimeMs, openAnswers };
          return qualifyResponse(sr, format, meta);
        });

        const allocations = campaign.is_subsidized
          ? distributeSubsidizedPayouts(scoredResponses, qualResults)
          : distributePayoutsV2(scoredResponses, distributable, qualResults);

        // Apply allocations: create payouts, update responses, update balances
        for (const alloc of allocations) {
          if (alloc.qualified && alloc.suggestedAmount > 0) {
            // Create payout record
            await sql`
              INSERT INTO payouts (response_id, campaign_id, founder_id, respondent_id, amount, base_amount, bonus_amount, platform_fee, status)
              VALUES (${alloc.responseId}, ${campaign.id}, ${campaign.creator_id}, ${alloc.respondentId}, ${alloc.suggestedAmount}, ${alloc.basePayout}, ${alloc.bonusPayout}, 0, 'pending')
            `;
            // Update response — move to available (campaign is closing)
            await sql`
              UPDATE responses
              SET payout_amount = ${alloc.suggestedAmount},
                  base_payout = ${alloc.basePayout},
                  bonus_payout = ${alloc.bonusPayout},
                  is_qualified = true,
                  money_state = 'available',
                  available_at = NOW()
              WHERE id = ${alloc.responseId}
            `;
            // Move to available balance (not pending — campaign is done)
            const amountCents = Math.round(alloc.suggestedAmount * 100);
            await sql`
              UPDATE profiles
              SET available_balance_cents = available_balance_cents + ${amountCents}
              WHERE id = ${alloc.respondentId}
            `;
            // Notify respondent
            await sql`
              INSERT INTO notifications (user_id, type, title, body, campaign_id, amount, link)
              VALUES (
                ${alloc.respondentId},
                'payout_earned',
                'You earned money!',
                ${`$${alloc.suggestedAmount.toFixed(2)} is now available in your balance`},
                ${campaign.id},
                ${alloc.suggestedAmount},
                '/dashboard/earnings'
              )
            `;
            results.payoutsSettled++;
          } else {
            // Disqualified
            await sql`
              UPDATE responses
              SET payout_amount = 0,
                  base_payout = 0,
                  bonus_payout = 0,
                  is_qualified = false,
                  disqualification_reasons = ${alloc.disqualificationReasons},
                  money_state = 'not_qualified'
              WHERE id = ${alloc.responseId}
            `;
          }
        }

        // Also move any still-locked payouts from earlier scoring to available
        await sql`
          UPDATE responses
          SET money_state = 'available', available_at = NOW()
          WHERE campaign_id = ${campaign.id}
            AND money_state = 'locked'
        `;
        // Move pending_balance to available_balance for respondents with locked payouts on this campaign
        const lockedRespondents = await sql`
          SELECT DISTINCT respondent_id, SUM(payout_amount) AS total
          FROM responses
          WHERE campaign_id = ${campaign.id}
            AND money_state = 'available'
            AND available_at >= NOW() - INTERVAL '1 minute'
          GROUP BY respondent_id
        `;
        for (const lr of lockedRespondents) {
          const cents = Math.round(Number(lr.total) * 100);
          if (cents > 0) {
            await sql`
              UPDATE profiles
              SET pending_balance_cents = GREATEST(0, pending_balance_cents - ${cents}),
                  available_balance_cents = available_balance_cents + ${cents}
              WHERE id = ${lr.respondent_id}
                AND pending_balance_cents >= ${cents}
            `;
          }
        }

        // Set campaign payout_status
        await sql`
          UPDATE campaigns SET payout_status = 'allocated' WHERE id = ${campaign.id}
        `;

        // Notify founder
        const qualifiedCount = allocations.filter(a => a.qualified).length;
        await sql`
          INSERT INTO notifications (user_id, type, title, body, campaign_id, link)
          VALUES (
            ${campaign.creator_id},
            'campaign_completed',
            'Campaign completed',
            ${`Your campaign received ${qualifiedCount} qualifying response${qualifiedCount !== 1 ? "s" : ""}. Payouts have been distributed.`},
            ${campaign.id},
            ${`/dashboard/ideas/${campaign.id}/responses`}
          )
        `;

        logOps({
          event: "campaign.status_changed",
          campaignId: campaign.id,
          fromStatus: "active",
          toStatus: "completed",
          triggeredBy: "expiration_cron",
        });
        results.campaignsExpired++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        results.errors.push(`Campaign ${campaign.id}: ${msg}`);
        console.error(`[expire-campaigns] Error processing campaign ${campaign.id}:`, err);
      }
    }
  } catch (err) {
    console.error("[expire-campaigns] Fatal error:", err);
    return NextResponse.json(
      { error: "Cron job failed", details: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }

  console.log("[expire-campaigns] Completed:", JSON.stringify(results));

  return NextResponse.json({ ok: true, ...results });
}
