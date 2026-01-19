-- ============================================
-- Phase 3: 後台管理 SQL 腳本
-- 用於 Supabase Studio 審核 v_l1_pending
-- Date: 2026-01-04
-- ============================================

-- ============================================
-- 1. 統計概覽
-- ============================================
SELECT '=== L1 數據統計 ===' AS info;

SELECT
    '總 L1 記錄' AS metric,
    COUNT(*)::text AS value
FROM l1_places
UNION ALL
SELECT
    '待審核' AS metric,
    COUNT(*)::text AS value
FROM v_l1_pending
UNION ALL
SELECT
    '已批准' AS metric,
    COUNT(*)::text AS value
FROM v_l1_approved;

-- ============================================
-- 2. 按站點統計待審核數據
-- ============================================
SELECT
    node_id AS station_id,
    COUNT(*) AS pending_count,
    array_agg(DISTINCT category) AS categories
FROM v_l1_pending
GROUP BY node_id
ORDER BY pending_count DESC
LIMIT 20;

-- ============================================
-- 3. 按分類統計待審核數據
-- ============================================
SELECT
    category,
    COUNT(*) AS count,
    array_agg(DISTINCT node_id LIMIT 5) AS sample_stations
FROM v_l1_pending
GROUP BY category
ORDER BY count DESC;

-- ============================================
-- 4. 查看特定站點的待審核數據
-- ============================================
-- 將 {STATION_ID} 替換為實際站點 ID
-- 例如：odpt.Station:JR-East.Ueno

SELECT
    id,
    node_id,
    name,
    category,
    osm_id,
    is_approved,
    is_featured,
    notes
FROM v_l1_pending
WHERE node_id = 'odpt.Station:JR-East.Ueno'  -- 修改為目標站點
ORDER BY category, name;

-- ============================================
-- 5. 快速批准單條記錄
-- ============================================
-- 將 {PLACE_ID} 替換為實際的 l1_places.id
-- 將 {STATION_ID} 替換為實際的 station_id

/*
-- 示例：批准單條記錄
UPDATE node_l1_config
SET
    is_approved = TRUE,
    approved_at = NOW(),
    notes = 'Approved via Supabase Studio'
WHERE
    node_id = 'odpt.Station:JR-East.Ueno'
    AND source_table = 'l1_places'
    AND source_id = '{PLACE_ID}';
*/

-- ============================================
-- 6. 批量批准某站點某分類的所有數據
-- ============================================
-- 將 {STATION_ID} 和 {CATEGORY} 替換為實際值

/*
-- 示例：批准上野站的所有餐廳
UPDATE node_l1_config c
SET
    is_approved = TRUE,
    approved_at = NOW(),
    notes = 'Bulk approved: ' || NOW()::text
FROM v_l1_pending p
WHERE
    c.node_id = p.node_id
    AND c.source_table = 'l1_places'
    AND c.source_id = p.id::text
    AND p.node_id = 'odpt.Station:JR-East.Ueno'
    AND p.category = 'dining';
*/

-- ============================================
-- 7. 查看核心站點的批准狀態
-- ============================================
SELECT
    node_id,
    COUNT(*) AS total_l1,
    SUM(CASE WHEN is_approved THEN 1 ELSE 0 END) AS approved,
    SUM(CASE WHEN NOT is_approved THEN 1 ELSE 0 END) AS pending
FROM node_l1_config
WHERE node_id IN (
    'odpt.Station:JR-East.Ueno',
    'odpt.Station:JR-East.Shinjuku',
    'odpt.Station:JR-East.Ikebukuro',
    'odpt.Station:TokyoMetro.Ginza.Ginza',
    'odpt.Station:TokyoMetro.Shibuya',
    'odpt.Station:JR-East.Tokyo'
)
GROUP BY node_id
ORDER BY pending DESC;

-- ============================================
-- 8. 驗證視圖數據一致性
-- ============================================
SELECT
    'v_l1_pending 記錄數' AS view_name,
    COUNT(*)::text AS record_count
FROM v_l1_pending
UNION ALL
SELECT
    'v_l1_approved 記錄數' AS view_name,
    COUNT(*)::text AS record_count
FROM v_l1_approved
UNION ALL
SELECT
    'node_l1_config 總數' AS view_name,
    COUNT(*)::text AS record_count
FROM node_l1_config;

-- ============================================
-- 9. 檢查是否有未匹配的 l1_places
-- ============================================
SELECT
    '未匹配的 l1_places' AS issue,
    COUNT(*)::text AS count
FROM l1_places l
LEFT JOIN node_l1_config c ON l.id::TEXT = c.source_id
WHERE c.source_id IS NULL;

-- ============================================
-- 10. 查找重複的 config 記錄
-- ============================================
SELECT
    node_id,
    source_table,
    source_id,
    COUNT(*) AS duplicate_count
FROM node_l1_config
GROUP BY node_id, source_table, source_id
HAVING COUNT(*) > 1;
