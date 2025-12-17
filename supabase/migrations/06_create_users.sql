create table users (
  id uuid references auth.users not null primary key,
  line_user_id text unique,
  display_name text,
  preferences jsonb, -- { "accessibility": true, "bike_user": false }
  created_at timestamptz default now(),
  last_seen_at timestamptz default now()
);

-- RLS Policies (Simplified for MVP)
alter table users enable row level security;

create policy "Users can view own data" on users
  for select using (auth.uid() = id);

create policy "Users can update own data" on users
  for update using (auth.uid() = id);
