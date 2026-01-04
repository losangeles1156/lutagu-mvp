# 方案 A：基於行政區的節點管理系統重建

> 撰寫日期：2026-01-04
> 狀態：待審核

---

## 一、現有系統分析

### 1.1 當前節點顯示機制

```
用戶移動地圖 → 防抖 350ms → 計算視口邊界 → API 查詢 → 快取 60s → 聚類渲染
```

**核心文件位置：**
| 功能 | 文件 |
|------|------|
| 視口加載器 | `src/components/map/MapContainer.tsx:161-278` |
| 節點分組算法 | `src/utils/nodeGroupUtils.ts` |
| API 端點 | `src/app/api/nodes/viewport/route.ts` |
| 數據庫 RPC | `nearby_nodes_v2` |

**當前流程細節：**
1. 每次 `moveend`/`zoomend` 觸發加載
2. 根據縮放級別調整策略：
   - zoom < 11：只顯示 Hub，頁面大小 180
   - zoom 11-13：顯示所有節點，頁面大小 450
   - zoom ≥ 14：完整顯示，頁面大小 800
3. 使用 PostGIS `ST_DWithin` 做地理空間查詢
4. 快取鍵格式：`{zoomBucket}:{hubsOnly}:{swLat},{swLon},{neLat},{neLon}`

### 1.2 現有問題

| 問題 | 影響 | 根因 |
|------|------|------|
| **頻繁 API 調用** | 每日 2000 次限制、延遲 | 每次移動都查詢 |
| **視口計算開銷** | CPU 使用率高 | 複雜的邊界計算和分頁 |
| **快取效率低** | 60s 過期、重複加載 | 視口鍵太精確，難以命中 |
| **節點重複/遺漏** | UX 不一致 | 分頁 + 去重邏輯複雜 |
| **沒有預加載** | 進入新區域時卡頓 | 純響應式設計 |

### 1.3 現有行政區數據

**發現關鍵資源：** `scripts/data/stations_by_ward.json`

```json
{
  "id": 1926726026,
  "lat": 35.6569261,
  "lon": 139.7547098,
  "name": "大門",
  "name_en": "Daimon",
  "ward": "Minato",        // ← 已有行政區字段！
  "operator": "東京都交通局"
}
```

**已覆蓋的行政區（從現有數據推斷）：**
- 港區 (Minato)
- 千代田區 (Chiyoda)
- 中央區 (Chuo)
- 台東區 (Taito)
- 文京區 (Bunkyo)
- 新宿區 (Shinjuku)
- 渋谷區 (Shibuya)
- 豐島區 (Toshima)

---

## 二、方案 A 核心設計

### 2.1 設計理念

**從「視口驅動」轉向「行政區驅動」**

```
舊模式：用戶移動 → 計算視口 → 查詢節點
新模式：用戶進入區域 → 加載整區數據 → 本地過濾顯示
```

### 2.2 架構圖

