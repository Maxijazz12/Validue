"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { checkContent, enforceLength } from "@/lib/content-filter";
import { rateLimit } from "@/lib/rate-limit";
import { logOps } from "@/lib/ops-logger";

const MAX_COMMENT_LENGTH = 500;

export async function postComment(campaignId: string, content: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // Rate limit: 10 comments per hour
  const rl = rateLimit(`comment:${user.id}`, 60 * 60 * 1000, 10);
  if (!rl.allowed) throw new Error("Too many comments. Try again later.");

  // Content moderation
  const { text: safeText } = enforceLength(content, MAX_COMMENT_LENGTH);
  const check = checkContent(safeText);

  if (!check.allowed) {
    logOps({
      event: "content.flagged",
      userId: user.id,
      fieldName: `comment:${campaignId}`,
      action: "blocked",
      reason: check.reason || "prohibited content",
      entryPoint: "postComment",
    });
    throw new Error(check.reason || "Comment contains prohibited content");
  }

  if (check.flagged) {
    logOps({
      event: "content.flagged",
      userId: user.id,
      fieldName: `comment:${campaignId}`,
      action: "flagged",
      reason: check.reason || "mild content",
      entryPoint: "postComment",
    });
  }

  // Upsert (one comment per user per campaign)
  const { data, error } = await supabase
    .from("campaign_comments")
    .upsert(
      {
        campaign_id: campaignId,
        author_id: user.id,
        content: safeText,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "author_id,campaign_id" }
    )
    .select("id, content, created_at, updated_at")
    .single();

  if (error) throw new Error("Failed to save comment");

  revalidatePath("/dashboard/the-wall");

  return {
    id: data.id,
    content: data.content,
    createdAt: data.created_at,
  };
}

export async function deleteComment(campaignId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("campaign_comments")
    .delete()
    .eq("author_id", user.id)
    .eq("campaign_id", campaignId);

  if (error) throw new Error("Failed to delete comment");

  revalidatePath("/dashboard/the-wall");
}
