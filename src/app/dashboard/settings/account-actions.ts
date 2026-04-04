"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { logOps } from "@/lib/ops-logger";
import { captureError } from "@/lib/sentry";
import { durableRateLimit } from "@/lib/durable-rate-limit";
import sql from "@/lib/db";

/**
 * Permanently delete the authenticated user's account when it has no shared
 * campaign or earnings history that would be distorted by self-serve deletion.
 */
export async function deleteAccount(): Promise<{ error: string } | never> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const rl = await durableRateLimit(`delete:${user.id}`, 600000, 1);
  if (!rl.allowed) return { error: "Too many requests. Please try again later." };

  const userId = user.id;

  // Block deletion if user has pending/processing cashouts
  const [pendingCashout] = await sql`
    SELECT id FROM cashouts
    WHERE respondent_id = ${userId} AND status IN ('pending', 'processing')
    LIMIT 1
  `;
  if (pendingCashout) {
    return { error: "You have a pending cashout. Please wait for it to complete before deleting your account." };
  }

  // Block deletion if user has active campaigns with unspent funding
  const [activeCampaign] = await sql`
    SELECT id FROM campaigns
    WHERE creator_id = ${userId}
      AND status IN ('active', 'pending_funding', 'pending_gate')
      AND distributable_amount > 0
    LIMIT 1
  `;
  if (activeCampaign) {
    return { error: "Please complete or cancel active campaigns before deleting your account." };
  }

  // Block deletion if user has locked/pending-qualification payouts (not yet settled to balance)
  const [lockedPayout] = await sql`
    SELECT id FROM payouts
    WHERE respondent_id = ${userId}
      AND money_state IN ('locked', 'pending_qualification')
    LIMIT 1
  `;
  if (lockedPayout) {
    return { error: "You have earnings being processed. Please wait for them to settle before deleting your account." };
  }

  // Block deletion if user has pending balance > 0 (money would be lost)
  const [profile] = await sql`
    SELECT available_balance_cents, pending_balance_cents
    FROM profiles WHERE id = ${userId}
  `;
  if (profile) {
    const available = Number(profile.available_balance_cents) || 0;
    const pending = Number(profile.pending_balance_cents) || 0;
    if (available > 0 || pending > 0) {
      return {
        error: `You have $${((available + pending) / 100).toFixed(2)} in earnings. Please cash out before deleting your account.`,
      };
    }
  }

  // Block deletion when other users have responses or payout history on this user's campaigns.
  const [creatorDependencies] = await sql`
    SELECT
      EXISTS(
        SELECT 1
        FROM responses r
        JOIN campaigns c ON c.id = r.campaign_id
        WHERE c.creator_id = ${userId}
        LIMIT 1
      ) AS has_campaign_responses,
      EXISTS(
        SELECT 1
        FROM payouts p
        JOIN campaigns c ON c.id = p.campaign_id
        WHERE c.creator_id = ${userId}
        LIMIT 1
      ) AS has_campaign_payouts
  `;
  if (creatorDependencies?.has_campaign_responses || creatorDependencies?.has_campaign_payouts) {
    return {
      error:
        "This account has collected responses or payout history. Please contact support at support@validue.com so we can delete it safely without impacting other users.",
    };
  }

  // Block self-serve deletion if this respondent has shared campaign or payout history.
  const [respondentDependencies] = await sql`
    SELECT
      EXISTS(
        SELECT 1
        FROM responses
        WHERE respondent_id = ${userId}
          AND status IN ('submitted', 'ranked')
        LIMIT 1
      ) AS has_response_history,
      EXISTS(
        SELECT 1
        FROM payouts
        WHERE respondent_id = ${userId}
        LIMIT 1
      ) AS has_payout_history,
      EXISTS(
        SELECT 1
        FROM cashouts
        WHERE respondent_id = ${userId}
        LIMIT 1
      ) AS has_cashout_history
  `;
  if (
    respondentDependencies?.has_response_history ||
    respondentDependencies?.has_payout_history ||
    respondentDependencies?.has_cashout_history
  ) {
    return {
      error:
        "This account has response or earnings history tied to other users' campaigns. Please contact support at support@validue.com so we can delete it safely without distorting shared records.",
    };
  }

  try {
    // Delete in dependency order (leaf → root)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TransactionSql loses call signature
    await sql.begin(async (tx: any) => {
      // Answers on responses this user authored
      await tx`
        DELETE FROM answers WHERE response_id IN (
          SELECT id FROM responses WHERE respondent_id = ${userId}
        )
      `;

      // Disputes filed by this user
      await tx`DELETE FROM disputes WHERE respondent_id = ${userId}`;

      // Cashouts (completed/failed only at this point)
      await tx`DELETE FROM cashouts WHERE respondent_id = ${userId}`;

      // Payouts (as respondent)
      await tx`DELETE FROM payouts WHERE respondent_id = ${userId}`;

      // Payouts (as founder — campaigns they created)
      await tx`
        DELETE FROM payouts WHERE campaign_id IN (
          SELECT id FROM campaigns WHERE creator_id = ${userId}
        )
      `;

      // Responses authored by this user
      await tx`DELETE FROM responses WHERE respondent_id = ${userId}`;

      // Answers on responses to campaigns this user created (other people's responses)
      await tx`
        DELETE FROM answers WHERE response_id IN (
          SELECT r.id FROM responses r
          JOIN campaigns c ON r.campaign_id = c.id
          WHERE c.creator_id = ${userId}
        )
      `;

      // Responses to campaigns this user created
      await tx`
        DELETE FROM responses WHERE campaign_id IN (
          SELECT id FROM campaigns WHERE creator_id = ${userId}
        )
      `;

      // Questions on their campaigns
      await tx`
        DELETE FROM questions WHERE campaign_id IN (
          SELECT id FROM campaigns WHERE creator_id = ${userId}
        )
      `;

      // Campaign reactions
      await tx`DELETE FROM campaign_reactions WHERE user_id = ${userId}`;
      await tx`
        DELETE FROM campaign_reactions WHERE campaign_id IN (
          SELECT id FROM campaigns WHERE creator_id = ${userId}
        )
      `;

      // Reach impressions
      await tx`DELETE FROM reach_impressions WHERE user_id = ${userId}`;
      await tx`
        DELETE FROM reach_impressions WHERE campaign_id IN (
          SELECT id FROM campaigns WHERE creator_id = ${userId}
        )
      `;

      // Notifications
      await tx`DELETE FROM notifications WHERE user_id = ${userId}`;

      // Subscriptions
      await tx`DELETE FROM subscriptions WHERE user_id = ${userId}`;

      // Campaigns (as creator)
      await tx`DELETE FROM campaigns WHERE creator_id = ${userId}`;

      // Profile
      await tx`DELETE FROM profiles WHERE id = ${userId}`;

      // Auth user
      await tx`DELETE FROM auth.users WHERE id = ${userId}`;
    });

    logOps({
      event: "webhook.processed",
      stripeEventId: "n/a",
      eventType: "account.deleted",
      result: "success",
      detail: `User ${userId} deleted their account`,
    });
  } catch (err) {
    console.error("[account-delete] Failed to delete account:", err);
    captureError(err, { userId, operation: "account.delete" });
    return { error: "Account deletion failed. Please contact support at support@validue.com." };
  }

  // Sign out
  try {
    await supabase.auth.signOut();
  } catch {
    // Cookie invalidation is best-effort after deleting the auth row.
  }

  redirect("/auth/login?deleted=true");
}
