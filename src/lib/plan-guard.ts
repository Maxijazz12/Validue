import sql from "./db";
import { PLAN_CONFIG, WELCOME_BONUS, type PlanTier, normalizeTier } from "./plans";
import { DEFAULTS } from "./defaults";

/* ─── Types ─── */

export type SubscriptionInfo = {
  tier: PlanTier;
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date | null;
  campaignsUsed: number;
};

export type CampaignAllowance = {
  allowed: boolean;
  reason?: string;
  tier: PlanTier;
  used: number;
  limit: number;
  isFirstMonth: boolean;
};

/* ─── Subscription Lookup ─── */

/**
 * Gets the user's current subscription. Returns free tier defaults
 * if no subscription row exists.
 */
export async function getSubscription(
  userId: string
): Promise<SubscriptionInfo> {
  const rows = await sql`
    SELECT tier, status, current_period_start, current_period_end, campaigns_used_this_period
    FROM subscriptions
    WHERE user_id = ${userId}
    LIMIT 1
  `;

  if (rows.length === 0) {
    return {
      tier: "free",
      status: "active",
      currentPeriodStart: new Date(),
      currentPeriodEnd: null,
      campaignsUsed: 0,
    };
  }

  const row = rows[0];
  return {
    tier: normalizeTier(row.tier) ?? "free",
    status: row.status,
    currentPeriodStart: new Date(row.current_period_start),
    currentPeriodEnd: row.current_period_end
      ? new Date(row.current_period_end)
      : null,
    campaignsUsed: row.campaigns_used_this_period,
  };
}

/* ─── First Month Detection ─── */

/**
 * Checks if the user signed up within the welcome bonus window.
 * V2: 14-day window (down from 30 days) for tighter conversion urgency.
 */
export async function isFirstMonth(userId: string): Promise<boolean> {
  const rows = await sql`
    SELECT created_at FROM profiles WHERE id = ${userId}
  `;
  if (rows.length === 0) return false;

  const createdAt = new Date(rows[0].created_at);
  const bonusWindow = new Date();
  bonusWindow.setDate(bonusWindow.getDate() - WELCOME_BONUS.expiryDays);

  return createdAt > bonusWindow;
}

/**
 * Checks if this is the user's first-ever campaign (for welcome reach boost).
 */
export async function isFirstCampaign(
  userId: string,
  opts?: { excludeCampaignId?: string }
): Promise<boolean> {
  const rows = opts?.excludeCampaignId
    ? await sql`
        SELECT COUNT(*)::int AS count
        FROM campaigns
        WHERE creator_id = ${userId}
          AND id <> ${opts.excludeCampaignId}
      `
    : await sql`
        SELECT COUNT(*)::int AS count FROM campaigns WHERE creator_id = ${userId}
      `;
  return rows[0].count === 0;
}

/* ─── Campaign Allowance Check ─── */

/**
 * Determines whether the user can create a new campaign based on their
 * subscription tier and usage this billing period.
 *
 * V2: welcome bonus is 1 campaign (same as normal free limit).
 */
export async function canCreateCampaign(
  userId: string
): Promise<CampaignAllowance> {
  const sub = await getSubscription(userId);

  // Block campaign creation for inactive subscriptions
  if (sub.status === "canceled") {
    return { allowed: false, reason: "Your subscription has been canceled. Please resubscribe to create campaigns.", tier: sub.tier, used: 0, limit: 0, isFirstMonth: false };
  }
  if (sub.status === "past_due") {
    return { allowed: false, reason: "Your subscription payment is past due. Please update your payment method.", tier: sub.tier, used: 0, limit: 0, isFirstMonth: false };
  }

  const firstMonth = sub.tier === "free" ? await isFirstMonth(userId) : false;

  const baseLimit = PLAN_CONFIG[sub.tier].campaignsPerMonth;

  // V2: welcome bonus no longer increases campaign count (stays at 1)
  const effectiveLimit =
    sub.tier === "free" && firstMonth
      ? WELCOME_BONUS.campaignsFirstMonth
      : baseLimit;

  // Count campaigns created this billing period
  let campaignsUsed: number;
  let resetLabel: string;

  if (sub.currentPeriodEnd) {
    // Paid user: count within billing period
    const rows = await sql`
      SELECT COUNT(*)::int AS count
      FROM campaigns
      WHERE creator_id = ${userId}
        AND status != 'draft'
        AND created_at >= ${sub.currentPeriodStart}
        AND created_at < ${sub.currentPeriodEnd}
    `;
    campaignsUsed = rows[0].count;
    resetLabel = "billing period";
  } else {
    // Free user: rolling window (e.g. 7 days)
    const resetDays = DEFAULTS.FREE_TIER_RESET_DAYS;
    const rows = await sql`
      SELECT COUNT(*)::int AS count
      FROM campaigns
      WHERE creator_id = ${userId}
        AND status != 'draft'
        AND created_at >= NOW() - INTERVAL '1 day' * ${resetDays}
    `;
    campaignsUsed = rows[0].count;
    resetLabel = `${resetDays} days`;
  }

  const allowed = campaignsUsed < effectiveLimit;

  // For free users, calculate when the limit resets
  let reason: string | undefined;
  if (!allowed) {
    if (!sub.currentPeriodEnd) {
      // Find the oldest campaign in the window to calculate reset time
      const resetDays = DEFAULTS.FREE_TIER_RESET_DAYS;
      const [oldest] = await sql`
        SELECT created_at FROM campaigns
        WHERE creator_id = ${userId}
          AND status != 'draft'
          AND created_at >= NOW() - INTERVAL '1 day' * ${resetDays}
        ORDER BY created_at ASC
        LIMIT 1
      `;
      if (oldest) {
        const resetAt = new Date(oldest.created_at);
        resetAt.setDate(resetAt.getDate() + resetDays);
        const daysUntilReset = Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
        reason = `Your campaign limit resets in ${daysUntilReset} day${daysUntilReset === 1 ? "" : "s"}. Upgrade for more campaigns.`;
      } else {
        reason = `You've reached your limit for this period. Upgrade to unlock more campaigns.`;
      }
    } else {
      reason = `You've reached your ${effectiveLimit}-campaign limit this ${resetLabel}. Upgrade to unlock more campaigns.`;
    }
  }

  return {
    allowed,
    reason,
    tier: sub.tier,
    used: campaignsUsed,
    limit: effectiveLimit,
    isFirstMonth: firstMonth,
  };
}

