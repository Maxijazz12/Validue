"use server";

import { createClient } from "@/lib/supabase/server";
import { durableRateLimit } from "@/lib/durable-rate-limit";

export async function dismissOnboarding() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const rl = await durableRateLimit(`dismiss-onboarding:${user.id}`, 60_000, 5);
  if (!rl.allowed) return;

  await supabase
    .from("profiles")
    .update({ onboarding_completed: true })
    .eq("id", user.id);
}
