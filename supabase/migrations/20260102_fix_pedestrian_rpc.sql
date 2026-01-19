-- Migration: Optimize Pedestrian Accessibility Search (RPC)
-- Date: 2026-01-02
-- Description: Creates high-performance PostGIS functions to search for nearby pedestrian nodes and links.

-- 1. Function to get nearby nodes and summary links
CREATE OR REPLACE FUNCTION public.get_nearby_accessibility_graph(
    query_lat double precision,
    query_lon double precision,
    radius_meters double precision DEFAULT 100
)
RETURNS TABLE (
    id text,
    type text,
    description text,
    distance_from_query double precision,
    coordinates json
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    center_geog geography;
BEGIN
    center_geog := ST_SetSRID(ST_MakePoint(query_lon, query_lat), 4326)::geography;

    -- Return Nodes
    RETURN QUERY
    SELECT
        n.node_id as id,
        'node' as type,
        CONCAT(
            'Node ID: ', n.node_id, '. ',
            'Floor: ', COALESCE(n.floor_level::text, 'G'), '. ',
            CASE WHEN n.is_indoor THEN 'Indoor. ' ELSE 'Outdoor. ' END,
            'Connected to station: ', COALESCE(n.station_id, 'None')
        ) as description,
        ST_Distance(n.coordinates, center_geog) as distance_from_query,
        ST_AsGeoJSON(n.coordinates)::json as coordinates
    FROM public.pedestrian_nodes n
    WHERE ST_DWithin(n.coordinates, center_geog, radius_meters)
    ORDER BY n.coordinates <-> center_geog
    LIMIT 30;

    -- Return Links (Summary for context)
    RETURN QUERY
    SELECT
        l.link_id as id,
        'link' as type,
        v.llm_description as description,
        ST_Distance(l.geometry, center_geog) as distance_from_query,
        ST_AsGeoJSON(l.geometry)::json as coordinates
    FROM public.pedestrian_links l
    JOIN public.ai_pedestrian_graph_view v ON l.link_id = v.link_id
    WHERE ST_DWithin(l.geometry, center_geog, radius_meters)
    ORDER BY l.geometry <-> center_geog
    LIMIT 30;
END;
$$;

-- 2. Function to get links with GeoJSON for frontend rendering
CREATE OR REPLACE FUNCTION public.get_pedestrian_links_geojson(target_node_ids text[])
RETURNS TABLE (
  id uuid,
  link_id text,
  start_node_id text,
  end_node_id text,
  has_elevator_access boolean,
  accessibility_rank text,
  distance_meters float,
  geometry json
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pl.id,
    pl.link_id,
    pl.start_node_id,
    pl.end_node_id,
    pl.has_elevator_access,
    pl.accessibility_rank,
    pl.distance_meters::float,
    ST_AsGeoJSON(pl.geometry)::json as geometry
  FROM public.pedestrian_links pl
  WHERE pl.start_node_id = ANY(target_node_ids)
     OR pl.end_node_id = ANY(target_node_ids);
END;
$$;

-- Permissions
ALTER FUNCTION public.get_nearby_accessibility_graph(double precision, double precision, double precision)
    SET search_path = public, extensions, pg_temp;

ALTER FUNCTION public.get_pedestrian_links_geojson(text[])
    SET search_path = public, extensions, pg_temp;

GRANT EXECUTE ON FUNCTION public.get_nearby_accessibility_graph(double precision, double precision, double precision) TO anon;
GRANT EXECUTE ON FUNCTION public.get_nearby_accessibility_graph(double precision, double precision, double precision) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pedestrian_links_geojson(text[]) TO anon;
GRANT EXECUTE ON FUNCTION public.get_pedestrian_links_geojson(text[]) TO authenticated;
