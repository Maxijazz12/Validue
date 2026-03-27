-- Add Stripe-related fields for campaign funding

-- Stripe customer ID on profiles (for founder payments)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Campaign funding fields
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS funded_at TIMESTAMPTZ;

-- Update CHECK constraint to allow 'pending_funding' status
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_status_check;
ALTER TABLE campaigns ADD CONSTRAINT campaigns_status_check
  CHECK (status IN ('draft', 'pending_funding', 'active', 'completed', 'paused'));
