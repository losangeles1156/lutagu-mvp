-- =============================================================================
-- 全面行政區車站節點修復
-- 
-- 需求：
-- 1. 機場區域作為獨立區域，不受行政區選擇影響
-- 2. 檢查所有行政區的節點完整性
-- 3. 修復節點歸屬邏輯
-- 4. 確認機場節點使用飛機圖示
-- =============================================================================

-- =============================================================================
-- 第一部分：機場節點處理
-- =============================================================================

-- Step 1: 確認機場節點的 ward_id 和圖示設置
SELECT 
    '=== 機場節點檢查 ===' as section,
    id, 
    name->>'zh-TW' as name, 
    ward_id, 
    is_hub,
    mapDesign,
    facility_profile
FROM nodes 
WHERE id LIKE '%Airport%' 
   OR id LIKE '%airport%'
   OR name->>'zh-TW' LIKE '%機場%'
ORDER BY id;

-- Step 2: 確保機場節點的 ward_id 為 'ward:airport'
UPDATE nodes 
SET ward_id = 'ward:airport'
WHERE id LIKE '%Airport%' 
   OR id LIKE '%airport%'
   OR name->>'zh-TW' LIKE '%機場%';

-- =============================================================================
-- 第二部分：檢查所有行政區的節點數量
-- =============================================================================

-- Step 3: 檢查所有行政區的節點數量
SELECT 
    '=== 各行政區節點數量 ===' as section,
    ward_id,
    COUNT(*) FILTER (WHERE is_hub = true) as hub_count,
    COUNT(*) FILTER (WHERE is_hub = false AND parent_hub_id IS NOT NULL) as child_count,
    COUNT(*) FILTER (WHERE is_hub = false AND parent_hub_id IS NULL) as standalone_count,
    COUNT(*) as total
FROM nodes 
WHERE ward_id IS NOT NULL
GROUP BY ward_id
ORDER BY ward_id;

-- Step 4: 檢查節點為空或數量過少的行政區
SELECT 
    '=== 需要修復的行政區 ===' as section,
    w.id as ward_id,
    w.name_i18n->>'zh-TW' as ward_name,
    COUNT(n.id) as node_count
FROM wards w
LEFT JOIN nodes n ON w.id = n.ward_id
GROUP BY w.id, w.name_i18n
HAVING COUNT(n.id) = 0 OR COUNT(n.id) < 5
ORDER BY node_count NULLS FIRST;

-- =============================================================================
-- 第三部分：中野區和練馬區專項檢查
-- =============================================================================

-- Step 5: 中野區節點檢查
SELECT 
    '=== 中野區節點檢查 ===' as section,
    id, 
    name->>'zh-TW' as name, 
    is_hub, 
    parent_hub_id,
    ward_id
FROM nodes 
WHERE ward_id = 'ward:nakano'
ORDER BY name->>'zh-TW';

-- Step 6: 練馬區節點檢查
SELECT 
    '=== 練馬區節點檢查 ===' as section,
    id, 
    name->>'zh-TW' as name, 
    is_hub, 
    parent_hub_id,
    ward_id
FROM nodes 
WHERE ward_id = 'ward:nerima'
ORDER BY name->>'zh-TW';

-- Step 7: 查找可能屬於中野區但 ward_id 設置錯誤的節點
SELECT 
    '=== 可能屬於中野區的節點 ===' as section,
    id,
    name->>'zh-TW' as name,
    ward_id,
    is_hub,
    parent_hub_id
FROM nodes 
WHERE name->>'zh-TW' LIKE '%中野%'
   OR name->>'en' ILIKE '%nakano%'
   OR name->>'ja' LIKE '%中野%'
ORDER BY name->>'zh-TW';

-- Step 8: 查找可能屬於練馬區但 ward_id 設置錯誤的節點
SELECT 
    '=== 可能屬於練馬區的節點 ===' as section,
    id,
    name->>'zh-TW' as name,
    ward_id,
    is_hub,
    parent_hub_id
FROM nodes 
WHERE name->>'zh-TW' LIKE '%練馬%'
   OR name->>'en' ILIKE '%nerima%'
   OR name->>'ja' LIKE '%練馬%'
ORDER BY name->>'zh-TW';

-- =============================================================================
-- 第四部分：修復節點歸屬
-- =============================================================================

-- Step 9: 修復中野區節點
INSERT INTO temp_ward_node_fix (node_id, is_hub, parent_hub_id, ward_id) VALUES
-- 中野區主要樞紐站
('odpt:Station:JR-East.Nakano', true, NULL, 'ward:nakano'),  -- 中野站
-- 中野站子站
('odpt:Station:TokyoMetro.Hibiya.Nakano', false, 'odpt:Station:JR-East.Nakano', 'ward:nakano'),
-- 中野區其他車站
('odpt:Station:JR-East.Koenji', false, NULL, 'ward:nakano'),
('odpt:Station:JR-East.ShinKoenji', false, NULL, 'ward:nakano'),
('odpt:Station:TokyoMetro.Tozai.Nakano', false, NULL, 'ward:nakano'),
('odpt:Station:JR-East.Honancho', false, NULL, 'ward:nakano'),
('odpt:Station:JR-East.Saginomiya', false, NULL, 'ward:nakano'),
('odpt:Station:SeibuShinjuku.Nakano', false, NULL, 'ward:nakano'),
('odpt:Station:JR-East.Nakai', false, NULL, 'ward:nakano');

