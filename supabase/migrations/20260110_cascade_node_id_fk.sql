-- 修改 Foreign Key 約束為 ON UPDATE CASCADE，以便遷移節點 ID

-- 1. l3_facilities
ALTER TABLE l3_facilities DROP CONSTRAINT IF EXISTS l3_facilities_station_id_fkey;
ALTER TABLE l3_facilities ADD CONSTRAINT l3_facilities_station_id_fkey
    FOREIGN KEY (station_id) REFERENCES nodes(id) ON UPDATE CASCADE;

-- 2. nodes (parent_hub_id)
ALTER TABLE nodes DROP CONSTRAINT IF EXISTS nodes_parent_hub_id_fkey;
ALTER TABLE nodes ADD CONSTRAINT nodes_parent_hub_id_fkey
    FOREIGN KEY (parent_hub_id) REFERENCES nodes(id) ON UPDATE CASCADE;

-- 3. facilities
ALTER TABLE facilities DROP CONSTRAINT IF EXISTS facilities_node_id_fkey;
ALTER TABLE facilities ADD CONSTRAINT facilities_node_id_fkey
    FOREIGN KEY (node_id) REFERENCES nodes(id) ON UPDATE CASCADE;

-- 4. pois
ALTER TABLE pois DROP CONSTRAINT IF EXISTS pois_node_id_fkey;
ALTER TABLE pois ADD CONSTRAINT pois_node_id_fkey
    FOREIGN KEY (node_id) REFERENCES nodes(id) ON UPDATE CASCADE;

-- 5. shared_mobility_stations
ALTER TABLE shared_mobility_stations DROP CONSTRAINT IF EXISTS shared_mobility_stations_node_id_fkey;
ALTER TABLE shared_mobility_stations ADD CONSTRAINT shared_mobility_stations_node_id_fkey
    FOREIGN KEY (node_id) REFERENCES nodes(id) ON UPDATE CASCADE;

-- 6. nudge_logs
ALTER TABLE nudge_logs DROP CONSTRAINT IF EXISTS nudge_logs_node_id_fkey;
ALTER TABLE nudge_logs ADD CONSTRAINT nudge_logs_node_id_fkey
    FOREIGN KEY (node_id) REFERENCES nodes(id) ON UPDATE CASCADE;
