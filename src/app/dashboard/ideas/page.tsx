import { createClient } from "@/lib/supabase/server";
import Button from "@/components/ui/Button";
import IdeasList, { type IdeaItem } from "@/components/dashboard/IdeasList";

function getAudienceLabel(idea: {
  target_interests: string[] | null;
  target_expertise: string[] | null;
  matched_responses: number;
  current_responses: number;
}): { text: string; color: string } {
  const hasTargeting =
    (idea.target_interests && idea.target_interests.length > 0) ||
    (idea.target_expertise && idea.target_expertise.length > 0);

  if (!hasTargeting) {
    return { text: "Open audience", color: "text-[#94A3B8]" };
  }

  const total = idea.current_responses || 0;
  if (total === 0) {
    return { text: "Awaiting responses", color: "text-[#94A3B8]" };
  }

  const ratio = total > 0 ? idea.matched_responses / total : 0;
  if (ratio >= 0.6) {
    return { text: "Strong audience match", color: "text-[#22c55e]" };
  }
  return { text: "Building audience", color: "text-[#E5654E]" };
}

export default async function IdeasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: ideas } = await supabase
    .from("campaigns")
    .select("id, title, status, reward_amount, reward_type, current_responses, target_responses, target_interests, target_expertise, created_at")
    .eq("creator_id", user!.id)
    .order("created_at", { ascending: false });

  // Batch count matched responses for all campaigns in one query
  const campaignIds = (ideas || []).map((i) => i.id);
  const matchedCounts = new Map<string, number>();
  if (campaignIds.length > 0) {
    const { data: matches } = await supabase
      .from("responses")
      .select("campaign_id, respondent:profiles!respondent_id(profile_completed)")
      .in("campaign_id", campaignIds)
      .eq("respondent.profile_completed", true);
    for (const m of matches || []) {
      matchedCounts.set(m.campaign_id, (matchedCounts.get(m.campaign_id) || 0) + 1);
    }
  }

  const ideasWithMatches = (ideas || []).map((idea) => ({
    ...idea,
    matched_responses: matchedCounts.get(idea.id) || 0,
  }));

  const ideaItems: IdeaItem[] = ideasWithMatches.map((idea) => {
    const audience = getAudienceLabel(idea);
    return {
      id: idea.id,
      title: idea.title,
      status: idea.status,
      reward_amount: Number(idea.reward_amount) || 0,
      reward_type: idea.reward_type,
      current_responses: idea.current_responses,
      target_responses: idea.target_responses,
      target_interests: idea.target_interests,
      target_expertise: idea.target_expertise,
      matched_responses: idea.matched_responses,
      audienceText: audience.text,
      audienceColor: audience.color,
    };
  });

  const hasIdeas = ideaItems.length > 0;

  return (
    <>
      <div className="bg-[#FAF9FA] rounded-2xl border border-[#E2E8F0] p-[24px_32px] max-md:p-[20px] mb-[24px] relative overflow-hidden">
        <div className="absolute top-0 left-[15%] right-[15%] h-[2px] bg-gradient-to-r from-transparent via-[#E8C1B0]/25 to-transparent" />
        <div className="flex items-center justify-between max-md:flex-col max-md:items-start max-md:gap-[16px]">
          <div>
            <h1 className="text-[24px] font-bold tracking-[-0.03em] text-[#111111]">My Ideas</h1>
            <p className="text-[14px] text-[#64748B] mt-[4px]">Track validation progress and audience quality</p>
          </div>
          <Button variant="primary" href="/dashboard/ideas/new">
            New Idea
          </Button>
        </div>
      </div>

      {hasIdeas ? (
        <IdeasList ideas={ideaItems} />
      ) : (
        <div className="bg-[#FAF9FA] border border-[#E2E8F0] rounded-2xl p-[48px] text-center relative overflow-hidden">
          <div className="absolute top-0 left-[10%] right-[10%] h-[2px] bg-gradient-to-r from-transparent via-[#E8C1B0]/20 to-transparent" />
          <div className="w-[56px] h-[56px] rounded-2xl bg-gradient-to-br from-[#E8C1B0]/10 to-[#E5654E]/5 flex items-center justify-center mx-auto mb-[16px]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E5654E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18h6" /><path d="M10 22h4" /><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
            </svg>
          </div>
          <h2 className="text-[20px] font-bold text-[#111111] mb-[8px]">
            No ideas <span className="italic font-normal text-gradient-warm">yet</span>
          </h2>
          <p className="text-[14px] text-[#64748B] max-w-[360px] mx-auto mb-[28px]">
            Every great company started as an unproven idea. Yours deserves real feedback.
          </p>
          <Button variant="primary" href="/dashboard/ideas/new">
            Create Idea
          </Button>
        </div>
      )}
    </>
  );
}
