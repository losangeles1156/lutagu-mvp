-- Migration: Fix Asakusabashi station duplication and hub configuration
-- The Toei.Asakusa.Asakusabashi version exists in DB, use it as main hub

-- Step 1: Set the physical Toei station as the main hub
UPDATE nodes 
SET is_hub = true, parent_hub_id = NULL
WHERE id = 'odpt.Station:Toei.Asakusa.Asakusabashi';

-- Step 2: Set the JR version as child of Toei hub
UPDATE nodes 
SET is_hub = false, parent_hub_id = 'odpt.Station:Toei.Asakusa.Asakusabashi'
WHERE id = 'odpt.Station:JR-East.ChuoSobuLocal.Asakusabashi';
