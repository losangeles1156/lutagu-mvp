-- ============================================
-- Phase 3: 直接執行的 SQL 查詢（無需函數）
-- Date: 2026-01-04
-- ============================================

-- ============================================
-- 1. 全局統計
-- ============================================
-- 執行此查詢查看 L1 數據統計
SELECT 
    '總 L1 記錄' AS metric,
    COUNT(*)::text AS value
FROM node_l1_config
UNION ALL
SELECT 
    '待審核' AS metric,
    COUNT(*)::text AS value
FROM node_l1_config 
WHERE is_approved = FALSE OR is_approved IS NULL
UNION ALL
SELECT 
    '已批准' AS metric,
    COUNT(*)::text AS value
FROM node_l1_config 
WHERE is_approved = TRUE
UNION ALL
SELECT 
    '站點數' AS metric,
    COUNT(DISTINCT node_id)::text AS value
FROM node_l1_config;

-- ============================================
-- 2. 按站點統計
-- ============================================
SELECT 
    node_id,
    COUNT(*) FILTER (WHERE is_approved = TRUE) AS approved,
    COUNT(*) FILTER (WHERE is_approved = FALSE OR is_approved IS NULL) AS pending,
    COUNT(*) AS total,
    ROUND(
        COUNT(*) FILTER (WHERE is_approved = TRUE)::NUMERIC / 
        NULLIF(COUNT(*), 0) * 100, 1
    ) AS approval_rate_percent
FROM node_l1_config
GROUP BY node_id
ORDER BY pending DESC
LIMIT 20;

-- ============================================
-- 3. 按分類統計
-- ============================================
SELECT 
    category,
    COUNT(*) FILTER (WHERE is_approved = TRUE) AS approved,
    COUNT(*) FILTER (WHERE is_approved = FALSE OR is_approved IS NULL) AS pending,
    COUNT(*) AS total
FROM node_l1_config
GROUP BY category
ORDER BY total DESC;

-- ============================================
-- 4. 查看待審核數據
-- ============================================
-- 查看上野站的待審核餐廳
SELECT 
    p.id,
    p.station_id,
    p.name,
    p.category,
    p.osm_id
FROM l1_places p
LEFT JOIN node_l1_config c ON p.id::TEXT = c.source_id 
    AND c.source_table = 'l1_places'
WHERE (c.is_approved = FALSE OR c.is_approved IS NULL)
AND p.station_id = 'odpt.Station:JR-East.Ueno'  -- 修改為目標站點
ORDER BY p.category, p.name
LIMIT 50;

-- ============================================
-- 5. 批准上野站的所有餐廳
-- ============================================
/*
-- 取消注釋以下語句來執行
UPDATE node_l1_config c
SET is_approved = TRUE, approved_at = NOW(), notes = 'Bulk approved via SQL'
FROM l1_places p
WHERE c.source_table = 'l1_places'
AND c.source_id = p.id::TEXT
AND p.station_id = 'odpt.Station:JR-East.Ueno'
AND p.category = 'dining'
AND (c.is_approved = FALSE OR c.is_approved IS NULL);
*/

-- ============================================
-- 6. 批准上野站的所有分類
-- ============================================
/*
UPDATE node_l1_config c
SET is_approved = TRUE, approved_at = NOW(), notes = 'Bulk approved all via SQL'
FROM l1_places p
WHERE c.source_table = 'l1_places'
AND c.source_id = p.id::TEXT
AND p.station_id = 'odpt.Station:JR-East.Ueno'
AND (c.is_approved = FALSE OR c.is_approved IS NULL);
*/

-- ============================================
-- 7. 批准單條記錄
-- ============================================
/*
-- 取消注釋並修改 ID
UPDATE node_l1_config
SET is_approved = TRUE, approved_at = NOW(), notes = 'Approved manually'
WHERE source_id = 'your-place-id-here';
*/

-- ============================================
-- 8. 驗證數據一致性
-- ============================================
SELECT 
    'l1_places 總數' AS source,
    COUNT(*)::text AS count
FROM l1_places
UNION ALL
SELECT 
    'node_l1_config 總數' AS source,
    COUNT(*)::text AS count
FROM node_l1_config
UNION ALL
SELECT 
    'v_l1_pending' AS source,
    COUNT(*)::text AS count
FROM v_l1_pending
UNION ALL
SELECT 
    'v_l1_approved' AS source,
    COUNT(*)::text AS count
FROM v_l1_approved;

-- ============================================
-- 9. 熱門站點（待審核最多）
-- ============================================
SELECT 
    node_id,
    COUNT(*) AS pending_count,
    COUNT(DISTINCT category) AS categories
FROM node_l1_config
WHERE is_approved = FALSE OR is_approved IS NULL
GROUP BY node_id
ORDER BY pending_count DESC
LIMIT 10;

-- ============================================
-- 10. 統計摘要
-- ============================================
DO $$
DECLARE
    v_total INTEGER;
    v_pending INTEGER;
    v_approved INTEGER;
    v_rate NUMERIC;
BEGIN
    SELECT COUNT(*) INTO v_total FROM node_l1_config;
    SELECT COUNT(*) INTO v_pending FROM node_l1_config WHERE is_approved = FALSE OR is_approved IS NULL;
    SELECT COUNT(*) INTO v_approved FROM node_l1_config WHERE is_approved = TRUE;
    SELECT ROUND(v_approved::NUMERIC / NULLIF(v_total, 0) * 100, 1) INTO v_rate;
    
    RAISE NOTICE '======================================';
    RAISE NOTICE 'L1 數據統計摘要';
    RAISE NOTICE '======================================';
    RAISE NOTICE '總數: %', v_total;
    RAISE NOTICE '待審核: %', v_pending;
    RAISE NOTICE '已批准: %', v_approved;
    RAISE NOTICE '批准率: %%%', v_rate;
    RAISE NOTICE '======================================';
END;
$$;
