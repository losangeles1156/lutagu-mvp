# station_wisdom Lazy Loading 實作計劃

## 📋 背景分析

### 當前問題
- **檔案**: `src/data/station_wisdom_generated.ts`
- **大小**: 2377 行，約 50KB+ 的靜態資料
- **載入時機**: 在 `stationWisdom.ts` 中靜態 import
- **問題**: 即使使用者只查看一個車站，也會載入全部知識庫資料

---

## 🎯 實作目標

1. **減少初始載入時間**: 從載入 50KB+ 降至按需載入
2. **降低記憶體使用**: 只保留目前需要的知識
3. **改善使用者體驗**: 加快首屏渲染速度

---

## 📐 架構設計

### 方案一：動態 import (推薦)

```
src/
├── data/
│   ├── station_wisdom_generated.ts  # 保持原樣
│   └── stationWisdom.ts             # 修改為動態載入
```

**修改 `stationWisdom.ts`**:
```typescript
// 改為動態載入
const STATION_WISDOM_CACHE = new Map<string, Promise<any>>();

export async function getStationWisdom(stationId: string) {
    if (STATION_WISDOM_CACHE.has(stationId)) {
        return STATION_WISDOM_CACHE.get(stationId);
    }

    const loadPromise = loadWisdomForStation(stationId);
    STATION_WISDOM_CACHE.set(stationId, loadPromise);
    return loadPromise;
}

async function loadWisdomForStation(stationId: string) {
    const module = await import('./station_wisdom_generated');
    const allWisdom = module.GENERATED_KNOWLEDGE;

    // 過濾只返回相關的知識
    return allWisdom.filter((item: any) => {
        const stationIds = item.trigger?.station_ids || [];
        return stationIds.includes(stationId);
    });
}
```

### 方案二：拆分資料檔案

```
src/
├── data/
│   ├── station_wisdom/
│   │   ├── tokyo.ts        # 東京車站相關
│   │   ├── ueno.ts         # 上野車站相關
│   │   ├── asakusa.ts      # 淺草車站相關
│   │   └── ...
│   ├── index.ts            # 統一匯出
│   └── stationWisdom.ts    # 動態載入邏輯
```

---

## 🛠️ 實作步驟

### Step 1: 修改 stationWisdom.ts

```typescript
// src/data/stationWisdom.ts

import { getStationIdFromNode } from '@/lib/utils/stationUtils';

// 緩存已載入的知識
const wisdomCache = new Map<string, any[]>();
const LOADING_PROMISES = new Map<string, Promise<any[]>>();

export async function getStationWisdom(nodeId: string): Promise<any[]> {
    // 檢查緩存
    if (wisdomCache.has(nodeId)) {
        return wisdomCache.get(nodeId)!;
    }

    // 檢查是否正在載入
    if (LOADING_PROMISES.has(nodeId)) {
        return LOADING_PROMISES.get(nodeId)!;
    }

    // 開始載入
    const loadPromise = loadStationWisdom(nodeId);
    LOADING_PROMISES.set(nodeId, loadPromise);

    try {
        const wisdom = await loadPromise;
        wisdomCache.set(nodeId, wisdom);
        return wisdom;
    } finally {
        LOADING_PROMISES.delete(nodeId);
    }
}

async function loadStationWisdom(nodeId: string): Promise<any[]> {
    // 動態載入完整知識庫
    const module = await import('./station_wisdom_generated');
    const allWisdom = module.GENERATED_KNOWLEDGE;

    // 根據車站 ID 過濾相關知識
    return filterWisdomForStation(allWisdom, nodeId);
}

function filterWisdomForStation(wisdom: any[], nodeId: string): any[] {
    const stationId = getStationIdFromNode(nodeId);

    return wisdom.filter(item => {
        // 檢查 station_ids
        if (item.trigger?.station_ids?.includes(stationId)) {
            return true;
        }
        // 檢查 station_names_hint
        const nameHints = item.trigger?.station_names_hint || [];
        const nodeName = stationId.split('.').pop()?.toLowerCase();
        return nameHints.some((hint: string) =>
            nodeName?.includes(hint.toLowerCase())
        );
    });
}

// 預載入熱門車站知識
export function preloadPopularStations() {
    const popularStations = [
        'odpt.Station:JR-East.Tokyo',
        'odpt.Station:JR-East.Ueno',
        'odpt.Station:TokyoMetro.Asakusa',
        // ... 其他熱門車站
    ];

    popularStations.forEach(id => {
        getStationWisdom(id).catch(console.error);
    });
}
```

### Step 2: 在 L4 組件中使用

```typescript
// src/components/node/L4_Dashboard.tsx

import { getStationWisdom } from '@/data/stationWisdom';
import { useEffect, useState } from 'react';

export function L4_Dashboard({ currentNodeId }: { currentNodeId: string }) {
    const [wisdom, setWisdom] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        getStationWisdom(currentNodeId)
            .then(data => {
                if (isMounted) {
                    setWisdom(data);
                    setLoading(false);
                }
            })
            .catch(error => {
                console.error('Failed to load station wisdom:', error);
                if (isMounted) setLoading(false);
            });

        return () => { isMounted = false; };
    }, [currentNodeId]);

    if (loading) return <div>載入中...</div>;
    if (wisdom.length === 0) return null;

    return (
        <div>
            {wisdom.map(item => (
                <HackCard key={item.id} data={item} />
            ))}
        </div>
    );
}
```

---

## 📊 預期效益

| 指標 | 優化前 | 優化後 | 改善幅度 |
|------|--------|--------|----------|
| 初始載入 | 50KB+ | ~5KB | 90%↓ |
| 首次繪製 | 500ms | 200ms | 60%↓ |
| 記憶體使用 | 固定 50MB | 按需分配 | 50%↓ |

---

## ⏱️ 實作工時估算

| 工作項目 | 工時 |
|----------|------|
| 修改 stationWisdom.ts | 2 小時 |
| 更新 L4 組件 | 1 小時 |
| 測試驗證 | 2 小時 |
| 總計 | **5 小時** |

---

## 🔧 依賴與風險

### 依賴
- `next-intl` 動態 import 支援
- React Suspense 機制

### 風險
- 首次載入可能變慢（需要網路請求）
- 需要處理載入狀態和錯誤
- 緩存策略需要優化

---

## ✅ 驗收標準

- [ ] 初始 bundle size 減少 50% 以上
- [ ] 熱門車站知識載入時間 < 200ms
- [ ] 無載入時的閃爍問題
- [ ] 錯誤邊界正確處理
