-- ============================================
-- Phase 3: 性能優化 - Supabase Studio 效率提升
-- Date: 2026-01-04
-- ============================================

-- ============================================
-- 1. 創建複合索引（優化查詢性能）
-- ============================================

-- node_l1_config: 優化按站點和狀態查詢
DROP INDEX IF EXISTS idx_l1_config_node_status;
CREATE INDEX idx_l1_config_node_status ON node_l1_config(node_id, is_approved, category);

-- node_l1_config: 優化按 source_id 查詢（批量操作）
DROP INDEX IF EXISTS idx_l1_config_source;
CREATE INDEX idx_l1_config_source ON node_l1_config(source_id) WHERE source_table = 'l1_places';

-- node_hierarchy: 優化 Hub 查詢
DROP INDEX IF EXISTS idx_node_hierarchy_active;
CREATE INDEX idx_node_hierarchy_active ON node_hierarchy(hub_id, is_active) WHERE is_active = TRUE;

-- l1_places: 優化站點和分類查詢
DROP INDEX IF EXISTS idx_l1_places_station_category;
CREATE INDEX idx_l1_places_station_category ON l1_places(station_id, category);

-- l1_places: 優化 OSM ID 查詢
DROP INDEX IF EXISTS idx_l1_places_osm;
CREATE INDEX idx_l1_places_osm ON l1_places(osm_id);

-- ============================================
-- 2. 創建部分索引（減少索引大小）
-- ============================================

-- 只索引已批准的記錄（前端查詢常用）
DROP INDEX IF EXISTS idx_l1_config_approved;
CREATE INDEX idx_l1_config_approved ON node_l1_config(node_id, category, display_order) 
WHERE is_approved = TRUE;

-- 只索引激活的節點
DROP INDEX IF EXISTS idx_node_hierarchy_active_nodes;
CREATE INDEX idx_node_hierarchy_active_nodes ON node_hierarchy(node_id, hub_id) 
WHERE is_active = TRUE;

-- ============================================
-- 3. 創建覆蓋索引（Covering Index）
-- ============================================

-- 讓 v_l1_pending 查詢只需掃描索引
DROP INDEX IF EXISTS idx_l1_pending_covering;
CREATE INDEX idx_l1_pending_covering ON node_l1_config(node_id, category, source_id) 
INCLUDE (is_approved, is_featured, notes)
WHERE is_approved = FALSE OR is_approved IS NULL;

-- ============================================
-- 4. 創建物化視圖緩存統計數據
-- ============================================

DROP MATERIALIZED VIEW IF EXISTS mv_l1_stats_cache;
CREATE MATERIALIZED VIEW mv_l1_stats_cache AS
SELECT 
    node_id,
    category,
    COUNT(*) FILTER (WHERE is_approved = TRUE) AS approved_count,
    COUNT(*) FILTER (WHERE is_approved = FALSE OR is_approved IS NULL) AS pending_count,
    COUNT(*) AS total_count,
    ROUND(
        COUNT(*) FILTER (WHERE is_approved = TRUE)::NUMERIC / 
        NULLIF(COUNT(*), 0) * 100, 2
    ) AS approval_rate_percent,
    NOW() AS cached_at
FROM node_l1_config
GROUP BY node_id, category;

-- 創建索引
CREATE UNIQUE INDEX idx_mv_l1_stats ON mv_l1_stats_cache(node_id, category);
CREATE INDEX idx_mv_l1_stats_pending ON mv_l1_stats_cache(pending_count DESC);

-- 刷新函數
CREATE OR REPLACE FUNCTION refresh_l1_stats_cache()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_l1_stats_cache;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON MATERIALIZED VIEW mv_l1_stats_cache IS 'L1 統計緩存（定期刷新）';
COMMENT ON FUNCTION refresh_l1_stats_cache IS '刷新統計緩存';

-- ============================================
-- 5. 創建快速統計視圖（無需聚合）
-- ============================================

DROP VIEW IF EXISTS v_l1_quick_stats;
CREATE VIEW v_l1_quick_stats AS
SELECT 
    'total' AS stat_type,
    (SELECT COUNT(*) FROM node_l1_config) AS value
UNION ALL
SELECT 
    'pending' AS stat_type,
    (SELECT COUNT(*) FROM node_l1_config WHERE is_approved = FALSE OR is_approved IS NULL) AS value
UNION ALL
SELECT 
    'approved' AS stat_type,
    (SELECT COUNT(*) FROM node_l1_config WHERE is_approved = TRUE) AS value
UNION ALL
SELECT 
    'stations' AS stat_type,
    (SELECT COUNT(DISTINCT node_id) FROM node_l1_config) AS value;

-- ============================================
-- 6. 創建高效的分頁查詢函數
-- ============================================

