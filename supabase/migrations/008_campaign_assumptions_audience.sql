-- Persist assumptions, detailed audience fields, and quality scores
alter table campaigns add column key_assumptions text[];
alter table campaigns add column audience_occupation text;
alter table campaigns add column audience_industry text;
alter table campaigns add column audience_experience_level text;
alter table campaigns add column audience_niche_qualifier text;
alter table campaigns add column quality_scores jsonb;
