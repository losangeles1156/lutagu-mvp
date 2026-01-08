-- =============================================================================
-- 修復：東京車站節點顯示異常 - 行政區映射修正
-- 
-- 問題：
-- 1. 豐島區和板橋區都定義了池袋站 (JR-East.Ikebukuro)，導致 ward_id 衝突
-- 2. 千代田區車站父子關係不完整，導致節點顯示不穩定
-- 3. seed_hierarchy 和 seedNodes.ts 邏輯不一致
--
-- 修復策略：
-- 1. 重新定義 seed_hierarchy，確保每個車站只屬於一個行政區
-- 2. 修正豐島區和板橋區的節點歸屬
-- 3. 驗證並修正千代田區的父子節點關係
-- =============================================================================

-- Step 0: 創建臨時修復表
DROP TABLE IF EXISTS temp_ward_node_fix;
CREATE TEMP TABLE temp_ward_node_fix (
    node_id TEXT PRIMARY KEY,
    is_hub BOOLEAN NOT NULL,
    parent_hub_id TEXT,
    ward_id TEXT NOT NULL
);

-- Step 1: 重新定義豐島區 (Toshima) - 正確版本
INSERT INTO temp_ward_node_fix (node_id, is_hub, parent_hub_id, ward_id) VALUES
-- 主要樞紐站
('odpt:Station:JR-East.Ikebukuro', true, NULL, 'ward:toshima'),  -- 池袋站是豐島區 Hub
-- 池袋站的子站
('odpt:Station:TokyoMetro.Ikebukuro', false, 'odpt:Station:JR-East.Ikebukuro', 'ward:toshima'),
('odpt:Station:Seibu.Ikebukuro', false, 'odpt:Station:JR-East.Ikebukuro', 'ward:toshima'),
('odpt:Station:TokyoMetro.Yurakucho.Ikebukuro', false, 'odpt:Station:JR-East.Ikebukuro', 'ward:toshima'),
('odpt:Station:TokyoMetro.Namboku.Ikebukuro', false, 'odpt:Station:JR-East.Ikebukuro', 'ward:toshima'),
('odpt:Station:TokyoMetro.Fukutoshin.Ikebukuro', false, 'odpt:Station:JR-East.Ikebukuro', 'ward:toshima'),
-- 豐島區其他車站
('odpt:Station:JR-East.Otsuka', false, NULL, 'ward:toshima'),
('odpt:Station:TokyoMetro.Yurakucho.Otsuka', false, NULL, 'ward:toshima'),
('odpt:Station:TokyoMetro.Namboku.Otsuka', false, NULL, 'ward:toshima'),
('odpt:Station:JR-East.Sugamo', false, NULL, 'ward:toshima'),
('odpt:Station:JR-East.Komagome', false, NULL, 'ward:toshima'),
('odpt:Station:JR-East.Shinotsuka', false, NULL, 'ward:toshima'),
('odpt:Station:JR-East.Zoshigaya', false, NULL, 'ward:toshima');

-- Step 2: 重新定義板橋區 (Itabashi) - 正確版本（不含池袋站）
INSERT INTO temp_ward_node_fix (node_id, is_hub, parent_hub_id, ward_id) VALUES
-- 主要樞紐站
('odpt:Station:JR-East.Itabashi', true, NULL, 'ward:itabashi'),  -- 板橋站是板橋區 Hub
('odpt:Station:JR-East.Shin-Itabashi', true, NULL, 'ward:itabashi'),  -- 新板橋站
('odpt:Station:JR-East.Tobu', true, NULL, 'ward:itabashi'),  -- 東武站
-- 板橋區其他車站
('odpt:Station:JR-East.Narimasu', false, NULL, 'ward:itabashi'),
('odpt:Station:JR-East.Motohasunuma', false, NULL, 'ward:itabashi'),
('odpt:Station:Tobu.Nerima', false, NULL, 'ward:itabashi');

