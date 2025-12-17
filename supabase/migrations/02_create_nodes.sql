create table nodes (
  id text primary key,                    -- 'odpt:TokyoMetro.Ueno'
  city_id text references cities(id),
  
  -- Basic Info
  name jsonb not null,
  type text not null,                     -- 'station', 'bus_stop', 'poi'
  location geography(point, 4326) not null,
  geohash text not null,
  
  -- Zone (Redundant for query speed)
  zone text not null default 'core',      -- 'core', 'buffer'
  
  -- L1 Attributes
  vibe text,                              -- 'busy', 'quiet'
  accessibility text default 'unknown',
  
  -- Hub/Spoke Inheritance
  is_hub boolean default false,
  parent_hub_id text references nodes(id),
  persona_prompt text,                    -- Only for Hubs
  
  -- Lines
  line_ids text[],
  
  -- Source
  source_dataset text not null,
  source_id text,
  
  -- Extended
  metadata jsonb default '{}',
  external_links jsonb default '{}',
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes
create index idx_nodes_city on nodes(city_id);
create index idx_nodes_zone on nodes(zone);
create index idx_nodes_type on nodes(type);
create index idx_nodes_geohash on nodes(geohash);
create index idx_nodes_hub on nodes(is_hub) where is_hub = true;
create index idx_nodes_parent on nodes(parent_hub_id);
create index idx_nodes_location on nodes using gist(location);
create index idx_nodes_lines on nodes using gin(line_ids);
