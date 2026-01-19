-- =============================================================================
-- Fix: Ensure parent_hub_id is correctly set for all nodes
-- Problem: RPC calculates is_hub from parent_hub_id, but parent_hub_id is NULL
-- for many nodes that should be standalone (is_hub = false)
-- =============================================================================

-- Step 1: First, verify current state
SELECT
    id,
    name->>'zh-TW' as name,
    is_hub,
    parent_hub_id
FROM nodes
WHERE id LIKE '%Shinagawa%'
   OR id LIKE '%Takanawa%'
   OR id LIKE '%品川%'
ORDER BY id;

-- Step 2: For nodes where is_hub = false AND parent_hub_id is null, they should remain as standalone
-- For nodes where is_hub = true AND parent_hub_id is null, they are correctly hubs

-- Step 3: Check which nodes have is_hub = true but shouldn't be hubs
-- (These are nodes that were incorrectly marked as hubs)
SELECT
    id,
    name->>'zh-TW' as name,
    is_hub,
    parent_hub_id,
    CASE
        WHEN name->>'zh-TW' LIKE '%山手%' THEN 'Yamanote Line station - should be child of Shinjuku/Tokyo hub'
        WHEN name->>'zh-TW' LIKE '%京浜%' THEN 'Keihin-Tohoku Line station - depends on location'
        ELSE 'Check manually'
    END as note
FROM nodes
WHERE is_hub = true
   AND (id LIKE '%Yamanote%' OR id LIKE '%Keihin%')
ORDER BY name->>'zh-TW';

-- Step 4: Fix - Set parent_hub_id for Yamanote/Keihin stations that should be children of major hubs
-- For example, TakanawaGateway should be a child of Shinagawa hub (if it exists)

-- First, let's check what hubs exist
SELECT id, name->>'zh-TW' as name, is_hub, parent_hub_id
FROM nodes
WHERE (name->>'zh-TW' LIKE '%品川%' OR name->>'zh-TW' LIKE '%東京%' OR name->>'zh-TW' LIKE '%新宿%')
   AND parent_hub_id IS NULL
ORDER BY name->>'zh-TW';

-- Step 5: Create a mapping of stations that should have parent_hub_id set
-- These are stations that are part of major hubs but are incorrectly marked as hubs themselves

-- If Shinagawa hub doesn't exist, create it or use Tokyo hub
-- Let's check Tokyo area stations
SELECT
    id,
    name->>'zh-TW' as name,
    is_hub,
    parent_hub_id,
    ST_X(coordinates) as lon,
    ST_Y(coordinates) as lat
FROM nodes
WHERE (name->>'zh-TW' LIKE '%品川%'
   OR name->>'zh-TW' LIKE '%高輪%'
   OR name->>'zh-TW' LIKE '%大崎%')
   AND is_active = true
ORDER BY ST_Y(coordinates) DESC;

-- Step 6: Update parent_hub_id for stations that are children of major hubs
-- For example, set TokyoMetro stations that are at Tokyo station to have parent_hub_id = 'odpt:Station:JR-East.Tokyo'

-- Check Tokyo Metro Otemachi
SELECT
    id,
    name->>'zh-TW' as name,
    is_hub,
    parent_hub_id
FROM nodes
WHERE id LIKE '%Otemachi%' OR name->>'zh-TW' LIKE '%大手町%';

-- Step 7: Update Otemachi to be a child of Tokyo hub (if Tokyo hub exists)
UPDATE nodes
SET parent_hub_id = 'odpt:Station:JR-East.Tokyo'
WHERE id = 'odpt:Station:TokyoMetro.Otemachi'
   AND is_hub = false;

-- Step 8: Summary - Show final state of key stations
SELECT
    id,
    name->>'zh-TW' as name,
    is_hub,
    parent_hub_id,
    CASE
        WHEN parent_hub_id IS NULL AND is_hub = true THEN 'HUB (correct)'
        WHEN parent_hub_id IS NULL AND is_hub = false THEN 'STANDALONE (correct)'
        WHEN parent_hub_id IS NOT NULL THEN 'CHILD of ' || parent_hub_id
        ELSE 'UNKNOWN'
    END as status
FROM nodes
WHERE id IN (
    'odpt:Station:JR-East.Tokyo',
    'odpt:Station:JR-East.Shinjuku',
    'odpt:Station:JR-East.Ueno',
    'odpt:Station:JR-East.Ikebukuro',
    'odpt:Station:JR-East.Shibuya',
    'odpt:Station:TokyoMetro.Otemachi',
    'odpt:Station:TokyoMetro.Ginza',
    'odpt:Station:TokyoMetro.Shinjuku',
    'odpt:Station:TokyoMetro.Ikebukuro',
    'odpt:Station:TokyoMetro.Shibuya',
    'odpt:Station:TokyoMetro.Ueno'
)
ORDER BY name->>'zh-TW';
