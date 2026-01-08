-- ============================================
-- LUTAGU Admin Migration - Phase 3 & 4 (Fixed v3)
-- Fixed: DROP FUNCTION before CREATE OR REPLACE
-- Date: 2026-01-04
-- ============================================

-- PART 1: L1 Review Functions
DROP FUNCTION IF EXISTS approve_l1_place(TEXT, TEXT);
CREATE OR REPLACE FUNCTION approve_l1_place(p_source_id TEXT, p_notes TEXT DEFAULT 'Approved via function')
RETURNS JSON AS $$
DECLARE v_result JSON;
BEGIN
    UPDATE node_l1_config SET is_approved = TRUE, approved_at = NOW(), notes = p_notes, updated_at = NOW()
    WHERE source_id = p_source_id AND source_table = 'l1_places';
    GET DIAGNOSTICS v_result = ROW_COUNT;
    RETURN json_build_object('success', TRUE, 'source_id', p_source_id, 'updated_count', v_result);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP FUNCTION IF EXISTS reject_l1_place(TEXT, TEXT);
CREATE OR REPLACE FUNCTION reject_l1_place(p_source_id TEXT, p_notes TEXT DEFAULT 'Rejected via function')
RETURNS JSON AS $$
DECLARE v_result JSON;
BEGIN
    UPDATE node_l1_config SET is_approved = FALSE, notes = p_notes, updated_at = NOW()
    WHERE source_id = p_source_id AND source_table = 'l1_places';
    GET DIAGNOSTICS v_result = ROW_COUNT;
    RETURN json_build_object('success', TRUE, 'source_id', p_source_id, 'updated_count', v_result);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP FUNCTION IF EXISTS batch_approve_places_optimized(TEXT[], TEXT);
CREATE OR REPLACE FUNCTION batch_approve_places_optimized(p_place_ids TEXT[], p_notes TEXT DEFAULT 'Batch approved')
RETURNS JSON AS $$
DECLARE v_count INTEGER; v_start_time TIMESTAMPTZ;
BEGIN
    v_start_time := NOW();
    UPDATE node_l1_config SET is_approved = TRUE, approved_at = NOW(), notes = p_notes, updated_at = NOW()
    WHERE source_id = ANY(p_place_ids) AND source_table = 'l1_places' AND (is_approved = FALSE OR is_approved IS NULL);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN json_build_object('success', TRUE, 'approved_count', v_count, 'execution_time_ms', EXTRACT(MILLISECONDS FROM NOW() - v_start_time)::INT);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PART 2: Node Management Functions
