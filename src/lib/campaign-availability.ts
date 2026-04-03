type CampaignAvailabilityShape = {
  status: string;
  current_responses: number | null;
  target_responses: number | null;
  expires_at: string | null;
};

type CampaignReachBudgetShape = {
  reach_served: number | null;
  effective_reach_units: number | null;
  total_reach_units: number | null;
};

export function hasReachedResponseTarget(
  currentResponses: number | null,
  targetResponses: number | null
): boolean {
  return (targetResponses ?? 0) > 0 && (currentResponses ?? 0) >= (targetResponses ?? 0);
}

export function isCampaignExpired(
  expiresAt: string | null,
  now = Date.now()
): boolean {
  return Boolean(expiresAt && new Date(expiresAt).getTime() <= now);
}

export function isCampaignOpenForResponses(
  campaign: CampaignAvailabilityShape,
  now = Date.now()
): boolean {
  return (
    campaign.status === "active" &&
    (campaign.target_responses ?? 0) > 0 &&
    !isCampaignExpired(campaign.expires_at, now) &&
    !hasReachedResponseTarget(campaign.current_responses, campaign.target_responses)
  );
}

export function hasRemainingReachBudget(
  campaign: CampaignReachBudgetShape
): boolean {
  const reachBudget = Math.max(
    0,
    Number(campaign.effective_reach_units ?? campaign.total_reach_units ?? 0)
  );

  if (reachBudget <= 0) return false;

  return (campaign.reach_served ?? 0) < reachBudget;
}
