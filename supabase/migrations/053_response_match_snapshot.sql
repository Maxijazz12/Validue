-- Migration 053: Snapshot match score at response start
--
-- Captures the audience-match score and bucket classification when a respondent
-- begins a response. Enables funnel analytics (WS4) and brief segmentation (WS5).
--
-- Both columns are nullable so existing rows don't need immediate backfill.

ALTER TABLE responses ADD COLUMN IF NOT EXISTS match_score_at_start smallint;
ALTER TABLE responses ADD COLUMN IF NOT EXISTS match_bucket text;

-- Score must be 0-100 when present
DO $$
BEGIN
  ALTER TABLE responses ADD CONSTRAINT responses_match_score_range
    CHECK (match_score_at_start IS NULL OR (match_score_at_start >= 0 AND match_score_at_start <= 100));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Bucket must be one of the three canonical values (or null for pre-WS3 rows)
DO $$
BEGIN
  ALTER TABLE responses ADD CONSTRAINT responses_match_bucket_check
    CHECK (match_bucket IS NULL OR match_bucket IN ('core', 'adjacent', 'off_target'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Index for analytics queries segmented by match bucket within a campaign
CREATE INDEX IF NOT EXISTS idx_responses_match_bucket
  ON responses (campaign_id, match_bucket)
  WHERE match_bucket IS NOT NULL;
