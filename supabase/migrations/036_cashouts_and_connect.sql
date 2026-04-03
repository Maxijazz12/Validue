-- Stripe Connect fields on profiles (for respondent bank payouts)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS stripe_connect_account_id text,
  ADD COLUMN IF NOT EXISTS stripe_connect_onboarding_complete boolean NOT NULL DEFAULT false;

-- Cashout requests table
CREATE TABLE cashouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  respondent_id uuid NOT NULL REFERENCES profiles(id),
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  stripe_transfer_id text,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX idx_cashouts_respondent_id ON cashouts(respondent_id);
CREATE INDEX idx_cashouts_status ON cashouts(status);

-- RLS: respondents can read their own cashouts
ALTER TABLE cashouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "respondents_read_own_cashouts" ON cashouts
  FOR SELECT USING (respondent_id = auth.uid());
