-- Migration 035: Add 'pending_gate' campaign status
--
-- Separates reciprocal-gate-pending campaigns from Stripe-funding-pending campaigns.
-- Previously both used 'pending_funding', which overloaded the status semantics.

-- 1. Update status constraint to include pending_gate
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_status_check;
ALTER TABLE campaigns ADD CONSTRAINT campaigns_status_check
  CHECK (status IN ('draft', 'pending_funding', 'pending_gate', 'active', 'completed', 'paused'));

-- 2. Update transition trigger to handle pending_gate (must come before data migration)
CREATE OR REPLACE FUNCTION check_campaign_status_transition()
RETURNS trigger AS $$
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;
  IF OLD.status = 'completed' THEN
    RAISE EXCEPTION 'Cannot transition from completed status';
  END IF;
  IF OLD.status = 'pending_funding' AND NEW.status NOT IN ('active', 'pending_gate') THEN
    RAISE EXCEPTION 'pending_funding can only transition to active or pending_gate';
  END IF;
  IF OLD.status = 'pending_gate' AND NEW.status NOT IN ('active') THEN
    RAISE EXCEPTION 'pending_gate can only transition to active';
  END IF;
  IF OLD.status = 'paused' AND NEW.status NOT IN ('active', 'completed') THEN
    RAISE EXCEPTION 'paused can only transition to active or completed';
  END IF;
  IF OLD.status = 'active' AND NEW.status NOT IN ('paused', 'completed') THEN
    RAISE EXCEPTION 'active can only transition to paused or completed';
  END IF;
  IF OLD.status = 'draft' AND NEW.status NOT IN ('pending_funding', 'pending_gate', 'active') THEN
    RAISE EXCEPTION 'draft can only transition to pending_funding, pending_gate, or active';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Migrate existing gate-pending campaigns from pending_funding to pending_gate
UPDATE campaigns
SET status = 'pending_gate'
WHERE status = 'pending_funding'
  AND reciprocal_gate_status = 'pending';
