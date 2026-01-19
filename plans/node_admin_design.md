# 節點與數據管理後台設計

## 核心設計理念

**從「自動化抓取」轉向「後台人工控制」**

```
┌─────────────────────────────────────────────────────────────┐
│                    後台管理系統                              │
├─────────────────────────────────────────────────────────────┤
│  1. 節點結構管理      2. 數據篩選管理      3. 顯示策略配置    │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │ Hub/子站關係 │    │ L1 餐飲 30/300│    │ 顯示哪些標籤 │     │
│  │ 人工設定     │    │ L3 設施 5/20 │    │ 權重排序     │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      前端顯示                                │
│  只顯示後台「批准」的數據，確保品質                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 數據庫設計

### 1. 節點層級結構表 (`node_hierarchy`)

```sql
CREATE TABLE node_hierarchy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id TEXT NOT NULL,           -- 車站 ID (如 odpt.Station:JR-East.Ueno)
    hub_id TEXT,                     -- 父節點 ID (如 odpt.Station:JR-East.Ueno)
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(node_id)
);

-- 建立索引
CREATE INDEX idx_node_hierarchy_hub ON node_hierarchy(hub_id);
CREATE INDEX idx_node_hierarchy_node ON node_hierarchy(node_id);
```

### 2. L1 數據配置表 (`node_l1_config`)

```sql
CREATE TABLE node_l1_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id TEXT NOT NULL,           -- 車站 ID
    category TEXT NOT NULL,          -- 類型 (dining, shopping, leisure...)
    source_table TEXT NOT NULL,      -- 數據來源 (l1_places)
    source_id TEXT NOT NULL,         -- 原始數據 ID
    is_approved BOOLEAN DEFAULT FALSE, -- 是否批准顯示
    is_featured BOOLEAN DEFAULT FALSE, -- 精選推薦
    display_order INTEGER DEFAULT 0,
    notes TEXT,                      -- 備註 (為何選中/排除)
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(node_id, source_table, source_id)
);

CREATE INDEX idx_l1_config_node ON node_l1_config(node_id, category, is_approved);
```

### 3. L3 數據配置表 (`node_l3_config`)

```sql
CREATE TABLE node_l3_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id TEXT NOT NULL,           -- 車站 ID
    facility_type TEXT NOT NULL,     -- 設施類型 (toilet, locker, elevator...)
    source_id TEXT NOT NULL,         -- 原始數據 ID
    is_approved BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    notes TEXT,
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(node_id, facility_type, source_id)
);

CREATE INDEX idx_l3_config_node ON node_l3_config(node_id, facility_type, is_approved);
```

### 4. 節點標籤配置表 (`node_tags_config`)

```sql
CREATE TABLE node_tags_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id TEXT NOT NULL,
    tag_key TEXT NOT NULL,           -- 標籤 key
    tag_value JSONB NOT NULL,        -- 標籤值 { ja, en, zh-TW }
    weight INTEGER DEFAULT 50,       -- 權重 1-100
    is_override BOOLEAN DEFAULT FALSE, -- 是否覆蓋 OSM 數據
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(node_id, tag_key)
);

CREATE INDEX idx_tags_config_node ON node_tags_config(node_id, is_active);
```

---

## 數據流向設計

### 現有流程（問題）

```
OSM/L1 Scraper → l1_places 表 → 前端顯示全部 300 家餐廳
                          ↓
                    全部顯示（無篩選）
```

### 新流程（解決方案）

```
OSM/L1 Scraper → l1_places 表
                          │
                          ├──→ 未批准 (is_approved = false)
                          │     ↓
                          │   不顯示在前端
                          │
                          └──→ 已批准 (is_approved = true)
                                ↓
                              前端顯示 (精選 30 家)
```

---

## Supabase Studio 配置

### 快速建立 View

```sql
-- view: 等待審核的 L1 數據
CREATE OR REPLACE VIEW v_l1_pending AS
SELECT
    l1.id,
    l1.station_id,
    l1.name,
    l1.category,
    l1.osm_id,
    c.is_approved,
    c.is_featured,
    c.notes
FROM l1_places l1
LEFT JOIN node_l1_config c ON l1.station_id = c.node_id
    AND c.source_id = l1.id::TEXT
WHERE c.is_approved IS NULL OR c.is_approved = FALSE;

-- view: 已批准的 L1 數據（前端實際顯示）
CREATE OR REPLACE VIEW v_l1_approved AS
SELECT
    l1.id,
    l1.station_id,
    l1.name,
    l1.category,
    l1.osm_id,
    c.is_featured,
    c.display_order
