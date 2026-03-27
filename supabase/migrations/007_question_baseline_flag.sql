-- Add baseline tracking columns to questions table
alter table questions add column is_baseline boolean default false;
alter table questions add column category text;
