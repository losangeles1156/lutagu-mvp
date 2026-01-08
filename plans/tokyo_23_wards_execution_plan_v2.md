# 東京23區行政區節點重建計劃

> 版本：v2.0  
> 日期：2026-01-04  
> 狀態：規劃中，待實作

## ⚠️ 重要：與現有 Hub 設計的關係

**本計劃是對現有 Hub 設計的補充，而非取代。**

### Hub vs Ward 設計維度

| 維度 | Hub (換乘樞紐) | Ward (行政區) |
|------|---------------|---------------|
| **定義** | 同一地點的多家鐵道公司 | 地理邊界內的所有站點 |
| **目的** | 減少視覺堆疊、顯示換乘關係 | 減少 API 呼叫、載入區域數據 |
| **資料** | is_hub, parent_hub_id, hub_members | ward_id (待新增) |
| **範例** | 上野站 = JR + 東京地下鐵 + 京成 | 台東區 = 上野 + 秋葉原 + 淺草 |

### 設計原則

```
┌─────────────────────────────────────────────────────────────┐
│                      Ward（行政區）                           │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Hub A（上野站樞紐）                                  │    │
│  │  ├── JR上野站 (is_hub=true)                          │    │
│  │  ├── 東京Metro上野站 (parent_hub_id=JR上野)          │    │
│  │  └── 京成上野站 (parent_hub_id=JR上野)               │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Hub B（秋葉原站樞紐）                                │    │
│  │  ├── JR秋葉原站 (is_hub=true)                        │    │
│  │  └── TX秋葉原站 (parent_hub_id=JR秋葉原)             │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Standalone Station（淺草站 - 獨立 Hub）              │    │
│  │  └── 東京Metro淺草站 (is_hub=true, 無 parent)        │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

**核心原則**：
1. Ward 是「容器」，包含多個 Hub 和獨立站點
2. Hub 的父子關係保持不變（is_hub, parent_hub_id）
3. Ward 層級用於「資料載入策略」
4. Hub 層級用於「地圖顯示分組」

### 2.2 預估效益

| 指標 | 舊系統 | 新系統 | 改善 |
|------|--------|--------|------|
| 日均 API 調用 | 50-100 次 | 5-10 次 | -90% |
| 地圖拖動響應 | 350ms + API | 即時（本地過濾） | 毫秒級 |
| 快取命中率 | ~30% | ~90% | +60% |

### 2.3 支援範圍

**核心 9 區優先建置**：
1. 千代田區（Chiyoda）
2. 中央區（Chuo）
3. 港區（Minato）
4. 台東區（Taito）
5. 文京區（Bunkyo）
6. 新宿區（Shinjuku）
7. 渋谷區（Shibuya）
8. 豐島區（Toshima）
9. 品川區（Shinagawa）

**邊界數據來源**：日本國土地理院

---

## 3. 與現有系統的整合

### 3.1 現有資料模型（保留）

```
nodes 表（現有結構，維持不變）
├── id: 'odpt:Station:JR-East.Ueno'
├── is_hub: true/false           ← 保留：換乘樞紐標記
├── parent_hub_id: string | null ← 保留：父子節點關係
├── city_id: 'tokyo_core'        ← 保留：城市分區
├── coordinates: GEOMETRY(POINT) ← 保留：座標
└── ward_id: 'ward:taito'        ← 新增：行政區關聯

hub_metadata 表（現有結構，維持不變）
└── hub_id, transfer_type, transfer_complexity...

hub_members 表（現有結構，維持不變）
└── hub_id, member_id, transfer_type...
```

### 3.2 Ward 數據作為補充

Ward 系統不取代現有 Hub 系統，而是提供：

1. **地理分組**：根據座標自動分配 ward_id
2. **快取策略**：按行政區快取，24小時有效
3. **統計數據**：每個行政區的節點計數、Hub 計數
4. **邊界可視化**：在地图上顯示行政區邊界

### 3.3 資料純淨性保證

```
❌ 錯誤做法：
- 用 Ward 取代 Hub 的 is_hub/parent_hub_id
- 將 Hub 邏輯分散到 Ward 資料中