-- Step 3: 重新定義千代田區 (Chiyoda) - 修正版本
INSERT INTO temp_ward_node_fix (node_id, is_hub, parent_hub_id, ward_id) VALUES
-- 主要樞紐站 (JR Hub)
('odpt:Station:JR-East.Tokyo', true, NULL, 'ward:chiyoda'),  -- 東京站
('odpt:Station:JR-East.Kanda', true, NULL, 'ward:chiyoda'),  -- 神田站
('odpt:Station:JR-East.Iidabashi', true, NULL, 'ward:chiyoda'),  -- 飯田橋站
('odpt:Station:JR-East.Ichigaya', true, NULL, 'ward:chiyoda'),  -- 市谷站
('odpt:Station:JR-East.Kudanshita', true, NULL, 'ward:chiyoda'),  -- 九段下站
-- 次要 Hub
('odpt:Station:Toei.Jimbocho', true, NULL, 'ward:chiyoda'),  -- 神保町站
('odpt:Station:Toei.Mita', true, NULL, 'ward:chiyoda'),  -- 三田站
('odpt:Station:TokyoMetro.Hibiya', true, NULL, 'ward:chiyoda'),  -- 日比谷線核心
('odpt:Station:TokyoMetro.Ginza', true, NULL, 'ward:chiyoda'),  -- 銀座線核心
-- 東京站子站
('odpt:Station:TokyoMetro.Otemachi', false, 'odpt:Station:JR-East.Tokyo', 'ward:chiyoda'),
('odpt:Station:TokyoMetro.Chiyoda.Otemachi', false, 'odpt:Station:JR-East.Tokyo', 'ward:chiyoda'),
('odpt:Station:Toei.Mita.Otemachi', false, 'odpt:Station:JR-East.Tokyo', 'ward:chiyoda'),
('odpt:Station:TokyoMetro.Marunouchi', false, 'odpt:Station:JR-East.Tokyo', 'ward:chiyoda'),
-- 神田站子站
('odpt:Station:TokyoMetro.Ginza.Kanda', false, 'odpt:Station:JR-East.Kanda', 'ward:chiyoda'),
('odpt:Station:TokyoMetro.Hibiya.Kanda', false, 'odpt:Station:JR-East.Kanda', 'ward:chiyoda'),
('odpt:Station:TokyoMetro.Kanda', false, 'odpt:Station:JR-East.Kanda', 'ward:chiyoda'),
-- 飯田橋站子站
('odpt:Station:TokyoMetro.Iidabashi', false, 'odpt:Station:JR-East.Iidabashi', 'ward:chiyoda'),
('odpt:Station:TokyoMetro.Yurakucho.Iidabashi', false, 'odpt:Station:JR-East.Iidabashi', 'ward:chiyoda'),
('odpt:Station:Toei.Oedo.Iidabashi', false, 'odpt:Station:JR-East.Iidabashi', 'ward:chiyoda'),
-- 市谷站子站
('odpt:Station:Toei.Shinjuku.Ichigaya', false, 'odpt:Station:JR-East.Ichigaya', 'ward:chiyoda'),
('odpt:Station:Toei.Oedo.Ichigaya', false, 'odpt:Station:JR-East.Ichigaya', 'ward:chiyoda'),
-- 九段下站子站
('odpt:Station:Toei.Shinjuku.Kudanshita', false, 'odpt:Station:JR-East.Kudanshita', 'ward:chiyoda'),
('odpt:Station:TokyoMetro.Tozai.Kudanshita', false, 'odpt:Station:JR-East.Kudanshita', 'ward:chiyoda'),
-- 三田站子站
('odpt:Station:TokyoMetro.Namboku.Mita', false, 'odpt:Station:Toei.Mita', 'ward:chiyoda'),
-- 日比谷線子站
('odpt:Station:Toei.Mita.Hibiya', false, 'odpt:Station:TokyoMetro.Hibiya', 'ward:chiyoda'),
-- 銀座線子站
('odpt:Station:TokyoMetro.Hibiya.Ginza', false, 'odpt:Station:TokyoMetro.Ginza', 'ward:chiyoda'),
-- 千代田區其他車站
('odpt:Station:JR-East.Yotsuya', false, NULL, 'ward:chiyoda'),
('odpt:Station:JR-East.Suidobashi', false, NULL, 'ward:chiyoda'),
('odpt:Station:TokyoMetro.Kasumigaseki', false, NULL, 'ward:chiyoda'),
('odpt:Station:TokyoMetro.Chiyoda', false, NULL, 'ward:chiyoda'),
('odpt:Station:TokyoMetro.Nezu', false, NULL, 'ward:chiyoda'),
('odpt:Station:TokyoMetro.Sendagi', false, NULL, 'ward:chiyoda'),
('odpt:Station:TokyoMetro.NishiNippori', false, NULL, 'ward:chiyoda'),
('odpt:Station:TokyoMetro.Yushima', false, NULL, 'ward:chiyoda'),
('odpt:Station:TokyoMetro.ShinOchanomizu', false, NULL, 'ward:chiyoda'),
('odpt:Station:TokyoMetro.KokkaiGijidomae', false, NULL, 'ward:chiyoda'),
('odpt:Station:TokyoMetro.Nijubashimae', false, NULL, 'ward:chiyoda'),
('odpt:Station:TokyoMetro.Akasaka', false, NULL, 'ward:chiyoda'),
('odpt:Station:TokyoMetro.AkasakaMitsuke', false, NULL, 'ward:chiyoda'),
('odpt:Station:TokyoMetro.Nagatacho', false, NULL, 'ward:chiyoda'),
('odpt:Station:TokyoMetro.Hanzomon', false, NULL, 'ward:chiyoda'),
('odpt:Station:Toei.Ogawamachi', false, NULL, 'ward:chiyoda'),
('odpt:Station:Toei.Iwamotocho', false, NULL, 'ward:chiyoda'),
('odpt:Station:Toei.Uchisaiwaicho', false, NULL, 'ward:chiyoda');