/* ─── Pure Business Logic (exported for testability) ─── */

/** Returns true if account age (ms) is within the subsidy eligibility window */
export function isAccountEligibleForSubsidy(accountAgeMs: number): boolean {
  return accountAgeMs <= DEFAULTS.SUBSIDY_ELIGIBILITY_DAYS * 24 * 60 * 60 * 1000;
}

/** Returns true if the platform-wide monthly subsidy cap has been reached */
export function isSubsidyCapReached(subsidizedLast30Days: number): boolean {
  return subsidizedLast30Days * DEFAULTS.SUBSIDY_BUDGET_PER_CAMPAIGN >= DEFAULTS.SUBSIDY_MONTHLY_CAP;
}

/** Computes the effective campaign limit for a given tier and first-month status */
export function computeEffectiveLimit(tier: PlanTier, isFirstMonth: boolean): number {
  const baseLimit = PLAN_CONFIG[tier].campaignsPerMonth;
  return tier === "free" && isFirstMonth ? WELCOME_BONUS.campaignsFirstMonth : baseLimit;
}

/** Returns true if a subscription status blocks campaign creation */
export function isSubscriptionBlocked(status: string): boolean {
  return status === "canceled" || status === "past_due";
}

/* ─── V2: Subsidy Eligibility ─── */

/**
 * Checks whether a user is eligible for a free subsidized first campaign.
 *
 * Eligibility rules (all must be true):
 * 1. User has verified email (checked upstream by auth)
 * 2. User has completed profile (full_name exists)
 * 3. User has never created a campaign
 * 4. subsidized_campaign_used = false
 * 5. Account is < 30 days old
 * 6. Monthly platform subsidy cap not exceeded
 */
export async function checkSubsidyEligibility(
  userId: string
): Promise<{ eligible: boolean; reason?: string }> {
  // Check profile completeness and subsidy flag
  const [profile] = await sql`
    SELECT full_name, subsidized_campaign_used, created_at
    FROM profiles WHERE id = ${userId}
  `;
  if (!profile) return { eligible: false, reason: "Profile not found." };
  if (!profile.full_name) {
    return { eligible: false, reason: "Complete your profile to unlock your free campaign." };
  }
  if (profile.subsidized_campaign_used) {
    return { eligible: false, reason: "Free campaign already used." };
  }

  // Account age check
  const accountAge = Date.now() - new Date(profile.created_at).getTime();
  if (accountAge > DEFAULTS.SUBSIDY_ELIGIBILITY_DAYS * 24 * 60 * 60 * 1000) {
    return { eligible: false, reason: "Free campaign offer has expired." };
  }

  // Must have zero campaigns
  const isFirst = await isFirstCampaign(userId);
  if (!isFirst) {
    return { eligible: false, reason: "Free campaign is only for your first campaign." };
  }

  // Platform-wide monthly cap check
  const [{ count: subsidizedLast30Days }] = await sql`
    SELECT COUNT(*)::int AS count
    FROM campaigns
    WHERE is_subsidized = true
      AND created_at > NOW() - INTERVAL '30 days'
  `;
  const monthlyCostEstimate = subsidizedLast30Days * DEFAULTS.SUBSIDY_BUDGET_PER_CAMPAIGN;
  if (monthlyCostEstimate >= DEFAULTS.SUBSIDY_MONTHLY_CAP) {
    return { eligible: false }; // Silently hide — don't show "temporarily unavailable"
  }

  return { eligible: true };
}

/* ─── Increment Campaign Usage ─── */

/**
 * Increments the campaign counter after a successful publish.
 * Creates a free-tier subscription row if none exists.
 */
export async function incrementCampaignUsage(userId: string): Promise<void> {
  const result = await sql`
    UPDATE subscriptions
    SET campaigns_used_this_period = campaigns_used_this_period + 1,
        updated_at = now()
    WHERE user_id = ${userId}
    RETURNING id
  `;

  // If no subscription row exists (free user), create one
  if (result.length === 0) {
    await sql`
      INSERT INTO subscriptions (user_id, tier, status, campaigns_used_this_period)
      VALUES (${userId}, 'free', 'active', 1)
      ON CONFLICT (user_id) DO UPDATE
        SET campaigns_used_this_period = subscriptions.campaigns_used_this_period + 1,
            updated_at = now()
    `;
  }
}