✅ 正確做法：
- Ward 只負責地理分組和快取
- Hub 保持獨立，用於換乘邏輯
- API 回傳時，同時包含 ward 和 hub 資訊
```

---

## 4. 執行計劃

### Phase 1：資料庫擴展（只新增，不修改現有結構）

#### 4.1 建立 `wards` 表

```sql
CREATE TABLE wards (
    id TEXT PRIMARY KEY,                    -- 'ward:taito'
    name_i18n JSONB NOT NULL,               -- {"zh-TW": "台東區", "ja": "台東区", "en": "Taito"}
    prefecture TEXT NOT NULL DEFAULT 'Tokyo',
    ward_code INT,                          -- ISO 13131 ward code
    
    -- Geographic Data (from 国土地理院)
    boundary GEOMETRY(MultiPolygon, 4326),
    center_point GEOMETRY(Point, 4326),
    
    -- Statistics (聚合現有 nodes 數據)
    node_count INT DEFAULT 0,
    hub_count INT DEFAULT 0,
    
    -- Metadata
    priority_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_wards_boundary ON wards USING GIST(boundary);
CREATE INDEX idx_wards_center ON wards USING GIST(center_point);
CREATE INDEX idx_wards_priority ON wards(priority_order) WHERE is_active = true;
```

#### 4.2 為 `nodes` 表**新增** `ward_id` 欄位

```sql
-- 只新增，不修改現有欄位
ALTER TABLE nodes ADD COLUMN IF NOT EXISTS ward_id TEXT REFERENCES wards(id);

-- 建立索引加速查詢
CREATE INDEX IF NOT EXISTS idx_nodes_ward ON nodes(ward_id);

-- 保留現有索引
-- idx_nodes_parent (parent_hub_id)
-- idx_nodes_coordinates (位置查詢)
```

#### 4.3 編寫腳本**更新**現有節點的 `ward_id`

```typescript
// 腳本：assign_nodes_to_wards.ts
// 功能：根據節點座標，自動分配到所屬行政區
// 注意：不觸碰 is_hub, parent_hub_id 等現有欄位

import { createClient } from '@supabase/supabase-js';
import * as turf from '@turf/turf';

interface SeedNode {
    id: string;
    location: string; // 'POINT(139.7774 35.7141)'
    ward_id?: string;
    is_hub?: boolean;
    parent_hub_id?: string | null;
}

async function assignNodesToWards() {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
    
    // 1. 獲取所有 wards 和其邊界
    const { data: wards } = await supabase.from('wards').select('id, boundary, name_i18n');
    
    if (!wards || wards.length === 0) {
        throw new Error('No wards found. Please seed wards table first.');
    }
    
    // 2. 獲取所有 nodes（只取 id 和 coordinates）
    const { data: nodes } = await supabase
        .from('nodes')
        .select('id, coordinates, is_hub, parent_hub_id');
    
    let assigned = 0;
    let errors = 0;
    
    // 3. 對於每個節點，判斷其所屬行政區
    for (const node of nodes!) {
        try {
            // 解析座標
            const coordMatch = node.coordinates?.match(/POINT\(([^)]+)\)/);
            if (!coordMatch) continue;
            
            const [lng, lat] = coordMatch[1].split(' ').map(Number);
            const point = turf.point([lng, lat]);
            
            // 查找所屬行政區
            for (const ward of wards!) {
                if (turf.booleanPointInPolygon(point, ward.boundary)) {
                    // 只更新 ward_id，不觸碰其他欄位
                    const { error } = await supabase
                        .from('nodes')
                        .update({ ward_id: ward.id })
                        .eq('id', node.id);
                    
                    if (error) {
                        console.error(`Error assigning ${node.id}:`, error);
                        errors++;
                    } else {
                        console.log(`✓ ${node.id} → ${ward.name_i18n['zh-TW']}`);
                        assigned++;
                    }
                    break;
                }
            }
        } catch (e) {
            console.error(`Error processing node ${node.id}:`, e);
            errors++;
        }
    }
    
    console.log(`\n=== Assignment Complete ===`);
    console.log(`Assigned: ${assigned}`);
    console.log(`Errors: ${errors}`);
}

