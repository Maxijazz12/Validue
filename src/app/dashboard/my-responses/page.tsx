import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import ReputationBadge from "@/components/ui/ReputationBadge";
import type { ReputationTier } from "@/lib/reputation-config";

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  in_progress: { label: "In Progress", bg: "bg-[#e8b87a]/10", text: "text-[#c4883a]" },
  submitted: { label: "Submitted", bg: "bg-[#3b82f6]/10", text: "text-[#3b82f6]" },
  ranked: { label: "Ranked", bg: "bg-[#22c55e]/10", text: "text-[#22c55e]" },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

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
    .select("id, status, quality_score, payout_amount, created_at, campaign:campaigns!campaign_id(id, title, category, reward_amount, reward_type)")
    .eq("respondent_id", user.id)
    .order("created_at", { ascending: false });

  const hasResponses = (responses || []).length > 0;

  return (
    <>
      <div className="mb-[32px]">
        <h1 className="text-[28px] font-bold text-[#111111] tracking-[-0.5px]">
          My Responses
        </h1>
        <p className="text-[15px] text-[#555555] mt-[4px]">
          Track your submitted responses
        </p>
      </div>

      {/* Reputation stats */}
      {totalCompleted > 0 && (
        <div className="grid grid-cols-4 gap-[12px] mb-[24px] max-md:grid-cols-2">
          <div className="bg-white border border-[#ebebeb] rounded-xl p-[16px]">
            <span className="text-[11px] text-[#999999] uppercase tracking-[1px]">
              Reputation
            </span>
            <div className="flex items-center gap-[8px] mt-[4px]">
              <span className="font-mono text-[22px] font-bold text-[#111111]">
                {repScore}
              </span>
              <ReputationBadge tier={repTier} size="md" />
            </div>
          </div>

          <div className="bg-white border border-[#ebebeb] rounded-xl p-[16px]">
            <span className="text-[11px] text-[#999999] uppercase tracking-[1px]">
              Avg Quality
            </span>
            <div
              className="font-mono text-[22px] font-bold mt-[4px]"
              style={{
                color: avgQuality >= 70 ? "#65a30d" : avgQuality >= 40 ? "#e8b87a" : "#ef4444",
              }}
            >
              {avgQuality}
            </div>
          </div>

          <div className="bg-white border border-[#ebebeb] rounded-xl p-[16px]">
            <span className="text-[11px] text-[#999999] uppercase tracking-[1px]">
              Completed
            </span>
            <div className="font-mono text-[22px] font-bold text-[#111111] mt-[4px]">
              {totalCompleted}
            </div>
          </div>

          <div className="bg-white border border-[#ebebeb] rounded-xl p-[16px]">
            <span className="text-[11px] text-[#999999] uppercase tracking-[1px]">
              Earned
            </span>
            <div className="font-mono text-[22px] font-bold text-[#65a30d] mt-[4px]">
              ${totalEarned.toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {hasResponses ? (
        <div className="flex flex-col gap-[12px]">
          {(responses || []).map((response) => {
            const campaignRaw = response.campaign as unknown;
            const campaign = (
              Array.isArray(campaignRaw) ? campaignRaw[0] : campaignRaw
            ) as {
              id: string;
              title: string;
              category: string | null;
              reward_amount: number;
              reward_type: string | null;
            } | null;

            const config = statusConfig[response.status] || statusConfig.submitted;
            const hasScore =
              response.status === "ranked" && response.quality_score !== null;
            const score = Number(response.quality_score) || 0;
            const isInProgress = response.status === "in_progress";

            return (
              <div
                key={response.id}
                className="bg-white border border-[#ebebeb] rounded-xl p-[20px]"
              >
                <div className="flex items-center justify-between gap-[12px] mb-[8px] max-md:flex-col max-md:items-start max-md:gap-[8px]">
                  <div className="min-w-0">
                    <span className="text-[15px] font-semibold text-[#111111] block truncate">
                      {campaign?.title || "Unknown Campaign"}
                    </span>
                    {campaign?.category && (
                      <span className="text-[11px] text-[#999999] uppercase tracking-[0.5px]">
                        {campaign.category}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-[8px] shrink-0">
                    {hasScore && (
                      <span
                        className="text-[13px] font-mono font-bold"
                        style={{
                          color:
                            score >= 70
                              ? "#65a30d"
                              : score >= 40
                                ? "#e8b87a"
                                : "#ef4444",
                        }}
                      >
                        {score}/100
                      </span>
                    )}
                    <span
                      className={`px-[10px] py-[4px] rounded-full text-[11px] font-semibold uppercase tracking-[0.5px] ${config.bg} ${config.text}`}
                    >
                      {config.label}
                    </span>
                  </div>
                </div>

                {/* Payout info */}
                {response.payout_amount != null && Number(response.payout_amount) > 0 && (
                  <div className="flex items-center gap-[6px] mb-[8px] p-[10px] rounded-lg bg-[#65a30d]/5">
                    <span className="text-[12px] text-[#65a30d] font-semibold">
                      You earned
                    </span>
                    <span className="font-mono text-[14px] font-bold text-[#65a30d]">
                      ${Number(response.payout_amount).toFixed(2)}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-[#999999]">
                    {isInProgress ? "Started" : "Submitted"}{" "}
                    {formatDate(response.created_at)}
                  </span>

                  {isInProgress && campaign && (
                    <Link
                      href={`/dashboard/the-wall/${campaign.id}`}
                      className="text-[13px] font-medium text-[#111111] underline hover:text-[#555555] transition-colors"
                    >
                      Resume
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border border-[#ebebeb] rounded-2xl p-[48px] text-center">
          <div className="text-[40px] mb-[16px]">&#x2705;</div>
          <h2 className="text-[20px] font-bold text-[#111111] mb-[8px]">
            No responses yet
          </h2>
          <p className="text-[14px] text-[#555555] max-w-[360px] mx-auto mb-[28px]">
            Head to The Wall to find ideas you can help validate and start
            earning.
          </p>
          <Link
            href="/dashboard/the-wall"
            className="inline-flex items-center justify-center px-[32px] py-[14px] rounded-lg text-[15px] font-medium bg-[#111111] text-white hover:bg-[#222222] transition-all no-underline"
          >
            Browse The Wall
          </Link>
        </div>
      )}
    </>
  );
}
