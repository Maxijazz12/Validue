import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import sql from "@/lib/db";
import EditDraftFlow from "./EditDraftFlow";
import type { CampaignDraft, DraftQuestion, EvidenceCategory } from "@/lib/ai/types";

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

  const draftQuestions: DraftQuestion[] = questions.map((q, i) => ({
    id: `q-${i}-${Date.now()}`,
    text: q.text,
    type: q.type as "open" | "multiple_choice",
    options: q.options ?? null,
    section: q.is_baseline ? "baseline" as const : (i < questions.length - 2 ? "open" as const : "followup" as const),
    isBaseline: q.is_baseline,
    category: (q.category as EvidenceCategory) || undefined,
    assumptionIndex: q.assumption_index ?? undefined,
    anchors: q.anchors ?? undefined,
  }));

  const draft: CampaignDraft = {
    title: campaign.title,
    summary: campaign.description || "",
    category: campaign.category || "Other",
    tags: campaign.tags || [],
    assumptions: campaign.key_assumptions || [],
    questions: draftQuestions,
    format: campaign.format || "quick",
    rewardPool: Number(campaign.reward_amount) || 0,
    audience: {
      interests: campaign.target_interests || [],
      expertise: campaign.target_expertise || [],
      ageRanges: campaign.target_age_ranges || [],
      location: campaign.target_location || "",
      occupation: campaign.audience_occupation || "",
      industry: campaign.audience_industry || "",
      experienceLevel: campaign.audience_experience_level || "",
      nicheQualifier: campaign.audience_niche_qualifier || "",
    },
    qualityScores: campaign.quality_scores || undefined,
  };

  return <EditDraftFlow campaignId={id} initialDraft={draft} />;
}
