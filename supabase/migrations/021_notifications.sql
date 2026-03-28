-- Minimal notification system: campaign_completed + payout_earned only
CREATE TABLE notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('campaign_completed', 'payout_earned')),
  title text NOT NULL,
  body text,
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE,
  amount numeric,
  link text,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE read_at IS NULL;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

-- Enable realtime for toast notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
