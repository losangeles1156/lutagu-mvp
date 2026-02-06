'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { useLocale } from 'next-intl';

type FeedbackWeight = {
    tag: string;
    weight: number;
    updated_at: string;
};

type FeedbackEvent = {
    id: string;
    trace_id: string | null;
    session_id: string | null;
    locale: string | null;
    query: string | null;
    helpful: boolean;
    intent_tags: string[] | null;
    node_id: string | null;
    created_at: string;
};

type Summary = {
    totalEvents: number;
    positiveCount: number;
    negativeCount: number;
    totalTags: number;
    avgWeight: number;
};

export default function AgentFeedbackAdminPage() {
    const locale = useLocale();
    const [weights, setWeights] = useState<FeedbackWeight[]>([]);
    const [events, setEvents] = useState<FeedbackEvent[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/agent-feedback?limit=100', { cache: 'no-store' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setWeights(data.weights || []);
            setEvents(data.events || []);
            setSummary(data.summary || null);
        } catch (error) {
            console.error('Failed to fetch agent feedback data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const topWeights = useMemo(
        () => [...weights].sort((a, b) => b.weight - a.weight).slice(0, 20),
        [weights]
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight text-slate-900" style={{ fontFamily: 'var(--font-admin-display)' }}>
                        Agent 權重觀測
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        監控意圖標籤學習權重、回饋事件，並匯出報表
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 disabled:opacity-50 transition-colors"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        重新整理
                    </button>
                    <a
                        href="/api/admin/agent-feedback?format=json"
                        className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 rounded-xl border border-slate-200 hover:bg-slate-50"
                    >
                        <Download size={16} />
                        匯出 JSON
                    </a>
                    <a
                        href="/api/admin/agent-feedback?format=csv"
                        className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 rounded-xl border border-slate-200 hover:bg-slate-50"
                    >
                        <Download size={16} />
                        匯出 CSV
                    </a>
                    <a
                        href="/api/admin/agent-feedback?format=markdown"
                        className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 rounded-xl border border-slate-200 hover:bg-slate-50"
                    >
                        <Download size={16} />
                        匯出報告
                    </a>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <StatCard title="事件總數" value={summary?.totalEvents ?? 0} />
                <StatCard title="正向回饋" value={summary?.positiveCount ?? 0} tone="emerald" />
                <StatCard title="負向回饋" value={summary?.negativeCount ?? 0} tone="rose" />
                <StatCard title="標籤數" value={summary?.totalTags ?? 0} />
                <StatCard title="平均權重" value={summary?.avgWeight ?? 0} />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <section className="admin-card overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 font-semibold text-slate-900">
                        標籤權重（Top 20）
                    </div>
                    <div className="divide-y divide-slate-100">
                        {topWeights.length === 0 && (
                            <div className="p-6 text-sm text-slate-500">暫無權重資料</div>
                        )}
                        {topWeights.map((item) => (
                            <div key={item.tag} className="px-4 py-3 flex items-center justify-between text-sm">
                                <div className="font-medium text-slate-800">{item.tag}</div>
                                <div className={`font-semibold ${item.weight >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {Number(item.weight).toFixed(4)}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="admin-card overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 font-semibold text-slate-900">
                        最近回饋事件（100 筆）
                    </div>
                    <div className="max-h-[520px] overflow-auto divide-y divide-slate-100">
                        {events.length === 0 && (
                            <div className="p-6 text-sm text-slate-500">暫無回饋事件</div>
                        )}
                        {events.map((event) => (
                            <div key={event.id} className="px-4 py-3">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="text-xs text-slate-500 truncate">
                                        {event.query || '(no query)'}
                                    </div>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${event.helpful ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                        {event.helpful ? 'helpful' : 'not-helpful'}
                                    </span>
                                </div>
                                <div className="mt-1 text-xs text-slate-400">
                                    {new Date(event.created_at).toLocaleString(locale)} {event.node_id ? `• ${event.node_id}` : ''}
                                </div>
                                <div className="mt-1 text-xs text-slate-500">
                                    tags: {(event.intent_tags || []).join(', ') || '-'}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}

function StatCard({ title, value, tone = 'default' }: { title: string; value: number; tone?: 'default' | 'emerald' | 'rose' }) {
    const valueClass =
        tone === 'emerald' ? 'text-emerald-600' : tone === 'rose' ? 'text-rose-600' : 'text-slate-900';
    return (
        <div className="admin-card p-4">
            <div className="text-xs text-slate-500 uppercase tracking-wide">{title}</div>
            <div className={`text-2xl font-semibold mt-1 ${valueClass}`} style={{ fontFamily: 'var(--font-admin-display)' }}>
                {typeof value === 'number' ? value.toLocaleString() : value}
            </div>
        </div>
    );
}

