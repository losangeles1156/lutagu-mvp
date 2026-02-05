'use client';

import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type HealthResponse = {
    generatedAt: string;
    windowHours: number;
    staleThresholdMinutes: number;
    weather: {
        live: any;
        alerts: any;
        sync: any;
    };
    l2: {
        totalStations: number;
        staleStationsCount: number;
        updatedStationsCount: number;
        weatherCoverageCount: number;
        statusCounts: Record<string, number>;
        lastUpdatedAt: string | null;
        staleStations: Array<{ stationId: string; updatedAt: string; ageMinutes: number; statusCode: string }>;
    };
};

function getSupabaseClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) return null;
    return createClient(url, anonKey);
}

function formatCount(n: number) {
    return new Intl.NumberFormat('en-US').format(n);
}

export default function AdminHealthPage() {
    const locale = useLocale();
    const router = useRouter();
    const supabase = useMemo(() => getSupabaseClient(), []);

    const [windowHours, setWindowHours] = useState(24);
    const [staleThresholdMinutes, setStaleThresholdMinutes] = useState(30);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<HealthResponse | null>(null);

    const fetchHealth = useCallback(async () => {
        setError(null);
        if (!supabase) {
            setError('Supabase 環境變數未設定');
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            const token = sessionData.session?.access_token;
            if (!token) {
                router.push(`/${locale}/admin/login`);
                return;
            }

            const url = new URL('/api/admin/health', window.location.origin);
            url.searchParams.set('windowHours', String(windowHours));
            url.searchParams.set('staleThresholdMinutes', String(staleThresholdMinutes));

            const res = await fetch(url.toString(), {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (res.status === 401) {
                router.push(`/${locale}/admin/login`);
                return;
            }

            if (!res.ok) {
                const text = await res.text();
                setError(`${res.status} ${res.statusText}${text ? `: ${text}` : ''}`);
                setData(null);
                return;
            }

            const json = (await res.json()) as HealthResponse;
            setData(json);
        } catch (e: any) {
            setError(String(e?.message || e || 'Unknown Error'));
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [locale, router, staleThresholdMinutes, supabase, windowHours]);

    useEffect(() => {
        void fetchHealth();
    }, [fetchHealth]);

    const l2 = data?.l2;
    const weather = data?.weather;

    const healthScore = (() => {
        if (!data) return { label: '未知', tone: 'bg-slate-900 text-white' };
        const staleRatio = data.l2.totalStations ? data.l2.staleStationsCount / data.l2.totalStations : 0;
        const hasRecentLiveFailure = !!data.weather.live?.lastFailedAt;
        const hasRecentSyncFailure = !!data.weather.sync?.lastFailedAt;
        if (hasRecentLiveFailure || hasRecentSyncFailure) return { label: '異常', tone: 'bg-rose-600 text-white' };
        if (staleRatio >= 0.3) return { label: '退化', tone: 'bg-amber-500 text-white' };
        return { label: '健康', tone: 'bg-emerald-600 text-white' };
    })();

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight text-slate-900" style={{ fontFamily: 'var(--font-admin-display)' }}>
                        健康儀表板
                    </h1>
                    <div className="mt-1 text-xs font-bold text-slate-500">
                        {data?.generatedAt ? `更新時間：${data.generatedAt}` : '讀取中'}
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <Link
                        href={`/${locale}/admin/security`}
                        className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                        安全監控
                    </Link>
                    <Link
                        href={`/${locale}/admin/login`}
                        className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                        登入/登出
                    </Link>
                    <button
                        onClick={fetchHealth}
                        className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800"
                    >
                        重新整理
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="admin-card p-6">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-[0.2em]">Overall</div>
                    <div className="mt-3 flex items-center gap-3">
                        <div className={`px-3 py-1.5 rounded-2xl text-sm font-semibold ${healthScore.tone}`}>{healthScore.label}</div>
                        <div className="text-xs font-semibold text-slate-500">window {windowHours}h / stale {staleThresholdMinutes}m</div>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                        <label className="grid gap-2">
                            <div className="text-xs font-semibold text-slate-700">windowHours</div>
                            <input
                                value={windowHours}
                                onChange={(e) => setWindowHours(Number(e.target.value))}
                                type="number"
                                min={1}
                                max={168}
                                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold outline-none focus:ring-2 focus:ring-slate-900/20"
                            />
                        </label>
                        <label className="grid gap-2">
                            <div className="text-xs font-semibold text-slate-700">staleThresholdMinutes</div>
                            <input
                                value={staleThresholdMinutes}
                                onChange={(e) => setStaleThresholdMinutes(Number(e.target.value))}
                                type="number"
                                min={5}
                                max={1440}
                                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold outline-none focus:ring-2 focus:ring-slate-900/20"
                            />
                        </label>
                    </div>

                    <div className="mt-4 text-xs font-semibold text-slate-500">
                        變更參數後按「重新整理」。
                    </div>
                </div>

                <div className="admin-card p-6">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-[0.2em]">L2 Snapshot</div>
                    <div className="mt-3 grid gap-2">
                        <div className="flex items-center justify-between text-sm font-semibold text-slate-900">
                            <span>Stations</span>
                            <span>{l2 ? formatCount(l2.totalStations) : '-'}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm font-semibold text-slate-900">
                            <span>Stale</span>
                            <span className="text-rose-600">{l2 ? formatCount(l2.staleStationsCount) : '-'}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm font-semibold text-slate-900">
                            <span>Updated</span>
                            <span className="text-emerald-600">{l2 ? formatCount(l2.updatedStationsCount) : '-'}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm font-semibold text-slate-900">
                            <span>Weather coverage</span>
                            <span>{l2 ? formatCount(l2.weatherCoverageCount) : '-'}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {l2
                                ? Object.entries(l2.statusCounts || {})
                                    .sort((a, b) => (b[1] || 0) - (a[1] || 0))
                                    .slice(0, 6)
                                    .map(([k, v]) => (
                                        <div
                                            key={k}
                                            className="px-2.5 py-1 rounded-2xl bg-slate-100 text-slate-700 text-[11px] font-semibold"
                                        >
                                            {k}:{formatCount(v)}
                                        </div>
                                    ))
                                : null}
                        </div>
                        <div className="mt-2 text-xs font-semibold text-slate-500">lastUpdatedAt: {l2?.lastUpdatedAt || '-'}</div>
                    </div>
                </div>

                <div className="admin-card p-6">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-[0.2em]">Weather</div>
                    <div className="mt-3 grid gap-4">
                        <div className="grid gap-1">
                            <div className="text-sm font-semibold text-slate-900">live</div>
                            <div className="text-xs font-semibold text-slate-500">events: {weather ? formatCount(weather.live?.total || 0) : '-'}</div>
                            <div className="text-xs font-semibold text-slate-500">failed: {weather ? formatCount(weather.live?.failedCount || 0) : '-'}</div>
                            <div className="text-xs font-semibold text-slate-500">degraded: {weather ? formatCount(weather.live?.degradedCount || 0) : '-'}</div>
                        </div>
                        <div className="grid gap-1">
                            <div className="text-sm font-semibold text-slate-900">sync</div>
                            <div className="text-xs font-semibold text-slate-500">events: {weather ? formatCount(weather.sync?.total || 0) : '-'}</div>
                            <div className="text-xs font-semibold text-slate-500">lastStationCount: {weather?.sync?.lastStationCount ?? '-'}</div>
                            <div className="text-xs font-semibold text-slate-500">lastUpdatedAt: {weather?.sync?.lastUpdatedAt ?? '-'}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div>
                {loading && (
                    <div className="admin-card p-6 text-sm font-semibold text-slate-700">
                        讀取中…
                    </div>
                )}
                {!loading && error && (
                    <div className="bg-rose-50 rounded-2xl border border-rose-100 shadow-sm p-6">
                        <div className="text-sm font-semibold text-rose-800">讀取失敗</div>
                        <div className="mt-2 text-xs font-semibold text-rose-700 whitespace-pre-wrap break-words">{error}</div>
                    </div>
                )}
            </div>

            <div className="admin-card overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <div className="text-sm font-semibold text-slate-900">Stale stations</div>
                        <div className="mt-1 text-xs font-semibold text-slate-500">顯示最久未更新的前 50 筆</div>
                    </div>
                    <div className="text-xs font-semibold text-slate-500">{l2 ? `${formatCount(l2.staleStationsCount)} stale` : ''}</div>
                </div>

                <div className="overflow-x-auto">
                    <table className="admin-table">
                        <thead>
                            <tr className="bg-slate-50 text-left">
                                <th className="px-6 py-3">stationId</th>
                                <th className="px-6 py-3">status</th>
                                <th className="px-6 py-3">age (min)</th>
                                <th className="px-6 py-3">updatedAt</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(l2?.staleStations || []).map((s) => (
                                <tr key={s.stationId}>
                                    <td className="px-6 py-3 text-xs font-semibold text-slate-800 break-all">{s.stationId}</td>
                                    <td className="px-6 py-3 text-xs font-semibold text-slate-800">{s.statusCode}</td>
                                    <td className="px-6 py-3 text-xs font-semibold text-rose-700">{formatCount(s.ageMinutes)}</td>
                                    <td className="px-6 py-3 text-xs font-semibold text-slate-500">{s.updatedAt}</td>
                                </tr>
                            ))}
                            {!loading && !error && (l2?.staleStations || []).length === 0 && (
                                <tr>
                                    <td className="px-6 py-6 text-sm font-semibold text-slate-700" colSpan={4}>
                                        目前沒有 stale stations
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
