-- Add marketplace columns for Wall feed
alter table campaigns add column category text;
alter table campaigns add column tags text[] default '{}';
alter table campaigns add column estimated_minutes int default 5;
alter table campaigns add column reward_amount numeric(10,2) default 0;
alter table campaigns add column deadline timestamptz;
