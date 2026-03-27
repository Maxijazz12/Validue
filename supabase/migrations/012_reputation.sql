-- Reputation fields on profiles
ALTER TABLE profiles ADD COLUMN reputation_score numeric(5,2) DEFAULT 0;
ALTER TABLE profiles ADD COLUMN reputation_tier text
  CHECK (reputation_tier IN ('new', 'bronze', 'silver', 'gold', 'platinum'))
  DEFAULT 'new';
ALTER TABLE profiles ADD COLUMN total_responses_completed int DEFAULT 0;
ALTER TABLE profiles ADD COLUMN average_quality_score numeric(5,2) DEFAULT 0;
ALTER TABLE profiles ADD COLUMN total_earned numeric(10,2) DEFAULT 0;
ALTER TABLE profiles ADD COLUMN reputation_updated_at timestamptz;
