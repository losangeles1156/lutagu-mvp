-- Enable PostGIS
create extension if not exists postgis;

-- Drop existing type if exists to allow updates (for dev env)
drop type if exists zone_type cascade;
create type zone_type as enum ('core', 'buffer', 'outer');

create table cities (
  id text primary key,                    -- 'tokyo_core', 'tokyo_buffer'
  name jsonb not null,                    -- {"zh-TW": "東京都心", ...}
  timezone text not null default 'Asia/Tokyo',
  
  -- Geographic Bounds
  bounds geography(polygon, 4326),
  
  -- Zone Logic
  zone_type text not null default 'core', -- 'core', 'buffer'
  parent_city_id text references cities(id),  -- buffer points to core
  
  -- City Adapter Configuration
  config jsonb not null default '{}',
  /*
    {
      "features": { "hasSubway": true, ... },
      "dataSources": { ... },
      "commercialPartners": { ... }
    }
  */
  
  enabled boolean default true,
  created_at timestamptz default now()
);

-- Insert Tokyo Core Definition
insert into cities (id, name, zone_type, config) values
  ('tokyo_core', 
   '{"zh-TW": "東京都心", "ja": "東京都心", "en": "Central Tokyo"}',
   'core',
   '{"features": {"hasSubway": true, "hasSharedMobility": true, "hasTaxiIntegration": true}}');

-- Insert Tokyo Buffer Definition
insert into cities (id, name, zone_type, parent_city_id, config) values
  ('tokyo_buffer', 
   '{"zh-TW": "東京周邊", "ja": "東京周辺", "en": "Greater Tokyo"}',
   'buffer',
   'tokyo_core',
   '{"features": {"hasSubway": true, "hasSharedMobility": false, "hasTaxiIntegration": false}}');
