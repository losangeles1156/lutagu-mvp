-- =============================================================================
-- Complete Migration: Fix node hierarchy with coordinates
-- =============================================================================

-- Step 1: Disable foreign key constraint temporarily
ALTER TABLE nodes DROP CONSTRAINT IF EXISTS nodes_parent_hub_id_fkey;

-- Step 2: Check coordinates column type
SELECT data_type FROM information_schema.columns
WHERE table_name = 'nodes' AND column_name = 'coordinates';

-- Step 3: Insert missing hub records WITH coordinates
-- Using PostGIS geography type POINT(lon lat)
INSERT INTO nodes (id, name, node_type, parent_hub_id, is_hub, city_id, coordinates)
VALUES
('odpt:Station:JR-East.Shinjuku',
 '{"zh-TW": "新宿", "ja": "新宿", "en": "Shinjuku"}',
 'station', NULL, true, 'tokyo_core',
 ST_SetSRID(ST_MakePoint(139.7006, 35.6896), 4326))
ON CONFLICT (id) DO NOTHING;

INSERT INTO nodes (id, name, node_type, parent_hub_id, is_hub, city_id, coordinates)
VALUES
('odpt:Station:JR-East.Tokyo',
 '{"zh-TW": "東京", "ja": "東京", "en": "Tokyo"}',
 'station', NULL, true, 'tokyo_core',
 ST_SetSRID(ST_MakePoint(139.7671, 35.6812), 4326))
ON CONFLICT (id) DO NOTHING;

INSERT INTO nodes (id, name, node_type, parent_hub_id, is_hub, city_id, coordinates)
VALUES
('odpt:Station:JR-East.Ueno',
 '{"zh-TW": "上野", "ja": "上野", "en": "Ueno"}',
 'station', NULL, true, 'tokyo_core',
 ST_SetSRID(ST_MakePoint(139.7774, 35.7141), 4326))
ON CONFLICT (id) DO NOTHING;

-- Step 4: Create mapping for common hubs
CREATE TEMP TABLE hub_mapping (
    old_hub_id TEXT,
    new_hub_id TEXT
);

INSERT INTO hub_mapping (old_hub_id, new_hub_id) VALUES
('Hub:Ueno', 'odpt:Station:JR-East.Ueno'),
('Hub:Tokyo', 'odpt:Station:JR-East.Tokyo'),
('Hub:Shinjuku', 'odpt:Station:JR-East.Shinjuku');

-- Step 5: Update parent_hub_id references for child nodes
UPDATE nodes n
SET parent_hub_id = m.new_hub_id
FROM hub_mapping m
WHERE n.parent_hub_id = m.old_hub_id;

-- Step 6: Mark hub records
UPDATE nodes SET is_hub = true WHERE id LIKE 'Hub:%';

-- Step 7: Mark main hub stations
UPDATE nodes
SET is_hub = true
WHERE id IN (
    'odpt:Station:JR-East.Ueno',
    'odpt:Station:JR-East.Tokyo',
    'odpt:Station:JR-East.Shinjuku',
    'odpt:Station:JR-East.Ikebukuro',
    'odpt:Station:JR-East.Shibuya',
    'odpt:Station:JR-East.Akihabara',
    'odpt:Station:JR-East.Kanda',
    'odpt:Station:JR-East.Hatchobori',
    'odpt:Station:JR-East.Iidabashi',
    'odpt:Station:JR-East.Okachimachi',
    'odpt:Station:JR-East.Hamamatsucho',
    'odpt:Station:TokyoMetro.Ginza',
    'odpt:Station:TokyoMetro.Hibiya',
    'odpt:Station:TokyoMetro.Shimbashi',
    'odpt:Station:TokyoMetro.Roppongi',
    'odpt:Station:TokyoMetro.Omotesando',
    'odpt:Station:TokyoMetro.Akasakamitsuke',
    'odpt:Station:Toei.Jimbocho',
    'odpt:Station:Toei.Kudanshita',
    'odpt:Station:Toei.ShinOkachimachi',
    'odpt:Station:Toei.HigashiNihombashi',
    'odpt:Station:Toei.Ichigaya',
    'odpt:Station:Toei.Hibiya',
    'odpt:Station:TokyoMetro.Asakusa',
    'odpt:Station:Toei.Nihombashi'
);

-- Step 8: For any nodes with parent_hub_id = null that are NOT hubs,
-- they should remain as standalone stations (is_hub = false)
UPDATE nodes
SET is_hub = false
WHERE parent_hub_id IS NULL AND is_hub IS NULL;

-- Step 9: Restore foreign key constraint
ALTER TABLE nodes ADD CONSTRAINT nodes_parent_hub_id_fkey
FOREIGN KEY (parent_hub_id) REFERENCES nodes(id) ON DELETE SET NULL;

-- Step 10: Verify the results
SELECT id,
    CASE WHEN parent_hub_id IS NULL THEN 'HUB_OR_STANDALONE' ELSE 'CHILD' END as role,
    is_hub, parent_hub_id
FROM nodes
WHERE id LIKE '%Ueno%' OR id LIKE '%Tokyo%' OR id LIKE '%Shinjuku%'
ORDER BY id
LIMIT 30;

-- Step 11: Show summary
SELECT
    COUNT(*) FILTER (WHERE is_hub = true) as total_hubs,
    COUNT(*) FILTER (WHERE is_hub = false AND parent_hub_id IS NULL) as standalone_stations,
    COUNT(*) FILTER (WHERE parent_hub_id IS NOT NULL) as child_nodes
FROM nodes;
