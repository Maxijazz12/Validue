-- Migration 034: Partial response model + reciprocal gate
--
-- Adds support for:
-- 1. Partial responses (respondent answers a subset of questions)
-- 2. Reciprocal gate (free-tier founders must answer others' questions before publishing)
-- 3. Fixes latent bug: 'abandoned' status used in code but missing from DB constraint

-- ─── Responses: partial response support ───

-- Which questions were assigned to this respondent (null = full response, all questions)
ALTER TABLE responses ADD COLUMN IF NOT EXISTS assigned_question_ids uuid[];

-- Whether this is a partial response (3-5 questions) vs full (all questions)
ALTER TABLE responses ADD COLUMN IF NOT EXISTS is_partial boolean NOT NULL DEFAULT false;

-- Fix response status constraint: add 'abandoned' (already used in code, missing from DB)
-- The inline CHECK from 001_initial_schema has an auto-generated name; drop by column recheck
DO $$
BEGIN
  -- Drop any existing status check constraint (auto-named from CREATE TABLE)
  EXECUTE (
    SELECT 'ALTER TABLE responses DROP CONSTRAINT ' || quote_ident(conname)
    FROM pg_constraint
    WHERE conrelid = 'responses'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%in_progress%submitted%ranked%'
    LIMIT 1
  );
EXCEPTION WHEN OTHERS THEN
  NULL; -- No constraint found, safe to continue
END $$;

ALTER TABLE responses ADD CONSTRAINT responses_status_check
  CHECK (status IN ('in_progress', 'submitted', 'ranked', 'abandoned'));

-- ─── Campaigns: reciprocal gate ───

-- Gate status for free-tier campaigns (null = legacy/pre-feature)
-- 'pending': gate not yet cleared, 'cleared': gate passed, 'exempt': paid tier
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS reciprocal_gate_status text;

DO $$
BEGIN
  ALTER TABLE campaigns ADD CONSTRAINT campaigns_reciprocal_gate_check
    CHECK (reciprocal_gate_status IS NULL OR reciprocal_gate_status IN ('pending', 'cleared', 'exempt'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- How many reciprocal responses the founder has completed toward the gate
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS reciprocal_responses_completed int NOT NULL DEFAULT 0;

-- ─── Indexes ───

-- Fast lookup: which partial responses exist for a campaign (for assumption coverage counts)
CREATE INDEX IF NOT EXISTS idx_responses_campaign_partial
  ON responses (campaign_id)
  WHERE is_partial = true;

-- Fast lookup: campaigns pending reciprocal gate (for gate queue)
CREATE INDEX IF NOT EXISTS idx_campaigns_reciprocal_pending
  ON campaigns (reciprocal_gate_status)
  WHERE reciprocal_gate_status = 'pending';
