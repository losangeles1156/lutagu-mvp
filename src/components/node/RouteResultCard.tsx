'use client';

import { useEffect, useMemo, useState } from 'react';
import type { EnrichedRouteOption, SupportedLocale, RouteStep } from '@/lib/l4/assistantEngine';
import { ChevronDown, ChevronUp } from 'lucide-react';

type RouteResultCardProps = {
    option: EnrichedRouteOption;
    rank: number;
    locale: SupportedLocale;
};

function formatRailwayLabel(railwayId: string, locale: SupportedLocale) {
    const raw = (railwayId || '').split(':').pop() || railwayId;
    const parts = raw.split('.');
    const line = parts[parts.length - 1] || raw;
    if (locale === 'ja') return `${line} 線`;
    if (locale === 'en') return `${line} Line`;
    return `${line} 線`;
}

function getRailwayColorClasses(railwayId?: string) {
    const id = railwayId || '';
    if (id.includes('.Ginza')) return { dot: 'bg-orange-500', badge: 'bg-orange-50 text-orange-700 border-orange-100' };
    if (id.includes('.Marunouchi')) return { dot: 'bg-rose-500', badge: 'bg-rose-50 text-rose-700 border-rose-100' };
    if (id.includes('.Hibiya')) return { dot: 'bg-zinc-700', badge: 'bg-zinc-50 text-zinc-700 border-zinc-100' };
    if (id.includes('.Tozai')) return { dot: 'bg-sky-500', badge: 'bg-sky-50 text-sky-700 border-sky-100' };
    if (id.includes('.Chiyoda')) return { dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-100' };
    if (id.includes('.Yurakucho')) return { dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700 border-amber-100' };
    if (id.includes('.Hanzomon')) return { dot: 'bg-purple-500', badge: 'bg-purple-50 text-purple-700 border-purple-100' };
    if (id.includes('.Namboku')) return { dot: 'bg-emerald-700', badge: 'bg-emerald-50 text-emerald-800 border-emerald-100' };
    if (id.includes('.Fukutoshin')) return { dot: 'bg-amber-700', badge: 'bg-amber-50 text-amber-800 border-amber-100' };
    if (id.includes('JR-East') || id.includes('.Yamanote')) return { dot: 'bg-green-600', badge: 'bg-green-50 text-green-700 border-green-100' };
    if (id.includes('.Toei') || id.includes('odpt.Railway:Toei')) return { dot: 'bg-indigo-600', badge: 'bg-indigo-50 text-indigo-700 border-indigo-100' };
    return { dot: 'bg-slate-400', badge: 'bg-slate-50 text-slate-700 border-slate-100' };
}

function parseStepKind(step: RouteStep) {
    return { kind: step.kind, icon: step.icon || '•' };
}

function computeCountdownMinutes(hhmm?: string) {
    const value = String(hhmm || '').trim();
    if (!/^\d{2}:\d{2}$/.test(value)) return null;

    const now = new Date();
    const [hh, mm] = value.split(':').map(Number);
    const dep = new Date(now);
    dep.setHours(hh, mm, 0, 0);
    let diffMs = dep.getTime() - now.getTime();
    if (diffMs < 0) diffMs += 24 * 60 * 60 * 1000;
    return Math.max(0, Math.round(diffMs / 60000));
}

export function RouteResultCard({ option, rank, locale }: RouteResultCardProps) {
    const [expanded, setExpanded] = useState(rank === 0); // Auto-expand first result
    const [tick, setTick] = useState(0);

    useEffect(() => {
        if (!option.nextDeparture) return;
        const id = window.setInterval(() => setTick(t => t + 1), 30_000);
        return () => window.clearInterval(id);
    }, [option.nextDeparture]);

    const countdownMin = useMemo(() => {
        void tick;
        return computeCountdownMinutes(option.nextDeparture);
    }, [option.nextDeparture, tick]);

    const transferLabel = useMemo(() => {
        const n = Number(option.transfers || 0);
        if (locale === 'ja') return `${n} 回`;
        if (locale === 'en') return `${n}`;
        return `${n} 次`;
    }, [locale, option.transfers]);

    const durationLabel = useMemo(() => {
        if (!Number.isFinite(option.duration)) return null;
        const n = Math.max(0, Math.round(Number(option.duration)));
        if (locale === 'ja') return `${n} 分`;
        if (locale === 'en') return `${n} min`;
        return `${n} 分`;
    }, [locale, option.duration]);

    const fareLabel = useMemo(() => {
        const fare = option.fare;
        if (!fare || !Number.isFinite(fare.ic) || !Number.isFinite(fare.ticket)) return null;
        if (locale === 'ja') return `IC ¥${fare.ic} / 切符 ¥${fare.ticket}`;
        if (locale === 'en') return `IC ¥${fare.ic} / Ticket ¥${fare.ticket}`;
        return `IC ¥${fare.ic} / 車票 ¥${fare.ticket}`;
    }, [locale, option.fare]);

    const railways = (option.railways || []).filter(Boolean);

    return (
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
            <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                {rank === 0 ? '🏆 Best Match' : 'Alternative'}
                            </div>
                            {railways.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    {railways.slice(0, 3).map(rw => {
                                        const c = getRailwayColorClasses(rw);
                                        return (
                                            <span
                                                key={rw}
                                                className={`inline-flex items-center gap-2 px-2 py-0.5 rounded-full border text-[10px] font-black ${c.badge}`}
                                            >
                                                <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                                                {formatRailwayLabel(rw, locale)}
                                            </span>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        <div className="mt-1 text-base font-black text-slate-900 break-words">{option.label}</div>
                    </div>

                    <button
                        onClick={() => setExpanded(v => !v)}
                        className="shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 text-[11px] font-black text-slate-700"
                        aria-expanded={expanded}
                    >
                        {expanded
                            ? (locale === 'ja' ? '閉じる' : locale === 'en' ? 'Hide' : '收起')
                            : (locale === 'ja' ? '詳細' : locale === 'en' ? 'Details' : '展開')}
                        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                </div>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 text-xs font-black text-slate-800 flex items-center justify-between">
                        <span className="text-slate-500">⏱</span>
                        <span>{durationLabel || (locale === 'ja' ? '— 分' : locale === 'en' ? '— min' : '— 分')}</span>
                    </div>
                    <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 text-xs font-black text-slate-800 flex items-center justify-between">
                        <span className="text-slate-500">💰</span>
                        <span className="truncate">{fareLabel || (locale === 'ja' ? '—' : locale === 'en' ? '—' : '—')}</span>
                    </div>
                    <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 text-xs font-black text-slate-800 flex items-center justify-between">
                        <span className="text-slate-500">🔄</span>
                        <span>
                            {locale === 'en'
                                ? `${transferLabel} transfer${Number(option.transfers || 0) === 1 ? '' : 's'}`
                                : locale === 'ja'
                                    ? `乗換 ${transferLabel}`
                                    : `轉乘 ${transferLabel}`}
                        </span>
                    </div>
                </div>

                {option.nextDeparture && (
                    <div className="mt-3 rounded-2xl border border-indigo-100 bg-indigo-50 p-3">
                        <div className="flex items-center justify-between gap-3">
                            <div className="text-xs font-black text-indigo-900">
                                🕐 {locale === 'ja' ? '次発' : locale === 'en' ? 'Next' : '下一班'}: {option.nextDeparture}
                            </div>
                            <div className="text-xs font-black text-indigo-700">
                                {countdownMin === null
                                    ? '—'
                                    : countdownMin === 0
                                        ? (locale === 'ja' ? 'まもなく' : locale === 'en' ? 'Now' : '即將')
                                        : (locale === 'ja' ? `${countdownMin} 分` : locale === 'en' ? `${countdownMin} min` : `${countdownMin} 分`)}
                            </div>
                        </div>
                        {countdownMin !== null && (
                            <div className="mt-2 h-2 rounded-full bg-indigo-100 overflow-hidden">
                                <div
                                    className="h-full bg-indigo-600 rounded-full transition-all"
                                    style={{
                                        width: `${Math.max(0, Math.min(100, Math.round((1 - Math.min(15, countdownMin) / 15) * 100)))}%`
                                    }}
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>

            {expanded && (
                <div className="px-4 pb-4">
                    <div className="rounded-2xl border border-slate-100 bg-white">
                        <div className="p-4">
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                {locale === 'ja' ? 'ステップ' : locale === 'en' ? 'Steps' : '步驟'}
                            </div>
                            <div className="mt-3 space-y-3">
                                {option.steps.map((step, i) => {
                                    const meta = parseStepKind(step);
                                    const railwayId = meta.kind === 'train' ? step.railwayId : undefined;
                                    const c = getRailwayColorClasses(railwayId);
                                    return (
                                        <div key={i} className="relative pl-10">
                                            <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-200" />
                                            <div className="absolute left-0 top-0 w-8 h-8 rounded-2xl border border-slate-100 bg-white flex items-center justify-center">
                                                {meta.kind === 'train' ? (
                                                    <span className={`w-2.5 h-2.5 rounded-full ${c.dot}`} />
                                                ) : (
                                                    <span className="text-sm">{meta.icon}</span>
                                                )}
                                            </div>
                                            <div className="px-3 py-2 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-bold text-slate-800 break-words">
                                                {step.text}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

