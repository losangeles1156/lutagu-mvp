-- Migration: Fix RPC Type Mismatch for Pedestrian Links
-- Previous version had a return type mismatch (numeric vs float) for distance_meters.

DROP FUNCTION IF EXISTS get_pedestrian_links_geojson(text[]);

CREATE OR REPLACE FUNCTION get_pedestrian_links_geojson(target_node_ids text[])
RETURNS TABLE (
  id uuid,
  start_node_id text,
  end_node_id text,
  has_elevator_access boolean,
  accessibility_rank text,
  distance_meters float,
  geometry json
)
LANGUAGE sql
AS $$
  select
    pl.id,
    pl.start_node_id,
    pl.end_node_id,
    pl.has_elevator_access,
    pl.accessibility_rank,
    pl.distance_meters::float, -- Explicit cast to float to match return type
    st_asgeojson(pl.geometry)::json as geometry
  from pedestrian_links pl
  where pl.start_node_id = any(target_node_ids)
     or pl.end_node_id = any(target_node_ids);
$$;
