-- Add onboarding tracking to profiles
alter table profiles add column onboarding_completed boolean default false;
alter table profiles add column has_responded boolean default false;
alter table profiles add column has_posted boolean default false;
