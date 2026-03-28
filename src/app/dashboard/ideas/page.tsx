import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import Button from "@/components/ui/Button";

const statusColors: Record<string, string> = {
  draft: "bg-[#F1F5F9] text-[#94A3B8]",
  pending_funding: "bg-[#E5654E]/10 text-[#E5654E]",
  active: "bg-[#22c55e]/10 text-[#22c55e]",
  completed: "bg-[#3b82f6]/10 text-[#3b82f6]",
  paused: "bg-[#E5654E]/10 text-[#E5654E]",
};

function getRewardLabel(amount: number, type: string | null): string {
  switch (type) {
    case "fixed": return `$${amount} per response`;
    case "pool": return `$${amount} reward pool`;
    case "top_only": return `$${amount} for top answers`;
    default: return `$${amount} reward`;
  }
}

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
    .select("*")
    .eq("creator_id", user!.id)
    .order("created_at", { ascending: false });

  // Count matched responses per campaign (respondents with profile_completed)
  const ideasWithMatches = await Promise.all(
    (ideas || []).map(async (idea) => {
      const { count: matchedCount } = await supabase
        .from("responses")
        .select("*, respondent:profiles!respondent_id(profile_completed)", { count: "exact", head: true })
        .eq("campaign_id", idea.id)
        .eq("respondent.profile_completed", true);

      return {
        ...idea,
        matched_responses: matchedCount || 0,
      };
    })
  );

  const hasIdeas = ideasWithMatches.length > 0;

  return (
    <>
      <div className="bg-[#FAF9FA] rounded-2xl border border-[#E2E8F0] p-[24px_32px] max-md:p-[20px] mb-[24px] relative overflow-hidden">
        <div className="absolute top-0 left-[15%] right-[15%] h-[2px] bg-gradient-to-r from-transparent via-[#E8C1B0]/25 to-transparent" />
        <div className="flex items-center justify-between max-md:flex-col max-md:items-start max-md:gap-[16px]">
          <div>
            <h1 className="text-[24px] font-bold tracking-[-0.5px] text-[#222222]">My Ideas</h1>
            <p className="text-[14px] text-[#64748B] mt-[4px]">Track validation progress and audience quality</p>
          </div>
          <Button variant="primary" href="/dashboard/ideas/new">
            New Idea
          </Button>
        </div>
      </div>

      {hasIdeas ? (
        <div className="flex flex-col gap-[12px]">
          {ideasWithMatches.map((idea) => {
            const progress =
              idea.target_responses > 0
                ? Math.min((idea.current_responses / idea.target_responses) * 100, 100)
                : 0;
            const hasReward = Number(idea.reward_amount) > 0;
            const audience = getAudienceLabel(idea);
            const targetTags = [
              ...(idea.target_interests || []),
              ...(idea.target_expertise || []),
            ].slice(0, 4);

            return (
              <Link
                key={idea.id}
                href={`/dashboard/ideas/${idea.id}`}
                className="block bg-white border border-[#E2E8F0] rounded-2xl p-[20px] hover:border-[#CBD5E1] hover:shadow-[0_4px_12px_rgba(0,0,0,0.04),0_1px_3px_rgba(232,193,176,0.06)] transition-all duration-200 no-underline"
              >
                {/* Top row: title + status */}
                <div className="flex items-center justify-between gap-[12px] mb-[12px] max-md:flex-col max-md:items-start max-md:gap-[8px]">
                  <div className="text-[15px] font-semibold text-[#111111]">
                    {idea.title}
                  </div>
                  <div className="flex items-center gap-[8px] shrink-0">
                    {hasReward && (
                      <span className="text-[12px] font-mono font-medium text-[#111111]">
                        {getRewardLabel(Number(idea.reward_amount), idea.reward_type)}
                      </span>
                    )}
                    <span
                      className={`px-[10px] py-[4px] rounded-full text-[11px] font-semibold uppercase tracking-[0.5px] ${
                        statusColors[idea.status] || statusColors.draft
                      }`}
                    >
                      {idea.status === "pending_funding" ? "Pending Funding" : idea.status}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-[12px]">
                  <div className="h-[4px] rounded-full bg-[#F3F4F6] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#34D399] transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-[6px]">
                    <span className="text-[12px] text-[#94A3B8]">
                      <span className="font-mono font-semibold text-[#111111]">
                        {idea.current_responses}
                      </span>
                      /{idea.target_responses} responses
                    </span>
                    {idea.status === "active" && idea.current_responses > 0 && (
                      <span className="text-[11px] text-[#22c55e] font-medium">
                        Collecting
                      </span>
                    )}
                  </div>
                </div>

                {/* Audience quality + targeting tags */}
                <div className="flex items-center justify-between gap-[12px] max-md:flex-col max-md:items-start max-md:gap-[8px]">
                  <div className="flex items-center gap-[8px] min-w-0">
                    <span className={`text-[12px] font-semibold ${audience.color}`}>
                      {audience.text}
                    </span>
                    {idea.matched_responses > 0 && idea.current_responses > 0 && (
                      <span className="text-[11px] text-[#94A3B8]">
                        {idea.matched_responses}/{idea.current_responses} from matched profiles
                      </span>
                    )}
                  </div>
                  {targetTags.length > 0 && (
                    <div className="flex items-center gap-[4px] shrink-0 flex-wrap">
                      <span className="text-[11px] text-[#94A3B8]">Targeting:</span>
                      {targetTags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] px-[6px] py-[2px] rounded-full bg-[#F3F4F6] text-[#64748B]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
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
