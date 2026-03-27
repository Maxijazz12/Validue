-- ============================================
-- VLDTA Schema Sync
-- Run this once in Supabase SQL Editor to ensure
-- all columns exist. Safe to re-run (idempotent).
-- After success, delete old ad-hoc snippets.
-- ============================================

-- 002: Wall columns
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS estimated_minutes int DEFAULT 5;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS reward_amount numeric(10,2) DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS deadline timestamptz;

-- 003: Onboarding
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS has_responded boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS has_posted boolean DEFAULT false;

-- 004: Reward signals
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS bonus_available boolean DEFAULT false;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS rewards_top_answers boolean DEFAULT false;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS reward_type text DEFAULT 'fixed';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'campaigns_reward_type_check') THEN
    ALTER TABLE campaigns ADD CONSTRAINT campaigns_reward_type_check CHECK (reward_type IN ('fixed', 'pool', 'top_only'));
  END IF;
END $$;

-- 005: Respondent profile
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS interests text[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS expertise text[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS age_range text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS occupation text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_completed boolean DEFAULT false;

-- 006: Campaign targeting
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_interests text[] DEFAULT '{}';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_expertise text[] DEFAULT '{}';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_age_ranges text[] DEFAULT '{}';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_location text;

-- 007: Question baseline flag
ALTER TABLE questions ADD COLUMN IF NOT EXISTS is_baseline boolean DEFAULT false;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS category text;

-- 008: Campaign assumptions & audience
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS key_assumptions text[];
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS audience_occupation text;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS audience_industry text;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS audience_experience_level text;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS audience_niche_qualifier text;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS quality_scores jsonb;

-- 009: Answer unique constraint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'answers_response_question_unique') THEN
    ALTER TABLE answers ADD CONSTRAINT answers_response_question_unique UNIQUE (response_id, question_id);
  END IF;
END $$;

-- 010: Ranking fields
ALTER TABLE responses ALTER COLUMN quality_score TYPE numeric(5,2);
ALTER TABLE responses ADD COLUMN IF NOT EXISTS ranked_at timestamptz;
ALTER TABLE responses ADD COLUMN IF NOT EXISTS ai_feedback text;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS ranking_status text DEFAULT 'unranked';

-- 011: Payout system
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS payout_status text DEFAULT 'none';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS distributable_amount numeric(10,2);

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
DROP POLICY IF EXISTS "Founders manage own payouts" ON payouts;
CREATE POLICY "Founders manage own payouts" ON payouts FOR ALL USING (founder_id = auth.uid());
DROP POLICY IF EXISTS "Respondents read own payouts" ON payouts;
CREATE POLICY "Respondents read own payouts" ON payouts FOR SELECT USING (respondent_id = auth.uid());

-- 012: Reputation
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS reputation_score numeric(5,2) DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS reputation_tier text DEFAULT 'new';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_responses_completed int DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS average_quality_score numeric(5,2) DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_earned numeric(10,2) DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS reputation_updated_at timestamptz;

-- ============================================
-- Publish Campaign RPC function
-- Bypasses PostgREST schema cache by using
-- direct SQL. Atomic: campaign + questions
-- in one transaction.
-- ============================================
CREATE OR REPLACE FUNCTION public.publish_campaign(payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_campaign_id uuid;
  v_question jsonb;
  v_sort int := 0;
BEGIN
  INSERT INTO campaigns (
    creator_id, title, description, status,
    category, tags, estimated_minutes,
    reward_amount, reward_type, bonus_available, rewards_top_answers,
    distributable_amount,
    target_interests, target_expertise, target_age_ranges, target_location,
    key_assumptions,
    audience_occupation, audience_industry, audience_experience_level, audience_niche_qualifier,
    quality_scores
  ) VALUES (
    (payload->>'creator_id')::uuid,
    payload->>'title',
    payload->>'description',
    'active',
    payload->>'category',
    COALESCE((SELECT array_agg(t.val) FROM jsonb_array_elements_text(payload->'tags') AS t(val)), '{}'),
    COALESCE((payload->>'estimated_minutes')::int, 5),
    COALESCE((payload->>'reward_amount')::numeric, 0),
    COALESCE(payload->>'reward_type', 'pool'),
    COALESCE((payload->>'bonus_available')::boolean, false),
    COALESCE((payload->>'rewards_top_answers')::boolean, false),
    COALESCE((payload->>'distributable_amount')::numeric, 0),
    COALESCE((SELECT array_agg(t.val) FROM jsonb_array_elements_text(payload->'target_interests') AS t(val)), '{}'),
    COALESCE((SELECT array_agg(t.val) FROM jsonb_array_elements_text(payload->'target_expertise') AS t(val)), '{}'),
    COALESCE((SELECT array_agg(t.val) FROM jsonb_array_elements_text(payload->'target_age_ranges') AS t(val)), '{}'),
    payload->>'target_location',
    COALESCE((SELECT array_agg(t.val) FROM jsonb_array_elements_text(payload->'key_assumptions') AS t(val)), '{}'),
    payload->>'audience_occupation',
    payload->>'audience_industry',
    payload->>'audience_experience_level',
    payload->>'audience_niche_qualifier',
    payload->'quality_scores'
  )
  RETURNING id INTO v_campaign_id;

  FOR v_question IN SELECT * FROM jsonb_array_elements(payload->'questions')
  LOOP
    INSERT INTO questions (campaign_id, text, type, sort_order, options, is_baseline, category)
    VALUES (
      v_campaign_id,
      v_question->>'text',
      COALESCE(v_question->>'type', 'open'),
      v_sort,
      CASE WHEN v_question->'options' IS NOT NULL AND v_question->'options' != 'null'::jsonb
           THEN v_question->'options' ELSE NULL END,
      COALESCE((v_question->>'is_baseline')::boolean, false),
      v_question->>'category'
    );
    v_sort := v_sort + 1;
  END LOOP;

  RETURN v_campaign_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.publish_campaign(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.publish_campaign(jsonb) TO anon;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload';
