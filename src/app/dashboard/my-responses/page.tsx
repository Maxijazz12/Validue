import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ReputationBadge from "@/components/ui/ReputationBadge";
import StatCard from "@/components/dashboard/StatCard";
import MyResponsesFeed, { type ResponseItem } from "@/components/dashboard/MyResponsesFeed";
import type { ReputationTier } from "@/lib/reputation-config";

export default async function MyResponsesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Fetch reputation stats
  const { data: profile } = await supabase
    .from("profiles")
    .select("reputation_score, reputation_tier, total_responses_completed, average_quality_score, total_earned")
    .eq("id", user.id)
    .single();

  const repScore = Number(profile?.reputation_score) || 0;
  const repTier = (profile?.reputation_tier || "new") as ReputationTier;
  const totalCompleted = profile?.total_responses_completed || 0;
  const avgQuality = Number(profile?.average_quality_score) || 0;
  const totalEarned = Number(profile?.total_earned) || 0;

  // Fetch responses with campaign info
  const { data: responses } = await supabase
    .from("responses")
    .select("id, status, quality_score, payout_amount, ai_feedback, created_at, campaign:campaigns!campaign_id(id, title, category, reward_amount, reward_type)")
    .eq("respondent_id", user.id)
    .order("created_at", { ascending: false });

  // Normalize response data for client component
  const items: ResponseItem[] = (responses || []).map((response) => {
    const campaignRaw = response.campaign as unknown;
    const campaign = (
      Array.isArray(campaignRaw) ? campaignRaw[0] : campaignRaw
    ) as ResponseItem["campaign"];

    return {
      id: response.id,
      status: response.status,
      quality_score: response.quality_score,
      payout_amount: response.payout_amount,
      ai_feedback: response.ai_feedback,
      created_at: response.created_at,
      campaign,
    };
  });

  return (
    <>
      <div className="bg-[#FAF9FA] rounded-2xl border border-[#E2E8F0] p-[24px_32px] max-md:p-[20px] mb-[24px] relative overflow-hidden">
        <div className="absolute top-0 left-[15%] right-[15%] h-[2px] bg-gradient-to-r from-transparent via-[#E8C1B0]/25 to-transparent" />
        <h1 className="text-[24px] font-bold tracking-[-0.5px] text-[#222222]">My Responses</h1>
        <p className="text-[14px] text-[#64748B] mt-[4px]">Track your submitted responses</p>
      </div>

      {/* Reputation stats */}
      {totalCompleted > 0 && (
        <div className="grid grid-cols-4 gap-[12px] mb-[24px] max-md:grid-cols-2">
          <StatCard label="Reputation" value={repScore}>
            <div className="mt-[4px]">
              <ReputationBadge tier={repTier} size="md" />
            </div>
          </StatCard>
          <StatCard label="Avg Quality" value={avgQuality} valueColor={avgQuality >= 70 ? "#22c55e" : avgQuality >= 40 ? "#E5654E" : "#ef4444"} />
          <StatCard label="Completed" value={totalCompleted} />
          <StatCard label="Earned" value={`$${totalEarned.toFixed(2)}`} valueColor="#22c55e" />
        </div>
      )}

      <MyResponsesFeed responses={items} />
    </>
  );
}
