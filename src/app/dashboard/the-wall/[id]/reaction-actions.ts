"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { durableRateLimit } from "@/lib/durable-rate-limit";

const VALID_TYPES = new Set(["fire", "lightbulb", "thumbsup", "thinking"]);

export async function toggleReaction(campaignId: string, reactionType: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");
  if (!VALID_TYPES.has(reactionType)) throw new Error("Invalid reaction type");

  // Rate limit: 20 reactions per minute
  const rl = await durableRateLimit(`reaction:${user.id}`, 60_000, 20);
  if (!rl.allowed) throw new Error("Too many reactions. Try again later.");

  // Check if reaction exists (toggle pattern)
  const { data: existing } = await supabase
    .from("campaign_reactions")
    .select("id")
    .eq("campaign_id", campaignId)
    .eq("user_id", user.id)
    .eq("reaction_type", reactionType)
    .maybeSingle();

  if (existing) {
    // Toggle off
    const { error } = await supabase
      .from("campaign_reactions")
      .delete()
      .eq("id", existing.id);
    if (error) throw new Error("Failed to remove reaction");
  } else {
    // Toggle on
    const { error } = await supabase.from("campaign_reactions").insert({
      campaign_id: campaignId,
      user_id: user.id,
      reaction_type: reactionType,
    });
    if (error) throw new Error("Failed to save reaction");
  }

  revalidatePath("/dashboard/the-wall");

  return { toggled: !existing };
}
