-- 039: Idempotency guards and deduplication constraints
--
-- 1. Stripe webhook event deduplication table
-- 2. Unique constraint preventing duplicate active responses per user+campaign

-- ─── Stripe Event Dedup ───
-- Prevents double-processing of retried webhook deliveries.
-- INSERT ON CONFLICT DO NOTHING at webhook entry; skip if already processed.
CREATE TABLE IF NOT EXISTS processed_stripe_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-clean events older than 7 days (Stripe retries for up to 3 days)
CREATE INDEX IF NOT EXISTS idx_processed_stripe_events_ttl
  ON processed_stripe_events (processed_at);

-- ─── Response Dedup Constraint ───
-- Prevents race condition where concurrent requests both pass the app-level
-- duplicate check and create two responses for the same user+campaign.
-- Allows multiple responses only if prior ones are 'abandoned'.
CREATE UNIQUE INDEX IF NOT EXISTS idx_response_user_campaign_active
  ON responses (respondent_id, campaign_id)
  WHERE status IN ('in_progress', 'submitted', 'ranked');
