'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { Activity, Clock, Zap, AlertTriangle, TrendingUp, RefreshCw, Server, Brain } from 'lucide-react';

interface APIPerformanceStat {
    endpoint: string;
    request_count: number;
    avg_ms: number;
    p50_ms: number;
    p95_ms: number;
    p99_ms: number;
    error_count: number;
}

interface AIQualityStat {
    locale: string;
    total_requests: number;
    avg_response_ms: number;
    avg_tools_per_request: number;
    error_count: number;
    avg_output_length: number;
}

interface HourlyVolume {
    hour: string;
    request_count: number;
    avg_ms: number;
}

export default function MetricsAdminPage() {
    const locale = useLocale();
    const [loading, setLoading] = useState(true);
    const [apiStats, setApiStats] = useState<APIPerformanceStat[]>([]);
    const [aiStats, setAiStats] = useState<AIQualityStat[]>([]);
    const [hourlyVolume, setHourlyVolume] = useState<HourlyVolume[]>([]);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const fetchMetrics = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/metrics');
            if (res.ok) {
                const data = await res.json();
                setApiStats(data.apiPerformance || []);
                setAiStats(data.aiQuality || []);
                setHourlyVolume(data.hourlyVolume || []);
                setLastUpdated(new Date());
            }
        } catch (error) {
            console.error('Failed to fetch metrics:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMetrics();
        // Auto-refresh every 60 seconds
        const interval = setInterval(fetchMetrics, 60000);
        return () => clearInterval(interval);
    }, []);

    // Calculate totals
    const totalRequests = apiStats.reduce((sum, s) => sum + s.request_count, 0);
    const totalErrors = apiStats.reduce((sum, s) => sum + s.error_count, 0);
    const avgResponseTime = apiStats.length > 0
        ? Math.round(apiStats.reduce((sum, s) => sum + s.avg_ms * s.request_count, 0) / (totalRequests || 1))
        : 0;
    const aiTotalRequests = aiStats.reduce((sum, s) => sum + s.total_requests, 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Activity className="text-indigo-600" />
                        效能指標
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        過去 24 小時 • {lastUpdated ? `更新於 ${lastUpdated.toLocaleTimeString()}` : '載入中...'}
                    </p>
                </div>
                <button
                    onClick={fetchMetrics}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    重新整理
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-2 text-gray-500 text-xs font-bold uppercase tracking-wide mb-2">
                        <Server size={14} />
                        總請求數
                    </div>
                    <div className="text-3xl font-bold text-gray-900">{totalRequests.toLocaleString()}</div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-2 text-gray-500 text-xs font-bold uppercase tracking-wide mb-2">
                        <Clock size={14} />
                        平均回應時間
                    </div>
                    <div className="text-3xl font-bold text-gray-900">{avgResponseTime}ms</div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-2 text-gray-500 text-xs font-bold uppercase tracking-wide mb-2">
                        <Brain size={14} />
                        AI 請求數
                    </div>
                    <div className="text-3xl font-bold text-gray-900">{aiTotalRequests.toLocaleString()}</div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-2 text-gray-500 text-xs font-bold uppercase tracking-wide mb-2">
                        <AlertTriangle size={14} />
                        錯誤數
                    </div>
                    <div className={`text-3xl font-bold ${totalErrors > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {totalErrors}
                    </div>
                </div>
            </div>

            {/* API Performance Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                    <Zap className="text-amber-500" size={18} />
                    <h2 className="font-bold text-gray-800">API 端點效能</h2>
                </div>
                {loading && apiStats.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-gray-400" />
                        載入指標中...
                    </div>
                ) : apiStats.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <div className="font-medium">尚無數據</div>
                        <div className="text-sm">請求產生後將顯示於此</div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                                <tr>
                                    <th className="text-left py-3 px-4 font-bold">端點</th>
                                    <th className="text-right py-3 px-4 font-bold">請求數</th>
                                    <th className="text-right py-3 px-4 font-bold">平均</th>
                                    <th className="text-right py-3 px-4 font-bold">P50</th>
                                    <th className="text-right py-3 px-4 font-bold">P95</th>
                                    <th className="text-right py-3 px-4 font-bold">P99</th>
                                    <th className="text-right py-3 px-4 font-bold">錯誤</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {apiStats.map((stat) => (
                                    <tr key={stat.endpoint} className="hover:bg-gray-50">
                                        <td className="py-3 px-4 font-mono text-xs text-gray-700">{stat.endpoint}</td>
                                        <td className="py-3 px-4 text-right text-gray-800">{stat.request_count}</td>
                                        <td className="py-3 px-4 text-right">
                                            <span className={stat.avg_ms > 500 ? 'text-amber-600 font-bold' : 'text-gray-600'}>
                                                {stat.avg_ms}ms
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-right text-gray-600">{stat.p50_ms}ms</td>
                                        <td className="py-3 px-4 text-right">
                                            <span className={stat.p95_ms > 1000 ? 'text-amber-600 font-bold' : 'text-gray-600'}>
                                                {stat.p95_ms}ms
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <span className={stat.p99_ms > 2000 ? 'text-red-600 font-bold' : 'text-gray-600'}>
                                                {stat.p99_ms}ms
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <span className={stat.error_count > 0 ? 'text-red-600 font-bold' : 'text-green-600'}>
                                                {stat.error_count}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* AI Quality Stats */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                    <Brain className="text-purple-500" size={18} />
                    <h2 className="font-bold text-gray-800">AI 對話品質 (依語言)</h2>
                </div>
                {aiStats.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        <Brain className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <div className="font-medium">尚無 AI 數據</div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                                <tr>
                                    <th className="text-left py-3 px-4 font-bold">語言</th>
                                    <th className="text-right py-3 px-4 font-bold">請求數</th>
                                    <th className="text-right py-3 px-4 font-bold">平均回應</th>
                                    <th className="text-right py-3 px-4 font-bold">平均工具/請求</th>
                                    <th className="text-right py-3 px-4 font-bold">平均產出</th>
                                    <th className="text-right py-3 px-4 font-bold">錯誤</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {aiStats.map((stat) => (
                                    <tr key={stat.locale} className="hover:bg-gray-50">
                                        <td className="py-3 px-4 font-bold text-gray-800 uppercase">{stat.locale}</td>
                                        <td className="py-3 px-4 text-right text-gray-800">{stat.total_requests}</td>
                                        <td className="py-3 px-4 text-right">
                                            <span className={stat.avg_response_ms > 3000 ? 'text-amber-600 font-bold' : 'text-gray-600'}>
                                                {stat.avg_response_ms}ms
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-right text-gray-600">{stat.avg_tools_per_request}</td>
                                        <td className="py-3 px-4 text-right text-gray-600">{stat.avg_output_length} 字</td>
                                        <td className="py-3 px-4 text-right">
                                            <span className={stat.error_count > 0 ? 'text-red-600 font-bold' : 'text-green-600'}>
                                                {stat.error_count}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Hourly Volume Chart (Simple bars) */}
            {hourlyVolume.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-2 mb-4">
                        <TrendingUp className="text-green-500" size={18} />
                        <h2 className="font-bold text-gray-800">每小時請求量</h2>
                    </div>
                    <div className="flex items-end gap-1 h-32">
                        {hourlyVolume.slice(-24).map((h, i) => {
                            const maxCount = Math.max(...hourlyVolume.map(v => v.request_count), 1);
                            const height = (h.request_count / maxCount) * 100;
                            return (
                                <div
                                    key={i}
                                    className="flex-1 bg-indigo-500 rounded-t hover:bg-indigo-600 transition-colors"
                                    style={{ height: `${Math.max(height, 2)}%` }}
                                    title={`${new Date(h.hour).toLocaleTimeString()}: ${h.request_count} requests (${h.avg_ms}ms avg)`}
                                />
                            );
                        })}
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-2">
                        <span>24小時前</span>
                        <span>現在</span>
                    </div>
                </div>
            )}
        </div>
    );
}
