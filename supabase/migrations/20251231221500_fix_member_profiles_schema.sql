-- Create member_profiles table to match application code expectations
create table if not exists member_profiles (
  user_id uuid references auth.users not null primary key,
  display_name text,
  role text default 'member',
  preferences jsonb,
  line_user_id text unique,

  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  last_seen_at timestamptz default now()
);

-- Enable RLS
alter table member_profiles enable row level security;

-- Policies
drop policy if exists "Users can view own profile" on member_profiles;
create policy "Users can view own profile" on member_profiles
  for select using (auth.uid() = user_id);

drop policy if exists "Users can update own profile" on member_profiles;
create policy "Users can update own profile" on member_profiles
  for update using (auth.uid() = user_id);

drop policy if exists "Users can insert own profile" on member_profiles;
create policy "Users can insert own profile" on member_profiles
  for insert with check (auth.uid() = user_id);

-- Optional: Allow service_role full access (implicit, but explicit doesn't hurt if needed later)
