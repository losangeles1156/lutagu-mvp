'use client';

import { logger } from '@/lib/utils/logger';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useApiFetch } from '@/hooks/useApiFetch';
import { AlertTriangle, Clock, Loader2, Map as MapIcon, MessageSquare, Sparkles, Ticket, ExternalLink, MessageCircle, Snowflake, Lightbulb, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { resolveHubStationMembers } from '@/lib/constants/stationLines';
import type { Station } from '@/types/station';
import type { OdptRailwayFare, OdptStationTimetable } from '@/lib/odpt/types';
import type { L4Knowledge } from '@/lib/types/stationStandard';
import {
    buildAmenitySuggestion, buildL4DefaultQuestionTemplates, buildFareSuggestion, buildRouteSuggestion,
    buildStatusSuggestion, buildTimetableSuggestion, classifyQuestion, extractOdptStationIds,
    filterFaresForOrigin, filterTimetablesForStation, findDemoScenario, normalizeOdptStationId,
    type L4DemandState, type L4IntentKind, type L4QuestionTemplate, type L4TemplateCategory,
    type L4Suggestion, type EnrichedRouteOption, type SupportedLocale,
} from '@/lib/l4/assistantEngine';
import type { DemoScenario } from '@/lib/l4/demoScenarios';
import { RouteResultCard } from '@/components/node/RouteResultCard';
import { InsightCards } from '@/components/node/InsightCards';
import { StrategyCards } from '@/components/node/StrategyCards';
import type { MatchedStrategyCard, UserPreferences, RecommendRequest } from '@/types/lutagu_l4';
import { useUIStore } from '@/stores/uiStore';
import { L4FormCard } from '@/components/node/L4FormCard';
import { L4DemandChips } from '@/components/node/L4DemandChips';
import { L4TemplateSelector, L4TemplateList } from '@/components/node/L4TemplateSelector';
import { L4_Chat } from '@/components/node/L4_Chat';
import { IntentSelector } from '@/components/node/IntentSelector';
import { getLocaleString } from '@/lib/utils/localeUtils';
import { L4KnowledgeSection } from '@/components/node/L4KnowledgeSection';

interface L4DashboardProps {
    currentNodeId: string;
    locale?: SupportedLocale;
    l4Knowledge?: L4Knowledge;
}

type L4ViewMode = 'recommendations' | 'planner' | 'chat';
type L4Task = 'route' | 'time' | 'qa';

function RecommendationSkeleton() {
    return (
        <div className="space-y-4 animate-pulse">
            {[1, 2, 3].map(i => (
                <div key={i} className="rounded-2xl bg-slate-50 border border-slate-100 p-4 flex items-start gap-3">
                    <div className="shrink-0 w-10 h-10 rounded-xl bg-slate-200" />
                    <div className="flex-1 space-y-2">
                        <div className="h-4 bg-slate-200 rounded w-3/4" />
                        <div className="h-3 bg-slate-200 rounded w-full" />
                        <div className="h-3 bg-slate-200 rounded w-5/6" />
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function L4_Dashboard({ currentNodeId, l4Knowledge }: L4DashboardProps) {
    const t = useTranslations('l4.dashboard');
    const tL4 = useTranslations('l4');
    const uiLocale = useLocale() as SupportedLocale;
    const stationId = useMemo(() => normalizeOdptStationId(String(currentNodeId || '').trim()), [currentNodeId]);
    const setChatOpen = useUIStore(state => state.setChatOpen);
    const { fetchJson: fetchJsonCached } = useApiFetch();

    const [viewMode, setViewMode] = useState<L4ViewMode>('recommendations');
    const [recommendations, setRecommendations] = useState<MatchedStrategyCard[]>([]);
    const [isRecommending, setIsRecommending] = useState(false);
    const [markdownKnowledge, setMarkdownKnowledge] = useState<any[]>([]);
    const [isKnowledgeLoading, setIsKnowledgeLoading] = useState(false);
    const [knowledgeFilter, setKnowledgeFilter] = useState<'all' | 'traps' | 'hacks'>('all');

    const mapDemandToPreferences = useCallback((d: L4DemandState): UserPreferences => ({
        accessibility: { wheelchair: d.wheelchair, stroller: d.stroller, visual_impairment: d.vision, elderly: d.senior },
        luggage: { large_luggage: d.largeLuggage, multiple_bags: false },
        travel_style: { rushing: d.rushing, budget: d.budget, comfort: d.comfort, avoid_crowd: d.avoidCrowds, avoid_rain: d.avoidRain },
        companions: { with_children: d.stroller, family_trip: d.senior },
    }), []);

    const [demand, setDemand] = useState<L4DemandState>({
        wheelchair: false, stroller: false, vision: false, senior: false,
        largeLuggage: false, lightLuggage: false, rushing: false, budget: false,
        comfort: false, avoidCrowds: false, avoidRain: false,
    });

    const [wantsExpertTips, setWantsExpertTips] = useState(false);
    const [activeKind, setActiveKind] = useState<L4IntentKind | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string>('');
    const [task, setTask] = useState<L4Task>('route');
    const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
    const [templateCategory, setTemplateCategory] = useState<L4TemplateCategory>('basic');

    const [fareData, setFareData] = useState<OdptRailwayFare[] | null>(null);
    const [timetableData, setTimetableData] = useState<OdptStationTimetable[] | null>(null);
    const [suggestion, setSuggestion] = useState<L4Suggestion | null>(null);
    const [cachedRouteResult, setCachedRouteResult] = useState<{ origin: string; destination: string; options: EnrichedRouteOption[]; text: string; } | null>(null);
    const [activeDemo, setActiveDemo] = useState<DemoScenario | null>(null);
    const [demoStepIndex, setDemoStepIndex] = useState(0);

    const [originInput, setOriginInput] = useState('');
    const [selectedOrigin, setSelectedOrigin] = useState<Station | null>(null);
    const [destinationInput, setDestinationInput] = useState('');
    const [selectedDestination, setSelectedDestination] = useState<Station | null>(null);
    const [selectedDirection, setSelectedDirection] = useState<string | null>(null);
    const [question, setQuestion] = useState('');
    const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
    const [isMenuExpanded, setIsMenuExpanded] = useState(false); // 預設收起需求選單以最大化對話空間

    const inputRef = useRef<HTMLInputElement | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);

    // Handle scroll for compact header
    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        const scrollTop = e.currentTarget.scrollTop;
        setIsHeaderCollapsed(scrollTop > 50);
    }, []);

    const templatesContainerRef = useRef<HTMLDivElement | null>(null);
    const requestAbortRef = useRef<AbortController | null>(null);
    const requestSeqRef = useRef(0);

    // Build profile data for L4_Chat - use 'any' to bypass strict type checking for this integration
    const stationProfile = useMemo(() => ({
        id: stationId,
        tier: 'minor' as const,
        name: { ja: '', en: '', zh: '' },
        description: { ja: '', en: '', zh: '' },
        l1_dna: { categories: {}, vibe_tags: [], last_updated: new Date().toISOString() },
        l2: { lines: [], weather: { temp: 0, condition: 'Clear', windSpeed: 0 }, crowd: { level: 2, trend: 'stable' as const, userVotes: { total: 0, distribution: [0, 0, 0, 0, 0] } } },
        l3_facilities: [],
        l4_cards: [],
        l4_knowledge: l4Knowledge
    }) as any, [stationId, l4Knowledge]);

    useEffect(() => {
        const fetchRecommendations = async () => {
            if (!stationId || !/^odpt[.:]Station:/.test(stationId)) return;
            setIsRecommending(true);
            try {
                const prefs = mapDemandToPreferences(demand);
                const reqBody: RecommendRequest = { stationId, userPreferences: prefs, locale: uiLocale as 'zh-TW' | 'ja' | 'en' };
                const res = await fetch('/api/l4/recommend', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(reqBody) });
                if (res.ok) { const data = await res.json(); setRecommendations(data.cards || []); }
            } catch (err) { logger.error('[L4 Dashboard] Failed to fetch recommendations:', err); }
            finally { setIsRecommending(false); }
        };
        fetchRecommendations();
    }, [stationId, demand, uiLocale, mapDemandToPreferences]);

    useEffect(() => {
        const fetchMarkdownKnowledge = async () => {
            if (!stationId || !/^odpt[.:]Station:/.test(stationId)) return;
            setIsKnowledgeLoading(true);
            try {
                const res = await fetch(`/api/l4/knowledge?type=station&id=${stationId}&locale=${uiLocale}`);
                if (res.ok) {
                    const data = await res.json();
                    setMarkdownKnowledge(data.tips || []);
                }
            } catch (err) {
                logger.error('[L4 Dashboard] Failed to fetch markdown knowledge:', err);
            } finally {
                setIsKnowledgeLoading(false);
            }
        };
        fetchMarkdownKnowledge();
    }, [stationId, uiLocale]);

    useEffect(() => {
        setActiveKind(null); setError(''); setFareData(null); setTimetableData(null); setSuggestion(null);
        setCachedRouteResult(null); setActiveDemo(null); setDemoStepIndex(0); setQuestion('');
        setTask('route'); setIsTemplatesOpen(false); setTemplateCategory('basic');
        setOriginInput(''); setSelectedOrigin(null); setDestinationInput(''); setSelectedDestination(null);
        setSelectedDirection(null);
        requestAbortRef.current?.abort();
    }, [stationId]);



    // Handle click outside for templates
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent | TouchEvent) => {
            if (templatesContainerRef.current && !templatesContainerRef.current.contains(e.target as Node)) {
                setIsTemplatesOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside, { passive: true });
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, []);

    const templates = useMemo(() => buildL4DefaultQuestionTemplates({ originStationId: selectedOrigin?.id || stationId, locale: uiLocale }), [stationId, uiLocale, selectedOrigin]);
    const visibleTemplates = useMemo(() => templates.filter(t => t.category === templateCategory && (t.kind === task)), [templates, templateCategory, task]);

    const getStationDisplayName = useCallback((s: Station) => {
        const locale = uiLocale as SupportedLocale;
        if (locale === 'zh-TW') return s.name['zh-TW'] || s.name.ja || s.name.en || s.id;
        if (locale === 'ja') return s.name.ja || s.name['zh-TW'] || s.name.en || s.id;
        return s.name.en || s.name.ja || s.name['zh-TW'] || s.id;
    }, [uiLocale]);

    const resolveStationById = useCallback(async (stationIdOrQuery: string): Promise<Station | null> => {
        const q = String(stationIdOrQuery || '').trim();
        if (!q) return null;
        try {
            const data = await fetchJsonCached<{ stations?: Station[] }>(`/api/stations/search?q=${encodeURIComponent(q)}`, { ttlMs: 60_000 });
            const stations = (data?.stations || []) as Station[];
            if (stations.length === 0) return null;
            const exact = stations.find(s => normalizeOdptStationId(s.id) === normalizeOdptStationId(q));
            return exact || stations[0];
        } catch { return null; }
    }, [fetchJsonCached]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (!stationId || selectedOrigin) return;
            const s = await resolveStationById(stationId);
            if (!cancelled && s) { setSelectedOrigin(s); setOriginInput(getStationDisplayName(s)); }
            else if (!cancelled) { setOriginInput(''); }
        })();
        return () => { cancelled = true; };
    }, [getStationDisplayName, resolveStationById, selectedOrigin, stationId]);

    const applyTemplate = useCallback(async (tpl: L4QuestionTemplate) => {
        setError(''); setIsTemplatesOpen(false); setTask(tpl.kind as L4Task);
        if (tpl.preset?.demand) { setDemand(prev => ({ ...prev, ...tpl.preset!.demand })); }
        if (tpl.preset?.originStationId) {
            const s = await resolveStationById(tpl.preset.originStationId);
            if (s) { setSelectedOrigin(s); setOriginInput(getStationDisplayName(s)); }
        }
        if (tpl.preset?.destinationStationId) {
            const s = await resolveStationById(tpl.preset.destinationStationId);
            if (s) { setSelectedDestination(s); setDestinationInput(getStationDisplayName(s)); }
        }
        if (tpl.preset?.originStationId || tpl.preset?.destinationStationId || tpl.preset?.demand) { setQuestion(''); }
        else if (tpl.text) { setQuestion(tpl.description || ''); }
        requestAnimationFrame(() => inputRef.current?.focus());
    }, [getStationDisplayName, resolveStationById]);

    const canAsk = useMemo(() => {
        if (isLoading) return false;
        const originId = selectedOrigin?.id || stationId;
        const originOk = /^odpt[.:]Station:/.test(originId);
        if (!originOk) return false;
        if (task === 'time') return true;
        if (task === 'route') return Boolean(selectedDestination?.id);
        if (task === 'qa') return true;
        return true;
    }, [isLoading, selectedOrigin, selectedDestination, stationId, task]);

    const buildInternalQueryText = useCallback(() => {
        const originId = normalizeOdptStationId(selectedOrigin?.id || stationId);
        const destId = selectedDestination?.id ? normalizeOdptStationId(selectedDestination.id) : '';
        const note = String(question || '').trim();
        if (task === 'time') return `timetable station: ${originId}${note ? `\n${note}` : ''}`;
        if (task === 'qa') return `knowledge station: ${originId}${note ? `\n${note}` : ''}`;
        return `route from: ${originId} to: ${destId}${note ? `\n${note}` : ''}`;
    }, [question, selectedDestination, selectedOrigin, stationId, task]);

    useEffect(() => {
        if (task === 'time' && stationId && !timetableData) {
            setIsLoading(true);
            const allMembers = resolveHubStationMembers(stationId);
            const prioritized = [
                ...allMembers.filter(id => id.includes('TokyoMetro') || id.includes('Toei')),
                ...allMembers.filter(id => id.includes('JR-East')),
                ...allMembers.filter(id => !id.includes('TokyoMetro') && !id.includes('Toei') && !id.includes('JR-East'))
            ];
            const uniqueIds = [...new Set(prioritized)];
            Promise.all(uniqueIds.map(memberId => fetchJsonCached<OdptStationTimetable[]>(`/api/odpt/timetable?station=${encodeURIComponent(memberId)}&raw=1`, { ttlMs: 5 * 60_000 }).catch(() => [] as OdptStationTimetable[])))
                .then(results => {
                    const allTimetables = results.flat();
                    if (allTimetables.length > 0) {
                        const filtered = filterTimetablesForStation(allTimetables, stationId);
                        setTimetableData(filtered.length > 0 ? filtered : allTimetables);
                    } else { setTimetableData([]); }
                })
                .finally(() => { setIsLoading(false); });
        }
    }, [task, stationId, timetableData, fetchJsonCached]);

    const askWithText = async (rawText: string) => {
        const text = String(rawText || '').trim();
        if (!text || isLoading) return;
        requestAbortRef.current?.abort();
        const controller = new AbortController();
        requestAbortRef.current = controller;
        const mySeq = ++requestSeqRef.current;
        setError(''); setActiveKind(null); setFareData(null); setTimetableData(null); setSuggestion(null);

        const demo = findDemoScenario(text);
        if (demo) { setActiveDemo(demo); setDemoStepIndex(0); return; }

        setIsLoading(true);
        const currentOriginId = selectedOrigin?.id || stationId;

        try {
            const intent = classifyQuestion(text, uiLocale);
            const kind = intent.kind;
            if (!/^odpt[.:]Station:/.test(currentOriginId)) {
                setError(t('errors.unresolvedStation'));
                setActiveKind('unknown'); return;
            }
            if (kind === 'unknown') {
                setError(t('errors.pickTask'));
                setActiveKind('unknown'); return;
            }
            setActiveKind(kind);
            const currentOriginName = selectedOrigin ? getStationDisplayName(selectedOrigin) : undefined;
            const currentDestName = selectedDestination ? getStationDisplayName(selectedDestination) : undefined;

            if (kind === 'status') { setSuggestion(buildStatusSuggestion({ stationId: currentOriginId, stationName: currentOriginName, text, verified: true })); return; }
            if (kind === 'amenity') { setSuggestion(buildAmenitySuggestion({ stationId: currentOriginId, stationName: currentOriginName, text, demand, verified: true })); return; }

            if (kind === 'fare') {
                if (mySeq !== requestSeqRef.current) return;
                const ids = extractOdptStationIds(text);
                const toStationId = selectedDestination?.id || intent.toStationId || (ids.find(id => normalizeOdptStationId(id) !== currentOriginId) ?? '');
                if (!toStationId) {
                    setSuggestion(buildFareSuggestion({ originStationId: currentOriginId, originStationName: currentOriginName, destinationStationId: undefined, demand, verified: false }));
                    setError(t('errors.selectDestination'));
                    return;
                }
                const from = normalizeOdptStationId(currentOriginId);
                const to = normalizeOdptStationId(toStationId);
                try {
                    const json = await fetchJsonCached<any>(`/api/odpt/fare?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { ttlMs: 10 * 60_000, signal: controller.signal });
                    if (mySeq !== requestSeqRef.current) return;
                    const items = Array.isArray(json?.fares) ? json.fares : [];
                    if (!json?.found || items.length === 0) { setFareData([]); setError(t('errors.noFareFound')); setSuggestion(buildFareSuggestion({ originStationId: from, originStationName: currentOriginName, destinationStationId: to, destinationStationName: currentDestName, demand, verified: false })); return; }
                    const odptFares: OdptRailwayFare[] = items.map((f: any, idx: number) => ({ '@id': `l4:fare:${json.source || 'unknown'}:${f.operator}:${f.from}:${f.to}:${idx}`, '@type': 'odpt:RailwayFare', 'odpt:operator': f.operator.startsWith('odpt.Operator:') ? f.operator : `odpt.Operator:${f.operator}`, 'odpt:fromStation': f.from, 'odpt:toStation': f.to, 'odpt:ticketFare': f.ticket, 'odpt:icCardFare': f.ic }));
                    const filtered = filterFaresForOrigin(odptFares, from);
                    setFareData(filtered);
                    setSuggestion(buildFareSuggestion({ originStationId: from, originStationName: currentOriginName, destinationStationId: to, destinationStationName: currentDestName, demand, verified: true }));
                    return;
                } catch (e: any) { if (e?.name !== 'AbortError') { setError(t('errors.fareQueryFailed')); setSuggestion(buildFareSuggestion({ originStationId: from, originStationName: currentOriginName, destinationStationId: to, demand, verified: false })); } return; }
            }

            if (kind === 'timetable') {
                const allMembers = resolveHubStationMembers(currentOriginId);
                const prioritized = [
                    ...allMembers.filter(id => id.includes('TokyoMetro') || id.includes('Toei')),
                    ...allMembers.filter(id => id.includes('JR-East')),
                    ...allMembers.filter(id => !id.includes('TokyoMetro') && !id.includes('Toei') && !id.includes('JR-East'))
                ];
                const uniqueIds = [...new Set(prioritized)];
                let allTimetables: OdptStationTimetable[] = [];
                let fetchedAny = false;
                for (const memberId of uniqueIds) {
                    try {
                        const json = await fetchJsonCached<OdptStationTimetable[]>(`/api/odpt/timetable?station=${encodeURIComponent(memberId)}&raw=1`, { ttlMs: 30_000, signal: controller.signal });
                        if (mySeq !== requestSeqRef.current) return;
                        if (json && json.length > 0) { allTimetables = [...allTimetables, ...json]; fetchedAny = true; }
                    } catch (e: any) { if (e?.name !== 'AbortError') logger.warn(`[Timetable] Failed for ${memberId}:`, e); }
                }
                if (fetchedAny) { const filtered = filterTimetablesForStation(allTimetables, currentOriginId); setTimetableData(filtered.length > 0 ? filtered : allTimetables); setSuggestion(buildTimetableSuggestion({ stationId: currentOriginId, demand, verified: true })); return; }
                setTimetableData([]); setSuggestion(buildTimetableSuggestion({ stationId: currentOriginId, demand, verified: false })); return;
            }

            if (kind === 'route') {
                let destinationStationId = selectedDestination?.id ? normalizeOdptStationId(selectedDestination.id) : '';
                if (!destinationStationId && intent.toStationId) { destinationStationId = normalizeOdptStationId(intent.toStationId); }
                if (!destinationStationId) { const ids = extractOdptStationIds(text).map(normalizeOdptStationId); destinationStationId = ids.find(id => id !== currentOriginId) || ''; }
                if (!destinationStationId) { setError(t('errors.destinationRequired')); setSuggestion(buildRouteSuggestion({ originStationId: currentOriginId, destinationStationId: currentOriginId, demand, verified: false, options: [] })); return; }
                if (cachedRouteResult && cachedRouteResult.origin === currentOriginId && cachedRouteResult.destination === destinationStationId && cachedRouteResult.text === text) { setSuggestion(buildRouteSuggestion({ originStationId: currentOriginId, destinationStationId, demand, verified: true, options: cachedRouteResult.options, text })); return; }
                try {
                    const json = await fetchJsonCached<any>(`/api/odpt/route?from=${encodeURIComponent(currentOriginId)}&to=${encodeURIComponent(destinationStationId)}&locale=${uiLocale}`, { ttlMs: 30_000, signal: controller.signal });
                    if (mySeq !== requestSeqRef.current) return;
                    const apiRoutes = Array.isArray(json?.routes) ? json.routes : [];
                    const apiError = typeof json?.error === 'string' ? json.error : '';
                    if (apiRoutes.length === 0) { setError(apiError || t('errors.noRouteFound')); }
                    else { setError(''); }
                    const baseOptions = apiRoutes.map((r: any): EnrichedRouteOption => ({ label: r.label, steps: r.steps, sources: r.sources || [{ type: 'odpt:Railway', verified: true }], railways: r.railways, transfers: Number(r.transfers ?? 0), duration: typeof r.duration === 'number' ? r.duration : undefined, fare: r.fare, nextDeparture: r.nextDeparture }));
                    setCachedRouteResult({ origin: currentOriginId, destination: destinationStationId, options: baseOptions, text });
                    setSuggestion(buildRouteSuggestion({ originStationId: currentOriginId, destinationStationId, demand, verified: true, options: baseOptions, text }));
                    return;
                } catch (e: any) { if (e?.name !== 'AbortError') { setError(t('errors.routePlanningFailed')); setSuggestion(buildRouteSuggestion({ originStationId: currentOriginId, destinationStationId, demand, verified: false, options: [] })); } return; }
            }
        } catch (e: any) { if (e?.name !== 'AbortError') { setError(String(e?.message || t('errors.unknown'))); } }
        finally { if (mySeq === requestSeqRef.current) { setIsLoading(false); } }
    };

    const ask = async () => { await askWithText(buildInternalQueryText()); };
    const swapStations = () => { const temp = selectedOrigin; const tempInput = originInput; setSelectedOrigin(selectedDestination); setOriginInput(destinationInput); setSelectedDestination(temp); setDestinationInput(tempInput); };

    const availableDirections = useMemo(() => {
        if (!timetableData) return [];
        return Array.from(new Set(timetableData.map(t => t['odpt:railDirection']).filter(Boolean))) as string[];
    }, [timetableData]);


    // Prevent rendering with unknown/invalid station ID
    if (!currentNodeId || currentNodeId === 'unknown' || currentNodeId === 'undefined') {
        return (
            <div className="w-full h-full bg-slate-50 p-4">
                <RecommendationSkeleton />
            </div>
        );
    }

    return (
        <div className="w-full h-full flex flex-col bg-slate-50/50 overflow-hidden">
            {/* Header */}
            <motion.div
                initial={false}
                animate={{
                    height: isHeaderCollapsed ? '56px' : 'auto',
                    paddingTop: isHeaderCollapsed ? '8px' : '16px',
                    paddingBottom: isHeaderCollapsed ? '8px' : '8px'
                }}
                className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-sm px-4 flex items-center gap-3 border-b border-slate-100/50"
            >
                <div className="flex-1 overflow-hidden">
                    <ViewModeSelector activeMode={viewMode} onSelect={setViewMode} tL4={tL4} isCompact={isHeaderCollapsed} />
                </div>
            </motion.div>

            {/* Main Content */}
            <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto"
            >
                <AnimatePresence mode="wait">
                    {viewMode === 'recommendations' ? (
                        <motion.div
                            key="recommendations"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="px-4 py-6 space-y-8"
                        >
                            {/* AI Intelligence Hub - Main Feature Highlight */}
                            <section className="relative">
                                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-[2.5rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
                                <div className="relative bg-white/80 backdrop-blur-2xl rounded-[2rem] border border-white/60 p-6 shadow-2xl shadow-indigo-100/50 overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4">
                                        <div className="flex items-center gap-1.5 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                                            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{t('aiPerceptionActive')}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center text-white shadow-xl shadow-indigo-200 ring-4 ring-white">
                                            <Sparkles size={28} className="animate-pulse" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-black text-slate-900 tracking-tight">
                                                {t('aiAssistant')}
                                            </h2>
                                            <p className="text-xs font-bold text-slate-500 mt-0.5">
                                                {t('aiSubtitle')}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            onClick={() => setKnowledgeFilter(prev => prev === 'traps' ? 'all' : 'traps')}
                                            className={`
                                                relative rounded-2xl p-4 border text-left transition-all active:scale-[0.98] outline-none ring-2 ring-transparent
                                                ${knowledgeFilter === 'traps'
                                                    ? 'bg-red-50 border-red-200 ring-red-200/50 shadow-sm'
                                                    : 'bg-slate-50/50 border-slate-100/50 hover:bg-white hover:shadow-md'
                                                }
                                                ${knowledgeFilter !== 'all' && knowledgeFilter !== 'traps' ? 'opacity-50 grayscale' : 'opacity-100'}
                                            `}
                                        >
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center text-red-600">
                                                    <AlertTriangle size={14} />
                                                </div>
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('trapGuide')}</span>
                                            </div>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-base font-black text-slate-800">{l4Knowledge?.traps?.length || 0}</span>
                                                <span className="text-[9px] font-black text-slate-500 uppercase">{t('expertTips')}</span>
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => setKnowledgeFilter(prev => prev === 'hacks' ? 'all' : 'hacks')}
                                            className={`
                                                relative rounded-2xl p-4 border text-left transition-all active:scale-[0.98] outline-none ring-2 ring-transparent
                                                ${knowledgeFilter === 'hacks'
                                                    ? 'bg-emerald-50 border-emerald-200 ring-emerald-200/50 shadow-sm'
                                                    : 'bg-slate-50/50 border-slate-100/50 hover:bg-white hover:shadow-md'
                                                }
                                                ${knowledgeFilter !== 'all' && knowledgeFilter !== 'hacks' ? 'opacity-50 grayscale' : 'opacity-100'}
                                            `}
                                        >
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                                                    <Lightbulb size={14} />
                                                </div>
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('proHacksLabel')}</span>
                                            </div>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-base font-black text-slate-800">{l4Knowledge?.hacks?.length || 0}</span>
                                                <span className="text-[9px] font-black text-slate-500 uppercase">{t('proHacks')}</span>
                                            </div>
                                        </button>
                                    </div>

                                    <button
                                        onClick={() => setViewMode('chat')}
                                        className="w-full mt-6 py-3.5 bg-slate-900 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-indigo-600 transition-all active:scale-[0.98] shadow-lg shadow-slate-200"
                                    >
                                        <MessageSquare size={16} />
                                        {t('startChat')}
                                    </button>
                                </div>
                            </section>

                            {isRecommending ? (
                                <RecommendationSkeleton />
                            ) : recommendations.length > 0 ? (
                                <StrategyCards cards={recommendations} locale={uiLocale} />
                            ) : (
                                <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-3 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                                    <Sparkles size={40} className="opacity-10" />
                                    <div className="text-center">
                                        <p className="text-sm font-black text-slate-500">
                                            {t('discoverInspiration')}
                                        </p>
                                        <p className="text-[10px] font-bold text-slate-400 mt-1">
                                            {t('adjustPreferences')}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Markdown-based Expert Knowledge */}
                            <L4KnowledgeSection
                                knowledge={markdownKnowledge}
                                isLoading={isKnowledgeLoading}
                            />

                            {/* Existing Expert Knowledge Sections */}
                            <div className="bg-white/60 backdrop-blur-xl rounded-[2.5rem] p-6 border border-slate-200/60 shadow-xl shadow-slate-200/20 space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                                        <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
                                        {t('ridingGuide')}
                                    </h3>
                                    <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-1 rounded-full uppercase tracking-wider">{t('expertMode')}</span>
                                </div>

                                <div className="space-y-4">
                                    {(knowledgeFilter === 'all' || knowledgeFilter === 'traps') && l4Knowledge?.traps?.map((item, i) => (
                                        <div key={`trap-${i}`} className="p-4 bg-red-50/50 rounded-2xl border border-red-100/50 flex gap-4 group hover:bg-red-50 transition-colors">
                                            <div className="shrink-0 w-12 h-12 bg-white rounded-xl flex items-center justify-center text-2xl shadow-sm group-hover:scale-110 transition-transform">{getLocaleString(item.icon, uiLocale) || '⚠️'}</div>
                                            <div>
                                                <div className="font-black text-red-900 text-sm mb-1">{getLocaleString(item.title, uiLocale).replace(/\*\*/g, '')}</div>
                                                <div className="text-xs font-bold text-red-700/80 leading-relaxed">{getLocaleString(item.description, uiLocale).replace(/\*\*/g, '')}</div>
                                                {item.advice && (
                                                    <div className="mt-3 p-2.5 bg-white/80 rounded-xl text-[11px] font-bold text-red-800 flex items-start gap-2 shadow-sm ring-1 ring-red-100">
                                                        <Lightbulb size={14} className="shrink-0 text-amber-500 mt-0.5" />
                                                        <span>{getLocaleString(item.advice, uiLocale).replace(/\*\*/g, '')}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    {(knowledgeFilter === 'all' || knowledgeFilter === 'hacks') && l4Knowledge?.hacks?.map((item, i) => (
                                        <div key={`hack-${i}`} className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100/50 flex gap-4 group hover:bg-emerald-50 transition-colors">
                                            <div className="shrink-0 w-12 h-12 bg-white rounded-xl flex items-center justify-center text-2xl shadow-sm group-hover:scale-110 transition-transform">{getLocaleString(item.icon, uiLocale) || '💡'}</div>
                                            <div>
                                                <div className="font-black text-emerald-900 text-sm mb-1">{getLocaleString(item.title, uiLocale).replace(/\*\*/g, '')}</div>
                                                <div className="text-xs font-bold text-emerald-700/80 leading-relaxed">{getLocaleString(item.description, uiLocale).replace(/\*\*/g, '')}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    ) : viewMode === 'chat' ? (
                        <motion.div
                            key="chat"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="w-full h-full flex flex-col"
                        >
                            <L4_Chat data={stationProfile} variant="strategy" />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="planner"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="px-4 pb-32 space-y-6"
                        >
                            {/* Planner Title & Selector Section */}
                            <div className="mt-2 space-y-4">
                                <div className="flex items-center justify-between px-1">
                                    <div>
                                        <h3 className="text-xl font-black text-slate-900 tracking-tight">{t('smartPlanning')}</h3>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{t('smartPlanningSub')}</p>
                                    </div>
                                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500 shadow-sm">
                                        <MapIcon size={20} />
                                    </div>
                                </div>
                                <PlannerTabSelector activeTask={task} onSelect={setTask} tL4={tL4} />
                            </div>

                            {/* Main Config Card */}
                            <div className="bg-white/60 backdrop-blur-xl rounded-[2.5rem] border border-slate-200/60 shadow-xl shadow-slate-200/20 overflow-hidden">
                                <div className="p-6 space-y-6">
                                    <L4FormCard
                                        originInput={originInput}
                                        setOriginInput={setOriginInput}
                                        selectedOrigin={selectedOrigin}
                                        setSelectedOrigin={(s) => { setSelectedOrigin(s); if (s) setOriginInput(getStationDisplayName(s)); }}
                                        destinationInput={destinationInput}
                                        setDestinationInput={setDestinationInput}
                                        selectedDestination={selectedDestination}
                                        setSelectedDestination={(s) => { setSelectedDestination(s); if (s) setDestinationInput(getStationDisplayName(s)); }}
                                        swapStations={swapStations}
                                        task={task as any}
                                        isLoading={isLoading}
                                        getStationDisplayName={getStationDisplayName}
                                        locale={uiLocale}
                                        isCompact={isHeaderCollapsed}
                                        directions={availableDirections}
                                        selectedDirection={selectedDirection}
                                        onDirectionChange={setSelectedDirection}
                                        getLocalizedStationName={getLocalizedStationName}
                                    />

                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between px-1">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('travelPreferences')}</span>
                                            <div className="h-px flex-1 bg-slate-200/50 mx-4" />
                                        </div>
                                        <L4DemandChips
                                            demand={demand}
                                            setDemand={setDemand}
                                            wantsExpertTips={wantsExpertTips}
                                            setWantsExpertTips={setWantsExpertTips}
                                            task={task as any}
                                            locale={uiLocale}
                                        />
                                    </div>

                                    <button
                                        onClick={ask}
                                        disabled={!canAsk}
                                        className="w-full h-16 rounded-[2rem] bg-slate-900 hover:bg-black text-white font-black shadow-xl shadow-slate-900/20 disabled:bg-slate-200 disabled:shadow-none flex items-center justify-center gap-3 active:scale-[0.98] transition-all relative overflow-hidden group"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                        {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} className="text-indigo-400 group-hover:scale-110 transition-transform" />}
                                        <span className="text-base relative z-10">
                                            {t('generatePlan')}
                                        </span>
                                    </button>
                                </div>
                            </div>

                            {/* Advanced Options Toggle */}
                            <div className="flex justify-center">
                                <button
                                    onClick={() => setIsTemplatesOpen(!isTemplatesOpen)}
                                    className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-white/60 backdrop-blur-md border border-white/80 text-[11px] font-black text-slate-500 hover:text-indigo-600 hover:bg-white transition-all shadow-sm shadow-slate-200/50"
                                >
                                    <Ticket size={13} className={isTemplatesOpen ? 'text-indigo-500' : ''} />
                                    {t('templateLibrary')}
                                    <ChevronDown size={13} className={`transition-transform duration-300 ${isTemplatesOpen ? 'rotate-180 text-indigo-500' : ''}`} />
                                </button>
                            </div>

                            <div ref={templatesContainerRef} className="space-y-4">
                                <AnimatePresence>
                                    {isTemplatesOpen && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <L4TemplateList templates={visibleTemplates} isOpen={true} onSelect={(tpl) => void applyTemplate(tpl)} locale={uiLocale} />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <AnimatePresence>{error && <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="rounded-2xl bg-rose-50 border border-rose-100 p-4 flex items-start gap-3"><div className="p-2 bg-rose-100 rounded-full text-rose-600"><AlertTriangle size={16} /></div><div className="text-sm font-bold text-rose-800">{error}</div></motion.div>}</AnimatePresence>
                            {error && task === 'route' && selectedOrigin?.id && selectedDestination?.id && (
                                <div className="flex flex-wrap gap-2">
                                    <a
                                        href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(getStationDisplayName(selectedOrigin))}&destination=${encodeURIComponent(getStationDisplayName(selectedDestination))}&travelmode=transit`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-[11px] font-black hover:bg-indigo-600 transition-all active:scale-95 shadow-lg shadow-slate-900/20"
                                    >
                                        Google Maps (Transit)
                                        <ExternalLink size={12} className="opacity-70" />
                                    </a>
                                    <a
                                        href={`https://www.google.com/maps/search/?api=1&query=Taxi near ${encodeURIComponent(getStationDisplayName(selectedOrigin))}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/80 border border-slate-200/60 text-[11px] font-black text-slate-600 hover:text-indigo-600 hover:bg-white transition-all active:scale-95 shadow-sm"
                                    >
                                        Find Taxi Nearby
                                        <ExternalLink size={12} className="opacity-70" />
                                    </a>
                                </div>
                            )}
                            {task === 'time' && <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">{isLoading && !timetableData ? <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div> : <TimetableModule timetables={timetableData} stationId={stationId} locale={uiLocale} selectedDirection={selectedDirection} />}</motion.div>}
                            <AnimatePresence mode="wait">{(suggestion || activeDemo || activeKind) && (
                                <motion.div key={activeKind || 'results'} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} className="space-y-4">
                                    {activeDemo && (
                                        <div className="p-4 rounded-3xl bg-indigo-50 border border-indigo-100">
                                            <div className="flex items-center gap-2 mb-3 text-indigo-900 font-black">
                                                <Sparkles size={16} />
                                                {uiLocale === 'ja' && activeDemo.title_ja ? activeDemo.title_ja : uiLocale === 'en' && activeDemo.title_en ? activeDemo.title_en : activeDemo.title}
                                            </div>
                                            <div className="space-y-4">
                                                {activeDemo.steps.slice(0, demoStepIndex + 1).map((step, i) => (
                                                    <div key={i} className="flex gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-lg shadow-sm">🤖</div>
                                                        <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm text-sm font-bold text-slate-700">
                                                            {uiLocale === 'ja' && step.agent_ja ? step.agent_ja : uiLocale === 'en' && step.agent_en ? step.agent_en : step.agent}
                                                        </div>
                                                    </div>
                                                ))}
                                                {demoStepIndex < activeDemo.steps.length - 1 ? (
                                                    <button onClick={() => setDemoStepIndex(i => i + 1)} className="w-full py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold">
                                                        {t('nextStep')}
                                                    </button>
                                                ) : (
                                                    <div className="text-center text-xs text-slate-400 font-bold">
                                                        {t('endOfDemo')}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    {activeKind && activeKind !== 'unknown' && activeKind !== 'route' && <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm"><div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">{t('details')}</div>{activeKind === 'fare' && <FareModule fares={fareData} locale={uiLocale} />}{activeKind === 'timetable' && <TimetableModule timetables={timetableData} stationId={stationId} locale={uiLocale} selectedDirection={selectedDirection} />}</div>}
                                    {suggestion && activeKind === 'route' ? <div className="space-y-4"><InsightCards suggestion={suggestion} locale={uiLocale} visible={wantsExpertTips} /><div className="space-y-3">{suggestion.options.map((opt, idx) => <RouteResultCard key={`${opt.label}-${idx}`} option={{ ...opt, transfers: Number(opt.transfers ?? 0) }} rank={idx} locale={uiLocale} />)}</div></div> : suggestion ? <SuggestionModule suggestion={suggestion} /> : null}
                                </motion.div>
                            )}</AnimatePresence>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

function ViewModeSelector({ activeMode, onSelect, tL4, isCompact }: { activeMode: L4ViewMode; onSelect: (m: L4ViewMode) => void; tL4: any; isCompact?: boolean }) {
    const modes = [
        { id: 'recommendations', label: tL4('viewModes.recommendations'), icon: Sparkles },
        { id: 'planner', label: tL4('viewModes.planner'), icon: MapIcon },
        { id: 'chat', label: tL4('viewModes.chat'), icon: MessageCircle },
    ];
    return (
        <div className={`relative flex p-1 bg-white/40 backdrop-blur-xl rounded-[1.25rem] border border-white/60 shadow-lg shadow-slate-200/20 transition-all ${isCompact ? 'gap-0.5' : 'gap-1'}`}>
            {modes.map(mode => {
                const isActive = activeMode === mode.id;
                const Icon = mode.icon;
                return (
                    <button
                        key={mode.id}
                        onClick={() => onSelect(mode.id as L4ViewMode)}
                        className={`
                            relative flex-1 flex items-center justify-center gap-1.5 rounded-[0.9rem] text-xs font-black transition-all active:scale-95 touch-manipulation z-10
                            ${isCompact ? 'py-2 px-1' : 'py-3'}
                            ${isActive ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'}
                        `}
                    >
                        {isActive && (
                            <motion.div
                                layoutId="activeModePill"
                                className="absolute inset-0 bg-white shadow-md shadow-indigo-100/50 rounded-[0.9rem] z-[-1]"
                                transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                            />
                        )}
                        <Icon size={isCompact ? 14 : 16} className={isActive ? 'text-indigo-500' : 'text-slate-400'} />
                        <span className={isCompact ? 'hidden xs:inline' : ''}>{mode.label}</span>
                    </button>
                );
            })}
        </div>
    );
}

function PlannerTabSelector({ activeTask, onSelect, tL4 }: { activeTask: string; onSelect: (t: L4Task) => void; tL4: any }) {
    const tabs = [
        { id: 'route', label: tL4('plannerTabs.route'), icon: MapIcon },
        { id: 'time', label: tL4('plannerTabs.time'), icon: Clock },
    ];
    return (
        <div className="flex gap-1.5 p-1 bg-white/40 backdrop-blur-md rounded-2xl border border-white/60">
            {tabs.map(tab => {
                const isActive = activeTask === tab.id;
                const Icon = tab.icon;
                return (
                    <button
                        key={tab.id}
                        onClick={() => onSelect(tab.id as L4Task)}
                        className={`
                            flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-black transition-all relative overflow-hidden
                            ${isActive ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}
                        `}
                    >
                        {isActive && (
                            <motion.div
                                layoutId="activeTaskPill"
                                className="absolute inset-0 bg-white shadow-sm rounded-xl z-[-1]"
                                transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                            />
                        )}
                        <Icon size={14} className={isActive ? 'text-indigo-500' : 'text-slate-400'} />
                        {tab.label}
                    </button>
                );
            })}
        </div>
    );
}

function FareModule({ fares, locale }: { fares: OdptRailwayFare[] | null; locale: string }) {
    const t = useTranslations('l4.dashboard');
    const rows = fares || [];
    const tTo = t('fare.to');
    const tIC = t('fare.ic');
    const tTicket = t('fare.ticket');

    return (
        <div className="overflow-hidden rounded-2xl border border-slate-100/60 bg-white/40 backdrop-blur-sm" dir="auto">
            <table className="w-full text-sm text-left rtl:text-right">
                <thead className="bg-slate-50/50 text-slate-500 font-black text-[10px] uppercase tracking-wider">
                    <tr>
                        <th className="p-4">{tTo}</th>
                        <th className="p-4">{tIC}</th>
                        <th className="p-4">{tTicket}</th>
                    </tr>
                </thead>
                <tbody className="text-slate-700 font-bold">
                    {rows.slice(0, 10).map((f) => (
                        <tr key={f['@id']} className="border-b border-slate-100/40 hover:bg-white/40 transition-colors">
                            <td className="p-4 text-xs">{getLocalizedStationName(String(f['odpt:toStation'] || ''), locale)}</td>
                            <td className="p-4 text-indigo-600 font-black">¥{f['odpt:icCardFare']}</td>
                            <td className="p-4 text-slate-500">¥{f['odpt:ticketFare']}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function TimetableModule({ timetables, stationId, locale, selectedDirection }: { timetables: OdptStationTimetable[] | null; stationId: string; locale: string; selectedDirection?: string | null }) {
    const t = useTranslations('l4.dashboard');
    const now = new Date();
    // More stable JST time calculation (UTC+9)
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const jstNow = new Date(utc + (3600000 * 9));
    const nowHHMM = `${String(jstNow.getHours()).padStart(2, '0')}:${String(jstNow.getMinutes()).padStart(2, '0')}`;
    const items = timetables || [];

    if (!items.length) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-white/40 backdrop-blur-md rounded-[2.5rem] border border-white/60 text-center">
                <div className="w-16 h-16 bg-white/80 rounded-full flex items-center justify-center text-3xl shadow-sm mb-4">🕰️</div>
                <p className="text-sm font-black text-slate-600">
                    {t('timetable.noData')}
                </p>
                <p className="text-xs text-slate-400 mt-1">{t('timetable.noDataSub')}</p>
            </div>
        );
    }

    const directions = Array.from(new Set(items.map(t => t['odpt:railDirection']).filter(Boolean)));
    const filteredDirections = selectedDirection ? directions.filter(d => d === selectedDirection) : directions;
    const tTo = t('timetable.to');

    return (
        <div className="space-y-4" dir="auto">
            {filteredDirections.map((dir) => {
                const tables = items.filter(t => t['odpt:railDirection'] === dir);
                const dirName = getLocalizedStationName(String(dir), locale);
                return (
                    <div key={dir} className="bg-white/60 backdrop-blur-xl rounded-[2rem] border border-white/60 shadow-xl shadow-slate-200/10 overflow-hidden group">
                        <div className="bg-slate-50/50 px-5 py-3 border-b border-slate-100/50 flex items-center justify-between">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                {tTo}{dirName}
                            </span>
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        </div>
                        <div className="p-5">
                            {tables.map(table => {
                                const objs = (table['odpt:stationTimetableObject'] || []).map(o => ({
                                    time: String(o['odpt:departureTime'] || ''),
                                    dest: getLocalizedStationName(String(o['odpt:destinationStation'] || ''), locale)
                                }));
                                const next = objs.filter(o => o.time >= nowHHMM).sort((a, b) => a.time.localeCompare(b.time)).slice(0, 8);
                                const calendarId = String(table['odpt:calendar'] || '').split(':').pop() || '';
                                const calendarLabel = calendarId.includes('Weekday') ? t('timetable.weekday') : t('timetable.weekend');

                                return (
                                    <div key={table['@id']} className="mb-6 last:mb-0">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className={`w-1 h-3 rounded-full ${calendarId.includes('Weekday') ? 'bg-indigo-500' : 'bg-rose-500'}`} />
                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                                {calendarLabel}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-4 gap-2">
                                            {next.map((t, idx) => (
                                                <div key={`${t.time}-${idx}`} className="flex flex-col items-center p-2.5 bg-white/80 rounded-xl border border-slate-100/50 shadow-sm hover:border-indigo-200 transition-colors group/item">
                                                    <span className="text-sm font-black text-slate-800 group-hover/item:text-indigo-600 transition-colors">{t.time}</span>
                                                    {t.dest && <span className="text-[9px] text-slate-400 font-bold truncate w-full text-center mt-0.5">{t.dest}</span>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

/**
 * Robust localized station name resolver
 */
function getLocalizedStationName(id: string, locale: string): string {
    const base = String(id || '').split(/[:.]/).pop() || '';

    // Comprehensive mapping for major Tokyo stations
    const stationMap: Record<string, Record<string, string>> = {
        'Tokyo': { 'zh': '東京', 'ja': '東京', 'en': 'Tokyo', 'ar': 'طوكيو' },
        'Ueno': { 'zh': '上野', 'ja': '上野', 'en': 'Ueno', 'ar': 'أوينو' },
        'Asakusa': { 'zh': '淺草', 'ja': '浅草', 'en': 'Asakusa', 'ar': 'أساكوسا' },
        'Akihabara': { 'zh': '秋葉原', 'ja': '秋葉原', 'en': 'Akihabara', 'ar': 'أكيهابارا' },
        'Shinjuku': { 'zh': '新宿', 'ja': '新宿', 'en': 'Shinjuku', 'ar': 'شينجوكو' },
        'Shibuya': { 'zh': '澀谷', 'ja': '渋谷', 'en': 'Shibuya', 'ar': 'شيبويا' },
        'Ginza': { 'zh': '銀座', 'ja': '銀座', 'en': 'Ginza', 'ar': 'جينزا' },
        'Ikebukuro': { 'zh': '池袋', 'ja': '池袋', 'en': 'Ikebukuro', 'ar': 'إيكيبوكورو' },
        'Roppongi': { 'zh': '六本木', 'ja': '六本木', 'en': 'Roppongi', 'ar': 'روبونغي' },
        'Shinagawa': { 'zh': '品川', 'ja': '品川', 'en': 'Shinagawa', 'ar': 'شيناغاوا' },
        'Nihombashi': { 'zh': '日本橋', 'ja': '日本橋', 'en': 'Nihombashi', 'ar': 'نيهونباشي' },
        'Shimbashi': { 'zh': '新橋', 'ja': '新橋', 'en': 'Shimbashi', 'ar': 'شيمباشي' },
        'Ebisu': { 'zh': '惠比壽', 'ja': '恵比寿', 'en': 'Ebisu', 'ar': 'إيبيسو' },
        'Meguro': { 'zh': '目黑', 'ja': '目黒', 'en': 'Meguro', 'ar': 'ميغورو' },
        'Harajuku': { 'zh': '原宿', 'ja': '原宿', 'en': 'Harajuku', 'ar': 'هاراجوكو' },
        'Omotesando': { 'zh': '表參道', 'ja': '表参道', 'en': 'Omotesando', 'ar': 'أوموتيساندو' },
        'Oshiage': { 'zh': '押上', 'ja': '押上', 'en': 'Oshiage', 'ar': 'أوشياغي' },
        'Maihama': { 'zh': '舞濱', 'ja': '舞浜', 'en': 'Maihama', 'ar': 'مايهاما' },
        'Toyosu': { 'zh': '豐洲', 'ja': '豊洲', 'en': 'Toyosu', 'ar': 'تويوسو' },
        'Yurakucho': { 'zh': '有樂町', 'ja': '有楽町', 'en': 'Yurakucho', 'ar': 'يوراكوتشو' },
        'Iidabashi': { 'zh': '飯田橋', 'ja': '飯田橋', 'en': 'Iidabashi', 'ar': 'إيداباشي' },
        'Kanda': { 'zh': '神田', 'ja': '神田', 'en': 'Kanda', 'ar': 'كاندا' },
        'Hamamatsucho': { 'zh': '濱松町', 'ja': '浜松町', 'en': 'Hamamatsucho', 'ar': 'هاماماتسوتشو' }
    };

    const entry = stationMap[base];
    if (!entry) return base;

    const lang = locale.startsWith('zh') ? 'zh' : locale.startsWith('ja') ? 'ja' : locale.startsWith('ar') ? 'ar' : 'en';
    return entry[lang] || entry['en'] || base;
}

function SuggestionModule({ suggestion }: { suggestion: L4Suggestion }) {
    return <div className="space-y-3">{suggestion.options.map((opt, i) => <div key={i} className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm"><div className="font-black text-slate-900 mb-2">{opt.label}</div><div className="space-y-2">{opt.steps.map((step, j) => <div key={j} className="flex gap-3 text-sm font-bold text-slate-600"><div className="w-6 text-center">{step.icon || '•'}</div><div className="flex-1">{step.text}</div></div>)}</div></div>)}</div>;
}
