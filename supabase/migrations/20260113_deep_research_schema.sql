-- Enable pgvector extension if not enabled
create extension if not exists vector;

-- 1. Enhancing l1_places for Vibe Matching (Scenario 1)
alter table l1_places 
add column if not exists vibe_embedding vector(1536), -- For 'vibe-matcher' cosine similarity
add column if not exists crowd_level_simulated int default 1; -- 1 (Empty) to 5 (Packed)

-- Create index for faster vector search
create index if not exists l1_places_vibe_idx 
on l1_places 
using ivfflat (vibe_embedding vector_cosine_ops)
with (lists = 100);

-- 2. New Table: Station Exits for Spatial Reasoning (Scenario 2 & 3)
create table if not exists station_exits (
    id uuid primary key default gen_random_uuid(),
    station_id text not null, -- e.g. 'odpt:Station:JR-East.Shinjuku'
    exit_name jsonb not null, -- { "ja": "東口", "en": "East Exit" }
    location geometry(Point, 4326), -- PostGIS Point for precise distance calc
    accessibility_features jsonb default '{}'::jsonb, -- { "elevator": true, "slope": false }
    
    constraint fk_station foreign key (station_id) references l4_knowledge_embeddings(entity_id) on delete cascade
    -- Note: Foreign key might need adjustment depending on actual stations table, 
    -- but usually we link to the node ID concept. 
    -- If no strict foreign key table exists for station_id strings, we can omit the constraint.
);

create index if not exists station_exits_station_idx on station_exits(station_id);
create index if not exists station_exits_location_idx on station_exits using gist(location);

-- 3. Function to find similar vibes (RPC)
create or replace function match_l1_vibes(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  filter_crowd_max int default 5
)
returns table (
  id uuid,
  name text,
  similarity float,
  crowd_level int
)
language plpgsql
as $$
begin
  return query
  select
    l1_places.id,
    l1_places.name,
    1 - (l1_places.vibe_embedding <=> query_embedding) as similarity,
    l1_places.crowd_level_simulated
  from l1_places
  where 1 - (l1_places.vibe_embedding <=> query_embedding) > match_threshold
  and l1_places.crowd_level_simulated <= filter_crowd_max
  order by similarity desc
  limit match_count;
end;
$$;
