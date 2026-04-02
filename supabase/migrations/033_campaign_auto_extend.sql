-- Add auto_extended flag for campaign expiry auto-extension
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS auto_extended BOOLEAN NOT NULL DEFAULT FALSE;
