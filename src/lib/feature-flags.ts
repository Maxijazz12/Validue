/**
 * Feature Flags — Phase 1 Mothballing
 *
 * These flags hide Phase 2 features (paid respondent flows) from the active UX
 * while keeping all code intact. Flip to true when ready to re-enable.
 *
 * Why flags instead of deletion: the code is tested and correct. We want to
 * bring it back when respondent volume justifies paid flows.
 */

export const FEATURES = {
  /** Stripe payout flow — respondents earning money per response */
  RESPONDENT_PAYOUTS: true,

  /** Reputation tiers and badges in respondent-facing UI */
  REPUTATION_TIERS: true,

  /** Cashout / withdrawal flow */
  CASHOUT: true,

  /** Campaign funding via Stripe (founder pays for responses) */
  CAMPAIGN_FUNDING: true,

  /** Weekly digest banner */
  WEEKLY_DIGEST: false,
} as const;