// 執行後，更新 wards 表的統計數據
async function updateWardStats() {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
    
    const { data: wards } = await supabase.from('wards').select('id');
    
    for (const ward of wards!) {
        // 統計節點數
        const { count: nodeCount } = await supabase
            .from('nodes')
            .select('*', { count: 'exact', head: true })
            .eq('ward_id', ward.id);
        
        // 統計 Hub 數（is_hub=true 且無 parent_hub_id）
        const { count: hubCount } = await supabase
            .from('nodes')
            .select('*', { count: 'exact', head: true })
            .eq('ward_id', ward.id)
            .eq('is_hub', true)
            .is('parent_hub_id', null);
        
        await supabase
            .from('wards')
            .update({ 
                node_count: nodeCount || 0,
                hub_count: hubCount || 0
            })
            .eq('id', ward.id);
    }
}
```

---

### Phase 2：API 端點實作

#### 2.1 `/api/wards` - 獲取行政區列表

```typescript
// src/app/api/wards/route.ts
interface WardResponse {
    wards: {
        id: string;
        name_i18n: { 'zh-TW': string; 'ja': string; 'en': string };
        prefecture: string;
        node_count: number;
        hub_count: number;
        center_point: { lat: number; lng: number };
        priority_order: number;
    }[];
    total: number;
}

export async function GET(req: Request) {
    const url = new URL(req.url);
    const includeStats = url.searchParams.get('include_stats') === '1';
    const onlyActive = url.searchParams.get('only_active') !== '0';
    
    let query = supabase.from('wards').select(`
        id,
        name_i18n,
        prefecture,
        center_point,
        priority_order,
        is_active
    `);
    
    if (onlyActive) {
        query = query.eq('is_active', true);
    }
    
    const { data: wards, error } = await query.order('priority_order');
    
    if (includeStats) {
        // 獲取每個行政區的節點統計
        const { data: stats } = await supabase
            .from('nodes')
            .select('ward_id, is_hub')
            .in('ward_id', wards?.map(w => w.id) || []);
        
        // 聚合統計
        const wardStats = new Map<string, { total: number; hubs: number }>();
        for (const stat of stats || []) {
            const current = wardStats.get(stat.ward_id) || { total: 0, hubs: 0 };
            current.total++;
            if (stat.is_hub) current.hubs++;
            wardStats.set(stat.ward_id, current);
        }
        
        // 合併到 wards 響應
        const response: WardResponse = {
            wards: wards?.map(w => ({
                ...w,
                node_count: wardStats.get(w.id)?.total || 0,
                hub_count: wardStats.get(w.id)?.hubs || 0,
                center_point: {
                    lat: w.center_point.coordinates[1],
                    lng: w.center_point.coordinates[0]
                }
            })) || [],
            total: wards?.length || 0
        };
        
        return NextResponse.json(response);
    }
    
    return NextResponse.json({ wards, total: wards?.length || 0 });
}
```

#### 2.2 `/api/wards/:wardId` - 獲取行政區詳情（整合 Hub 資訊）

```typescript
// src/app/api/wards/[wardId]/route.ts
interface WardDetailResponse {
    ward: {
        id: string;
        name_i18n: { 'zh-TW': string; 'ja': string; 'en': string };
        prefecture: string;
        ward_code: number;
        boundary: any; // GeoJSON
        center_point: { lat: number; lng: number };
    };
    // === Hub 資訊（整合現有 Hub 系統）===
    hubs: {
        id: string;
        name: { 'zh-TW': string; 'ja': string; 'en': string };
        coordinates: { lat: number; lng: number };
        member_count: number;  // 該 Hub 有多少子站點（來自 hub_members）
        transfer_type: string; // indoor/outdoor（來自 hub_metadata）
        child_nodes: string[]; // 子站點 ID 列表
    }[];
    // === 獨立站點（非 Hub）===
    standalone_nodes: {
        id: string;
        name: { 'zh-TW': string; 'ja': string; 'en': string };
        coordinates: { lat: number; lng: number };
    }[];
    stats: {
        total_nodes: number;
        total_hubs: number;
        total_child_nodes: number;
        total_standalone: number;
    };
}

