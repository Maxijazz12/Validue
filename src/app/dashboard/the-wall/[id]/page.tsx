import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import ResponseFlow from "@/components/dashboard/respond/ResponseFlow";

export default async function RespondPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Fetch campaign with creator info
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*, creator:profiles!creator_id(full_name, avatar_url)")
    .eq("id", id)
    .single();

  if (!campaign) notFound();
  if (campaign.status !== "active" && campaign.creator_id !== user.id)
    notFound();

  // Fetch questions
  const { data: questions } = await supabase
    .from("questions")
    .select("*")
    .eq("campaign_id", id)
    .order("sort_order", { ascending: true });

  // Check for existing response
  const { data: existingResponse } = await supabase
    .from("responses")
    .select("id, status")
    .eq("campaign_id", id)
    .eq("respondent_id", user.id)
    .maybeSingle();

  // Fetch existing answers if resuming
  let existingAnswers: { question_id: string; text: string; metadata: Record<string, unknown> }[] | null = null;
  if (existingResponse?.status === "in_progress") {
    const { data: answers } = await supabase
      .from("answers")
      .select("question_id, text, metadata")
      .eq("response_id", existingResponse.id);
    existingAnswers = answers;
  }

  // Fetch suggested next campaigns (for post-response suggestion cards)
  const { data: suggestedRaw } = await supabase
    .from("campaigns")
    .select("id, title, reward_amount, category, estimated_minutes, current_responses, target_responses, creator:profiles!creator_id(full_name)")
    .eq("status", "active")
    .neq("id", id)
    .neq("creator_id", user.id)
    .order("created_at", { ascending: false })
    .limit(6);

  // Filter out campaigns user already responded to
  const suggestedIds = (suggestedRaw || []).map((c) => c.id);
  const { data: userResponses } = suggestedIds.length > 0
    ? await supabase
        .from("responses")
        .select("campaign_id")
        .eq("respondent_id", user.id)
        .in("campaign_id", suggestedIds)
    : { data: [] };
  const respondedIds = new Set((userResponses || []).map((r) => r.campaign_id));
  const suggestedCampaigns = (suggestedRaw || [])
    .filter((c) => !respondedIds.has(c.id))
    .slice(0, 3)
    .map((c) => ({
      id: c.id,
      title: c.title,
      rewardAmount: Number(c.reward_amount) || 0,
      category: c.category as string | null,
      estimatedMinutes: (c.estimated_minutes as number) || 5,
      currentResponses: (c.current_responses as number) || 0,
      targetResponses: (c.target_responses as number) || 50,
      creatorName: (c.creator as { full_name: string } | null)?.full_name || "Anonymous",
    }));

  const creator = campaign.creator as { full_name: string; avatar_url: string | null } | null;

  return (
    <ResponseFlow
      suggestedCampaigns={suggestedCampaigns}
      campaign={{
        id: campaign.id,
        title: campaign.title,
        description: campaign.description,
        category: campaign.category,
        tags: campaign.tags || [],
        estimatedMinutes: campaign.estimated_minutes || 5,
        rewardAmount: Number(campaign.reward_amount) || 0,
        currentResponses: campaign.current_responses || 0,
        targetResponses: campaign.target_responses || 50,
        deadline: campaign.deadline,
        creatorName: creator?.full_name || "Anonymous",
        creatorAvatar: creator?.avatar_url || null,
        bonusAvailable: !!campaign.bonus_available,
        rewardsTopAnswers: !!campaign.rewards_top_answers,
        rewardType: campaign.reward_type,
      }}
      questions={(questions || []).map((q) => ({
        id: q.id,
        text: q.text,
        type: q.type as "open" | "multiple_choice",
        sortOrder: q.sort_order,
        options: q.options as string[] | null,
        isBaseline: q.is_baseline,
        category: q.category,
      }))}
      existingResponse={existingResponse}
      existingAnswers={existingAnswers}
      isOwnCampaign={campaign.creator_id === user.id}
      isFull={(campaign.current_responses || 0) >= (campaign.target_responses || 50)}
      isActive={campaign.status === "active"}
    />
  );
}