```
┌─────────────────────────────────────────────────────────────────┐
│                         前端 (MapContainer)                      │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │ WardDetector│───▶│ WardStore   │───▶│ NodeRenderer│         │
│  │ (地圖中心)  │    │ (區域快取)  │    │ (視口過濾)  │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│         │                  │                                    │
│         ▼                  ▼                                    │
│  ┌─────────────┐    ┌─────────────┐                            │
│  │ API: wards  │    │ API: nodes  │                            │
│  │ /boundaries │    │ /by-ward    │                            │
│  └─────────────┘    └─────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         後端 (Supabase)                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │   wards     │◀───│    nodes    │───▶│  l3_facil.  │         │
│  │ (行政區表)  │    │ (ward_id)   │    │ (設施表)    │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 核心優勢

| 優勢 | 說明 |
|------|------|
| **減少 API 調用 90%+** | 只在進入新區時加載，非每次移動 |
| **持久快取** | 區域數據可快取 24 小時以上 |
| **可預測的數據量** | 每區約 20-80 個站點，可控 |
| **符合用戶心智模型** | 「我在港區」比「我在視口內」更直觀 |
| **支持離線使用** | 預加載鄰近區域後可離線瀏覽 |

---

## 三、數據結構設計

### 3.1 新增 `wards` 表

```sql
CREATE TABLE wards (
    id TEXT PRIMARY KEY,              -- 'minato', 'chiyoda', 'taito'
    name JSONB NOT NULL,              -- {"zh-TW": "港區", "ja": "港区", "en": "Minato"}
    city_id TEXT REFERENCES cities(id) DEFAULT 'tokyo_core',

    -- 地理邊界
    bounds GEOMETRY(Polygon, 4326),   -- PostGIS 多邊形
    center GEOMETRY(Point, 4326),     -- 區域中心點

    -- 元數據
    station_count INT DEFAULT 0,      -- 站點數量（快取）
    area_km2 FLOAT,                   -- 面積（平方公里）

    -- 主題/特色
    theme JSONB,                      -- {"primary": "business", "secondary": "nightlife"}
    hero_station_id TEXT,             -- 代表站點 ID

    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 空間索引
CREATE INDEX idx_wards_bounds ON wards USING GIST(bounds);
CREATE INDEX idx_wards_center ON wards USING GIST(center);
```

### 3.2 修改 `nodes` 表

```sql
-- 新增 ward_id 字段
ALTER TABLE nodes ADD COLUMN ward_id TEXT REFERENCES wards(id);

-- 索引
CREATE INDEX idx_nodes_ward ON nodes(ward_id);

-- 批量更新現有節點的 ward_id（使用空間查詢）
UPDATE nodes n
SET ward_id = w.id
FROM wards w
WHERE ST_Within(n.coordinates, w.bounds);
```

### 3.3 東京 23 區初始數據

```sql
INSERT INTO wards (id, name, theme) VALUES
-- 核心商業區
('chiyoda', '{"zh-TW": "千代田區", "ja": "千代田区", "en": "Chiyoda"}',
 '{"primary": "government", "secondary": "business", "icon": "landmark"}'),
('chuo', '{"zh-TW": "中央區", "ja": "中央区", "en": "Chuo"}',
 '{"primary": "commerce", "secondary": "history", "icon": "building"}'),
('minato', '{"zh-TW": "港區", "ja": "港区", "en": "Minato"}',
 '{"primary": "business", "secondary": "nightlife", "icon": "briefcase"}'),

-- 文化/觀光區
('taito', '{"zh-TW": "台東區", "ja": "台東区", "en": "Taito"}',
 '{"primary": "culture", "secondary": "tourism", "icon": "temple"}'),
('bunkyo', '{"zh-TW": "文京區", "ja": "文京区", "en": "Bunkyo"}',
 '{"primary": "academic", "secondary": "nature", "icon": "book"}'),
('sumida', '{"zh-TW": "墨田區", "ja": "墨田区", "en": "Sumida"}',
 '{"primary": "traditional", "secondary": "artisan", "icon": "palette"}'),

-- 商業/娛樂區
('shinjuku', '{"zh-TW": "新宿區", "ja": "新宿区", "en": "Shinjuku"}',
 '{"primary": "entertainment", "secondary": "business", "icon": "star"}'),
('shibuya', '{"zh-TW": "渋谷區", "ja": "渋谷区", "en": "Shibuya"}',
 '{"primary": "youth", "secondary": "fashion", "icon": "sparkles"}'),
('toshima', '{"zh-TW": "豐島區", "ja": "豊島区", "en": "Toshima"}',
 '{"primary": "entertainment", "secondary": "anime", "icon": "gamepad"}'),

-- 住宅/生活區
('shinagawa', '{"zh-TW": "品川區", "ja": "品川区", "en": "Shinagawa"}',
 '{"primary": "transport", "secondary": "business", "icon": "train"}'),
('meguro', '{"zh-TW": "目黑區", "ja": "目黒区", "en": "Meguro"}',
 '{"primary": "residential", "secondary": "gourmet", "icon": "home"}'),
('setagaya', '{"zh-TW": "世田谷區", "ja": "世田谷区", "en": "Setagaya"}',
 '{"primary": "residential", "secondary": "nature", "icon": "tree"}'),
('ota', '{"zh-TW": "大田區", "ja": "大田区", "en": "Ota"}',
 '{"primary": "industrial", "secondary": "airport", "icon": "plane"}'),
('koto', '{"zh-TW": "江東區", "ja": "江東区", "en": "Koto"}',
 '{"primary": "waterfront", "secondary": "modern", "icon": "anchor"}'),

-- 外圍區
('nakano', '{"zh-TW": "中野區", "ja": "中野区", "en": "Nakano"}', NULL),
('suginami', '{"zh-TW": "杉並區", "ja": "杉並区", "en": "Suginami"}', NULL),
('nerima', '{"zh-TW": "練馬區", "ja": "練馬区", "en": "Nerima"}', NULL),
('itabashi', '{"zh-TW": "板橋區", "ja": "板橋区", "en": "Itabashi"}', NULL),
('kita', '{"zh-TW": "北區", "ja": "北区", "en": "Kita"}', NULL),
('arakawa', '{"zh-TW": "荒川區", "ja": "荒川区", "en": "Arakawa"}', NULL),
('adachi', '{"zh-TW": "足立區", "ja": "足立区", "en": "Adachi"}', NULL),
('katsushika', '{"zh-TW": "葛飾區", "ja": "葛飾区", "en": "Katsushika"}', NULL),
('edogawa', '{"zh-TW": "江戶川區", "ja": "江戸川区", "en": "Edogawa"}', NULL);
```

---

## 四、API 設計

### 4.1 取得行政區列表

```
GET /api/wards
Response: {
  wards: [
    {
      id: "minato",
      name: { "zh-TW": "港區", "ja": "港区", "en": "Minato" },
      center: [139.7516, 35.6581],
      station_count: 45,
      theme: { primary: "business", icon: "briefcase" },
      bounds_simplified: [[lon, lat], ...]  // 簡化邊界用於快速顯示
    }
  ]
}
```

### 4.2 取得單一行政區完整邊界

```
GET /api/wards/:id/boundary
Response: {
  id: "minato",
  boundary: {
    type: "Polygon",
    coordinates: [[[lon, lat], ...]]  // GeoJSON 格式
  }
}
```

### 4.3 取得行政區內所有節點（核心 API）

```
GET /api/nodes/by-ward/:wardId
Query: ?include_children=true&include_l1=true
Response: {
  ward_id: "minato",
  nodes: [
    {
      id: "odpt:Station:TokyoMetro.Roppongi",
      name: { "zh-TW": "六本木", ... },
      location: { coordinates: [139.7322, 35.6633] },
      is_hub: true,
      parent_hub_id: null,
      vibe: "nightlife",
      children: [
        { id: "odpt:Station:Toei.Roppongi", ... }
      ],
      category_counts: { dining: 45, shopping: 32, ... }  // L1 摘要
    }
  ],
  total: 45,
  cached_at: "2026-01-04T10:00:00Z",
  cache_ttl: 86400  // 24 小時
}
```

### 4.4 根據座標判斷所在行政區

```
GET /api/wards/detect?lat=35.6633&lon=139.7322
Response: {
  ward_id: "minato",
  ward_name: { "zh-TW": "港區", ... },
  adjacent_wards: ["shibuya", "chuo", "shinagawa"]  // 鄰近區域，用於預加載
}
```

---

## 五、前端實現設計

### 5.1 新增 `useWardStore` (Zustand)

```typescript
// src/stores/wardStore.ts
interface WardState {
  wards: Map<string, Ward>;              // 行政區元數據
  loadedWards: Set<string>;              // 已加載節點數據的區
  nodesByWard: Map<string, NodeDatum[]>; // 區 → 節點映射
  currentWardId: string | null;          // 當前所在區
  adjacentWardIds: string[];             // 鄰近區域

  // Actions
  loadWardList: () => Promise<void>;
  loadWardNodes: (wardId: string) => Promise<void>;
  detectCurrentWard: (lat: number, lon: number) => Promise<void>;
  preloadAdjacentWards: () => Promise<void>;
}
```

### 5.2 新增 `WardDetector` 組件

```typescript
// src/components/map/WardDetector.tsx
function WardDetector() {
  const map = useMap();
  const { detectCurrentWard, preloadAdjacentWards } = useWardStore();

  useMapEvents({
    moveend: debounce(() => {
      const center = map.getCenter();
      detectCurrentWard(center.lat, center.lng);
    }, 500)
  });

  // 當進入新區時預加載鄰近區域
  useEffect(() => {
    preloadAdjacentWards();
  }, [currentWardId]);
}
```

### 5.3 新增 `WardNodeLayer` 組件

```typescript
// src/components/map/WardNodeLayer.tsx
function WardNodeLayer() {
  const map = useMap();
  const { nodesByWard, loadedWards, currentWardId, adjacentWardIds } = useWardStore();
  const [visibleNodes, setVisibleNodes] = useState<NodeDatum[]>([]);

  // 合併當前區 + 鄰近區的節點
  const allNodes = useMemo(() => {
    const wardsToShow = [currentWardId, ...adjacentWardIds].filter(Boolean);
    return wardsToShow.flatMap(wid => nodesByWard.get(wid) || []);
  }, [currentWardId, adjacentWardIds, nodesByWard]);

  // 視口過濾（純本地操作，非常快）
  useEffect(() => {
    const bounds = map.getBounds();
    const filtered = allNodes.filter(node => {
      const [lon, lat] = node.location.coordinates;
      return bounds.contains([lat, lon]);
    });
    setVisibleNodes(filtered);
  }, [allNodes, map]);

  // 根據縮放級別決定顯示模式
  const zoom = map.getZoom();
  const groups = useMemo(() => {
    if (zoom >= 16) return visibleNodes; // 顯示所有
    return groupNodesByProximity(visibleNodes, 100); // 聚類
  }, [visibleNodes, zoom]);

  return groups.map(node => <NodeMarker key={node.id} node={node} />);
}
```

### 5.4 快取策略

```typescript
// src/lib/cache/wardCache.ts
const WARD_CACHE_CONFIG = {
  wardList: {
    key: 'bambigo:wards:list',
    ttl: 7 * 24 * 60 * 60 * 1000,  // 7 天
    storage: 'localStorage'
  },
  wardNodes: {
    keyPrefix: 'bambigo:wards:nodes:',
    ttl: 24 * 60 * 60 * 1000,      // 24 小時
    storage: 'indexedDB',          // 數據量較大，用 IndexedDB
    maxWards: 10                    // 最多快取 10 個區
  },
  wardBoundaries: {
    keyPrefix: 'bambigo:wards:boundary:',
    ttl: 30 * 24 * 60 * 60 * 1000, // 30 天（邊界很少變）
    storage: 'indexedDB'
  }
};
```

---

## 六、效能對比預估

### 6.1 API 調用次數

| 場景 | 舊系統 | 新系統 | 減少 |
|------|--------|--------|------|
| 初次加載 | 1-2 次 | 1 次（當前區）| 0-50% |
| 地圖拖動 10 次 | 10 次 | 0-1 次 | 90-100% |
| 縮放變化 | 每次 1 次 | 0 次 | 100% |
| 跨區移動 | 每次 1 次 | 1 次（新區）| 0% |
| **日均使用** | ~50-100 次 | ~5-10 次 | **90%+** |

### 6.2 數據傳輸量

| 項目 | 舊系統 | 新系統 |
|------|--------|--------|
| 單次請求 | 50-350 KB | 100-300 KB |
| 快取命中率 | ~30% | ~90% |
| 日均總量 | 5-10 MB | 1-2 MB |

### 6.3 響應時間

| 操作 | 舊系統 | 新系統 |
|------|--------|--------|
| 地圖移動後顯示節點 | 350ms 防抖 + 200-500ms API | 即時（本地過濾）|
| 進入新區域 | 200-500ms | 200-500ms（首次）/ 即時（快取）|
| 縮放變化 | 200-500ms | 即時 |

---

## 七、遷移計劃

### Phase 1：數據層準備（1-2 天）

1. 建立 `wards` 表和初始數據
2. 為 `nodes` 表新增 `ward_id` 字段
3. 編寫腳本從 `stations_by_ward.json` 匯入邊界數據
4. 編寫腳本更新現有節點的 `ward_id`

### Phase 2：API 開發（1-2 天）

1. 實現 `/api/wards` 端點
2. 實現 `/api/nodes/by-ward/:wardId` 端點
3. 實現 `/api/wards/detect` 端點
4. 添加適當的快取頭（Cache-Control）

### Phase 3：前端重構（2-3 天）

1. 建立 `wardStore` (Zustand)
2. 建立 `WardDetector` 組件
3. 建立 `WardNodeLayer` 組件
4. 整合快取策略（localStorage + IndexedDB）
5. 替換現有的 `ViewportNodeLoader`

### Phase 4：測試和優化（1-2 天）

1. 單元測試和整合測試
2. 效能基準測試
3. 邊界情況處理（跨區邊界節點等）
4. 回退機制（如果新系統失敗，使用舊邏輯）

---

## 八、風險和緩解

| 風險 | 影響 | 緩解措施 |
|------|------|----------|
| 行政區邊界數據不準確 | 節點歸屬錯誤 | 使用官方 GeoJSON + 手動驗證 |
| 單區節點數過多 | 加載時間長 | 分層加載（先 Hub，後 Spoke）|
| 快取過期導致數據過時 | 顯示舊數據 | 後台靜默更新 + 版本控制 |
| IndexedDB 不支持 | 舊瀏覽器無法快取 | 降級到 localStorage + 更短 TTL |
| 跨區邊界節點處理 | 節點可能在兩區都顯示 | 使用 `primary_ward_id` 唯一歸屬 |

---

## 九、與後端數據匹配度分析

### 9.1 現有數據優勢

| 數據源 | 匹配度 | 說明 |
|--------|--------|------|
| `stations_by_ward.json` | **高** | 已有 ward 字段，可直接使用 |
| `nodes` 表 | **中** | 有座標，需計算 ward_id |
| `cities` 表 | **高** | 可作為 wards 的父層級 |
| L1/L3 數據 | **高** | 通過 station_id 關聯，不受影響 |

### 9.2 需要補充的數據

1. **行政區邊界 GeoJSON**
   - 來源：日本國土地理院 or OpenStreetMap
   - 格式：GeoJSON Polygon

2. **行政區元數據**
   - 面積、人口（可選）
   - 主題/特色標籤
   - 代表站點

3. **站點-行政區映射**
   - 需要計算或手動確認
   - 約 500+ 個站點需要分配 ward_id

---

## 十、結論

方案 A 通過將節點管理從「視口驅動」轉變為「行政區驅動」，可以：

1. **大幅減少 API 調用**（90%+）
2. **提升用戶體驗**（即時響應、符合心智模型）
3. **支持離線使用**（預加載 + 持久快取）
4. **降低伺服器負載**（更少的即時查詢）

現有的 `stations_by_ward.json` 數據為這個方案提供了良好的基礎，遷移風險可控。

---

## 待確認問題

1. 是否需要支持「跨區搜索」功能？
2. 行政區邊界數據的來源確認？
3. 是否需要保留舊的視口查詢作為降級方案？
4. 優先支持哪些行政區？（建議：核心 9 區優先）

---

*等待審核確認後開始實施*
