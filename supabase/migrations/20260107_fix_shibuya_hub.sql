-- Consolidate SHIBUYA Hubs
-- Hub: odpt:Station:JR-East.Shibuya (Legacy ID)
-- Set it as the Primary Hub
UPDATE nodes
SET is_hub = true,
    parent_hub_id = null
WHERE id = 'odpt:Station:JR-East.Shibuya';

-- Children
-- Point Yamanote and others to the Legacy Hub
UPDATE nodes
SET is_hub = false,
    parent_hub_id = 'odpt:Station:JR-East.Shibuya'
WHERE id IN (
    'odpt.Station:JR-East.Yamanote.Shibuya',
    'odpt.Station:TokyoMetro.Ginza.Shibuya',
    'odpt.Station:TokyoMetro.Hanzomon.Shibuya',
    'odpt.Station:TokyoMetro.Fukutoshin.Shibuya',
    'odpt.Station:Tokyu.Toyoko.Shibuya',
    'odpt.Station:Tokyu.DenEnToshi.Shibuya',
    'odpt.Station:Keio.Inokashira.Shibuya'
);

-- Version Bump for Shibuya
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'nodes' AND column_name = 'version') THEN
        UPDATE nodes SET version = COALESCE(version, 0) + 1
        WHERE id IN ('odpt:Station:JR-East.Shibuya');
    END IF;
END $$;
