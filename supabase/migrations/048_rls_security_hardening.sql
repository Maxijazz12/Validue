-- 048: RLS & Database Security Hardening
-- Fixes: profiles UPDATE column restriction, payouts RLS, service-role consistency,
--        payouts.respondent_id index, reach_impressions FK target

-- ─── 13A: Restrict profiles UPDATE to safe columns only ───
-- The old policy allows users to set reputation_score, available_balance_cents, etc.
-- Replace with a SECURITY DEFINER function that only permits safe columns.

DROP POLICY IF EXISTS "Users update own profile" ON profiles;

-- Create a function that restricts which columns a user can update on their own profile.
-- All other columns (balance, reputation, role, etc.) are only writable via server actions.
CREATE OR REPLACE FUNCTION public.profiles_user_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Direct SQL writes from the app do not carry auth.uid(); let those proceed.
  -- This trigger is only meant to sanitize self-service profile edits.
  IF auth.role() = 'service_role'
     OR auth.uid() IS NULL
     OR auth.uid() <> OLD.id THEN
    RETURN NEW;
  END IF;

  -- Only allow changes to safe columns; revert everything else to OLD values
  NEW.id                    := OLD.id;
  NEW.role                  := OLD.role;
  NEW.reputation_score      := OLD.reputation_score;
  NEW.reputation_tier       := OLD.reputation_tier;
  NEW.reputation_updated_at := OLD.reputation_updated_at;
  NEW.available_balance_cents := OLD.available_balance_cents;
  NEW.pending_balance_cents := OLD.pending_balance_cents;
  NEW.total_earned          := OLD.total_earned;
  NEW.total_responses_completed := OLD.total_responses_completed;
  NEW.average_quality_score := OLD.average_quality_score;
  NEW.created_at            := OLD.created_at;
  NEW.last_cashout_at       := OLD.last_cashout_at;
  NEW.subsidized_campaign_used := OLD.subsidized_campaign_used;
  NEW.platform_credit_cents := OLD.platform_credit_cents;
  NEW.platform_credit_expires_at := OLD.platform_credit_expires_at;
  NEW.stripe_customer_id    := OLD.stripe_customer_id;
  NEW.stripe_connect_account_id := OLD.stripe_connect_account_id;
  NEW.stripe_connect_onboarding_complete := OLD.stripe_connect_onboarding_complete;

  RETURN NEW;
END;
$$;

-- Attach trigger so even if the RLS policy allows the row, protected columns are reverted
DROP TRIGGER IF EXISTS trg_profiles_user_update ON profiles;
CREATE TRIGGER trg_profiles_user_update
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_user_update();

-- Re-create a simple UPDATE policy (trigger handles column restriction)
CREATE POLICY "Users update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);


-- ─── 13B: Restrict payouts RLS to SELECT only ───
-- Old policy gives founders DELETE/UPDATE access. All mutations go through server actions.

DROP POLICY IF EXISTS "Founders manage own payouts" ON payouts;
DROP POLICY IF EXISTS "Respondents read own payouts" ON payouts;

CREATE POLICY "Users read own payouts" ON payouts
  FOR SELECT USING (founder_id = auth.uid() OR respondent_id = auth.uid());


-- ─── 13F: Standardize service-role policy checks ───
-- Replace current_setting('role') and current_setting('request.jwt.claim.role', true)
-- with auth.role() = 'service_role' (Supabase-recommended).

-- 040: cashouts INSERT
DROP POLICY IF EXISTS "service_create_cashouts" ON cashouts;
CREATE POLICY "service_create_cashouts" ON cashouts
  FOR INSERT WITH CHECK (
    auth.uid() = respondent_id
    OR auth.role() = 'service_role'
  );

-- 040: cashouts UPDATE
DROP POLICY IF EXISTS "service_update_cashouts" ON cashouts;
CREATE POLICY "service_update_cashouts" ON cashouts
  FOR UPDATE USING (auth.role() = 'service_role');

-- 043: notifications INSERT
DROP POLICY IF EXISTS "service_create_notifications" ON notifications;
CREATE POLICY "service_create_notifications" ON notifications
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- 043: disputes UPDATE
DROP POLICY IF EXISTS "service_update_disputes" ON disputes;
CREATE POLICY "service_update_disputes" ON disputes
  FOR UPDATE USING (auth.role() = 'service_role');

-- 043: cashouts DELETE
DROP POLICY IF EXISTS "service_delete_cashouts" ON cashouts;
CREATE POLICY "service_delete_cashouts" ON cashouts
  FOR DELETE USING (auth.role() = 'service_role');


-- ─── 13G: Add index on payouts.respondent_id ───
CREATE INDEX IF NOT EXISTS idx_payouts_respondent_id ON payouts(respondent_id);


-- ─── 13H: Fix reach_impressions FK to reference profiles(id) ───
-- Currently references auth.users(id); should reference profiles(id) like every other user FK.
ALTER TABLE reach_impressions
  DROP CONSTRAINT IF EXISTS reach_impressions_user_id_fkey;

ALTER TABLE reach_impressions
  ADD CONSTRAINT reach_impressions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
