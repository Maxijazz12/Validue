-- Widen quality_score to 0-100 scale (was numeric(3,2) = max 9.99)
ALTER TABLE responses ALTER COLUMN quality_score TYPE numeric(5,2);

-- Ranking metadata
ALTER TABLE responses ADD COLUMN ranked_at timestamptz;
ALTER TABLE responses ADD COLUMN ai_feedback text;

-- Campaign ranking status
ALTER TABLE campaigns ADD COLUMN ranking_status text
  CHECK (ranking_status IN ('unranked', 'ranking', 'ranked'))
  DEFAULT 'unranked';
