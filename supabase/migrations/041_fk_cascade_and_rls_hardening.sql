-- 041: FK cascade fixes and RLS hardening
--
-- 1. Add ON DELETE CASCADE to cashouts.respondent_id
-- 2. Add ON DELETE CASCADE to disputes foreign keys
-- 3. Enable RLS on processed_stripe_events (service-role only)

-- ─── Cashouts: add CASCADE on respondent_id ───
ALTER TABLE cashouts
  DROP CONSTRAINT IF EXISTS cashouts_respondent_id_fkey;

ALTER TABLE cashouts
  ADD CONSTRAINT cashouts_respondent_id_fkey
  FOREIGN KEY (respondent_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- ─── Disputes: add CASCADE on all three FKs ───
ALTER TABLE disputes
  DROP CONSTRAINT IF EXISTS disputes_respondent_id_fkey;

ALTER TABLE disputes
  ADD CONSTRAINT disputes_respondent_id_fkey
  FOREIGN KEY (respondent_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE disputes
  DROP CONSTRAINT IF EXISTS disputes_response_id_fkey;

ALTER TABLE disputes
  ADD CONSTRAINT disputes_response_id_fkey
  FOREIGN KEY (response_id) REFERENCES responses(id) ON DELETE CASCADE;

ALTER TABLE disputes
  DROP CONSTRAINT IF EXISTS disputes_campaign_id_fkey;

ALTER TABLE disputes
  ADD CONSTRAINT disputes_campaign_id_fkey
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE;

-- ─── processed_stripe_events: enable RLS (deny all by default) ───
-- This table is only accessed via service-role in webhook handlers.
-- Enabling RLS with no policies means anon/authenticated roles get zero access.
ALTER TABLE processed_stripe_events ENABLE ROW LEVEL SECURITY;
