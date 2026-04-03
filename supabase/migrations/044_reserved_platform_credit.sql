-- Reserve platform credit on pending-funding campaigns so retries reuse the
-- same credit and expired sessions can refund it safely.

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS reserved_platform_credit_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reserved_platform_credit_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS reserved_checkout_session_id text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'campaigns_reserved_platform_credit_cents_nonnegative'
  ) THEN
    ALTER TABLE campaigns
      ADD CONSTRAINT campaigns_reserved_platform_credit_cents_nonnegative
      CHECK (reserved_platform_credit_cents >= 0);
  END IF;
END $$;