FROM l1_places l1
JOIN node_l1_config c ON l1.station_id = c.node_id
    AND c.source_id = l1.id::TEXT
WHERE c.is_approved = TRUE
ORDER BY c.display_order, l1.name;
```

---

## 管理操作流程

### 1. 節點結構管理

```
步驟 1: 建立 Hub 節點
→ 新增 node_hub 記錄，設定 hub_id = NULL

步驟 2: 加入子站點
→ 在 node_hierarchy 中設定 node_id + parent_hub_id

步驟 3: 驗證層級
→ 檢查無循環引用，確認關係正確
```

### 2. L1 數據篩選

```
情境: 上野站有 300 家餐廳

步驟 1: 查看 v_l1_pending
→ 列出所有未批准的餐廳

步驟 2: 選擇優質餐廳
→ 設定 is_approved = TRUE, is_featured = TRUE

步驟 3: 設定順序
→ 設定 display_order 決定顯示順序

步驟 4: 排除劣質數據
→ 保持 is_approved = FALSE
```

### 3. L3 數據篩選

```
情境: 上野站有 20 個設施

步驟 1: 查看 v_l3_pending
→ 列出所有未批准的設施

步驟 2: 選擇核心設施
→ 廁所、電梯、重要出口設為批准

步驟 3: 標記精選
→ is_featured = TRUE 顯示在重點位置
```

---

## 前端整合

### API 查詢已批准數據

```typescript
// GET /api/nodes/[id]/l1?category=dining
// 返回 only approved = true 的數據

async function getApprovedL1Data(nodeId: string, category?: string) {
    const { data } = await supabase
        .from('v_l1_approved')  // 使用 View
        .select('*')
        .eq('station_id', nodeId)
        .eq('is_approved', true)
        .order('display_order');

    return data;
}
```

### 顯示邏輯

```typescript
function L1PlaceList({ nodeId, category }) {
    const places = useL1Places(nodeId, category);  // 只返回已批准數據

    return (
        <div>
            {places.map(place => (
                <PlaceCard
                    key={place.id}
                    place={place}
                    isFeatured={place.is_featured}  // 精選標記
                />
            ))}
        </div>
    );
}
```

---

## 實施步驟

### Phase 1：基礎設施（1 天）

- [ ] 建立 `node_hierarchy`, `node_l1_config`, `node_l3_config`, `node_tags_config` 資料表
- [ ] 建立 SQL Views (`v_l1_pending`, `v_l1_approved`)
- [ ] 在 Supabase Studio 測試 CRUD 操作

### Phase 2：數據遷移（1 天）

- [ ] 將現有 `nodes` 表的 `parent_hub_id` 同步到 `node_hierarchy`
- [ ] 將 OSM 抓取的 L1 數據標記為 `is_approved = FALSE`（待審核）
- [ ] 建立批量批准腳本（預設批准核心站點的數據）

### Phase 3：後台 UI（2-3 天）

- [ ] `/admin/nodes` - 節點結構管理
- [ ] `/admin/nodes/[id]/l1` - L1 數據篩選
- [ ] `/admin/nodes/[id]/l3` - L3 數據篩選
- [ ] `/admin/nodes/[id]/tags` - 標籤配置

### Phase 4：前端整合（1 天）

- [ ] 修改 API 只返回已批准數據
- [ ] 更新 `useL1Places` hook
- [ ] 移除未批准數據的顯示

---

## 優勢總結

| 功能 | 自動化問題 | 後台控制優勢 |
|-----|-----------|-------------|
| 餐廳顯示 | 300家太雜 | 精選30家高品質 |
| 設施標籤 | 標籤混亂 | 精準控制 |
| 節點結構 | 難以維護 | 拖拽式調整 |
| 數據品質 | 不穩定 | 人工把關 |
| 顯示策略 | 無法細粒度控制 | 每項可獨立設定 |

---

## 成本評估

| Phase | 預估工時 | 總工時 |
|-------|---------|-------|
| Phase 1: 基礎設施 | 1 天 | 1 天 |
| Phase 2: 數據遷移 | 1 天 | 2 天 |
| Phase 3: 後台 UI | 3 天 | 5 天 |
| Phase 4: 前端整合 | 1 天 | 6 天 |

**建議**：先執行 Phase 1+2，驗證效果後再決定是否需要 Phase 3