export async function GET(
    req: Request,
    { params }: { params: { wardId: string } }
) {
    const { wardId } = params;
    
    // 1. 獲取 ward 詳情
    const { data: ward } = await supabase
        .from('wards')
        .select('*')
        .eq('id', wardId)
        .single();
    
    if (!ward) {
        return NextResponse.json({ error: 'Ward not found' }, { status: 404 });
    }
    
    // 2. 獲取該行政區的所有節點
    const { data: nodes } = await supabase
        .from('nodes')
        .select(`
            id, name, is_hub, parent_hub_id, coordinates,
            hub_metadata!inner(transfer_type)
        `)
        .eq('ward_id', wardId)
        .eq('is_active', true);
    
    // 3. 分離 Hub 和 Child（使用現有 Hub 邏輯）
    const hubs = nodes?.filter(n => n.is_hub && !n.parent_hub_id) || [];
    const childNodes = nodes?.filter(n => n.parent_hub_id) || [];
    const standaloneNodes = nodes?.filter(n => !n.is_hub && !n.parent_hub_id) || [];
    
    // 4. 為每個 Hub 獲取子站點詳情（從 hub_members 表）
    const hubDetails = await Promise.all(
        hubs.map(async (hub) => {
            // 從 hub_members 獲取子站點
            const { data: members } = await supabase
                .from('hub_members')
                .select('member_id')
                .eq('hub_id', hub.id);
            
            return {
                id: hub.id,
                name: hub.name,
                coordinates: {
                    lat: hub.coordinates?.coordinates?.[1] || 0,
                    lng: hub.coordinates?.coordinates?.[0] || 0
                },
                member_count: members?.length || 0,
                transfer_type: hub.hub_metadata?.transfer_type || 'indoor',
                child_nodes: members?.map(m => m.member_id) || []
            };
        })
    );
    
    return NextResponse.json({
        ward: {
            id: ward.id,
            name_i18n: ward.name_i18n,
            prefecture: ward.prefecture,
            ward_code: ward.ward_code,
            boundary: turf.feature(ward.boundary),
            center_point: {
                lat: ward.center_point.coordinates[1],
                lng: ward.center_point.coordinates[0]
            }
        },
        hubs: hubDetails,
        standalone_nodes: standaloneNodes.map(n => ({
            id: n.id,
            name: n.name,
            coordinates: {
                lat: n.coordinates?.coordinates?.[1] || 0,
                lng: n.coordinates?.coordinates?.[0] || 0
            }
        })),
        stats: {
            total_nodes: nodes?.length || 0,
            total_hubs: hubs.length,
            total_child_nodes: childNodes.length,
            total_standalone: standaloneNodes.length
        }
    });
}
```

#### 2.3 `/api/wards/detect` - 根據座標檢測所在行政區（使用 PostGIS 高效查詢）

```typescript
// src/app/api/wards/detect/route.ts

export async function GET(req: Request) {
    const url = new URL(req.url);
    const lat = parseFloat(url.searchParams.get('lat')!);
    const lng = parseFloat(url.searchParams.get('lng')!);
    
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
    }
    
    // 使用 PostGIS ST_Contains 高效空間查詢
    const { data: ward } = await supabase
        .rpc('find_ward_by_point', { lat, lng })
        .single();
    
    if (!ward) {
        return NextResponse.json({ 
            error: 'No ward found at this location',
            lat,
            lng
        }, { status: 404 });
    }
    
    return NextResponse.json({
        ward_id: ward.id,
        ward_name: ward.name_i18n,
        prefecture: ward.prefecture,
        distance_km: ward.distance_km, // 距離行政區中心的距離
        confidence: 'high'
    });
}
```

**PostGIS RPC 函數**（高效空間索引查詢）：

```sql
CREATE OR REPLACE FUNCTION find_ward_by_point(
    lat float,
    lng float
)
RETURNS TABLE (
    id text,
    name_i18n jsonb,
    prefecture text,
    distance_km float
) AS $
BEGIN
    RETURN QUERY
    SELECT 
        w.id, 
        w.name_i18n, 
        w.prefecture,
        ST_Distance(
            w.center_point,
            ST_SetSRID(ST_MakePoint(lng, lat), 4326)
        ) / 1000 as distance_km
    FROM wards w
    WHERE ST_Contains(w.boundary, ST_SetSRID(ST_MakePoint(lng, lat), 4326))
    ORDER BY distance_km ASC
    LIMIT 1;
