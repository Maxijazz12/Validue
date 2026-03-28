/* ─── Plan Tier Config ─── */

export type PlanTier = "free" | "starter" | "pro" | "scale";

export type PlanConfig = {
  price: number;
  campaignsPerMonth: number | null; // null = unlimited (Scale)
  baselineReachUnits: number;
  reachPerDollar: number;
  /** Funding amount below which reach conversion is fully linear */
  efficientZone: number;
  minFundingAmount: number;
  matchPriority: number; // 1-4, higher = better
  maxAiQuestions: number;
  hasInsightSummary: boolean | "basic" | "full" | "trends";
  hasExport: boolean | "csv" | "api";
  hasPriorityMatching: boolean;
  hasAbTesting: boolean;
  hasDedicatedSupport: boolean;
  stripePriceId: string | null;
};

export const PLAN_CONFIG: Record<PlanTier, PlanConfig> = {
  free: {
    price: 0,
    campaignsPerMonth: 1,
    baselineReachUnits: 75,
    reachPerDollar: 12,
    efficientZone: 15,
    minFundingAmount: 5,
    matchPriority: 1,
    maxAiQuestions: 3,
    hasInsightSummary: false,
    hasExport: false,
    hasPriorityMatching: false,
    hasAbTesting: false,
    hasDedicatedSupport: false,
    stripePriceId: null,
  },
  starter: {
    price: 19,
    campaignsPerMonth: 3,
    baselineReachUnits: 250,
    reachPerDollar: 18,
    efficientZone: 30,
    minFundingAmount: 5,
    matchPriority: 2,
    maxAiQuestions: 5,
    hasInsightSummary: "basic",
    hasExport: false,
    hasPriorityMatching: false,
    hasAbTesting: false,
    hasDedicatedSupport: false,
    stripePriceId: process.env.STRIPE_STARTER_PRICE_ID ?? null,
  },
  pro: {
    price: 49,
    campaignsPerMonth: 10,
    baselineReachUnits: 600,
    reachPerDollar: 24,
    efficientZone: 75,
    minFundingAmount: 3,
    matchPriority: 3,
    maxAiQuestions: 10,
    hasInsightSummary: "full",
    hasExport: "csv",
    hasPriorityMatching: true,
    hasAbTesting: false,
    hasDedicatedSupport: false,
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID ?? null,
  },
  scale: {
    price: 99,
    campaignsPerMonth: null, // unlimited
    baselineReachUnits: 1500,
    reachPerDollar: 30,
    efficientZone: 150,
    minFundingAmount: 3,
    matchPriority: 4,
    maxAiQuestions: 15,
    hasInsightSummary: "trends",
    hasExport: "api",
    hasPriorityMatching: true,
    hasAbTesting: true,
    hasDedicatedSupport: true,
    stripePriceId: process.env.STRIPE_SCALE_PRICE_ID ?? null,
  },
};

/* ─── Welcome Bonus (first-month free users) ─── */

export const WELCOME_BONUS = {
  campaignsFirstMonth: 1, // same as normal free limit — one great experience
  firstCampaignReachMultiplier: 1.5, // 1.5x baseline on first campaign (113 RU)
  fundingCreditCents: 200, // $2 credit on first campaign
  expiryDays: 14, // bonus expires after 14 days (not 30)
} as const;

/**
 * Absolute campaign strength thresholds (effective RU → strength 1–10).
 * Tier-independent so "strength 8" means the same thing everywhere.
 */
export const STRENGTH_THRESHOLDS = [0, 50, 100, 200, 400, 700, 1100, 1600, 2200, 3000] as const;

/* ─── Helpers ─── */

export const PLAN_TIERS: PlanTier[] = ["free", "starter", "pro", "scale"];

export function getPlanConfig(tier: PlanTier): PlanConfig {
  return PLAN_CONFIG[tier];
}

export function isValidTier(tier: string): tier is PlanTier {
  return PLAN_TIERS.includes(tier as PlanTier);
}

/** Platform fee rate applied to campaign reward pools */
export const PLATFORM_FEE_RATE = 0.15;
