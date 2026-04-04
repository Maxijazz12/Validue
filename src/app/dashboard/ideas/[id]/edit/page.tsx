import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import sql from "@/lib/db";
import {
  buildDraftFromStoredCampaign,
  type StoredDraftCampaignRecord,
  type StoredDraftQuestionRecord,
} from "@/lib/campaign-draft-persistence";
import EditDraftFlow from "./EditDraftFlow";
import type { CampaignDraft } from "@/lib/ai/types";

export default async function EditDraftPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const [campaign] = await sql`
    SELECT id, creator_id, status, title, description, category, tags,
           reward_amount, format, key_assumptions,
           target_interests, target_expertise, target_age_ranges, target_location,
           audience_occupation, audience_industry, audience_experience_level, audience_niche_qualifier,
           quality_scores
    FROM campaigns WHERE id = ${id}
  `;

  if (!campaign) redirect("/dashboard/ideas");
  if (campaign.creator_id !== user.id) redirect("/dashboard/ideas");
  if (campaign.status !== "draft") redirect(`/dashboard/ideas/${id}`);

  const questions = await sql`
    SELECT text, type, sort_order, options, is_baseline, category, assumption_index, anchors
    FROM questions WHERE campaign_id = ${id}
    ORDER BY sort_order
  `;

  const draft: CampaignDraft = buildDraftFromStoredCampaign(
    campaign as unknown as StoredDraftCampaignRecord,
    questions as unknown as StoredDraftQuestionRecord[]
  );

  return <EditDraftFlow campaignId={id} initialDraft={draft} />;
}
