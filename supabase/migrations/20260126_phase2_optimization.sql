
-- Phase 2 Optimization: Feedback Loop Tables

-- 1. Station Weights (For Algo-based Weight Adjuster)
-- Stores dynamic weights for nodes based on user engagement.
-- Generic schema: node_id can be any station string.
create table if not exists station_weights (
  node_id text primary key,
  click_weight double precision default 1.0, -- Multiplier (e.g. 1.05)
  stay_weight double precision default 1.0, -- Multiplier
  last_updated timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table station_weights enable row level security;

create policy "Service role can manage weights"
  on station_weights
  for all
  to service_role
  using (true)
  with check (true);


-- 2. Enrichment Requests (For Knowledge Gap Manager)
-- Stores detected knowledge gaps for future Research Agents.
create table if not exists enrichment_requests (
  id uuid default gen_random_uuid() primary key,
  station_id text not null,
  intent_target text not null,
  status text check (status in ('pending', 'processing', 'completed', 'verified')) default 'pending',
  priority double precision default 50.0,
  metadata jsonb default '{}'::jsonb, -- Stores query clusters, source tags
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table enrichment_requests enable row level security;

create policy "Service role can manage enrichment requests"
  on enrichment_requests
  for all
  to service_role
  using (true)
  with check (true);

-- Indexes
create index idx_enrichment_requests_station_id on enrichment_requests(station_id);
create index idx_enrichment_requests_status on enrichment_requests(status);
