create table if not exists public.agent_memory_profiles (
  user_id text primary key,
  locale text,
  summary text not null default '',
  preferences jsonb not null default '[]'::jsonb,
  frequent_stations jsonb not null default '[]'::jsonb,
  constraints jsonb not null default '[]'::jsonb,
  goals jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '180 days')
);

create index if not exists idx_agent_memory_profiles_updated_at
  on public.agent_memory_profiles (updated_at desc);

create index if not exists idx_agent_memory_profiles_expires_at
  on public.agent_memory_profiles (expires_at);
