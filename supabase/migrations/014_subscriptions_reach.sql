-- Subscriptions table for tier management
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'starter', 'pro', 'scale')),
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
  current_period_start TIMESTAMPTZ DEFAULT now(),
  current_period_end TIMESTAMPTZ,
  campaigns_used_this_period INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- RLS for subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own subscription"
  ON subscriptions FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Service role manages subscriptions"
  ON subscriptions FOR ALL USING (auth.role() = 'service_role');

-- Campaign reach columns
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS baseline_reach_units INT NOT NULL DEFAULT 100;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS funded_reach_units INT NOT NULL DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS total_reach_units INT NOT NULL DEFAULT 100;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS reach_served INT NOT NULL DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS estimated_responses_low INT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS estimated_responses_high INT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS match_priority INT NOT NULL DEFAULT 1;

-- Index for wall feed ordering (priority + remaining reach)
CREATE INDEX idx_campaigns_distribution
  ON campaigns (match_priority DESC, total_reach_units, reach_served)
  WHERE status = 'active';

-- Index for subscription lookups
CREATE INDEX idx_subscriptions_user ON subscriptions (user_id);
