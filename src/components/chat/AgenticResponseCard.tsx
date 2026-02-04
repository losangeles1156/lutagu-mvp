'use client';

import { useMemo } from 'react';
import { RouteResultCard } from '../node/RouteResultCard';
import { ActionCard, Action } from './ActionCard';
import { HackCard } from './HackCard';
import { TrapCard } from './TrapCard';
import { PlaceCard } from '../node/PlaceCard';
import { TimetableCard } from '../node/TimetableCard';
import { useTranslations, useLocale } from 'next-intl';
import { AirportAccessCard } from './AirportAccessCard';

interface AgenticResponseCardProps {
    type: string; // 'options' | 'action' | 'card' ...
    data: any;
    source?: string;
    onAction?: (action: Action) => void;
}

export function AgenticResponseCard({ type, data, source, onAction }: AgenticResponseCardProps) {
    const locale = useLocale();
    const tL4 = useTranslations('l4.dashboard');

    // DEBUG: Log props to understand why cards aren't rendering
    console.log('[DEBUG AgenticResponseCard] Props:', {
        type,
        source,
        hasRoutes: !!data?.routes,
        routesLength: data?.routes?.length,
        dataKeys: Object.keys(data || {})
    });

    // Strategy: Route Synthesizer (List of Routes) or Algorithm Route
    // Support both 'options' (Synthesizer) and 'route' (Algorithm) types
    if ((type === 'options' || type === 'route') && (data?.routes || data?.option)) {
        const routes = data.routes || (data.option ? [data.option] : []);
        if (Array.isArray(routes) && routes.length > 0) {
            return (
                <div className="space-y-4 mt-4 w-full">
                    <div className="flex items-center gap-2 mb-2 px-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-50 px-2 py-0.5 rounded-full">
                            {data.strategy === 'route_synthesizer' ? tL4('synthesis') : tL4('routeFound')}
                        </span>
                        <span className="text-[10px] font-bold text-slate-300">
                            {routes.length} {routes.length > 1 ? tL4('optionsLabel') : tL4('optionLabel')}
                        </span>
                    </div>
                    {/* Strategy Reasoning Summary */}
                    {data.strategy_summary && (
                        <div className="px-4 py-2 mb-2 bg-indigo-50/50 rounded-xl border border-indigo-100/50">
                            <p className="text-xs text-indigo-800 font-medium">💡 {tL4('aiReasoning')}: {data.strategy_summary}</p>
                        </div>
                    )}
                    {routes.map((route: any, idx: number) => (
                        <RouteResultCard
                            key={`${route.id || idx}`}
                            option={route}
                            rank={idx}
                            locale={locale as any}
                        />
                    ))}
                </div>
            );
        }
    }

    // Expert Tips (Deep Research / L4 Knowledge)
    if (type === 'expert_tip' && Array.isArray(data?.results)) {
        return (
            <div className="space-y-3 mt-4 w-full">
                <div className="flex items-center gap-2 mb-1 px-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        {tL4('expertInsights')}
                    </span>
                </div>
                {data.results.map((tip: any, idx: number) => {
                    const action: Action = {
                        type: 'details',
                        target: '', // Placeholder for strict Action interface
                        label: tip.title,
                        title: tip.title,
                        content: tip.content,
                        metadata: {
                            advice: tip.tags?.join(', ')
                        }
                    };

                    const isTrap = tip.type === 'trap' || tip.type === 'warning';
                    // Render HackCard or TrapCard
                    return isTrap ? (
                        <TrapCard key={tip.id || idx} action={action} onClick={onAction || (() => { })} />
                    ) : (
                        <HackCard key={tip.id || idx} action={action} onClick={onAction || (() => { })} />
                    );
                })}
            </div>
        );
    }

    // POI Recommendations
    if (type === 'recommendation' && Array.isArray(data?.results)) {
        return (
            <div className="space-y-3 mt-4 w-full">
                <div className="flex items-center gap-2 mb-1 px-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full">
                        {tL4('recommendations')}
                    </span>
                </div>
                {data.results.map((poi: any, idx: number) => {
                    // Adapt POIDecisionResult to L1Place
                    const l1Place = {
                        id: poi.poiId || poi.id,
                        osm_id: 0,
                        name: poi.name,
                        name_i18n: { en: poi.name, ja: poi.name }, // Best effort
                        category: poi.category,
                        subcategory: poi.categoryTags?.secondary || poi.subcategory,
                        distance_meters: poi.locationTags?.walking_minutes
                            ? poi.locationTags.walking_minutes * 80
                            : (poi.distance_meters || 0),
                        location: { coordinates: [0, 0] as [number, number] },
                        tags: {},
                        priority: poi.relevanceScore ? Math.floor(poi.relevanceScore * 100) : 0
                    };

                    return <PlaceCard key={poi.poiId || idx} place={l1Place as any} isFeatured={idx === 0} />;
                })}
            </div>
        );
    }

    // Timetable Strategy (from TimetableSkill)
    if (type === 'card' && data?.strategy === 'timetable_skill' && data?.timetables) {
        return (
            <div className="mt-4 w-full">
                <div className="flex items-center gap-2 mb-3 px-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                        {tL4('timetableLabel') || '時刻表'}
                    </span>
                </div>
                <TimetableCard data={data} />
            </div>
        );
    }

    // Airport Access Comparison
    if (type === 'airport_access') {
        return <AirportAccessCard data={data} />;
    }

    // Single Action or Card
    if (type === 'action' || type === 'card') {
        const actions = data?.actions || [];
        // If data has 'actions' array (e.g. from L2 disruption action), render list
        if (type === 'action' && Array.isArray(actions) && actions.length > 0) {
            return (
                <div className="space-y-3 mt-4 w-full">
                    {actions.map((act: any, idx: number) => (
                        <ActionCard key={idx} action={act} onClick={onAction || (() => { })} />
                    ))}
                </div>
            );
        }

        // Single action fallback
        const action: Action = {
            type: data.type || 'details',
            label: data.label || tL4('action'),
            target: data.target || '',
            description: data.description,
            title: data.title,
            content: data.content,
            metadata: data.metadata
        };

        return (
            <div className="mt-4 max-w-sm">
                <ActionCard action={action} onClick={onAction || (() => { })} />
            </div>
        );
    }

    // Tool Result Visualization (e.g. TPI)
    if (type === 'tool_result') {
        return null; // Reserved for future tool widgets
    }

    return null;
}
