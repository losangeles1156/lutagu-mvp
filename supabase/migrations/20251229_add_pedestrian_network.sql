-- Migration: Add Pedestrian Network Tables
-- Purpose: Store ODPT/Hokonavi pedestrian walking path data for barrier-free routing

-- Table: pedestrian_links (walking path segments)
CREATE TABLE IF NOT EXISTS pedestrian_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id TEXT UNIQUE NOT NULL,
  station_id TEXT REFERENCES nodes(id) ON DELETE SET NULL,
  start_node_id TEXT NOT NULL,
  end_node_id TEXT NOT NULL,
  geometry GEOGRAPHY(LineString, 4326),
  distance_meters NUMERIC(8,1),

  -- Accessibility attributes
  accessibility_rank TEXT,          -- 'SAA', 'SBA', 'AAA', etc.
  route_structure INTEGER,          -- 1=corridor, 3=crosswalk, 4=stairs, 5=elevator
  width_class INTEGER,              -- 1=<1m, 2=1-2m, 3=2-3m, 4=>3m
  vertical_slope INTEGER,           -- 1=flat, 2=gentle, 3=steep, 4=very steep
  level_difference INTEGER,         -- 1=none, 2=with ramp, 3=with step
  has_braille_tiles BOOLEAN DEFAULT false,
  has_elevator_access BOOLEAN DEFAULT false,
  has_roof BOOLEAN DEFAULT false,

  -- Metadata
  source_dataset TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: pedestrian_nodes (waypoints/intersections)
CREATE TABLE IF NOT EXISTS pedestrian_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id TEXT UNIQUE NOT NULL,
  station_id TEXT REFERENCES nodes(id) ON DELETE SET NULL,
  coordinates GEOGRAPHY(Point, 4326),
  lat NUMERIC(10,7),
  lon NUMERIC(10,7),
  floor_level NUMERIC(3,1) DEFAULT 0,  -- 0=ground, -1=B1, 1=1F
  is_indoor BOOLEAN DEFAULT false,
  connected_links TEXT[],

  -- Metadata
  source_dataset TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ped_links_station ON pedestrian_links(station_id);
CREATE INDEX IF NOT EXISTS idx_ped_links_geo ON pedestrian_links USING GIST(geometry);
CREATE INDEX IF NOT EXISTS idx_ped_links_elevator ON pedestrian_links(has_elevator_access) WHERE has_elevator_access = true;
CREATE INDEX IF NOT EXISTS idx_ped_links_structure ON pedestrian_links(route_structure);

CREATE INDEX IF NOT EXISTS idx_ped_nodes_station ON pedestrian_nodes(station_id);
CREATE INDEX IF NOT EXISTS idx_ped_nodes_geo ON pedestrian_nodes USING GIST(coordinates);
CREATE INDEX IF NOT EXISTS idx_ped_nodes_floor ON pedestrian_nodes(floor_level);

-- Enable RLS (Row Level Security) - public read
ALTER TABLE pedestrian_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedestrian_nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access" ON pedestrian_links FOR SELECT USING (true);
CREATE POLICY "Public read access" ON pedestrian_nodes FOR SELECT USING (true);
CREATE POLICY "Service role write" ON pedestrian_links FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role write" ON pedestrian_nodes FOR ALL USING (auth.role() = 'service_role');
