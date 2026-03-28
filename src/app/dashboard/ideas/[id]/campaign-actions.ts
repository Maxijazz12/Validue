"use server";

import { createClient } from "@/lib/supabase/server";
import sql from "@/lib/db";
import { revalidatePath } from "next/cache";
import { logOps } from "@/lib/ops-logger";
import { captureWarning } from "@/lib/sentry";

export async function completeCampaign(
  campaignId: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  try {
    const result = await sql`
      UPDATE campaigns
      SET status = 'completed', updated_at = NOW()
      WHERE id = ${campaignId}
        AND creator_id = ${user.id}
        AND status = 'active'
      RETURNING id
    `;
    if (result.length === 0) return { error: "Campaign not found or already completed." };
    logOps({ event: "campaign.status_changed", campaignId, fromStatus: "active", toStatus: "completed", triggeredBy: "user" });

    // Notify founder that campaign is complete
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("title")
      .eq("id", campaignId)
      .single();

    if (campaign) {
      await supabase.from("notifications").insert({
        user_id: user.id,
        type: "campaign_completed",
        title: "Campaign complete!",
        body: `"${campaign.title}" has reached its response target.`,
        campaign_id: campaignId,
        link: `/dashboard/ideas/${campaignId}/responses`,
      });
    }
  } catch (err) {
    console.error("[completeCampaign] DB error:", err);
    captureWarning(`completeCampaign failed: ${(err as Error).message}`, { campaignId, operation: "campaign.complete" });
    return { error: "Failed to complete campaign." };
  }

  revalidatePath(`/dashboard/ideas/${campaignId}`);
  return { success: true };
}

export async function pauseCampaign(
  campaignId: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  try {
    const result = await sql`
      UPDATE campaigns
      SET status = 'paused', updated_at = NOW()
      WHERE id = ${campaignId}
        AND creator_id = ${user.id}
        AND status = 'active'
      RETURNING id
    `;
    if (result.length === 0) return { error: "Campaign not found or not active." };
    logOps({ event: "campaign.status_changed", campaignId, fromStatus: "active", toStatus: "paused", triggeredBy: "user" });
  } catch (err) {
    console.error("[pauseCampaign] DB error:", err);
    captureWarning(`pauseCampaign failed: ${(err as Error).message}`, { campaignId, operation: "campaign.pause" });
    return { error: "Failed to pause campaign." };
  }

  revalidatePath(`/dashboard/ideas/${campaignId}`);
  return { success: true };
}

export async function resumeCampaign(
  campaignId: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  try {
    const result = await sql`
      UPDATE campaigns
      SET status = 'active', updated_at = NOW()
      WHERE id = ${campaignId}
        AND creator_id = ${user.id}
        AND status = 'paused'
      RETURNING id
    `;
    if (result.length === 0) return { error: "Campaign not found or not paused." };
    logOps({ event: "campaign.status_changed", campaignId, fromStatus: "paused", toStatus: "active", triggeredBy: "user" });
  } catch (err) {
    console.error("[resumeCampaign] DB error:", err);
    captureWarning(`resumeCampaign failed: ${(err as Error).message}`, { campaignId, operation: "campaign.resume" });
    return { error: "Failed to resume campaign." };
  }

  revalidatePath(`/dashboard/ideas/${campaignId}`);
  return { success: true };
}
