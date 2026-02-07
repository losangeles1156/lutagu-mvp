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
    alertThreshold?: number;
    alertCount?: number;
};

type TrendRow = {
    day: string;
    positive: number;
    negative: number;
    total: number;
};

type AlertRow = {
    tag: string;
    weight: number;
    level: 'high' | 'medium';
};

export default function AgentFeedbackAdminPage() {
    const locale = useLocale();
    const [weights, setWeights] = useState<FeedbackWeight[]>([]);
    const [events, setEvents] = useState<FeedbackEvent[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [trend, setTrend] = useState<TrendRow[]>([]);
    const [alerts, setAlerts] = useState<AlertRow[]>([]);
    const [alertThreshold, setAlertThreshold] = useState<number>(1.2);
    const [trendDays, setTrendDays] = useState<number>(14);
    const [tagInput, setTagInput] = useState('');
    const [weightInput, setWeightInput] = useState<string>('0');
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch(
                `/api/admin/agent-feedback?limit=100&trend_days=${trendDays}&alert_threshold=${alertThreshold}`,
                { cache: 'no-store' }
            );
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setWeights(data.weights || []);
            setEvents(data.events || []);
            setSummary(data.summary || null);
            setTrend(data.trend || []);
            setAlerts(data.alerts || []);
        } catch (error) {
            console.error('Failed to fetch agent feedback data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [trendDays, alertThreshold]);

    const handleResetAll = async () => {
        const ok = window.confirm('確定要將所有標籤權重重置為 0？');
        if (!ok) return;
        const res = await fetch('/api/admin/agent-feedback', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'reset_all' }),
        });
        if (!res.ok) {
            alert('重置失敗');
            return;
        }
        await fetchData();
    };

    const handleSetTag = async () => {
        const tag = tagInput.trim();
        const weight = Number(weightInput);
        if (!tag) {
            alert('請輸入 tag');
            return;
        }
        if (!Number.isFinite(weight)) {
            alert('weight 必須是數字');
            return;
        }
        const res = await fetch('/api/admin/agent-feedback', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'set_tag', tag, weight }),
        });
        if (!res.ok) {
            alert('更新失敗');
            return;
        }
        setTagInput('');
        setWeightInput('0');
        await fetchData();
    };

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

            <div className="admin-card p-4 space-y-4">
                <div className="text-sm font-semibold text-slate-900">權重管理與告警設定</div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                    <div className="flex items-center gap-2">
                        <label className="text-xs text-slate-500 w-24">Alert 閾值</label>
                        <input
                            type="number"
                            step="0.1"
                            value={alertThreshold}
                            onChange={(e) => setAlertThreshold(Number(e.target.value))}
                            className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-xs text-slate-500 w-24">趨勢天數</label>
                        <input
                            type="number"
                            min={3}
                            max={60}
                            value={trendDays}
                            onChange={(e) => setTrendDays(Number(e.target.value))}
                            className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm"
                        />
                    </div>
                    <button
                        onClick={handleResetAll}
                        className="px-4 py-2 text-sm font-medium rounded-lg border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100"
                    >
                        重置全部權重
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_auto] gap-3">
                    <input
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        placeholder="tag（例如 route）"
                        className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
                    />
                    <input
                        type="number"
                        step="0.1"
                        value={weightInput}
                        onChange={(e) => setWeightInput(e.target.value)}
                        placeholder="weight (-2 ~ 2)"
                        className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
                    />
                    <button
                        onClick={handleSetTag}
                        className="px-4 py-2 text-sm font-medium rounded-lg bg-slate-900 text-white hover:bg-slate-800"
                    >
                        單標籤調整
                    </button>
                </div>
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

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <section className="admin-card overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 font-semibold text-slate-900">
                        回饋趨勢（{trendDays} 天）
                    </div>
                    <div className="p-4 space-y-2">
                        {trend.length === 0 && <div className="text-sm text-slate-500">暫無趨勢資料</div>}
                        {trend.map((row) => (
                            <div key={row.day} className="space-y-1">
                                <div className="flex justify-between text-xs text-slate-500">
                                    <span>{row.day}</span>
                                    <span>+{row.positive} / -{row.negative} (total {row.total})</span>
                                </div>
                                <div className="h-2 rounded-full bg-slate-100 overflow-hidden flex">
                                    <div
                                        className="bg-emerald-500 h-full"
                                        style={{ width: `${row.total > 0 ? (row.positive / row.total) * 100 : 0}%` }}
                                    />
                                    <div
                                        className="bg-rose-500 h-full"
                                        style={{ width: `${row.total > 0 ? (row.negative / row.total) * 100 : 0}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="admin-card overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 font-semibold text-slate-900">
                        權重告警（threshold: {alertThreshold}）
                    </div>
                    <div className="divide-y divide-slate-100">
                        {alerts.length === 0 && <div className="p-4 text-sm text-slate-500">無告警</div>}
                        {alerts.map((alert) => (
                            <div key={alert.tag} className="px-4 py-3 flex items-center justify-between">
                                <div className="text-sm font-medium text-slate-800">{alert.tag}</div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${alert.level === 'high' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                                        {alert.level}
                                    </span>
                                    <span className={`text-sm font-semibold ${alert.weight >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {alert.weight.toFixed(4)}
                                    </span>
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
