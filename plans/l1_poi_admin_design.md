# L1 景點後台管理設計方案

## 需求背景

**現況**：
- L1 景點數據目前從 OpenStreetMap (OSM) 自動抓取
- 數據存儲在 `l1_places` 表和 `staticL1Data` 靜態文件

**新需求**：
- 從後台手動新增景點（尤其是合作店家導流）
- 合作店家需要有額外屬性（優惠券、導流連結、營業時間等）
- 手動新增的數據優先級高於 OSM 數據

---

## 數據庫設計擴展

### 新增表格：`l1_custom_places`（合作店家/自定義景點）

```sql
CREATE TABLE l1_custom_places (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id VARCHAR NOT NULL,         -- 關聯站點
    name_i18n JSONB NOT NULL,            -- { ja, en, zh }
    description_i18n JSONB,              -- { ja, en, zh }
    category VARCHAR NOT NULL,           -- shopping, dining, leisure, etc.
    subcategory VARCHAR,
    location POINT(4326),                -- PostGIS 地理座標
    address TEXT,
    
    -- 合作店家專屬欄位
    is_partner BOOLEAN DEFAULT TRUE,     -- 是否為合作店家
    partner_id VARCHAR,                  -- 合作店家ID
    affiliate_url TEXT,                  -- 導流連結
    discount_info JSONB,                 -- 優惠資訊
    business_hours JSONB,                -- 營業時間
    
    -- 媒體
    image_urls TEXT[],
    logo_url TEXT,
    
    -- 狀態
    is_active BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 100,        -- 數值越大越優先顯示
    expires_at TIMESTAMP WITH TIME ZONE, -- 活動期限
    
    -- 審核
    status VARCHAR DEFAULT 'draft',      -- draft, pending, approved, rejected
    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    
    -- 時間戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 建立索引
CREATE INDEX idx_l1_custom_places_station ON l1_custom_places(station_id);
CREATE INDEX idx_l1_custom_places_category ON l1_custom_places(category);
CREATE INDEX idx_l1_custom_places_status ON l1_custom_places(status);
CREATE INDEX idx_l1_custom_places_location ON l1_custom_places USING GIST(location);
```

### 新增表格：`l1_partners`（合作店家主檔）

```sql
CREATE TABLE l1_partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR NOT NULL,               -- 店家名稱
    name_ja VARCHAR,
    name_en VARCHAR,
    contact_email VARCHAR,
    contact_phone VARCHAR,
    website_url TEXT,
    
    -- 結算相關
    commission_rate DECIMAL(4,2),        -- 佣金比例
    affiliate_code VARCHAR,              -- 聯盟行銷代碼
    
    -- 狀態
    status VARCHAR DEFAULT 'active',     -- active, inactive, suspended
    
    -- 時間戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## API 設計

### 1. 景點管理 API

| Method | Endpoint | 說明 |
|--------|----------|------|
| GET | `/api/admin/l1/places` | 列出所有自定義景點 |
| POST | `/api/admin/l1/places` | 新增景點 |
| GET | `/api/admin/l1/places/[id]` | 取得單一景點 |
| PUT | `/api/admin/l1/places/[id]` | 更新景點 |
| DELETE | `/api/admin/l1/places/[id]` | 刪除景點（軟刪除） |
| PUT | `/api/admin/l1/places/[id]/approve` | 審核通過 |
| PUT | `/api/admin/l1/places/[id]/reject` | 審核拒絕 |

### 2. 景點查詢 API（前端使用）

```typescript
// GET /api/l1/places
interface QueryParams {
    stationId: string;
    category?: string;
    includePartnerOnly?: boolean;  // 只顯示合作店家
}

interface Response {
    places: Array<{
        id: string;
        name: string;
        category: string;
        location: { lat: number; lng: number };
        isPartner: boolean;
        affiliateUrl?: string;
        discountInfo?: {...};
    }>;
}
```

---

## 後台管理介面設計

### 頁面結構

```
/admin
├── /dashboard          # 總覽
├── /l1-places          # 景點管理
│   ├── /               # 列表頁
│   ├── /new            # 新增頁
│   ├── /[id]           # 編輯頁
│   └── /[id]/analytics # 數據分析
├── /partners           # 店家管理
└── /categories         # 分類管理
```

### 新增景點表單設計

```typescript
interface PlaceFormData {
    // 基本資訊
    stationId: string;          // 站點選擇器
    name: { ja: string; en: string; zh: string };
    description: { ja: string; en: string; zh: string };
    category: string;           // 下拉選擇
    subcategory: string;
    
    // 位置
    address: string;
    location: { lat: number; lng: number };  // 地圖選擇
    
    // 合作店家資訊
    isPartner: boolean;
    partnerId?: string;         // 若選擇現有店家
    affiliateUrl?: string;
    discountInfo?: {
        type: 'percent' | 'fixed' | 'special';
        value: number;
        description: string;
    };
    businessHours?: {...};
    
    // 媒體
    images: File[];
    logo: File;
    
    // 發布
    status: 'draft' | 'pending' | 'approved';
    priority: number;           // 1-100
    expiresAt?: Date;
}
```

---

## 前端整合方案

### 1. 修改現有 L1 數據獲取邏輯

```typescript
// src/hooks/useL1Places.ts

async function fetchPlaces(stationId: string) {
    // 1. 先獲取自定義景點（高優先級）
    const customRes = await fetch(`/api/l1/places?stationId=${stationId}&includePartnerOnly=false`);
    const customPlaces = await customRes.json();
    
    // 2. 若需要，獲取 OSM 景點（低優先級）
    // ...
    
    // 3. 合併：自定義景點覆蓋 OSM 景點（依 osm_id 去重）
    return mergePlaces(customPlaces, osmPlaces);
}
```

### 2. 新增合作店家標識 UI

```tsx
// 在景點卡片中顯示合作店家標識
{place.isPartner && (
    <div className="partner-badge">
        <span>⭐ 合作店家</span>
        {place.affiliateUrl && (
            <a href={place.affiliateUrl} target="_blank" rel="noopener">
                前往預約 →
            </a>
        )}
    </div>
)}
```

---

## 數據同步策略

### 衝突處理

| 情況 | 處理方式 |
|------|---------|
| 自定義景點與 OSM 景點位置接近 | 自定義景點優先 |
| 同名稱景點 | 保留自定義景點 |
| 合作店家到期 | 自動降級為一般景點或移除 |

### 定期任務

```typescript
// 1. 檢查過期合作店家
// 2. 同步統計數據
// 3. 生成 Analytics 報告
```

---

## 執行步驟

### Phase 1: 基礎設施（1-2 天）
- [ ] 建立 `l1_custom_places` 和 `l1_partners` 資料表
- [ ] 建立後台 API CRUD 接口
- [ ] 建立基礎後台頁面

### Phase 2: 前端整合（2-3 天）
- [ ] 修改 `useL1Places` hook 整合自定義數據
- [ ] 新增合作店家標識 UI
- [ ] 新增導流連結處理

### Phase 3: 進階功能（2-3 天）
- [ ] 店家管理模組
- [ ] 數據分析儀表板
- [ ] 批量操作功能
- [ ] 匯入匯出功能

---

## 相關文件

1. 現有 L1 數據結構：[`src/lib/types/stationStandard.ts`](src/lib/types/stationStandard.ts)
2. 現有景點 hook：[`src/hooks/useL1Places.ts`](src/hooks/useL1Places.ts)
3. OSM 整合：[`src/lib/facilities/osmMapping.ts`](src/lib/facilities/osmMapping.ts)
