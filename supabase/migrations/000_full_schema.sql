-- ============================================
-- VLDTA Full Schema (all migrations combined)
-- Safe to run even if some tables exist
-- ============================================

-- 001: Core tables
CREATE TABLE IF NOT EXISTS profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL CHECK (role IN ('founder', 'respondent')) DEFAULT 'founder',
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campaigns (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL CHECK (status IN ('draft', 'active', 'completed', 'paused')) DEFAULT 'draft',
  target_responses int DEFAULT 50,
  current_responses int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS questions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  text text NOT NULL,
  type text NOT NULL CHECK (type IN ('open', 'multiple_choice')) DEFAULT 'open',
  sort_order int NOT NULL DEFAULT 0,
  options jsonb
);

CREATE TABLE IF NOT EXISTS responses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  respondent_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL CHECK (status IN ('in_progress', 'submitted', 'ranked')) DEFAULT 'in_progress',
  quality_score numeric(3,2),
  payout_amount numeric(10,2),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS answers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  response_id uuid REFERENCES responses(id) ON DELETE CASCADE NOT NULL,
  question_id uuid REFERENCES questions(id) ON DELETE CASCADE NOT NULL,
  text text,
  metadata jsonb
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;

-- Policies (DROP IF EXISTS then CREATE to handle re-runs)
DROP POLICY IF EXISTS "Public profiles" ON profiles;
CREATE POLICY "Public profiles" ON profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users update own profile" ON profiles;
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Read active campaigns" ON campaigns;
CREATE POLICY "Read active campaigns" ON campaigns FOR SELECT USING (status = 'active' OR creator_id = auth.uid());
DROP POLICY IF EXISTS "Creators manage campaigns" ON campaigns;
CREATE POLICY "Creators manage campaigns" ON campaigns FOR ALL USING (creator_id = auth.uid());

DROP POLICY IF EXISTS "Read questions" ON questions;
CREATE POLICY "Read questions" ON questions FOR SELECT USING (
  EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = questions.campaign_id AND (campaigns.status = 'active' OR campaigns.creator_id = auth.uid()))
);
DROP POLICY IF EXISTS "Creators manage questions" ON questions;
CREATE POLICY "Creators manage questions" ON questions FOR ALL USING (
  EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = questions.campaign_id AND campaigns.creator_id = auth.uid())
);

DROP POLICY IF EXISTS "Respondents manage own" ON responses;
CREATE POLICY "Respondents manage own" ON responses FOR ALL USING (respondent_id = auth.uid());
DROP POLICY IF EXISTS "Creators read responses" ON responses;
CREATE POLICY "Creators read responses" ON responses FOR SELECT USING (
  EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = responses.campaign_id AND campaigns.creator_id = auth.uid())
);

DROP POLICY IF EXISTS "Respondents manage own answers" ON answers;
CREATE POLICY "Respondents manage own answers" ON answers FOR ALL USING (
  EXISTS (SELECT 1 FROM responses WHERE responses.id = answers.response_id AND responses.respondent_id = auth.uid())
);
DROP POLICY IF EXISTS "Creators read answers" ON answers;
CREATE POLICY "Creators read answers" ON answers FOR SELECT USING (
  EXISTS (SELECT 1 FROM responses r JOIN campaigns c ON c.id = r.campaign_id WHERE r.id = answers.response_id AND c.creator_id = auth.uid())
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'full_name', ''), COALESCE(new.raw_user_meta_data->>'role', 'founder'));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

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
-- Note: CHECK constraint added via DO block to avoid duplicate
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
