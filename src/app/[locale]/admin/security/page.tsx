'use client';

import { createClient } from '@supabase/supabase-js';
import { useLocale } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, RefreshCw, Activity } from 'lucide-react';

type SecurityEvent = {
    id: string;
    event_type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    metadata: any;
    user_id: string | null;
    client_ip: string | null;
    created_at: string;
};

type SecurityResponse = {
    events: SecurityEvent[];
    total: number;
    limit: number;
    offset: number;
};

function getSupabaseClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) return null;
    return createClient(url, anonKey);
}

export default function AdminSecurityPage() {
    const locale = useLocale();
    const router = useRouter();
    const supabase = useMemo(() => getSupabaseClient(), []);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<SecurityResponse | null>(null);
    const [page, setPage] = useState(0);
    const limit = 20;

    const fetchEvents = useCallback(async () => {
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

            const url = new URL('/api/admin/security-events', window.location.origin);
            url.searchParams.set('limit', String(limit));
            url.searchParams.set('offset', String(page * limit));

            const res = await fetch(url.toString(), {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (res.status === 401 || res.status === 403) {
                if (res.status === 403) {
                    setError('權限不足：需要管理員角色');
                } else {
                    router.push(`/${locale}/admin/login`);
                }
                return;
            }

            if (!res.ok) {
                throw new Error(`API Error: ${res.status}`);
            }

            const json = (await res.json()) as SecurityResponse;
            setData(json);
            setError(null);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [locale, page, router, supabase]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    const getSeverityBadge = (severity: string) => {
        const styles: Record<string, string> = {
            critical: 'bg-red-600 text-white',
            high: 'bg-red-100 text-red-800',
            medium: 'bg-amber-100 text-amber-800',
            low: 'bg-blue-100 text-blue-800',
        };

        const labels: Record<string, string> = {
            critical: '重大',
            high: '高',
            medium: '中',
            low: '低',
        };

        return (
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[severity] || styles.low}`}>
                {labels[severity] || severity.toUpperCase()}
            </span>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Shield className="text-indigo-600" />
                        安全監控儀表板
                    </h1>
                    <p className="text-gray-500 mt-1">監控系統關鍵事件與異常活動</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => fetchEvents()}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        重新整理
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-lg">
                    {error}
                </div>
            )}

            <div className="bg-white shadow rounded-xl overflow-hidden border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">時間</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">類型</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">嚴重度</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">描述</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">中繼資料</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-gray-400" />
                                載入中...
                            </td></tr>
                        ) : data?.events.length === 0 ? (
                            <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-500">尚無事件紀錄</td></tr>
                        ) : data?.events.map((event) => (
                            <tr key={event.id} className="hover:bg-gray-50 transition">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(event.created_at).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {event.event_type}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {getSeverityBadge(event.severity)}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    {event.description}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    <pre className="text-xs bg-gray-50 p-2 rounded max-h-24 overflow-y-auto w-64">
                                        {JSON.stringify(event.metadata, null, 2)}
                                    </pre>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {data && (
                    <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200 bg-gray-50">
                        <div className="text-sm text-gray-700">
                            顯示 {page * limit + 1} 至 {Math.min((page + 1) * limit, data.total)} 筆，共 {data.total} 筆
                        </div>
                        <div className="flex gap-2">
                            <button
                                disabled={page === 0}
                                onClick={() => setPage(p => p - 1)}
                                className="px-4 py-2 border rounded-md disabled:opacity-50 hover:bg-white transition-colors"
                            >
                                上一頁
                            </button>
                            <button
                                disabled={(page + 1) * limit >= data.total}
                                onClick={() => setPage(p => p + 1)}
                                className="px-4 py-2 border rounded-md disabled:opacity-50 hover:bg-white transition-colors"
                            >
                                下一頁
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
