-- Phase 4: Longitudinal validation — link campaigns across rounds
ALTER TABLE campaigns ADD COLUMN parent_campaign_id uuid REFERENCES campaigns(id) ON DELETE SET NULL;
ALTER TABLE campaigns ADD COLUMN round_number int NOT NULL DEFAULT 1;
ALTER TABLE campaigns ADD COLUMN brief_verdicts jsonb;
