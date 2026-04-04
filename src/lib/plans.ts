import { planEnv } from "@/lib/env";

/* ─── Plan Tier Config ─── */

export const PLAN_TIERS = ["free", "pro"] as const;

export type PlanTier = (typeof PLAN_TIERS)[number];

export type PlanConfig = {
  price: number;
  campaignsPerMonth: number;
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
  stripePriceId: string | null;
};

export const PLAN_CONFIG: Record<PlanTier, PlanConfig> = {
  free: {
    price: 0,
    campaignsPerMonth: 1,
    baselineReachUnits: 150,
    reachPerDollar: 12,
    efficientZone: 15,
    minFundingAmount: 3,
    matchPriority: 1,
    maxAiQuestions: 5,
    hasInsightSummary: false,
    hasExport: false,
    hasPriorityMatching: false,
    stripePriceId: null,
  },
  pro: {
    price: 29,
    campaignsPerMonth: 5,
    baselineReachUnits: 300,
    reachPerDollar: 20,
    efficientZone: 50,
    minFundingAmount: 3,
    matchPriority: 3,
    maxAiQuestions: 10,
    hasInsightSummary: "full",
    hasExport: "csv",
    hasPriorityMatching: true,
    stripePriceId: null,
  },
};

/* ─── Welcome Bonus (first-month free users) ─── */

export const WELCOME_BONUS = {
  campaignsFirstMonth: 1, // same as normal free limit — one great experience
  firstCampaignReachMultiplier: 1.0, // disabled — baseline 150 RU is the welcome experience now
  fundingCreditCents: 200, // $2 credit on first campaign
  expiryDays: 14, // bonus expires after 14 days (not 30)
} as const;

/**
 * Absolute campaign strength thresholds (effective RU → strength 1–10).
 * Tier-independent so "strength 8" means the same thing everywhere.
 */
export const STRENGTH_THRESHOLDS = [0, 50, 100, 200, 400, 700, 1100, 1600, 2200, 3000] as const;

/* ─── Helpers ─── */

const LEGACY_TIER_MAP = {
  starter: "pro",
  scale: "pro",
} as const satisfies Record<string, PlanTier>;

export function getPlanConfig(tier: PlanTier): PlanConfig {
  if (tier === "pro") {
    return {
      ...PLAN_CONFIG.pro,
      stripePriceId: planEnv().STRIPE_PRO_PRICE_ID ?? null,
    };
  }

  return PLAN_CONFIG[tier];
}

export function isValidTier(tier: string): tier is PlanTier {
  return PLAN_TIERS.includes(tier as PlanTier);
}

export function normalizeTier(tier: string | null | undefined): PlanTier | null {
  if (!tier) return null;
  if (isValidTier(tier)) return tier;
  if (tier in LEGACY_TIER_MAP) {
    return LEGACY_TIER_MAP[tier as keyof typeof LEGACY_TIER_MAP];
  }
  return null;
}

/** Platform fee rate applied to campaign reward pools — 15% to maximize respondent payouts; subscriptions are the revenue engine */
export const PLATFORM_FEE_RATE = 0.15;
