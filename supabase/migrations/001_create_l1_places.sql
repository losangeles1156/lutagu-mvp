-- Create L1 Places table to store OSM POI data
create table if not exists l1_places (
  id uuid default gen_random_uuid() primary key,
  station_id text not null, -- Foreign key conceptual (links to nodes.id or station IDs)
  osm_id bigint not null,
  name text not null,
  category text not null,
  location geography(Point, 4326),
  tags jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,

  -- Prevent duplicates from same OSM node
  unique(station_id, osm_id)
);

-- Enable RLS (Optional for now, but good practice)
alter table l1_places enable row level security;

-- Allow public read access (for Map display)
create policy "Allow public read access"
  on l1_places for select
  using (true);

-- Allow service_role (backend) to insert/update
create policy "Allow service_role full access"
  on l1_places for all
  using (true)
  with check (true);
