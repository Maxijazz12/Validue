-- Collapse legacy paid tiers into a single launch-tier model.
UPDATE subscriptions
SET tier = 'pro',
    updated_at = NOW()
WHERE tier IN ('starter', 'scale');

ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_tier_check;

ALTER TABLE subscriptions
ADD CONSTRAINT subscriptions_tier_check
CHECK (tier IN ('free', 'pro'));
