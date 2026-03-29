-- Add notification preferences column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_preferences jsonb DEFAULT '{"new_response": true, "campaign_completed": true, "payout_earned": true, "ranking_complete": true, "quality_feedback": true}'::jsonb;
