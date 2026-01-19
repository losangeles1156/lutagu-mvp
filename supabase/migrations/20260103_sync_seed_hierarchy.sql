-- =============================================================================
-- Complete Migration: Sync seedNodes hub/spoke structure to database
-- Fixed: Uses correct column names from nodes table
-- =============================================================================

-- Step 1: Add is_hub column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'nodes' AND column_name = 'is_hub'
    ) THEN
        ALTER TABLE nodes ADD COLUMN is_hub BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added is_hub column to nodes table';
    ELSE
        RAISE NOTICE 'is_hub column already exists';
    END IF;
END $$;

-- Step 2: Create a temporary table with seed node data
CREATE TEMP TABLE seed_nodes_hierarchy (
    node_id TEXT PRIMARY KEY,
    is_hub BOOLEAN NOT NULL,
    parent_hub_id TEXT
);

-- Step 3: Insert seed node hierarchy data
INSERT INTO seed_nodes_hierarchy (node_id, is_hub, parent_hub_id) VALUES
-- JR East Major Hubs (is_hub = true, parent_hub_id = null)
('odpt:Station:JR-East.Ueno', true, NULL),
('odpt:Station:JR-East.Akihabara', true, NULL),
('odpt:Station:JR-East.Tokyo', true, NULL),
('odpt:Station:JR-East.Shinjuku', true, NULL),
('odpt:Station:JR-East.Ikebukuro', true, NULL),
('odpt:Station:JR-East.Shibuya', true, NULL),
('odpt:Station:JR-East.Kanda', true, NULL),
('odpt:Station:JR-East.Hatchobori', true, NULL),
('odpt:Station:JR-East.Iidabashi', true, NULL),
('odpt:Station:JR-East.Okachimachi', true, NULL),
('odpt:Station:JR-East.Hamamatsucho', true, NULL),

-- Tokyo Metro Hubs (some are hubs, some are spokes)
('odpt:Station:TokyoMetro.Ginza', true, NULL),
('odpt:Station:TokyoMetro.Hibiya', true, NULL),
('odpt:Station:TokyoMetro.Shimbashi', true, NULL),
('odpt:Station:TokyoMetro.Roppongi', true, NULL),
('odpt:Station:TokyoMetro.Omotesando', true, NULL),
('odpt:Station:TokyoMetro.Akasakamitsuke', true, NULL),
('odpt:Station:Toei.Jimbocho', true, NULL),
('odpt:Station:Toei.Kudanshita', true, NULL),
('odpt:Station:Toei.ShinOkachimachi', true, NULL),
('odpt:Station:Toei.HigashiNihombashi', true, NULL),
('odpt:Station:Toei.Ichigaya', true, NULL),
('odpt:Station:Toei.Hibiya', true, NULL),
('odpt:Station:TokyoMetro.Asakusa', true, NULL),
('odpt:Station:Toei.Nihombashi', true, NULL),

-- Spokes (children of JR hubs)
('odpt:Station:TokyoMetro.Ueno', false, 'odpt:Station:JR-East.Ueno'),
('odpt:Station:TokyoMetro.Ginza.Ueno', false, 'odpt:Station:JR-East.Ueno'),
('odpt:Station:TokyoMetro.Hibiya.Ueno', false, 'odpt:Station:JR-East.Ueno'),
('odpt:Station:Keisei.Ueno', false, 'odpt:Station:JR-East.Ueno'),

('odpt:Station:TokyoMetro.Shinjuku', false, 'odpt:Station:JR-East.Shinjuku'),
('odpt:Station:TokyoMetro.Marunouchi.Shinjuku', false, 'odpt:Station:JR-East.Shinjuku'),
('odpt:Station:Toei.Oedo.Shinjuku', false, 'odpt:Station:JR-East.Shinjuku'),
('odpt:Station:Keio.Shinjuku', false, 'odpt:Station:JR-East.Shinjuku'),
('odpt:Station:Odakyu.Shinjuku', false, 'odpt:Station:JR-East.Shinjuku'),

('odpt:Station:TokyoMetro.Ikebukuro', false, 'odpt:Station:JR-East.Ikebukuro'),
('odpt:Station:TokyoMetro.Yurakucho.Ikebukuro', false, 'odpt:Station:JR-East.Ikebukuro'),
('odpt:Station:Seibu.Ikebukuro', false, 'odpt:Station:JR-East.Ikebukuro'),
('odpt:Station:Tobu.Ikebukuro', false, 'odpt:Station:JR-East.Ikebukuro'),

('odpt:Station:TokyoMetro.Shibuya', false, 'odpt:Station:JR-East.Shibuya'),
('odpt:Station:TokyoMetro.Ginza.Shibuya', false, 'odpt:Station:JR-East.Shibuya'),
('odpt:Station:TokyoMetro.Hanzomon.Shibuya', false, 'odpt:Station:JR-East.Shibuya'),
('odpt:Station:Tokyu.Toyoko.Shibuya', false, 'odpt:Station:JR-East.Shibuya'),
('odpt:Station:Keio.Inokashira.Shibuya', false, 'odpt:Station:JR-East.Shibuya'),

