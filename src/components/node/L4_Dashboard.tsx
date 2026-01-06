'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowRightLeft, ChevronDown, ChevronRight, Clock, Loader2, Map as MapIcon, Settings, Sparkles, Ticket, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { StationAutocomplete, type Station } from '@/components/ui/StationAutocomplete';
import { resolveHubStationMembers } from '@/lib/constants/stationLines';
import type { OdptRailwayFare, OdptStationTimetable } from '@/lib/odpt/types';
import type { L4Knowledge } from '@/lib/types/stationStandard';
import {
    buildAmenitySuggestion,
    buildL4DefaultQuestionTemplates,
    buildFareSuggestion,
    buildRouteSuggestion,
    buildStatusSuggestion,
    buildTimetableSuggestion,
    classifyQuestion,
    extractOdptStationIds,
    filterFaresForOrigin,
    filterTimetablesForStation,
    findDemoScenario,
    normalizeOdptStationId,
    type L4DemandState,
    type L4IntentKind,
    type L4QuestionTemplate,
    type L4TemplateCategory,
    type L4Suggestion,
    type EnrichedRouteOption,
    type SupportedLocale,
} from '@/lib/l4/assistantEngine';
import type { DemoScenario } from '@/lib/l4/demoScenarios';
import { RouteResultCard } from '@/components/node/RouteResultCard';
import { InsightCards } from '@/components/node/InsightCards';
import { StrategyCards } from '@/components/node/StrategyCards';
import type { MatchedStrategyCard, UserPreferences, RecommendRequest } from '@/types/lutagu_l4';

// Types for Card response (Mirroring API response)
interface L4DashboardProps {
    currentNodeId: string;
    locale?: SupportedLocale;
    l4Knowledge?: L4Knowledge;
}

class HttpError extends Error {
    status: number;
    body: string;

    constructor(status: number, body: string) {
        super(body || `HTTP ${status}`);
        this.status = status;
        this.body = body;
    }
}

