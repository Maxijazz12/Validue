import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import ResponseCard from "@/components/dashboard/responses/ResponseCard";
import RankButton from "@/components/dashboard/responses/RankButton";
import PayoutAllocator from "@/components/dashboard/responses/PayoutAllocator";
import { safeNumber } from "@/lib/defaults";

export default async function CampaignResponsesPage({
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

  // Fetch campaign (creator only)
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, title, description, status, current_responses, target_responses, ranking_status, creator_id, reward_amount, distributable_amount, payout_status")
    .eq("id", id)
    .eq("creator_id", user.id)
    .single();

  if (!campaign) notFound();

  // Fetch questions
  const { data: questions } = await supabase
    .from("questions")
    .select("id, text, type, sort_order")
    .eq("campaign_id", id)
    .order("sort_order", { ascending: true });

  const questionMap = new Map(
    (questions || []).map((q) => [q.id, q])
  );

  // Fetch responses with respondent profiles
  const { data: responses } = await supabase
    .from("responses")
    .select("id, status, quality_score, ai_feedback, created_at, ranked_at, respondent:profiles!respondent_id(full_name, avatar_url, reputation_tier)")
    .eq("campaign_id", id)
    .in("status", ["submitted", "ranked"])
    .order("quality_score", { ascending: false, nullsFirst: false });

  // Fetch answers for all responses
  const responseIds = (responses || []).map((r) => r.id);
  const { data: allAnswers } = responseIds.length > 0
    ? await supabase
        .from("answers")
        .select("response_id, question_id, text, metadata")
        .in("response_id", responseIds)
    : { data: [] };

  // Group answers by response
  const answersByResponse = new Map<string, typeof allAnswers>();
  for (const answer of allAnswers || []) {
    const existing = answersByResponse.get(answer.response_id) || [];
    existing.push(answer);
    answersByResponse.set(answer.response_id, existing);
  }

  // Compute stats
  const totalResponses = responses?.length || 0;
  const rankedResponses = (responses || []).filter((r) => r.status === "ranked");
  const unrankedCount = totalResponses - rankedResponses.length;
  const avgScore =
    rankedResponses.length > 0
      ? Math.round(
          rankedResponses.reduce((s, r) => s + (Number(r.quality_score) || 0), 0) /
            rankedResponses.length
        )
      : 0;
  const topScore =
    rankedResponses.length > 0
      ? Math.max(...rankedResponses.map((r) => Number(r.quality_score) || 0))
      : 0;

  const progress =
    campaign.target_responses > 0
      ? Math.min((campaign.current_responses / campaign.target_responses) * 100, 100)
      : 0;

  return (
    <>
      {/* Header */}
      <div className="mb-[24px]">
        <Link
          href={`/dashboard/ideas/${id}`}
          className="inline-flex items-center gap-[6px] text-[13px] text-[#94A3B8] hover:text-[#64748B] transition-colors no-underline mb-[16px]"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Idea
        </Link>

        <div className="bg-[#FAF9FA] rounded-2xl border border-[#E2E8F0] p-[24px_32px] max-md:p-[20px] relative overflow-hidden">
          <div className="absolute top-0 left-[15%] right-[15%] h-[2px] bg-gradient-to-r from-transparent via-[#E8C1B0]/25 to-transparent" />
          <h1 className="text-[24px] font-bold tracking-[-0.5px] text-[#222222]">Responses</h1>
          <p className="text-[14px] text-[#64748B] mt-[4px]">{campaign.title}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-[12px] mb-[24px] max-md:grid-cols-2">
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-[16px] hover:border-[#CBD5E1] transition-all duration-200 relative overflow-hidden">
          <div className="absolute top-0 left-[20%] right-[20%] h-[1px] bg-gradient-to-r from-transparent via-[#E8C1B0]/20 to-transparent" />
          <span className="text-[11px] text-[#94A3B8] uppercase tracking-[1px] font-semibold">
            Total
          </span>
          <div className="mt-[4px]">
            <span className="font-mono text-[22px] font-bold text-[#111111]">
              {totalResponses}
            </span>
            <span className="text-[13px] text-[#94A3B8]">
              /{campaign.target_responses}
            </span>
          </div>
          <div className="h-[4px] rounded-full bg-[#F3F4F6] overflow-hidden mt-[8px]">
            <div
              className="h-full rounded-full bg-[#34D399]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-[16px] hover:border-[#CBD5E1] transition-all duration-200 relative overflow-hidden">
          <div className="absolute top-0 left-[20%] right-[20%] h-[1px] bg-gradient-to-r from-transparent via-[#E8C1B0]/20 to-transparent" />
          <span className="text-[11px] text-[#94A3B8] uppercase tracking-[1px] font-semibold">
            Ranked
          </span>
          <div className="font-mono text-[22px] font-bold text-[#111111] mt-[4px]">
            {rankedResponses.length}
            <span className="text-[13px] text-[#94A3B8] font-normal">
              /{totalResponses}
            </span>
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-[16px] hover:border-[#CBD5E1] transition-all duration-200 relative overflow-hidden">
          <div className="absolute top-0 left-[20%] right-[20%] h-[1px] bg-gradient-to-r from-transparent via-[#E8C1B0]/20 to-transparent" />
          <span className="text-[11px] text-[#94A3B8] uppercase tracking-[1px] font-semibold">
            Avg Score
          </span>
          <div
            className="font-mono text-[22px] font-bold mt-[4px]"
            style={{
              color:
                avgScore >= 70
                  ? "#22c55e"
                  : avgScore >= 40
                    ? "#E5654E"
                    : avgScore > 0
                      ? "#ef4444"
                      : "#999999",
            }}
          >
            {avgScore > 0 ? avgScore : "—"}
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-[16px] hover:border-[#CBD5E1] transition-all duration-200 relative overflow-hidden">
          <div className="absolute top-0 left-[20%] right-[20%] h-[1px] bg-gradient-to-r from-transparent via-[#E8C1B0]/20 to-transparent" />
          <span className="text-[11px] text-[#94A3B8] uppercase tracking-[1px] font-semibold">
            Top Score
          </span>
          <div
            className="font-mono text-[22px] font-bold mt-[4px]"
            style={{
              color:
                topScore >= 70
                  ? "#22c55e"
                  : topScore >= 40
                    ? "#E5654E"
                    : topScore > 0
                      ? "#ef4444"
                      : "#999999",
            }}
          >
            {topScore > 0 ? topScore : "—"}
          </div>
        </div>
      </div>

      {/* Rank button */}
      {unrankedCount > 0 && (
        <div className="mb-[24px]">
          <RankButton
            campaignId={id}
            unrankedCount={unrankedCount}
            rankingStatus={campaign.ranking_status || "unranked"}
          />
        </div>
      )}

      {/* Payout allocator */}
      {rankedResponses.length > 0 && safeNumber(campaign.reward_amount) > 0 && (
        <div className="mb-[24px]">
          <PayoutAllocator
            campaignId={id}
            rewardAmount={safeNumber(campaign.reward_amount)}
            distributableAmount={safeNumber(campaign.distributable_amount, safeNumber(campaign.reward_amount) * 0.85)}
            payoutStatus={campaign.payout_status || "none"}
            rankedCount={rankedResponses.length}
          />
        </div>
      )}

      {/* Response list */}
      {totalResponses === 0 ? (
        <div className="bg-[#FAF9FA] border border-[#E2E8F0] rounded-2xl p-[48px] text-center relative overflow-hidden">
          <div className="absolute top-0 left-[10%] right-[10%] h-[2px] bg-gradient-to-r from-transparent via-[#E8C1B0]/20 to-transparent" />
          <div className="w-[56px] h-[56px] rounded-2xl bg-gradient-to-br from-[#E8C1B0]/10 to-[#E5654E]/5 flex items-center justify-center mx-auto mb-[16px]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E5654E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
          </div>
          <h2 className="text-[20px] font-bold text-[#111111] mb-[8px]">
            No responses <span className="italic font-normal text-gradient-warm">yet</span>
          </h2>
          <p className="text-[14px] text-[#64748B] max-w-[360px] mx-auto">
            Your campaign is live. Great responses are on their way.
          </p>
        </div>
      ) : (
        <>
        <div className="flex items-center justify-between mb-[12px]">
          <h2 className="text-[14px] font-semibold text-[#111111]">All Responses</h2>
          <span className="text-[12px] text-[#94A3B8]">Sorted by quality score</span>
        </div>
        <div className="flex flex-col gap-[12px]">
          {(responses || []).map((response, index) => {
            const respondentRaw = response.respondent as unknown;
            const respondent = (
              Array.isArray(respondentRaw) ? respondentRaw[0] : respondentRaw
            ) as { full_name: string; avatar_url: string | null; reputation_tier: string | null } | null;

            const responseAnswers = answersByResponse.get(response.id) || [];

            // Sort answers by question sort_order
            const sortedAnswers = [...responseAnswers].sort((a, b) => {
              const qa = questionMap.get(a.question_id);
              const qb = questionMap.get(b.question_id);
              return (qa?.sort_order ?? 0) - (qb?.sort_order ?? 0);
            });

            const formattedAnswers = sortedAnswers.map((a) => {
              const q = questionMap.get(a.question_id);
              const meta = (a.metadata as Record<string, unknown>) || {};
              return {
                questionText: q?.text || "Unknown question",
                questionType: q?.type || "open",
                answerText: a.text || "",
                charCount: (meta.charCount as number) || 0,
                timeSpentMs: (meta.timeSpentMs as number) || 0,
              };
            });

            return (
              <ResponseCard
                key={response.id}
                rank={index + 1}
                respondentName={respondent?.full_name || "Anonymous"}
                respondentAvatar={respondent?.avatar_url || null}
                respondentTier={(respondent?.reputation_tier || "new") as "new" | "bronze" | "silver" | "gold" | "platinum"}
                qualityScore={
                  response.quality_score !== null
                    ? Number(response.quality_score)
                    : null
                }
                aiFeedback={response.ai_feedback}
                status={response.status}
                submittedAt={response.created_at}
                answers={formattedAnswers}
                isTop={index < 3 && response.status === "ranked"}
              />
            );
          })}
        </div>
        </>
      )}
    </>
  );
}
