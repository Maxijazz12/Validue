import { settleLockedCampaignPayouts } from "@/lib/campaign-settlement";
import type { SqlRunner } from "@/lib/postgres-types";

type CampaignCompletionOptions = {
  campaignId: string;
  creatorId?: string | null;
  requireTargetReached?: boolean;
};

export type CampaignCompletionResult =
  | {
      kind: "completed";
      title: string;
      releasedCount: number;
    }
  | {
      kind: "skipped";
      reason: "not_found" | "not_active" | "target_not_reached";
    };

export async function completeCampaignWithinTransaction(
  db: SqlRunner,
  options: CampaignCompletionOptions
): Promise<CampaignCompletionResult> {
  const creatorId = options.creatorId ?? null;
  const [campaign] = await db`
    SELECT id, title, status, payout_status, current_responses, target_responses
    FROM campaigns
    WHERE id = ${options.campaignId}
      AND (${creatorId}::uuid IS NULL OR creator_id = ${creatorId}::uuid)
    FOR UPDATE
  `;

  if (!campaign) {
    return { kind: "skipped", reason: "not_found" };
  }

  if (String(campaign.status) !== "active") {
    return { kind: "skipped", reason: "not_active" };
  }

  const currentResponses = Number(campaign.current_responses ?? 0);
  const targetResponses = Number(campaign.target_responses ?? 0);
  if (
    options.requireTargetReached &&
    (targetResponses <= 0 || currentResponses < targetResponses)
  ) {
    return { kind: "skipped", reason: "target_not_reached" };
  }

  const currentPayoutStatus = String(campaign.payout_status ?? "none");
  const settlement = await settleLockedCampaignPayouts(db, options.campaignId);
  const nextPayoutStatus =
    settlement.lockedCount > 0 || currentPayoutStatus === "allocated"
      ? "completed"
      : currentPayoutStatus;

  await db`
    UPDATE campaigns
    SET status = 'completed',
        payout_status = ${nextPayoutStatus},
        updated_at = NOW()
    WHERE id = ${options.campaignId}
  `;

  return {
    kind: "completed",
    title: String(campaign.title),
    releasedCount: settlement.lockedCount,
  };
}
