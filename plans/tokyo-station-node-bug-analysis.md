# 東京車站節點顯示異常問題分析報告

## 問題摘要

### 症狀描述
1. **東京車站節點異常**：僅在選擇特定行政區時才會在東京站位置出現節點異常
2. **豐島區問題**：當點選豐島區時，系統錯誤地顯示板橋區的車站節點而非豐島區應有的節點
3. **千代田區問題**：節點顯示極為不穩定，存在節點遺漏或無法正常顯示的情況

### 問題發生時機
此問題是在 L4 樞紐車站知識庫建立完成之後才開始產生

---

## 根本原因分析

### 原因 1：行政區車站重複定義（豐島區/板橋區衝突）

**問題檔案**：[`20260103_all_tokyo_23wards_hubs.sql`](supabase/migrations/20260103_all_tokyo_23wards_hubs.sql)

**具體問題**：
- 豐島區定義（第 349-367 行）：
  ```sql
  ('odpt:Station:JR-East.Ikebukuro', true, NULL, '豐島'),
  ('odpt:Station:TokyoMetro.Ikebukuro', false, 'odpt:Station:JR-East.Ikebukuro', '豐島'),
  ```

- 板橋區定義（第 401-414 行）：
  ```sql
  ('odpt:Station:JR-East.Ikebukuro', true, NULL, '板橋'),  -- 衝突！
  ```

**影響**：SQL 執行時，板橋區的定義會覆蓋豐島區的定義，導致豐島區選擇後顯示的是板橋區的節點。

---

### 原因 2：seed_hierarchy 與 seedNodes.ts 邏輯不一致

**問題檔案**：
- [`20260103_all_tokyo_23wards_hubs.sql`](supabase/migrations/20260103_all_tokyo_23wards_hubs.sql)
- [`src/lib/nodes/seedNodes.ts`](src/lib/nodes/seedNodes.ts)

**具體問題**：

在 `seedNodes.ts` 中，東京 Metro 站點被標記為 Child 節點：
```typescript
// seedNodes.ts 第 363-372 行
{
    id: 'odpt:Station:TokyoMetro.Ikebukuro',
    is_hub: false,
    parent_hub_id: 'odpt:Station:JR-East.Ikebukuro',
}
```

但在 `seed_hierarchy` 中，這些站點可能沒有正確的父子關係映射。

**影響**：當 L4 知識庫建立後，`parent_hub_id` 的設置可能與行政區過濾邏輯衝突。

---

### 原因 3：MapContainer 過濾邏輯過於嚴格

**問題檔案**：[`src/components/map/MapContainer.tsx`](src/components/map/MapContainer.tsx:425-430)

```typescript
const visibleNodes = useMemo(() => {
    if (!nodes || nodes.length === 0) return [];
    // [FIX] Always hide children (nodes with a parent_hub_id)
    return nodes.filter(n => n.parent_hub_id === null);
}, [nodes]);
```

**問題**：
- 這個過濾會隱藏所有子節點，但某些應該在特定行政區顯示的節點可能被錯誤標記為子節點
- 當行政區選擇變更時，節點的 `is_hub` 狀態可能沒有正確更新

---

### 原因 4：千代田區車站父子關係不完整

**問題車站**：
- `TokyoMetro.Otemachi` 被設置為 `JR-East.Tokyo` 的子站
- 但 `JR-East.Tokyo` 本身可能沒有正確設置為 Hub
- `TokyoMetro.Ginza` 和 `TokyoMetro.Marunouchi` 的父子關係定義不完整

**影響**：導致千代田區的節點顯示不穩定，存在遺漏。

---

## 資料流分析

```
行政區選擇 → WardNodeLoader.fetchNodesByWard()
    ↓
/api/wards/[wardId] → 查詢 nodes 表 WHERE ward_id = 'ward:toshima'
    ↓
返回 nodes 陣列
    ↓
MapContainer.HubNodeLayer → filter(n => n.parent_hub_id === null)
    ↓
只顯示 is_hub = true 的節點
```

**瓶頸點**：
1. `ward_id` 欄位可能沒有正確設置
2. `parent_hub_id` 欄位可能與預期不符
3. API 返回的 `nodes` 陣列可能不完整

---

## 修復方案

### 修復 1：修正 seed_hierarchy 行政區定義

**目標**：確保每個車站只屬於一個行政區

**SQL 修復腳本**：

