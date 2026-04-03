-- 042: Missing indexes and constraints
--
-- 1. Index on campaigns(creator_id) for "my campaigns" queries
-- 2. Compound index on responses(respondent_id, campaign_id) for duplicate checks
-- 3. Index on payouts(founder_id) for payout lookups
-- 4. UNIQUE constraint on stripe_connect_account_id to prevent sharing

-- ─── Performance indexes ───

CREATE INDEX IF NOT EXISTS idx_campaigns_creator_id
  ON campaigns (creator_id);

-- Compound index for daily cap checks and duplicate lookups
-- (the partial unique index from 039 covers active statuses; this covers all lookups)
CREATE INDEX IF NOT EXISTS idx_responses_respondent_campaign
  ON responses (respondent_id, campaign_id);

CREATE INDEX IF NOT EXISTS idx_payouts_founder_id
  ON payouts (founder_id);

-- ─── Stripe Connect: one Connect account per profile ───

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_stripe_connect_account_id
  ON profiles (stripe_connect_account_id)
  WHERE stripe_connect_account_id IS NOT NULL;
