# LUTAGU(ルタグ) 快取命中率優化策略

**制定日期**: 2026-01-06  
**目標**: 平均快取命中率 ≥ 95%，最低快取命中率 ≥ 90%  
**版本**: v1.0

---

## 1. 現有架構分析

### 1.1 現有快取配置

| 參數 | 當前值 | 問題診斷 |
|-----|--------|---------|
| 最大快取項目 | 500 | 可能不足，熱門站點可能競爭 |
| TTL 過期時間 | 5 分鐘 | 過長導致資料過時風險 |
| LRU 淘汰比例 | 10% | 每次淘汰 50 個項目，可能過度淘汰 |
| 清理間隔 | 1 分鐘 | 可能造成效能開銷 |

### 1.2 現有架構效能瓶頸

| 瓶頸 | 嚴重程度 | 說明 |
|-----|---------|------|
| hitRate 計算錯誤 | 🔴 高 | `getStats()` 使用 `cache.size / maxAccessCount` 邏輯錯誤 |
| 無熱點預熱 | 🟡 中 | 首次訪問總是快取未命中 |
| 無分層快取 | 🟡 中 | 所有資料使用相同 TTL |
| 無監控機制 | 🟡 中 | 無法追蹤個別快取鍵命中率 |
| 長尾效應 | 🟢 低 | 冷門站點資料可能浪費快取空間 |

---

## 2. 快取資料存取模式分析

### 2.1 L1 景點資料特性

```
熱點分布 (Power Law):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
站點存取頻率
    ↑
    │  ██                                    熱門站點 (20%)
    │  ████                                  頻繁存取 (30%)
    │  ██████
    │  ████████
    │  ██████████                            一般站點 (30%)
    │  ████████████
    │  ██████████████
    │  ████████████████
    └──────────────────────────────────────────────→ 站點數量
           10%      50%      90%      100%
```

### 2.2 快取鍵分布預估

| 快取鍵類型 | 預估比例 | 存取頻率 |
|-----------|---------|---------|
| 主要大型站點 | 20% | 高頻 |
| 中型站點 | 50% | 中頻 |
| 小型/冷門站點 | 30% | 低頻 |

---

## 3. 優化策略

### 3.1 策略一：修正快取命中率計算

**檔案**: `src/lib/cache/cacheService.ts`

```typescript
// 修正後的 getStats 方法
getStats(): { size: number; maxSize: number; hitRate: number; hitCount: number; missCount: number } {
    return {
        size: this.cache.size,
        maxSize: this.config.maxSize,
        hitCount: this.hitCount,
        missCount: this.missCount,
        hitRate: this.hitCount + this.missCount > 0 
            ? (this.hitCount / (this.hitCount + this.missCount)) * 100 
            : 0
    };
}
```

**新增計數器**:
```typescript
private hitCount: number = 0;
private missCount: number = 0;

get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
        this.missCount++;  // 新增
        return null;
    }

    if (Date.now() > entry.expiresAt) {
        this.missCount++;  // 新增
        this.delete(key);
        return null;
    }

    this.hitCount++;  // 新增
    // ... 其餘邏輯不變
}
```

### 3.2 策略二：分層 TTL 策略

```typescript
// L1 景點快取配置 - 分層 TTL
export const L1_CACHE_CONFIG = {
    // 熱門站點 (主要大型轉運站)
    hot: {
        maxSize: 200,
        ttlMs: 10 * 60 * 1000,  // 10 分鐘
        evictionRatio: 0.05      // 每次只淘汰 5%
    },
    // 一般站點
    normal: {
        maxSize: 300,
        ttlMs: 5 * 60 * 1000,   // 5 分鐘
        evictionRatio: 0.1       // 10%
    },
    // 冷門站點
    cold: {
        maxSize: 100,
        ttlMs: 2 * 60 * 1000,   // 2 分鐘
        evictionRatio: 0.2       // 20%
    }
};
```

### 3.3 策略三：熱點資料預熱

```typescript
// src/lib/cache/cacheWarmer.ts

interface StationHotness {
    stationId: string;
    accessCount: number;
    lastAccessed: number;
}

class CacheWarmer {
    private hotStations: Map<string, StationHotness> = new Map();
    private readonly HOT_THRESHOLD = 100; // 訪問次數閾值

    /**
     * 記錄站點訪問
     */
    recordAccess(stationId: string): void {
        const existing = this.hotStations.get(stationId);
        if (existing) {
            existing.accessCount++;
            existing.lastAccessed = Date.now();
        } else {
            this.hotStations.set(stationId, {
                stationId,
                accessCount: 1,
                lastAccessed: Date.now()
            });
        }
    }

    /**
     * 識別熱門站點並進行預熱
     */
    async warmupHotStations(cache: CacheService<any>, dataLoader: (id: string) => Promise<any>): Promise<void> {
        const hotStationIds = Array.from(this.hotStations.entries())
            .filter(([_, data]) => data.accessCount >= this.HOT_THRESHOLD)
            .sort((a, b) => b[1].accessCount - a[1].accessCount)
            .slice(0, 20)  // 預熱前 20 個熱門站點
            .map(([id]) => id);

        for (const stationId of hotStationIds) {
            if (!cache.has(CacheKeyBuilder.forStation(stationId))) {
                const data = await dataLoader(stationId);
                cache.set(
                    CacheKeyBuilder.forStation(stationId), 
                    data,
                    L1_CACHE_CONFIG.hot.ttlMs
                );
            }
        }
    }
}
```

### 3.4 策略四：快取鍵生成優化

