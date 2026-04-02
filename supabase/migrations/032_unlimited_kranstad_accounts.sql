-- Add nullable campaign limit override (bypasses plan config when set)
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS campaign_limit_override int DEFAULT NULL;

-- Upgrade kranstad accounts to pro with unlimited campaigns
UPDATE subscriptions
SET tier = 'pro',
    campaigns_used_this_period = 0,
    campaign_limit_override = 999999,
    updated_at = now()
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email ILIKE '%kranstad%'
);
