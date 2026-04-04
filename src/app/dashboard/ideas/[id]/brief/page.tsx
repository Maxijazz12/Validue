import { redirect } from "next/navigation";
import { loadFreshCachedBrief } from "@/lib/ai/synthesize-brief";
import { createClient } from "@/lib/supabase/server";
import { getSubscription } from "@/lib/plan-guard";
import { DEFAULTS } from "@/lib/defaults";
import sql from "@/lib/db";
import {
  BriefFundingGateState,
  BriefInsufficientDataState,
  BriefRefreshState,
  BriefPageContent,
} from "./BriefPageContent";
import { refreshBrief } from "./actions";

export const dynamic = "force-dynamic";

const BRIEF_FUNDING_GATE = DEFAULTS.BRIEF_FUNDING_GATE;

type CampaignRow = {
  id: string;
  title: string;
  description: string;
  key_assumptions: string[] | null;
  creator_id: string;
  status: string;
  reward_amount: number | null;
};

async function loadCampaignForBrief(id: string, userId: string): Promise<CampaignRow | null> {
  const supabase = await createClient();
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, title, description, key_assumptions, creator_id, status, reward_amount")
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
  const refreshBriefAction = refreshBrief.bind(null, id);

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

  const cachedBrief = await loadFreshCachedBrief(id, count);
  if (!cachedBrief.result) {
    return (
      <BriefRefreshState
        id={id}
        count={count}
        stale={cachedBrief.isStale}
        action={refreshBriefAction}
      />
    );
  }

  return (
    <BriefPageContent
      id={id}
      count={count}
      campaign={{
        title: campaign.title,
        description: campaign.description,
        status: campaign.status,
      }}
      brief={cachedBrief.result.brief}
      coverage={cachedBrief.result.coverage}
      priceSignal={cachedBrief.result.priceSignal}
      consistencyReport={cachedBrief.result.consistencyReport}
      segmentReport={cachedBrief.result.segmentReport}
      roundNumber={cachedBrief.result.roundNumber}
      parentVerdicts={cachedBrief.result.parentVerdicts}
      synthesisError={false}
    />
  );
}
