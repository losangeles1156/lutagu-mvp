-- ============================================
-- Node Admin Phase 3: 完整整合版本
-- 包含：SQL 函數 + 性能優化
-- Date: 2026-01-04
-- ============================================

-- ============================================
-- 第一部分：SQL 函數
-- ============================================

-- 1. 批准單條 L1 記錄
CREATE OR REPLACE FUNCTION approve_l1_place(
    p_source_id TEXT,
    p_notes TEXT DEFAULT 'Approved via function'
)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    UPDATE node_l1_config
    SET 
        is_approved = TRUE,
        approved_at = NOW(),
        notes = p_notes,
        updated_at = NOW()
    WHERE source_id = p_source_id
    AND source_table = 'l1_places';

    GET DIAGNOSTICS v_result = ROW_COUNT;
    RETURN json_build_object(
        'success', TRUE,
        'source_id', p_source_id,
        'updated_count', v_result
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 拒絕單條 L1 記錄
CREATE OR REPLACE FUNCTION reject_l1_place(
    p_source_id TEXT,
    p_notes TEXT DEFAULT 'Rejected via function'
)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    UPDATE node_l1_config
    SET 
        is_approved = FALSE,
        notes = p_notes,
        updated_at = NOW()
    WHERE source_id = p_source_id
    AND source_table = 'l1_places';

    GET DIAGNOSTICS v_result = ROW_COUNT;
    RETURN json_build_object(
        'success', TRUE,
        'source_id', p_source_id,
        'updated_count', v_result
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 按站點和分類批量批准
CREATE OR REPLACE FUNCTION bulk_approve_l1_by_station_category(
    p_node_id TEXT,
    p_category TEXT,
    p_notes TEXT DEFAULT 'Bulk approved'
)
RETURNS JSON AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE node_l1_config c
    SET 
        is_approved = TRUE,
        approved_at = NOW(),
        notes = p_notes,
        updated_at = NOW()
    FROM v_l1_pending p
    WHERE c.node_id = p.node_id
    AND c.source_table = 'l1_places'
    AND c.source_id = p.id::TEXT
    AND p.node_id = p_node_id
    AND p.category = p_category;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN json_build_object(
        'success', TRUE,
        'node_id', p_node_id,
        'category', p_category,
        'approved_count', v_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 按站點批量批准所有分類
CREATE OR REPLACE FUNCTION bulk_approve_l1_by_station(
    p_node_id TEXT,
    p_notes TEXT DEFAULT 'Bulk approved by station'
)
RETURNS JSON AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE node_l1_config c
    SET 
        is_approved = TRUE,
        approved_at = NOW(),
        notes = p_notes,
        updated_at = NOW()
    FROM v_l1_pending p
    WHERE c.node_id = p.node_id
    AND c.source_table = 'l1_places'
    AND c.source_id = p.id::TEXT
    AND p.node_id = p_node_id;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN json_build_object(
        'success', TRUE,
        'node_id', p_node_id,
        'approved_count', v_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 獲取站點統計信息
CREATE OR REPLACE FUNCTION get_l1_stats_by_station(p_node_id TEXT)
RETURNS JSON AS $$
DECLARE
    v_total INTEGER;
    v_pending INTEGER;
    v_approved INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total FROM node_l1_config WHERE node_id = p_node_id;
    SELECT COUNT(*) INTO v_pending FROM node_l1_config WHERE node_id = p_node_id AND is_approved = FALSE;
    SELECT COUNT(*) INTO v_approved FROM node_l1_config WHERE node_id = p_node_id AND is_approved = TRUE;

    RETURN json_build_object(
        'node_id', p_node_id,
        'total', v_total,
        'pending', v_pending,
        'approved', v_approved,
        'approval_rate', CASE WHEN v_total > 0 THEN ROUND((v_approved::NUMERIC / v_total::NUMERIC) * 100, 2) ELSE 0 END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. 獲取全局統計信息
CREATE OR REPLACE FUNCTION get_l1_global_stats()
RETURNS JSON AS $$
DECLARE
    v_total INTEGER;
    v_pending INTEGER;
    v_approved INTEGER;
    v_stations INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total FROM node_l1_config;
    SELECT COUNT(*) INTO v_pending FROM node_l1_config WHERE is_approved = FALSE;
    SELECT COUNT(*) INTO v_approved FROM node_l1_config WHERE is_approved = TRUE;
    SELECT COUNT(DISTINCT node_id) INTO v_stations FROM node_l1_config;

    RETURN json_build_object(
        'total_places', v_total,
        'pending', v_pending,
        'approved', v_approved,
        'approval_rate', CASE WHEN v_total > 0 THEN ROUND((v_approved::NUMERIC / v_total::NUMERIC) * 100, 2) ELSE 0 END,
        'total_stations', v_stations
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. 驗證視圖一致性
CREATE OR REPLACE FUNCTION validate_l1_views()
RETURNS JSON AS $$
DECLARE
    v_pending_count INTEGER;
    v_approved_count INTEGER;
    v_config_total INTEGER;
    v_unmatched INTEGER;
    v_result JSON;
BEGIN
    SELECT COUNT(*) INTO v_pending_count FROM v_l1_pending;
    SELECT COUNT(*) INTO v_approved_count FROM v_l1_approved;
    SELECT COUNT(*) INTO v_config_total FROM node_l1_config;
    
    SELECT COUNT(*) INTO v_unmatched
    FROM l1_places l
    LEFT JOIN node_l1_config c ON l.id::TEXT = c.source_id
    WHERE c.source_id IS NULL;

    v_result := json_build_object(
        'pending_count', v_pending_count,
        'approved_count', v_approved_count,
        'config_total', v_config_total,
        'unmatched_l1_places', v_unmatched,
        'is_consistent', (v_pending_count + v_approved_count = v_config_total) AND (v_unmatched = 0)
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. 優化的批量批准函數
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

-- ============================================
-- 第二部分：性能優化索引
-- ============================================

-- 複合索引
DROP INDEX IF EXISTS idx_l1_config_node_status;
CREATE INDEX idx_l1_config_node_status ON node_l1_config(node_id, is_approved, category);

DROP INDEX IF EXISTS idx_l1_config_source;
CREATE INDEX idx_l1_config_source ON node_l1_config(source_id) WHERE source_table = 'l1_places';

DROP INDEX IF EXISTS idx_l1_places_station_category;
CREATE INDEX idx_l1_places_station_category ON l1_places(station_id, category);

-- 覆蓋索引
DROP INDEX IF EXISTS idx_l1_pending_covering;
CREATE INDEX idx_l1_pending_covering ON node_l1_config(node_id, category, source_id) 
INCLUDE (is_approved, is_featured, notes)
WHERE is_approved = FALSE OR is_approved IS NULL;

-- 部分索引
DROP INDEX IF EXISTS idx_l1_config_approved;
CREATE INDEX idx_l1_config_approved ON node_l1_config(node_id, category, display_order) 
WHERE is_approved = TRUE;

-- ============================================
-- 第三部分：物化視圖緩存
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

CREATE UNIQUE INDEX idx_mv_l1_stats ON mv_l1_stats_cache(node_id, category);
CREATE INDEX idx_mv_l1_stats_pending ON mv_l1_stats_cache(pending_count DESC);

CREATE OR REPLACE FUNCTION refresh_l1_stats_cache()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_l1_stats_cache;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 第四部分：視圖
-- ============================================

-- 快速統計視圖
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

-- 熱門站點視圖
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

-- 審核進度視圖
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
-- 完成報告
-- ============================================
DO $$
DECLARE
    v_func_count INTEGER;
    v_idx_count INTEGER;
    v_view_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_func_count FROM pg_proc 
    WHERE proname IN ('approve_l1_place', 'reject_l1_place', 'bulk_approve_l1_by_station_category', 
                      'bulk_approve_l1_by_station', 'get_l1_stats_by_station', 'get_l1_global_stats',
                      'validate_l1_views', 'batch_approve_places_optimized', 'refresh_l1_stats_cache');
    
    SELECT COUNT(*) INTO v_idx_count FROM pg_indexes 
    WHERE tablename IN ('node_l1_config', 'node_hierarchy', 'l1_places')
    AND indexname LIKE 'idx_%';
    
    SELECT COUNT(*) INTO v_view_count FROM pg_views 
    WHERE viewname LIKE 'v_l1_%' OR viewname LIKE 'mv_l1_%';
    
    RAISE NOTICE '======================================';
    RAISE NOTICE 'Node Admin Phase 3: 安裝完成';
    RAISE NOTICE '======================================';
    RAISE NOTICE 'SQL 函數數量: %', v_func_count;
    RAISE NOTICE '優化索引數量: %', v_idx_count;
    RAISE NOTICE '視圖數量: %', v_view_count;
    RAISE NOTICE '';
    RAISE NOTICE '可用的 SQL 函數:';
    RAISE NOTICE '  - get_l1_global_stats()';
    RAISE NOTICE '  - get_l1_stats_by_station(node_id)';
    RAISE NOTICE '  - approve_l1_place(source_id, notes)';
    RAISE NOTICE '  - bulk_approve_l1_by_station(node_id, notes)';
    RAISE NOTICE '  - bulk_approve_l1_by_station_category(node_id, category, notes)';
    RAISE NOTICE '  - validate_l1_views()';
    RAISE NOTICE '';
    RAISE NOTICE '可用的視圖:';
    RAISE NOTICE '  - v_l1_pending (待審核)';
    RAISE NOTICE '  - v_l1_approved (已批准)';
    RAISE NOTICE '  - v_l1_quick_stats (快速統計)';
    RAISE NOTICE '  - v_l1_top_stations (熱門站點)';
    RAISE NOTICE '  - mv_l1_stats_cache (統計緩存)';
    RAISE NOTICE '======================================';
END;
$$;
