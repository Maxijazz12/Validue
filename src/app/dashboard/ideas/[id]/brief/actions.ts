"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { synthesizeBrief } from "@/lib/ai/synthesize-brief";
import { getSubscription } from "@/lib/plan-guard";
import { DEFAULTS } from "@/lib/defaults";
import { durableRateLimit } from "@/lib/durable-rate-limit";
import sql from "@/lib/db";

const uuidSchema = z.string().uuid();
const BRIEF_FUNDING_GATE = DEFAULTS.BRIEF_FUNDING_GATE;

export async function refreshBrief(campaignId: string): Promise<void> {
  if (!uuidSchema.safeParse(campaignId).success) {
    redirect("/dashboard/ideas");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Rate limit: 5 brief generations per hour
  const rl = await durableRateLimit(`brief:${user.id}`, 3_600_000, 5);
  if (!rl.allowed) {
    redirect(`/dashboard/ideas/${campaignId}/brief`);
  }

  const [campaign] = await sql`
    SELECT id, title, description, key_assumptions, reward_amount
    FROM campaigns
    WHERE id = ${campaignId}
      AND creator_id = ${user.id}
    LIMIT 1
  `;

  if (!campaign) {
    redirect("/dashboard/ideas");
  }

  const [{ count }] = await sql`
    SELECT COUNT(*)::int AS count
    FROM responses
    WHERE campaign_id = ${campaignId}
      AND status IN ('submitted', 'ranked')
  `;
  if (count < 3) {
    redirect(`/dashboard/ideas/${campaignId}/brief`);
  }

  const rewardAmount = Number(campaign.reward_amount) || 0;
  const subscription = await getSubscription(user.id);
  const hasBriefAccess =
    rewardAmount >= BRIEF_FUNDING_GATE || subscription.tier !== "free";
  if (!hasBriefAccess) {
    redirect(`/dashboard/ideas/${campaignId}/brief`);
  }

  await synthesizeBrief(
    campaignId,
    String(campaign.title),
    String(campaign.description),
    (campaign.key_assumptions as string[] | null) ?? [],
    { persist: true }
  );

  revalidatePath(`/dashboard/ideas/${campaignId}/brief`);
  redirect(`/dashboard/ideas/${campaignId}/brief`);
}
