import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import ResponseCard from "@/components/dashboard/responses/ResponseCard";
import RankButton from "@/components/dashboard/responses/RankButton";
import PayoutAllocator from "@/components/dashboard/responses/PayoutAllocator";

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
          className="inline-flex items-center gap-[6px] text-[13px] text-[#999999] hover:text-[#555555] transition-colors no-underline mb-[16px]"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Idea
        </Link>

        <h1 className="text-[28px] font-bold text-[#111111] tracking-[-0.5px]">
          Responses
        </h1>
        <p className="text-[15px] text-[#555555] mt-[4px]">
          {campaign.title}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-[12px] mb-[24px] max-md:grid-cols-2">
        <div className="bg-white border border-[#ebebeb] rounded-xl p-[16px]">
          <span className="text-[11px] text-[#999999] uppercase tracking-[1px]">
            Total
          </span>
          <div className="mt-[4px]">
            <span className="font-mono text-[22px] font-bold text-[#111111]">
              {totalResponses}
            </span>
            <span className="text-[13px] text-[#999999]">
              /{campaign.target_responses}
            </span>
          </div>
          <div className="h-[4px] rounded-full bg-[#f5f2ed] overflow-hidden mt-[8px]">
            <div
              className="h-full rounded-full bg-[#65a30d]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="bg-white border border-[#ebebeb] rounded-xl p-[16px]">
          <span className="text-[11px] text-[#999999] uppercase tracking-[1px]">
            Ranked
          </span>
          <div className="font-mono text-[22px] font-bold text-[#111111] mt-[4px]">
            {rankedResponses.length}
            <span className="text-[13px] text-[#999999] font-normal">
              /{totalResponses}
            </span>
          </div>
        </div>

        <div className="bg-white border border-[#ebebeb] rounded-xl p-[16px]">
          <span className="text-[11px] text-[#999999] uppercase tracking-[1px]">
            Avg Score
          </span>
          <div
            className="font-mono text-[22px] font-bold mt-[4px]"
            style={{
              color:
                avgScore >= 70
                  ? "#65a30d"
                  : avgScore >= 40
                    ? "#e8b87a"
                    : avgScore > 0
                      ? "#ef4444"
                      : "#999999",
            }}
          >
            {avgScore > 0 ? avgScore : "—"}
          </div>
        </div>

        <div className="bg-white border border-[#ebebeb] rounded-xl p-[16px]">
          <span className="text-[11px] text-[#999999] uppercase tracking-[1px]">
            Top Score
          </span>
          <div
            className="font-mono text-[22px] font-bold mt-[4px]"
            style={{
              color:
                topScore >= 70
                  ? "#65a30d"
                  : topScore >= 40
                    ? "#e8b87a"
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
      {rankedResponses.length > 0 && Number(campaign.reward_amount) > 0 && (
        <div className="mb-[24px]">
          <PayoutAllocator
            campaignId={id}
            rewardAmount={Number(campaign.reward_amount)}
            distributableAmount={Number(campaign.distributable_amount) || Number(campaign.reward_amount) * 0.85}
            payoutStatus={campaign.payout_status || "none"}
            rankedCount={rankedResponses.length}
          />
        </div>
      )}

      {/* Response list */}
      {totalResponses === 0 ? (
        <div className="bg-white border border-[#ebebeb] rounded-2xl p-[48px] text-center">
          <div className="text-[40px] mb-[16px]">&#x1f4ac;</div>
          <h2 className="text-[20px] font-bold text-[#111111] mb-[8px]">
            No responses yet
          </h2>
          <p className="text-[14px] text-[#555555] max-w-[360px] mx-auto">
            Responses will appear here once respondents start answering your
            campaign.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-[8px]">
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
      )}
    </>
  );
}
