-- ============================================
-- Phase 3: SQL 函數 - 用於後台管理
-- Date: 2026-01-04
-- ============================================

-- ============================================
-- 1. 批准單條 L1 記錄
-- ============================================
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

COMMENT ON FUNCTION approve_l1_place IS '批准單條 L1 數據記錄';

-- ============================================
-- 2. 拒絕單條 L1 記錄
-- ============================================
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

COMMENT ON FUNCTION reject_l1_place IS '拒絕單條 L1 數據記錄';

-- ============================================
-- 3. 按站點和分類批量批准
-- ============================================
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

COMMENT ON FUNCTION bulk_approve_l1_by_station_category IS '按站點和分類批量批准 L1 數據';

-- ============================================
-- 4. 按站點批量批准所有分類
-- ============================================
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

COMMENT ON FUNCTION bulk_approve_l1_by_station IS '按站點批量批准所有 L1 數據';

-- ============================================
-- 5. 獲取站點統計信息
-- ============================================
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

COMMENT ON FUNCTION get_l1_stats_by_station IS '獲取指定站點的 L1 統計信息';

-- ============================================
-- 6. 獲取全局統計信息
-- ============================================
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

COMMENT ON FUNCTION get_l1_global_stats IS '獲取全局 L1 統計信息';

-- ============================================
-- 7. 驗證視圖一致性
-- ============================================
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

    -- 檢查未匹配的記錄
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

COMMENT ON FUNCTION validate_l1_views IS '驗證 L1 視圖的一致性';

-- ============================================
-- 8. 重置並重新同步 L1 配置
-- （慎用：會清除所有審核狀態）
-- ============================================
CREATE OR REPLACE FUNCTION reset_and_resync_l1_config()
RETURNS JSON AS $$
DECLARE
    v_deleted INTEGER;
    v_inserted INTEGER;
BEGIN
    -- 刪除現有配置
    DELETE FROM node_l1_config;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;

    -- 重新插入所有 l1_places
    INSERT INTO node_l1_config (node_id, category, source_table, source_id, is_approved)
    SELECT
        station_id AS node_id,
        category,
        'l1_places' AS source_table,
        id::TEXT AS source_id,
        FALSE AS is_approved
    FROM l1_places
    ON CONFLICT (node_id, source_table, source_id) DO NOTHING;

    GET DIAGNOSTICS v_inserted = ROW_COUNT;

    RETURN json_build_object(
        'deleted_count', v_deleted,
        'inserted_count', v_inserted,
        'message', 'L1 config reset and resynced'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION reset_and_resync_l1_config IS '重置並重新同步 L1 配置（慎用）';
