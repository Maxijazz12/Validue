/* ─── Plan Tier Config ─── */

export type PlanTier = "free" | "starter" | "pro" | "scale";

export type PlanConfig = {
  price: number;
  campaignsPerMonth: number;
  baselineReachUnits: number;
  reachPerDollar: number;
  minFundingAmount: number;
  matchPriority: number; // 1-4, higher = better
  maxAiQuestions: number;
  hasInsightSummary: boolean;
  hasExport: boolean;
  stripePriceId: string | null;
};

export const PLAN_CONFIG: Record<PlanTier, PlanConfig> = {
  free: {
    price: 0,
    campaignsPerMonth: 1,
    baselineReachUnits: 100,
    reachPerDollar: 15,
    minFundingAmount: 5,
    matchPriority: 1,
    maxAiQuestions: 3,
    hasInsightSummary: false,
    hasExport: false,
    stripePriceId: null,
  },
  starter: {
    price: 19,
    campaignsPerMonth: 3,
    baselineReachUnits: 250,
    reachPerDollar: 20,
    minFundingAmount: 5,
    matchPriority: 2,
    maxAiQuestions: 5,
    hasInsightSummary: true,
    hasExport: false,
    stripePriceId: process.env.STRIPE_STARTER_PRICE_ID ?? null,
  },
  pro: {
    price: 49,
    campaignsPerMonth: 8,
    baselineReachUnits: 600,
    reachPerDollar: 24,
    minFundingAmount: 3,
    matchPriority: 3,
    maxAiQuestions: 8,
    hasInsightSummary: true,
    hasExport: false,
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID ?? null,
  },
  scale: {
    price: 99,
    campaignsPerMonth: 20,
    baselineReachUnits: 1500,
    reachPerDollar: 28,
    minFundingAmount: 3,
    matchPriority: 4,
    maxAiQuestions: 12,
    hasInsightSummary: true,
    hasExport: true,
    stripePriceId: process.env.STRIPE_SCALE_PRICE_ID ?? null,
  },
};

/* ─── Welcome Bonus (first-month free users) ─── */

export const WELCOME_BONUS = {
  campaignsFirstMonth: 3, // instead of free tier's 1
  firstCampaignReachMultiplier: 2, // 2x baseline on first campaign
} as const;

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
