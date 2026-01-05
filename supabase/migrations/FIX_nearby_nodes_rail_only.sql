-- Fix nearby_nodes_v2 to show only rail stations (TokyoMetro, Toei, JR East)
-- Date: 2026-01-04

DROP FUNCTION IF EXISTS public.nearby_nodes_v2(float, float, int, int);

CREATE OR REPLACE FUNCTION public.nearby_nodes_v2(
  center_lat float,
  center_lon float,
  radius_meters int,
  max_results int default 5000
)
RETURNS TABLE (
  id text,
  parent_hub_id text,
  city_id text,
  name jsonb,
  type text,
  location jsonb,
  is_hub boolean,
  geohash text,
  vibe text,
  zone text,
  is_active boolean
) AS $$
DECLARE
  center_point geometry;
BEGIN
  center_point := ST_SetSRID(ST_MakePoint(center_lon, center_lat), 4326);

  RETURN QUERY
  SELECT
    n.id,
    n.parent_hub_id,
    n.city_id,
    n.name,
    n.node_type as type,
    jsonb_build_object(
      'type', 'Point',
      'coordinates', jsonb_build_array(ST_X(n.coordinates), ST_Y(n.coordinates))
    ) as location,
    (n.parent_hub_id is null) as is_hub,
    null::text as geohash,
    null::text as vibe,
    'core'::text as zone,
    COALESCE(nh.is_active, true) as is_active
  FROM public.nodes n
  LEFT JOIN public.node_hierarchy nh ON n.id = nh.node_id
  WHERE ST_DWithin(n.coordinates::geography, center_point::geography, radius_meters)
    AND NOT (ST_X(n.coordinates) = 0 AND ST_Y(n.coordinates) = 0)
    AND COALESCE(nh.is_active, true) = true
    -- Only show rail stations (filter out bus_stop, poi, etc.)
    AND n.node_type = 'station'
    -- Only show TokyoMetro, Toei, JR East
    AND (
      n.id LIKE 'odpt.Station:TokyoMetro.%'
      OR n.id LIKE 'odpt.Station:Toei.%'
      OR n.id LIKE 'odpt.Station:JR.%'
    )
  ORDER BY n.coordinates <-> center_point
  LIMIT GREATEST(1, LEAST(max_results, 20000));
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.nearby_nodes_v2 TO anon, authenticated;

-- Test query
-- SELECT id, name, type FROM nearby_nodes_v2(35.6812, 139.7671, 10000, 50) LIMIT 20;
