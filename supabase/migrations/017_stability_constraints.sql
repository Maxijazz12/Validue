-- ============================================================
-- 017_stability_constraints.sql
-- V2.1: Database-level guardrails for stability and integrity
-- ============================================================

-- ─── Backfill: Clamp existing data before adding constraints ───

UPDATE responses
SET quality_score = LEAST(GREATEST(quality_score, 0), 100)
WHERE quality_score IS NOT NULL AND (quality_score < 0 OR quality_score > 100);

UPDATE responses
SET scoring_confidence = LEAST(GREATEST(scoring_confidence, 0), 1)
WHERE scoring_confidence IS NOT NULL AND (scoring_confidence < 0 OR scoring_confidence > 1);

UPDATE payouts SET platform_fee = 0 WHERE platform_fee != 0;

UPDATE campaigns
SET effective_reach_units = GREATEST(effective_reach_units, reach_served)
WHERE reach_served IS NOT NULL AND effective_reach_units IS NOT NULL
  AND reach_served > effective_reach_units + 10;

UPDATE campaigns
SET reward_amount = GREATEST(reward_amount, 0)
WHERE reward_amount IS NOT NULL AND reward_amount < 0;

UPDATE campaigns
SET distributable_amount = LEAST(distributable_amount, reward_amount)
WHERE distributable_amount IS NOT NULL AND reward_amount IS NOT NULL
  AND distributable_amount > reward_amount;

-- ─── Score & Confidence Range Constraints ───
-- Using DO blocks to safely add constraints (PostgreSQL has no ADD CONSTRAINT IF NOT EXISTS)

DO $$ BEGIN
  ALTER TABLE responses ADD CONSTRAINT chk_quality_score_range
    CHECK (quality_score IS NULL OR (quality_score >= 0 AND quality_score <= 100));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE responses ADD CONSTRAINT chk_scoring_confidence_range
    CHECK (scoring_confidence IS NULL OR (scoring_confidence >= 0 AND scoring_confidence <= 1));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE profiles ADD CONSTRAINT chk_reputation_score_range
    CHECK (reputation_score IS NULL OR (reputation_score >= 0 AND reputation_score <= 100));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Monetary Non-Negative Constraints ───

