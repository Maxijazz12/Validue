-- Prevent profile deletion when the respondent has unsettled payouts.
-- Locked/pending_qualification payouts are not yet reflected in pending_balance_cents
-- on the profile, so the application-level balance check doesn't catch them.
-- This trigger is the safety net that prevents funds from getting permanently stuck.

CREATE OR REPLACE FUNCTION prevent_delete_with_locked_payouts()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM payouts
    WHERE respondent_id = OLD.id
      AND money_state IN ('locked', 'pending_qualification')
  ) THEN
    RAISE EXCEPTION 'Cannot delete profile with unsettled payouts';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_delete_locked_payouts
BEFORE DELETE ON profiles
FOR EACH ROW EXECUTE FUNCTION prevent_delete_with_locked_payouts();