END;
$ LANGUAGE plpgsql;

-- 關鍵：空間索引
CREATE INDEX IF NOT EXISTS idx_wards_boundary_geom ON wards USING GIST(boundary);
```

---

### Phase 3：前端實作

#### 3.1 Ward Store（Zustand）

```typescript
// src/stores/wardStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WardState {
    // 當前選中的行政區
    currentWardId: string | null;
    setCurrentWard: (wardId: string | null) => void;
    
    // 已加載的行政區數據
    loadedWards: Map<string, WardData>;
    loadWardData: (wardId: string) => Promise<void>;
    clearWardCache: () => void;
    
    // 數據過濾選項
    showHubsOnly: boolean;
    showLabels: boolean;
    toggleHubsOnly: () => void;
    toggleLabels: () => void;
}

interface WardData {
    ward: {
        id: string;
        name_i18n: { 'zh-TW': string; 'ja': string; 'en': string };
    };
    // === Hub 數據（整合現有 Hub 系統）===
    hubs: HubData[];      // Hub 列表（含子站點資訊）
    standalone_nodes: NodeData[]; // 獨立站點（非 Hub）
    loadedAt: number; // 用於快取過期判斷
}

interface HubData {
    id: string;
    name: { 'zh-TW': string; 'ja': string; 'en': string };
    coordinates: { lat: number; lng: number };
    member_count: number;  // 從 hub_members 獲取
    transfer_type: string; // 從 hub_metadata 獲取
    child_nodes: string[]; // 子站點 ID 列表
}

interface NodeData {
    id: string;
    name: { 'zh-TW': string; 'ja': string; 'en': string };
    coordinates: { lat: number; lng: number };
}

export const useWardStore = create<WardState>()(
    persist(
        (set, get) => ({
            currentWardId: null,
            setCurrentWard: (wardId) => set({ currentWardId: wardId }),
            
            loadedWards: new Map(),
            loadWardData: async (wardId) => {
                const { loadedWards } = get();
                
                // 檢查快取是否有效（24小時）
                const cached = loadedWards.get(wardId);
                if (cached && Date.now() - cached.loadedAt < 24 * 60 * 60 * 1000) {
                    return;
                }
                
                // 獲取新數據
                const response = await fetch(`/api/wards/${wardId}`);
                const data = await response.json();
                
                const newWardData: WardData = {
                    ward: data.ward,
                    standalone_nodes: data.standalone_nodes,
                    hubs: data.hubs,
                    loadedAt: Date.now()
                };
                
                set({
                    loadedWards: new Map(loadedWards).set(wardId, newWardData)
                });
            },
            clearWardCache: () => set({ loadedWards: new Map() }),
            
            showHubsOnly: false,
            showLabels: true,
            toggleHubsOnly: () => set((state) => ({ showHubsOnly: !state.showHubsOnly })),
            toggleLabels: () => set((state) => ({ showLabels: !state.showLabels }))
        }),
        {
            name: 'ward-storage',
            partialize: (state) => ({
                showHubsOnly: state.showHubsOnly,
                showLabels: state.showLabels
            })
        }
    )
);
```

#### 3.2 WardDetector 組件

```tsx
// src/components/map/WardDetector.tsx
'use client';

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import { useWardStore } from '@/stores/wardStore';
import L from 'leaflet';

export function WardDetector() {
    const map = useMap();
    const { currentWardId, setCurrentWard, loadWardData } = useWardStore();
    
    useEffect(() => {
        const handleMoveEnd = async () => {
            const center = map.getCenter();
            
            // 檢測當前所在的行政區
            const response = await fetch(
                `/api/wards/detect?lat=${center.lat}&lng=${center.lng}`
            );
            
            if (response.ok) {
                const data = await response.json();
                const detectedWardId = data.ward_id;
                
                if (detectedWardId !== currentWardId) {
                    setCurrentWard(detectedWardId);
                    await loadWardData(detectedWardId);
                }
            }
        };
        
        // 防抖處理
        let timeout: NodeJS.Timeout;
        const debouncedHandler = () => {
            clearTimeout(timeout);
            timeout = setTimeout(handleMoveEnd, 500);
        };
        
        map.on('moveend', debouncedHandler);
        
        // 初始檢測
        handleMoveEnd();
        
        return () => {
            map.off('moveend', debouncedHandler);
            clearTimeout(timeout);
        };
    }, [map, currentWardId, setCurrentWard, loadWardData]);
    
    return null;
}
```

#### 3.3 WardNodeLayer 組件（整合現有 NodeMarker）

```tsx
// src/components/map/WardNodeLayer.tsx
'use client';

