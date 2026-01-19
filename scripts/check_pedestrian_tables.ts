import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

async function createTables() {
    console.log('=== Creating Pedestrian Network Tables ===\n');

    // Check if tables exist by trying to query them
    const { error: checkLinks } = await supabase.from('pedestrian_links').select('link_id').limit(1);
    const { error: checkNodes } = await supabase.from('pedestrian_nodes').select('node_id').limit(1);

    if (!checkLinks && !checkNodes) {
        console.log('✅ Tables already exist!');
        return;
    }

    console.log('⚠️  Tables do not exist yet.');
    console.log('\n📋 Please run the following SQL in Supabase SQL Editor:');
    console.log('   File: supabase/migrations/20251229_add_pedestrian_network.sql');
    console.log('\n   Or copy-paste this SQL:\n');

    const sql = `
-- Pedestrian Links Table
CREATE TABLE IF NOT EXISTS pedestrian_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id TEXT UNIQUE NOT NULL,
  station_id TEXT,
  start_node_id TEXT NOT NULL,
  end_node_id TEXT NOT NULL,
  geometry GEOGRAPHY(LineString, 4326),
  distance_meters NUMERIC(8,1),
  accessibility_rank TEXT,
  route_structure INTEGER,
  width_class INTEGER,
  vertical_slope INTEGER,
  level_difference INTEGER,
  has_braille_tiles BOOLEAN DEFAULT false,
  has_elevator_access BOOLEAN DEFAULT false,
  has_roof BOOLEAN DEFAULT false,
  source_dataset TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pedestrian Nodes Table
CREATE TABLE IF NOT EXISTS pedestrian_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id TEXT UNIQUE NOT NULL,
  station_id TEXT,
  coordinates GEOGRAPHY(Point, 4326),
  lat NUMERIC(10,7),
  lon NUMERIC(10,7),
  floor_level NUMERIC(3,1) DEFAULT 0,
  is_indoor BOOLEAN DEFAULT false,
  connected_links TEXT[],
  source_dataset TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ped_links_station ON pedestrian_links(station_id);
CREATE INDEX IF NOT EXISTS idx_ped_nodes_station ON pedestrian_nodes(station_id);
`;

    console.log(sql);
}

createTables().catch(console.error);
