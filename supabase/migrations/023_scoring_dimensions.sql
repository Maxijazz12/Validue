-- Add scoring dimensions column to store per-dimension AI scores
ALTER TABLE responses ADD COLUMN IF NOT EXISTS scoring_dimensions jsonb;
