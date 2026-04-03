-- Tighten notifications INSERT to service_role only (was any authenticated user)
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON notifications;
CREATE POLICY "service_create_notifications" ON notifications
  FOR INSERT WITH CHECK (current_setting('request.jwt.claim.role', true) = 'service_role');

-- Disputes: allow service role to update (resolve disputes)
CREATE POLICY "service_update_disputes" ON disputes
  FOR UPDATE USING (current_setting('request.jwt.claim.role', true) = 'service_role');

-- Cashouts: allow service role to delete failed records
CREATE POLICY "service_delete_cashouts" ON cashouts
  FOR DELETE USING (current_setting('request.jwt.claim.role', true) = 'service_role');

-- Orphaned pending_funding cleanup: add to cron via status constraint allowance
-- (no schema change needed — handled in application code)
