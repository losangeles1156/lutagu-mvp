
-- Create cache table for DataMux (MiniMax responses)
-- Limits Prompt usage to complying with "Coding Plan" (100 prompts/5hr)
-- Strategy: Cache results for 24 hours (TTL).

create table if not exists public.l4_data_mux_cache (
  id uuid default gen_random_uuid() primary key,
  station_id text not null,
  locale text not null,
  user_profile text default 'general',
  result jsonb not null,
  created_at timestamp with time zone default now(),
  expires_at timestamp with time zone not null,
  
  -- Create unique index to allow easy upsert
  unique(station_id, locale, user_profile)
);

-- Enable RLS (though mostly server-side used)
alter table public.l4_data_mux_cache enable row level security;

-- Policy: Allow read/write for service role only (since this is backend logic)
create policy "Service role can read cache"
  on public.l4_data_mux_cache
  for select
  to service_role
  using (true);

create policy "Service role can insert/update cache"
  on public.l4_data_mux_cache
  for insert
  to service_role
  with check (true);

create policy "Service role can update cache"
  on public.l4_data_mux_cache
  for update
  to service_role
  using (true);

-- Index for faster lookups including expiry check
create index if not exists idx_l4_data_mux_cache_lookup 
on public.l4_data_mux_cache (station_id, locale, user_profile, expires_at);
