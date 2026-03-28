import sql from "./db";
import { PLAN_CONFIG, WELCOME_BONUS, type PlanTier, isValidTier } from "./plans";

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
    tier: isValidTier(row.tier) ? row.tier : "free",
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
export async function isFirstCampaign(userId: string): Promise<boolean> {
  const rows = await sql`
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
 * Scale tier has unlimited campaigns (campaignsPerMonth = null).
 */
export async function canCreateCampaign(
  userId: string
): Promise<CampaignAllowance> {
  const sub = await getSubscription(userId);
  const firstMonth = sub.tier === "free" ? await isFirstMonth(userId) : false;

  // Determine effective campaign limit
  const baseLimit = PLAN_CONFIG[sub.tier].campaignsPerMonth;

  // Scale tier: unlimited campaigns
  if (baseLimit === null) {
    return {
      allowed: true,
      tier: sub.tier,
      used: 0,
      limit: Infinity,
      isFirstMonth: false,
    };
  }

  // V2: welcome bonus no longer increases campaign count (stays at 1)
  const effectiveLimit =
    sub.tier === "free" && firstMonth
      ? WELCOME_BONUS.campaignsFirstMonth
      : baseLimit;

  // Count campaigns created this billing period
  // For free users without a subscription row, count campaigns this calendar month
  let campaignsUsed: number;

  if (sub.currentPeriodEnd) {
    // Paid user: count within billing period
    const rows = await sql`
      SELECT COUNT(*)::int AS count
      FROM campaigns
      WHERE creator_id = ${userId}
        AND created_at >= ${sub.currentPeriodStart}
        AND created_at < ${sub.currentPeriodEnd}
    `;
    campaignsUsed = rows[0].count;
  } else {
    // Free user: count within current calendar month
    const rows = await sql`
      SELECT COUNT(*)::int AS count
      FROM campaigns
      WHERE creator_id = ${userId}
        AND created_at >= date_trunc('month', now())
    `;
    campaignsUsed = rows[0].count;
  }

  const allowed = campaignsUsed < effectiveLimit;

  return {
    allowed,
    reason: allowed
      ? undefined
      : `You've reached your ${effectiveLimit}-campaign limit this ${sub.currentPeriodEnd ? "billing period" : "month"}. Upgrade to unlock more campaigns.`,
    tier: sub.tier,
    used: campaignsUsed,
    limit: effectiveLimit,
    isFirstMonth: firstMonth,
  };
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
