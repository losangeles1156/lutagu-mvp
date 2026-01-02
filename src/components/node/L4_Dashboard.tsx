'use client';

import React, { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { UserPreferences } from '@/types/lutagu_l4';
import { Info, AlertTriangle, Lightbulb, MapPin, ChevronRight, HelpCircle, Navigation, Train, Clock, Coins } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';

// Types for Card response (Mirroring API response)
interface ActionCard {
    id: string;
    type: 'primary' | 'warning' | 'info' | 'secondary' | 'ai_suggestion' | 'seasonal' | 'ticket_advice' | 'timing';
    icon: string;
    title: string;
    description: string;
    priority: number;
    actionLabel?: string;
    actionUrl?: string;
    _debug_reason?: string;
}

// Route planning types
interface RouteSegment {
    from: string;
    to: string;
    line: string;
    lineColor?: string;
    duration: number;
    transfer?: boolean;
}

interface RouteOption {
    id: string;
    type: 'primary' | 'alternative';
    segments: RouteSegment[];
    totalDuration: number;
    totalFare: number;
    transferCount: number;
    priority: number;
    tags: string[];
    warnings: string[];
    tips: string[];
}

interface RouteResponse {
    routes: RouteOption[];
    contextAlerts: string[];
    expertTips: string[];
}

interface L4DashboardProps {
    currentNodeId: string;
    locale?: 'zh-TW' | 'ja' | 'en';
}

export default function L4_Dashboard({ currentNodeId, locale = 'zh-TW' }: L4DashboardProps) {
    // 1. State Management
    const [preferences, setPreferences] = useState<UserPreferences>({
        accessibility: { wheelchair: false, stroller: false, visual_impairment: false, elderly: false },
        luggage: { large_luggage: false, multiple_bags: false },
        travel_style: { rushing: false, budget: false, comfort: false, avoid_crowd: false, avoid_rain: false },
        companions: { with_children: false, family_trip: false }
    });

    const [cards, setCards] = useState<ActionCard[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Route Planning State
    const [destination, setDestination] = useState<string>('');
    const [destinationId, setDestinationId] = useState<string>('');
    const [routeData, setRouteData] = useState<RouteResponse | null>(null);
    const [isLoadingRoute, setIsLoadingRoute] = useState(false);
    const [showRoutes, setShowRoutes] = useState(false);

    // 2. Fetch Logic
    const fetchRecommendations = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/l4/recommend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    stationId: currentNodeId,
                    userPreferences: preferences,
                    locale
                })
            });
            const data = await res.json();
            if (data.cards) {
                setCards(data.cards);
            }
        } catch (error) {
            console.error('Failed to fetch recommendations:', error);
        } finally {
            setIsLoading(false);
        }
    }, [currentNodeId, preferences, locale]);

    // Initial fetch and fetch on preference change
    useEffect(() => {
        fetchRecommendations();
    }, [fetchRecommendations]);

    // Fetch route suggestions
    const fetchRoute = useCallback(async () => {
        if (!destinationId) return;

        setIsLoadingRoute(true);
        setShowRoutes(true);

        try {
            const res = await fetch('/api/l4/route', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    from: currentNodeId,
                    to: destinationId,
                    userPreferences: preferences,
                    locale
                })
            });

            const data: RouteResponse = await res.json();
            setRouteData(data);
        } catch (error) {
            console.error('Failed to fetch route:', error);
        } finally {
            setIsLoadingRoute(false);
        }
    }, [currentNodeId, destinationId, preferences, locale]);

    // Popular destinations (Quick access)
    const popularDestinations = [
        { name: locale === 'zh-TW' ? '淺草' : locale === 'ja' ? '浅草' : 'Asakusa', id: 'odpt:Station:TokyoMetro.Asakusa' },
        { name: locale === 'zh-TW' ? '東京站' : locale === 'ja' ? '東京駅' : 'Tokyo Station', id: 'odpt:Station:JR-East.Tokyo' },
        { name: locale === 'zh-TW' ? '新宿' : locale === 'ja' ? '新宿' : 'Shinjuku', id: 'odpt:Station:JR-East.Shinjuku' },
        { name: locale === 'zh-TW' ? '涉谷' : locale === 'ja' ? '渋谷' : 'Shibuya', id: 'odpt:Station:JR-East.Shibuya' }
    ];

    // 3. UI Helpers
    const togglePreference = <C extends keyof UserPreferences>(category: C, key: keyof UserPreferences[C]) => {
        setPreferences(prev => ({
            ...prev,
            [category]: {
                ...prev[category],
                [key]: !prev[category][key]
            }
        }));
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-y-auto pb-24">

            {/* Block 1: User State Selector */}
            <div className="bg-white px-4 py-5 shadow-sm border-b border-gray-100 mb-2">
                <div className="flex items-center gap-2 mb-3">
                    <span className="w-1 h-4 bg-indigo-500 rounded-full" />
                    <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest">
                        {locale === 'zh-TW' ? '您的旅行情境' : 'Context'}
                    </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                    {/* Luggage Group */}
                    <Chip label="🧳 大行李" active={preferences.luggage.large_luggage} onClick={() => togglePreference('luggage', 'large_luggage')} />
                    <Chip label="👶 嬰兒車" active={preferences.accessibility.stroller} onClick={() => togglePreference('accessibility', 'stroller')} />
                    <Chip label="🦽 輪椅" active={preferences.accessibility.wheelchair} onClick={() => togglePreference('accessibility', 'wheelchair')} />
                    <Chip label="⏰ 趕時間" active={preferences.travel_style.rushing} onClick={() => togglePreference('travel_style', 'rushing')} />
                    <Chip label="💰 省錢" active={preferences.travel_style.budget} onClick={() => togglePreference('travel_style', 'budget')} />
                    <Chip label="🌧️ 避雨" active={preferences.travel_style.avoid_rain} onClick={() => togglePreference('travel_style', 'avoid_rain')} />
                </div>
            </div>

            {/* Block 2: Route Planning Input */}
            <div className="bg-white px-4 py-5 shadow-sm border-b border-gray-100 mb-4">
                <div className="flex items-center gap-2 mb-3">
                    <Navigation size={14} className="text-purple-600" />
                    <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest">
                        {locale === 'zh-TW' ? '前往目的地' : locale === 'ja' ? '目的地へ' : 'Destination'}
                    </h3>
                </div>

                {/* Current Station (Read-only) */}
                <div className="mb-3">
                    <div className="text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">
                        {locale === 'zh-TW' ? '從' : locale === 'ja' ? 'から' : 'From'}
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-2">
                            <MapPin size={16} className="text-indigo-600" />
                            <span className="text-sm font-bold text-gray-900">
                                {currentNodeId.split('.').pop()}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Destination Input */}
                <div className="mb-3">
                    <div className="text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">
                        {locale === 'zh-TW' ? '到' : locale === 'ja' ? 'まで' : 'To'}
                    </div>
                    <input
                        type="text"
                        placeholder={locale === 'zh-TW' ? '搜尋車站、地標...' : locale === 'ja' ? '駅・ランドマークを検索' : 'Search station, landmark...'}
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                    />
                </div>

                {/* Popular Destinations */}
                <div className="mb-3">
                    <div className="text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-wider">
                        {locale === 'zh-TW' ? '熱門' : locale === 'ja' ? '人気' : 'Popular'}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {popularDestinations.map((dest) => (
                            <button
                                key={dest.id}
                                onClick={() => {
                                    setDestination(dest.name);
                                    setDestinationId(dest.id);
                                }}
                                className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs font-bold text-gray-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-all"
                            >
                                {dest.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Get Route Button */}
                <button
                    onClick={fetchRoute}
                    disabled={!destinationId || isLoadingRoute}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black text-sm tracking-wide hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    🦌 {locale === 'zh-TW' ? '獲取建議' : locale === 'ja' ? 'おすすめを取得' : 'Get Suggestions'}
                </button>
            </div>

            {/* Block 3: Context Alerts (if route is shown) */}
            {showRoutes && routeData && routeData.contextAlerts.length > 0 && (
                <div className="px-4 mb-4">
                    <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle size={16} className="text-rose-600" />
                            <h4 className="text-xs font-black text-rose-700 uppercase tracking-wider">
                                {locale === 'zh-TW' ? '即時提醒' : locale === 'ja' ? 'リアルタイム情報' : 'Live Alerts'}
                            </h4>
                        </div>
                        <div className="space-y-1">
                            {routeData.contextAlerts.map((alert, idx) => (
                                <p key={idx} className="text-xs text-rose-700 font-medium">{alert}</p>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Block 4: Route Options */}
            {showRoutes && (
                <div className="px-4 mb-4">
                    {isLoadingRoute ? (
                        <div className="space-y-3">
                            <div className="h-40 bg-white rounded-2xl animate-pulse" />
                            <div className="h-32 bg-white rounded-2xl animate-pulse" />
                        </div>
                    ) : routeData && routeData.routes.length > 0 ? (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 mb-2">
                                <Train size={14} className="text-indigo-600" />
                                <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest">
                                    {locale === 'zh-TW' ? '推薦路線' : locale === 'ja' ? 'おすすめルート' : 'Recommended Routes'}
                                </h4>
                            </div>
                            {routeData.routes.map((route, idx) => (
                                <RouteCard key={route.id} route={route} isPrimary={idx === 0} locale={locale} />
                            ))}

                            {/* Expert Tips */}
                            {routeData.expertTips.length > 0 && (
                                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mt-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Lightbulb size={16} className="text-amber-600" />
                                        <h4 className="text-xs font-black text-amber-700 uppercase tracking-wider">
                                            {locale === 'zh-TW' ? '專家知識' : locale === 'ja' ? 'エキスパート情報' : 'Expert Tips'}
                                        </h4>
                                    </div>
                                    <div className="space-y-1">
                                        {routeData.expertTips.map((tip, idx) => (
                                            <p key={idx} className="text-xs text-amber-700 font-medium">{tip}</p>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : null}
                </div>
            )}

            {/* Block 5: General Recommendation Cards */}
            <div className="flex-1 px-4 py-2 space-y-4">
                {isLoading ? (
                    <div className="space-y-4 pt-4">
                        <div className="h-32 bg-white rounded-2xl animate-pulse shadow-sm" />
                        <div className="h-32 bg-white rounded-2xl animate-pulse shadow-sm" />
                    </div>
                ) : cards.length > 0 ? (
                    cards.map(card => (
                        <InsightCard key={card.id} card={card} locale={locale} />
                    ))
                ) : (
                    <div className="text-center py-12 text-gray-400 text-sm">
                        {locale === 'zh-TW' ? '無需特別注意的事項，祝旅途愉快！' : 'All good! Enjoy your trip.'}
                    </div>
                )}
            </div>
        </div>
    );
}

// --- Sub Components ---

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${active
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
        >
            {label}
        </button>
    );
}

// Route Card Component
function RouteCard({ route, isPrimary, locale }: { route: RouteOption, isPrimary: boolean, locale: string }) {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className={`relative rounded-2xl border overflow-hidden transition-all ${
            isPrimary
                ? 'border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50'
                : 'border-gray-100 bg-white'
        }`}>
            {/* Header */}
            <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            {isPrimary && (
                                <span className="px-2 py-0.5 bg-indigo-600 text-white text-[9px] font-black rounded-md uppercase tracking-wider">
                                    {locale === 'zh-TW' ? '推薦' : locale === 'ja' ? 'おすすめ' : 'Recommended'}
                                </span>
                            )}
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500">
                                <Clock size={12} />
                                <span>{route.totalDuration} min</span>
                                <span>•</span>
                                <Coins size={12} />
                                <span>¥{route.totalFare}</span>
                            </div>
                        </div>

                        {/* Route Summary */}
                        <div className="flex items-center gap-2 text-sm font-black text-gray-900">
                            {route.segments.map((seg, idx) => (
                                <React.Fragment key={idx}>
                                    {idx > 0 && <ChevronRight size={14} className="text-gray-300" />}
                                    <span>{seg.to}</span>
                                </React.Fragment>
                            ))}
                        </div>

                        {/* Tags */}
                        {route.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                                {route.tags.map((tag, idx) => (
                                    <span key={idx} className="px-2 py-0.5 bg-white border border-indigo-100 text-indigo-700 text-[9px] font-bold rounded-md">
                                        {tag === 'fastest' && (locale === 'zh-TW' ? '最快' : locale === 'ja' ? '最速' : 'Fastest')}
                                        {tag === 'direct' && (locale === 'zh-TW' ? '直達' : locale === 'ja' ? '直通' : 'Direct')}
                                        {tag === 'wheelchair_accessible' && '♿ ' + (locale === 'zh-TW' ? '無障礙' : locale === 'ja' ? 'バリアフリー' : 'Accessible')}
                                        {tag === 'elevator_available' && '🛗'}
                                        {tag === 'cheapest' && (locale === 'zh-TW' ? '最便宜' : locale === 'ja' ? '最安' : 'Cheapest')}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="ml-2 p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-all"
                    >
                        <ChevronRight
                            size={16}
                            className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                        />
                    </button>
                </div>

                {/* Warnings */}
                {route.warnings.length > 0 && (
                    <div className="mb-2 p-2 bg-amber-50 border border-amber-100 rounded-lg">
                        {route.warnings.map((warning, idx) => (
                            <p key={idx} className="text-[10px] text-amber-700 font-medium">⚠️ {warning}</p>
                        ))}
                    </div>
                )}

                {/* Expanded Details */}
                {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="space-y-3">
                            {route.segments.map((seg, idx) => (
                                <div key={idx} className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: seg.lineColor || '#999' }}>
                                        <Train size={16} className="text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs font-black text-gray-900">{seg.line}</p>
                                        <p className="text-[10px] text-gray-500 font-medium">
                                            {seg.from} → {seg.to} ({seg.duration} min)
                                        </p>
                                        {seg.transfer && (
                                            <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-[9px] font-bold rounded-md">
                                                {locale === 'zh-TW' ? '轉乘' : locale === 'ja' ? '乗り換え' : 'Transfer'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Tips */}
                        {route.tips.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                                {route.tips.map((tip, idx) => (
                                    <p key={idx} className="text-[10px] text-indigo-700 font-medium mb-1">💡 {tip}</p>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function InsightCard({ card, locale }: { card: ActionCard, locale: string }) {
    // Style Mapping based on Card Type
    const getStyle = (type: string) => {
        switch (type) {
            case 'warning':
                return { bg: 'bg-rose-50', border: 'border-rose-100', iconBg: 'bg-rose-100', title: 'text-rose-700' };
            case 'seasonal':
                return { bg: 'bg-purple-50', border: 'border-purple-100', iconBg: 'bg-purple-100', title: 'text-purple-700' };
            case 'ticket_advice':
                return { bg: 'bg-emerald-50', border: 'border-emerald-100', iconBg: 'bg-emerald-100', title: 'text-emerald-700' };
            case 'ai_suggestion':
                return { bg: 'bg-gradient-to-br from-indigo-50 to-purple-50', border: 'border-indigo-100', iconBg: 'bg-white', title: 'text-indigo-700' };
            default:
                return { bg: 'bg-white', border: 'border-gray-100', iconBg: 'bg-gray-50', title: 'text-gray-800' };
        }
    };

    const s = getStyle(card.type);

    return (
        <div className={`relative rounded-2xl border ${s.border} ${s.bg} p-5 shadow-sm transition-all duration-300 hover:shadow-md`}>

            {/* Header */}
            <div className="flex items-start gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl ${s.iconBg} flex items-center justify-center text-xl shrink-0 shadow-sm border border-white/50`}>
                    {card.icon}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                        <h4 className={`text-base font-black ${s.title} leading-tight`}>{card.title}</h4>
                        {/* Debug Info (Hidden by default, can be toggled if needed) */}
                        {/* <div className="group relative">
                            <HelpCircle size={14} className="text-gray-300 cursor-help" />
                             <div className="absolute right-0 top-6 w-48 p-2 bg-gray-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none z-50">
                                {card._debug_reason} ({card.priority})
                            </div>
                        </div> */}
                    </div>
                </div>
            </div>

            {/* Content (Markdown) */}
            <div className="prose prose-sm max-w-none text-gray-600 text-sm leading-relaxed
                prose-headings:font-bold prose-headings:text-gray-800 prose-headings:mb-1 prose-headings:mt-2
                prose-p:m-0 prose-p:mb-2
                prose-strong:text-gray-900 prose-strong:font-black
                prose-ul:m-0 prose-ul:pl-4 prose-li:m-0
                prose-table:border prose-table:border-gray-200 prose-table:rounded-lg prose-table:overflow-hidden prose-table:w-full prose-table:text-xs prose-table:mb-2
                prose-th:bg-gray-100 prose-th:p-2 prose-th:text-left
                prose-td:p-2 prose-td:border-t prose-td:border-gray-100
                [&>*:last-child]:mb-0">

                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {card.description}
                </ReactMarkdown>
            </div>

            {/* Action Button */}
            {card.actionLabel && card.actionUrl && (
                <a
                    href={card.actionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 flex items-center justify-center w-full py-2.5 bg-white border border-gray-200 hover:border-indigo-300 text-gray-700 hover:text-indigo-600 text-xs font-bold rounded-xl transition-all shadow-sm active:scale-[0.98] group"
                >
                    {card.actionLabel}
                    <ChevronRight size={14} className="ml-1 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                </a>
            )}
        </div>
    );
}
