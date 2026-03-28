-- V2: Add scoring metadata fields to responses table
-- Tracks which scoring system (AI or fallback) produced the quality score,
-- and the confidence level of that score.

ALTER TABLE responses ADD COLUMN IF NOT EXISTS scoring_source text DEFAULT 'ai'
  CHECK (scoring_source IN ('ai', 'fallback'));

ALTER TABLE responses ADD COLUMN IF NOT EXISTS scoring_confidence numeric(3,2) DEFAULT 0.70
  CHECK (scoring_confidence >= 0 AND scoring_confidence <= 1);
