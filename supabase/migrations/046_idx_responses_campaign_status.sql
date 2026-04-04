-- Compound index for hot queries filtering responses by campaign + status
CREATE INDEX IF NOT EXISTS idx_responses_campaign_status
  ON responses(campaign_id, status);
