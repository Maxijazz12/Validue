import { createClient } from "@/lib/supabase/server";
import sql from "@/lib/db";
import Button from "@/components/ui/Button";
import IdeasList, { type IdeaItem } from "@/components/dashboard/IdeasList";

function getAudienceLabel(idea: {
  target_interests: string[] | null;
  target_expertise: string[] | null;
  matched_responses: number;
  current_responses: number | null;
}): { text: string; color: string } {
  const hasTargeting =
    (idea.target_interests && idea.target_interests.length > 0) ||
    (idea.target_expertise && idea.target_expertise.length > 0);

  if (!hasTargeting) {
    return { text: "Open audience", color: "text-text-muted" };
  }

  const total = idea.current_responses ?? 0;
  if (total === 0) {
    return { text: "Awaiting responses", color: "text-text-muted" };
  }

  const ratio = total > 0 ? idea.matched_responses / total : 0;
  if (ratio >= 0.6) {
    return { text: "Strong audience match", color: "text-success" };
  }
  return { text: "Building audience", color: "text-brand" };
}

export default async function IdeasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: ideas } = await supabase
    .from("campaigns")
    .select("id, title, description, status, reward_amount, reward_type, current_responses, target_responses, target_interests, target_expertise, created_at")
    .eq("creator_id", user!.id)
    .order("created_at", { ascending: false });

  // Batch count matched (profile_completed) responses per campaign via GROUP BY
  const campaignIds = (ideas || []).map((i) => i.id);
  const matchedCounts = new Map<string, number>();
  if (campaignIds.length > 0) {
    const rows = await sql`
      SELECT r.campaign_id, COUNT(*)::int AS count
      FROM responses r
      JOIN profiles p ON p.id = r.respondent_id
      WHERE r.campaign_id = ANY(${campaignIds}::uuid[])
        AND p.profile_completed = true
      GROUP BY r.campaign_id
    `;
    for (const row of rows) {
      matchedCounts.set(row.campaign_id as string, row.count as number);
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
      description: idea.description,
      status: idea.status,
      reward_amount: Number(idea.reward_amount) || 0,
      reward_type: idea.reward_type,
      current_responses: idea.current_responses ?? 0,
      target_responses: idea.target_responses ?? 0,
      target_interests: idea.target_interests,
      target_expertise: idea.target_expertise,
      matched_responses: idea.matched_responses,
      audienceText: audience.text,
      audienceColor: audience.color,
      created_at: idea.created_at,
    };
  });

  const hasIdeas = ideaItems.length > 0;

  return (
    <>
      <div className="flex items-center justify-between mb-[24px] max-md:flex-col max-md:items-start max-md:gap-[16px]">
        <div>
          <h1 className="text-[24px] font-medium tracking-tight text-text-primary">My Ideas</h1>
          <p className="text-[14px] text-text-secondary mt-[4px]">Track validation progress and audience quality</p>
        </div>
        <Button variant="primary" href="/dashboard/ideas/new">
          New Idea
        </Button>
      </div>

      {hasIdeas ? (
        <IdeasList ideas={ideaItems} />
      ) : (
        <div className="py-[120px] text-center border border-dashed border-border-light rounded-[32px] bg-white/90">
          <span className="font-mono text-[11px] font-medium tracking-wide text-text-muted uppercase mb-4 block">No Ideas Posted</span>
          <p className="text-[20px] font-medium tracking-tight text-text-primary mb-[4px]">
            Start validating
          </p>
          <p className="text-[14px] text-text-secondary mt-[4px] max-w-[360px] mx-auto mb-[28px]">
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
