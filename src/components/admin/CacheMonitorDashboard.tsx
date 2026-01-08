'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getAllCacheStats, getWarmerStats } from '@/lib/cache';

interface MonitorMetrics {
    timestamp: number;
    caches: ReturnType<typeof getAllCacheStats>;
    warmer: ReturnType<typeof getWarmerStats>;
    system: {
        totalHitRate: number;
        totalMemoryUsage: number;
        totalEntries: number;
    };
    alerts: Array<{
        type: 'warning' | 'critical' | 'info';
        message: string;
        timestamp: number;
        metric: string;
        value: number;
        threshold: number;
    }>;
}

// Real metrics generator
function generateRealMetrics(): MonitorMetrics {
    const now = Date.now();
    const caches = getAllCacheStats();
    const warmer = getWarmerStats();
    
    let totalHitCount = 0;
    let totalMissCount = 0;
    let totalMemory = 0;
    let totalEntries = 0;
    
    Object.values(caches).forEach(stats => {
        totalHitCount += stats.hitCount;
        totalMissCount += stats.missCount;
        totalMemory += stats.memoryUsage;
        totalEntries += stats.size;
    });

    return {
        timestamp: now,
        caches,
        warmer,
        system: {
            totalHitRate: totalHitCount + totalMissCount > 0 
                ? (totalHitCount / (totalHitCount + totalMissCount)) * 100 
                : 0,
            totalMemoryUsage: totalMemory,
            totalEntries: totalEntries
        },
        alerts: []
    };
}

export function CacheMonitorDashboard() {
    const [metrics, setMetrics] = useState<MonitorMetrics | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [refreshInterval, setRefreshInterval] = useState(5000);

    const refreshData = useCallback(() => {
        setMetrics(generateRealMetrics());
    }, []);

    useEffect(() => {
        refreshData();
    }, [refreshData]);

    useEffect(() => {
        if (!autoRefresh) return;

        const interval = setInterval(refreshData, refreshInterval);
        return () => clearInterval(interval);
    }, [autoRefresh, refreshInterval, refreshData]);

    if (!metrics) {
        return (
            <div className="p-4">
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="text-center text-gray-500">載入中...</div>
                </div>
            </div>
        );
    }

    const hitRateColor = (rate: number) => {
        if (rate >= 90) return 'text-green-600';
        if (rate >= 85) return 'text-yellow-600';
        return 'text-red-600';
    };

    const formatMemory = (bytes: number) => {
        const mb = bytes / (1024 * 1024);
        return `${mb.toFixed(2)} MB`;
    };

    return (
        <div className="space-y-4 p-4">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">快取效能監控</h2>
                <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                        />
                        <span>自動刷新</span>
                    </label>
                    <select
                        value={refreshInterval}
                        onChange={(e) => setRefreshInterval(Number(e.target.value))}
                        className="border rounded px-2 py-1"
                    >
                        <option value={3000}>3秒</option>
                        <option value={5000}>5秒</option>
                        <option value={10000}>10秒</option>
                        <option value={30000}>30秒</option>
                    </select>
                    <button
                        onClick={refreshData}
                        className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                        立即刷新
                    </button>
                </div>
            </div>

            {/* System Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow p-4">
                    <div className="text-sm text-gray-500">整體命中率</div>
                    <div className={`text-3xl font-bold ${hitRateColor(metrics.system.totalHitRate)}`}>
                        {metrics.system.totalHitRate.toFixed(2)}%
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-4">
                    <div className="text-sm text-gray-500">總項目數</div>
                    <div className="text-3xl font-bold">
                        {metrics.system.totalEntries}
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-4">
                    <div className="text-sm text-gray-500">記憶體使用</div>
                    <div className="text-3xl font-bold">
                        {formatMemory(metrics.system.totalMemoryUsage)}
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-4">
                    <div className="text-sm text-gray-500">熱門站點預熱</div>
                    <div className="text-3xl font-bold">
                        {metrics.warmer?.hotStationsCount ?? 0}
                    </div>
                    <div className="text-xs text-gray-500">
                        成功 {metrics.warmer?.successfulWarmups ?? 0} / 失敗 {metrics.warmer?.failedWarmups ?? 0}
                    </div>
                </div>
            </div>

            {/* Cache Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(metrics.caches).map(([name, stats]) => (
                    <div key={name} className="bg-white rounded-lg shadow p-4">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold capitalize">{name.replace(/_/g, ' ')}</h3>
                            <span className={`px-2 py-1 rounded text-sm font-medium ${
                                stats.hitRate >= 90 ? 'bg-green-100 text-green-800' :
                                stats.hitRate >= 85 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                            }`}>
                                {stats.hitRate.toFixed(1)}%
                            </span>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>大小</span>
                                <span>{stats.size} / {stats.maxSize}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className={`h-2 rounded-full ${stats.size / stats.maxSize > 0.8 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                    style={{ width: `${Math.min((stats.size / stats.maxSize) * 100, 100)}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>命中</span>
                                <span>{stats.hitCount}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>未命中</span>
                                <span>{stats.missCount}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>淘汰</span>
                                <span>{stats.evictionCount}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Alerts */}
            {metrics.alerts.length > 0 && (
                <div className="space-y-2">
                    <h3 className="text-lg font-semibold">警示</h3>
                    {metrics.alerts.map((alert, index) => (
                        <div
                            key={index}
                            className={`p-4 rounded ${
                                alert.type === 'critical' ? 'bg-red-100 border border-red-400' : 'bg-yellow-100 border border-yellow-400'
                            }`}
                        >
                            <div className="font-medium capitalize">{alert.type}</div>
                            <div>{alert.message}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Cache Warming Status */}
            <div className="bg-white rounded-lg shadow p-4">
                <h3 className="font-semibold mb-4">預熱統計</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <div className="text-sm text-gray-500">總預熱次數</div>
                        <div className="text-2xl font-bold">{metrics.warmer?.totalWarmups ?? 0}</div>
                    </div>
                    <div>
                        <div className="text-sm text-gray-500">成功</div>
                        <div className="text-2xl font-bold text-green-600">{metrics.warmer?.successfulWarmups ?? 0}</div>
                    </div>
                    <div>
                        <div className="text-sm text-gray-500">失敗</div>
                        <div className="text-2xl font-bold text-red-600">{metrics.warmer?.failedWarmups ?? 0}</div>
                    </div>
                    <div>
                        <div className="text-sm text-gray-500">熱門站點</div>
                        <div className="text-2xl font-bold">{metrics.warmer?.hotStationsCount ?? 0}</div>
                    </div>
                </div>
            </div>

            {/* Last Updated */}
            <div className="text-right text-sm text-gray-500">
                最後更新: {new Date(metrics.timestamp).toLocaleString()}
            </div>
        </div>
    );
}

export default CacheMonitorDashboard;