export default function L4_Dashboard({ currentNodeId, locale = 'zh-TW', l4Knowledge }: L4DashboardProps) {
    const stationId = useMemo(() => normalizeOdptStationId(String(currentNodeId || '').trim()), [currentNodeId]);
    const uiLocale = locale;

    // Debug: Log L4 Knowledge data


    const [recommendations, setRecommendations] = useState<MatchedStrategyCard[]>([]);
    const [isRecommending, setIsRecommending] = useState(false);

    const mapDemandToPreferences = useCallback((d: L4DemandState): UserPreferences => {
        return {
            accessibility: {
                wheelchair: d.wheelchair,
                stroller: d.stroller,
                visual_impairment: d.vision,
                elderly: d.senior,
            },
            luggage: {
                large_luggage: d.largeLuggage,
                multiple_bags: false,
            },
            travel_style: {
                rushing: d.rushing,
                budget: d.budget,
                comfort: d.comfort,
                avoid_crowd: d.avoidCrowds,
                avoid_rain: d.avoidRain,
            },
            companions: {
                with_children: d.stroller,
                family_trip: d.senior,
            },
        };
    }, []);

    const [isDemandOpen, setIsDemandOpen] = useState(false);
    // Simplified 6-demand state (new design)
    const [demand, setDemand] = useState<L4DemandState>({
        wheelchair: false,
        stroller: false,
        vision: false,
        senior: false,
        largeLuggage: false,
        lightLuggage: false,
        rushing: false,
        budget: false,
        comfort: false,
        avoidCrowds: false,
        avoidRain: false,
    });

    // New simplified demand types for the 6-chip design
    type SimplifiedDemand = 'optimalRoute' | 'saveMoney' | 'accessibility' | 'expertTips' | 'avoidCrowds' | 'fastTrack';
    const [wantsExpertTips, setWantsExpertTips] = useState(false);

    const [activeKind, setActiveKind] = useState<L4IntentKind | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string>('');

    type L4Task = 'route' | 'knowledge' | 'timetable';
    const [task, setTask] = useState<L4Task>('route');
    const [isTemplatesOpen, setIsTemplatesOpen] = useState(false); // Default closed in new design
    const [templateCategory, setTemplateCategory] = useState<L4TemplateCategory>('basic');

    const [fareData, setFareData] = useState<OdptRailwayFare[] | null>(null);
    const [timetableData, setTimetableData] = useState<OdptStationTimetable[] | null>(null);
    const [suggestion, setSuggestion] = useState<L4Suggestion | null>(null);
    // Cache for raw route results to allow re-filtering when demand changes
    const [cachedRouteResult, setCachedRouteResult] = useState<{
        origin: string;
        destination: string;
        options: EnrichedRouteOption[];
        text: string;
    } | null>(null);

    const [activeDemo, setActiveDemo] = useState<DemoScenario | null>(null);
    const [demoStepIndex, setDemoStepIndex] = useState(0);

    // Origin/Destination autocomplete state
    const [originInput, setOriginInput] = useState('');
    const [selectedOrigin, setSelectedOrigin] = useState<Station | null>(null);
    const [destinationInput, setDestinationInput] = useState('');
    const [selectedDestination, setSelectedDestination] = useState<Station | null>(null);

    const [question, setQuestion] = useState('');
    const inputRef = useRef<HTMLInputElement | null>(null);

    const requestAbortRef = useRef<AbortController | null>(null);
    const requestSeqRef = useRef(0);

    const jsonCacheRef = useRef(new Map<string, { expiresAt: number; value: unknown }>());
    const inFlightRef = useRef(new Map<string, Promise<unknown>>());

    const fetchJsonCached = useCallback(
        async function fetchJsonCached<T>(
            url: string,
            opts: { ttlMs: number; signal?: AbortSignal }
        ): Promise<T> {
            const now = Date.now();
            const cached = jsonCacheRef.current.get(url);
            if (cached && cached.expiresAt > now) return cached.value as T;

            const inFlight = inFlightRef.current.get(url);
            if (inFlight) return (await inFlight) as T;

            const p: Promise<T> = (async () => {
                const res = await fetch(url, { cache: 'no-store', signal: opts.signal });
                if (!res.ok) {
                    const body = await res.text().catch(() => '');
                    throw new HttpError(res.status, body);
                }
                const json = (await res.json()) as T;
                jsonCacheRef.current.set(url, { expiresAt: now + opts.ttlMs, value: json as unknown });
                return json;
            })();

            inFlightRef.current.set(url, p as unknown as Promise<unknown>);
            try {
                return await p;
            } finally {
                inFlightRef.current.delete(url);
            }
        },
        []
    );

    useEffect(() => {
        const fetchRecommendations = async () => {
            if (!stationId || !/^odpt[.:]Station:/.test(stationId)) return;
            setIsRecommending(true);
            try {
                const prefs = mapDemandToPreferences(demand);
                const reqBody: RecommendRequest = {
                    stationId,
                    userPreferences: prefs,
                    locale: uiLocale as 'zh-TW' | 'ja' | 'en'
                };

                const res = await fetch('/api/l4/recommend', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(reqBody)
                });

                if (res.ok) {
                    const data = await res.json();
                    setRecommendations(data.cards || []);
                }
            } catch (err) {
                console.error('[L4 Dashboard] Failed to fetch recommendations:', err);
            } finally {
                setIsRecommending(false);
            }
        };

        fetchRecommendations();
    }, [stationId, demand, uiLocale, mapDemandToPreferences]);

    useEffect(() => {
        setActiveKind(null);
        setError('');
        setFareData(null);
        setTimetableData(null);
        setSuggestion(null);
        setCachedRouteResult(null);
        setActiveDemo(null);
        setDemoStepIndex(0);
        setQuestion('');
        setTask('route');
        setIsTemplatesOpen(false);
        setTemplateCategory('basic');

        setOriginInput('');
        setSelectedOrigin(null);

        setDestinationInput('');
        setSelectedDestination(null);

        requestAbortRef.current?.abort();
    }, [stationId]);

    const templates = useMemo(() => {
        return buildL4DefaultQuestionTemplates({ originStationId: selectedOrigin?.id || stationId, locale: uiLocale });
    }, [stationId, uiLocale, selectedOrigin]);

    const visibleTemplates = useMemo(() => {
        return templates.filter(t => t.category === templateCategory && (t.kind === task));
    }, [templates, templateCategory, task]);

    const getStationDisplayName = useCallback((s: Station) => {
        if (uiLocale === 'zh-TW') return s.name['zh-TW'] || s.name.ja || s.name.en || s.id;
        if (uiLocale === 'ja') return s.name.ja || s.name['zh-TW'] || s.name.en || s.id;
        if (uiLocale === 'en') return s.name.en || s.name.ja || s.name['zh-TW'] || s.id;
        return s.name.ja || s.name.en || s.id;
    }, [uiLocale]);

    // Re-generate suggestion when demand changes if we have cached route results
    useEffect(() => {
        if (!cachedRouteResult) return;

        setSuggestion(buildRouteSuggestion({
            originStationId: cachedRouteResult.origin,
            destinationStationId: cachedRouteResult.destination,
            demand,
            verified: true,
            options: cachedRouteResult.options,
            text: cachedRouteResult.text
        }));
    }, [demand, cachedRouteResult]);

    const resolveStationById = useCallback(async (stationIdOrQuery: string): Promise<Station | null> => {
        const q = String(stationIdOrQuery || '').trim();
        if (!q) return null;
        try {
            const data = await fetchJsonCached<{ stations?: Station[] }>(
                `/api/stations/search?q=${encodeURIComponent(q)}`,
                { ttlMs: 60_000 }
            );
            const stations = (data?.stations || []) as Station[];
            if (stations.length === 0) return null;
            const exact = stations.find(s => normalizeOdptStationId(s.id) === normalizeOdptStationId(q));
            return exact || stations[0];
        } catch {
            return null;
        }
    }, [fetchJsonCached]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (!stationId) return;
            if (selectedOrigin) return;
            const s = await resolveStationById(stationId);
            if (cancelled) return;
            if (s) {
                setSelectedOrigin(s);
                setOriginInput(getStationDisplayName(s));
                return;
            }
            setOriginInput('');
        })();
        return () => {
            cancelled = true;
        };
    }, [getStationDisplayName, resolveStationById, selectedOrigin, stationId]);

    const applyTemplate = useCallback(async (tpl: L4QuestionTemplate) => {
        setError('');
        setIsTemplatesOpen(false);
        setTask(tpl.kind as any);
        if (tpl.preset?.demand) {
            setDemand(prev => ({ ...prev, ...tpl.preset!.demand }));
        }

        const originId = tpl.preset?.originStationId;
        if (originId) {
            const s = await resolveStationById(originId);
            if (s) {
                setSelectedOrigin(s);
                setOriginInput(getStationDisplayName(s));
            }
        }

        const destId = tpl.preset?.destinationStationId;
        if (destId) {
            const s = await resolveStationById(destId);
            if (s) {
                setSelectedDestination(s);
                setDestinationInput(getStationDisplayName(s));
            }
        }

        if (tpl.preset?.originStationId || tpl.preset?.destinationStationId || tpl.preset?.demand) {
            setQuestion('');
        } else if (tpl.text) {
            setQuestion(tpl.description || '');
        }
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

    const toggleSimplifiedDemand = (key: SimplifiedDemand) => {
        if (key === 'expertTips') {
            setWantsExpertTips(v => !v);
            return;
        }

        const mapping: Record<Exclude<SimplifiedDemand, 'expertTips'>, (keyof L4DemandState)[]> = {
            optimalRoute: ['comfort'],
            saveMoney: ['budget'],
            accessibility: ['wheelchair', 'stroller', 'senior'],
            avoidCrowds: ['avoidCrowds'],
            fastTrack: ['rushing'],
        };

        const keys = mapping[key];
        const isActive = keys.every(k => demand[k]);
        setDemand(prev => {
            const next = { ...prev };
            keys.forEach(k => {
                next[k] = !isActive;
            });
            return next;
        });
    };

    const isSimplifiedDemandActive = (key: SimplifiedDemand) => {
        if (key === 'expertTips') return wantsExpertTips;

        const mapping: Record<Exclude<SimplifiedDemand, 'expertTips'>, (keyof L4DemandState)[]> = {
            optimalRoute: ['comfort'],
            saveMoney: ['budget'],
            accessibility: ['wheelchair', 'stroller', 'senior'],
            avoidCrowds: ['avoidCrowds'],
            fastTrack: ['rushing'],
        };
        const keys = mapping[key];
        return keys.every(k => demand[k]);
    };

    const demandChips = useMemo(() => {
        const all: { key: SimplifiedDemand; icon: string; label: string }[] = [
            { key: 'fastTrack', icon: '⚡', label: uiLocale.startsWith('zh') ? '快速' : uiLocale === 'ja' ? '最速' : 'Fast' },
            { key: 'saveMoney', icon: '💰', label: uiLocale.startsWith('zh') ? '省錢' : uiLocale === 'ja' ? '安い' : 'Cheap' },
            { key: 'accessibility', icon: '🛗', label: uiLocale.startsWith('zh') ? '輕鬆' : uiLocale === 'ja' ? '楽々' : 'Easy' },
            { key: 'expertTips', icon: '💡', label: uiLocale.startsWith('zh') ? '專家' : uiLocale === 'ja' ? 'プロ' : 'Tips' },
            { key: 'avoidCrowds', icon: '🚶', label: uiLocale.startsWith('zh') ? '避人潮' : uiLocale === 'ja' ? '空き' : 'Quiet' },
            { key: 'optimalRoute', icon: '✨', label: uiLocale.startsWith('zh') ? '優化' : uiLocale === 'ja' ? '最適' : 'Optimal' },
        ];

        if (task === 'timetable') {
            return all.filter(c => ['accessibility', 'expertTips', 'avoidCrowds'].includes(c.key));
        }
        return all;
    }, [task, uiLocale]);

    const visibleChips = demandChips.slice(0, 3);
    const hiddenChips = demandChips.slice(3);

    // [New] Fetch Transfer Knowledge
    const [knowledgeData, setKnowledgeData] = useState<any>(null);
    useEffect(() => {
        // [Existing Knowledge Effect]
        if (task === 'knowledge' && stationId) {
            // Placeholder: currently generic info is hardcoded in render
        }
    }, [task, stationId]);

    // [New] Fetch Timetable when switching to tab
    useEffect(() => {
        if (task === 'timetable' && stationId) {
            if (timetableData) return; // Already have data

            setIsLoading(true);

            // Use resolveHubStationMembers to get all physical stations (like in askWithText)
            const allMembers = resolveHubStationMembers(stationId);
            // Prioritize Metro/Toei (ODPT has better data) over JR-East
            const prioritized = [
                ...allMembers.filter(id => id.includes('TokyoMetro') || id.includes('Toei')),
                ...allMembers.filter(id => id.includes('JR-East'))
            ];
            const uniqueIds = [...new Set(prioritized)];



            // Fetch timetables from all member stations
            Promise.all(
                uniqueIds.map(memberId =>
                    fetchJsonCached<OdptStationTimetable[]>(
                        `/api/odpt/timetable?station=${encodeURIComponent(memberId)}&raw=1`,
                        { ttlMs: 5 * 60_000 }
                    ).catch(() => [] as OdptStationTimetable[])
                )
            )
                .then(results => {
                    const allTimetables = results.flat();

                    if (allTimetables.length > 0) {
                        const filtered = filterTimetablesForStation(allTimetables, stationId);
                        setTimetableData(filtered.length > 0 ? filtered : allTimetables);
                    } else {
                        setTimetableData([]);
                    }
                })
                .finally(() => {
                    setIsLoading(false);
                });
        }
    }, [task, stationId]);

    const askWithText = async (rawText: string) => {
        const text = String(rawText || '').trim();
        if (!text || isLoading) return;

        requestAbortRef.current?.abort();
        const controller = new AbortController();
        requestAbortRef.current = controller;
        const mySeq = ++requestSeqRef.current;

        setError('');
        setActiveKind(null);
        setFareData(null);
        setTimetableData(null);
        setSuggestion(null);

        // Check for Demo Scenario
        const demo = findDemoScenario(text);
        if (demo) {
            setActiveDemo(demo);
            setDemoStepIndex(0);
            return;
        }

        setIsLoading(true);
        const currentOriginId = selectedOrigin?.id || stationId;

        try {
            const intent = classifyQuestion(text, uiLocale);
            const kind = intent.kind;

            if (!/^odpt[.:]Station:/.test(currentOriginId)) {
                setError(uiLocale.startsWith('zh')
                    ? '目前站點或出發地無法解析為 ODPT 站點，無法查詢票價/時刻表/路線。'
                    : uiLocale === 'ja'
                        ? '現在の駅または出発地を ODPT 駅に解決できないため、運賃/時刻表/経路を取得できません。'
                        : 'Current station or origin cannot be resolved to an ODPT station, so fares/timetables/routes are unavailable.');
                setActiveKind('unknown');
                return;
            }

            if (kind === 'unknown') {
                setError(uiLocale.startsWith('zh')
                    ? '請先選擇要查的項目（票價/時刻表/路線），並在欄位選擇車站後再查詢。'
                    : uiLocale === 'ja'
                        ? '項目（運賃/時刻表/経路）を選び、駅を選択してから検索してください。'
                        : 'Pick a task (fare/timetable/route) and select stations before searching.');
                setActiveKind('unknown');
                return;
            }

            setActiveKind(kind);

            const currentOriginName = selectedOrigin ? getStationDisplayName(selectedOrigin) : undefined;
            const currentDestName = selectedDestination ? getStationDisplayName(selectedDestination) : undefined;

            if (kind === 'status') {
                setSuggestion(buildStatusSuggestion({ stationId: currentOriginId, stationName: currentOriginName, text, verified: true }));
                return;
            }

            if (kind === 'amenity') {
                setSuggestion(buildAmenitySuggestion({ stationId: currentOriginId, stationName: currentOriginName, text, demand, verified: true }));
                return;
            }

            if (kind === 'fare') {
                if (mySeq !== requestSeqRef.current) return;
                const ids = extractOdptStationIds(text);
                const toStationId = selectedDestination?.id || intent.toStationId || (ids.find(id => normalizeOdptStationId(id) !== currentOriginId) ?? '');
                if (!toStationId) {
                    setSuggestion(buildFareSuggestion({
                        originStationId: currentOriginId,
                        originStationName: currentOriginName,
                        destinationStationId: undefined,
                        demand,
                        verified: false,
                    }));
                    setError(uiLocale.startsWith('zh')
                        ? '票價需要先選擇目的地車站。'
                        : uiLocale === 'ja'
                            ? '運賃には到着駅の選択が必要です。'
                            : 'Fare lookup needs a destination station.');
                    return;
                }

                type FareApiResponse = {
                    found: boolean;
                    source?: string;
                    fares?: Array<{
                        ticket: number;
                        ic: number;
                        operator: string;
                        from: string;
                        to: string;
                    }>;
                    message?: string;
                    error?: string;
                };

                const from = normalizeOdptStationId(currentOriginId);
                const to = normalizeOdptStationId(toStationId);
                const url = `/api/odpt/fare?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
                try {
                    const json = await fetchJsonCached<FareApiResponse>(url, { ttlMs: 10 * 60_000, signal: controller.signal });
                    if (mySeq !== requestSeqRef.current) return;

                    const items = Array.isArray(json?.fares) ? json.fares : [];
                    if (!json?.found || items.length === 0) {
                        setFareData([]);
                        setError(uiLocale.startsWith('zh')
                            ? '找不到直通票價（可能需要轉乘/跨公司）。'
                            : uiLocale === 'ja'
                                ? '直通運賃が見つかりません（乗換/事業者跨ぎの可能性）。'
                                : 'No direct fare found (may require transfer/cross-operator).');
                        setSuggestion(buildFareSuggestion({
                            originStationId: from,
                            originStationName: currentOriginName,
                            destinationStationId: to,
                            destinationStationName: currentDestName,
                            demand,
                            verified: false,
                        }));
                        return;
                    }

                    const odptFares: OdptRailwayFare[] = items.map((f, idx) => {
                        const operator = f.operator.startsWith('odpt.Operator:') ? f.operator : `odpt.Operator:${f.operator}`;
                        return {
                            '@id': `l4:fare:${json.source || 'unknown'}:${operator}:${f.from}:${f.to}:${idx}`,
                            '@type': 'odpt:RailwayFare',
                            'odpt:operator': operator,
                            'odpt:fromStation': f.from,
                            'odpt:toStation': f.to,
                            'odpt:ticketFare': f.ticket,
                            'odpt:icCardFare': f.ic,
                        };
                    });

                    const filtered = filterFaresForOrigin(odptFares, from);
                    setFareData(filtered);
                    setSuggestion(buildFareSuggestion({
                        originStationId: from,
                        originStationName: currentOriginName,
                        destinationStationId: to,
                        destinationStationName: currentDestName,
                        demand,
                        verified: true,
                    }));
                    return;
                } catch (e: any) {
                    if (e?.name === 'AbortError') return;
                    const detail = e instanceof HttpError ? e.body : String(e?.message || e || '');
                    // Check for authentication errors
                    if (detail.includes('403') || detail.includes('Invalid acl:consumerKey')) {
                        setError(uiLocale.startsWith('zh')
                            ? '🔧 系統維護中：票價數據暫時無法使用，請稍後再試。'
                            : uiLocale === 'ja'
                                ? '🔧 システムメンテナンス中：運賃データは一時的に利用できません。'
                                : '🔧 Fare data temporarily unavailable.');
                    } else {
                        setError(detail || 'Fare request failed.');
                    }
                    setSuggestion(buildFareSuggestion({
                        originStationId: from,
                        originStationName: currentOriginName,
                        destinationStationId: to,
                        destinationStationName: currentDestName,
                        demand,
                        verified: false,
                    }));
                    return;
                }
            }

            if (kind === 'timetable') {
                // Resolve hub station to all physical members for comprehensive timetable
                const allMembers = resolveHubStationMembers(currentOriginId);
                // Prioritize Metro/Toei (ODPT has better data) over JR-East
                const prioritized = [
                    ...allMembers.filter(id => id.includes('TokyoMetro') || id.includes('Toei')),
                    ...allMembers.filter(id => id.includes('JR-East'))
                ];
                const uniqueIds = [...new Set(prioritized)];

                let allTimetables: OdptStationTimetable[] = [];
                let fetchedAny = false;

                // Query each member station for timetables
                for (const memberId of uniqueIds) {
                    const url = `/api/odpt/timetable?station=${encodeURIComponent(memberId)}&raw=1`;
                    try {
                        const json = await fetchJsonCached<OdptStationTimetable[]>(url, { ttlMs: 30_000, signal: controller.signal });
                        if (mySeq !== requestSeqRef.current) return;
                        if (json && json.length > 0) {
                            allTimetables = [...allTimetables, ...json];
                            fetchedAny = true;
                        }
                    } catch (e: any) {
                        if (e?.name === 'AbortError') return;
                        // Continue to next station if one fails
                        console.warn(`[Timetable] Failed for ${memberId}:`, e);
                    }
                }

                if (fetchedAny) {
                    const filtered = filterTimetablesForStation(allTimetables, currentOriginId);
                    setTimetableData(filtered.length > 0 ? filtered : allTimetables);
                    setSuggestion(buildTimetableSuggestion({ stationId: currentOriginId, demand, verified: true }));
                    return;
                }

                // If no data fetched at all, show empty state (will trigger JR link if applicable)
                setTimetableData([]);
                setSuggestion(buildTimetableSuggestion({ stationId: currentOriginId, demand, verified: false }));
                return;
            }

            if (kind === 'route') {
                let destinationStationId = (selectedDestination?.id ? normalizeOdptStationId(selectedDestination.id) : '');

                if (!destinationStationId && intent.toStationId) {
                    destinationStationId = normalizeOdptStationId(intent.toStationId);
                }

                if (!destinationStationId) {
                    const ids = extractOdptStationIds(text).map(normalizeOdptStationId);
                    destinationStationId = ids.find(id => id !== currentOriginId) || '';
                }

                if (!destinationStationId) {
                    setError(uiLocale.startsWith('zh')
                        ? '路線建議需要先選擇目的地車站。'
                        : uiLocale === 'ja'
                            ? '経路には到着駅の選択が必要です。'
                            : 'Route suggestions need a destination station.');
                    setSuggestion(buildRouteSuggestion({
                        originStationId: currentOriginId,
                        // originStationName: currentOriginName, // buildRouteSuggestion uses findSimpleRoutes logic for steps
                        destinationStationId: currentOriginId,
                        demand,
                        verified: false,
                        options: [],
                    }));
                    return;
                }

                if (
                    cachedRouteResult &&
                    cachedRouteResult.origin === currentOriginId &&
                    cachedRouteResult.destination === destinationStationId &&
                    cachedRouteResult.text === text
                ) {
                    setSuggestion(buildRouteSuggestion({
                        originStationId: currentOriginId,
                        destinationStationId: destinationStationId,
                        demand,
                        verified: true,
                        options: cachedRouteResult.options,
                        text: text
                    }));
                    return;
                }

                const url = `/api/odpt/route?from=${encodeURIComponent(currentOriginId)}&to=${encodeURIComponent(destinationStationId)}&locale=${uiLocale}`;
                let json: any;
                try {
                    json = await fetchJsonCached<any>(url, { ttlMs: 5 * 60_000, signal: controller.signal });
                } catch (e: any) {
                    if (e?.name === 'AbortError') return;
                    const detail = e instanceof HttpError ? e.body : String(e?.message || e || '');
                    // Check for authentication errors
                    if (detail.includes('403') || detail.includes('Invalid acl:consumerKey')) {
                        setError(uiLocale.startsWith('zh')
                            ? '🔧 系統維護中：部分路線數據暫時無法使用（認證過期），請聯絡管理員更新 API 金鑰。'
                            : uiLocale === 'ja'
                                ? '🔧 システムメンテナンス中：一時的にルートデータを利用できません（認証エラー）。'
                                : '🔧 System maintenance: Route data temporarily unavailable (API auth expired).');
                    } else {
                        setError(detail || 'Route planning request failed.');
                    }
                    setSuggestion(buildRouteSuggestion({
                        originStationId: currentOriginId,
                        destinationStationId,
                        demand,
                        verified: false,
                        options: [],
                    }));
                    return;
                }

                const apiRoutes = json.routes || [];

                // Check for API-level errors
                if (json.error && (json.error.includes('403') || json.error.includes('Invalid'))) {
                    setError(uiLocale.startsWith('zh')
                        ? '🔧 系統維護中：路線查詢服務暫時不可用，請稍後再試。'
                        : uiLocale === 'ja'
                            ? '🔧 システムメンテナンス中：ルート検索サービスは一時的に利用できません。'
                            : '🔧 Route search service temporarily unavailable.');
                    setSuggestion(buildRouteSuggestion({
                        originStationId: currentOriginId,
                        destinationStationId,
                        demand,
                        verified: false,
                        options: [],
                    }));
                    return;
                }

                if (apiRoutes.length === 0) {
                    setError(uiLocale.startsWith('zh')
                        ? '找不到建議路徑（可能跨公司或需要多次轉乘），請嘗試改用更精確的站點名稱或稍後再試。'
                        : uiLocale === 'ja'
                            ? '推奨経路が見つかりません（事業者跨ぎや複雑な乗換の可能性）。より正確な駅名で再試行してください。'
                            : 'No recommended route found (may require complex transfers). Try a more specific station name.');
                }

                const baseOptions = apiRoutes.map((r: any): EnrichedRouteOption => ({
                    label: r.label,
                    steps: r.steps,
                    sources: r.sources || [{ type: 'odpt:Railway', verified: true }],
                    railways: r.railways,
                    transfers: Number(r.transfers ?? 0),
                    duration: typeof r.duration === 'number' ? r.duration : undefined,
                    fare: r.fare,
                    nextDeparture: r.nextDeparture
                }));

                setCachedRouteResult({
                    origin: currentOriginId,
                    destination: destinationStationId,
                    options: baseOptions,
                    text: text
                });

                // Initial suggestion build (useEffect will handle updates, but we set it here for immediate feedback)
                setSuggestion(buildRouteSuggestion({
                    originStationId: currentOriginId,
                    destinationStationId: destinationStationId,
                    demand,
                    verified: true,
                    options: baseOptions,
                    text: text
                }));

                return;
            }
        } catch (e: any) {
            if (e?.name === 'AbortError') return;
            setError(String(e?.message || e || 'Unknown error'));
        } finally {
            if (mySeq === requestSeqRef.current) {
                setIsLoading(false);
            }
        }
    };

    const ask = async () => {
        await askWithText(buildInternalQueryText());
    };

    const swapStations = () => {
        const tempOrigin = selectedOrigin;
        const tempOriginInput = originInput;
        setSelectedOrigin(selectedDestination);
        setOriginInput(destinationInput);
        setSelectedDestination(tempOrigin);
        setDestinationInput(tempOriginInput);
    };

    return (
        <div className="h-full bg-slate-50 overflow-y-auto pb-32">
            <div className="max-w-xl mx-auto min-h-full flex flex-col">
                {/* Header / Tabs */}
                <div className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-sm pt-4 px-4 pb-2">
                    <TabSelector
                        activeTask={task}
                        onSelect={(t) => {
                            setTask(t);
                            const tpl = templates.find(temp => temp.category === 'basic' && temp.kind === t);
                            if (tpl) void applyTemplate(tpl);
                        }}
                        locale={uiLocale}
                    />
                </div>

                {/* Main Content */}
                <div className="flex-1 px-4 space-y-4">
                    {/* Form Card */}
                    <motion.div layout className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5 relative overflow-hidden">
                        {/* Decorative background blob */}
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-50 rounded-full blur-3xl opacity-60 pointer-events-none" />

                        <div className="relative z-10 space-y-5">
                            {/* Station Inputs */}
                            <div className="relative">
                                {/* Connector Line */}
                                {task === 'route' && (
                                    <div className="absolute left-3.5 top-8 bottom-8 w-0.5 bg-slate-100 rounded-full" />
                                )}

                                <div className="space-y-4">
                                    <div className="relative">
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-8 flex justify-center z-10">
                                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-white shadow-sm" />
                                        </div>
                                        <StationAutocomplete
                                            value={originInput}
                                            onChange={(v) => {
                                                setOriginInput(v);
                                                setSelectedOrigin(null);
                                            }}
                                            onSelect={(s) => {
                                                setSelectedOrigin(s);
                                                setOriginInput(getStationDisplayName(s));
                                            }}
                                            placeholder={
                                                task === 'timetable'
                                                    ? (uiLocale.startsWith('zh') ? '選擇車站' : uiLocale === 'ja' ? '駅を選択' : 'Select Station')
                                                    : (uiLocale.startsWith('zh') ? '從哪裡出發？' : uiLocale === 'ja' ? 'どこから出発？' : 'Origin')
                                            }
                                            className="pl-9 h-12 text-base font-bold bg-slate-50/50 border-slate-100 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all"
                                            locale={uiLocale}
                                            disabled={isLoading}
                                        />
                                    </div>

                                    {task === 'route' && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="relative"
                                        >
                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-8 flex justify-center z-10">
                                                <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 ring-4 ring-white shadow-sm" />
                                            </div>
                                            <StationAutocomplete
                                                value={destinationInput}
                                                onChange={(v) => {
                                                    setDestinationInput(v);
                                                    setSelectedDestination(null);
                                                }}
                                                onSelect={(s) => {
                                                    setSelectedDestination(s);
                                                    setDestinationInput(getStationDisplayName(s));
                                                }}
                                                placeholder={uiLocale.startsWith('zh') ? '想去哪裡？' : uiLocale === 'ja' ? 'どこへ行く？' : 'Destination'}
                                                className="pl-9 h-12 text-base font-bold bg-slate-50/50 border-slate-100 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 rounded-xl transition-all"
                                                locale={uiLocale}
                                                disabled={isLoading}
                                            />
                                        </motion.div>
                                    )}
                                </div>

                                {/* Swap Button */}
                                {task === 'route' && (
                                    <button
                                        onClick={swapStations}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors z-20"
                                    >
                                        <ArrowRightLeft size={16} className="rotate-90" />
                                    </button>
                                )}
                            </div>

                            {/* Demands */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        {uiLocale.startsWith('zh') ? '偏好設定' : uiLocale === 'ja' ? '設定' : 'Preferences'}
                                    </label>
                                    {hiddenChips.length > 0 && (
                                        <button
                                            onClick={() => setIsDemandOpen(!isDemandOpen)}
                                            className="text-[10px] font-bold text-indigo-600 flex items-center gap-1 hover:underline"
                                        >
                                            {uiLocale.startsWith('zh') ? '更多選項' : uiLocale === 'ja' ? '詳細' : 'More'}
                                            <Settings size={12} />
                                        </button>
                                    )}
                                </div>

                                <div className="grid grid-cols-3 gap-2">
                                    {visibleChips.map(chip => (
                                        <SimplifiedDemandChip
                                            key={chip.key}
                                            icon={chip.icon}
                                            label={chip.label}
                                            active={isSimplifiedDemandActive(chip.key)}
                                            onClick={() => toggleSimplifiedDemand(chip.key)}
                                        />
                                    ))}
                                </div>

                                <AnimatePresence>
                                    {isDemandOpen && hiddenChips.length > 0 && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="pt-3 grid grid-cols-3 gap-2 border-t border-slate-50 mt-3">
                                                {hiddenChips.map(chip => (
                                                    <SimplifiedDemandChip
                                                        key={chip.key}
                                                        icon={chip.icon}
                                                        label={chip.label}
                                                        active={isSimplifiedDemandActive(chip.key)}
                                                        onClick={() => toggleSimplifiedDemand(chip.key)}
                                                    />
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Submit Button */}
                            <button
                                onClick={ask}
                                disabled={!canAsk}
                                className="w-full h-12 rounded-xl bg-indigo-600 text-white font-black shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                            >
                                {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                                <span className="text-sm">
                                    {uiLocale.startsWith('zh')
                                        ? '開始規劃'
                                        : uiLocale === 'ja' ? '検索する' : 'Plan Trip'}
                                </span>
                            </button>
                        </div>
                    </motion.div>

                    {/* Quick Templates Toggle */}
                    <div className="flex justify-center">
                        <button
                            onClick={() => setIsTemplatesOpen(!isTemplatesOpen)}
                            className="text-xs font-bold text-slate-400 flex items-center gap-1 hover:text-indigo-600 transition-colors"
                        >
                            {isTemplatesOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            {uiLocale.startsWith('zh') ? '常用問句模板' : uiLocale === 'ja' ? 'テンプレート' : 'Templates'}
                        </button>
                    </div>

                    <AnimatePresence>
                        {isTemplatesOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="grid grid-cols-1 sm:grid-cols-2 gap-2"
                            >
                                {visibleTemplates.slice(0, 4).map((tpl) => (
                                    <button
                                        key={tpl.id}
                                        onClick={() => void applyTemplate(tpl)}
                                        className="text-left rounded-2xl bg-white border border-slate-100 p-3 hover:border-indigo-200 hover:shadow-sm transition-all"
                                    >
                                        <div className="text-xs font-black text-slate-700">{tpl.title}</div>
                                        <div className="mt-0.5 text-[10px] text-slate-400 line-clamp-1">{tpl.description}</div>
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Error Message */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="rounded-2xl bg-rose-50 border border-rose-100 p-4 flex items-start gap-3"
                            >
                                <div className="p-2 bg-rose-100 rounded-full text-rose-600">
                                    <AlertTriangle size={16} />
                                </div>
                                <div className="text-sm font-bold text-rose-800 pt-1">{error}</div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* BambiGO Strategy Recommendations (Proactive) */}
                    {!isLoading && recommendations.length > 0 && task === 'knowledge' && (
                        <div className="mb-6">
                            <StrategyCards cards={recommendations} locale={uiLocale} />
                        </div>
                    )}

                    {/* Knowledge / Ticket Info (Fallback or Main) */}
                    {task === 'knowledge' && !isLoading && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4"
                        >
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Ticket className="text-indigo-500" size={20} />
                                {uiLocale.startsWith('zh') ? '乘車與票務指南' : uiLocale === 'ja' ? '乗車・切符ガイド' : 'Riding & Tickets'}
                            </h3>

                            {/* Dynamic L4 Knowledge */}
                            {l4Knowledge && (
                                <div className="space-y-4">
                                    {l4Knowledge.traps?.length > 0 && (
                                        <div className="space-y-2">
                                            <div className="text-xs font-black text-orange-400 uppercase tracking-widest px-1">
                                                {uiLocale.startsWith('zh') ? '⚠️ 注意事項' : 'Caution'}
                                            </div>
                                            {l4Knowledge.traps.map((item, i) => (
                                                <div key={i} className="p-4 bg-orange-50 rounded-2xl border border-orange-100 flex gap-3">
                                                    <div className="text-2xl">{item.icon}</div>
                                                    <div className="flex-1">
                                                        <div className="font-bold text-orange-900 text-sm">{item.title}</div>
                                                        <div className="text-xs text-orange-800 mt-1 leading-relaxed">{item.description}</div>
                                                        {item.advice && (
                                                            <div className="mt-2 p-2 bg-white/60 rounded-lg text-xs font-bold text-orange-700 flex gap-2">
                                                                <span>💡</span>
                                                                <span>{item.advice}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {l4Knowledge.hacks?.length > 0 && (
                                        <div className="space-y-2">
                                            <div className="text-xs font-black text-emerald-500 uppercase tracking-widest px-1">
                                                {uiLocale.startsWith('zh') ? '✨ 達人密技' : 'Pro Tips'}
                                            </div>
                                            {l4Knowledge.hacks.map((item, i) => (
                                                <div key={i} className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex gap-3">
                                                    <div className="text-2xl">{item.icon}</div>
                                                    <div className="flex-1">
                                                        <div className="font-bold text-emerald-900 text-sm">{item.title}</div>
                                                        <div className="text-xs text-emerald-800 mt-1 leading-relaxed">{item.description}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <h4 className="font-bold text-slate-700 mb-2 text-sm">
                                    {uiLocale.startsWith('zh') ? '交通IC卡 (Suica/PASMO)' : 'IC Cards (Suica/PASMO)'}
                                </h4>
                                <p className="text-xs text-slate-600 leading-relaxed">
                                    {uiLocale.startsWith('zh')
                                        ? '東京絕大多數車站皆可使用 Suica、PASMO 或 ICOCA 等 10 種全日本通用的交通 IC 卡。進出站時請輕觸閘機感應區。'
                                        : 'Most stations in Tokyo accept Suica, PASMO, and other major IC cards. Touch the card to the reader at the ticket gate.'}
                                </p>
                            </div>

                            <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                                <h4 className="font-bold text-indigo-900 mb-2 text-sm">
                                    {uiLocale.startsWith('zh') ? '地鐵通票 (Tokyo Subway Ticket)' : 'Tokyo Subway Ticket'}
                                </h4>
                                <p className="text-xs text-indigo-800 leading-relaxed">
                                    {uiLocale.startsWith('zh')
                                        ? '外國遊客專用的 24/48/72 小時券，可無限次搭乘東京 Metro 地鐵與都營地鐵全線。'
                                        : 'Unlimited rides on all Tokyo Metro and Toei Subway lines for 24, 48, or 72 hours. Recommended for tourists.'}
                                </p>
                            </div>
                        </motion.div>
                    )}

                    {/* Timetable Tab Content */}
                    {task === 'timetable' && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-4"
                        >
                            {/* Show loading state explicitly if fetching */}
                            {isLoading && !timetableData ? (
                                <div className="p-8 flex justify-center">
                                    <Loader2 className="animate-spin text-slate-400" />
                                </div>
                            ) : (
                                <TimetableModule timetables={timetableData} stationId={stationId} locale={uiLocale} />
                            )}
                        </motion.div>
                    )}

                    {/* Results Area */}
                    <AnimatePresence mode="wait">
                        {(suggestion || activeDemo || activeKind) && (
                            <motion.div
                                key={activeKind || 'results'}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 20 }}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                className="space-y-4"
                            >
                                {activeDemo && (
                                    <div className="p-4 rounded-3xl bg-indigo-50 border border-indigo-100">
                                        <div className="flex items-center gap-2 mb-3 text-indigo-900 font-black">
                                            <Sparkles size={16} />
                                            {uiLocale === 'ja' && activeDemo.title_ja ? activeDemo.title_ja :
                                                uiLocale === 'en' && activeDemo.title_en ? activeDemo.title_en :
                                                    activeDemo.title}
                                        </div>
                                        <div className="space-y-4">
                                            {activeDemo.steps.slice(0, demoStepIndex + 1).map((step, i) => (
                                                <div key={i} className="flex gap-3 animate-in fade-in slide-in-from-bottom-2">
                                                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-lg shadow-sm">🤖</div>
                                                    <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm text-sm font-bold text-slate-700">
                                                        {uiLocale === 'ja' && step.agent_ja ? step.agent_ja :
                                                            uiLocale === 'en' && step.agent_en ? step.agent_en :
                                                                step.agent}
                                                    </div>
                                                </div>
                                            ))}
                                            {demoStepIndex < activeDemo.steps.length - 1 ? (
                                                <button
                                                    onClick={() => setDemoStepIndex(i => i + 1)}
                                                    className="w-full py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
                                                >
                                                    {uiLocale === 'ja' ? '次のステップ' : uiLocale === 'en' ? 'Next Step' : '下一步'}
                                                </button>
                                            ) : (
                                                <div className="text-center text-xs text-slate-400 font-bold">
                                                    {uiLocale === 'ja' ? 'デモ終了' : uiLocale === 'en' ? 'End of Demo' : '演示結束'}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {activeKind && activeKind !== 'unknown' && activeKind !== 'route' && (
                                    <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">
                                            {uiLocale.startsWith('zh') ? '詳細數據' : 'Details'}
                                        </div>
                                        {activeKind === 'fare' && <FareModule fares={fareData} destinationId={selectedDestination?.id} />}
                                        {activeKind === 'timetable' && <TimetableModule timetables={timetableData} stationId={stationId} locale={uiLocale} />}
                                    </div>
                                )}

                                {suggestion && activeKind === 'route' ? (
                                    <div className="space-y-4">
                                        <InsightCards suggestion={suggestion} locale={uiLocale} visible={wantsExpertTips} />
                                        <div className="space-y-3">
                                            {suggestion.options.map((opt, idx) => (
                                                <RouteResultCard
                                                    key={`${opt.label}-${idx}`}
                                                    option={{ ...opt, transfers: Number(opt.transfers ?? 0) }}
                                                    rank={idx}
                                                    locale={uiLocale}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ) : suggestion ? (
                                    <SuggestionModule suggestion={suggestion} />
                                ) : null}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

// --- Sub Components ---

function TabSelector({ activeTask, onSelect, locale }: { activeTask: string; onSelect: (t: any) => void; locale: string }) {
    const tabs = [
        { id: 'route', label: locale.startsWith('zh') ? '路線' : locale === 'ja' ? 'ルート' : 'Route', icon: MapIcon },
        { id: 'knowledge', label: locale.startsWith('zh') ? '知識' : locale === 'ja' ? '知識' : 'Knowledge', icon: Ticket },
        { id: 'timetable', label: locale.startsWith('zh') ? '時刻' : locale === 'ja' ? '時刻表' : 'Time', icon: Clock },
    ];

    return (
        <div className="flex p-1 bg-slate-100 rounded-2xl">
            {tabs.map(tab => {
                const isActive = activeTask === tab.id;
                const Icon = tab.icon;
                return (
                    <button
                        key={tab.id}
                        onClick={() => onSelect(tab.id)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black transition-all ${isActive
                            ? 'bg-white text-indigo-600 shadow-sm scale-[1.02]'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <Icon size={14} className={isActive ? 'stroke-[3px]' : ''} />
                        {tab.label}
                    </button>
                );
            })}
        </div>
    );
}

function SimplifiedDemandChip({ icon, label, active, onClick }: {
    icon: string;
    label: string;
    active: boolean;
    onClick: () => void
}) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border transition-all ${active
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm'
                : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-white'
                }`}
        >
            <span className="text-base">{icon}</span>
            <span className="text-xs font-bold">{label}</span>
        </button>
    );
}

// Legacy modules (Fare, Timetable, Suggestion) kept for compatibility but styled cleaner

function FareModule({ fares, destinationId }: { fares: OdptRailwayFare[] | null; destinationId?: string }) {
    const rows = (fares || []).filter(f => {
        if (!destinationId) return true;
        return normalizeOdptStationId(String(f['odpt:toStation'] || '')) === normalizeOdptStationId(destinationId);
    });

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-black text-xs">
                    <tr>
                        <th className="p-3 rounded-l-lg">To</th>
                        <th className="p-3">IC</th>
                        <th className="p-3 rounded-r-lg">Ticket</th>
                    </tr>
                </thead>
                <tbody className="text-slate-700 font-bold">
                    {rows.slice(0, 10).map((f) => (
                        <tr key={f['@id']} className="border-b border-slate-50 last:border-0">
                            <td className="p-3">{String(f['odpt:toStation'] || '').split('.').pop()}</td>
                            <td className="p-3 text-indigo-600">¥{f['odpt:icCardFare']}</td>
                            <td className="p-3">¥{f['odpt:ticketFare']}</td>
                        </tr>
                    ))}
                    {rows.length === 0 && <tr><td colSpan={3} className="p-4 text-center text-slate-400">No fares found.</td></tr>}
                </tbody>
            </table>
        </div>
    );
}

function TimetableModule({ timetables, stationId, locale }: { timetables: OdptStationTimetable[] | null; stationId: string; locale: string }) {
    const now = new Date();
    const jstNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
    const nowHHMM = `${String(jstNow.getHours()).padStart(2, '0')}:${String(jstNow.getMinutes()).padStart(2, '0')}`;
    const items = (timetables || []);
    // Group by direction
    const directions = Array.from(new Set(items.map(t => t['odpt:railDirection']).filter(Boolean)));

    if (!items.length) {
        const isJR = stationId?.includes('JR-East');
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-3xl border border-dashed border-slate-200 text-center space-y-4">
                <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center text-2xl">
                    🕰️
                </div>
                <div>
                    <p className="text-sm font-bold text-slate-600">
                        {locale.startsWith('zh') ? '暫無時刻表資料' : locale === 'ja' ? '時刻表データがありません' : 'No timetable data available'}
                    </p>
                    {isJR && (
                        <p className="text-xs text-slate-400 mt-1">
                            {locale.startsWith('zh') ? 'JR 東日本車站請參閱官方網站。' : locale === 'ja' ? 'JR東日本の駅は公式サイトをご覧ください。' : 'Please check JR East official website.'}
                        </p>
                    )}
                </div>
                {isJR && (
                    <a
                        href="https://www.jreast.co.jp/estation/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-green-600 text-white text-xs font-bold rounded-xl hover:bg-green-700 transition-colors shadow-sm flex items-center gap-2"
                    >
                        <span>JR East Timetable</span>
                        <ExternalLink size={12} />
                    </a>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {directions.map((dir) => {
                const tables = items.filter(t => t['odpt:railDirection'] === dir);
                // Try to get a human readable direction name
                // Usually railDirection is like "odpt.RailDirection:TokyoMetro.Marunouchi.Ogikubo"
                const dirName = String(dir).split('.').pop() || 'Unknown';

                return (
                    <div key={dir} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                        <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex justify-between items-center">
                            <span className="text-xs font-black text-slate-600 uppercase tracking-wider">To {dirName}</span>
                            <span className="text-[10px] font-bold text-slate-400">Next Departures</span>
                        </div>
                        <div className="p-3 grid grid-cols-1 gap-3">
                            {tables.map(table => {
                                const objs = (table['odpt:stationTimetableObject'] || []).map(o => ({
                                    time: String(o['odpt:departureTime'] || ''),
                                    dest: String(o['odpt:destinationStation'] || '').split('.').pop(),
                                    isExpress: (String(o['odpt:trainType'] || '').toLowerCase().includes('express'))
                                }));
                                // Filter future trains
                                const next = objs.filter(o => o.time >= nowHHMM).sort((a, b) => a.time.localeCompare(b.time)).slice(0, 8);
                                const calendar = String(table['odpt:calendar']).split(':').pop();

                                return (
                                    <div key={table['@id']} className="flex flex-col gap-2">
                                        <div className="text-xs font-bold text-indigo-600 border-b border-indigo-50 pb-1 mb-1">{calendar}</div>
                                        <div className="flex flex-wrap gap-2">
                                            {next.map((t, idx) => (
                                                <div key={`${t.time}-${idx}`} className="flex flex-col items-center p-2 bg-slate-50 rounded-lg min-w-[3rem]">
                                                    <span className="text-sm font-black text-slate-800">{t.time}</span>
                                                    {t.dest && <span className="text-[9px] text-slate-400 truncate max-w-[4rem]">{t.dest}</span>}
                                                </div>
                                            ))}
                                            {next.length === 0 && <span className="text-slate-400 text-xs italic">Service ended for today</span>}
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

function SuggestionModule({ suggestion }: { suggestion: L4Suggestion }) {
    return (
        <div className="space-y-3">
            {suggestion.options.map((opt, i) => (
                <div key={i} className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
                    <div className="font-black text-slate-900 mb-2">{opt.label}</div>
                    <div className="space-y-2">
                        {opt.steps.map((step, j) => (
                            <div key={j} className="flex gap-3 text-sm font-bold text-slate-600">
                                <div className="w-6 text-center">{step.icon || '•'}</div>
                                <div className="flex-1">{step.text}</div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
