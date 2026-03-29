/**
 * Structured operational event logging.
 * Covers state transitions, payouts, reach, reputation — everything
 * outside the AI generation pipeline (which has its own logger).
 *
 * Format: JSON to stdout, same pattern as src/lib/ai/logger.ts.
 */

/* ─── Event Types ─── */

type CampaignPublished = {
  event: "campaign.published";
  campaignId: string;
  creatorId: string;
  tier: string;
  fundingAmount: number;
  status: string;
  qualityScore: number;
  effectiveReach: number;
  campaignStrength: number;
  format?: string;
  economicsVersion?: number;
  targetResponses?: number;
};

type CampaignFunded = {
  event: "campaign.funded";
  campaignId: string;
  rewardAmount: number;
  distributableAmount: number;
  stripePaymentIntentId?: string;
  welcomeCreditUsed: boolean;
};

type CampaignStatusChanged = {
  event: "campaign.status_changed";
  campaignId: string;
  fromStatus: string;
  toStatus: string;
  triggeredBy: "user" | "webhook" | "auto" | "expiration_cron";
};

type RankingStarted = {
  event: "ranking.started";
  campaignId: string;
  responseCount: number;
};

type RankingCompleted = {
  event: "ranking.completed";
  campaignId: string;
  rankedCount: number;
  aiCount: number;
  fallbackCount: number;
  lowConfidenceCount: number;
  avgScore: number;
  minScore: number;
  maxScore: number;
  latencyMs: number;
};

type RankingFailed = {
  event: "ranking.failed";
  campaignId: string;
  error: string;
  responsesScoredBeforeFailure: number;
};

type PayoutAllocated = {
  event: "payout.allocated";
  campaignId: string;
  distributable: number;
  totalDistributed: number;
  respondentCount: number;
  avgPayout: number;
  minPayout: number;
  maxPayout: number;
};

type PayoutAnomaly = {
  event: "payout.anomaly";
  campaignId: string;
  anomalyType: "sum_mismatch" | "distributable_mismatch" | "zero_allocation";
  distributable: number;
  totalAllocated: number;
  delta: number;
  detail?: string;
};

type ReachCapHit = {
  event: "reach.cap_hit";
  campaignId: string;
  reachServed: number;
  effectiveReachUnits: number;
};

type ReachError = {
  event: "reach.error";
  campaignId: string;
  userId: string;
  error: string;
};

type ReputationUpdated = {
  event: "reputation.updated";
  respondentId: string;
  oldScore: number;
  newScore: number;
  oldTier: string;
  newTier: string;
  totalCompleted: number;
};

type WebhookProcessed = {
  event: "webhook.processed";
  stripeEventId: string;
  eventType: string;
  result: "success" | "no_op" | "error";
  detail?: string;
};

type ContentFlagged = {
  event: "content.flagged";
  userId: string;
  fieldName: string;
  action: "blocked" | "flagged";
  reason: string;
  entryPoint: string;
};

type CampaignCloned = {
  event: "campaign.cloned";
  originalCampaignId: string;
  newCampaignId: string;
  creatorId: string;
};

type OpsEvent =
  | CampaignPublished
  | CampaignFunded
  | CampaignStatusChanged
  | CampaignCloned
  | RankingStarted
  | RankingCompleted
  | RankingFailed
  | PayoutAllocated
  | PayoutAnomaly
  | ReachCapHit
  | ReachError
  | ReputationUpdated
  | WebhookProcessed
  | ContentFlagged;

/* ─── Logger ─── */

export function logOps(event: OpsEvent): void {
  const fullEvent = {
    ...event,
    timestamp: new Date().toISOString(),
    service: "validue-ops",
  };
  console.log(JSON.stringify(fullEvent));
}
