
-- 1. Standardize Names and Parent Relationships for Core Hubs
-- This script ensures consistent JSON format and correct parent-child linking to prevent overlaps.

-- IKEBUKURO
UPDATE nodes 
SET name = '{"en": "Ikebukuro", "ja": "池袋", "zh-TW": "池袋", "zh-CN": "池袋"}'::jsonb,
    is_hub = true,
    parent_hub_id = null
WHERE id = 'odpt:Station:JR-East.Ikebukuro';

UPDATE nodes 
SET parent_hub_id = 'odpt:Station:JR-East.Ikebukuro',
    is_hub = false
WHERE (id LIKE 'odpt.Station%Ikebukuro' OR id LIKE 'odpt:Station%Ikebukuro')
  AND id != 'odpt:Station:JR-East.Ikebukuro';

-- SHIBUYA
UPDATE nodes 
SET name = '{"en": "Shibuya", "ja": "渋谷", "zh-TW": "澀谷", "zh-CN": "涩谷"}'::jsonb,
    is_hub = true,
    parent_hub_id = null
WHERE id = 'odpt:Station:JR-East.Shibuya';

UPDATE nodes 
SET parent_hub_id = 'odpt:Station:JR-East.Shibuya',
    is_hub = false
WHERE (id LIKE 'odpt.Station%Shibuya' OR id LIKE 'odpt:Station%Shibuya')
  AND id != 'odpt:Station:JR-East.Shibuya';

-- AKIHABARA
UPDATE nodes 
SET name = '{"en": "Akihabara", "ja": "秋葉原", "zh-TW": "秋葉原", "zh-CN": "秋葉原"}'::jsonb,
    is_hub = true,
    parent_hub_id = null
WHERE id = 'odpt:Station:JR-East.Akihabara';

UPDATE nodes 
SET parent_hub_id = 'odpt:Station:JR-East.Akihabara',
    is_hub = false
WHERE (id LIKE 'odpt.Station%Akihabara' OR id LIKE 'odpt:Station%Akihabara')
  AND id != 'odpt:Station:JR-East.Akihabara';

-- UENO
UPDATE nodes 
SET name = '{"en": "Ueno", "ja": "上野", "zh-TW": "上野", "zh-CN": "上野"}'::jsonb,
    is_hub = true,
    parent_hub_id = null
WHERE id = 'odpt:Station:JR-East.Ueno';

UPDATE nodes 
SET parent_hub_id = 'odpt:Station:JR-East.Ueno',
    is_hub = false
WHERE (id LIKE 'odpt.Station%Ueno' OR id LIKE 'odpt:Station%Ueno')
  AND id NOT IN ('odpt:Station:JR-East.Ueno', 'odpt.Station:TokyoMetro.Ginza.UenoHirokoji', 'odpt.Station:Toei.Oedo.UenoOkachimachi');

-- 2. Cleanup orphaned nodes that might be causing overlaps
-- Any node that is not a hub but has no parent_hub_id and shares coordinates with a hub should be linked.
WITH hub_coords AS (
    SELECT id as hub_id, coordinates 
    FROM nodes 
    WHERE is_hub = true
)
UPDATE nodes n
SET parent_hub_id = hc.hub_id,
    is_hub = false
FROM hub_coords hc
WHERE n.coordinates = hc.coordinates 
  AND n.id != hc.hub_id 
  AND n.parent_hub_id IS NULL;
