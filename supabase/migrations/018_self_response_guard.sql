-- ============================================================
-- 018_self_response_guard.sql
-- Prevent users from responding to their own campaigns at RLS level.
-- Defense-in-depth: app code already checks this, but RLS
-- prevents bypass via direct Supabase client access.
-- ============================================================

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
