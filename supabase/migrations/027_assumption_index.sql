-- Add assumption_index to questions table
-- Maps each question to the assumption it tests (0-based index into campaign.key_assumptions)
ALTER TABLE questions ADD COLUMN assumption_index INT;

-- Add anchors to questions table
-- Response anchor hints displayed below open-ended text areas
ALTER TABLE questions ADD COLUMN anchors JSONB;
