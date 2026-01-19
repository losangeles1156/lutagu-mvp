-- ============================================
-- Phase 3 擴展：節點管理 SQL 函數
-- Date: 2026-01-04
-- ============================================

-- ============================================
-- 1. 獲取所有 Hub 節點
-- ============================================
CREATE OR REPLACE FUNCTION get_all_hubs()
RETURNS TABLE (
    id TEXT,
    name JSONB,
    location JSONB,
    ward_id TEXT,
    is_active BOOLEAN,
    child_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        n.id,
        n.name,
        n.location,
        n.ward_id,
        COALESCE(h.is_active, TRUE) AS is_active,
        (
            SELECT COUNT(*)
            FROM nodes c
            WHERE c.parent_hub_id = n.id
        ) AS child_count
    FROM nodes n
    LEFT JOIN node_hierarchy h ON n.id = h.node_id
    WHERE n.parent_hub_id IS NULL
    ORDER BY n.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_all_hubs IS '獲取所有 Hub 節點及其子節點數量';

-- ============================================
-- 2. 獲取某 Hub 的所有子節點
-- ============================================
CREATE OR REPLACE FUNCTION get_hub_children(p_hub_id TEXT)
RETURNS TABLE (
    id TEXT,
    name JSONB,
    location JSONB,
    ward_id TEXT,
    is_active BOOLEAN,
    display_order INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        n.id,
        n.name,
        n.location,
        n.ward_id,
        COALESCE(h.is_active, TRUE) AS is_active,
        COALESCE(h.display_order, 0) AS display_order
    FROM nodes n
    LEFT JOIN node_hierarchy h ON n.id = h.node_id
    WHERE n.parent_hub_id = p_hub_id
    ORDER BY h.display_order, n.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_hub_children IS '獲取指定 Hub 的所有子節點';

-- ============================================
-- 3. 合併節點到 Hub
-- ============================================
CREATE OR REPLACE FUNCTION merge_nodes_to_hub(
    p_hub_id TEXT,
    p_child_ids TEXT[]
)
RETURNS JSON AS $$
DECLARE
    v_count INTEGER := 0;
    v_hub_name TEXT;
BEGIN
    -- 獲取 Hub 名稱
    SELECT n.name::text INTO v_hub_name
    FROM nodes n WHERE n.id = p_hub_id;

    -- 批量更新
    UPDATE nodes
    SET parent_hub_id = p_hub_id
    WHERE id = ANY(p_child_ids)
    AND id != p_hub_id
    AND (parent_hub_id IS DISTINCT FROM p_hub_id);

    GET DIAGNOSTICS v_count = ROW_COUNT;

    -- 同步到 node_hierarchy
    FOR i IN 1..array_length(p_child_ids, 1) LOOP
        INSERT INTO node_hierarchy (node_id, hub_id, is_active, display_order)
        VALUES (p_child_ids[i], p_hub_id, TRUE, 0)
        ON CONFLICT (node_id) DO UPDATE SET
            hub_id = EXCLUDED.hub_id,
            updated_at = NOW();
    END LOOP;

    RETURN json_build_object(
        'success', TRUE,
        'hub_id', p_hub_id,
        'hub_name', v_hub_name,
        'merged_count', v_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION merge_nodes_to_hub IS '將多個子節點合併到指定 Hub';

-- ============================================
-- 4. 從 Hub 移除節點
-- ============================================
CREATE OR REPLACE FUNCTION unmerge_nodes(p_child_ids TEXT[])
RETURNS JSON AS $$
DECLARE
    v_count INTEGER := 0;
BEGIN
    UPDATE nodes
    SET parent_hub_id = NULL
    WHERE id = ANY(p_child_ids)
    AND parent_hub_id IS NOT NULL;

    GET DIAGNOSTICS v_count = ROW_COUNT;

    -- 更新 node_hierarchy
    UPDATE node_hierarchy
    SET hub_id = NULL, updated_at = NOW()
    WHERE node_id = ANY(p_child_ids);

    RETURN json_build_object(
        'success', TRUE,
        'unmerged_count', v_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION unmerge_nodes IS '從 Hub 中移除節點（設為獨立 Hub）';

-- ============================================
-- 5. 停用節點（不再顯示在前端）
-- ============================================
CREATE OR REPLACE FUNCTION deactivate_nodes(p_node_ids TEXT[])
RETURNS JSON AS $$
DECLARE
    v_count INTEGER := 0;
BEGIN
    UPDATE node_hierarchy
    SET is_active = FALSE, updated_at = NOW()
    WHERE node_id = ANY(p_node_ids);

    GET DIAGNOSTICS v_count = ROW_COUNT;

    RETURN json_build_object(
        'success', TRUE,
        'deactivated_count', v_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION deactivate_nodes IS '停用節點（不再顯示在前端）';

-- ============================================
-- 6. 啟用節點
-- ============================================
CREATE OR REPLACE FUNCTION activate_nodes(p_node_ids TEXT[])
RETURNS JSON AS $$
DECLARE
    v_count INTEGER := 0;
BEGIN
    UPDATE node_hierarchy
    SET is_active = TRUE, updated_at = NOW()
    WHERE node_id = ANY(p_node_ids);

    GET DIAGNOSTICS v_count = ROW_COUNT;

    RETURN json_build_object(
        'success', TRUE,
        'activated_count', v_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION activate_nodes IS '啟用節點';

-- ============================================
-- 7. 獲取行政區節點統計
-- ============================================
CREATE OR REPLACE FUNCTION get_ward_node_stats(p_ward_id TEXT)
RETURNS JSON AS $$
DECLARE
    v_total INTEGER;
    v_hubs INTEGER;
    v_children INTEGER;
    v_active INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total FROM nodes WHERE ward_id = p_ward_id;
    SELECT COUNT(*) INTO v_hubs FROM nodes WHERE ward_id = p_ward_id AND parent_hub_id IS NULL;
    SELECT COUNT(*) INTO v_children FROM nodes WHERE ward_id = p_ward_id AND parent_hub_id IS NOT NULL;
    SELECT COUNT(*) INTO v_active
    FROM nodes n
    LEFT JOIN node_hierarchy h ON n.id = h.node_id
    WHERE n.ward_id = p_ward_id
    AND COALESCE(h.is_active, TRUE) = TRUE;

    RETURN json_build_object(
        'ward_id', p_ward_id,
        'total', v_total,
        'hubs', v_hubs,
        'children', v_children,
        'active', v_active
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_ward_node_stats IS '獲取行政區節點統計';

-- ============================================
-- 8. 獲取所有行政區列表（核心 9 區）
-- ============================================
CREATE OR REPLACE VIEW v_core_wards AS
SELECT
    w.id,
    w.name,
    w.code,
    w.prefecture,
    COUNT(n.id) AS node_count,
    COUNT(n.id) FILTER (WHERE n.parent_hub_id IS NULL) AS hub_count,
    COUNT(n.id) FILTER (WHERE n.parent_hub_id IS NOT NULL) AS child_count
FROM wards w
LEFT JOIN nodes n ON w.id = n.ward_id
WHERE w.code IN (
    'Taitō',    -- 台東區
    'Chiyoda',  -- 千代田區
    'Chūō',     -- 中央區
    'Minato',   -- 港區
    'Shinjuku', -- 新宿區
    'Bunkyō',   -- 文京區
    'Kōtō',     -- 江東區
    'Sumida',   -- 墨田區
    'Koto'      -- 江東區（另一格式）
)
OR w.name LIKE '%台東%' OR w.name LIKE '%Taitō%'
OR w.name LIKE '%千代田%' OR w.name LIKE '%Chiyoda%'
OR w.name LIKE '%中央%' OR w.name LIKE '%Chūō%'
GROUP BY w.id, w.name, w.code, w.prefecture
ORDER BY w.name;

COMMENT ON VIEW v_core_wards IS '核心 9 區行政區列表';

-- ============================================
-- 9. 節點樹狀結構視圖
-- ============================================
CREATE OR REPLACE VIEW v_node_tree AS
SELECT
    h.id AS hierarchy_id,
    h.node_id,
    COALESCE(h.hub_id, n.parent_hub_id) AS parent_hub_id,
    n.name,
    n.location,
    n.ward_id,
    h.is_active,
    h.display_order,
    CASE
        WHEN COALESCE(h.hub_id, n.parent_hub_id) IS NULL THEN 'hub'
        ELSE 'child'
    END AS node_type
FROM node_hierarchy h
LEFT JOIN nodes n ON h.node_id = n.id
ORDER BY h.display_order, n.name;

COMMENT ON VIEW v_node_tree IS '節點樹狀結構';

-- ============================================
-- 執行統計
-- ============================================
DO $$
DECLARE
    v_func_count INTEGER;
    v_view_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_func_count FROM pg_proc
    WHERE proname IN ('get_all_hubs', 'get_hub_children', 'merge_nodes_to_hub',
                      'unmerge_nodes', 'deactivate_nodes', 'activate_nodes',
                      'get_ward_node_stats');

    SELECT COUNT(*) INTO v_view_count FROM pg_views
    WHERE viewname IN ('v_core_wards', 'v_node_tree');

    RAISE NOTICE '======================================';
    RAISE NOTICE 'Node Admin 節點管理功能已安裝';
    RAISE NOTICE '======================================';
    RAISE NOTICE 'SQL 函數數量: %', v_func_count;
    RAISE NOTICE '視圖數量: %', v_view_count;
    RAISE NOTICE '';
    RAISE NOTICE '可用的函數:';
    RAISE NOTICE '  - get_all_hubs()';
    RAISE NOTICE '  - get_hub_children(hub_id)';
    RAISE NOTICE '  - merge_nodes_to_hub(hub_id, array)';
    RAISE NOTICE '  - unmerge_nodes(array)';
    RAISE NOTICE '  - deactivate_nodes(array)';
    RAISE NOTICE '  - activate_nodes(array)';
    RAISE NOTICE '  - get_ward_node_stats(ward_id)';
    RAISE NOTICE '';
    RAISE NOTICE '可用的視圖:';
    RAISE NOTICE '  - v_core_wards';
    RAISE NOTICE '  - v_node_tree';
    RAISE NOTICE '======================================';
END;
$$;
