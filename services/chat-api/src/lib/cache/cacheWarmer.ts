/**
 * 快取預熱服務
 * 負責熱門站點資料的預先載入與週期性更新
 */

import { CacheService, getCache, CacheConfig } from './cacheService';
import { CacheKeyBuilder, hashStationIds } from './cacheKeyBuilder';
import { LAYER_CACHE_CONFIG } from './cacheService';

interface StationHotness {
    stationId: string;
    accessCount: number;
    lastAccessed: number;
    avgResponseTime: number;
}

interface WarmupConfig {
    /** 熱門站點數量 */
    hotStationCount: number;
    /** 預熱閾值 (訪問次數) */
    warmupThreshold: number;
    /** 預熱間隔 (毫秒) */
    warmupIntervalMs: number;
    /** 並發預熱數量 */
    concurrentWarmup: number;
}

interface CacheWarmerStats {
    totalWarmups: number;
    successfulWarmups: number;
    failedWarmups: number;
    lastWarmupTime: number;
    hotStationsCount: number;
}

const DEFAULT_WARMUP_CONFIG: WarmupConfig = {
    hotStationCount: 20,
    warmupThreshold: 50,
    warmupIntervalMs: 5 * 60 * 1000, // 5 分鐘
    concurrentWarmup: 5
};

export class CacheWarmer {
    private config: WarmupConfig;
    private hotStations: Map<string, StationHotness> = new Map();
    private warmupTimer?: NodeJS.Timeout;
    private stats: CacheWarmerStats = {
        totalWarmups: 0,
        successfulWarmups: 0,
        failedWarmups: 0,
        lastWarmupTime: 0,
        hotStationsCount: 0
    };
    private dataLoader: (stationId: string) => Promise<any>;
    private isWarming: boolean = false;

    constructor(dataLoader: (stationId: string) => Promise<any>, config?: Partial<WarmupConfig>) {
        this.dataLoader = dataLoader;
        this.config = { ...DEFAULT_WARMUP_CONFIG, ...config };
    }

    /**
     * 記錄站點訪問
     */
    recordAccess(stationId: string, responseTime?: number): void {
        const existing = this.hotStations.get(stationId);
        if (existing) {
            existing.accessCount++;
            existing.lastAccessed = Date.now();
            if (responseTime !== undefined) {
                existing.avgResponseTime = (existing.avgResponseTime + responseTime) / 2;
            }
        } else {
            this.hotStations.set(stationId, {
                stationId,
                accessCount: 1,
                lastAccessed: Date.now(),
                avgResponseTime: responseTime || 0
            });
        }
    }

    /**
     * 獲取熱門站點列表
     */
    getHotStations(): StationHotness[] {
        return Array.from(this.hotStations.values())
            .sort((a, b) => b.accessCount - a.accessCount)
            .slice(0, this.config.hotStationCount);
    }

    /**
     * 執行預熱
     */
    async warmup(cache?: CacheService<any>): Promise<void> {
        if (this.isWarming) {
            console.log('[CacheWarmer] 預熱任務已在執行中，跳過');
            return;
        }

        this.isWarming = true;
        const cacheInstance = cache || getCache('l1_places');
        const hotStations = this.getHotStations();
        
        console.log(`[CacheWarmer] 開始預熱 ${hotStations.length} 個熱門站點`);

        for (const station of hotStations) {
            const key = CacheKeyBuilder.forStation(station.stationId);
            
            if (!cacheInstance.has(key)) {
                try {
                    const data = await this.dataLoader(station.stationId);
                    cacheInstance.set(
                        key, 
                        data, 
                        LAYER_CACHE_CONFIG.L1.ttlMs,
                        'hot'
                    );
                    this.stats.successfulWarmups++;
                    console.log(`[CacheWarmer] 預熱成功: ${station.stationId}`);
                } catch (error) {
                    this.stats.failedWarmups++;
                    console.error(`[CacheWarmer] 預熱失敗: ${station.stationId}`, error);
                }
                this.stats.totalWarmups++;
            }
        }

        this.stats.lastWarmupTime = Date.now();
        this.stats.hotStationsCount = hotStations.length;
        this.isWarming = false;

        console.log(`[CacheWarmer] 預熱完成: 成功 ${this.stats.successfulWarmups}, 失敗 ${this.stats.failedWarmups}`);
    }

    /**
     * 週期性預熱 (後台任務)
     */
    startPeriodicWarmup(cache?: CacheService<any>): void {
        if (this.warmupTimer) {
            console.log('[CacheWarmer] 週期性預熱已在執行中');
            return;
        }

        // 立即執行一次預熱
        this.warmup(cache).catch(console.error);

        // 設定週期性預熱
        this.warmupTimer = setInterval(() => {
            this.warmup(cache).catch(console.error);
        }, this.config.warmupIntervalMs);

        console.log(`[CacheWarmer] 週期性預熱已啟動，間隔: ${this.config.warmupIntervalMs}ms`);
    }

    /**
     * 停止週期性預熱
     */
    stopPeriodicWarmup(): void {
        if (this.warmupTimer) {
            clearInterval(this.warmupTimer);
            this.warmupTimer = undefined;
            console.log('[CacheWarmer] 週期性預熱已停止');
        }
    }

    /**
     * 獲取預熱統計
     */
    getStats(): CacheWarmerStats {
        return { 
            ...this.stats,
            hotStationsCount: this.hotStations.size
        };
    }

    /**
     * 清除熱門站點追蹤
     */
    reset(): void {
        this.hotStations.clear();
        this.stats = {
            totalWarmups: 0,
            successfulWarmups: 0,
            failedWarmups: 0,
            lastWarmupTime: 0,
            hotStationsCount: 0
        };
    }

    /**
     * 銷毀
     */
    destroy(): void {
        this.stopPeriodicWarmup();
        this.reset();
    }
}

/**
 * 預熱管理器 (單例)
 */
let warmerInstance: CacheWarmer | null = null;

export function getCacheWarmer(
    dataLoader: (stationId: string) => Promise<any>,
    config?: Partial<WarmupConfig>
): CacheWarmer {
    if (!warmerInstance) {
        warmerInstance = new CacheWarmer(dataLoader, config);
    }
    return warmerInstance;
}

export function destroyCacheWarmer(): void {
    if (warmerInstance) {
        warmerInstance.destroy();
        warmerInstance = null;
    }
}

export function getWarmerStats(): CacheWarmerStats | null {
    return warmerInstance ? warmerInstance.getStats() : null;
}
