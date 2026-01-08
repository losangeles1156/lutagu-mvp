-- Fix incorrect station ID prefix in l1_custom_places
-- Replaces 'odpt:Station' with 'odpt.Station' to match nodes table format

UPDATE l1_custom_places
SET station_id = REPLACE(station_id, 'odpt:Station', 'odpt.Station')
WHERE station_id LIKE 'odpt:Station%';
