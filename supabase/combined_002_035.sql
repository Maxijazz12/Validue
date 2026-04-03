-- ══════════════════════════════════════════════════════════════════════
-- VLDTA Combined Migration: 002 → 035
-- Idempotent — safe to re-run. Paste into Supabase SQL Editor and Run.
-- ══════════════════════════════════════════════════════════════════════

-- ═══ 002: Wall columns on campaigns ═══
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS estimated_minutes int DEFAULT 5;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS reward_amount numeric(10,2) DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS deadline timestamptz;

-- ═══ 003: Onboarding fields on profiles ═══
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS has_responded boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS has_posted boolean DEFAULT false;

-- ═══ 004: Reward signals on campaigns ═══
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS bonus_available boolean DEFAULT false;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS rewards_top_answers boolean DEFAULT false;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS reward_type text DEFAULT 'fixed';
DO $$ BEGIN
  ALTER TABLE campaigns ADD CONSTRAINT campaigns_reward_type_check
    CHECK (reward_type IN ('fixed', 'pool', 'top_only'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ═══ 005: Respondent profile fields ═══
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS interests text[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS expertise text[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS age_range text;
DO $$ BEGIN
  ALTER TABLE profiles ADD CONSTRAINT profiles_age_range_check
    CHECK (age_range IN ('18-24','25-34','35-44','45-54','55+'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS occupation text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_completed boolean DEFAULT false;

-- ═══ 006: Campaign targeting ═══
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_interests text[] DEFAULT '{}';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_expertise text[] DEFAULT '{}';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_age_ranges text[] DEFAULT '{}';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_location text;

-- ═══ 007: Question baseline flag ═══
ALTER TABLE questions ADD COLUMN IF NOT EXISTS is_baseline boolean DEFAULT false;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS category text;

-- ═══ 008: Campaign assumptions + audience ═══
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS key_assumptions text[];
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS audience_occupation text;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS audience_industry text;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS audience_experience_level text;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS audience_niche_qualifier text;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS quality_scores jsonb;

-- ═══ 009: Answer unique constraint ═══
DO $$ BEGIN
  ALTER TABLE answers ADD CONSTRAINT answers_response_question_unique
    UNIQUE (response_id, question_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ═══ 010: Ranking fields ═══
-- Widen quality_score (safe if already wider)
DO $$ BEGIN
  ALTER TABLE responses ALTER COLUMN quality_score TYPE numeric(5,2);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE responses ADD COLUMN IF NOT EXISTS ranked_at timestamptz;
ALTER TABLE responses ADD COLUMN IF NOT EXISTS ai_feedback text;

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS ranking_status text DEFAULT 'unranked';
DO $$ BEGIN
  ALTER TABLE campaigns ADD CONSTRAINT campaigns_ranking_status_check
    CHECK (ranking_status IN ('unranked', 'ranking', 'ranked'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ═══ 011: Payout system ═══
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS payout_status text DEFAULT 'none';
DO $$ BEGIN
  ALTER TABLE campaigns ADD CONSTRAINT campaigns_payout_status_check
    CHECK (payout_status IN ('none', 'allocated', 'completed'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS distributable_amount numeric(10,2);

-- payouts table (may already exist)
CREATE TABLE IF NOT EXISTS payouts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  response_id uuid REFERENCES responses(id) ON DELETE CASCADE NOT NULL,
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  founder_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  respondent_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount numeric(10,2) NOT NULL,
  platform_fee numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Founders manage own payouts" ON payouts FOR ALL USING (founder_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Respondents read own payouts" ON payouts FOR SELECT USING (respondent_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ═══ 012: Reputation ═══
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS reputation_score numeric(5,2) DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS reputation_tier text DEFAULT 'new';
DO $$ BEGIN
  ALTER TABLE profiles ADD CONSTRAINT profiles_reputation_tier_check
    CHECK (reputation_tier IN ('new', 'bronze', 'silver', 'gold', 'platinum'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_responses_completed int DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS average_quality_score numeric(5,2) DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_earned numeric(10,2) DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS reputation_updated_at timestamptz;

-- ═══ 013: Stripe fields ═══
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS funded_at TIMESTAMPTZ;

-- Update status constraint to include pending_funding (will be overwritten by 035)
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_status_check;
ALTER TABLE campaigns ADD CONSTRAINT campaigns_status_check
  CHECK (status IN ('draft', 'pending_funding', 'active', 'completed', 'paused'));

-- ═══ 014: Subscriptions + reach ═══
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro')),
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
  current_period_start TIMESTAMPTZ DEFAULT now(),
  current_period_end TIMESTAMPTZ,
  campaigns_used_this_period INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users read own subscription"
    ON subscriptions FOR SELECT USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role manages subscriptions"
    ON subscriptions FOR ALL USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Campaign reach columns
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS baseline_reach_units INT NOT NULL DEFAULT 100;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS funded_reach_units INT NOT NULL DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS total_reach_units INT NOT NULL DEFAULT 100;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS reach_served INT NOT NULL DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS estimated_responses_low INT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS estimated_responses_high INT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS match_priority INT NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_campaigns_distribution
  ON campaigns (match_priority DESC, total_reach_units, reach_served)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions (user_id);

-- ═══ 015: V2 monetization ═══
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS quality_score INT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS effective_reach_units INT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS campaign_strength INT;

UPDATE campaigns
SET effective_reach_units = total_reach_units,
    campaign_strength = LEAST(10, GREATEST(1, CEIL(total_reach_units::numeric / 750 * 10)))
WHERE effective_reach_units IS NULL;

ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS welcome_credit_used BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_campaigns_v2_distribution
  ON campaigns (status, quality_score, match_priority DESC, created_at DESC)
  WHERE status = 'active';

-- ═══ 030: Schema repair (covers 016-028 idempotently) ═══

-- 016: scoring fields
ALTER TABLE responses ADD COLUMN IF NOT EXISTS scoring_source text;
ALTER TABLE responses ADD COLUMN IF NOT EXISTS scoring_confidence numeric(3,2);

-- 017: stability constraints
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

ALTER TABLE responses DROP CONSTRAINT IF EXISTS responses_scoring_source_check;
DO $$ BEGIN
  ALTER TABLE responses ADD CONSTRAINT responses_scoring_source_check
    CHECK (scoring_source IS NULL OR scoring_source IN ('ai', 'fallback', 'ai_low_confidence'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- reach_impressions
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

ALTER TABLE responses ADD COLUMN IF NOT EXISTS scoring_history jsonb DEFAULT '[]'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payouts_response_unique
  ON payouts(response_id) WHERE status != 'failed';

-- State machine triggers (will be overwritten by 035)
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
  IF OLD.status = 'in_progress' AND NEW.status NOT IN ('submitted', 'abandoned') THEN
    RAISE EXCEPTION 'in_progress can only transition to submitted or abandoned';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_response_status ON responses;
CREATE TRIGGER enforce_response_status
  BEFORE UPDATE OF status ON responses
  FOR EACH ROW EXECUTE FUNCTION check_response_status_transition();

UPDATE responses
SET scoring_source = 'fallback', scoring_confidence = 0.5
WHERE status = 'ranked' AND scoring_source IS NULL;

UPDATE campaigns
SET effective_reach_units = COALESCE(total_reach_units, baseline_reach_units, 75)
WHERE effective_reach_units IS NULL AND status IN ('active', 'completed', 'paused');

-- 018: self-response guard
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

-- 020: campaign_reactions
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
    ON campaign_reactions FOR INSERT WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users delete own reactions"
    ON campaign_reactions FOR DELETE USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 021: notifications
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
    ON notifications FOR SELECT USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users update own notifications"
    ON notifications FOR UPDATE USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 022: response count RLS
DO $$ BEGIN
  CREATE POLICY "Respondents can increment response count"
    ON campaigns FOR UPDATE USING (status = 'active') WITH CHECK (status = 'active');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 023: scoring dimensions
ALTER TABLE responses ADD COLUMN IF NOT EXISTS scoring_dimensions jsonb;

-- 024: notification types
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('campaign_completed', 'payout_earned', 'new_response', 'ranking_complete', 'quality_feedback'));

DO $$ BEGIN
  CREATE POLICY "Authenticated users can create notifications"
    ON notifications FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 025: notification preferences
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_preferences jsonb
  DEFAULT '{"new_response": true, "campaign_completed": true, "payout_earned": true, "ranking_complete": true, "quality_feedback": true}'::jsonb;

-- 026: v2 economics
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

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pending_balance_cents int DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS available_balance_cents int DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_cashout_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subsidized_campaign_used boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS platform_credit_cents int DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS platform_credit_expires_at timestamptz;

ALTER TABLE payouts ADD COLUMN IF NOT EXISTS base_amount numeric(10,2);
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS bonus_amount numeric(10,2);

UPDATE responses
SET base_payout = payout_amount, bonus_payout = 0, is_qualified = true, money_state = 'available'
WHERE payout_amount IS NOT NULL AND payout_amount > 0 AND money_state IS NULL;

CREATE INDEX IF NOT EXISTS idx_responses_respondent_daily
  ON responses (respondent_id, created_at) WHERE status != 'in_progress';
CREATE INDEX IF NOT EXISTS idx_responses_stale_in_progress
  ON responses (respondent_id, created_at) WHERE status = 'in_progress';
CREATE INDEX IF NOT EXISTS idx_campaigns_subsidized_monthly
  ON campaigns (created_at) WHERE is_subsidized = true;
CREATE INDEX IF NOT EXISTS idx_campaigns_expires_active
  ON campaigns (expires_at) WHERE status = 'active';

-- 027: assumption_index + anchors
ALTER TABLE questions ADD COLUMN IF NOT EXISTS assumption_index INT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS anchors JSONB;

-- 028: normalize evidence categories
UPDATE questions SET category = 'willingness' WHERE category = 'interest';
UPDATE questions SET category = 'price' WHERE category = 'payment';

-- ═══ 029: Longitudinal ═══
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS parent_campaign_id uuid REFERENCES campaigns(id) ON DELETE SET NULL;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS round_number int NOT NULL DEFAULT 1;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS brief_verdicts jsonb;

-- ═══ 031: Brief cache ═══
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS brief_cache jsonb DEFAULT NULL;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS brief_cached_at timestamptz DEFAULT NULL;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS brief_response_count int DEFAULT NULL;

-- ═══ 032: Unlimited kranstad accounts ═══
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS campaign_limit_override int DEFAULT NULL;

INSERT INTO profiles (id, full_name, role)
SELECT id, COALESCE(raw_user_meta_data->>'full_name', 'Max Kranstad'), 'founder'
FROM auth.users WHERE email ILIKE '%kranstad%'
ON CONFLICT (id) DO NOTHING;

INSERT INTO subscriptions (user_id, tier, status, campaigns_used_this_period, campaign_limit_override)
SELECT id, 'pro', 'active', 0, 999999
FROM auth.users WHERE email ILIKE '%kranstad%'
ON CONFLICT (user_id) DO UPDATE
SET tier = 'pro',
    campaigns_used_this_period = 0,
    campaign_limit_override = 999999,
    updated_at = now();

-- ═══ 033: Campaign auto-extend ═══
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS auto_extended BOOLEAN NOT NULL DEFAULT FALSE;

-- ═══ 034: Partial responses + reciprocal gate ═══
ALTER TABLE responses ADD COLUMN IF NOT EXISTS assigned_question_ids uuid[];
ALTER TABLE responses ADD COLUMN IF NOT EXISTS is_partial boolean NOT NULL DEFAULT false;

-- Fix response status constraint: add 'abandoned'
DO $$
BEGIN
  EXECUTE (
    SELECT 'ALTER TABLE responses DROP CONSTRAINT ' || quote_ident(conname)
    FROM pg_constraint
    WHERE conrelid = 'responses'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%in_progress%submitted%ranked%'
    LIMIT 1
  );
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

ALTER TABLE responses DROP CONSTRAINT IF EXISTS responses_status_check;
DO $$ BEGIN
  ALTER TABLE responses ADD CONSTRAINT responses_status_check
    CHECK (status IN ('in_progress', 'submitted', 'ranked', 'abandoned'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS reciprocal_gate_status text;
DO $$ BEGIN
  ALTER TABLE campaigns ADD CONSTRAINT campaigns_reciprocal_gate_check
    CHECK (reciprocal_gate_status IS NULL OR reciprocal_gate_status IN ('pending', 'cleared', 'exempt'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS reciprocal_responses_completed int NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_responses_campaign_partial
  ON responses (campaign_id) WHERE is_partial = true;
CREATE INDEX IF NOT EXISTS idx_campaigns_reciprocal_pending
  ON campaigns (reciprocal_gate_status) WHERE reciprocal_gate_status = 'pending';

-- ═══ 035: pending_gate campaign status ═══
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_status_check;
ALTER TABLE campaigns ADD CONSTRAINT campaigns_status_check
  CHECK (status IN ('draft', 'pending_funding', 'pending_gate', 'active', 'completed', 'paused'));

CREATE OR REPLACE FUNCTION check_campaign_status_transition()
RETURNS trigger AS $$
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;
  IF OLD.status = 'completed' THEN
    RAISE EXCEPTION 'Cannot transition from completed status';
  END IF;
  IF OLD.status = 'pending_funding' AND NEW.status NOT IN ('active', 'pending_gate') THEN
    RAISE EXCEPTION 'pending_funding can only transition to active or pending_gate';
  END IF;
  IF OLD.status = 'pending_gate' AND NEW.status NOT IN ('active') THEN
    RAISE EXCEPTION 'pending_gate can only transition to active';
  END IF;
  IF OLD.status = 'paused' AND NEW.status NOT IN ('active', 'completed') THEN
    RAISE EXCEPTION 'paused can only transition to active or completed';
  END IF;
  IF OLD.status = 'active' AND NEW.status NOT IN ('paused', 'completed') THEN
    RAISE EXCEPTION 'active can only transition to paused or completed';
  END IF;
  IF OLD.status = 'draft' AND NEW.status NOT IN ('pending_funding', 'pending_gate', 'active') THEN
    RAISE EXCEPTION 'draft can only transition to pending_funding, pending_gate, or active';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

UPDATE campaigns
SET status = 'pending_gate'
WHERE status = 'pending_funding'
  AND reciprocal_gate_status = 'pending';

-- ══════════════════════════════════════════════════════════════════════
-- DONE. All migrations 002-035 applied.
-- ══════════════════════════════════════════════════════════════════════
