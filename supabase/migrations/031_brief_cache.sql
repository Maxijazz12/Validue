-- Cache full synthesized brief to avoid re-running AI on every page view.
-- brief_cache stores the full BriefResult JSON.
-- brief_cached_at tracks when it was generated (for staleness checks).
-- brief_response_count tracks how many responses were included, so we know
-- when to invalidate (new responses arrive → re-synthesize).

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS brief_cache jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS brief_cached_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS brief_response_count int DEFAULT NULL;
