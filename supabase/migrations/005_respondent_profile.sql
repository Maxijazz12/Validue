-- Respondent matching profile fields
alter table profiles add column interests text[] default '{}';
alter table profiles add column expertise text[] default '{}';
alter table profiles add column location text;
alter table profiles add column age_range text check (age_range in ('18-24','25-34','35-44','45-54','55+'));
alter table profiles add column occupation text;
alter table profiles add column profile_completed boolean default false;
