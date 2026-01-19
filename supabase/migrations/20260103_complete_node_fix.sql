-- =============================================================================
-- Complete Fix: Reset all nodes to proper hub/spoke status
-- Problem: Many stations incorrectly marked as hubs (is_hub=true, parent_hub_id=NULL)
-- Solution: Reset based on seedNodes.ts design
-- =============================================================================

-- Step 1: First, let's see what we have now
SELECT COUNT(*) as total_nodes FROM nodes;
SELECT COUNT(*) FILTER (WHERE is_hub = true) as hubs FROM nodes;
SELECT COUNT(*) FILTER (WHERE parent_hub_id IS NOT NULL) as children FROM nodes;

-- Step 2: Create the definitive mapping from seedNodes.ts
DROP TABLE IF EXISTS seed_hierarchy_v3;
CREATE TEMP TABLE seed_hierarchy_v3 (
    node_id TEXT PRIMARY KEY,
    is_hub BOOLEAN NOT NULL,
    parent_hub_id TEXT
);

-- Insert ALL seed nodes hierarchy (from seedNodes.ts)
INSERT INTO seed_hierarchy_v3 (node_id, is_hub, parent_hub_id) VALUES

-- === JR EAST MAJOR HUBS (真正的樞紐車站) ===
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

-- === TOKYO METRO & TOEI HUBS ===
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
('odpt:Station:TokyoMetro.Asakusa', true, NULL),  -- 淺草是獨立的 Hub
('odpt:Station:Toei.Nihombashi', true, NULL),

-- === SPOKES (這些是子站，parent_hub_id 不為 null) ===
-- Ueno hub children
('odpt:Station:TokyoMetro.Ueno', false, 'odpt:Station:JR-East.Ueno'),
('odpt:Station:TsukubaExpress.Akihabara', false, 'odpt:Station:JR-East.Akihabara'),

-- Shinjuku hub children
('odpt:Station:TokyoMetro.Shinjuku', false, 'odpt:Station:JR-East.Shinjuku'),

-- Ikebukuro hub children
('odpt:Station:TokyoMetro.Ikebukuro', false, 'odpt:Station:JR-East.Ikebukuro'),

-- Shibuya hub children
('odpt:Station:TokyoMetro.Shibuya', false, 'odpt:Station:JR-East.Shibuya'),

-- Kanda hub children
('odpt:Station:TokyoMetro.Kanda', false, 'odpt:Station:JR-East.Kanda'),

-- Iidabashi hub children
('odpt:Station:TokyoMetro.Iidabashi', false, 'odpt:Station:JR-East.Iidabashi'),

-- Tokyo hub children
('odpt:Station:TokyoMetro.Otemachi', false, 'odpt:Station:JR-East.Tokyo'),

-- === ALL OTHER STATIONS ARE STANDALONE (is_hub=false, parent_hub_id=NULL) ===
-- These are regular stations that are NOT part of any hub

-- Step 3: Update all nodes to match the seed hierarchy
-- First, update nodes that ARE in our seed hierarchy
UPDATE nodes n
SET
    is_hub = s.is_hub,
    parent_hub_id = s.parent_hub_id
FROM seed_hierarchy_v3 s
WHERE n.id = s.node_id;

-- Step 4: For nodes NOT in our seed hierarchy, set them as standalone (is_hub=false)
-- EXCEPT for nodes that are already correctly set as hubs (major stations)
UPDATE nodes
SET is_hub = false, parent_hub_id = NULL
WHERE is_hub = true
  AND id NOT IN (SELECT node_id FROM seed_hierarchy_v3 WHERE is_hub = true);

-- Step 5: Verify the fix - Show summary
SELECT
    COUNT(*) FILTER (WHERE is_hub = true AND parent_hub_id IS NULL) as total_hubs,
    COUNT(*) FILTER (WHERE is_hub = false AND parent_hub_id IS NULL) as standalone_stations,
    COUNT(*) FILTER (WHERE parent_hub_id IS NOT NULL) as child_nodes,
    COUNT(*) as total
FROM nodes;

-- Step 6: Verify key stations
SELECT
    id,
    name->>'zh-TW' as name,
    is_hub,
    parent_hub_id,
    CASE
        WHEN is_hub = true AND parent_hub_id IS NULL THEN '✅ HUB'
        WHEN is_hub = false AND parent_hub_id IS NULL THEN '✅ STANDALONE'
        WHEN parent_hub_id IS NOT NULL THEN '✅ CHILD of ' || parent_hub_id
        ELSE '❌ UNKNOWN'
    END as status
FROM nodes
WHERE id IN (
    'odpt:Station:JR-East.Tokyo',
    'odpt:Station:JR-East.Shinjuku',
    'odpt:Station:JR-East.Ueno',
    'odpt:Station:JR-East.Ikebukuro',
    'odpt:Station:JR-East.Shibuya',
    'odpt:Station:JR-East.Akihabara',
    'odpt:Station:TokyoMetro.Otemachi',
    'odpt:Station:TokyoMetro.Shinjuku',
    'odpt:Station:TokyoMetro.Ikebukuro',
    'odpt:Station:TokyoMetro.Shibuya',
    'odpt:Station:TokyoMetro.Ueno',
    'odpt:Station:TokyoMetro.Ginza',
    'odpt:Station:TokyoMetro.Asakusa',
    'odpt:Station:Toei.Nihombashi'
)
ORDER BY name->>'zh-TW';

-- Step 7: Check some regular stations that should be standalone
SELECT
    id,
    name->>'zh-TW' as name,
    is_hub,
    parent_hub_id,
    CASE
        WHEN is_hub = true THEN '❌ SHOULD BE FALSE'
        ELSE '✅ OK'
    END as check_result
FROM nodes
WHERE id LIKE '%Takanawa%'
   OR id LIKE '%Tamachi%'
   OR id LIKE '%Sengakuji%'
   OR id LIKE '%Takanawadai%'
ORDER BY name->>'zh-TW';
