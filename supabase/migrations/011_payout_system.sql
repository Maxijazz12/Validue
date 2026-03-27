-- Campaign payout tracking
ALTER TABLE campaigns ADD COLUMN payout_status text
  CHECK (payout_status IN ('none', 'allocated', 'completed'))
  DEFAULT 'none';

ALTER TABLE campaigns ADD COLUMN distributable_amount numeric(10,2);

-- Payouts table
CREATE TABLE payouts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  response_id uuid REFERENCES responses(id) ON DELETE CASCADE NOT NULL,
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  founder_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  respondent_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount numeric(10,2) NOT NULL,
  platform_fee numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

-- Founders manage payouts for their campaigns
CREATE POLICY "Founders manage own payouts" ON payouts FOR ALL USING (founder_id = auth.uid());

-- Respondents can read their own payouts
CREATE POLICY "Respondents read own payouts" ON payouts FOR SELECT USING (respondent_id = auth.uid());
