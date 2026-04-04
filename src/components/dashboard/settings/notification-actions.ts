"use server";

import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

const NOTIFICATION_KEYS = new Set([
  "new_response",
  "campaign_completed",
  "payout_earned",
  "ranking_complete",
  "quality_feedback",
]);

export async function updateNotificationPreferences(
  preferences: Record<string, boolean>
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const rl = rateLimit(`notif-prefs:${user.id}`, 60000, 10);
  if (!rl.allowed) return { error: "Too many requests. Please try again later." };

  // Only allow known keys with boolean values
  const valid = Object.fromEntries(
    Object.entries(preferences).filter(
      ([k, v]) => NOTIFICATION_KEYS.has(k) && typeof v === "boolean"
    )
  );

  await supabase
    .from("profiles")
    .update({ notification_preferences: valid })
    .eq("id", user.id);

  return { success: true };
}