import { useMemo } from 'react';
import { useWardStore } from '@/stores/wardStore';
import { NodeMarker } from './NodeMarker';
import { useMap } from 'react-leaflet';
import { GeoJSON } from 'react-leaflet';

interface NodeItem {
    id: string;
    name: { 'zh-TW': string; 'ja': string; 'en': string };
    coordinates: { lat: number; lng: number };
    is_hub?: boolean;
    parent_hub_id?: string | null;
}

export function WardNodeLayer() {
    const map = useMap();
    const { loadedWards, currentWardId, showHubsOnly, showLabels } = useWardStore();
    
    // 獲取當前行政區的數據
    const currentWardData = currentWardId ? loadedWards.get(currentWardId) : null;
    
    // 計算可見節點（整合 Hub 和獨立站點）
    const visibleNodes = useMemo(() => {
        if (!currentWardData) return [];
        
        const nodes: NodeItem[] = [];
        
        // 添加所有 Hub
        for (const hub of currentWardData.hubs) {
            nodes.push({
                id: hub.id,
                name: hub.name,
                coordinates: hub.coordinates,
                is_hub: true,
                parent_hub_id: null
            });
            
            // 如果不是 showHubsOnly，添加子站點
            if (!showHubsOnly && hub.child_nodes.length > 0) {
                // 子站點需要從額外數據源獲取名稱和座標
                // 實際實現時可從 /api/wards/:wardId 返回的數據中獲取
            }
        }
        
        // 添加獨立站點（非 Hub）
        if (!showHubsOnly) {
            for (const node of currentWardData.standalone_nodes) {
                nodes.push({
                    id: node.id,
                    name: node.name,
                    coordinates: node.coordinates,
                    is_hub: false,
                    parent_hub_id: null
                });
            }
        }
        
        return nodes;
    }, [currentWardData, showHubsOnly]);
    
    // 計算可見邊界
    const wardBoundary = useMemo(() => {
        if (!currentWardData) return null;
        // 從 ward.boundary 獲取（API 返回）
        return null;
    }, [currentWardData]);
    
    if (!currentWardData) return null;
    
    return (
        <>
            {/* 行政區邊界疊加層（可選） */}
            {wardBoundary && (
                <GeoJSON
                    data={wardBoundary}
                    style={{
                        fillColor: '#4F46E5',
                        fillOpacity: 0.05,
                        color: '#4F46E5',
                        weight: 2,
                        dashArray: '5, 5'
                    }}
                />
            )}
            
            {/* 節點標記（使用現有的 NodeMarker，它已支援 Hub 顯示） */}
            {visibleNodes.map((node) => (
                <NodeMarker
                    key={node.id}
                    node={{
                        id: node.id,
                        name: node.name,
                        location: { coordinates: [node.coordinates.lng, node.coordinates.lat] },
                        type: 'station',
                        is_hub: node.is_hub ?? false,
                        parent_hub_id: node.parent_hub_id ?? null,
                        tier: node.is_hub ? 'major' : 'minor'
                    }}
                    zone="core"
                    zoom={map.getZoom()}
                    locale="zh-TW"
                    // 傳入 Hub 詳情（如果有的話，NodeMarker 會顯示 Badge 和 🔗 符號）
                    hubDetails={currentWardData.hubs.find(h => h.id === node.id)}
                />
            ))}
        </>
    );
}
```

#### 3.4 與現有 NodeMarker 整合說明

現有的 [`NodeMarker`](src/components/map/NodeMarker.tsx) 組件已經完整支援 Hub 顯示邏輯：

| 功能 | NodeMarker 支援 | Ward 系統需提供 |
|------|-----------------|-----------------|
| Hub 標記（Train icon） | ✅ `is_hub` 判斷 | 傳入 `is_hub: true` |
| 子站點數量 Badge | ✅ `hubDetails?.member_count` | 從 `/api/wards/:wardId` 的 `hubs[].member_count` 獲取 |
| 換乘類型指示器 | ✅ `hubDetails?.transfer_type` | 從 `hubs[].transfer_type` 獲取 |
| Crown 圖示 | ✅ `tier === 'major'` | Hub 設為 `tier: 'major'` |

**Ward 系統只需**：
1. 正確傳入 `is_hub` 和 `parent_hub_id` 屬性
2. 從 `/api/wards/:wardId` 獲取 `hubs` 陣列，找到對應 Hub 的 `hubDetails`
3. `NodeMarker` 會自動處理所有顯示邏輯

---

### Phase 4：舊系統隔離

#### 4.1 封存舊系統組件

```
src/components/map/
├── ViewportNodeLoader.tsx     → 移至 src/legacy/map/
├── ViewportTracker.tsx        → 移至 src/legacy/map/
└── LegacyNodeLayer.tsx        → 移至 src/legacy/map/

