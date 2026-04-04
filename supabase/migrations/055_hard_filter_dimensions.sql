-- Migration 055: Hard Filter Dimensions
--
-- Within 'strict' targeting mode, founders can mark specific dimensions
-- as hard requirements. A respondent who fails ANY hard filter dimension
-- is blocked, regardless of how well they match soft dimensions.
--
-- Valid values: 'interests', 'expertise', 'age_range', 'industry', 'experience_level'
-- Empty array (default) means ALL targeted dimensions are required in strict mode.
-- Only meaningful when targeting_mode = 'strict'; ignored in balanced/broad.

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS hard_filter_dimensions text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN campaigns.hard_filter_dimensions IS
  'In strict mode, only these dimensions are hard gates (empty = all targeted dimensions required)';