```sql
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
-- 板橋站的子站
('odpt:Station:TokyoMetro.Marunouchi.Ikebukuro', false, 'odpt:Station:JR-East.Itabashi', 'ward:itabashi'),
('odpt:Station:TokyoMetro.Yurakucho.Ikebukuro', false, 'odpt:Station:JR-East.Itabashi', 'ward:itabashi'),
('odpt:Station:TokyoMetro.Namboku.Ikebukuro', false, 'odpt:Station:JR-East.Itabashi', 'ward:itabashi'),
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

-- Step 4: 驗證修復前的衝突
SELECT
    '修復前衝突檢查' as status,
    node_id,
    COUNT(*) as occurrence,
    ARRAY_AGG(ward_id) as wards
FROM temp_ward_node_fix
GROUP BY node_id
HAVING COUNT(*) > 1;

-- Step 5: 執行修復
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

-- Step 6: 驗證修復結果

-- 驗證豐島區
SELECT
    '豐島區驗證' as check_name,
    COUNT(*) FILTER (WHERE is_hub = true) as hub_count,
    COUNT(*) FILTER (WHERE is_hub = false AND parent_hub_id IS NOT NULL) as child_count,
    COUNT(*) FILTER (WHERE is_hub = false AND parent_hub_id IS NULL) as standalone_count,
    COUNT(*) as total
FROM nodes
WHERE ward_id = 'ward:toshima';

-- 驗證板橋區（不應包含池袋站）
SELECT
    '板橋區驗證' as check_name,
    id,
    name->>'zh-TW' as name,
    is_hub,
    parent_hub_id
FROM nodes
WHERE ward_id = 'ward:itabashi' AND is_hub = true
ORDER BY name->>'zh-TW';

-- 驗證千代田區
SELECT
    '千代田區驗證' as check_name,
    COUNT(*) FILTER (WHERE is_hub = true) as hub_count,
    COUNT(*) FILTER (WHERE is_hub = false AND parent_hub_id IS NOT NULL) as child_count,
    COUNT(*) FILTER (WHERE is_hub = false AND parent_hub_id IS NULL) as standalone_count,
    COUNT(*) as total
FROM nodes
WHERE ward_id = 'ward:chiyoda';

-- 確認池袋站只屬於豐島區
SELECT
    '池袋站歸屬檢查' as check_name,
    id,
    ward_id,
    is_hub,
    parent_hub_id
FROM nodes
WHERE id = 'odpt:Station:JR-East.Ikebukuro'
   OR id = 'odpt:Station:TokyoMetro.Ikebukuro';

-- Step 7: 清理臨時表
DROP TABLE IF EXISTS temp_ward_node_fix;
```

---

### 修復 2：驗證並修正千代田區車站關係

```sql
-- 驗證千代田區的主要樞紐站
SELECT
    id,
    name->>'zh-TW' as name,
    is_hub,
    parent_hub_id
FROM nodes
WHERE ward_id = 'ward:chiyoda'
  AND (is_hub = true OR parent_hub_id IS NOT NULL)
ORDER BY name->>'zh-TW';

-- 修正東京站及其子站的父子關係
-- JR 東京站是 Hub
UPDATE nodes
SET is_hub = true, parent_hub_id = NULL
WHERE id = 'odpt:Station:JR-East.Tokyo';

-- 東京 Metro 大手町站是 JR 東京站的子站
UPDATE nodes
SET parent_hub_id = 'odpt:Station:JR-East.Tokyo'
WHERE id = 'odpt:Station:TokyoMetro.Otemachi'
   OR id = 'odpt:Station:TokyoMetro.Chiyoda.Otemachi'
   OR id = 'odpt:Station:Toei.Mita.Otemachi';

-- 驗證銀座線和日比谷線的核心站
SELECT id, name->>'zh-TW' as name, is_hub, parent_hub_id
FROM nodes
WHERE id IN (
    'odpt:Station:TokyoMetro.Ginza',
    'odpt:Station:TokyoMetro.Hibiya',
    'odpt:Station:TokyoMetro.Marunouchi'
);
```

---

### 修復 3：同步 seedNodes.ts 和 seed_hierarchy

**目標**：確保 seedNodes.ts 中的 `parent_hub_id` 設置與 seed_hierarchy 一致

**建議**：在 L4 知識庫建立後，重新執行同步：

