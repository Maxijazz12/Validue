-- 030_schema_repair.sql
-- Repair schema drift: migrations 016-028 were marked as applied but
-- their DDL never ran on the remote DB. This migration idempotently
-- applies all missing columns, tables, constraints, and indexes.

-- ═══════════════════════════════════════════════════════════════
-- 016: scoring fields on responses
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE responses ADD COLUMN IF NOT EXISTS scoring_source text;
ALTER TABLE responses ADD COLUMN IF NOT EXISTS scoring_confidence numeric(3,2);

-- ═══════════════════════════════════════════════════════════════
-- 017: stability constraints + reach_impressions + scoring_history
-- ═══════════════════════════════════════════════════════════════

-- Clamp existing data
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

-- Constraints (safe with EXCEPTION handler)
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

DO $$ BEGIN
  ALTER TABLE payouts ADD CONSTRAINT chk_payout_fee_zero
    CHECK (platform_fee = 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE campaigns ADD CONSTRAINT chk_reach_served_nonneg
    CHECK (reach_served IS NULL OR reach_served >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

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

-- scoring_source CHECK
ALTER TABLE responses DROP CONSTRAINT IF EXISTS responses_scoring_source_check;
DO $$ BEGIN
  ALTER TABLE responses ADD CONSTRAINT responses_scoring_source_check
    CHECK (scoring_source IS NULL OR scoring_source IN ('ai', 'fallback', 'ai_low_confidence'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- reach_impressions table
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

DO $$ BEGIN
  CREATE POLICY "Users can insert own impressions"
    ON reach_impressions FOR INSERT
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can read own impressions"
    ON reach_impressions FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- scoring_history column
ALTER TABLE responses ADD COLUMN IF NOT EXISTS scoring_history jsonb DEFAULT '[]'::jsonb;

-- Payout dedup index
CREATE UNIQUE INDEX IF NOT EXISTS idx_payouts_response_unique
  ON payouts(response_id) WHERE status != 'failed';

-- State machine triggers
CREATE OR REPLACE FUNCTION check_campaign_status_transition()
RETURNS trigger AS $$
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;
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

CREATE OR REPLACE FUNCTION check_response_status_transition()
RETURNS trigger AS $$
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;
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

-- Backfill scoring_source
UPDATE responses
SET scoring_source = 'fallback', scoring_confidence = 0.5
WHERE status = 'ranked' AND scoring_source IS NULL;

UPDATE campaigns
SET effective_reach_units = COALESCE(total_reach_units, baseline_reach_units, 75)
WHERE effective_reach_units IS NULL AND status IN ('active', 'completed', 'paused');

-- ═══════════════════════════════════════════════════════════════
-- 018: self_response_guard (RLS policy)
-- ═══════════════════════════════════════════════════════════════
DO $$ BEGIN
  CREATE POLICY "Cannot respond to own campaign"
    ON responses FOR INSERT
    WITH CHECK (
      NOT EXISTS (
        SELECT 1 FROM campaigns
        WHERE campaigns.id = campaign_id
          AND campaigns.creator_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 020: campaign_reactions
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS campaign_reactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  reaction_type text NOT NULL CHECK (reaction_type IN ('fire', 'lightbulb', 'thumbsup', 'thinking')),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_user_campaign_reaction UNIQUE (user_id, campaign_id, reaction_type)
);

CREATE INDEX IF NOT EXISTS idx_reactions_campaign ON campaign_reactions(campaign_id);

ALTER TABLE campaign_reactions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Anyone reads reactions on active campaigns"
    ON campaign_reactions FOR SELECT
    USING (EXISTS (SELECT 1 FROM campaigns WHERE id = campaign_reactions.campaign_id AND status = 'active'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users insert own reactions"
    ON campaign_reactions FOR INSERT
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users delete own reactions"
    ON campaign_reactions FOR DELETE
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 021: notifications
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE,
  amount numeric,
  link text,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id) WHERE read_at IS NULL;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users read own notifications"
    ON notifications FOR SELECT
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users update own notifications"
    ON notifications FOR UPDATE
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Realtime (safe to re-run)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 022: fix response count RLS
-- ═══════════════════════════════════════════════════════════════
DO $$ BEGIN
  CREATE POLICY "Respondents can increment response count"
    ON campaigns FOR UPDATE
    USING (status = 'active')
    WITH CHECK (status = 'active');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 023: scoring_dimensions
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE responses ADD COLUMN IF NOT EXISTS scoring_dimensions jsonb;

-- ═══════════════════════════════════════════════════════════════
-- 024: notification types + insert policy
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('campaign_completed', 'payout_earned', 'new_response', 'ranking_complete', 'quality_feedback'));

DO $$ BEGIN
  CREATE POLICY "Authenticated users can create notifications"
    ON notifications FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 025: notification_preferences on profiles
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_preferences jsonb
  DEFAULT '{"new_response": true, "campaign_completed": true, "payout_earned": true, "ranking_complete": true, "quality_feedback": true}'::jsonb;

-- ═══════════════════════════════════════════════════════════════
-- 026: v2 economics
-- ═══════════════════════════════════════════════════════════════

-- Campaign columns
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS format text DEFAULT 'standard';
DO $$ BEGIN
  ALTER TABLE campaigns ADD CONSTRAINT campaigns_format_check CHECK (format IN ('quick', 'standard'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS expires_at timestamptz;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS is_subsidized boolean DEFAULT false;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS economics_version int DEFAULT 1;
DO $$ BEGIN
  ALTER TABLE campaigns ADD CONSTRAINT campaigns_economics_version_check CHECK (economics_version IN (1, 2));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Response columns
ALTER TABLE responses ADD COLUMN IF NOT EXISTS is_qualified boolean;
ALTER TABLE responses ADD COLUMN IF NOT EXISTS disqualification_reasons text[];
ALTER TABLE responses ADD COLUMN IF NOT EXISTS base_payout numeric(10,2);
ALTER TABLE responses ADD COLUMN IF NOT EXISTS bonus_payout numeric(10,2);
ALTER TABLE responses ADD COLUMN IF NOT EXISTS locked_at timestamptz;
ALTER TABLE responses ADD COLUMN IF NOT EXISTS available_at timestamptz;
ALTER TABLE responses ADD COLUMN IF NOT EXISTS money_state text;
DO $$ BEGIN
  ALTER TABLE responses ADD CONSTRAINT responses_money_state_check
    CHECK (money_state IN ('pending_qualification', 'locked', 'available', 'paid_out', 'not_qualified'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Profile balance columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pending_balance_cents int DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS available_balance_cents int DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_cashout_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subsidized_campaign_used boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS platform_credit_cents int DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS platform_credit_expires_at timestamptz;

-- Payout audit columns
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS base_amount numeric(10,2);
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS bonus_amount numeric(10,2);

-- Backfill existing paid responses as V1 available
UPDATE responses
SET base_payout = payout_amount,
    bonus_payout = 0,
    is_qualified = true,
    money_state = 'available'
WHERE payout_amount IS NOT NULL AND payout_amount > 0
  AND money_state IS NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_responses_respondent_daily
  ON responses (respondent_id, created_at)
  WHERE status != 'in_progress';

CREATE INDEX IF NOT EXISTS idx_responses_stale_in_progress
  ON responses (respondent_id, created_at)
  WHERE status = 'in_progress';

CREATE INDEX IF NOT EXISTS idx_campaigns_subsidized_monthly
  ON campaigns (created_at)
  WHERE is_subsidized = true;

CREATE INDEX IF NOT EXISTS idx_campaigns_expires_active
  ON campaigns (expires_at)
  WHERE status = 'active';

-- ═══════════════════════════════════════════════════════════════
-- 027: assumption_index + anchors on questions
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE questions ADD COLUMN IF NOT EXISTS assumption_index INT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS anchors JSONB;

-- ═══════════════════════════════════════════════════════════════
-- 028: normalize evidence categories
-- ═══════════════════════════════════════════════════════════════
UPDATE questions SET category = 'willingness' WHERE category = 'interest';
UPDATE questions SET category = 'price' WHERE category = 'payment';
