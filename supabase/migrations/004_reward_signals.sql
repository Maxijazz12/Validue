-- Add reward signal columns to campaigns
alter table campaigns add column bonus_available boolean default false;
alter table campaigns add column rewards_top_answers boolean default false;
alter table campaigns add column reward_type text check (reward_type in ('fixed', 'pool', 'top_only')) default 'fixed';
