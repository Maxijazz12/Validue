-- Dispute/appeal table for respondents contesting disqualification or scores
CREATE TABLE disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  respondent_id uuid NOT NULL REFERENCES profiles(id),
  response_id uuid NOT NULL REFERENCES responses(id),
  campaign_id uuid NOT NULL REFERENCES campaigns(id),
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'under_review', 'resolved_upheld', 'resolved_overturned')),
  admin_notes text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_disputes_respondent_id ON disputes(respondent_id);
CREATE INDEX idx_disputes_status ON disputes(status);

-- One dispute per response
CREATE UNIQUE INDEX idx_disputes_response_unique ON disputes(response_id);

ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

-- Respondents can read their own disputes
CREATE POLICY "respondents_read_own_disputes" ON disputes
  FOR SELECT USING (respondent_id = auth.uid());

-- Respondents can create disputes for their own responses
CREATE POLICY "respondents_create_own_disputes" ON disputes
  FOR INSERT WITH CHECK (respondent_id = auth.uid());
