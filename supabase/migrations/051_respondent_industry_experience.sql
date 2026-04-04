-- Add structured industry and experience_level to respondent profiles
-- for symmetric matching against campaign audience_industry / audience_experience_level.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS industry text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS experience_level text;
