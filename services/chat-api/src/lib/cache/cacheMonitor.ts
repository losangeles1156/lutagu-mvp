/**
 * 快取效能監控儀表板
 * 提供快取命中率、存取延遲、記憶體使用量等關鍵指標的即時監控
 */

import { CacheService, getCache, getAllCacheStats, CacheStats } from './cacheService';
import { CacheWarmer, getCacheWarmer } from './cacheWarmer';

export interface MonitorConfig {
    /** 監控間隔 (毫秒) */
    monitorIntervalMs: number;
    /** 命中率警告閾值 (%) */
    hitRateWarningThreshold: number;
    /** 命中率危急閾值 (%) */
    hitRateCriticalThreshold: number;
    /** 記憶體使用警告閾值 (MB) */
    memoryWarningThreshold: number;
    /** 是否啟用 Alert 機制 */
    enableAlerts: boolean;
}

export interface MonitorMetrics {
    timestamp: number;
    caches: Record<string, CacheStats>;
    warmer: {
        totalWarmups: number;
        successfulWarmups: number;
        failedWarmups: number;
        hotStationsCount: number;
    };
    system: {
        totalHitRate: number;
        totalMemoryUsage: number;
        totalEntries: number;
    };
    alerts: Alert[];
}

export interface Alert {
    type: 'warning' | 'critical' | 'info';
    message: string;
    timestamp: number;
    metric: string;
    value: number;
    threshold: number;
}

const DEFAULT_MONITOR_CONFIG: MonitorConfig = {
    monitorIntervalMs: 60000, // 1 分鐘
    hitRateWarningThreshold: 90,
    hitRateCriticalThreshold: 85,
    memoryWarningThreshold: 100, // MB
    enableAlerts: true
};

export class CacheMonitor {
    private config: MonitorConfig;
    private monitorTimer?: NodeJS.Timeout;
    private alerts: Alert[] = [];
    private metricsHistory: MonitorMetrics[] = [];
    private maxHistorySize: number = 100;
    private onAlertCallback?: (alert: Alert) => void;
    private isRunning: boolean = false;

    constructor(config?: Partial<MonitorConfig>) {
        this.config = { ...DEFAULT_MONITOR_CONFIG, ...config };
    }

    /**
     * 開始監控
     */
    start(): void {
        if (this.isRunning) {
            console.log('[CacheMonitor] 監控已在執行中');
            return;
        }

        this.isRunning = true;

        // 立即執行一次監控
        this.collectMetrics().catch(console.error);

        // 設定週期性監控
        this.monitorTimer = setInterval(() => {
            this.collectMetrics().catch(console.error);
        }, this.config.monitorIntervalMs);

        console.log(`[CacheMonitor] 監控已啟動，間隔: ${this.config.monitorIntervalMs}ms`);
    }

    /**
     * 停止監控
     */
    stop(): void {
        if (this.monitorTimer) {
            clearInterval(this.monitorTimer);
            this.monitorTimer = undefined;
        }
        this.isRunning = false;
        console.log('[CacheMonitor] 監控已停止');
    }

    /**
     * 收集監控指標
     */
    async collectMetrics(): Promise<MonitorMetrics> {
        const cacheStats = getAllCacheStats();
        const warmer = getCacheWarmer(() => Promise.resolve({}));
        const warmerStats = warmer.getStats();

        // 計算系統整體指標
        let totalHits = 0;
        let totalMisses = 0;
        let totalMemory = 0;
        let totalEntries = 0;

        for (const stats of Object.values(cacheStats)) {
            totalHits += stats.hitCount;
            totalMisses += stats.missCount;
            totalMemory += stats.memoryUsage;
            totalEntries += stats.size;
        }

        const totalHitRate = totalHits + totalMisses > 0
            ? (totalHits / (totalHits + totalMisses)) * 100
            : 0;

        // 生成 Alert
        const alerts = this.generateAlerts({
            hitRate: totalHitRate,
            memoryUsage: totalMemory / (1024 * 1024), // 轉換為 MB
            cacheStats
        });

        const metrics: MonitorMetrics = {
            timestamp: Date.now(),
            caches: cacheStats,
            warmer: {
                totalWarmups: warmerStats.totalWarmups,
                successfulWarmups: warmerStats.successfulWarmups,
                failedWarmups: warmerStats.failedWarmups,
                hotStationsCount: warmerStats.hotStationsCount
            },
            system: {
                totalHitRate: totalHitRate,
                totalMemoryUsage: totalMemory,
                totalEntries
            },
            alerts
        };

        // 儲存歷史記錄
        this.metricsHistory.push(metrics);
        if (this.metricsHistory.length > this.maxHistorySize) {
            this.metricsHistory.shift();
        }

        // 觸發 Alert 通知
        for (const alert of alerts) {
            this.handleAlert(alert);
        }

        return metrics;
    }

