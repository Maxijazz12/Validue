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
  RESPONDENT_PAYOUTS: false,

  /** Response activity page and sidebar link */
  EARNINGS_PAGE: true,

  /** Reputation tiers and badges in respondent-facing UI */
  REPUTATION_TIERS: false,

  /** Cashout / withdrawal flow */
  CASHOUT: false,

  /** Campaign funding via Stripe (founder pays for responses) */
  CAMPAIGN_FUNDING: false,

  /** Weekly digest banner */
  WEEKLY_DIGEST: false,
} as const;

export const RESPONDENT_ACTIVITY_LABEL = FEATURES.RESPONDENT_PAYOUTS
  ? "Earnings"
  : "Activity";

export const RESPONDENT_ACTIVITY_TITLE = FEATURES.RESPONDENT_PAYOUTS
  ? "Earnings"
  : "Response Activity";

export const RESPONDENT_ACTIVITY_DESCRIPTION = FEATURES.RESPONDENT_PAYOUTS
  ? "Track your earnings from responding to ideas"
  : "Track your responses and any legacy payout history while new responses stay feedback-only.";
