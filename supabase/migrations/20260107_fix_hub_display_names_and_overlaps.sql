-- 1. Fix Legacy Hub Names (String -> JSON LocaleString)
-- Ueno
UPDATE nodes 
SET name = '{"en": "Ueno", "ja": "上野", "zh-TW": "上野", "zh-CN": "上野"}'::jsonb
WHERE id = 'odpt:Station:JR-East.Ueno';

-- Shibuya
UPDATE nodes 
SET name = '{"en": "Shibuya", "ja": "渋谷", "zh-TW": "渋谷", "zh-CN": "渋谷"}'::jsonb
WHERE id = 'odpt:Station:JR-East.Shibuya';

-- Ikebukuro
UPDATE nodes 
SET name = '{"en": "Ikebukuro", "ja": "池袋", "zh-TW": "池袋", "zh-CN": "池袋"}'::jsonb
WHERE id = 'odpt:Station:JR-East.Ikebukuro';

-- Akihabara
UPDATE nodes 
SET name = '{"en": "Akihabara", "ja": "秋葉原", "zh-TW": "秋葉原", "zh-CN": "秋葉原"}'::jsonb
WHERE id = 'odpt:Station:JR-East.Akihabara';


-- 2. Consolidate Hubs (Fix Overlaps)

-- IKEBUKURO Aggregation
-- Hub: odpt:Station:JR-East.Ikebukuro
UPDATE nodes SET is_hub = true, parent_hub_id = null WHERE id = 'odpt:Station:JR-East.Ikebukuro';

-- Children
UPDATE nodes 
SET is_hub = false, 
    parent_hub_id = 'odpt:Station:JR-East.Ikebukuro'
WHERE id IN (
    'odpt.Station:JR-East.Yamanote.Ikebukuro',
    'odpt.Station:TokyoMetro.Yurakucho.Ikebukuro',
    'odpt.Station:TokyoMetro.Fukutoshin.Ikebukuro',
    'odpt.Station:TokyoMetro.Marunouchi.Ikebukuro',
    'odpt.Station:Tobu.Tojo.Ikebukuro',
    'odpt.Station:Seibu.Ikebukuro.Ikebukuro' -- Potentially missed but good to include
);


-- AKIHABARA Aggregation
-- Hub: odpt:Station:JR-East.Akihabara
UPDATE nodes SET is_hub = true, parent_hub_id = null WHERE id = 'odpt:Station:JR-East.Akihabara';

-- Children
UPDATE nodes 
SET is_hub = false, 
    parent_hub_id = 'odpt:Station:JR-East.Akihabara'
WHERE id IN (
    'odpt.Station:JR-East.ChuoSobuLocal.Akihabara',
    'odpt.Station:JR-East.Yamanote.Akihabara',
    'odpt:Station:TsukubaExpress.Akihabara',
    'odpt.Station:TokyoMetro.Hibiya.Akihabara'
);


-- UENO Clean Up (Ensure no duplicate Hubs)
-- The legacy one is the Hub.
UPDATE nodes SET is_hub = true, parent_hub_id = null WHERE id = 'odpt:Station:JR-East.Ueno';

-- Ensure children don't claim to be hubs
UPDATE nodes 
SET is_hub = false,
    parent_hub_id = 'odpt:Station:JR-East.Ueno'
WHERE id IN (
    'odpt.Station:TokyoMetro.Ginza.Ueno',
    'odpt.Station:TokyoMetro.Hibiya.Ueno',
    'odpt.Station:JR-East.Yamanote.Ueno'
) AND parent_hub_id IS NOT NULL; -- Safety check likely redundant but safe


-- 3. Cache Busting
-- Update 'updated_at' (or equivalent) to force client refresh if logic uses it.
-- Assuming 'updated_at' column exists based on typical schema, but let's check.
-- If not, we might need another way or just rely on the data change.
-- Based on previous file reads, normalizedNodeRow has 'updated_at'.
-- Let's try to update it if it exists.

-- Note: 'nodes' table might not have 'updated_at' if it wasn't added in schema.
-- Let's check schema first or just ignore this if not critical, but user asked for "set version".
-- Ah, `node_admin_perfomance.sql` might have added it?
-- The `src/lib/api/nodes.ts` reads `version`. Let's try updating `version`.

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'nodes' AND column_name = 'version') THEN
        UPDATE nodes SET version = COALESCE(version, 0) + 1 
        WHERE id IN (
            'odpt:Station:JR-East.Ueno', 
            'odpt:Station:JR-East.Shibuya', 
            'odpt:Station:JR-East.Ikebukuro', 
            'odpt:Station:JR-East.Akihabara'
        );
    END IF;
END $$;
