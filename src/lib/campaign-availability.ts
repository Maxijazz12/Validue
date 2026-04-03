type CampaignAvailabilityShape = {
  status: string;
  current_responses: number | null;
  target_responses: number | null;
  expires_at: string | null;
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
    !isCampaignExpired(campaign.expires_at, now) &&
    !hasReachedResponseTarget(campaign.current_responses, campaign.target_responses)
  );
}