('odpt:Station:TokyoMetro.Kanda', false, 'odpt:Station:JR-East.Kanda'),
('odpt:Station:TokyoMetro.Ginza.Kanda', false, 'odpt:Station:JR-East.Kanda'),
('odpt:Station:TokyoMetro.Hibiya.Kanda', false, 'odpt:Station:JR-East.Kanda'),

('odpt:Station:TokyoMetro.Hibiya.Akihabara', false, 'odpt:Station:JR-East.Akihabara'),
('odpt:Station:TsukubaExpress.Akihabara', false, 'odpt:Station:JR-East.Akihabara'),

-- Other spokes
('odpt:Station:TokyoMetro.Nihombashi', false, 'odpt:Station:Toei.Nihombashi'),
('odpt:Station:Toei.BakuroYokoyama', false, 'odpt:Station:Toei.HigashiNihombashi'),
('odpt:Station:TokyoMetro.Otemachi', false, 'odpt:Station:JR-East.Tokyo'),
('odpt:Station:TokyoMetro.Iidabashi', false, 'odpt:Station:JR-East.Iidabashi'),
('odpt:Station:TokyoMetro.Marunouchi.Tokyo', false, 'odpt:Station:JR-East.Tokyo'),
('odpt:Station:TokyoMetro.Tozai.Tokyo', false, 'odpt:Station:JR-East.Tokyo'),
('odpt:Station:TokyoMetro.Chiyoda.Tokyo', false, 'odpt:Station:JR-East.Tokyo'),

-- Non-hub stations (still need to set is_hub = false, parent_hub_id = null)
('odpt:Station:TokyoMetro.Kyobashi', false, NULL),
('odpt:Station:TokyoMetro.Mitsukoshimae', false, NULL),
('odpt:Station:TokyoMetro.Kayabacho', false, NULL),
('odpt:Station:Toei.HigashiGinza', false, NULL),
('odpt:Station:Toei.Ningyocho', false, NULL),
('odpt:Station:Toei.Kuramae', false, NULL),
('odpt:Station:Toei.Asakusabashi', false, NULL),
('odpt:Station:TokyoMetro.Tawaramachi', false, NULL),
('odpt:Station:TokyoMetro.Iriya', false, NULL),
('odpt:Station:TokyoMetro.Inaricho', false, NULL),
('odpt:Station:TokyoMetro.Minowa', false, NULL),
('odpt:Station:TokyoMetro.Yushima', false, NULL),
('odpt:Station:TokyoMetro.Tsukiji', false, NULL),
('odpt:Station:TokyoMetro.Ochanomizu', false, NULL),
('odpt:Station:TokyoMetro.Kasumigaseki', false, NULL),
('odpt:Station:Toei.Takaracho', false, NULL),
('odpt:Station:Toei.Kachidoki', false, NULL),
('odpt:Station:Toei.Tsukishima', false, NULL),
('odpt:Station:Toei.Tsukijishijo', false, NULL),
('odpt:Station:Toei.Hamacho', false, NULL),
('odpt:Station:Toei.Ogawamachi', false, NULL),
('odpt:Station:Toei.Iwamotocho', false, NULL),
('odpt:Station:Toei.Uchisaiwaicho', false, NULL),
('odpt:Station:JR-East.Uguisudani', false, NULL),
('odpt:Station:TokyoMetro.Hiroo', false, NULL);

-- Step 4: Update nodes table with seed data
UPDATE nodes n
SET
    is_hub = s.is_hub,
    parent_hub_id = s.parent_hub_id
FROM seed_nodes_hierarchy s
WHERE n.id = s.node_id;

-- Step 5: For any remaining nodes without parent_hub_id, set is_hub = true (they are standalone hubs)
UPDATE nodes
SET is_hub = TRUE
WHERE parent_hub_id IS NULL AND is_hub IS NULL;

-- Step 6: Verify the results - Fixed column names
SELECT
    CASE WHEN parent_hub_id IS NULL THEN 'HUB' ELSE 'SPOKE' END as role,
    COUNT(*) as count
FROM nodes
GROUP BY role;

-- Step 7: Show summary
SELECT
    COUNT(*) FILTER (WHERE is_hub = true) as total_hubs,
    COUNT(*) FILTER (WHERE is_hub = false) as total_spokes,
    COUNT(*) FILTER (WHERE parent_hub_id IS NOT NULL) as spokes_with_parents,
    COUNT(*) FILTER (WHERE is_hub IS NULL) as unknown_status
FROM nodes;

-- Step 8: Show sample data
SELECT id,
    CASE WHEN parent_hub_id IS NULL THEN 'HUB' ELSE 'SPOKE' END as role,
    parent_hub_id
FROM nodes
WHERE id LIKE '%Ueno%' OR id LIKE '%Tokyo%' OR id LIKE '%Shinjuku%'
ORDER BY id
LIMIT 20;
