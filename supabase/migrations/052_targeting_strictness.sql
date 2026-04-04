-- Migration 052: Targeting Strictness Mode
--
-- Adds a targeting_mode column to campaigns that controls how strictly
-- audience targeting dimensions are enforced at response time.
--
-- Modes:
--   'broad'    — targeting affects ranking only; no eligibility check
--   'balanced' — respondent must overlap on at least one targeted dimension (current behavior)
--   'strict'   — respondent must overlap on ALL targeted dimensions
--
-- Default 'balanced' preserves existing behavior for all current campaigns.

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS targeting_mode text NOT NULL DEFAULT 'balanced';

-- Constrained enum — only valid modes accepted
DO $$
BEGIN
  ALTER TABLE campaigns
    ADD CONSTRAINT campaigns_targeting_mode_check
    CHECK (targeting_mode IN ('broad', 'balanced', 'strict'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON COLUMN campaigns.targeting_mode IS
  'Controls eligibility enforcement: broad = no check, balanced = any-dimension overlap, strict = all-dimension overlap';
