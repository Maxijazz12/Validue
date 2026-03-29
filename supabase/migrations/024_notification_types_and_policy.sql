-- Expand notification types and add INSERT policy for server actions
-- (server actions run as authenticated user via anon key, so RLS applies)

-- Drop and recreate the CHECK constraint to allow new types
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('campaign_completed', 'payout_earned', 'new_response', 'ranking_complete', 'quality_feedback'));

-- Allow authenticated users to insert notifications for any user.
-- This is needed because server actions (e.g. submitResponse, allocatePayouts)
-- create notifications for other users while authenticated as the acting user.
CREATE POLICY "Authenticated users can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