CREATE OR REPLACE FUNCTION get_pending_places_paged(
    p_node_id TEXT,
    p_category TEXT DEFAULT NULL,
    p_page INT DEFAULT 1,
    p_page_size INT DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    node_id TEXT,
    name TEXT,
    category TEXT,
    osm_id BIGINT,
    is_approved BOOLEAN,
    is_featured BOOLEAN,
    notes TEXT,
    total_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH filtered AS (
        SELECT 
            l1.id,
            l1.station_id AS node_id,
            l1.name,
            l1.category,
            l1.osm_id,
            c.is_approved,
            c.is_featured,
            c.notes
        FROM l1_places l1
        LEFT JOIN node_l1_config c ON l1.station_id = c.node_id 
            AND c.source_id = l1.id::TEXT
            AND c.source_table = 'l1_places'
        WHERE (p_node_id IS NULL OR l1.station_id = p_node_id)
            AND (p_category IS NULL OR l1.category = p_category)
            AND (c.is_approved IS NULL OR c.is_approved = FALSE)
    )
    SELECT 
        f.*,
        COUNT(*) OVER () AS total_count
    FROM filtered f
    ORDER BY f.category, f.name
    LIMIT p_page_size
    OFFSET (p_page - 1) * p_page_size;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_pending_places_paged IS '高效分頁查詢待審核數據';

-- ============================================
-- 7. 創建批量操作優化函數
-- ============================================

CREATE OR REPLACE FUNCTION batch_approve_places_optimized(
    p_place_ids TEXT[],
    p_notes TEXT DEFAULT 'Batch approved'
)
RETURNS JSON AS $$
DECLARE
    v_count INTEGER;
    v_start_time TIMESTAMPTZ;
BEGIN
    v_start_time := NOW();
    
    -- 使用數組進行批量更新（比逐條更新快 10-100 倍）
    UPDATE node_l1_config
    SET 
        is_approved = TRUE,
        approved_at = NOW(),
        notes = p_notes,
        updated_at = NOW()
    WHERE source_id = ANY(p_place_ids)
    AND source_table = 'l1_places'
    AND (is_approved = FALSE OR is_approved IS NULL);
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    
    RETURN json_build_object(
        'success', TRUE,
        'approved_count', v_count,
        'execution_time_ms', EXTRACT(MILLISECONDS FROM NOW() - v_start_time)::INT
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION batch_approve_places_optimized IS '優化的批量批准函數';

-- ============================================
-- 8. 創建預計算的熱門站點視圖
-- ============================================

DROP VIEW IF EXISTS v_l1_top_stations;
CREATE VIEW v_l1_top_stations AS
SELECT 
    node_id,
    total_count,
    approved_count,
    pending_count,
    approval_rate_percent,
    CASE 
        WHEN approval_rate_percent >= 80 THEN 'high'
        WHEN approval_rate_percent >= 50 THEN 'medium'
        ELSE 'low'
    END AS approval_status
FROM mv_l1_stats_cache
WHERE total_count > 0
ORDER BY pending_count DESC;

-- ============================================
-- 9. 創建審核進度追蹤視圖
-- ============================================

DROP VIEW IF EXISTS v_l1_approval_progress;
CREATE VIEW v_l1_approval_progress AS
SELECT 
    c.node_id,
    n.name AS station_name,
    COUNT(DISTINCT c.category) AS total_categories,
    COUNT(*) FILTER (WHERE c.is_approved = TRUE) AS approved,
    COUNT(*) FILTER (WHERE c.is_approved = FALSE) AS rejected,
    COUNT(*) FILTER (WHERE c.is_approved IS NULL) AS pending,
    COUNT(*) AS total,
    ROUND(COUNT(*) FILTER (WHERE c.is_approved = TRUE)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 1) AS progress_percent,
    MAX(c.updated_at) AS last_updated
FROM node_l1_config c
LEFT JOIN nodes n ON c.node_id = n.id
GROUP BY c.node_id, n.name
ORDER BY pending DESC, total DESC;

-- ============================================
-- 10. 執行計時與統計
-- ============================================
DO $$
DECLARE
    v_index_count INTEGER;
    v_function_count INTEGER;
    v_view_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_index_count FROM pg_indexes 
    WHERE tablename IN ('node_l1_config', 'node_hierarchy', 'l1_places')
    AND indexname LIKE 'idx_%';
    
    SELECT COUNT(*) INTO v_function_count FROM pg_proc 
    WHERE proname LIKE 'l1_%' OR proname LIKE '%l1%';
    
    SELECT COUNT(*) INTO v_view_count FROM pg_views 
    WHERE viewname LIKE 'v_l1_%' OR viewname LIKE 'mv_l1_%';
    
    RAISE NOTICE '======================================';
    RAISE NOTICE 'Phase 3 性能優化完成';
    RAISE NOTICE '======================================';
    RAISE NOTICE '新增索引: %', v_index_count;
    RAISE NOTICE '新增函數: %', v_function_count;
    RAISE NOTICE '新增視圖: %', v_view_count;
    RAISE NOTICE '======================================';
END;
$$;

-- 完成
DO $$
BEGIN
    RAISE NOTICE '性能優化 Migration 執行完成';
END;
$$;
