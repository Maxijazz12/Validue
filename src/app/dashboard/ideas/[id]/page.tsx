import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import FundCampaignButton from "@/components/dashboard/FundCampaignButton";
import { CompleteCampaignButton, PauseCampaignButton, ResumeCampaignButton } from "@/components/dashboard/CampaignStatusButtons";
import CloneCampaignButton from "@/components/dashboard/CloneCampaignButton";
import CampaignAnalytics from "@/components/dashboard/CampaignAnalytics";
import { getCampaignStrength, getStrengthLabel, estimateFillSpeed, getQualityModifier } from "@/lib/reach";
import { getStrengthColors } from "@/lib/strength-colors";
import { getSubscription, isFirstMonth, isFirstCampaign } from "@/lib/plan-guard";
import { WELCOME_BONUS } from "@/lib/plans";

import sql from "@/lib/db";
import { completeCampaign } from "./campaign-actions";
import AssumptionSignal from "@/components/dashboard/AssumptionSignal";

/* ─── Helpers ─── */

const statusColors: Record<string, string> = {
  draft: "bg-[#F1F5F9] text-[#94A3B8]",
  pending_funding: "bg-[#E5654E]/10 text-[#E5654E]",
  active: "bg-[#22c55e]/10 text-[#22c55e]",
  completed: "bg-[#3b82f6]/10 text-[#3b82f6]",
  paused: "bg-[#E5654E]/10 text-[#E5654E]",
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function DimensionBar({ label, score, tooltip }: { label: string; score: number; tooltip?: string }) {
  let gradient: string;
  let color: string;
  if (score >= 70) { gradient = "linear-gradient(90deg, #22c55e, #16a34a)"; color = "#22c55e"; }
  else if (score >= 40) { gradient = "linear-gradient(90deg, #E5654E, #CC5340)"; color = "#E5654E"; }
  else { gradient = "linear-gradient(90deg, #ef4444, #dc2626)"; color = "#ef4444"; }

  return (
    <div className="flex items-center gap-[8px]">
      <span className="text-[13px] text-[#64748B] w-[120px] shrink-0" title={tooltip}>
        {label}
      </span>
      <div className="flex-1 h-[6px] rounded-full bg-[#F1F5F9] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${score}%`, background: gradient }}
        />
      </div>
      <span
        className="text-[12px] font-bold w-[28px] text-right"
        style={{ color }}
      >
        {score}
      </span>
    </div>
  );
}

/* ─── Page ─── */

export default async function CampaignDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ funded?: string }>;
}) {
  const { id } = await params;
  const { funded } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Fetch campaign (creator only)
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .eq("creator_id", user.id)
    .single();

  if (!campaign) redirect("/dashboard/ideas");

  // Check welcome credit eligibility for funding banner
  let hasWelcomeCredit = false;
  if (campaign.status === "pending_funding") {
    const sub = await getSubscription(user.id);
    if (sub.tier === "free") {
      const firstMonth = await isFirstMonth(user.id);
      if (firstMonth) {
        const firstCampaign = await isFirstCampaign(user.id);
        if (firstCampaign) {
          const [subRow] = await sql`SELECT welcome_credit_used FROM subscriptions WHERE user_id = ${user.id}`;
          hasWelcomeCredit = !subRow || !subRow.welcome_credit_used;
        }
      }
    }
  }

  // Auto-complete: if active and current_responses >= target_responses, complete the campaign
  if (
    campaign.status === "active" &&
    campaign.target_responses > 0 &&
    campaign.current_responses >= campaign.target_responses
  ) {
    await completeCampaign(campaign.id);
    // Re-fetch to get updated status
    const { data: refreshed } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", id)
      .eq("creator_id", user.id)
      .single();
    if (refreshed) Object.assign(campaign, refreshed);
  }

  // Fetch recent activity (last 5 responses with timestamps)
  const { data: recentResponses } = await supabase
    .from("responses")
    .select("id, status, quality_score, created_at, ranked_at")
    .eq("campaign_id", id)
    .order("created_at", { ascending: false })
    .limit(5);

  // Fetch questions
  const { data: questions } = await supabase
    .from("questions")
    .select("*")
    .eq("campaign_id", id)
    .order("sort_order", { ascending: true });

  // Per-assumption coverage (reuses evidence pipeline — includes audience match)
  const assumptions: string[] = campaign.key_assumptions || [];

  let assumptionCoverage: import("@/lib/ai/assumption-evidence").AssumptionCoverage[] = [];
  if (assumptions.length > 0 && campaign.current_responses > 0) {
    const { getEvidenceByAssumption, computeAllCoverage } = await import("@/lib/ai/assumption-evidence");
    const evidenceMap = await getEvidenceByAssumption(id);
    assumptionCoverage = computeAllCoverage(evidenceMap, assumptions.length);
  }

  const allQuestions = questions || [];
  const openQs = allQuestions.filter(
    (q) => !q.is_baseline && q.type === "open"
  );
  const baselineQs = allQuestions.filter((q) => q.is_baseline);
  // followups: open questions that aren't in the "open" bucket and aren't baseline
  const openIds = new Set(openQs.map((q) => q.id));
  const baselineIds = new Set(baselineQs.map((q) => q.id));
  const followupQs = allQuestions.filter(
    (q) => !openIds.has(q.id) && !baselineIds.has(q.id)
  );

  const progress =
    campaign.target_responses > 0
      ? Math.min(
          (campaign.current_responses / campaign.target_responses) * 100,
          100
        )
      : 0;

  const qualityScores = campaign.quality_scores as {
    audienceClarity?: number;
    questionQuality?: number;
    behavioralCoverage?: number;
    monetizationCoverage?: number;
    overall?: number;
  } | null;

  const targetingFields = [
    {
      label: "Interests",
      values: campaign.target_interests as string[] | null,
    },
    {
      label: "Expertise",
      values: campaign.target_expertise as string[] | null,
    },
    {
      label: "Age ranges",
      values: campaign.target_age_ranges as string[] | null,
    },
  ];

  const textFields = [
    { label: "Location", value: campaign.target_location },
    { label: "Occupation", value: campaign.audience_occupation },
    { label: "Industry", value: campaign.audience_industry },
    { label: "Experience level", value: campaign.audience_experience_level },
    { label: "Niche qualifier", value: campaign.audience_niche_qualifier },
  ];

  return (
    <>
      {/* ─── Header ─── */}
      <div className="mb-[32px]">
        <Link
          href="/dashboard/ideas"
          className="inline-flex items-center gap-[6px] text-[13px] text-[#94A3B8] hover:text-[#64748B] transition-colors no-underline mb-[16px]"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Ideas
        </Link>

        <div className="bg-[#FAF9FA] rounded-2xl border border-[#E2E8F0] p-[24px_32px] max-md:p-[20px] relative overflow-hidden">
          <div className="absolute top-0 left-[15%] right-[15%] h-[2px] bg-gradient-to-r from-transparent via-[#E8C1B0]/25 to-transparent" />
          <div className="flex items-center justify-between gap-[12px] max-md:flex-col max-md:items-start max-md:gap-[8px]">
            <h1 className="text-[24px] font-bold tracking-[-0.5px] text-[#222222]">{campaign.title}</h1>
            <div className="flex items-center gap-[8px] shrink-0">
              <CloneCampaignButton campaignId={campaign.id} />
              <span
                className={`px-[12px] py-[5px] rounded-full text-[12px] font-semibold uppercase tracking-[0.5px] ${
                  statusColors[campaign.status] || statusColors.draft
                }`}
              >
                {campaign.status === "pending_funding" ? "Pending Funding" : campaign.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Funding Banner ─── */}
      {funded === "true" && campaign.status === "active" && (
        <div className="mb-[16px] px-[16px] py-[12px] rounded-lg bg-[#22c55e]/10 border border-[#22c55e]/20 text-[13px] text-[#22c55e] font-medium">
          You&apos;re live! Your campaign is now visible to matched respondents.
        </div>
      )}

      {funded === "true" && campaign.status === "pending_funding" && (
        <div className="mb-[16px] px-[16px] py-[12px] rounded-lg bg-[#E5654E]/10 border border-[#E5654E]/20 text-[13px] text-[#CC5340] font-medium">
          Payment confirmed — your campaign is going live now. This page will refresh shortly.
        </div>
      )}

      {campaign.status === "pending_funding" && funded !== "true" && (() => {
        const rewardAmt = Number(campaign.reward_amount) || 0;
        const strength = campaign.campaign_strength;
        const respLow = campaign.estimated_responses_low;
        const respHigh = campaign.estimated_responses_high;
        const effectiveReach = campaign.effective_reach_units ?? campaign.total_reach_units;
        const fillSpeed = effectiveReach ? estimateFillSpeed(effectiveReach) : null;

        return (
          <div className="mb-[16px] bg-white border border-[#E5654E]/30 rounded-xl p-[20px] flex flex-col gap-[12px]">
            <div className="flex items-center justify-between gap-[16px] max-md:flex-col max-md:items-start">
              <div>
                <p className="text-[15px] font-semibold text-[#111111]">
                  {rewardAmt > 0
                    ? "Complete payment to go live"
                    : "Set a budget to launch your campaign"}
                </p>
                <p className="text-[13px] text-[#64748B] mt-[2px]">
                  {rewardAmt > 0
                    ? `Budget: $${rewardAmt.toFixed(2)}. Your campaign goes live on The Wall as soon as payment clears.`
                    : "Your campaign will go live on The Wall once you set a budget or choose to run for free."}
                </p>
                {hasWelcomeCredit && (
                  <p className="text-[12px] text-[#22c55e] font-medium mt-[4px]">
                    You have a ${(WELCOME_BONUS.fundingCreditCents / 100).toFixed(0)} welcome credit — applied automatically at checkout.
                  </p>
                )}
              </div>
              <FundCampaignButton campaignId={campaign.id} rewardAmount={rewardAmt} />
            </div>
            {rewardAmt > 0 && strength && (
              <div className="flex items-center gap-[16px] text-[12px] text-[#64748B] pt-[8px] border-t border-[#E2E8F0]/50 flex-wrap">
                <span>Strength <strong className="text-[#111111]">{strength}/10</strong></span>
                {respLow && respHigh && (
                  <span>~<strong className="text-[#111111]">{respLow}–{respHigh}</strong> responses</span>
                )}
                {fillSpeed && (
                  <span>Fills in <strong className="text-[#111111]">{fillSpeed}</strong></span>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* ─── Paused State ─── */}
      {campaign.status === "paused" && (
        <div className="mb-[16px] bg-white border border-[#E5654E]/30 rounded-xl p-[20px]">
          <p className="text-[15px] font-semibold text-[#111111]">Campaign paused</p>
          <p className="text-[13px] text-[#64748B] mt-[2px] mb-[12px]">
            Your campaign is hidden from The Wall. Resume anytime to start collecting responses again.
          </p>
          <ResumeCampaignButton campaignId={campaign.id} />
        </div>
      )}

      {/* ─── Distribution Status (active/completed campaigns) ─── */}
      {(campaign.status === "active" || campaign.status === "completed") && (() => {
        const effectiveReach = campaign.effective_reach_units ?? campaign.total_reach_units ?? 75;
        const reachServed = campaign.reach_served ?? 0;
        const reachProgress = effectiveReach > 0 ? Math.min((reachServed / effectiveReach) * 100, 100) : 0;
        const qScore = campaign.quality_score ?? 50;
        const strength = campaign.campaign_strength ?? getCampaignStrength(effectiveReach);
        const strengthLbl = getStrengthLabel(strength);
        const sColors = getStrengthColors(strength);
        const qualityMod = getQualityModifier(qScore);
        const qualityBonus = Math.round((qualityMod - 1) * 100);

        return (
          <div className="bg-[#FAF9FA] border border-[#E2E8F0] rounded-2xl p-[24px] mb-[24px] relative overflow-hidden">
            <div className="absolute top-0 left-[15%] right-[15%] h-[2px] bg-gradient-to-r from-transparent via-[#E8C1B0]/25 to-transparent" />
            <div className="flex items-center justify-between mb-[16px]">
              <h2 className="text-[16px] font-semibold text-[#111111]">Campaign Performance</h2>
              <div className="flex items-center gap-[8px]">
                <span className="text-[12px] text-[#94A3B8]">Campaign Strength</span>
                <div className="flex items-baseline gap-[2px]">
                  <span className="font-mono font-bold text-[20px]" style={{ WebkitTextStrokeWidth: '0.8px', WebkitTextStrokeColor: sColors.strokeStyle, WebkitTextFillColor: sColors.fillStyle }}>
                    {strength}
                  </span>
                  <span className="text-[12px] text-[#94A3B8] font-normal">/10</span>
                </div>
              </div>
            </div>

            {/* Strength bar */}
            <div className="flex gap-[3px] mb-[6px]">
              {Array.from({ length: 10 }, (_, i) => {
                if (i >= strength) return <div key={i} className="h-[5px] flex-1 rounded-full" style={{ backgroundColor: "#F1F5F9" }} />;
                const progress = strength <= 1 ? 1 : i / (strength - 1);
                const opacity = 0.35 + 0.65 * progress;
                return <div key={i} className="h-[5px] flex-1 rounded-full" style={{ backgroundColor: sColors.barColor, opacity }} />;
              })}
            </div>
            <p className="text-[12px] text-[#64748B] mb-[16px]">{strengthLbl}</p>

            {/* Reach served progress */}
            <div className="mb-[12px]">
              <div className="flex items-center justify-between text-[12px] text-[#94A3B8] mb-[4px]">
                <span>People reached</span>
                <span>
                  <span className="font-mono font-semibold text-[#111111]">{reachServed.toLocaleString()}</span>
                  {" of "}{effectiveReach.toLocaleString()} people
                </span>
              </div>
              <div className="h-[4px] rounded-full bg-[#F1F5F9] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#6B8EA3] transition-all"
                  style={{ width: `${reachProgress}%` }}
                />
              </div>
            </div>

            {/* Quality + fill speed */}
            <div className="flex items-center gap-[16px] text-[12px]">
              <span className="text-[#94A3B8]">
                Fill speed: <span className="font-semibold text-[#111111]">{estimateFillSpeed(effectiveReach)}</span>
              </span>
              <span className="text-[#d4d4d4]">&middot;</span>
              <span style={{ color: qualityBonus >= 0 ? "#22c55e" : "#CC5340" }}>
                {qualityBonus >= 0
                  ? `Survey quality boosting reach by +${qualityBonus}%`
                  : `Survey quality limiting reach by ${Math.abs(qualityBonus)}%`}
              </span>
            </div>

            {/* Campaign actions for active campaigns */}
            {campaign.status === "active" && (
              <div className="mt-[16px] pt-[16px] border-t border-[#f0f0f0] flex flex-col gap-[10px]">
                <p className="text-[12px] text-[#64748B]">Increase your budget to reach more people and attract additional responses.</p>
                <div className="flex items-center gap-[10px]">
                  <FundCampaignButton campaignId={campaign.id} rewardAmount={Number(campaign.reward_amount) || 0} label="Increase Budget" />
                  <PauseCampaignButton campaignId={campaign.id} />
                  <CompleteCampaignButton campaignId={campaign.id} />
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ─── Stats Row ─── */}
      <div className="grid grid-cols-4 gap-[12px] mb-[24px] max-md:grid-cols-2">
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-[16px] hover:border-[#CBD5E1] transition-all duration-200 relative overflow-hidden">
          <div className="absolute top-0 left-[20%] right-[20%] h-[1px] bg-gradient-to-r from-transparent via-[#E8C1B0]/20 to-transparent" />
          <span className="text-[11px] text-[#94A3B8] uppercase tracking-[1px] font-semibold">
            Responses
          </span>
          <div className="mt-[4px]">
            <span className="font-mono text-[22px] font-bold text-[#111111]">
              {campaign.current_responses}
            </span>
            <span className="text-[13px] text-[#94A3B8]">
              /{campaign.target_responses}
            </span>
          </div>
          <div className="h-[4px] rounded-full bg-[#F1F5F9] overflow-hidden mt-[8px]">
            <div
              className="h-full rounded-full bg-[#34D399]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-[16px] hover:border-[#CBD5E1] transition-all duration-200 relative overflow-hidden">
          <div className="absolute top-0 left-[20%] right-[20%] h-[1px] bg-gradient-to-r from-transparent via-[#E8C1B0]/20 to-transparent" />
          <span className="text-[11px] text-[#94A3B8] uppercase tracking-[1px] font-semibold">
            Category
          </span>
          <div className="font-semibold text-[15px] text-[#111111] mt-[4px]">
            {campaign.category || "—"}
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-[16px] hover:border-[#CBD5E1] transition-all duration-200 relative overflow-hidden">
          <div className="absolute top-0 left-[20%] right-[20%] h-[1px] bg-gradient-to-r from-transparent via-[#E8C1B0]/20 to-transparent" />
          <span className="text-[11px] text-[#94A3B8] uppercase tracking-[1px] font-semibold">
            Est. Time
          </span>
          <div className="font-mono text-[15px] font-semibold text-[#111111] mt-[4px]">
            {campaign.estimated_minutes || 5} min
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-[16px] hover:border-[#CBD5E1] transition-all duration-200 relative overflow-hidden">
          <div className="absolute top-0 left-[20%] right-[20%] h-[1px] bg-gradient-to-r from-transparent via-[#E8C1B0]/20 to-transparent" />
          <span className="text-[11px] text-[#94A3B8] uppercase tracking-[1px] font-semibold">
            Created
          </span>
          <div className="text-[15px] font-semibold text-[#111111] mt-[4px]">
            {formatDate(campaign.created_at)}
          </div>
        </div>
      </div>

      {/* ─── Decision Brief CTA ─── */}
      {campaign.current_responses >= 3 && (
        <Link
          href={`/dashboard/ideas/${campaign.id}/brief`}
          className="block bg-[#111111] rounded-2xl p-[20px] mb-[16px] hover:bg-[#222222] hover:-translate-y-[1px] transition-all duration-300 no-underline group"
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[16px] font-semibold text-white">
                View Decision Brief
              </span>
              <span className="text-[13px] text-[#94A3B8] ml-[8px]">
                AI synthesis of {campaign.current_responses} responses into assumption verdicts
              </span>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </Link>
      )}

      {/* ─── View Responses CTA ─── */}
      {campaign.current_responses > 0 && (
        <Link
          href={`/dashboard/ideas/${campaign.id}/responses`}
          className="block bg-white border border-[#E2E8F0] rounded-2xl p-[16px] mb-[24px] hover:border-[#CBD5E1] hover:shadow-[0_4px_16px_rgba(232,193,176,0.06)] hover:-translate-y-[1px] transition-all duration-300 no-underline group"
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[15px] font-semibold text-[#111111] group-hover:text-[#000000] transition-colors">
                View {campaign.current_responses} Response{campaign.current_responses !== 1 ? "s" : ""}
              </span>
              <span className="text-[13px] text-[#94A3B8] ml-[8px]">
                {campaign.ranking_status === "ranked"
                  ? "Ranked"
                  : `${campaign.current_responses} new — review & rank them`}
              </span>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </Link>
      )}

      {/* ─── Recent Activity ─── */}
      {(campaign.status === "active" || campaign.status === "completed") && recentResponses && recentResponses.length > 0 && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-[20px] mb-[24px]">
          <h2 className="text-[14px] font-semibold text-[#111111] mb-[12px]">Recent Activity</h2>
          <div className="flex flex-col gap-[8px]">
            {recentResponses.map((r) => {
              const timeAgo = (date: string) => {
                const diff = Date.now() - new Date(date).getTime();
                const mins = Math.floor(diff / 60000);
                if (mins < 60) return `${mins}m ago`;
                const hrs = Math.floor(mins / 60);
                if (hrs < 24) return `${hrs}h ago`;
                return `${Math.floor(hrs / 24)}d ago`;
              };

              return (
                <div key={r.id} className="flex items-center justify-between text-[12px]">
                  <div className="flex items-center gap-[8px]">
                    <span className={`w-[6px] h-[6px] rounded-full ${
                      r.status === "ranked" ? "bg-[#22c55e]" : "bg-[#E5654E]"
                    }`} />
                    <span className="text-[#64748B]">
                      {r.status === "ranked"
                        ? `Response ranked — quality ${r.quality_score}/100`
                        : "New response submitted"}
                    </span>
                  </div>
                  <span className="text-[#94A3B8]">
                    {timeAgo(r.ranked_at || r.created_at)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Analytics ─── */}
      {campaign.current_responses > 0 && (
        <div className="mb-[24px]">
          <CampaignAnalytics campaignId={campaign.id} />
        </div>
      )}

      {/* ─── Description ─── */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-[32px] mb-[24px]">
        <h2 className="text-[16px] font-semibold text-[#111111] mb-[12px]">
          Description
        </h2>
        <p className="text-[14px] text-[#64748B] leading-[1.6] whitespace-pre-wrap">
          {campaign.description || "No description provided."}
        </p>
        {campaign.tags && (campaign.tags as string[]).length > 0 && (
          <div className="flex flex-wrap gap-[6px] mt-[16px]">
            {(campaign.tags as string[]).map((tag) => (
              <span
                key={tag}
                className="text-[11px] px-[8px] py-[3px] rounded-full bg-[#F1F5F9] text-[#64748B]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ─── Assumption Signal Dashboard (live polling) ─── */}
      <AssumptionSignal
        campaignId={campaign.id}
        assumptions={assumptions}
        initialCoverage={assumptionCoverage.map((c) => ({
          responseCount: c.responseCount,
          avgQuality: c.avgQuality,
          avgMatch: c.avgMatch,
          categoryCount: c.categoryCount,
          categories: c.categories,
          hasNegative: c.hasNegative,
          strength: c.strength,
        }))}
        isActive={campaign.status === "active"}
      />

      {/* ─── Survey Questions ─── */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-[32px] mb-[24px]">
        <h2 className="text-[16px] font-semibold text-[#111111] mb-[20px]">
          Survey Questions
        </h2>

        {allQuestions.length === 0 ? (
          <p className="text-[13px] text-[#94A3B8]">No questions found.</p>
        ) : (
          <div className="flex flex-col gap-[24px]">
            {/* Open-ended */}
            {openQs.length > 0 && (
              <div>
                <h3 className="text-[13px] font-semibold text-[#64748B] mb-[10px]">
                  Open-ended
                </h3>
                <div className="flex flex-col gap-[8px]">
                  {openQs.map((q, i) => (
                    <QuestionRow
                      key={q.id}
                      index={i + 1}
                      text={q.text}
                      type="open"
                      options={q.options}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Follow-up */}
            {followupQs.length > 0 && (
              <div>
                <h3 className="text-[13px] font-semibold text-[#64748B] mb-[10px]">
                  Follow-up
                </h3>
                <div className="flex flex-col gap-[8px]">
                  {followupQs.map((q, i) => (
                    <QuestionRow
                      key={q.id}
                      index={openQs.length + i + 1}
                      text={q.text}
                      type={q.type}
                      options={q.options}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Baseline */}
            {baselineQs.length > 0 && (
              <div>
                <h3 className="text-[13px] font-semibold text-[#64748B] mb-[10px]">
                  Baseline
                </h3>
                <div className="flex flex-col gap-[8px]">
                  {baselineQs.map((q, i) => (
                    <QuestionRow
                      key={q.id}
                      index={openQs.length + followupQs.length + i + 1}
                      text={q.text}
                      type="baseline"
                      options={q.options}
                      category={q.category}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Audience Targeting ─── */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-[32px] mb-[24px]">
        <h2 className="text-[16px] font-semibold text-[#111111] mb-[16px]">
          Audience Targeting
        </h2>

        <div className="flex flex-col gap-[16px]">
          {targetingFields.map(
            ({ label, values }) =>
              values &&
              values.length > 0 && (
                <div key={label}>
                  <span className="text-[13px] font-medium text-[#64748B] block mb-[6px]">
                    {label}
                  </span>
                  <div className="flex flex-wrap gap-[6px]">
                    {values.map((v) => (
                      <span
                        key={v}
                        className="text-[12px] px-[10px] py-[4px] rounded-full bg-[#F1F5F9] text-[#111111]"
                      >
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
              )
          )}

          {textFields.some((f) => f.value) && (
            <div className="grid grid-cols-2 gap-[12px] max-md:grid-cols-1">
              {textFields.map(
                ({ label, value }) =>
                  value && (
                    <div key={label}>
                      <span className="text-[13px] font-medium text-[#64748B] block mb-[2px]">
                        {label}
                      </span>
                      <span className="text-[14px] text-[#111111]">
                        {value}
                      </span>
                    </div>
                  )
              )}
            </div>
          )}

          {!targetingFields.some((f) => f.values && f.values.length > 0) &&
            !textFields.some((f) => f.value) && (
              <p className="text-[13px] text-[#94A3B8]">
                No audience targeting configured.
              </p>
            )}
        </div>
      </div>

      {/* ─── Quality Scores ─── */}
      {qualityScores && qualityScores.overall !== undefined && (
        <div className="bg-white border border-[#E5654E]/30 rounded-2xl p-[32px] mb-[24px]">
          <div className="flex items-center justify-between mb-[16px]">
            <h2 className="text-[16px] font-semibold text-[#111111]">
              Survey Strength
            </h2>
            <span
              className="text-[14px] font-semibold"
              style={{
                color:
                  qualityScores.overall >= 75
                    ? "#22c55e"
                    : qualityScores.overall >= 50
                      ? "#E5654E"
                      : "#ef4444",
              }}
            >
              {qualityScores.overall}/100
            </span>
          </div>
          <div className="flex flex-col gap-[8px]">
            {qualityScores.audienceClarity !== undefined && (
              <DimensionBar
                label="Audience"
                score={qualityScores.audienceClarity}
                tooltip="How well-defined your target audience is"
              />
            )}
            {qualityScores.questionQuality !== undefined && (
              <DimensionBar
                label="Questions"
                score={qualityScores.questionQuality}
                tooltip="How strong and varied your questions are"
              />
            )}
            {qualityScores.behavioralCoverage !== undefined && (
              <DimensionBar
                label="Behavioral"
                score={qualityScores.behavioralCoverage}
                tooltip="How well your survey captures real behavior and intent"
              />
            )}
            {qualityScores.monetizationCoverage !== undefined && (
              <DimensionBar
                label="Monetization"
                score={qualityScores.monetizationCoverage}
                tooltip="How well your rewards motivate thoughtful responses"
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}

/* ─── QuestionRow ─── */

function QuestionRow({
  index,
  text,
  type,
  options,
  category,
}: {
  index: number;
  text: string;
  type: string;
  options: string[] | { choices: string[] } | null;
  category?: string | null;
}) {
  // Handle both flat array and legacy { choices: [...] } format
  const optionsList: string[] | null = options
    ? Array.isArray(options)
      ? options
      : (options as { choices?: string[] }).choices ?? null
    : null;

  return (
    <div className="flex gap-[12px] p-[14px] rounded-xl border border-[#E2E8F0] hover:border-[#CBD5E1] transition-all duration-200">
      <div className="flex-shrink-0 w-[24px] h-[24px] rounded-full bg-[#F3F4F6] flex items-center justify-center">
        <span className="text-[11px] font-semibold text-[#64748B]">
          {index}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-[6px] mb-[4px]">
          <span
            className={`text-[10px] font-semibold tracking-[1px] uppercase px-[6px] py-[1px] rounded-full ${
              type === "baseline"
                ? "bg-[#E5654E]/15 text-[#CC5340]"
                : type === "open"
                  ? "bg-[#dbeafe] text-[#1d4ed8]"
                  : "bg-[#f3e8ff] text-[#7c3aed]"
            }`}
          >
            {type === "baseline"
              ? "Baseline"
              : type === "open"
                ? "Open"
                : "Follow-up"}
          </span>
          {category && (
            <span className="text-[10px] text-[#94A3B8]">{category}</span>
          )}
        </div>
        <p className="text-[14px] text-[#111111] leading-[1.5]">{text}</p>
        {optionsList && optionsList.length > 0 && (
          <div className="flex flex-wrap gap-[4px] mt-[8px]">
            {optionsList.map((opt) => (
              <span
                key={opt}
                className="text-[11px] px-[8px] py-[3px] rounded-full border border-[#E2E8F0] text-[#64748B] bg-[#FCFCFD]"
              >
                {opt}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
