"use server";

import { createClient } from "@/lib/supabase/server";
import { durableRateLimit } from "@/lib/durable-rate-limit";
import { headers } from "next/headers";

export async function requestPasswordReset(email: string): Promise<{ error?: string }> {
  // Server-side rate limit: 3 requests per IP per 15 minutes
  const headerStore = await headers();
  const ip = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const ipLimit = await durableRateLimit(`pwd-reset-ip:${ip}`, 900_000, 3);
  if (!ipLimit.allowed) {
    return { error: "Too many reset requests. Please try again later." };
  }

  // Per-email rate limit: 2 requests per 10 minutes
  const emailKey = email.toLowerCase().trim();
  const emailLimit = await durableRateLimit(`pwd-reset-email:${emailKey}`, 600_000, 2);
  if (!emailLimit.allowed) {
    return { error: "Please wait before requesting another reset link." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(emailKey, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || headerStore.get("origin") || ""}/auth/callback?next=/auth/reset-password`,
  });

  if (error) {
    return { error: error.message };
  }

  return {};
}
