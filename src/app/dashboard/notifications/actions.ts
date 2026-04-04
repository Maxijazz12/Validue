"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { durableRateLimit } from "@/lib/durable-rate-limit";

const uuidSchema = z.string().uuid();

export type Notification = {
  id: string;
  type: "campaign_completed" | "payout_earned" | "new_response" | "ranking_complete" | "quality_feedback";
  title: string;
  body: string | null;
  campaign_id: string | null;
  amount: number | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

export async function getNotifications(): Promise<Notification[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data } = await supabase
    .from("notifications")
    .select("id, type, title, body, campaign_id, amount, link, read_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (data as Notification[]) || [];
}

export async function markNotificationRead(id: string) {
  if (!uuidSchema.safeParse(id).success) throw new Error("Invalid notification ID.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const rl = await durableRateLimit(`notif:${user.id}`, 60_000, 30);
  if (!rl.allowed) throw new Error("Too many requests. Please slow down.");

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  revalidatePath("/dashboard");
}

export async function markAllRead() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const rl = await durableRateLimit(`notif-all:${user.id}`, 60_000, 10);
  if (!rl.allowed) throw new Error("Too many requests. Please slow down.");

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);

  revalidatePath("/dashboard");
}