```typescript
// src/lib/cache/cacheKeyBuilder.ts

export class CacheKeyBuilder {
    // ... 現有程式碼 ...

    /**
     * 生成 L1 景點快取鍵 (優化版本)
     */
    static forL1PlacesOptimized(stationIds: string[], options: {
        category?: string;
        includeCustom?: boolean;
        locale?: string;
        sortBy?: 'distance' | 'priority' | 'name';
        sortOrder?: 'asc' | 'desc';
    }): string {
        const parts: string[] = ['l1', 'places'];
        
        // 站台 ID 排序後雜湊
        const sortedStations = [...stationIds].sort().join(',');
        parts.push(hashString(sortedStations));
        
        // 標準化選項參數
        if (options.category) parts.push(`cat:${options.category}`);
        if (options.includeCustom !== undefined) parts.push(`custom:${options.includeCustom}`);
        if (options.locale) parts.push(`locale:${options.locale}`);
        if (options.sortBy) parts.push(`sort:${options.sortBy}:${options.sortOrder || 'asc'}`);
        
        return parts.join(':');
    }
}
```

---

## 4. 預估效能指標

### 4.1 優化前後對比

| 指標 | 優化前 | 優化後 | 改善幅度 |
|-----|--------|--------|---------|
| 平均快取命中率 | 85% | 95% | +10% |
| 最低快取命中率 | 不穩定 | 90% | 顯著提升 |
| 快取讀取延遲 | < 1ms | < 0.5ms | -50% |
| 快取設定延遲 | < 5ms | < 3ms | -40% |
| 記憶體使用 | ~20MB | ~30MB | +50% |

### 4.2 各類站點命中率預估

| 站點類型 | 優化前 | 優化後 |
|---------|--------|--------|
| 熱門大型站點 | 90% | 98% |
| 中型站點 | 80% | 95% |
| 冷門小型站點 | 70% | 90% |

---

## 5. 驗證方法

### 5.1 監控指標

```typescript
// 快取監控儀表板
interface CacheMetrics {
    // 基礎指標
    hitRate: number;           // 快取命中率
    hitCount: number;          // 命中次數
    missCount: number;         // 未命中次數
    cacheSize: number;         // 目前快取大小
    memoryUsage: number;       // 記憶體使用量
    
    // 進階指標
    avgAccessTime: number;     // 平均存取時間
    evictionRate: number;      // 淘汰率
    expiredRate: number;       // 過期率
}

// 監控腳本
async function monitorCacheMetrics() {
    const l1Cache = getCache('l1_places');
    const stats = l1Cache.getStats();
    
    console.log(`
    === 快取監控報告 ===
    命中率: ${stats.hitRate.toFixed(2)}%
    命中次數: ${stats.hitCount}
    未命中次數: ${stats.missCount}
    目前大小: ${stats.size}/${stats.maxSize}
    ===================
    `);
}
```

### 5.2 測試案例

```typescript
// cache.test.ts

describe('Cache Optimization', () => {
    it('should achieve 95%+ hit rate for hot stations', async () => {
        const cache = new CacheService<any>(L1_CACHE_CONFIG.hot);
        
        // 模擬熱門站點訪問模式
        const hotStations = ['tokyo:main', 'shibuya', 'shinjuku'];
        for (let i = 0; i < 100; i++) {
            for (const station of hotStations) {
                const key = CacheKeyBuilder.forStation(station);
                cache.get(key);  // 模擬存取
                if (i % 10 === 0) {
                    cache.set(key, { data: 'test' });  // 模擬資料載入
                }
            }
        }
        
        const stats = cache.getStats();
        expect(stats.hitRate).toBeGreaterThanOrEqual(95);
    });

    it('should maintain 90%+ hit rate for all stations', async () => {
        const cache = new CacheService<any>(L1_CACHE_CONFIG.normal);
        
        // 模擬所有站點訪問模式
        const allStations = generateStationIds(100);
        for (let i = 0; i < 1000; i++) {
            const station = allStations[Math.floor(Math.random() * allStations.length)];
            const key = CacheKeyBuilder.forStation(station);
            cache.get(key);
            if (Math.random() > 0.8) {
                cache.set(key, { data: 'test' });
            }
        }
        
        const stats = cache.getStats();
        expect(stats.hitRate).toBeGreaterThanOrEqual(90);
    });
});
```

---

## 6. 實作優先順序

| 優先級 | 任務 | 預期效益 | 工作量 |
|-------|------|---------|--------|
| P0 | 修正 hitRate 計算 | 正確監控 | 0.5 天 |
| P0 | 實作分層 TTL | +5% 命中率 | 1 天 |
| P1 | 實作熱點預熱 | +3% 命中率 | 2 天 |
| P1 | 優化快取鍵生成 | +2% 命中率 | 0.5 天 |
| P2 | 建立監控儀表板 | 追蹤成效 | 1 天 |

---

## 7. 風險評估與緩解

| 風險 | 機率 | 影響 | 緩解措施 |
|-----|------|------|---------|
| 記憶體使用過高 | 低 | 中 | 設定 maxSize 上限 |
| 預熱延遲啟動 | 中 | 低 | 非同步預熱 |
| TTL 過長導致資料過時 | 中 | 高 | 設定較短 TTL |
| 快取鍵不一致 | 低 | 高 | 單元測試覆蓋 |

---

## 8. 結論

透過以下優化措施，預期可達成目標：

1. **修正快取命中率計算** - 確保監控數據準確
2. **分層 TTL 策略** - 熱門資料保留更久
3. **熱點資料預熱** - 減少首次訪問未命中
4. **快取鍵生成優化** - 提升快取一致性

**預期成果**:
- 平均快取命中率: ≥ 95%
- 最低快取命中率: ≥ 90%
- API 回應延遲: 降低 30-50%
