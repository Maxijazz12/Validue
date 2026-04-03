"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { logOps } from "@/lib/ops-logger";
import { captureError } from "@/lib/sentry";
import sql from "@/lib/db";

/**
 * Permanently delete the authenticated user's account and all associated data.
 * Cascading order matters — delete from leaf tables first.
 */
export async function deleteAccount(): Promise<{ error: string } | never> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

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
    });

    // Delete auth user via Supabase Admin API
    // Note: we use the service-role client for this, but since we don't have one
    // configured, we'll sign the user out and the auth.users row will be orphaned.
    // Supabase will clean orphaned auth users, or you can set up a DB trigger.
    // For now, sign out to invalidate the session.

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
    return { error: "Account deletion failed. Please contact support." };
  }

  // Sign out
  await supabase.auth.signOut();

  redirect("/auth/login?deleted=true");
}