DO $$ BEGIN
  ALTER TABLE campaigns ADD CONSTRAINT chk_reward_amount_nonneg
    CHECK (reward_amount IS NULL OR reward_amount >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE campaigns ADD CONSTRAINT chk_distributable_nonneg
    CHECK (distributable_amount IS NULL OR distributable_amount >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE campaigns ADD CONSTRAINT chk_distributable_lte_reward
    CHECK (distributable_amount IS NULL OR reward_amount IS NULL
           OR distributable_amount <= reward_amount);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE payouts ADD CONSTRAINT chk_payout_amount_nonneg
    CHECK (amount >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Platform fee must be 0 — fee is deducted at funding time, not per-payout
DO $$ BEGIN
  ALTER TABLE payouts ADD CONSTRAINT chk_payout_fee_zero
    CHECK (platform_fee = 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Reach Constraints ───

DO $$ BEGIN
  ALTER TABLE campaigns ADD CONSTRAINT chk_reach_served_nonneg
    CHECK (reach_served IS NULL OR reach_served >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Allow small buffer (+10) for race conditions in concurrent impression tracking
DO $$ BEGIN
  ALTER TABLE campaigns ADD CONSTRAINT chk_reach_served_lte_effective
    CHECK (reach_served IS NULL OR effective_reach_units IS NULL
           OR reach_served <= effective_reach_units + 10);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE campaigns ADD CONSTRAINT chk_campaign_strength_range
    CHECK (campaign_strength IS NULL OR (campaign_strength >= 1 AND campaign_strength <= 10));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Update scoring_source CHECK to include ai_low_confidence ───

ALTER TABLE responses DROP CONSTRAINT IF EXISTS responses_scoring_source_check;
DO $$ BEGIN
  ALTER TABLE responses ADD CONSTRAINT responses_scoring_source_check
    CHECK (scoring_source IS NULL OR scoring_source IN ('ai', 'fallback', 'ai_low_confidence'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Reach Impressions Dedup Table ───

CREATE TABLE IF NOT EXISTS reach_impressions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  campaign_id uuid NOT NULL REFERENCES campaigns(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, campaign_id)
);

CREATE INDEX IF NOT EXISTS idx_reach_impressions_campaign
  ON reach_impressions(campaign_id);

ALTER TABLE reach_impressions ENABLE ROW LEVEL SECURITY;

-- Users can record their own impressions
DO $$ BEGIN
  CREATE POLICY "Users can insert own impressions"
    ON reach_impressions FOR INSERT
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Users can read their own impressions (for client-side dedup check)
DO $$ BEGIN
  CREATE POLICY "Users can read own impressions"
    ON reach_impressions FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Score History Column ───

ALTER TABLE responses ADD COLUMN IF NOT EXISTS scoring_history jsonb DEFAULT '[]'::jsonb;

-- ─── Payout Dedup Index ───
-- Prevents duplicate payouts for the same response (excluding failed attempts)

CREATE UNIQUE INDEX IF NOT EXISTS idx_payouts_response_unique
  ON payouts(response_id) WHERE status != 'failed';

-- ─── State Machine Triggers ───

-- Campaign status transitions
CREATE OR REPLACE FUNCTION check_campaign_status_transition()
RETURNS trigger AS $$
BEGIN
  -- Allow same-status updates (no-op transitions)
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'completed' THEN
    RAISE EXCEPTION 'Cannot transition from completed status';
  END IF;
  IF OLD.status = 'pending_funding' AND NEW.status NOT IN ('active') THEN
    RAISE EXCEPTION 'pending_funding can only transition to active';
  END IF;
  IF OLD.status = 'paused' AND NEW.status NOT IN ('active', 'completed') THEN
    RAISE EXCEPTION 'paused can only transition to active or completed';
  END IF;
  IF OLD.status = 'active' AND NEW.status NOT IN ('paused', 'completed') THEN
    RAISE EXCEPTION 'active can only transition to paused or completed';
  END IF;
  IF OLD.status = 'draft' AND NEW.status NOT IN ('pending_funding', 'active') THEN
    RAISE EXCEPTION 'draft can only transition to pending_funding or active';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_campaign_status ON campaigns;
CREATE TRIGGER enforce_campaign_status
  BEFORE UPDATE OF status ON campaigns
  FOR EACH ROW EXECUTE FUNCTION check_campaign_status_transition();

-- Response status transitions
CREATE OR REPLACE FUNCTION check_response_status_transition()
RETURNS trigger AS $$
BEGIN
  -- Allow same-status updates (no-op transitions)
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'ranked' THEN
    RAISE EXCEPTION 'Cannot revert from ranked status';
  END IF;
  IF OLD.status = 'submitted' AND NEW.status NOT IN ('ranked') THEN
    RAISE EXCEPTION 'submitted can only transition to ranked';
  END IF;
  IF OLD.status = 'in_progress' AND NEW.status NOT IN ('submitted') THEN
    RAISE EXCEPTION 'in_progress can only transition to submitted';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_response_status ON responses;
CREATE TRIGGER enforce_response_status
  BEFORE UPDATE OF status ON responses
  FOR EACH ROW EXECUTE FUNCTION check_response_status_transition();

-- ─── Backfill: Old rows without scoring_source ───

UPDATE responses
SET scoring_source = 'fallback', scoring_confidence = 0.5
WHERE status = 'ranked' AND scoring_source IS NULL;

-- ─── Backfill: Campaigns without effective_reach_units ───

UPDATE campaigns
SET effective_reach_units = COALESCE(total_reach_units, baseline_reach_units, 75)
WHERE effective_reach_units IS NULL AND status IN ('active', 'completed', 'paused');
