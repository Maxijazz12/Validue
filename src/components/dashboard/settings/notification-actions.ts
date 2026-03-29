"use server";

import { createClient } from "@/lib/supabase/server";

export async function updateNotificationPreferences(
  preferences: Record<string, boolean>
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  await supabase
    .from("profiles")
    .update({ notification_preferences: preferences })
    .eq("id", user.id);

  return { success: true };
}