src/app/api/nodes/viewport/
└── route.ts                   → 移至 src/legacy/api/
```

#### 4.2 數據隔離

```sql
-- 標記舊系統數據為已封存
ALTER TABLE nodes ADD COLUMN IF NOT EXISTS legacy_data boolean DEFAULT false;

-- 遷移完成後，標記所有數據
UPDATE nodes SET legacy_data = true WHERE is_active = true;
```

#### 4.3 重定向策略

```typescript
// src/app/api/nodes/viewport/route.ts
export async function GET(req: Request) {
    // 新系統已啟用時，返回錯誤引導
    return NextResponse.json({
        error: 'DEPRECATED',
        message: 'Viewport API 已廢棄，請使用 /api/wards 端點',
        documentation: 'https://docs.lutagu.tokyo/wards-guide'
    }, { status: 410 }); // 410 Gone
}
```

---

## 4. 驗收標準

### 功能驗收
- [ ] `/api/wards` 正確返回 23 區列表
- [ ] `/api/wards/:wardId` 正確返回行政區詳情和節點
- [ ] `/api/wards/detect` 根據座標正確識別行政區
- [ ] WardDetector 組件正確檢測並載入數據
- [ ] WardNodeLayer 正確渲染節點和邊界

### 效能驗證
- [ ] 日均 API 調用減少至 5-10 次
- [ ] 地圖拖動響應 < 50ms
- [ ] 快取命中率達到 90% 以上

### 相容性驗證
- [ ] 舊系統 API 正確返回 410 Gone
- [ ] 現有功能不受影響
- [ ] 數據遷移正確完成

---

## 5. 時間線預估

```
Week 1: Phase 1 - 資料庫基礎設施
├── Day 1-2: 建立 wards 表和遷移腳本
├── Day 3-4: 獲取國土地理院邊界數據
└── Day 5: 節點 ward_id 分配腳本

Week 2: Phase 2 - API 端點
├── Day 1-2: /api/wards 和 /api/wards/:wardId
├── Day 3: /api/wards/detect
└── Day 4-5: 測試和優化

Week 3: Phase 3 - 前端實作
├── Day 1-2: wardStore 和 WardDetector
├── Day 3-4: WardNodeLayer
└── Day 5: 整合測試

Week 4: Phase 4 - 舊系統隔離和發布
├── Day 1-2: 封存舊系統
├── Day 3: 用戶驗收測試
└── Day 4-5: 發布和監控
```

---

## 6. 風險評估

| 風險 | 可能性 | 影響 | 緩解措施 |
|------|--------|------|----------|
| 國土地理院數據格式複雜 | 中 | 高 | 預留數據處理時間 |
| 邊界重疊區域節點分配 | 中 | 中 | 優先順序規則 |
| 快取記憶體佔用過高 | 低 | 中 | LRU 策略 |
| 舊系統數據遷移失敗 | 低 | 高 | 預備回滾計畫 |

---

## 7. 參考資料

- 日本國土地理院：https://www.gsi.go.jp/
- GeoJSON 規範：https://datatracker.ietf.org/doc/html/rfc7946
- Turf.js：https://turfjs.org/
