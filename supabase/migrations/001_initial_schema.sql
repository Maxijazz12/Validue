-- Profiles (extends auth.users)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  role text not null check (role in ('founder', 'respondent')) default 'founder',
  avatar_url text,
  created_at timestamptz default now()
);

-- Campaigns
create table campaigns (
  id uuid default gen_random_uuid() primary key,
  creator_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  description text,
  status text not null check (status in ('draft', 'active', 'completed', 'paused')) default 'draft',
  target_responses int default 50,
  current_responses int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Questions
create table questions (
  id uuid default gen_random_uuid() primary key,
  campaign_id uuid references campaigns(id) on delete cascade not null,
  text text not null,
  type text not null check (type in ('open', 'multiple_choice')) default 'open',
  sort_order int not null default 0,
  options jsonb
);

-- Responses
create table responses (
  id uuid default gen_random_uuid() primary key,
  campaign_id uuid references campaigns(id) on delete cascade not null,
  respondent_id uuid references profiles(id) on delete cascade not null,
  status text not null check (status in ('in_progress', 'submitted', 'ranked')) default 'in_progress',
  quality_score numeric(3,2),
  payout_amount numeric(10,2),
  created_at timestamptz default now()
);

-- Answers
create table answers (
  id uuid default gen_random_uuid() primary key,
  response_id uuid references responses(id) on delete cascade not null,
  question_id uuid references questions(id) on delete cascade not null,
  text text,
  metadata jsonb
);

-- Enable RLS
alter table profiles enable row level security;
alter table campaigns enable row level security;
alter table questions enable row level security;
alter table responses enable row level security;
alter table answers enable row level security;

-- Profiles: users can read all, update own
create policy "Public profiles" on profiles for select using (true);
create policy "Users update own profile" on profiles for update using (auth.uid() = id);

-- Campaigns: anyone can read active, creators manage own
create policy "Read active campaigns" on campaigns for select using (status = 'active' or creator_id = auth.uid());
create policy "Creators manage campaigns" on campaigns for all using (creator_id = auth.uid());

-- Questions: readable if campaign is readable
create policy "Read questions" on questions for select using (
  exists (select 1 from campaigns where campaigns.id = questions.campaign_id and (campaigns.status = 'active' or campaigns.creator_id = auth.uid()))
);
create policy "Creators manage questions" on questions for all using (
  exists (select 1 from campaigns where campaigns.id = questions.campaign_id and campaigns.creator_id = auth.uid())
);

-- Responses: respondents manage own, creators read for their campaigns
create policy "Respondents manage own" on responses for all using (respondent_id = auth.uid());
create policy "Creators read responses" on responses for select using (
  exists (select 1 from campaigns where campaigns.id = responses.campaign_id and campaigns.creator_id = auth.uid())
);

-- Answers: same pattern as responses
create policy "Respondents manage own answers" on answers for all using (
  exists (select 1 from responses where responses.id = answers.response_id and responses.respondent_id = auth.uid())
);
create policy "Creators read answers" on answers for select using (
  exists (select 1 from responses r join campaigns c on c.id = r.campaign_id where r.id = answers.response_id and c.creator_id = auth.uid())
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), coalesce(new.raw_user_meta_data->>'role', 'founder'));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
