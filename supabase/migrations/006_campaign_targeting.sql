-- Structured campaign targeting fields
alter table campaigns add column target_interests text[] default '{}';
alter table campaigns add column target_expertise text[] default '{}';
alter table campaigns add column target_age_ranges text[] default '{}';
alter table campaigns add column target_location text;
