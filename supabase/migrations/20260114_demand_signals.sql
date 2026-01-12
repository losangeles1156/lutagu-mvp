
-- Create demand_signals table for capturing user intent/unmet needs
create table if not exists demand_signals (
  signal_id uuid default gen_random_uuid() primary key,
  station_id text not null, -- The station context where the signal originated
  policy_category text not null check (policy_category in ('traffic_vacuum', 'overtourism', 'hands_free', 'barrier_free', 'expert_rule')),
  intent_target text, -- Structured intent target (e.g., "Shinjuku Gyoen", "Locker", "Elevator")
  unmet_need boolean default false, -- True if the need could not be satisfied (e.g. no lockers)
  lat double precision,
  lng double precision,
  metadata jsonb default '{}'::jsonb, -- Store specific skill results or parameters
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table demand_signals enable row level security;

-- Policy: Allow service role to insert signals (Server-side only)
create policy "Service role can insert signals"
  on demand_signals
  for insert
  to service_role
  with check (true);

-- Policy: Allow service role to view signals (for analytics dashboard)
create policy "Service role can view signals"
  on demand_signals
  for select
  to service_role
  using (true);

-- Indexes for analytics query performance
create index idx_demand_signals_station_id on demand_signals(station_id);
create index idx_demand_signals_policy_category on demand_signals(policy_category);
create index idx_demand_signals_created_at on demand_signals(created_at);