```sql
-- 重新同步 seed_hierarchy 到 nodes 表
-- 確保 is_hub 和 parent_hub_id 正確設置

-- 先備份當前狀態
CREATE TABLE nodes_backup AS SELECT * FROM nodes WHERE is_hub = true;

-- 重新執行 seed_hierarchy 更新
-- 確保每個行政區只定義一次每個車站
```

---

### 修復 4：改進前端過濾邏輯

**檔案**：[`src/components/map/MapContainer.tsx`](src/components/map/MapContainer.tsx:425-430)

**建議修改**：

```typescript
const visibleNodes = useMemo(() => {
    if (!nodes || nodes.length === 0) return [];

    // 在 Ward 模式下，顯示所有該行政區的 Hub
    // 考慮加入一個參數來控制是否嚴格隱藏子節點
    return nodes.filter(n => {
        // 顯示條件：
        // 1. 是 Hub (is_hub = true, parent_hub_id = null)
        // 2. 或者是該行政區的主要站點（需要額外的邏輯判斷）
        return n.parent_hub_id === null ||
               (n.is_hub === true && n.parent_hub_id === null);
    });
}, [nodes]);
```

---

## 驗證清單

### Step 1：驗證豐島區節點
```sql
-- 檢查豐島區的 Hub 站點
SELECT id, name->>'zh-TW' as name, is_hub, parent_hub_id
FROM nodes
WHERE ward_id = 'ward:toshima'
  AND is_hub = true
ORDER BY name->>'zh-TW';
```

**預期結果**：
- `odpt:Station:JR-East.Ikebukuro` (池袋站)
- 其他豐島區的 Hub 站點

### Step 2：驗證板橋區節點
```sql
-- 檢查板橋區的 Hub 站點（不應包含池袋站）
SELECT id, name->>'zh-TW' as name, is_hub, parent_hub_id
FROM nodes
WHERE ward_id = 'ward:itabashi'
  AND is_hub = true
ORDER BY name->>'zh-TW';
```

**預期結果**：
- `odpt:Station:JR-East.Itabashi` (板橋站)
- `odpt:Station:JR-East.Shin-Itabashi` (新板橋站)
- `odpt:Station:JR-East.Tobu` (東武站)

### Step 3：驗證千代田區節點
```sql
-- 檢查千代田區的主要 Hub
SELECT id, name->>'zh-TW' as name, is_hub, parent_hub_id
FROM nodes
WHERE ward_id = 'ward:chiyoda'
  AND is_hub = true
ORDER BY name->>'zh-TW';
```

**預期結果**：
- `odpt:Station:JR-East.Tokyo` (東京站)
- `odpt:Station:JR-East.Kanda` (神田站)
- `odpt:Station:JR-East.Iidabashi` (飯田橋站)
- `odpt:Station:JR-East.Ichigaya` (市谷站)
- `odpt:Station:JR-East.Kudanshita` (九段下站)
- `odpt:Station:Toei.Jimbocho` (神保町站)
- `odpt:Station:Toei.Mita` (三田站)

---

## 監控建議

### 新增監控日誌

在 `WardNodeLoader.tsx` 中添加更多日誌：

```typescript
console.log(`[WardNodeLoader] Ward ${wardId} nodes:`, {
    total: filteredNodes.length,
    hubs: filteredNodes.filter(n => n.is_hub).length,
    children: filteredNodes.filter(n => n.parent_hub_id).length,
    sampleIds: filteredNodes.slice(0, 5).map(n => n.id)
});
```

---

## 結論

東京車站節點顯示異常的根本原因是：

1. **seed_hierarchy 定義衝突**：豐島區和板橋區都定義了同一個車站（池袋站），導致 `ward_id` 被覆蓋
2. **父子節點邏輯不一致**：`seedNodes.ts` 和 `seed_hierarchy` 中的 `parent_hub_id` 設置可能不一致
3. **前端過濾邏輯過於嚴格**：可能隱藏了應該顯示的節點

**修復優先順序**：
1. **高優先級**：修正豐島區和板橋區的 `ward_id` 衝突
2. **高優先級**：驗證並修正千代田區車站的父子關係
3. **中優先級**：同步 seedNodes.ts 和 seed_hierarchy
4. **低優先級**：改進前端過濾邏輯

建議按照驗證清單逐一檢查各行政區的節點狀態，確保修復後的數據一致性。
