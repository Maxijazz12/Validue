-- V2 Economics: base + bonus payout model, campaign formats, expiration, money states
-- See plan: fluttering-hopping-shell.md

/* ─── Campaign format and lifecycle ─── */

ALTER TABLE campaigns ADD COLUMN format text DEFAULT 'standard'
  CHECK (format IN ('quick', 'standard'));

ALTER TABLE campaigns ADD COLUMN expires_at timestamptz;

ALTER TABLE campaigns ADD COLUMN is_subsidized boolean DEFAULT false;

-- Controls which payout logic applies (1 = power-law V1, 2 = base+bonus V2)
ALTER TABLE campaigns ADD COLUMN economics_version int DEFAULT 1
  CHECK (economics_version IN (1, 2));

/* ─── Response qualification and money state ─── */

ALTER TABLE responses ADD COLUMN is_qualified boolean;

ALTER TABLE responses ADD COLUMN disqualification_reasons text[];

ALTER TABLE responses ADD COLUMN base_payout numeric(10,2);

ALTER TABLE responses ADD COLUMN bonus_payout numeric(10,2);

ALTER TABLE responses ADD COLUMN locked_at timestamptz;

ALTER TABLE responses ADD COLUMN available_at timestamptz;

ALTER TABLE responses ADD COLUMN money_state text
  CHECK (money_state IN ('pending_qualification', 'locked', 'available', 'paid_out', 'not_qualified'));

/* ─── Respondent balance tracking ─── */

ALTER TABLE profiles ADD COLUMN pending_balance_cents int DEFAULT 0;

ALTER TABLE profiles ADD COLUMN available_balance_cents int DEFAULT 0;

ALTER TABLE profiles ADD COLUMN last_cashout_at timestamptz;

/* ─── Subsidy and founder credit ─── */

ALTER TABLE profiles ADD COLUMN subsidized_campaign_used boolean DEFAULT false;

ALTER TABLE profiles ADD COLUMN platform_credit_cents int DEFAULT 0;

ALTER TABLE profiles ADD COLUMN platform_credit_expires_at timestamptz;

/* ─── Payout audit columns ─── */

ALTER TABLE payouts ADD COLUMN base_amount numeric(10,2);

ALTER TABLE payouts ADD COLUMN bonus_amount numeric(10,2);

/* ─── Back-fill existing data ─── */

-- Existing paid responses are V1 — treat as fully available
UPDATE responses
SET base_payout = payout_amount,
    bonus_payout = 0,
    is_qualified = true,
    money_state = 'available'
WHERE payout_amount IS NOT NULL AND payout_amount > 0;

/* ─── Indexes ─── */

-- Daily completed-response cap check
CREATE INDEX idx_responses_respondent_daily
  ON responses (respondent_id, created_at)
  WHERE status != 'in_progress';

-- Stale in-progress cleanup
CREATE INDEX idx_responses_stale_in_progress
  ON responses (respondent_id, created_at)
  WHERE status = 'in_progress';

-- Subsidy monthly cap check
CREATE INDEX idx_campaigns_subsidized_monthly
  ON campaigns (created_at)
  WHERE is_subsidized = true;

-- Campaign expiration cron
CREATE INDEX idx_campaigns_expires_active
  ON campaigns (expires_at)
  WHERE status = 'active';
