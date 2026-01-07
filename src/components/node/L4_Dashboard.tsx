'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useApiFetch } from '@/hooks/useApiFetch';
import { AlertTriangle, Clock, Loader2, Map as MapIcon, MessageSquare, Sparkles, Ticket, ExternalLink, MessageCircle } from 'lucide-react';
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
import { useAppStore } from '@/stores/appStore';
import { L4FormCard } from '@/components/node/L4FormCard';
import { L4DemandChips } from '@/components/node/L4DemandChips';
import { L4TemplateSelector, L4TemplateList } from '@/components/node/L4TemplateSelector';
import { L4_Chat } from '@/components/node/L4_Chat';
import { IntentSelector } from '@/components/node/IntentSelector';

interface L4DashboardProps {
    currentNodeId: string;
    locale?: SupportedLocale;
    l4Knowledge?: L4Knowledge;
}

type L4Task = 'route' | 'knowledge' | 'timetable';

export default function L4_Dashboard({ currentNodeId, locale = 'zh-TW', l4Knowledge }: L4DashboardProps) {
    const localeHook = useLocale();
    const stationId = useMemo(() => normalizeOdptStationId(String(currentNodeId || '').trim()), [currentNodeId]);
    const uiLocale = locale;
    const [chatMode, setChatMode] = useState(false);
    const setChatOpen = useAppStore(state => state.setChatOpen);
    const { fetchJson: fetchJsonCached } = useApiFetch();

    const [recommendations, setRecommendations] = useState<MatchedStrategyCard[]>([]);
    const [isRecommending, setIsRecommending] = useState(false);

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
    const [question, setQuestion] = useState('');

    const inputRef = useRef<HTMLInputElement | null>(null);
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
            } catch (err) { console.error('[L4 Dashboard] Failed to fetch recommendations:', err); }
            finally { setIsRecommending(false); }
        };
        fetchRecommendations();
    }, [stationId, demand, uiLocale, mapDemandToPreferences]);

    useEffect(() => {
        setActiveKind(null); setError(''); setFareData(null); setTimetableData(null); setSuggestion(null);
        setCachedRouteResult(null); setActiveDemo(null); setDemoStepIndex(0); setQuestion('');
        setTask('route'); setIsTemplatesOpen(false); setTemplateCategory('basic');
        setOriginInput(''); setSelectedOrigin(null); setDestinationInput(''); setSelectedDestination(null);
        requestAbortRef.current?.abort();
    }, [stationId]);

    const templates = useMemo(() => buildL4DefaultQuestionTemplates({ originStationId: selectedOrigin?.id || stationId, locale: uiLocale }), [stationId, uiLocale, selectedOrigin]);
    const visibleTemplates = useMemo(() => templates.filter(t => t.category === templateCategory && (t.kind === task)), [templates, templateCategory, task]);

    const getStationDisplayName = useCallback((s: Station) => {
        if (uiLocale === 'zh-TW') return s.name['zh-TW'] || s.name.ja || s.name.en || s.id;
        if (uiLocale === 'ja') return s.name.ja || s.name['zh-TW'] || s.name.en || s.id;
        if (uiLocale === 'en') return s.name.en || s.name.ja || s.name['zh-TW'] || s.id;
        return s.name.ja || s.name.en || s.id;
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
        if (task === 'timetable') return true;
        if (task === 'route') return Boolean(selectedDestination?.id);
        if (task === 'knowledge') return true;
        return true;
    }, [isLoading, selectedOrigin, selectedDestination, stationId, task]);

    const buildInternalQueryText = useCallback(() => {
        const originId = normalizeOdptStationId(selectedOrigin?.id || stationId);
        const destId = selectedDestination?.id ? normalizeOdptStationId(selectedDestination.id) : '';
        const note = String(question || '').trim();
        if (task === 'timetable') return `timetable station: ${originId}${note ? `\n${note}` : ''}`;
        if (task === 'knowledge') return `knowledge station: ${originId}${note ? `\n${note}` : ''}`;
        return `route from: ${originId} to: ${destId}${note ? `\n${note}` : ''}`;
    }, [question, selectedDestination, selectedOrigin, stationId, task]);

    useEffect(() => {
        if (task === 'timetable' && stationId && !timetableData) {
            setIsLoading(true);
            const allMembers = resolveHubStationMembers(stationId);
            const prioritized = [...allMembers.filter(id => id.includes('TokyoMetro') || id.includes('Toei')), ...allMembers.filter(id => id.includes('JR-East'))];
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
                setError(uiLocale.startsWith('zh') ? '目前站點無法解析。' : uiLocale === 'ja' ? 'ODPT駅に解決できません。' : 'Cannot resolve station.');
                setActiveKind('unknown'); return;
            }
            if (kind === 'unknown') {
                setError(uiLocale.startsWith('zh') ? '請先選擇要查的項目。' : uiLocale === 'ja' ? '項目を選んでください。' : 'Pick a task first.');
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
                    setError(uiLocale.startsWith('zh') ? '請選擇目的地車站。' : uiLocale === 'ja' ? '到着駅を選択。' : 'Select destination.');
                    return;
                }
                const from = normalizeOdptStationId(currentOriginId);
                const to = normalizeOdptStationId(toStationId);
                try {
                    const json = await fetchJsonCached<any>(`/api/odpt/fare?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { ttlMs: 10 * 60_000, signal: controller.signal });
                    if (mySeq !== requestSeqRef.current) return;
                    const items = Array.isArray(json?.fares) ? json.fares : [];
                    if (!json?.found || items.length === 0) { setFareData([]); setError('No fare found.'); setSuggestion(buildFareSuggestion({ originStationId: from, originStationName: currentOriginName, destinationStationId: to, destinationStationName: currentDestName, demand, verified: false })); return; }
                    const odptFares: OdptRailwayFare[] = items.map((f: any, idx: number) => ({ '@id': `l4:fare:${json.source || 'unknown'}:${f.operator}:${f.from}:${f.to}:${idx}`, '@type': 'odpt:RailwayFare', 'odpt:operator': f.operator.startsWith('odpt.Operator:') ? f.operator : `odpt.Operator:${f.operator}`, 'odpt:fromStation': f.from, 'odpt:toStation': f.to, 'odpt:ticketFare': f.ticket, 'odpt:icCardFare': f.ic }));
                    const filtered = filterFaresForOrigin(odptFares, from);
                    setFareData(filtered);
                    setSuggestion(buildFareSuggestion({ originStationId: from, originStationName: currentOriginName, destinationStationId: to, destinationStationName: currentDestName, demand, verified: true }));
                    return;
                } catch (e: any) { if (e?.name !== 'AbortError') { setError('Fare query failed.'); setSuggestion(buildFareSuggestion({ originStationId: from, originStationName: currentOriginName, destinationStationId: to, demand, verified: false })); } return; }
            }

            if (kind === 'timetable') {
                const allMembers = resolveHubStationMembers(currentOriginId);
                const prioritized = [...allMembers.filter(id => id.includes('TokyoMetro') || id.includes('Toei')), ...allMembers.filter(id => id.includes('JR-East'))];
                const uniqueIds = [...new Set(prioritized)];
                let allTimetables: OdptStationTimetable[] = [];
                let fetchedAny = false;
                for (const memberId of uniqueIds) {
                    try {
                        const json = await fetchJsonCached<OdptStationTimetable[]>(`/api/odpt/timetable?station=${encodeURIComponent(memberId)}&raw=1`, { ttlMs: 30_000, signal: controller.signal });
                        if (mySeq !== requestSeqRef.current) return;
                        if (json && json.length > 0) { allTimetables = [...allTimetables, ...json]; fetchedAny = true; }
                    } catch (e: any) { if (e?.name !== 'AbortError') console.warn(`[Timetable] Failed for ${memberId}:`, e); }
                }
                if (fetchedAny) { const filtered = filterTimetablesForStation(allTimetables, currentOriginId); setTimetableData(filtered.length > 0 ? filtered : allTimetables); setSuggestion(buildTimetableSuggestion({ stationId: currentOriginId, demand, verified: true })); return; }
                setTimetableData([]); setSuggestion(buildTimetableSuggestion({ stationId: currentOriginId, demand, verified: false })); return;
            }

            if (kind === 'route') {
                let destinationStationId = selectedDestination?.id ? normalizeOdptStationId(selectedDestination.id) : '';
                if (!destinationStationId && intent.toStationId) { destinationStationId = normalizeOdptStationId(intent.toStationId); }
                if (!destinationStationId) { const ids = extractOdptStationIds(text).map(normalizeOdptStationId); destinationStationId = ids.find(id => id !== currentOriginId) || ''; }
                if (!destinationStationId) { setError(uiLocale.startsWith('zh') ? '請選擇目的地。' : uiLocale === 'ja' ? '到着駅が必要。' : 'Destination required.'); setSuggestion(buildRouteSuggestion({ originStationId: currentOriginId, destinationStationId: currentOriginId, demand, verified: false, options: [] })); return; }
                if (cachedRouteResult && cachedRouteResult.origin === currentOriginId && cachedRouteResult.destination === destinationStationId && cachedRouteResult.text === text) { setSuggestion(buildRouteSuggestion({ originStationId: currentOriginId, destinationStationId, demand, verified: true, options: cachedRouteResult.options, text })); return; }
                try {
                    const json = await fetchJsonCached<any>(`/api/odpt/route?from=${encodeURIComponent(currentOriginId)}&to=${encodeURIComponent(destinationStationId)}&locale=${uiLocale}`, { ttlMs: 5 * 60_000, signal: controller.signal });
                    if (mySeq !== requestSeqRef.current) return;
                    const apiRoutes = json.routes || [];
                    if (apiRoutes.length === 0) { setError(uiLocale.startsWith('zh') ? '找不到路線。' : uiLocale === 'ja' ? '経路が見つかりません。' : 'No route found.'); }
                    const baseOptions = apiRoutes.map((r: any): EnrichedRouteOption => ({ label: r.label, steps: r.steps, sources: r.sources || [{ type: 'odpt:Railway', verified: true }], railways: r.railways, transfers: Number(r.transfers ?? 0), duration: typeof r.duration === 'number' ? r.duration : undefined, fare: r.fare, nextDeparture: r.nextDeparture }));
                    setCachedRouteResult({ origin: currentOriginId, destination: destinationStationId, options: baseOptions, text });
                    setSuggestion(buildRouteSuggestion({ originStationId: currentOriginId, destinationStationId, demand, verified: true, options: baseOptions, text }));
                    return;
                } catch (e: any) { if (e?.name !== 'AbortError') { setError('Route planning failed.'); setSuggestion(buildRouteSuggestion({ originStationId: currentOriginId, destinationStationId, demand, verified: false, options: [] })); } return; }
            }
        } catch (e: any) { if (e?.name !== 'AbortError') { setError(String(e?.message || 'Unknown error')); } }
        finally { if (mySeq === requestSeqRef.current) { setIsLoading(false); } }
    };

    const ask = async () => { await askWithText(buildInternalQueryText()); };
    const swapStations = () => { const temp = selectedOrigin; const tempInput = originInput; setSelectedOrigin(selectedDestination); setOriginInput(destinationInput); setSelectedDestination(temp); setDestinationInput(tempInput); };

    return (
        <div className="h-full bg-slate-50 overflow-hidden">
            <div className="h-full flex flex-col">
                {/* Header */}
                <div className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-sm pt-4 px-4 pb-2 flex items-center gap-3">
                    <div className="flex-1">
                        {chatMode ? (
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-indigo-600 rounded-xl text-white"><MessageCircle size={18} /></div>
                                <div>
                                    <div className="text-sm font-black text-slate-800">LUTAGU AI</div>
                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{localeHook.startsWith('zh') ? '智能對話' : localeHook === 'ja' ? 'スマートガイド' : 'Smart Guide'}</div>
                                </div>
                            </div>
                        ) : (
                            <TabSelector activeTask={task} onSelect={setTask} locale={uiLocale} />
                        )}
                    </div>
                    {/* Mode Toggle */}
                    <div className="flex items-center gap-1 bg-slate-100 rounded-full p-1">
                        <button onClick={() => setChatMode(false)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${!chatMode ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                            <span className={!chatMode ? '' : 'opacity-50'}>{localeHook.startsWith('zh') ? '📋 表單' : localeHook === 'ja' ? '📋 フォーム' : '📋 Form'}</span>
                        </button>
                        <button onClick={() => setChatMode(true)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${chatMode ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                            <span className={chatMode ? '' : 'opacity-50'}>{localeHook.startsWith('zh') ? '💬 對話' : localeHook === 'ja' ? '💬 チャット' : '💬 Chat'}</span>
                        </button>
                    </div>
                    <button onClick={() => setChatOpen(true)} className="ml-2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-600 text-white text-[11px] font-black shadow-sm shadow-indigo-200 active:scale-95 transition-all">
                        <MessageSquare size={14} />
                        <span>{uiLocale.startsWith('zh') ? '問 LUTAGU' : uiLocale === 'ja' ? 'LUTAGU に聞く' : 'Ask LUTAGU'}</span>
                    </button>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-y-auto">
                    <AnimatePresence mode="wait">
                        {chatMode ? (
                            <motion.div key="chat" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="h-full">
                                <L4_Chat data={stationProfile} variant="strategy" />
                            </motion.div>
                        ) : (
                            <motion.div key="form" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }} className="max-w-xl mx-auto min-h-full flex flex-col px-4 pb-32 space-y-4">
                                {/* Intent Selector for AI-powered intent classification */}
                                <IntentSelector 
                                    value={null}
                                    onChange={(intent) => {
                                        if (intent === 'route') setTask('route');
                                        else if (intent === 'timetable') setTask('timetable');
                                        else if (intent === 'fare' || intent === 'status' || intent === 'amenity') setTask('knowledge');
                                    }}
                                    disabled={isLoading}
                                />
                                <L4FormCard originInput={originInput} setOriginInput={setOriginInput} selectedOrigin={selectedOrigin} setSelectedOrigin={(s) => { setSelectedOrigin(s); if (s) setOriginInput(getStationDisplayName(s)); }} destinationInput={destinationInput} setDestinationInput={setDestinationInput} selectedDestination={selectedDestination} setSelectedDestination={(s) => { setSelectedDestination(s); if (s) setDestinationInput(getStationDisplayName(s)); }} swapStations={swapStations} task={task} isLoading={isLoading} getStationDisplayName={getStationDisplayName} locale={uiLocale as 'zh-TW' | 'ja' | 'en'} />
                                <L4DemandChips demand={demand} setDemand={setDemand} wantsExpertTips={wantsExpertTips} setWantsExpertTips={setWantsExpertTips} task={task} locale={uiLocale as 'zh-TW' | 'ja' | 'en'} />
                                <button onClick={ask} disabled={!canAsk} className="w-full h-14 rounded-xl bg-indigo-600 text-white font-black shadow-lg shadow-indigo-200 disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.97] transition-all touch-manipulation">
                                    {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
                                    <span className="text-base">{uiLocale.startsWith('zh') ? '開始規劃' : uiLocale === 'ja' ? '検索する' : 'Plan Trip'}</span>
                                </button>
                                <L4TemplateSelector templates={templates} visibleTemplates={visibleTemplates} isOpen={isTemplatesOpen} setIsOpen={setIsTemplatesOpen} onSelect={applyTemplate} locale={uiLocale as 'zh-TW' | 'ja' | 'en'} />
                                <L4TemplateList templates={visibleTemplates} isOpen={isTemplatesOpen} onSelect={(tpl) => void applyTemplate(tpl)} locale={uiLocale as 'zh-TW' | 'ja' | 'en'} />
                                <AnimatePresence>{error && <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="rounded-2xl bg-rose-50 border border-rose-100 p-4 flex items-start gap-3"><div className="p-2 bg-rose-100 rounded-full text-rose-600"><AlertTriangle size={16} /></div><div className="text-sm font-bold text-rose-800">{error}</div></motion.div>}</AnimatePresence>
                                {!isLoading && recommendations.length > 0 && task === 'knowledge' && <div className="mb-6"><StrategyCards cards={recommendations} locale={uiLocale} /></div>}
                                {task === 'knowledge' && !isLoading && (
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4">
                                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Ticket className="text-indigo-500" size={20} />{uiLocale.startsWith('zh') ? '乘車與票務指南' : uiLocale === 'ja' ? '乗車・切符ガイド' : 'Riding & Tickets'}</h3>
                                        {l4Knowledge?.traps?.map((item, i) => <div key={i} className="p-4 bg-orange-50 rounded-2xl border border-orange-100 flex gap-3"><div className="text-2xl">{item.icon}</div><div><div className="font-bold text-orange-900 text-sm">{item.title}</div><div className="text-xs text-orange-800 mt-1">{item.description}</div>{item.advice && <div className="mt-2 p-2 bg-white/60 rounded-lg text-xs font-bold text-orange-700"><span>💡</span><span>{item.advice}</span></div>}</div></div>)}
                                        {l4Knowledge?.hacks?.map((item, i) => <div key={i} className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex gap-3"><div className="text-2xl">{item.icon}</div><div><div className="font-bold text-emerald-900 text-sm">{item.title}</div><div className="text-xs text-emerald-800 mt-1">{item.description}</div></div></div>)}
                                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100"><h4 className="font-bold text-slate-700 mb-2 text-sm">{uiLocale.startsWith('zh') ? '交通IC卡' : 'IC Cards'}</h4><p className="text-xs text-slate-600 leading-relaxed">{uiLocale.startsWith('zh') ? '東京車站可用 Suica、PASMO 等 IC 卡。' : 'Most Tokyo stations accept Suica, PASMO.'}</p></div>
                                        <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100"><h4 className="font-bold text-indigo-900 mb-2 text-sm">{uiLocale.startsWith('zh') ? '地鐵通票' : 'Subway Ticket'}</h4><p className="text-xs text-indigo-800 leading-relaxed">{uiLocale.startsWith('zh') ? '24/48/72 小時券可無限搭乘。' : 'Unlimited rides for 24/48/72 hours.'}</p></div>
                                    </motion.div>
                                )}
                                {task === 'timetable' && <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">{isLoading && !timetableData ? <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div> : <TimetableModule timetables={timetableData} stationId={stationId} locale={uiLocale} />}</motion.div>}
                                <AnimatePresence mode="wait">{(suggestion || activeDemo || activeKind) && (
                                    <motion.div key={activeKind || 'results'} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} className="space-y-4">
                                        {activeDemo && <div className="p-4 rounded-3xl bg-indigo-50 border border-indigo-100"><div className="flex items-center gap-2 mb-3 text-indigo-900 font-black"><Sparkles size={16} />{uiLocale === 'ja' && activeDemo.title_ja ? activeDemo.title_ja : uiLocale === 'en' && activeDemo.title_en ? activeDemo.title_en : activeDemo.title}</div><div className="space-y-4">{activeDemo.steps.slice(0, demoStepIndex + 1).map((step, i) => <div key={i} className="flex gap-3"><div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-lg shadow-sm">🤖</div><div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm text-sm font-bold text-slate-700">{uiLocale === 'ja' && step.agent_ja ? step.agent_ja : uiLocale === 'en' && step.agent_en ? step.agent_en : step.agent}</div></div>)}{demoStepIndex < activeDemo.steps.length - 1 ? <button onClick={() => setDemoStepIndex(i => i + 1)} className="w-full py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold">{uiLocale === 'ja' ? '次のステップ' : uiLocale === 'en' ? 'Next Step' : '下一步'}</button> : <div className="text-center text-xs text-slate-400 font-bold">{uiLocale === 'ja' ? 'デモ終了' : uiLocale === 'en' ? 'End of Demo' : '演示結束'}</div>}</div></div>}
                                        {activeKind && activeKind !== 'unknown' && activeKind !== 'route' && <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm"><div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">{uiLocale.startsWith('zh') ? '詳細數據' : 'Details'}</div>{activeKind === 'fare' && <FareModule fares={fareData} />}{activeKind === 'timetable' && <TimetableModule timetables={timetableData} stationId={stationId} locale={uiLocale} />}</div>}
                                        {suggestion && activeKind === 'route' ? <div className="space-y-4"><InsightCards suggestion={suggestion} locale={uiLocale} visible={wantsExpertTips} /><div className="space-y-3">{suggestion.options.map((opt, idx) => <RouteResultCard key={`${opt.label}-${idx}`} option={{ ...opt, transfers: Number(opt.transfers ?? 0) }} rank={idx} locale={uiLocale} />)}</div></div> : suggestion ? <SuggestionModule suggestion={suggestion} /> : null}
                                    </motion.div>
                                )}</AnimatePresence>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

function TabSelector({ activeTask, onSelect, locale }: { activeTask: string; onSelect: (t: L4Task) => void; locale: string }) {
    const tabs = [
        { id: 'route', label: locale.startsWith('zh') ? '路線' : locale === 'ja' ? 'ルート' : 'Route', icon: MapIcon },
        { id: 'knowledge', label: locale.startsWith('zh') ? '知識' : locale === 'ja' ? '知識' : 'Knowledge', icon: Ticket },
        { id: 'timetable', label: locale.startsWith('zh') ? '時刻' : locale === 'ja' ? '時刻表' : 'Time', icon: Clock },
    ];
    return <div className="flex p-1 bg-slate-100 rounded-2xl">{tabs.map(tab => { const isActive = activeTask === tab.id; const Icon = tab.icon; return <button key={tab.id} onClick={() => onSelect(tab.id as L4Task)} className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-black transition-all active:scale-95 touch-manipulation min-h-[44px] ${isActive ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><Icon size={16} className={isActive ? 'stroke-[3px]' : ''} />{tab.label}</button>; })}</div>;
}

function FareModule({ fares }: { fares: OdptRailwayFare[] | null }) {
    const rows = fares || [];
    return <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="bg-slate-50 text-slate-500 font-black text-xs"><tr><th className="p-3">To</th><th className="p-3">IC</th><th className="p-3">Ticket</th></tr></thead><tbody className="text-slate-700 font-bold">{rows.slice(0, 10).map((f) => <tr key={f['@id']} className="border-b border-slate-50"><td className="p-3">{String(f['odpt:toStation'] || '').split('.').pop()}</td><td className="p-3 text-indigo-600">¥{f['odpt:icCardFare']}</td><td className="p-3">¥{f['odpt:ticketFare']}</td></tr>)}</tbody></table></div>;
}

function TimetableModule({ timetables, stationId, locale }: { timetables: OdptStationTimetable[] | null; stationId: string; locale: string }) {
    const now = new Date();
    const jstNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
    const nowHHMM = `${String(jstNow.getHours()).padStart(2, '0')}:${String(jstNow.getMinutes()).padStart(2, '0')}`;
    const items = timetables || [];
    if (!items.length) return <div className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-3xl text-center"><div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center text-2xl">🕰️</div><p className="text-sm font-bold text-slate-600 mt-2">{locale.startsWith('zh') ? '暫無時刻表資料' : locale === 'ja' ? '時刻表データがありません' : 'No timetable'}</p></div>;
    const directions = Array.from(new Set(items.map(t => t['odpt:railDirection']).filter(Boolean)));
    return <div className="space-y-6">{directions.map((dir) => { const tables = items.filter(t => t['odpt:railDirection'] === dir); const dirName = String(dir).split('.').pop() || 'Unknown'; return <div key={dir} className="bg-white rounded-2xl border border-slate-100 overflow-hidden"><div className="bg-slate-50 px-4 py-2 border-b border-slate-100"><span className="text-xs font-black text-slate-600 uppercase">To {dirName}</span></div><div className="p-3">{tables.map(table => { const objs = (table['odpt:stationTimetableObject'] || []).map(o => ({ time: String(o['odpt:departureTime'] || ''), dest: String(o['odpt:destinationStation'] || '').split('.').pop() })); const next = objs.filter(o => o.time >= nowHHMM).sort((a, b) => a.time.localeCompare(b.time)).slice(0, 8); const calendar = String(table['odpt:calendar']).split(':').pop(); return <div key={table['@id']}><div className="text-xs font-bold text-indigo-600">{calendar}</div><div className="flex flex-wrap gap-2 mt-2">{next.map((t, idx) => <div key={`${t.time}-${idx}`} className="flex flex-col items-center p-2 bg-slate-50 rounded-lg min-w-[3rem]"><span className="text-sm font-black text-slate-800">{t.time}</span>{t.dest && <span className="text-[9px] text-slate-400">{t.dest}</span>}</div>)}</div></div>; })}</div></div>; })}</div>;
}

function SuggestionModule({ suggestion }: { suggestion: L4Suggestion }) {
    return <div className="space-y-3">{suggestion.options.map((opt, i) => <div key={i} className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm"><div className="font-black text-slate-900 mb-2">{opt.label}</div><div className="space-y-2">{opt.steps.map((step, j) => <div key={j} className="flex gap-3 text-sm font-bold text-slate-600"><div className="w-6 text-center">{step.icon || '•'}</div><div className="flex-1">{step.text}</div></div>)}</div></div>)}</div>;
}