-- Step 4: 執行修復
-- 先更新豐島區
UPDATE nodes n
SET 
    is_hub = s.is_hub,
    parent_hub_id = s.parent_hub_id,
    ward_id = s.ward_id
FROM temp_ward_node_fix s
WHERE n.id = s.node_id AND s.ward_id = 'ward:toshima';

-- 再更新板橋區
UPDATE nodes n
SET 
    is_hub = s.is_hub,
    parent_hub_id = s.parent_hub_id,
    ward_id = s.ward_id
FROM temp_ward_node_fix s
WHERE n.id = s.node_id AND s.ward_id = 'ward:itabashi';

-- 最後更新千代田區
UPDATE nodes n
SET 
    is_hub = s.is_hub,
    parent_hub_id = s.parent_hub_id,
    ward_id = s.ward_id
FROM temp_ward_node_fix s
WHERE n.id = s.node_id AND s.ward_id = 'ward:chiyoda';

-- Step 5: 驗證修復結果
SELECT '=== 豐島區驗證 ===' as section;
SELECT 
    '豐島區' as ward,
    COUNT(*) FILTER (WHERE is_hub = true) as hub_count,
    COUNT(*) FILTER (WHERE is_hub = false AND parent_hub_id IS NOT NULL) as child_count,
    COUNT(*) FILTER (WHERE is_hub = false AND parent_hub_id IS NULL) as standalone_count,
    COUNT(*) as total
FROM nodes 
WHERE ward_id = 'ward:toshima';

SELECT id, name->>'zh-TW' as name, is_hub, parent_hub_id
FROM nodes 
WHERE ward_id = 'ward:toshima' AND is_hub = true
ORDER BY name->>'zh-TW';

SELECT '=== 板橋區驗證 ===' as section;
SELECT 
    '板橋區' as ward,
    COUNT(*) FILTER (WHERE is_hub = true) as hub_count,
    COUNT(*) FILTER (WHERE is_hub = false AND parent_hub_id IS NOT NULL) as child_count,
    COUNT(*) FILTER (WHERE is_hub = false AND parent_hub_id IS NULL) as standalone_count,
    COUNT(*) as total
FROM nodes 
WHERE ward_id = 'ward:itabashi';

SELECT id, name->>'zh-TW' as name, is_hub, parent_hub_id
FROM nodes 
WHERE ward_id = 'ward:itabashi' AND is_hub = true
ORDER BY name->>'zh-TW';

SELECT '=== 千代田區驗證 ===' as section;
SELECT 
    '千代田區' as ward,
    COUNT(*) FILTER (WHERE is_hub = true) as hub_count,
    COUNT(*) FILTER (WHERE is_hub = false AND parent_hub_id IS NOT NULL) as child_count,
    COUNT(*) FILTER (WHERE is_hub = false AND parent_hub_id IS NULL) as standalone_count,
    COUNT(*) as total
FROM nodes 
WHERE ward_id = 'ward:chiyoda';

SELECT id, name->>'zh-TW' as name, is_hub, parent_hub_id
FROM nodes 
WHERE ward_id = 'ward:chiyoda' AND is_hub = true
ORDER BY name->>'zh-TW';

SELECT '=== 池袋站歸屬檢查 ===' as section;
SELECT 
    id,
    name->>'zh-TW' as name,
    ward_id,
    is_hub,
    parent_hub_id
FROM nodes 
WHERE id = 'odpt:Station:JR-East.Ikebukuro'
   OR id = 'odpt:Station:TokyoMetro.Ikebukuro';

-- Step 6: 清理臨時表
DROP TABLE IF EXISTS temp_ward_node_fix;

SELECT '修復完成' as status, NOW() as fixed_at;
