-- =============================================================================
-- Migration: Update nodes table with parent_hub_id based on seedNodes
-- This ensures the hub/spoke hierarchy is correctly set in the database
-- =============================================================================

-- First, let's see what parent_hub_id values exist currently
SELECT id, parent_hub_id, COUNT(*) as cnt
FROM nodes
WHERE zone = 'core'
GROUP BY parent_hub_id, id
ORDER BY parent_hub_id NULLS FIRST
LIMIT 20;

-- Update parent_hub_id for Tokyo Metro nodes that should point to JR hubs
-- Ueno: TokyoMetro.Ueno -> JR-East.Ueno
UPDATE nodes SET parent_hub_id = 'odpt:Station:JR-East.Ueno'
WHERE id = 'odpt:Station:TokyoMetro.Ueno'
AND parent_hub_id IS NULL;

-- Shinjuku: TokyoMetro.Shinjuku -> JR-East.Shinjuku
UPDATE nodes SET parent_hub_id = 'odpt:Station:JR-East.Shinjuku'
WHERE id = 'odpt:Station:TokyoMetro.Shinjuku'
AND parent_hub_id IS NULL;

-- Ikebukuro: TokyoMetro.Ikebukuro -> JR-East.Ikebukuro
UPDATE nodes SET parent_hub_id = 'odpt:Station:JR-East.Ikebukuro'
WHERE id = 'odpt:Station:TokyoMetro.Ikebukuro'
AND parent_hub_id IS NULL;

-- Shibuya: TokyoMetro.Shibuya -> JR-East.Shibuya
UPDATE nodes SET parent_hub_id = 'odpt:Station:JR-East.Shibuya'
WHERE id = 'odpt:Station:TokyoMetro.Shibuya'
AND parent_hub_id IS NULL;

-- Kanda: TokyoMetro.Kanda -> JR-East.Kanda
UPDATE nodes SET parent_hub_id = 'odpt:Station:JR-East.Kanda'
WHERE id = 'odpt:Station:TokyoMetro.Kanda'
AND parent_hub_id IS NULL;

-- Tokyo: TokyoMetro.Tozai.Tokyo -> JR-East.Tokyo (as a child of the main hub)
UPDATE nodes SET parent_hub_id = 'odpt:Station:JR-East.Tokyo'
WHERE id = 'odpt:Station:TokyoMetro.Tozai.Tokyo'
AND parent_hub_id IS NULL;

-- Tokyo: TokyoMetro.Chiyoda.Tokyo -> JR-East.Tokyo
UPDATE nodes SET parent_hub_id = 'odpt:Station:JR-East.Tokyo'
WHERE id = 'odpt:Station:TokyoMetro.Chiyoda.Tokyo'
AND parent_hub_id IS NULL;

-- Otemachi: TokyoMetro.Otemachi -> JR-East.Tokyo (as it's part of Tokyo hub)
UPDATE nodes SET parent_hub_id = 'odpt:Station:JR-East.Tokyo'
WHERE id = 'odpt:Station:TokyoMetro.Otemachi'
AND parent_hub_id IS NULL;

-- Iidabashi: TokyoMetro.Iidabashi -> JR-East.Iidabashi
UPDATE nodes SET parent_hub_id = 'odpt:Station:JR-East.Iidabashi'
WHERE id = 'odpt:Station:TokyoMetro.Iidabashi'
AND parent_hub_id IS NULL;

-- Nihombashi: TokyoMetro.Nihombashi -> Toei.Nihombashi
UPDATE nodes SET parent_hub_id = 'odpt:Station:Toei.Nihombashi'
WHERE id = 'odpt:Station:TokyoMetro.Nihombashi'
AND parent_hub_id IS NULL;

-- Akihabara: TX.Akihabara -> JR-East.Akihabara
UPDATE nodes SET parent_hub_id = 'odpt:Station:JR-East.Akihabara'
WHERE id = 'odpt:Station:TsukubaExpress.Akihabara'
AND parent_hub_id IS NULL;

-- HigashiNihombashi: Toei.BakuroYokoyama -> Toei.HigashiNihombashi
UPDATE nodes SET parent_hub_id = 'odpt:Station:Toei.HigashiNihombashi'
WHERE id = 'odpt:Station:Toei.BakuroYokoyama'
AND parent_hub_id IS NULL;

-- Verify the updates
SELECT id, name, parent_hub_id,
    CASE WHEN parent_hub_id IS NULL THEN 'HUB' ELSE 'SPOKE' END as role
FROM nodes
WHERE zone = 'core'
AND (city_id = 'tokyo_core' OR city_id IS NULL)
ORDER BY parent_hub_id NULLS FIRST, id
LIMIT 30;
