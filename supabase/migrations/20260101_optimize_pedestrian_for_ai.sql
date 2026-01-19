-- Migration: Optimize Pedestrian Network for AI Agents
-- Purpose: Add helper views, functions, and indices to allow efficient context retrieval by AI Agents.

-- 1. Additional Indices for Graph Traversal
CREATE INDEX IF NOT EXISTS idx_pedestrian_links_start_node ON pedestrian_links (start_node_id);
CREATE INDEX IF NOT EXISTS idx_pedestrian_links_end_node ON pedestrian_links (end_node_id);

-- 2. AI-Friendly View
-- This view pre-computes a natural language description of each link, useful for RAG or context injection.
CREATE OR REPLACE VIEW ai_pedestrian_graph_view AS
SELECT
    l.link_id,
    l.start_node_id,
    l.end_node_id,
    l.distance_meters,
    l.station_id,
    CONCAT(
        'Path segment from ', l.start_node_id, ' to ', l.end_node_id, '. ',
        'Distance: ', l.distance_meters, 'm. ',
        CASE
            WHEN l.route_structure = 5 THEN 'Type: Elevator. '
            WHEN l.route_structure = 4 THEN 'Type: Stairs. '
            WHEN l.route_structure = 3 THEN 'Type: Crosswalk. '
            WHEN l.route_structure = 1 THEN 'Type: Walkway. '
            ELSE 'Type: Path. '
        END,
        CASE WHEN l.has_elevator_access THEN 'Wheelchair Accessible (Elevator). ' ELSE '' END,
        CASE WHEN l.has_braille_tiles THEN 'Has Braille Tiles. ' ELSE '' END,
        CASE WHEN l.has_roof THEN 'Covered/Indoor. ' ELSE '' END,
        'Width Class: ', l.width_class, '. ',
        'Slope: ', l.vertical_slope, '. ',
        'Rank: ', COALESCE(l.accessibility_rank, 'Unknown')
    ) as llm_description,
    l.geometry
FROM pedestrian_links l;

-- 3. Context Retrieval Function (RPC)
-- Call this function via Supabase RPC: supabase.rpc('get_nearby_accessibility_graph', { lat, lon, radius_meters })
-- It returns a structured list of nodes and links nearby, ready to be fed into an LLM context window.
CREATE OR REPLACE FUNCTION get_nearby_accessibility_graph(
    query_lat double precision,
    query_lon double precision,
    radius_meters double precision DEFAULT 100
)
RETURNS TABLE (
    id text,
    type text, -- 'node' or 'link'
    description text,
    distance_from_query double precision,
    coordinates json
)
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with creator privileges (useful if RLS is strict, though public read is on)
AS $$
BEGIN
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
        ST_Distance(n.coordinates, ST_SetSRID(ST_MakePoint(query_lon, query_lat), 4326)::geography) as distance_from_query,
        ST_AsGeoJSON(n.coordinates)::json as coordinates
    FROM pedestrian_nodes n
    WHERE ST_DWithin(n.coordinates, ST_SetSRID(ST_MakePoint(query_lon, query_lat), 4326)::geography, radius_meters)
    ORDER BY distance_from_query ASC
    LIMIT 30;

    -- Return Links
    RETURN QUERY
    SELECT
        l.link_id as id,
        'link' as type,
        v.llm_description as description,
        ST_Distance(l.geometry, ST_SetSRID(ST_MakePoint(query_lon, query_lat), 4326)::geography) as distance_from_query,
        ST_AsGeoJSON(l.geometry)::json as coordinates
    FROM pedestrian_links l
    JOIN ai_pedestrian_graph_view v ON l.link_id = v.link_id
    WHERE ST_DWithin(l.geometry, ST_SetSRID(ST_MakePoint(query_lon, query_lat), 4326)::geography, radius_meters)
    ORDER BY distance_from_query ASC
    LIMIT 30;
END;
$$;