DROP FUNCTION IF EXISTS get_all_hubs();
CREATE OR REPLACE FUNCTION get_all_hubs()
RETURNS TABLE (id TEXT, name JSONB, location JSONB, ward_id TEXT, is_active BOOLEAN, child_count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        n.id, 
        n.name, 
        jsonb_build_object('type', 'Point', 'coordinates', jsonb_build_array(ST_X(n.coordinates), ST_Y(n.coordinates))) as location,
        n.ward_id, 
        COALESCE(h.is_active, TRUE) AS is_active,
        (SELECT COUNT(*) FROM nodes c WHERE c.parent_hub_id = n.id)::BIGINT AS child_count
    FROM nodes n 
    LEFT JOIN node_hierarchy h ON n.id = h.node_id
    WHERE n.parent_hub_id IS NULL 
    ORDER BY n.name->>'zh-TW';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP FUNCTION IF EXISTS merge_nodes_to_hub(TEXT, TEXT[]);
CREATE OR REPLACE FUNCTION merge_nodes_to_hub(p_hub_id TEXT, p_child_ids TEXT[])
RETURNS JSON AS $$
DECLARE v_count INTEGER := 0;
BEGIN
    UPDATE nodes SET parent_hub_id = p_hub_id WHERE id = ANY(p_child_ids) AND id != p_hub_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    FOR i IN 1..array_length(p_child_ids, 1) LOOP
        INSERT INTO node_hierarchy (node_id, hub_id, is_active, display_order)
        VALUES (p_child_ids[i], p_hub_id, TRUE, 0) ON CONFLICT (node_id) DO UPDATE SET hub_id = EXCLUDED.hub_id, updated_at = NOW();
    END LOOP;
    RETURN json_build_object('success', TRUE, 'merged_count', v_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP FUNCTION IF EXISTS unmerge_nodes(TEXT[]);
CREATE OR REPLACE FUNCTION unmerge_nodes(p_child_ids TEXT[])
RETURNS JSON AS $$
DECLARE v_count INTEGER := 0;
BEGIN
    UPDATE nodes SET parent_hub_id = NULL WHERE id = ANY(p_child_ids) AND parent_hub_id IS NOT NULL;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    UPDATE node_hierarchy SET hub_id = NULL, updated_at = NOW() WHERE node_id = ANY(p_child_ids);
    RETURN json_build_object('success', TRUE, 'unmerged_count', v_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP FUNCTION IF EXISTS deactivate_nodes(TEXT[]);
CREATE OR REPLACE FUNCTION deactivate_nodes(p_node_ids TEXT[])
RETURNS JSON AS $$
DECLARE v_count INTEGER := 0;
BEGIN
    UPDATE node_hierarchy SET is_active = FALSE, updated_at = NOW() WHERE node_id = ANY(p_node_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN json_build_object('success', TRUE, 'deactivated_count', v_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP FUNCTION IF EXISTS activate_nodes(TEXT[]);
CREATE OR REPLACE FUNCTION activate_nodes(p_node_ids TEXT[])
RETURNS JSON AS $$
DECLARE v_count INTEGER := 0;
BEGIN
    UPDATE node_hierarchy SET is_active = TRUE, updated_at = NOW() WHERE node_id = ANY(p_node_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN json_build_object('success', TRUE, 'activated_count', v_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PART 3: Performance Indexes
DROP INDEX IF EXISTS idx_l1_config_node_status;
CREATE INDEX idx_l1_config_node_status ON node_l1_config(node_id, is_approved, category);
DROP INDEX IF EXISTS idx_l1_config_source;
CREATE INDEX idx_l1_config_source ON node_l1_config(source_id) WHERE source_table = 'l1_places';
DROP INDEX IF EXISTS idx_l1_pending_covering;
CREATE INDEX idx_l1_pending_covering ON node_l1_config(node_id, category, source_id) INCLUDE (is_approved, is_featured, notes) WHERE is_approved = FALSE OR is_approved IS NULL;

-- PART 4: Views
DROP VIEW IF EXISTS v_l1_quick_stats;
CREATE VIEW v_l1_quick_stats AS
SELECT 'total' AS stat_type, (SELECT COUNT(*) FROM node_l1_config) AS value
UNION ALL SELECT 'pending' AS stat_type, (SELECT COUNT(*) FROM node_l1_config WHERE is_approved = FALSE OR is_approved IS NULL) AS value
UNION ALL SELECT 'approved' AS stat_type, (SELECT COUNT(*) FROM node_l1_config WHERE is_approved = TRUE) AS value;

DROP VIEW IF EXISTS v_core_wards;
CREATE VIEW v_core_wards AS
SELECT w.id, w.name_i18n, w.ward_code, COUNT(n.id) AS node_count
FROM wards w LEFT JOIN nodes n ON w.id = n.ward_id
WHERE w.id LIKE 'ward:%' GROUP BY w.id, w.name_i18n, w.ward_code ORDER BY w.ward_code;

-- PART 5: RPC Functions
DROP FUNCTION IF EXISTS public.nearby_nodes_v2(float, float, int, int);
CREATE OR REPLACE FUNCTION public.nearby_nodes_v2(center_lat float, center_lon float, radius_meters int, max_results int default 5000)
RETURNS TABLE (id text, parent_hub_id text, city_id text, name jsonb, type text, location jsonb, is_hub boolean, geohash text, vibe text, zone text, is_active boolean) AS $$
DECLARE center_point geometry;
BEGIN
    center_point := ST_SetSRID(ST_MakePoint(center_lon, center_lat), 4326);
    RETURN QUERY
    SELECT n.id, n.parent_hub_id, n.city_id, n.name, n.node_type as type,
           jsonb_build_object('type', 'Point', 'coordinates', jsonb_build_array(ST_X(n.coordinates), ST_Y(n.coordinates))) as location,
           (n.parent_hub_id is null) as is_hub, null::text as geohash, null::text as vibe, 'core'::text as zone,
           COALESCE(nh.is_active, true) as is_active
    FROM public.nodes n LEFT JOIN public.node_hierarchy nh ON n.id = nh.node_id
    WHERE ST_DWithin(n.coordinates::geography, center_point::geography, radius_meters)
      AND NOT (ST_X(n.coordinates) = 0 AND ST_Y(n.coordinates) = 0)
      AND COALESCE(nh.is_active, true) = true
    ORDER BY n.coordinates <-> center_point LIMIT GREATEST(1, LEAST(max_results, 20000));
END;
$$ LANGUAGE plpgsql;
GRANT EXECUTE ON FUNCTION public.nearby_nodes_v2 TO anon, authenticated;
