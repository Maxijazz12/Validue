-- V2 Monetization: quality-aware reach, campaign strength, welcome credit tracking

-- Campaign quality and effective reach columns
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS quality_score INT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS effective_reach_units INT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS campaign_strength INT;

-- Back-fill effective_reach_units from total_reach_units for existing campaigns
UPDATE campaigns
SET effective_reach_units = total_reach_units,
    campaign_strength = LEAST(10, GREATEST(1, CEIL(total_reach_units::numeric / 750 * 10)))
WHERE effective_reach_units IS NULL;

-- Welcome credit tracking on subscriptions
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS welcome_credit_used BOOLEAN NOT NULL DEFAULT false;

-- Update baseline defaults for v2 free tier (75 RU instead of 100)
ALTER TABLE campaigns ALTER COLUMN baseline_reach_units SET DEFAULT 75;
ALTER TABLE campaigns ALTER COLUMN total_reach_units SET DEFAULT 75;

-- Index for wall feed ordering now includes quality_score for v2 ranking
CREATE INDEX IF NOT EXISTS idx_campaigns_v2_distribution
  ON campaigns (status, quality_score, match_priority DESC, created_at DESC)
  WHERE status = 'active';
