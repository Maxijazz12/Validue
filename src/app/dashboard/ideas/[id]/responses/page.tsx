import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import RankButton from "@/components/dashboard/responses/RankButton";
import ResponseSection from "@/components/dashboard/responses/ResponseSection";
import ExportResponsesButton from "@/components/dashboard/responses/ExportResponsesButton";
import type { ResponseItem } from "@/components/dashboard/responses/ResponseList";
import { safeNumber } from "@/lib/defaults";
import { getSubscription } from "@/lib/plan-guard";
import { PLAN_CONFIG, PLATFORM_FEE_RATE } from "@/lib/plans";

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

  // Fetch subscription, campaign, questions, and responses in parallel
  const [sub, { data: campaign }, { data: questions }, { data: responses }] =
    await Promise.all([
      getSubscription(user.id),
      supabase
        .from("campaigns")
        .select("id, title, description, status, current_responses, target_responses, ranking_status, creator_id, reward_amount, distributable_amount, payout_status")
        .eq("id", id)
        .eq("creator_id", user.id)
        .single(),
      supabase
        .from("questions")
        .select("id, text, type, sort_order")
        .eq("campaign_id", id)
        .order("sort_order", { ascending: true }),
      supabase
        .from("responses")
        .select("id, status, quality_score, ai_feedback, scoring_source, scoring_confidence, scoring_dimensions, created_at, ranked_at, respondent:profiles!respondent_id(full_name, avatar_url, reputation_tier)")
        .eq("campaign_id", id)
        .in("status", ["submitted", "ranked"])
        .order("quality_score", { ascending: false, nullsFirst: false }),
    ]);

  const hasExport = !!PLAN_CONFIG[sub.tier].hasExport;
  if (!campaign) notFound();
  const currentResponses = campaign.current_responses ?? 0;
  const targetResponses = campaign.target_responses ?? 0;

  const questionMap = new Map(
    (questions || []).map((q) => [q.id, q])
  );

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
    targetResponses > 0
      ? Math.min((currentResponses / targetResponses) * 100, 100)
      : 0;

  // Build response items for client components
  const responseItems: ResponseItem[] = (responses || []).map((response, index) => {
    const respondentRaw = response.respondent as unknown;
    const respondent = (
      Array.isArray(respondentRaw) ? respondentRaw[0] : respondentRaw
    ) as { full_name: string; avatar_url: string | null; reputation_tier: string | null } | null;

    const responseAnswers = answersByResponse.get(response.id) || [];

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

    const dimensions = response.scoring_dimensions as {
      depth: number;
      relevance: number;
      authenticity: number;
      consistency: number;
    } | null;

    return {
      responseId: response.id,
      rank: index + 1,
      respondentName: respondent?.full_name || "Anonymous",
      respondentAvatar: respondent?.avatar_url || null,
      respondentTier: (respondent?.reputation_tier || "new") as "new" | "bronze" | "silver" | "gold" | "platinum",
      qualityScore:
        response.quality_score !== null
          ? Number(response.quality_score)
          : null,
      aiFeedback: response.ai_feedback,
      status: response.status,
      submittedAt:
        response.created_at ??
        response.ranked_at ??
        new Date(0).toISOString(),
      answers: formattedAnswers,
      isTop: index < 3 && response.status === "ranked",
      scoringSource: response.scoring_source ?? undefined,
      scoringConfidence: response.scoring_confidence
        ? Number(response.scoring_confidence)
        : undefined,
      dimensions,
    };
  });

  return (
    <>
      {/* Header */}
      <div className="mb-[24px]">
        <Link
          href={`/dashboard/ideas/${id}`}
          className="inline-flex items-center gap-[6px] text-[13px] text-text-muted hover:text-text-secondary transition-colors no-underline mb-[16px]"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Idea
        </Link>

        <div className="flex items-center justify-between gap-[12px] max-md:flex-col max-md:items-start max-md:gap-[8px]">
          <div>
            <h1 className="text-[24px] font-medium tracking-tight text-text-primary">Responses</h1>
            <p className="text-[14px] text-text-secondary mt-[4px]">{campaign.title}</p>
          </div>
          {totalResponses > 0 && (
            <ExportResponsesButton campaignId={id} hasExport={hasExport} />
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-[12px] mb-[24px] max-md:grid-cols-2">
        <div className="bg-white border border-border-light rounded-[20px] md:rounded-[28px] p-[20px] shadow-card hover:shadow-card-hover hover:-translate-y-[1px] transition-all duration-400 relative overflow-hidden">
          <div className="absolute top-0 left-[20%] right-[20%] h-[1px] bg-gradient-to-r from-transparent via-accent-warm-muted/20 to-transparent" />
          <span className="text-[11px] text-text-muted uppercase tracking-[1px] font-semibold">
            Total
          </span>
          <div className="mt-[4px]">
            <span className="font-mono text-[22px] font-bold text-text-primary">
              {totalResponses}
            </span>
            <span className="text-[13px] text-text-muted">
              /{targetResponses}
            </span>
          </div>
          <div className="h-[3px] rounded-full bg-bg-muted overflow-hidden mt-[8px]">
            <div
              className="h-full rounded-full bg-success-mid"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="bg-white border border-border-light rounded-[20px] md:rounded-[28px] p-[20px] shadow-card hover:shadow-card-hover hover:-translate-y-[1px] transition-all duration-400 relative overflow-hidden">
          <div className="absolute top-0 left-[20%] right-[20%] h-[1px] bg-gradient-to-r from-transparent via-accent-warm-muted/20 to-transparent" />
          <span className="text-[11px] text-text-muted uppercase tracking-[1px] font-semibold">
            Ranked
          </span>
          <div className="font-mono text-[22px] font-bold text-text-primary mt-[4px]">
            {rankedResponses.length}
            <span className="text-[13px] text-text-muted font-normal">
              /{totalResponses}
            </span>
          </div>
        </div>

        <div className="bg-white border border-border-light rounded-[20px] md:rounded-[28px] p-[20px] shadow-card hover:shadow-card-hover hover:-translate-y-[1px] transition-all duration-400 relative overflow-hidden">
          <div className="absolute top-0 left-[20%] right-[20%] h-[1px] bg-gradient-to-r from-transparent via-accent-warm-muted/20 to-transparent" />
          <span className="text-[11px] text-text-muted uppercase tracking-[1px] font-semibold">
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
            {avgScore > 0 ? avgScore : "\u2014"}
          </div>
        </div>

        <div className="bg-white border border-border-light rounded-[20px] md:rounded-[28px] p-[20px] shadow-card hover:shadow-card-hover hover:-translate-y-[1px] transition-all duration-400 relative overflow-hidden">
          <div className="absolute top-0 left-[20%] right-[20%] h-[1px] bg-gradient-to-r from-transparent via-accent-warm-muted/20 to-transparent" />
          <span className="text-[11px] text-text-muted uppercase tracking-[1px] font-semibold">
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
            {topScore > 0 ? topScore : "\u2014"}
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

      {/* Response section: allocator + filterable response list */}
      <ResponseSection
        campaignId={id}
        rewardAmount={safeNumber(campaign.reward_amount)}
        distributableAmount={safeNumber(campaign.distributable_amount, safeNumber(campaign.reward_amount) * (1 - PLATFORM_FEE_RATE))}
        payoutStatus={campaign.payout_status || "none"}
        rankedCount={rankedResponses.length}
        showAllocator={rankedResponses.length > 0 && safeNumber(campaign.reward_amount) > 0}
        responses={responseItems}
      />
    </>
  );
}
