-- 040: RLS & FK hardening + state machine fix (audit fixes)
-- Fixes:
--   1. reach_impressions FK missing ON DELETE CASCADE
--   2. cashouts missing INSERT/UPDATE RLS policies for service role
--   3. Overly permissive campaign UPDATE policy for response count increment
--   4. Response state machine trigger missing 'abandoned' transition

-- ═══════════════════════════════════════════════════════════════
-- 1. reach_impressions: add CASCADE to foreign keys
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE reach_impressions
  DROP CONSTRAINT IF EXISTS reach_impressions_user_id_fkey,
  DROP CONSTRAINT IF EXISTS reach_impressions_campaign_id_fkey;

ALTER TABLE reach_impressions
  ADD CONSTRAINT reach_impressions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD CONSTRAINT reach_impressions_campaign_id_fkey
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE;

-- ═══════════════════════════════════════════════════════════════
-- 2. cashouts: add service-role INSERT/UPDATE policies
-- ═══════════════════════════════════════════════════════════════

DO $$ BEGIN
  CREATE POLICY "service_create_cashouts" ON cashouts
    FOR INSERT WITH CHECK (
      auth.uid() = respondent_id                       -- user-initiated
      OR current_setting('role') = 'service_role'      -- server action via service key
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "service_update_cashouts" ON cashouts
    FOR UPDATE USING (
      current_setting('role') = 'service_role'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 3. Tighten campaign UPDATE policy for response count increment
--    Old: any authenticated user can update any active campaign
--    New: only if the user has an in_progress response for that campaign
--         OR is the campaign creator
-- ═══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Respondents can increment response count" ON campaigns;

CREATE POLICY "Respondents can increment response count"
  ON campaigns FOR UPDATE
  USING (
    status = 'active'
    AND (
      creator_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM responses
        WHERE responses.campaign_id = campaigns.id
          AND responses.respondent_id = auth.uid()
          AND responses.status IN ('in_progress', 'submitted')
      )
    )
  )
  WITH CHECK (status = 'active');

-- ═══════════════════════════════════════════════════════════════
-- 4. Response state machine: allow in_progress → abandoned
--    Migration 034 added 'abandoned' to the CHECK constraint but
--    the transition trigger (030) still blocks it, causing errors
--    in stale-response cleanup (cron + startResponse).
-- ═══════════════════════════════════════════════════════════════

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
  IF OLD.status = 'abandoned' THEN
    RAISE EXCEPTION 'Cannot transition from abandoned status';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
