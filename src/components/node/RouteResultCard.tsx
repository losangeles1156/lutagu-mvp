'use client';

import { useEffect, useMemo, useState } from 'react';
import type { EnrichedRouteOption } from '@/lib/l4/assistantEngine';
import type { SupportedLocale, RouteStep } from '@/lib/l4/types/RoutingTypes';
import { ChevronDown, ChevronUp, Clock, CreditCard, Repeat, Navigation2, Sparkles, Zap, ShieldCheck, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type RouteResultCardProps = {
    option: EnrichedRouteOption;
    rank: number;
    locale: SupportedLocale;
};

// Railway name translations
const RAILWAY_LABELS: Record<string, { ja: string; en: string; zh: string }> = {
    // JR Lines
    'Yamanote': { ja: '山手線', en: 'Yamanote Line', zh: '山手線' },
    'KeihinTohoku': { ja: '京浜東北線', en: 'Keihin-Tohoku Line', zh: '京濱東北線' },
    'KeihinTohokuRapid': { ja: '京浜東北線快速', en: 'Keihin-Tohoku Rapid', zh: '京濱東北線快速' },
    'Chuo': { ja: '中央線', en: 'Chuo Line', zh: '中央線' },
    'ChuoRapid': { ja: '中央線快速', en: 'Chuo Rapid', zh: '中央線快速' },
    'Sobu': { ja: '総武線', en: 'Sobu Line', zh: '總武線' },
    'SobuRapid': { ja: '総武線快速', en: 'Sobu Rapid', zh: '總武線快速' },
    'Tokaido': { ja: '東海道線', en: 'Tokaido Line', zh: '東海道線' },
    'Yokosuka': { ja: '横須賀線', en: 'Yokosuka Line', zh: '橫須賀線' },
    'Keiyo': { ja: '京葉線', en: 'Keiyo Line', zh: '京葉線' },
    'Joban': { ja: '常磐線', en: 'Joban Line', zh: '常磐線' },
    'Saikyo': { ja: '埼京線', en: 'Saikyo Line', zh: '埼京線' },
    'Utsunomiya': { ja: '宇都宮線', en: 'Utsunomiya Line', zh: '宇都宮線' },
    'Takasaki': { ja: '高崎線', en: 'Takasaki Line', zh: '高崎線' },
    'ShonanShinjuku': { ja: '湘南新宿ライン', en: 'Shonan-Shinjuku Line', zh: '湘南新宿線' },
    'UenoTokyo': { ja: '上野東京ライン', en: 'Ueno-Tokyo Line', zh: '上野東京線' },
    // Tokyo Metro
    'Ginza': { ja: '銀座線', en: 'Ginza Line', zh: '銀座線' },
    'Marunouchi': { ja: '丸ノ内線', en: 'Marunouchi Line', zh: '丸之內線' },
    'Hibiya': { ja: '日比谷線', en: 'Hibiya Line', zh: '日比谷線' },
    'Tozai': { ja: '東西線', en: 'Tozai Line', zh: '東西線' },
    'Chiyoda': { ja: '千代田線', en: 'Chiyoda Line', zh: '千代田線' },
    'Yurakucho': { ja: '有楽町線', en: 'Yurakucho Line', zh: '有樂町線' },
    'Hanzomon': { ja: '半蔵門線', en: 'Hanzomon Line', zh: '半藏門線' },
    'Namboku': { ja: '南北線', en: 'Namboku Line', zh: '南北線' },
    'Fukutoshin': { ja: '副都心線', en: 'Fukutoshin Line', zh: '副都心線' },
    // Toei Lines
    'Asakusa': { ja: '浅草線', en: 'Asakusa Line', zh: '淺草線' },
    'Mita': { ja: '三田線', en: 'Mita Line', zh: '三田線' },
    'Shinjuku': { ja: '新宿線', en: 'Shinjuku Line', zh: '新宿線' },
    'Oedo': { ja: '大江戸線', en: 'Oedo Line', zh: '大江戶線' },
    // Private Railways
    'Keikyu': { ja: '京急線', en: 'Keikyu Line', zh: '京急線' },
    'Keio': { ja: '京王線', en: 'Keio Line', zh: '京王線' },
    'Inokashira': { ja: '井の頭線', en: 'Inokashira Line', zh: '井之頭線' },
    'Odakyu': { ja: '小田急線', en: 'Odakyu Line', zh: '小田急線' },
    'Tokyu': { ja: '東急線', en: 'Tokyu Line', zh: '東急線' },
    'Toyoko': { ja: '東横線', en: 'Toyoko Line', zh: '東橫線' },
    'DenEnToshi': { ja: '田園都市線', en: 'Den-en-toshi Line', zh: '田園都市線' },
    'Seibu': { ja: '西武線', en: 'Seibu Line', zh: '西武線' },
    'Tobu': { ja: '東武線', en: 'Tobu Line', zh: '東武線' },
    'Keisei': { ja: '京成線', en: 'Keisei Line', zh: '京成線' },
    // Monorail & Others
    'Monorail': { ja: 'モノレール', en: 'Tokyo Monorail', zh: '東京單軌電車' },
    'Rinkai': { ja: 'りんかい線', en: 'Rinkai Line', zh: '臨海線' },
    'Yurikamome': { ja: 'ゆりかもめ', en: 'Yurikamome', zh: '百合海鷗號' },
    'NipporiToneri': { ja: '日暮里舎人ライナー', en: 'Nippori-Toneri Liner', zh: '日暮里舍人線' },
    'Tsukuba': { ja: 'つくばエクスプレス', en: 'Tsukuba Express', zh: '筑波快線' },
};

function formatRailwayLabel(railwayId: string, locale: SupportedLocale): string {
    const raw = (railwayId || '').split(':').pop() || railwayId;
    const parts = raw.split('.');
    const lineKey = parts[parts.length - 1] || raw;

    // Try to find translation
    const translation = RAILWAY_LABELS[lineKey];
    if (translation) {
        if (locale === 'ja') return translation.ja;
        if (locale === 'en') return translation.en;
        return translation.zh; // Default to Traditional Chinese
    }

    // Fallback: add "線" suffix
    if (locale === 'ja') return `${lineKey} 線`;
    if (locale === 'en') return `${lineKey} Line`;
    return `${lineKey} 線`;
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
    const [expanded, setExpanded] = useState(rank === 0);
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
        if (locale === 'ja') return `¥${fare.ic}`;
        if (locale === 'en') return `¥${fare.ic}`;
        return `¥${fare.ic}`;
    }, [locale, option.fare]);

    const railways = (option.railways || []).filter(Boolean);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[2.5rem] bg-white/60 backdrop-blur-xl border border-white/80 shadow-xl shadow-slate-200/20 overflow-hidden group"
        >
            <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                            {rank === 0 ? (
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">
                                    <Sparkles size={12} className="animate-pulse" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">最佳方案 Recommended</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 text-slate-500 border border-slate-200/50">
                                    <Navigation2 size={12} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">替代路線 Alternative</span>
                                </div>
                            )}

                            {railways.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {railways.slice(0, 3).map(rw => {
                                        const c = getRailwayColorClasses(rw);
                                        return (
                                            <span
                                                key={rw}
                                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-black ${c.badge} shadow-sm backdrop-blur-md`}
                                            >
                                                <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                                                {formatRailwayLabel(rw, locale)}
                                            </span>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        <h3 className="text-xl font-black text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors">
                            {option.label}
                        </h3>
                    </div>

                    <button
                        onClick={() => setExpanded(v => !v)}
                        className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-sm ${expanded ? 'bg-slate-900 text-white' : 'bg-white/80 text-slate-400 hover:text-indigo-600 hover:bg-white'
                            }`}
                    >
                        {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                </div>

                {/* Core Stats Grid */}
                <div className="mt-6 grid grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-2xl bg-white/50 border border-white/60 shadow-sm flex flex-col items-center justify-center text-center group/stat hover:bg-white transition-all hover:shadow-md">
                        <Clock size={16} className="text-slate-400 mb-1 group-hover/stat:text-indigo-500 transition-colors" />
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">時間 Time</div>
                        <div className="text-sm font-black text-slate-900">{durationLabel || '—'}</div>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-white/50 border border-white/60 shadow-sm flex flex-col items-center justify-center text-center group/stat hover:bg-white transition-all hover:shadow-md">
                        <CreditCard size={16} className="text-slate-400 mb-1 group-hover/stat:text-emerald-500 transition-colors" />
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">費用 Fare</div>
                        <div className="text-sm font-black text-slate-900">{fareLabel || '—'}</div>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-white/50 border border-white/60 shadow-sm flex flex-col items-center justify-center text-center group/stat hover:bg-white transition-all hover:shadow-md">
                        <Repeat size={16} className="text-slate-400 mb-1 group-hover/stat:text-amber-500 transition-colors" />
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">轉乘 Transfer</div>
                        <div className="text-sm font-black text-slate-900">{transferLabel}</div>
                    </div>
                </div>

                {/* L4 Intelligence Metrics */}
                {(option.tpi || option.cdr) && (
                    <div className="mt-3 grid grid-cols-2 gap-3">
                        {option.tpi && (
                            <div className="p-3 rounded-2xl bg-indigo-50/50 border border-indigo-100/50 flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${option.tpi.score <= 30 ? 'bg-emerald-500 text-white' :
                                    option.tpi.score <= 60 ? 'bg-amber-500 text-white' : 'bg-rose-500 text-white'
                                    } shadow-sm`}>
                                    <Zap size={14} />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-[8px] font-black text-indigo-400 uppercase tracking-tighter">轉乘辛苦度 TPI</div>
                                    <div className="text-xs font-black text-slate-700 truncate">
                                        {option.tpi.score} - {
                                            locale === 'ja' ? (option.tpi.level === 'easy' ? '快適' : option.tpi.level === 'normal' ? '普通' : '大変') :
                                                locale === 'en' ? option.tpi.level.toUpperCase() :
                                                    (option.tpi.level === 'easy' ? '輕鬆' : option.tpi.level === 'normal' ? '普通' : '辛苦')
                                        }
                                    </div>
                                </div>
                            </div>
                        )}
                        {option.cdr && (
                            <div className="p-3 rounded-2xl bg-emerald-50/50 border border-emerald-100/50 flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${option.cdr.riskLevel === 'low' ? 'bg-emerald-500 text-white' :
                                    option.cdr.riskLevel === 'medium' ? 'bg-amber-500 text-white' : 'bg-rose-500 text-white'
                                    } shadow-sm`}>
                                    {option.cdr.riskLevel === 'low' ? <ShieldCheck size={14} /> : <AlertTriangle size={14} />}
                                </div>
                                <div className="min-w-0">
                                    <div className="text-[8px] font-black text-emerald-500 uppercase tracking-tighter">延誤連鎖風險 CDR</div>
                                    <div className="text-xs font-black text-slate-700 truncate">
                                        {Math.round(option.cdr.overallSuccessRate * 100)}% {
                                            locale === 'ja' ? (option.cdr.riskLevel === 'low' ? '低リスク' : 'リスクあり') :
                                                locale === 'en' ? option.cdr.riskLevel.toUpperCase() :
                                                    (option.cdr.riskLevel === 'low' ? '低風險' : '有風險')
                                        }
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Next Departure Banner */}
                {option.nextDeparture && (
                    <div className="mt-4 rounded-2xl bg-indigo-600 p-5 relative overflow-hidden group/next shadow-lg shadow-indigo-200/50">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl transition-transform group-hover/next:scale-125" />
                        <div className="flex items-center justify-between gap-3 relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-sm border border-white/20">
                                    <Clock size={18} />
                                </div>
                                <div>
                                    <div className="text-[10px] font-black text-indigo-100/60 uppercase tracking-widest leading-none mb-1.5">
                                        {locale === 'ja' ? '次発 Departure' : '下一班 Next Departure'}
                                    </div>
                                    <div className="text-lg font-black text-white leading-none tracking-tight">
                                        {option.nextDeparture}
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-black text-white">
                                    {countdownMin === null
                                        ? '—'
                                        : countdownMin === 0
                                            ? (locale === 'ja' ? '即時' : '即將 Arriving')
                                            : (locale === 'ja' ? `${countdownMin} 分` : `${countdownMin} min`)}
                                </div>
                            </div>
                        </div>
                        {countdownMin !== null && (
                            <div className="mt-4 h-1.5 rounded-full bg-white/20 overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.max(0, Math.min(100, Math.round((1 - Math.min(15, countdownMin) / 15) * 100)))}%` }}
                                    className="h-full bg-white rounded-full"
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Steps Section */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="px-6 pb-6 pt-2">
                            <div className="rounded-[2.5rem] bg-white/40 backdrop-blur-md border border-white/60 p-6 shadow-inner">
                                <div className="flex items-center gap-2 mb-6 px-1">
                                    <div className="w-1 h-4 bg-indigo-500 rounded-full" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                        {locale === 'ja' ? 'ルート詳細 Route Details' : '路線詳情 Route Details'}
                                    </span>
                                </div>
                                <div className="space-y-6">
                                    {option.steps.map((step, i) => {
                                        const meta = parseStepKind(step);
                                        const railwayId = meta.kind === 'train' ? step.railwayId : undefined;
                                        const c = getRailwayColorClasses(railwayId);
                                        return (
                                            <div key={i} className="relative pl-12">
                                                {i < option.steps.length - 1 && (
                                                    <div className="absolute left-[1.125rem] top-10 bottom-[-1.5rem] w-0.5 bg-slate-200/60 rounded-full" />
                                                )}
                                                <div className="absolute left-0 top-0.5 w-9 h-9 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center z-10 group-hover:border-indigo-200 transition-colors">
                                                    {meta.kind === 'train' ? (
                                                        <span className={`w-3 h-3 rounded-full ${c.dot} shadow-sm shadow-black/10 animate-pulse`} />
                                                    ) : (
                                                        <span className="text-base">{meta.icon}</span>
                                                    )}
                                                </div>
                                                <div className="p-4 rounded-2xl bg-white/80 border border-white/60 shadow-sm text-sm font-bold text-slate-700 leading-relaxed hover:bg-white hover:shadow-md transition-all">
                                                    {step.text}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
