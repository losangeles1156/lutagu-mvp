'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface AnalyticsData {
    summary: {
        total_places: number;
        active_places: number;
        partner_places: number;
        total_partners: number;
        active_partners: number;
    };
    category_distribution: Record<string, number>;
    status_distribution: Record<string, number>;
    top_stations: Array<{ station_id: string; count: number }>;
    recent_places: Array<{
        id: string;
        name_i18n: Record<string, string>;
        category: string;
        status: string;
        created_at: string;
    }>;
    growth_trends: {
        places_growth: number;
        partners_growth: number;
        views_growth: number;
    };
    period_days: number;
    generated_at: string;
}

const PERIOD_OPTIONS = [
    { value: '7', label: 'Last 7 days' },
    { value: '30', label: 'Last 30 days' },
    { value: '90', label: 'Last 90 days' },
];

const CATEGORY_LABELS: Record<string, string> = {
    shopping: 'Shopping',
    dining: 'Dining',
    leisure: 'Leisure',
    culture: 'Culture',
    nature: 'Nature',
    other: 'Other',
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    draft: { label: 'Draft', color: 'bg-gray-100 text-gray-800' },
    pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
    approved: { label: 'Approved', color: 'bg-green-100 text-green-800' },
    rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800' },
};

export default function AnalyticsPage() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [period, setPeriod] = useState('30');

    useEffect(() => {
        const fetchAnalytics = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(`/api/admin/l1/places/analytics?period=${period}`);
                if (!res.ok) throw new Error('Failed to fetch analytics');
                const result = await res.json();
                setData(result);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, [period]);

    const formatGrowth = (value: number) => {
        const sign = value >= 0 ? '+' : '';
        return { sign, value: Math.abs(value), isPositive: value >= 0 };
    };

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="admin-card p-6 text-center text-slate-500">
                    載入分析中...
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-xl">
                    Error: {error}
                </div>
            </div>
        );
    }

    if (!data) return null;

    const placesGrowth = formatGrowth(data.growth_trends.places_growth);
    const partnersGrowth = formatGrowth(data.growth_trends.partners_growth);

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight text-slate-900" style={{ fontFamily: 'var(--font-admin-display)' }}>
                        L1 場所分析
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">聚焦熱門站點、合作夥伴與類別分布</p>
                </div>
                <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400"
                >
                    {PERIOD_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="admin-kpi">
                    <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Total Places</div>
                    <div className="text-3xl font-semibold text-slate-900" style={{ fontFamily: 'var(--font-admin-display)' }}>{data.summary.total_places}</div>
                    <div className={`text-xs mt-2 ${placesGrowth.isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {placesGrowth.sign}{placesGrowth.value}% from last period
                    </div>
                </div>
                <div className="admin-kpi">
                    <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Active Places</div>
                    <div className="text-3xl font-semibold text-slate-900" style={{ fontFamily: 'var(--font-admin-display)' }}>{data.summary.active_places}</div>
                    <div className="text-xs text-slate-400 mt-2">
                        {data.summary.partner_places} partner places
                    </div>
                </div>
                <div className="admin-kpi">
                    <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Total Partners</div>
                    <div className="text-3xl font-semibold text-slate-900" style={{ fontFamily: 'var(--font-admin-display)' }}>{data.summary.total_partners}</div>
                    <div className={`text-xs mt-2 ${partnersGrowth.isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {partnersGrowth.sign}{partnersGrowth.value}% from last period
                    </div>
                </div>
                <div className="admin-kpi">
                    <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Active Partners</div>
                    <div className="text-3xl font-semibold text-slate-900" style={{ fontFamily: 'var(--font-admin-display)' }}>{data.summary.active_partners}</div>
                    <div className="text-xs text-slate-400 mt-2">
                        {Math.round((data.summary.active_partners / Math.max(1, data.summary.total_partners)) * 100)}% activation rate
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Category Distribution */}
                <div className="admin-card p-6">
                    <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: 'var(--font-admin-display)' }}>Places by Category</h2>
                    <div className="space-y-3">
                        {Object.entries(data.category_distribution)
                            .sort((a, b) => b[1] - a[1])
                            .map(([category, count]) => {
                                const percentage = Math.round((count / data.summary.active_places) * 100);
                                return (
                                    <div key={category}>
                                        <div className="flex justify-between text-sm mb-1 text-slate-700">
                                            <span>{CATEGORY_LABELS[category] || category}</span>
                                            <span>{count} ({percentage}%)</span>
                                        </div>
                                        <div className="w-full bg-slate-200 rounded-full h-2">
                                            <div
                                                className="bg-slate-900 h-2 rounded-full"
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                </div>

                {/* Status Distribution */}
                <div className="admin-card p-6">
                    <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: 'var(--font-admin-display)' }}>Places by Status</h2>
                    <div className="flex gap-4 flex-wrap">
                        {Object.entries(data.status_distribution).map(([status, count]) => (
                            <div key={status} className="text-center">
                                <div className={`px-4 py-2 rounded-lg ${STATUS_LABELS[status]?.color || 'bg-gray-100'}`}>
                                    <div className="text-2xl font-bold">{count}</div>
                                    <div className="text-xs">{STATUS_LABELS[status]?.label || status}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Stations */}
                <div className="admin-card p-6">
                    <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: 'var(--font-admin-display)' }}>Top Stations by Place Count</h2>
                    <div className="space-y-2">
                        {data.top_stations.slice(0, 10).map((station, index) => (
                            <div key={station.station_id} className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-sm font-medium">
                                    {index + 1}
                                </div>
                                <div className="flex-1 truncate text-sm text-slate-700">
                                    {station.station_id.split('.').pop() || station.station_id}
                                </div>
                                <div className="text-sm font-medium text-slate-900">{station.count} places</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Places */}
                <div className="admin-card p-6">
                    <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: 'var(--font-admin-display)' }}>Recently Added Places</h2>
                    <div className="space-y-3">
                        {data.recent_places.map((place) => (
                            <div key={place.id} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0">
                                <div>
                                    <div className="font-medium text-sm text-slate-900">
                                        {place.name_i18n?.['zh-TW'] || place.name_i18n?.ja || Object.values(place.name_i18n)[0]}
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        {place.category} • {new Date(place.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                                <span className={`px-2 py-1 rounded-full text-xs ${STATUS_LABELS[place.status]?.color || 'bg-gray-100'}`}>
                                    {STATUS_LABELS[place.status]?.label || place.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="text-xs text-slate-400 text-center">
                Data generated at {new Date(data.generated_at).toLocaleString()}
            </div>
        </div>
    );
}