-- Step 10: 修復練馬區節點
INSERT INTO temp_ward_node_fix (node_id, is_hub, parent_hub_id, ward_id) VALUES
-- 練馬區主要樞紐站
('odpt:Station:JR-East.Nerima', true, NULL, 'ward:nerima'),  -- 練馬站
-- 練馬站子站
('odpt:Station:TokyoMetro.Tozai.Nerima', false, 'odpt:Station:JR-East.Nerima', 'ward:nerima'),
('odpt:Station:SeibuShinjuku.Nerima', false, 'odpt:Station:JR-East.Nerima', 'ward:nerima'),
('odpt:Station:Tobu.Nerima', false, 'odpt:Station:JR-East.Nerima', 'ward:nerima'),
('odpt:Station:TokyoMetro.Yurakucho.ChikatetsuAkebono', false, 'odpt:Station:JR-East.Nerima', 'ward:nerima'),
('odpt:Station:TokyoMetro.Namboku.ChikatetsuAkebono', false, 'odpt:Station:JR-East.Nerima', 'ward:nerima'),
('odpt:Station:SeibuChichibu.Nerima', false, 'odpt:Station:JR-East.Nerima', 'ward:nerima'),
-- 練馬區其他車站
('odpt:Station:JR-East.Otsuka', false, NULL, 'ward:nerima'),
('odpt:Station:JR-East.Sakuradai', false, NULL, 'ward:nerima'),
('odpt:Station:JR-East.Hikawadai', false, NULL, 'ward:nerima'),
('odpt:Station:JR-East.Heiwadai', false, NULL, 'ward:nerima'),
('odpt:Station:JR-East.Hoyasu', false, NULL, 'ward:nerima');

-- =============================================================================
-- 第五部分：執行更新
-- =============================================================================

-- Step 11: 執行中練馬區更新
UPDATE nodes n
SET is_hub = s.is_hub, parent_hub_id = s.parent_hub_id, ward_id = s.ward_id
FROM temp_ward_node_fix s
WHERE n.id = s.node_id AND s.ward_id = 'ward:nakano';

UPDATE nodes n
SET is_hub = s.is_hub, parent_hub_id = s.parent_hub_id, ward_id = s.ward_id
FROM temp_ward_node_fix s
WHERE n.id = s.node_id AND s.ward_id = 'ward:nerima';

-- =============================================================================
-- 第六部分：驗證修復結果
-- =============================================================================

-- Step 12: 驗證所有行政區節點數量
SELECT 
    '=== 修復後各行政區節點數量 ===' as section,
    ward_id,
    COUNT(*) FILTER (WHERE is_hub = true) as hub_count,
    COUNT(*) FILTER (WHERE is_hub = false AND parent_hub_id IS NOT NULL) as child_count,
    COUNT(*) FILTER (WHERE is_hub = false AND parent_hub_id IS NULL) as standalone_count,
    COUNT(*) as total
FROM nodes 
WHERE ward_id IS NOT NULL
GROUP BY ward_id
ORDER BY ward_id;

-- Step 13: 驗證機場節點
SELECT 
    '=== 機場節點驗證 ===' as section,
    id, 
    name->>'zh-TW' as name, 
    ward_id, 
    is_hub
FROM nodes 
WHERE ward_id = 'ward:airport'
ORDER BY id;

-- Step 14: 驗證中野區
SELECT 
    '=== 中野區驗證 ===' as section,
    COUNT(*) FILTER (WHERE is_hub = true) as hub_count,
    COUNT(*) FILTER (WHERE is_hub = false AND parent_hub_id IS NOT NULL) as child_count,
    COUNT(*) FILTER (WHERE is_hub = false AND parent_hub_id IS NULL) as standalone_count,
    COUNT(*) as total
FROM nodes 
WHERE ward_id = 'ward:nakano';

SELECT id, name->>'zh-TW' as name, is_hub, parent_hub_id
FROM nodes 
WHERE ward_id = 'ward:nakano'
ORDER BY name->>'zh-TW';

-- Step 15: 驗證練馬區
SELECT 
    '=== 練馬區驗證 ===' as section,
    COUNT(*) FILTER (WHERE is_hub = true) as hub_count,
    COUNT(*) FILTER (WHERE is_hub = false AND parent_hub_id IS NOT NULL) as child_count,
    COUNT(*) FILTER (WHERE is_hub = false AND parent_hub_id IS NULL) as standalone_count,
    COUNT(*) as total
FROM nodes 
WHERE ward_id = 'ward:nerima';

SELECT id, name->>'zh-TW' as name, is_hub, parent_hub_id
FROM nodes 
WHERE ward_id = 'ward:nerima'
ORDER BY name->>'zh-TW';

-- Step 16: 清理臨時表
DROP TABLE IF EXISTS temp_ward_node_fix;

SELECT '全面修復完成' as status, NOW() as fixed_at;