    /**
     * 生成 Alert
     */
    private generateAlerts(data: {
        hitRate: number;
        memoryUsage: number;
        cacheStats: Record<string, CacheStats>;
    }): Alert[] {
        const alerts: Alert[] = [];

        // 命中率危急 Alert
        if (data.hitRate < this.config.hitRateCriticalThreshold) {
            alerts.push({
                type: 'critical',
                message: `快取命中率危急: ${data.hitRate.toFixed(2)}% (低於 ${this.config.hitRateCriticalThreshold}%)`,
                timestamp: Date.now(),
                metric: 'hitRate',
                value: data.hitRate,
                threshold: this.config.hitRateCriticalThreshold
            });
        }
        // 命中率警告 Alert
        else if (data.hitRate < this.config.hitRateWarningThreshold) {
            alerts.push({
                type: 'warning',
                message: `快取命中率警告: ${data.hitRate.toFixed(2)}% (低於 ${this.config.hitRateWarningThreshold}%)`,
                timestamp: Date.now(),
                metric: 'hitRate',
                value: data.hitRate,
                threshold: this.config.hitRateWarningThreshold
            });
        }

        // 記憶體警告 Alert
        if (data.memoryUsage > this.config.memoryWarningThreshold) {
            alerts.push({
                type: 'warning',
                message: `記憶體使用過高: ${data.memoryUsage.toFixed(2)}MB (超過 ${this.config.memoryWarningThreshold}MB)`,
                timestamp: Date.now(),
                metric: 'memoryUsage',
                value: data.memoryUsage,
                threshold: this.config.memoryWarningThreshold
            });
        }

        return alerts;
    }

    /**
     * 處理 Alert
     */
    private handleAlert(alert: Alert): void {
        this.alerts.push(alert);

        // 保持 Alert 歷史在合理範圍內
        if (this.alerts.length > 50) {
            this.alerts.shift();
        }

        // �發回調
        if (this.onAlertCallback) {
            this.onAlertCallback(alert);
        }

        // 輸出到控制台
        const prefix = alert.type === 'critical' ? '🚨' : alert.type === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`[CacheMonitor] ${prefix} ${alert.message}`);
    }

    /**
     * 設定 Alert 回調
     */
    setOnAlert(callback: (alert: Alert) => void): void {
        this.onAlertCallback = callback;
    }

    /**
     * 獲取目前指標
     */
    getCurrentMetrics(): MonitorMetrics | null {
        return this.metricsHistory.length > 0
            ? this.metricsHistory[this.metricsHistory.length - 1]
            : null;
    }

    /**
     * 獲取歷史指標
     */
    getMetricsHistory(): MonitorMetrics[] {
        return [...this.metricsHistory];
    }

    /**
     * 獲取 Alert 歷史
     */
    getAlerts(): Alert[] {
        return [...this.alerts];
    }

    /**
     * 清除 Alert 歷史
     */
    clearAlerts(): void {
        this.alerts = [];
    }

    /**
     * 獲取監控報告
     */
    getReport(): string {
        const metrics = this.getCurrentMetrics();
        if (!metrics) {
            return '無監控數據';
        }

        return `
=== 快取監控報告 ===
時間: ${new Date(metrics.timestamp).toLocaleString()}

系統整體:
  - 快取命中率: ${metrics.system.totalHitRate.toFixed(2)}%
  - 總項目數: ${metrics.system.totalEntries}
  - 記憶體使用: ${(metrics.system.totalMemoryUsage / (1024 * 1024)).toFixed(2)}MB

快取詳細:
${Object.entries(metrics.caches).map(([name, stats]) =>
    `  ${name}:
    - 大小: ${stats.size}/${stats.maxSize}
    - 命中率: ${stats.hitRate.toFixed(2)}%
    - 淘汰次數: ${stats.evictionCount}`
).join('\n')}

預熱統計:
  - 總預熱次數: ${metrics.warmer.totalWarmups}
  - 成功: ${metrics.warmer.successfulWarmups}
  - 失敗: ${metrics.warmer.failedWarmups}
  - 熱門站點: ${metrics.warmer.hotStationsCount}

Alert: ${metrics.alerts.length} 個
${metrics.alerts.slice(-5).map(a => `  - [${a.type}] ${a.message}`).join('\n')}

===================
`;
    }

    /**
     * 銷毀
     */
    destroy(): void {
        this.stop();
        this.clearAlerts();
        this.metricsHistory = [];
    }
}

/**
 * 監控管理器 (單例)
 */
let monitorInstance: CacheMonitor | null = null;

export function getCacheMonitor(config?: Partial<MonitorConfig>): CacheMonitor {
    if (!monitorInstance) {
        monitorInstance = new CacheMonitor(config);
    }
    return monitorInstance;
}

export function destroyCacheMonitor(): void {
    if (monitorInstance) {
        monitorInstance.destroy();
        monitorInstance = null;
    }
}
