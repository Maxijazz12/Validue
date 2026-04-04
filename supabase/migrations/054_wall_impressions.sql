-- Migration 054: Wall Impressions for Funnel Analytics
--
-- Tracks which campaigns each respondent sees on The Wall.
-- One impression per user per campaign (first-seen only via UNIQUE).
-- Enables the founder audience funnel: shown → started → submitted → qualified → paid.

CREATE TABLE IF NOT EXISTS wall_impressions (
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  match_score smallint,
  match_bucket text,
  shown_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (campaign_id, user_id)
);

-- Bucket must be a valid value when present
DO $$
BEGIN
  ALTER TABLE wall_impressions ADD CONSTRAINT wall_impressions_match_bucket_check
    CHECK (match_bucket IS NULL OR match_bucket IN ('core', 'adjacent', 'off_target'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Score must be 0-100 when present
DO $$
BEGIN
  ALTER TABLE wall_impressions ADD CONSTRAINT wall_impressions_match_score_range
    CHECK (match_score IS NULL OR (match_score >= 0 AND match_score <= 100));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Index for founder analytics queries (funnel by campaign)
CREATE INDEX IF NOT EXISTS idx_wall_impressions_campaign
  ON wall_impressions(campaign_id);

-- RLS
ALTER TABLE wall_impressions ENABLE ROW LEVEL SECURITY;

-- Founders can read impressions for their own campaigns
CREATE POLICY "Founders read own campaign impressions"
  ON wall_impressions FOR SELECT
  USING (campaign_id IN (SELECT id FROM campaigns WHERE creator_id = auth.uid()));

-- Respondents can insert their own impression rows
CREATE POLICY "Users insert own impressions"
  ON wall_impressions FOR INSERT
  WITH CHECK (user_id = auth.uid());
