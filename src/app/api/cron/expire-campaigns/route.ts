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

import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { DEFAULTS } from "@/lib/defaults";
import { cronEnv } from "@/lib/env";
import {
  qualifyResponse,
  distributePayoutsV2,
  distributeSubsidizedPayouts,
  type ScoredResponse,
  type ResponseMetadata,
  type CampaignFormat,
} from "@/lib/payout-math";
import { logOps } from "@/lib/ops-logger";
import { captureError } from "@/lib/sentry";
import { settleLockedCampaignPayouts } from "@/lib/campaign-settlement";

function verifyCronSecret(request: Request, secret: string): boolean {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return false;
  try {
    return timingSafeEqual(
      Buffer.from(authHeader),
      Buffer.from(`Bearer ${secret}`)
    );
  } catch {
    return false; // Length mismatch
  }
}

export async function GET(request: Request) {
  // Verify cron secret (timing-safe to prevent brute-force)
  const cronSecret = cronEnv().CRON_SECRET;
  if (!cronSecret || !verifyCronSecret(request, cronSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = {
    staleCleanedUp: 0,
    campaignsExpired: 0,
    campaignsAutoExtended: 0,
    payoutsSettled: 0,
    creditsGranted: 0,
    orphanedCashoutsRecovered: 0,
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

    // 1a-ii. Reset stale ranking locks (crash/timeout recovery)
    const staleRanking = await sql`
      UPDATE campaigns
      SET ranking_status = 'unranked', updated_at = NOW()
      WHERE ranking_status = 'ranking'
        AND updated_at < NOW() - INTERVAL '10 minutes'
      RETURNING id
    `;
    for (const sr of staleRanking) {
      logOps({
        event: "campaign.status_changed",
        campaignId: sr.id,
        fromStatus: "ranking",
        toStatus: "unranked",
        triggeredBy: "expiration_cron",
      });
    }

    // 1a-iii. Recover orphaned cashouts stuck in 'processing' with no Stripe transfer
    const orphanedCashouts = await sql`
      SELECT id
      FROM cashouts
      WHERE status = 'processing'
        AND stripe_transfer_id IS NULL
        AND created_at < NOW() - INTERVAL '15 minutes'
    `;
    for (const oc of orphanedCashouts) {
      try {
        const [recoveredCashout] = await sql`
          UPDATE cashouts SET status = 'failed', failure_reason = 'Orphaned — no Stripe transfer after 15 min'
          WHERE id = ${oc.id} AND status = 'processing'
          RETURNING respondent_id, amount_cents
        `;
        if (!recoveredCashout) continue;

        await sql`
          UPDATE profiles
          SET available_balance_cents = available_balance_cents + ${recoveredCashout.amount_cents}
          WHERE id = ${recoveredCashout.respondent_id}
        `;
        logOps({
          event: "cashout.initiated",
          userId: recoveredCashout.respondent_id,
          cashoutId: oc.id,
          amountCents: -(recoveredCashout.amount_cents as number),
          stripeTransferId: "ORPHAN_RECOVERED",
        });
        results.orphanedCashoutsRecovered++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        results.errors.push(`Orphaned cashout ${oc.id}: ${msg}`);
        console.error(`[expire-campaigns] Orphaned cashout recovery failed ${oc.id}:`, err);
      }
    }

    // 1b. Clean up orphaned pending_gate campaigns (no expiry set, stale > 30 days)
    const orphanedGates = await sql`
      UPDATE campaigns
      SET status = 'completed', updated_at = NOW()
      WHERE status = 'pending_gate'
        AND created_at < NOW() - INTERVAL '30 days'
      RETURNING id
    `;
    for (const og of orphanedGates) {
      logOps({
        event: "campaign.status_changed",
        campaignId: og.id,
        fromStatus: "pending_gate",
        toStatus: "completed",
        triggeredBy: "expiration_cron",
      });
    }

    // 1c. Clean up orphaned pending_funding campaigns (abandoned checkouts, stale > 7 days)
    const orphanedFunding = await sql`
      UPDATE campaigns
      SET status = 'completed', updated_at = NOW()
      WHERE status = 'pending_funding'
        AND funded_at IS NULL
        AND created_at < NOW() - INTERVAL '7 days'
      RETURNING id
    `;
    for (const of2 of orphanedFunding) {
      logOps({
        event: "campaign.status_changed",
        campaignId: of2.id,
        fromStatus: "pending_funding",
        toStatus: "completed",
        triggeredBy: "expiration_cron",
      });
    }

    // 1d. Clean up paused campaigns older than 30 days
    const stalePaused = await sql`
      UPDATE campaigns
      SET status = 'completed', updated_at = NOW()
      WHERE status = 'paused'
        AND updated_at < NOW() - INTERVAL '30 days'
      RETURNING id
    `;
    for (const sp of stalePaused) {
      logOps({
        event: "campaign.status_changed",
        campaignId: sp.id,
        fromStatus: "paused",
        toStatus: "completed",
        triggeredBy: "expiration_cron",
      });
    }

    // 2. Find expired active V2 campaigns
    const expiredCampaigns = await sql`
      SELECT id
      FROM campaigns
      WHERE status = 'active'
        AND expires_at IS NOT NULL
        AND expires_at <= NOW()
    `;

    for (const campaignRef of expiredCampaigns) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TransactionSql loses call signature
        const outcome = await sql.begin(async (tx: any) => {
          const [campaign] = await tx`
            SELECT
              id,
              creator_id,
              distributable_amount,
              format,
              is_subsidized,
              reward_amount,
              current_responses,
              target_responses,
              auto_extended,
              payout_status
            FROM campaigns
            WHERE id = ${campaignRef.id}
              AND status = 'active'
            FOR UPDATE
          `;

          if (!campaign) {
            return { kind: "skipped" } as const;
          }

          const fillRatio = (campaign.target_responses ?? 0) > 0
            ? (campaign.current_responses ?? 0) / campaign.target_responses
            : 0;

          if (
            fillRatio >= DEFAULTS.CAMPAIGN_AUTO_EXTEND_FILL_RATIO &&
            !campaign.auto_extended
          ) {
            await tx`
              UPDATE campaigns
              SET expires_at = NOW() + INTERVAL '1 day' * ${DEFAULTS.CAMPAIGN_AUTO_EXTEND_DAYS},
                  auto_extended = true,
                  updated_at = NOW()
              WHERE id = ${campaign.id}
            `;

            return {
              kind: "auto_extended",
              campaignId: campaign.id,
              fillRatio,
            } as const;
          }

          const [lockedSummary] = await tx`
            SELECT COUNT(*)::int AS locked_count
            FROM responses
            WHERE campaign_id = ${campaign.id}
              AND money_state = 'locked'
          `;
          const lockedCount = Number(lockedSummary?.locked_count ?? 0);

          if (campaign.payout_status === "allocated" || lockedCount > 0) {
            const settlement = await settleLockedCampaignPayouts(tx, campaign.id);

            await tx`
              UPDATE campaigns
              SET status = 'completed',
                  payout_status = 'completed',
                  updated_at = NOW()
              WHERE id = ${campaign.id}
            `;

            await tx`
              INSERT INTO notifications (user_id, type, title, body, campaign_id, link)
              VALUES (
                ${campaign.creator_id},
                'campaign_completed',
                'Campaign completed',
                ${`Your campaign received ${lockedCount} qualifying response${lockedCount !== 1 ? "s" : ""}. Payouts are now available.`},
                ${campaign.id},
                ${`/dashboard/ideas/${campaign.id}/responses`}
              )
            `;

            return {
              kind: "completed",
              campaignId: campaign.id,
              payoutsSettled: settlement.lockedCount,
              creditsGranted: 0,
            } as const;
          }

          const responses = await tx`
            SELECT
              r.id,
              r.respondent_id,
              r.quality_score,
              r.scoring_confidence,
              r.submitted_duration_ms,
              p.full_name AS respondent_name
            FROM responses r
            LEFT JOIN profiles p ON p.id = r.respondent_id
            WHERE r.campaign_id = ${campaign.id}
              AND r.status = 'ranked'
          `;

          const answerData = await tx`
            SELECT a.response_id, a.text, q.type
            FROM answers a
            JOIN questions q ON q.id = a.question_id
            JOIN responses r ON r.id = a.response_id
            WHERE r.campaign_id = ${campaign.id}
              AND r.status = 'ranked'
          `;

          const answersByResponse = new Map<string, { text: string | null; type: string | null }[]>();
          for (const answer of answerData) {
            const list = answersByResponse.get(answer.response_id) ?? [];
            list.push({ text: answer.text, type: answer.type });
            answersByResponse.set(answer.response_id, list);
          }

          const format: CampaignFormat = campaign.format === "quick" ? "quick" : "standard";
          const distributable = Number(campaign.distributable_amount) || 0;
          const submittedDurationByResponse = new Map<string, number>();

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const scoredResponses: ScoredResponse[] = responses.map((response: any) => {
            submittedDurationByResponse.set(
              response.id,
              Math.max(0, Number(response.submitted_duration_ms) || 0)
            );

            return {
              responseId: response.id,
              respondentId: response.respondent_id,
              respondentName: response.respondent_name || "Anonymous",
              qualityScore: Number(response.quality_score) || 0,
              confidence: Number(response.scoring_confidence) || 0.5,
            };
          });

          const qualResults = scoredResponses.map((sr) => {
            const answers = answersByResponse.get(sr.responseId) || [];
            const openAnswers: { charCount: number }[] = [];

            for (const answer of answers) {
              if (answer.type !== "open") continue;
              const charCount = (answer.text || "").trim().length;
              if (charCount > 0) {
                openAnswers.push({ charCount });
              }
            }

            const meta: ResponseMetadata = {
              totalTimeMs: submittedDurationByResponse.get(sr.responseId) ?? 0,
              openAnswers,
              spamFlagged: false,
            };

            return qualifyResponse(sr, format, meta);
          });

          const allocations = campaign.is_subsidized
            ? distributeSubsidizedPayouts(scoredResponses, qualResults)
            : distributable <= 0
              ? scoredResponses.map((sr) => ({
                  responseId: sr.responseId,
                  respondentId: sr.respondentId,
                  respondentName: sr.respondentName,
                  qualityScore: sr.qualityScore,
                  qualified: false,
                  disqualificationReasons: ["unpaid_campaign"],
                  basePayout: 0,
                  bonusPayout: 0,
                  suggestedAmount: 0,
                  weight: 0,
                }))
              : distributePayoutsV2(scoredResponses, distributable, qualResults);

          let payoutsSettled = 0;
          for (const alloc of allocations) {
            if (alloc.qualified && alloc.suggestedAmount > 0) {
              await tx`
                INSERT INTO payouts (
                  response_id,
                  campaign_id,
                  founder_id,
                  respondent_id,
                  amount,
                  base_amount,
                  bonus_amount,
                  platform_fee,
                  status
                )
                VALUES (
                  ${alloc.responseId},
                  ${campaign.id},
                  ${campaign.creator_id},
                  ${alloc.respondentId},
                  ${alloc.suggestedAmount},
                  ${alloc.basePayout},
                  ${alloc.bonusPayout},
                  0,
                  'processing'
                )
              `;

              await tx`
                UPDATE responses
                SET payout_amount = ${alloc.suggestedAmount},
                    base_payout = ${alloc.basePayout},
                    bonus_payout = ${alloc.bonusPayout},
                    is_qualified = true,
                    disqualification_reasons = ARRAY[]::text[],
                    money_state = 'available',
                    available_at = NOW()
                WHERE id = ${alloc.responseId}
              `;

              const amountCents = Math.round(alloc.suggestedAmount * 100);
              await tx`
                UPDATE profiles
                SET available_balance_cents = available_balance_cents + ${amountCents}
                WHERE id = ${alloc.respondentId}
              `;

              await tx`
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

              payoutsSettled++;
            } else {
              await tx`
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

          const qualifiedCount = allocations.filter((alloc) => alloc.qualified).length;
          let creditsGranted = 0;
          let founderTitle = "Campaign completed";
          let founderBody = `Your campaign received ${qualifiedCount} qualifying response${qualifiedCount !== 1 ? "s" : ""}. Payouts have been distributed.`;
          let founderAmount: number | null = null;
          let founderLink = `/dashboard/ideas/${campaign.id}/responses`;

          if (qualifiedCount === 0 && distributable > 0 && !campaign.is_subsidized) {
            const creditCents = Math.round(distributable * 100);
            await tx`
              UPDATE profiles
              SET platform_credit_cents = platform_credit_cents + ${creditCents},
                  platform_credit_expires_at = COALESCE(
                    GREATEST(platform_credit_expires_at, NOW() + INTERVAL '90 days'),
                    NOW() + INTERVAL '90 days'
                  )
              WHERE id = ${campaign.creator_id}
            `;

            creditsGranted = 1;
            founderTitle = "Campaign expired — credit issued";
            founderBody = `Your campaign received no qualifying responses. We've added $${distributable.toFixed(2)} in credit to your account.`;
            founderAmount = distributable;
            founderLink = "/dashboard/earnings";
          }

          await tx`
            UPDATE campaigns
            SET status = 'completed',
                payout_status = 'completed',
                updated_at = NOW()
            WHERE id = ${campaign.id}
          `;

          await tx`
            INSERT INTO notifications (user_id, type, title, body, campaign_id, amount, link)
            VALUES (
              ${campaign.creator_id},
              'campaign_completed',
              ${founderTitle},
              ${founderBody},
              ${campaign.id},
              ${founderAmount},
              ${founderLink}
            )
          `;

          return {
            kind: "completed",
            campaignId: campaign.id,
            payoutsSettled,
            creditsGranted,
          } as const;
        });

        if (outcome.kind === "skipped") {
          continue;
        }

        if (outcome.kind === "auto_extended") {
          logOps({
            event: "campaign.auto_extended",
            campaignId: outcome.campaignId,
            fillRatio: Math.round(outcome.fillRatio * 100),
            extensionDays: DEFAULTS.CAMPAIGN_AUTO_EXTEND_DAYS,
          });
          results.campaignsAutoExtended++;
          continue;
        }

        logOps({
          event: "campaign.status_changed",
          campaignId: outcome.campaignId,
          fromStatus: "active",
          toStatus: "completed",
          triggeredBy: "expiration_cron",
        });
        results.campaignsExpired++;
        results.payoutsSettled += outcome.payoutsSettled;
        results.creditsGranted += outcome.creditsGranted;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        results.errors.push(`Campaign ${campaignRef.id}: ${msg}`);
        console.error(`[expire-campaigns] Error processing campaign ${campaignRef.id}:`, err);
      }
    }
  } catch (err) {
    console.error("[expire-campaigns] Fatal error:", err);
    captureError(err, { operation: "cron.expire_campaigns" });
    return NextResponse.json(
      { error: "Cron job failed" },
      { status: 500 }
    );
  }

  console.log("[expire-campaigns] Completed:", JSON.stringify(results));

  return NextResponse.json({ ok: true, ...results });
}
