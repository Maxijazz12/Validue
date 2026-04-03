import { redirect } from "next/navigation";
import { synthesizeBrief } from "@/lib/ai/synthesize-brief";
import type { BriefResult } from "@/lib/ai/synthesize-brief";
import type { DecisionBrief } from "@/lib/ai/brief-schemas";
import type { AssumptionCoverage } from "@/lib/ai/assumption-evidence";
import type { PriceSignal } from "@/lib/ai/extract-price-signal";
import type { ConsistencyReport } from "@/lib/ai/detect-consistency-gaps";
import type { SegmentReport } from "@/lib/ai/segment-disagreements";
import type { PriorRoundVerdicts } from "@/lib/ai/synthesize-brief";
import { createClient } from "@/lib/supabase/server";
import { getSubscription } from "@/lib/plan-guard";
import { DEFAULTS } from "@/lib/defaults";
import sql from "@/lib/db";
import {
  BriefFundingGateState,
  BriefInsufficientDataState,
  BriefPageContent,
} from "./BriefPageContent";

export const dynamic = "force-dynamic";

const BRIEF_FUNDING_GATE = DEFAULTS.BRIEF_FUNDING_GATE;

type CampaignRow = {
  id: string;
  title: string;
  description: string;
  key_assumptions: string[] | null;
  creator_id: string;
  current_responses: number | null;
  status: string;
  reward_amount: number | null;
};

type BriefState = {
  brief: DecisionBrief;
  coverage: AssumptionCoverage[];
  priceSignal: PriceSignal | null;
  consistencyReport: ConsistencyReport | null;
  segmentReport: SegmentReport | null;
  roundNumber: number;
  parentVerdicts: PriorRoundVerdicts | null;
  synthesisError: boolean;
};

async function loadCampaignForBrief(id: string, userId: string): Promise<CampaignRow | null> {
  const supabase = await createClient();
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, title, description, key_assumptions, creator_id, current_responses, status, reward_amount")
    .eq("id", id)
    .eq("creator_id", userId)
    .single();

  return campaign as CampaignRow | null;
}

async function countSubmittedResponses(campaignId: string): Promise<number> {
  const [{ count }] = await sql`
    SELECT COUNT(*)::int as count FROM responses
    WHERE campaign_id = ${campaignId} AND status IN ('submitted', 'ranked')
  `;
  return count;
}

async function buildBriefState(campaign: CampaignRow): Promise<BriefState> {
  const assumptions = campaign.key_assumptions ?? [];

  try {
    const result: BriefResult = await synthesizeBrief(
      campaign.id,
      campaign.title,
      campaign.description,
      assumptions
    );

    return {
      brief: result.brief,
      coverage: result.coverage,
      priceSignal: result.priceSignal,
      consistencyReport: result.consistencyReport,
      segmentReport: result.segmentReport,
      roundNumber: result.roundNumber,
      parentVerdicts: result.parentVerdicts,
      synthesisError: false,
    };
  } catch {
    return {
      brief: {
        recommendation: "PAUSE",
        confidence: "LOW",
        confidenceRationale: "Brief generation encountered an error. Please try again.",
        uncomfortableTruth: "We couldn't generate your brief right now. This is a temporary issue — try refreshing the page.",
        signalSummary: "Synthesis failed. Your responses are safe and you can retry.",
        assumptionVerdicts: assumptions.map((assumption, index) => ({
          assumption,
          assumptionIndex: index,
          verdict: "INSUFFICIENT_DATA" as const,
          confidence: "LOW" as const,
          evidenceSummary: "Synthesis unavailable — please retry.",
          supportingCount: 0,
          contradictingCount: 0,
          totalResponses: 0,
          quotes: [],
        })),
        strongestSignals: ["Retry brief generation to see your results."],
        nextSteps: [
          { action: "Refresh this page to retry brief generation", effort: "Low", timeline: "Now", whatItTests: "Whether the AI service is back online" },
          { action: "Review raw responses while waiting", effort: "Low", timeline: "Now", whatItTests: "Manual pattern identification" },
        ],
        cheapestTest: "Refresh this page to retry. If the issue persists, check back in a few minutes.",
      },
      coverage: [],
      priceSignal: null,
      consistencyReport: null,
      segmentReport: null,
      roundNumber: 1,
      parentVerdicts: null,
      synthesisError: true,
    };
  }
}

export default async function BriefPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const campaign = await loadCampaignForBrief(id, user.id);
  if (!campaign) {
    redirect("/dashboard/ideas");
  }

  const count = await countSubmittedResponses(id);
  if (count < 3) {
    return <BriefInsufficientDataState id={id} count={count} />;
  }

  const rewardAmount = Number(campaign.reward_amount) || 0;
  const subscription = await getSubscription(user.id);
  const hasBriefAccess = rewardAmount >= BRIEF_FUNDING_GATE || subscription.tier !== "free";

  if (!hasBriefAccess) {
    return (
      <BriefFundingGateState
        id={id}
        count={count}
        assumptions={campaign.key_assumptions ?? []}
        briefFundingGate={BRIEF_FUNDING_GATE}
      />
    );
  }

  const briefState = await buildBriefState(campaign);

  return (
    <BriefPageContent
      id={id}
      count={count}
      campaign={{
        title: campaign.title,
        description: campaign.description,
        status: campaign.status,
      }}
      brief={briefState.brief}
      coverage={briefState.coverage}
      priceSignal={briefState.priceSignal}
      consistencyReport={briefState.consistencyReport}
      segmentReport={briefState.segmentReport}
      roundNumber={briefState.roundNumber}
      parentVerdicts={briefState.parentVerdicts}
      synthesisError={briefState.synthesisError}
    />
  );
}
