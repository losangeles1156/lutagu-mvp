/**
 * HybridEngine - AI 混合型智慧引擎 (Refactored with SkillRegistry)
 *
 * 整合四層架構：
 * L1: Template Engine + POITaggedDecisionEngine (最快)
 * L2: Algorithm Provider (標準)
 * L3/L4: Deep Research Skills + DataMux (深度 AI)
 * L5: Safety Layer (最高優先)
 */

import { templateEngine } from './intent/TemplateEngine';
import { algorithmProvider } from './algorithms/AlgorithmProvider';
import { extractRouteEndpointsFromText, buildLastTrainSuggestion, type SupportedLocale } from './assistantEngine';
import { metricsCollector } from './monitoring/MetricsCollector';
import { DataNormalizer } from './utils/Normalization';
import { feedbackStore } from './monitoring/FeedbackStore';
import { AnomalyDetector } from './utils/AnomalyDetector';
import { getJSTTime } from '@/lib/utils/timeUtils';
import { POITaggedDecisionEngine } from '@/lib/ai/poi-tagged-decision-engine';
import { translateDisruption } from '@/lib/odpt/odptDisruptionTranslations';
import { preDecisionEngine, DecisionLevel } from '@/lib/ai/PreDecisionEngine';
import { generateLLMResponse } from '@/lib/ai/llmService';
import { DataMux } from '@/lib/data/DataMux';
import { StrategyContext } from '@/lib/ai/strategyEngine';
import { AgentRouter } from '@/lib/ai/AgentRouter';
import { executeSkill, skillRegistry } from './skills/SkillRegistry';
import { AGENT_ROLES, streamWithFallback } from '@/lib/agent/providers';
import { getPartnerUrl } from '@/config/partners';
import { STATION_MAP } from '@/lib/api/nodes';
import {
    FareRulesSkill,
    AccessibilitySkill,
    LuggageSkill,
    LastMileSkill,
    CrowdDispatcherSkill,
    SpatialReasonerSkill
} from './skills/implementations';

export interface HybridResponse {
    source: 'template' | 'algorithm' | 'llm' | 'poi_tagged' | 'knowledge' | 'l2_disruption';
    type: 'text' | 'card' | 'route' | 'fare' | 'action' | 'recommendation' | 'expert_tip';
    content: string;
    data?: any;
    confidence: number;
    reasoning?: string;
    reasoningLog?: string[];
}

export interface RequestContext {
    userId?: string;
    userLocation?: { lat: number; lng: number };
    preferences?: {
        categories?: string[];
        priceRange?: number[];
    };
    currentStation?: string;
    strategyContext?: StrategyContext | null;
}

export class HybridEngine {
    private poiTaggedEngine: POITaggedDecisionEngine | null = null;

    constructor() {
        // Register Deep Research Skills
        skillRegistry.register(new FareRulesSkill());
        skillRegistry.register(new AccessibilitySkill());
        skillRegistry.register(new LuggageSkill());
        skillRegistry.register(new LastMileSkill());
        skillRegistry.register(new CrowdDispatcherSkill());
        skillRegistry.register(new SpatialReasonerSkill());
    }

    private getPoiEngine(): POITaggedDecisionEngine {
        if (this.poiTaggedEngine) return this.poiTaggedEngine;

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
        const redisUrl = process.env.REDIS_URL;

        if (!supabaseUrl || !supabaseKey) {
            console.warn('[HybridEngine] Missing Supabase credentials for POI Engine');
        }

        this.poiTaggedEngine = new POITaggedDecisionEngine(
            supabaseUrl || '',
            supabaseKey || '',
            redisUrl,
            {
                enableRedisCache: !!redisUrl,
                enableQueryNormalization: true,
                enablePrefetch: true,
                enableSimilarityFallback: true,
                maxSimilarResults: 5,
                similarityThreshold: 0.6,
                cacheTTLSeconds: 3600,
                maxResults: 10
            }
        );
        return this.poiTaggedEngine;
    }

    public async processRequest(params: {
        text: string;
        locale: string;
        context?: RequestContext;
        onProgress?: (step: string) => void;
        onToken?: (delta: string) => void;
    }): Promise<HybridResponse | null> {
        const startTime = Date.now();
        const { text, locale: inputLocale, context } = params;
        const locale = (inputLocale || 'zh-TW') as SupportedLocale;
        const logs: string[] = [];

        const safeText = typeof text === 'string' && text.length > 500 ? `${text.slice(0, 500)}…` : text;
        logs.push(`[Input] Text: "${safeText}", Locale: ${locale}`);

        const finalize = (res: HybridResponse): HybridResponse => {
            const mergedLogs = [...logs, ...((res.reasoningLog || []).filter(Boolean))];
            const fused = this.applyResponseFuse({
                text,
                locale,
                context,
                response: { ...res, reasoningLog: undefined },
                logs: mergedLogs
            });
            metricsCollector.recordRequest(fused.source, Date.now() - startTime);
            feedbackStore.logRequest({ text, source: fused.source, timestamp: startTime });
            if (params.onToken) params.onToken(fused.content);
            return { ...fused, reasoningLog: mergedLogs };
        };

        try {
            // 0. Anomaly Detection
            const anomaly = AnomalyDetector.isAnomaly(text);
            if (anomaly.isAnomaly) {
                logs.push(`[Anomaly] Detected: ${anomaly.reason}`);
                return {
                    source: 'template',
                    type: 'text',
                    content: locale.startsWith('ja')
                        ? 'すみません、よくわかりませんでした。具体的な駅名や質問を入力してください。'
                        : locale.startsWith('en')
                            ? 'Sorry, I didn\'t quite understand. Please try entering a specific station or question.'
                            : '抱歉，我不太明白您的意思，請試著輸入具體的站點或問題。',
                    confidence: 1.0,
                    reasoning: `Anomaly detection: ${anomaly.reason}`,
                    reasoningLog: logs
                };
            }

            // Proactive L2 Warning: If critical, force L2 advice even if not explicitly asked
            const l2Status = (context?.strategyContext as any)?.l2Status;
            const isSevere = this.isSevereDisruption(l2Status);

            const l2DisruptionEarly = this.tryBuildL2DisruptionResponse(text, locale, context, isSevere);
            if (l2DisruptionEarly) {
                logs.push(`[L2] Live disruption detected (Severe=${isSevere}), returning disruption-first guidance`);
                return finalize(l2DisruptionEarly);
            }

            const routeEndpoints = extractRouteEndpointsFromText(text);
            if (routeEndpoints) {
                logs.push('[L2] Route endpoints detected, prefer algorithm routes');
                const routeMatch = await this.checkAlgorithms(text, locale, context);
                if (routeMatch && (routeMatch.type === 'route' || routeMatch.type === 'action')) {
                    return finalize(routeMatch);
                }
            }

            // 1. Legacy Regex Skill (Fast Path)
            const matchedSkill = skillRegistry.findMatchingSkill(text, context || {});
            if (matchedSkill) {
                logs.push(`[Deep Research] Legacy Skill Triggered: ${matchedSkill.name}`);
                const { result: skillResult, meta } = await executeSkill(matchedSkill, text, context || {});
                logs.push(`[Deep Research] Skill Exec: cache=${meta.fromCache}, dur=${meta.durationMs}ms${meta.errorCode ? `, code=${meta.errorCode}` : ''}`);
                if (skillResult) {
                    return finalize(skillResult);
                }
            }

            // 2. Intent Classification (PreDecisionEngine)
            const decision = await preDecisionEngine.classifyIntent(text);
            logs.push(`[Intent] Classified Level: ${decision.level} (Conf: ${decision.confidence})`);

            // 3. Agentic Skill Router (Complex Queries Only)
            if (decision.level === DecisionLevel.LEVEL_3_COMPLEX) {
                try {
                    if (params.onProgress) params.onProgress(locale === 'en' ? "Analyzing intent..." : "正在分析意圖...");
                    const agentDecision = await AgentRouter.selectTool(text, skillRegistry.getSkills());
                    if (agentDecision) {
                        if (params.onProgress) params.onProgress(locale === 'en' ? `Using tool: ${agentDecision.toolName}` : `正在調用工具：${agentDecision.toolName}`);
                        logs.push(`[Deep Research] Agent Decision: ${agentDecision.toolName} (Reason: ${agentDecision.reasoning})`);
                        const skill = skillRegistry.findByToolName(agentDecision.toolName);
                        if (skill) {
                            const { result: skillResult, meta } = await executeSkill(skill, text, context || {}, agentDecision.parameters);
                            logs.push(`[Deep Research] Skill Exec: cache=${meta.fromCache}, dur=${meta.durationMs}ms${meta.errorCode ? `, code=${meta.errorCode}` : ''}`);
                            if (skillResult) {
                                const withAgentLogic = {
                                    ...skillResult,
                                    reasoningLog: [`Agent Logic: ${agentDecision.reasoning}`, ...(skillResult.reasoningLog || [])]
                                };
                                return finalize(withAgentLogic);
                            }
                        }
                    }
                } catch (agentError) {
                    console.error('[HybridEngine] Agent Router Failed:', agentError);
                    logs.push(`[Error] Agent Router: ${agentError}`);
                }
            }

            let bestMatch: HybridResponse | null = null;

            // 4. Level 1: Template Engine
            if (decision.level === DecisionLevel.LEVEL_1_SIMPLE) {
                if (params.onProgress) params.onProgress(locale === 'en' ? "Checking templates..." : "正在比對範本...");
                logs.push(`[L1] Checking Templates...`);
                bestMatch = await this.checkTemplates(text, locale);
            }

            // 5. Level 2: Algorithm Provider + POI Search
            if (!bestMatch && (decision.level === DecisionLevel.LEVEL_2_MEDIUM || decision.level === DecisionLevel.LEVEL_1_SIMPLE)) {
                if (params.onProgress) params.onProgress(locale === 'en' ? "Searching algorithms & POI..." : "正在搜尋大數據與地點資訊...");
                logs.push(`[L2] Checking Algorithms & POI Tags...`);
                const [poiMatch, algorithmMatch] = await Promise.all([
                    this.checkPOITags(text, locale, context),
                    this.checkAlgorithms(text, locale, context)
                ]);

                if (poiMatch && poiMatch.confidence >= 0.6) {
                    bestMatch = poiMatch;
                } else if (algorithmMatch && algorithmMatch.confidence >= 0.8) {
                    bestMatch = algorithmMatch;
                }
            }

            // 6. Level 3/4: DataMux Enrichment Fallback
            let enrichedData: any = null;
            if (!bestMatch && context?.currentStation) {
                logs.push(`[L3/L4] Checking DataMux Enrichment...`);
                try {
                    enrichedData = await DataMux.enrichStationData(context.currentStation, {
                        userId: context.userId || 'anon',
                        locale: locale,
                        userProfile: 'general'
                    });

                    if (enrichedData?.l4_cards && enrichedData.l4_cards.length > 0) {
                        bestMatch = {
                            source: 'knowledge',
                            type: 'expert_tip',
                            content: enrichedData.summary || 'Here is some expert advice.',
                            data: {
                                results: enrichedData.l4_cards,
                                l2_status: context?.strategyContext?.l2Status
                            },
                            confidence: 0.9,
                            reasoning: 'DataMux enriched content found.',
                            reasoningLog: logs
                        };
                    }
                } catch (e) {
                    console.error('[HybridEngine] DataMux Enrichment failed:', e);
                }
            }

            // 7. Post-processing and Metrics
            if (bestMatch) {
                return finalize(bestMatch);
            }

            // 8. Fallback (LLM Orchestrator)
            if (params.onProgress) params.onProgress(locale === 'en' ? "Synthesizing expert advice..." : "正在彙整專家建議...");
            logs.push(`[Fallback] Delegating to LLM Service with Context...`);

            // Use existing enriched data if available for enriched prompt
            let activeKnowledgeSnippet = '';
            if (enrichedData?.l4_knowledge) {
                const k = enrichedData.l4_knowledge;
                const t = k.traps?.slice(0, 3).map((it: any) => `[Trap] ${it.title}: ${it.desc}`).join('\n') || '';
                const h = k.hacks?.slice(0, 3).map((it: any) => `[Hack] ${it.title}: ${it.desc}`).join('\n') || '';
                activeKnowledgeSnippet = `Station Knowledge:\n${t}\n${h}`;
            }

            const systemPrompt = this.buildSystemPrompt(locale);
            const userPrompt = this.buildUserPrompt(text, { ...context, wisdomSummary: activeKnowledgeSnippet } as any);

            let llmResponse: string | null = null;
            const hasL2Issues = this.hasL2Issues(l2Status);
            if (params.onToken && !hasL2Issues) {
                const model = process.env.DEEPSEEK_API_KEY ? AGENT_ROLES.synthesizer : AGENT_ROLES.brain;
                const result: any = streamWithFallback({
                    model,
                    system: systemPrompt,
                    messages: [{ role: 'user', content: userPrompt }]
                });

                let acc = '';
                const textStream: any = result?.textStream;
                if (textStream && typeof textStream[Symbol.asyncIterator] === 'function') {
                    for await (const delta of textStream as AsyncIterable<string>) {
                        acc += delta;
                        params.onToken(delta);
                    }
                    llmResponse = acc;
                } else {
                    llmResponse = (await result.text) || null;
                    if (llmResponse) params.onToken(llmResponse);
                }
            } else {
                llmResponse = await generateLLMResponse({
                    systemPrompt,
                    userPrompt,
                    taskType: 'chat',
                    temperature: 0.7,
                    model: 'gemini-3-flash-preview'
                });
            }

            if (llmResponse) {
                return finalize({
                    source: 'llm',
                    type: 'text',
                    content: llmResponse,
                    confidence: 0.6,
                    reasoning: 'Fallback to General LLM with Context',
                });
            }

        } catch (error) {
            console.error('[HybridEngine] Process Request failed:', error);
            logs.push(`[Error] ${error}`);
        }

        // Final safe fallback
        const fallbackMessages: Record<string, string> = {
            'zh-TW': '系統暫時忙碌中，請稍後再試。',
            'ja': '現在システムが混み合っております。お時間を置いて再度お試しください。',
            'en': 'System is busy, please try again later.'
        };

        return {
            source: 'template',
            type: 'text',
            content: fallbackMessages[locale] || fallbackMessages['zh-TW'],
            confidence: 0.1,
            reasoningLog: logs
        };
    }

    private async checkPOITags(text: string, locale: SupportedLocale, context?: RequestContext): Promise<HybridResponse | null> {
        const poiKeywords = ['吃', '餐廳', '食物', '飯', '午餐', '晚餐', '日本料理', '拉麵', '壽司', '咖哩', 'cafe', '咖啡', '咖啡廳', '下午茶', '買', '購物', '商店', '商場', '藥妝', '電器', '玩', '景點', '公園', '博物館', '推薦', '好店', '好玩', '推薦我'];
        const lowerText = text.toLowerCase();
        if (!poiKeywords.some(kw => text.includes(kw) || lowerText.includes(kw.toLowerCase()))) return null;

        try {
            const results = await this.getPoiEngine().decide({
                userId: context?.userId,
                location: context?.userLocation,
                preferences: context?.preferences
            }, text);
            if (results.length === 0) return null;

            const topResults = results.slice(0, 5);
            const formattedResults = topResults.map((poi, index) => {
                const loc = poi.locationTags;
                const cat = poi.categoryTags;
                return `${index + 1}. ${poi.name}\n   📍 ${loc?.station_name || '未知車站'}\n   🏷️ ${cat?.secondary || poi.category}${poi.atmosphereTags ? `\n   ✨ 氣氛: ${poi.atmosphereTags.core?.energy}` : ''}${poi.matchedCriteria.length > 0 ? `\n   ✅ ${poi.matchedCriteria.join(', ')}` : ''}`;
            }).join('\n\n');

            const header = locale.startsWith('zh') ? `為您找到 ${results.length} 個推薦：\n\n` : locale.startsWith('ja') ? `${results.length}件のおすすめが見つかりました：\n\n` : `Found ${results.length} recommendations：\n\n`;

            return {
                source: 'poi_tagged',
                type: 'recommendation',
                content: header + formattedResults,
                data: { results: topResults, totalCount: results.length },
                confidence: Math.min(0.95, 0.5 + results.length * 0.1),
                reasoning: 'Matched POI tags'
            };
        } catch (e) { return null; }
    }

    private async checkTemplates(text: string, locale: SupportedLocale): Promise<HybridResponse | null> {
        const match = templateEngine.match(text, locale);
        if (match) {
            return {
                source: 'template',
                type: match.type,
                content: match.content,
                data: match.data,
                confidence: 1.0,
                reasoning: 'Matched high-frequency pattern/FAQ template.'
            };
        }
        return null;
    }

    private async checkAlgorithms(text: string, locale: SupportedLocale, context?: RequestContext): Promise<HybridResponse | null> {
        const lowerText = text.toLowerCase();
        const l2Status = (context?.strategyContext as any)?.l2Status;

        if (/(?:票價|多少錢|fare|運賃)/i.test(text)) {
            const destMatch = text.match(/(?:到|至|まで|to)\s*([^?\s]+)/i);
            const nameMatch = text.match(/([^?\s]+)(?:的)?(?:票價|車資|運賃|fare)/i);
            const destName = (destMatch?.[1] || nameMatch?.[1] || '').trim();
            if (destName && context?.currentStation) {
                const destId = DataNormalizer.lookupStationId(destName);
                if (destId) {
                    try {
                        const fare = await algorithmProvider.calculateFare(context.currentStation, destId);
                        if (fare) {
                            return {
                                source: 'algorithm',
                                type: 'fare',
                                content: locale.startsWith('zh') ? `前往 ${destName} 的票價約為 ${fare.ic} 日圓 (IC 卡)。` : `The fare to ${destName} is approximately ${fare.ic} JPY.`,
                                data: { fare, destination: destName },
                                confidence: 0.9,
                                reasoning: 'Calculated fare via algorithm.'
                            };
                        }
                    } catch (e) { }
                }
            }
        }

        // Route Intent
        if (lowerText.match(/(?:到|to|まで|route|怎么去|怎麼去|去|前往|步行|走路)/)) {
            const endpoints = extractRouteEndpointsFromText(text);
            if (endpoints) {
                const originLabel = endpoints.originText || endpoints.originIds[0]?.split('.').pop() || endpoints.originIds[0];
                const destLabel = endpoints.destinationText || endpoints.destinationIds[0]?.split('.').pop() || endpoints.destinationIds[0];

                for (const originId of endpoints.originIds) {
                    for (const destinationId of endpoints.destinationIds) {
                        try {
                            const routes = await algorithmProvider.findRoutes({ originId, destinationId, locale, l2Status });
                            if (routes && routes.length > 0) {
                                let content = locale.startsWith('zh') ? `為您找到從 ${originLabel} 到 ${destLabel} 的路線建議。` : `Found routes from ${originLabel} to ${destLabel}.`;

                                // Prepend disruption warning if L2 issues exist, even if we found a route
                                if (l2Status && this.hasL2Issues(l2Status)) {
                                    const summary = this.summarizeL2Status(l2Status);
                                    const warning = locale.startsWith('ja')
                                        ? `⚠️ 現在、運行に乱れがあります（${summary}）。回避ルートを提案します。\n\n`
                                        : locale.startsWith('en')
                                            ? `⚠️ Live disruption detected (${summary}). Here are alternative routes.\n\n`
                                            : `⚠️ 目前有運行異常（${summary}）。已為您規劃避開受影響路段的替代方案。\n\n`;
                                    content = warning + content;
                                }

                                // WVT: Check if late night and add末班車 suggestion
                                const lastTrainSuggestion = buildLastTrainSuggestion({
                                    stationId: destinationId,
                                    currentTime: new Date(),
                                    locale
                                });

                                return {
                                    source: 'algorithm',
                                    type: 'route',
                                    content,
                                    data: {
                                        routes,
                                        originId,
                                        destinationId,
                                        l2_status: l2Status,
                                        lastTrainSuggestion // Will be null if not late night
                                    },
                                    confidence: 0.95,
                                    reasoning: 'Calculated route via algorithm (with L2 awareness).'
                                };
                            }

                            if (l2Status && this.hasL2Issues(l2Status)) {
                                // Fallback coordinates for major hubs
                                const FALLBACK_COORDS: Record<string, { lat: number, lon: number }> = {
                                    'Tokyo': { lat: 35.6812, lon: 139.7671 }, '東京': { lat: 35.6812, lon: 139.7671 },
                                    'Ueno': { lat: 35.7141, lon: 139.7774 }, '上野': { lat: 35.7141, lon: 139.7774 },
                                    'Shinjuku': { lat: 35.6896, lon: 139.7006 }, '新宿': { lat: 35.6896, lon: 139.7006 },
                                    'Shibuya': { lat: 35.6580, lon: 139.7016 }, '渋谷': { lat: 35.6580, lon: 139.7016 },
                                    'Ikebukuro': { lat: 35.7295, lon: 139.7109 }, '池袋': { lat: 35.7295, lon: 139.7109 },
                                    'Shinagawa': { lat: 35.6284, lon: 139.7387 }, '品川': { lat: 35.6284, lon: 139.7387 },
                                    'Maihama': { lat: 35.6366, lon: 139.8831 }, '舞浜': { lat: 35.6366, lon: 139.8831 }
                                };

                                let originCoord = this.getStationCoord(originId);
                                if (!originCoord && FALLBACK_COORDS[originLabel]) originCoord = FALLBACK_COORDS[originLabel];

                                let destCoord = this.getStationCoord(destinationId);
                                if (!destCoord && FALLBACK_COORDS[destLabel]) destCoord = FALLBACK_COORDS[destLabel];

                                const originParam = originCoord ? `${originCoord.lat},${originCoord.lon}` : originLabel;
                                const destParam = destCoord ? `${destCoord.lat},${destCoord.lon}` : destLabel;

                                const gmapsTransitUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(originParam)}&destination=${encodeURIComponent(destParam)}&travelmode=transit`;
                                const gmapsDrivingUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(originParam)}&destination=${encodeURIComponent(destParam)}&travelmode=driving`;
                                const gmapsBikeUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(originParam)}&destination=${encodeURIComponent(destParam)}&travelmode=bicycling`;

                                const distanceKm = originCoord && destCoord
                                    ? this.getDistanceFromLatLonInKm(originCoord.lat, originCoord.lon, destCoord.lat, destCoord.lon)
                                    : 5.0; // Default 5km to ensure ETA generation

                                const taxiEta = typeof distanceKm === 'number' ? this.estimateEtaMinutes(distanceKm, 'taxi') : null;
                                const bikeEta = typeof distanceKm === 'number' ? this.estimateEtaMinutes(distanceKm, 'bike') : null;
                                const etaSuffixTaxi = taxiEta ? this.formatEtaLabel(taxiEta.min, taxiEta.max, locale) : '';
                                const etaSuffixBike = bikeEta ? this.formatEtaLabel(bikeEta.min, bikeEta.max, locale) : '';

                                const busPrompt = locale.startsWith('ja')
                                    ? `都営バスで ${originLabel} → ${destLabel} の行き方を教えて（最短・迷いにくい）`
                                    : locale.startsWith('en')
                                        ? `Find a Toei bus option from ${originLabel} to ${destLabel} (simple + reliable)`
                                        : `幫我找都營公車：${originLabel} → ${destLabel}（最簡單、最不容易迷路）`;
                                const preferBusOverBike = typeof distanceKm === 'number' ? distanceKm >= 1.5 : false;

                                const content = locale.startsWith('ja')
                                    ? `いま運行が乱れているため、この区間の「乗れる経路」だけに絞るとルートが見つかりませんでした。\n\n**おすすめの行動**：**Google Maps（公共交通）** で地下鉄／バスの迂回を確認してください。`
                                    : locale.startsWith('en')
                                        ? `Live disruption is affecting service, so I couldn't find a usable route for this segment right now.\n\n**Recommendation**: Open **Google Maps (Transit)** to follow a subway/bus detour.`
                                        : `因為目前有即時運行異常，我把「不能搭乘的路線」排除後，這段暫時找不到可用路線。\n\n**唯一建議**：先開 **Google Maps（大眾運輸）** 看地鐵／公車的繞行最穩。`;

                                return {
                                    source: 'algorithm',
                                    type: 'action',
                                    content,
                                    data: {
                                        l2_summary: this.summarizeL2Status(l2Status),
                                        l2_status: l2Status,
                                        actions: [
                                            { type: 'discovery', label: locale.startsWith('ja') ? 'A→B 迂回（Google Maps）' : locale.startsWith('en') ? 'A→B detour (Google Maps)' : 'A→B 迂回（Google Maps）', target: gmapsTransitUrl, metadata: { category: 'navigation', origin: originLabel, destination: destLabel, distance_km: distanceKm ?? undefined } },
                                            { type: 'taxi', label: locale.startsWith('ja') ? `タクシー（急ぐ場合）${etaSuffixTaxi}` : locale.startsWith('en') ? `Taxi (if urgent)${etaSuffixTaxi}` : `計程車（趕時間）${etaSuffixTaxi}`, target: getPartnerUrl('go_taxi') || gmapsDrivingUrl, metadata: { category: 'mobility', partner_id: 'go_taxi', eta_min: taxiEta?.min, eta_max: taxiEta?.max, route_url: gmapsDrivingUrl } },
                                            preferBusOverBike
                                                ? { type: 'transit', label: locale.startsWith('ja') ? '都営バス案内（アプリ内）' : locale.startsWith('en') ? 'Toei bus option (in-app)' : '都營公車方案（App 內）', target: `chat:${busPrompt}`, metadata: { category: 'transit', partner_id: 'toei_bus', origin: originLabel, destination: destLabel, distance_km: distanceKm ?? undefined } }
                                                : { type: 'bike', label: locale.startsWith('ja') ? `シェアサイクル（LUUP）${etaSuffixBike}` : locale.startsWith('en') ? `Shared bike (LUUP)${etaSuffixBike}` : `共享單車（LUUP）${etaSuffixBike}`, target: getPartnerUrl('luup') || gmapsBikeUrl, metadata: { category: 'mobility', partner_id: 'luup', eta_min: bikeEta?.min, eta_max: bikeEta?.max, route_url: gmapsBikeUrl } }
                                        ]
                                    },
                                    confidence: 0.88,
                                    reasoning: 'No usable route after filtering suspended lines.'
                                };
                            }
                        } catch (e) { }
                    }
                }
            }
        }
        return null;
    }

    private buildSystemPrompt(locale: SupportedLocale): string {
        const prompts: Record<string, string> = {
            'zh-TW': `你是 LUTAGU (鹿引)，一位住在東京、熱心又專業的「在地好友」。
你的使命：用溫暖、口語且像真實朋友對話的方式，提供東京交通決策。
請善用提供給你的「攻略 (Hacks)」與「陷阱 (Traps)」資訊。
若提供了 L2 即時運行資訊（延誤/停駛/原因/影響路線），你必須在回覆中清楚引用並轉成可執行的建議。
✅ 格式要求：可以使用 Markdown 加粗關鍵字 (如 **平台號碼**、**出口名稱**)。可以使用條列式說明多個步驟。
⚠️ 核心原則【一個建議 (One Suggestion)】：
   - 除非用戶明確要求比較，否則 **只提供一個最佳建議**。
   - 不要說「你可以搭 A 也可以搭 B」，直接說「我建議搭 A，因為...」。
   - 幫助用戶做決定，而不是給予更多選項。
⚠️ 邏輯安全守則：若無確切數據，請優先建議搭乘電車/地鐵。**嚴禁** 建議用戶步行超過 1.5 公里 (除非用戶明確要求健行)。
🛑 限制：回覆不超過 5 句話。保持語氣自然親切，不要像機器人。
🔴 MISSING INFORMATION RULE - 資訊不足時主動詢問：
   - 當用戶詢問路線但缺少起點或終點時（例如「從哪裡出發？」），**不要假設**特定起點（如東京車站）。
   - 請用友善的語氣詢問用戶即時補充：「請問您現在在哪個車站出發呢？」或「您想從哪裡出發？」
   - 只有在無法從上下文中推斷出起點時才詢問（若上下文包含位置資訊，請使用該位置）。`,
            'ja': `あなたは LUTAGU (ルタグ)、東京に住む親切でプロフェッショナルな「地元の友達」です。
使命：温かく、親しみやすい口調で、実用的な東京の交通アドバイスを提供すること。
提供された「攻略 (Hacks)」や「罠 (Traps)」の情報を活用してください。
L2のリアルタイム運行情報（遅延/運休/原因/影響路線）が提供されている場合、必ずそれを引用して実行可能な提案に変換してください。
✅ 形式：Markdown太字（**ホーム番号**、**出口名**など）や箇条書きを使用して見やすくしてください。
⚠️ ガイドライン【一つの提案 (One Suggestion)】：
   - 比較を求められない限り、**最適な一つだけ**を提案してください。
   - 「AもBも可能です」ではなく、「Aがおすすめです。理由は...」と伝えてください。
   - ユーザーの決断を助けることが目的です。
🛑 制限：5文以内。ロボットのような堅苦しい口調は避けてください。
🔴 MISSING INFORMATION RULE - 情報不足時の確認：
   - 出発地や目的地が不明な場合（例：「どこから？」）、特定の駅（東京駅など）を**勝手に仮定しないでください**。
   - 親切に尋ねてください：「現在はどちらの駅にいらっしゃいますか？」
   - 文脈から推測できない場合のみ質問してください。`,
            'en': `You are LUTAGU, a helpful and professional "Local Friend" in Tokyo.
Mission: Provide practical transit advice with a warm, conversational tone.
Use the provided "Hacks" and "Traps" context whenever relevant.
If L2 live operation info (delay/suspension/cause/affected lines) is provided, explicitly cite it and turn it into an actionable recommendation.
✅ Format: You MAY use Markdown bold (**platforms**, **exit names**) and bullet points for clarity.
⚠️ Core Principle【One Suggestion】:
   - Unless explicitly asked to compare, provide **ONLY ONE best recommendation**.
   - Do not say "You can take A or B". Say "I recommend taking A because...".
   - Help the user make a decision, do not burden them with choices.
🛑 Constraint: Max 5 sentences. Keep it natural and friendly.
🔴 MISSING INFORMATION RULE:
   - If origin/destination is missing, DO NOT assume a default (e.g. Tokyo Station).
   - Proactively ask: "Where are you starting from?"
   - Only ask if context is insufficient.`
        };
        return prompts[locale] || prompts['zh-TW'];
    }

    private buildUserPrompt(query: string, ctx?: RequestContext & { wisdomSummary?: string }): string {
        const jst = getJSTTime();
        const timeStr = `${String(jst.hour).padStart(2, '0')}:${String(jst.minute).padStart(2, '0')}`;
        let prompt = `Current Time (JST): ${timeStr}\nUser Query: ${query}\n`;
        if (ctx?.userLocation) prompt += `Location: ${ctx.userLocation.lat}, ${ctx.userLocation.lng}\n`;
        if (ctx?.currentStation) prompt += `Station: ${ctx.currentStation}\n`;

        const strategy = ctx?.strategyContext as any;
        if (strategy?.nodeName) prompt += `Node: ${strategy.nodeName}\n`;

        const l2 = strategy?.l2Status;
        const l2Summary = this.summarizeL2Status(l2);
        if (l2Summary) {
            prompt += `L2 Live Status Summary: ${l2Summary}\n`;
        }
        if (l2) {
            const s = this.safeJson(l2, 2500);
            if (s) prompt += `L2 Live Status (JSON): ${s}\n`;
        }
        const actions = Array.isArray(strategy?.commercialActions) ? strategy.commercialActions : [];
        if (actions.length > 0) {
            const s = this.safeJson(actions.slice(0, 5), 1500);
            if (s) prompt += `Commercial Actions: ${s}\n`;
        }

        // Inject rich knowledge
        const knowledge = ctx?.wisdomSummary || (ctx?.strategyContext as any)?.wisdomSummary;
        if (knowledge) prompt += `Context Info:\n${knowledge}\n`;

        return prompt + `\nPlease respond as LUTAGU based on the system prompt.`;
    }

    private isStatusQuery(text: string): boolean {
        const t = String(text || '').trim();
        const lower = t.toLowerCase();

        const statusKeywords = /運行|運轉|復舊|恢復|恢复|改善|延誤|誤點|遲延|停駛|停運|停電|見合わせ|運休|遅延|影響|振替|狀態|狀況|異常|better|improve|delay|delayed|status|suspend|suspended|stopp|power outage|blackout|disruption|recovery|recover(ed)?|back to normal|normal( now)?/i;
        if (statusKeywords.test(t)) return true;

        const jrMention = /jr|山手|中央線|京浜東北|総武|埼京|湘南新宿|yamanote|chuo|keihin|sobu|saikyo/i.test(lower);

        // If specific line mentioned + question cue, treat as status
        const questionCues = /怎樣|如何|怎麼|現在|還|正常|有沒有|有無|是否|情況|狀況|大丈夫|動いて|動いてる|能搭|可以|開了|running|ok|fine|any issue|issue|can i|can we|is it|are we|as usual|usual|safe to|is it safe|back to normal|normal now/i;

        if (jrMention && questionCues.test(t)) return true;

        // Also if simply "JR" + "Status" combo which might have been caught by statusKeywords but let's be safe
        return false;
    }

    private summarizeL2Status(l2: any): string {
        if (!l2 || typeof l2 !== 'object') return '';

        const parts: string[] = [];

        const statusCode = typeof (l2 as any).status_code === 'string' ? (l2 as any).status_code : '';
        const severity = typeof (l2 as any).severity === 'string' ? (l2 as any).severity : '';
        const hasIssues = Boolean((l2 as any).has_issues);
        const delay = Number((l2 as any).delay || (l2 as any).delay_minutes || 0);

        let cause =
            (typeof (l2 as any).cause === 'string' ? (l2 as any).cause : '') ||
            (typeof (l2 as any).reason_zh === 'string' ? (l2 as any).reason_zh : '') ||
            (typeof (l2 as any).reason_ja === 'string' ? (l2 as any).reason_ja : '') ||
            (typeof (l2 as any).reason_en === 'string' ? (l2 as any).reason_en : '') ||
            (typeof (l2 as any).reason === 'string' ? (l2 as any).reason : '');

        // Translate cause for summary context
        if (cause) {
            // Default to zh-TW for system prompt context unless specifically handled per-locale context,
            // but here we just want a readable string for the LLM mainly.
            // Actually, buildUserPrompt context might be locale-specific?
            // summarizeL2Status does not take locale. Let's assume zh-TW or en.
            // Since this function returns a string used in prompt, and system prompt is multilingual but persona is established.
            // Providing zh-TW translation helps the model understand.
            cause = translateDisruption(cause, 'zh-TW');
        }

        let affected = '';
        const affectedLines = Array.isArray((l2 as any).affected_lines) ? (l2 as any).affected_lines : [];
        if (affectedLines.length > 0) {
            affected = affectedLines.map((x: any) => String(x)).filter(Boolean).slice(0, 6).join(', ');
        } else if (Array.isArray((l2 as any).line_status)) {
            const ls = (l2 as any).line_status
                .filter((x: any) => x && x.status && x.status !== 'normal')
                .map((x: any) => x.line || x.name?.en || x.name?.ja || '')
                .filter(Boolean)
                .slice(0, 6);
            if (ls.length > 0) affected = ls.join(', ');
        }

        if (hasIssues) parts.push('has_issues');
        if (statusCode) parts.push(`status_code=${statusCode}`);
        if (severity) parts.push(`severity=${severity}`);
        if (delay > 0) parts.push(`delay=${delay}min`);
        if (cause) parts.push(`cause=${cause}`);
        if (affected) parts.push(`affected_lines=${affected}`);

        return parts.join(' | ');
    }

    private safeJson(value: any, maxChars: number): string {
        try {
            const s = JSON.stringify(value);
            if (!s) return '';
            if (s.length <= maxChars) return s;
            return s.slice(0, Math.max(0, maxChars - 1)) + '…';
        } catch {
            return '';
        }
    }

    private applyResponseFuse(params: {
        text: string;
        locale: SupportedLocale;
        context?: RequestContext;
        response: HybridResponse;
        logs: string[];
    }): HybridResponse {
        const { text, locale, context, response, logs } = params;
        const l2 = (context?.strategyContext as any)?.l2Status;
        if (!this.hasL2Issues(l2)) return response;
        if (response.source === 'l2_disruption') return response;

        const content = String(response.content || '').trim();
        const looksTruncated = this.looksTruncatedContent(content);
        const mentionsDisruption = this.textMentionsDisruption(content);

        if (looksTruncated || !mentionsDisruption) {
            const l2Fallback = this.tryBuildL2DisruptionResponse(text, locale, context, true);
            if (l2Fallback) {
                logs.push(`[Fuse] disruption_fallback: truncated=${looksTruncated} mentions_disruption=${mentionsDisruption}`);
                return l2Fallback;
            }
        }

        return response;
    }

    private textMentionsDisruption(text: string): boolean {
        const t = String(text || '');
        return /即時運行異常|運行有影響|運行停止|運転見合わせ|延誤|遅延|停駛|運休|service disruption|delays?\b|suspend(ed)?\b|halt(ed)?\b/i.test(t);
    }

    private looksTruncatedContent(content: string): boolean {
        const t = String(content || '').trim();
        if (!t) return true;
        if (t.length < 40) return false;

        const opens = [
            { open: '【', close: '】' },
            { open: '（', close: '）' },
            { open: '(', close: ')' },
            { open: '[', close: ']' },
            { open: '{', close: '}' },
            { open: '「', close: '」' },
            { open: '『', close: '』' },
        ];

        const countChar = (s: string, ch: string) => (s.match(new RegExp(ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;

        for (const p of opens) {
            if (countChar(t, p.open) > countChar(t, p.close)) return true;
        }

        const fenceCount = (t.match(/```/g) || []).length;
        if (fenceCount % 2 === 1) return true;

        const endsWithDanglingToken = (() => {
            const m = t.match(/([A-Za-z]+)\s*$/);
            const lastWord = (m?.[1] || '').toLowerCase();
            if (!lastWord) return false;
            const bad = new Set([
                'if',
                'when',
                'because',
                'unless',
                'but',
                'and',
                'or',
                'so',
                'then',
                'with',
                'without',
                'to',
                'of'
            ]);
            return bad.has(lastWord);
        })();
        if (endsWithDanglingToken) return true;

        const last = t.slice(-1);
        if (/[A-Za-z0-9\u3040-\u30ff\u4e00-\u9fff]$/.test(last)) {
            if (t.length >= 80) return true;
        }

        const okEnd = /[。！？.!?）)」』…]$/.test(t);
        if (!okEnd && t.length >= 80) return true;

        if (/(\*\*|【|（|\(|\[|\{|:|,|，|、)$/.test(t)) return true;
        if (/(\*|_|-)$/u.test(t)) return true;
        return false;
    }

    private hasL2Issues(l2: any): boolean {
        if (!l2 || typeof l2 !== 'object') return false;
        if (Boolean((l2 as any).has_issues)) return true;

        const statusCode = String((l2 as any).status_code || '').toUpperCase();
        if (statusCode && statusCode !== 'NORMAL' && statusCode !== 'OK') return true;

        const delay = Number((l2 as any).delay || (l2 as any).delay_minutes || 0);
        if (delay >= 5) return true;

        const lineStatus = Array.isArray((l2 as any).line_status) ? (l2 as any).line_status : null;
        if (lineStatus && lineStatus.some((x: any) => x && x.status && x.status !== 'normal')) return true;

        const reason = String((l2 as any).reason_ja || (l2 as any).reason_en || (l2 as any).reason || '').trim();
        if (reason) return true;
        return false;
    }

    private isSevereDisruption(l2: any): boolean {
        if (!l2) return false;
        const statusCode = String((l2 as any).status_code || '').toUpperCase();
        if (statusCode === 'SUSPENDED' || statusCode === 'CRITICAL') return true;

        const lineStatus = Array.isArray((l2 as any).line_status) ? (l2 as any).line_status : null;
        if (lineStatus && lineStatus.some((x: any) => x && (x.status_detail === 'halt' || x.status_detail === 'canceled' || x.status === 'suspended'))) return true;

        // Keyword detection for natural disasters (severe even if status code lag)
        const combinedText = JSON.stringify(l2);
        const disasterKeywords = /大雪|暴雨|豪雨|台風|地震|津波|typhoon|heavy rain|heavy snow|earthquake|tsunami/i;
        if (disasterKeywords.test(combinedText)) return true;

        return false;
    }

    private guessRouteLabelsFromText(text: string): { origin?: string; destination?: string } | null {
        const raw = String(text || '').replace(/\s+/g, ' ').trim();
        if (!raw) return null;

        const clean = (s: string) =>
            String(s || '')
                .replace(/^[\s\p{P}]+|[\s\p{P}]+$/gu, '')
                .replace(/(?:駅|站)$/u, '')
                .trim();

        const patterns: Array<RegExp> = [
            /(?:從|自)\s*([^，。,.?\n]+?)\s*(?:站|駅)?\s*(?:到|去|往|前往)\s*([^，。,.?\n]+?)\s*(?:站|駅)?/u,
            /在\s*([^，。,.?\n]+?)\s*(?:站|駅)\s*(?:要|想)?\s*(?:去|到|前往)\s*([^，。,.?\n]+?)\s*(?:站|駅)/u,
            /(.+?)\s*(?:->|→|⇒|➡︎|➡️)\s*(.+?)(?:[，。,.?\n]|$)/u,
            /(.+?)から\s*(.+?)まで/u,
            /\bfrom\s+(.+?)\s+to\s+(.+?)(?:[,.?\n]|$)/i
        ];

        for (const re of patterns) {
            const m = raw.match(re);
            const a = clean(m?.[1] || '');
            const b = clean(m?.[2] || '');
            if (a && b && a !== b) return { origin: a, destination: b };
        }

        return null;
    }

    private tryBuildL2DisruptionResponse(text: string, locale: SupportedLocale, context?: RequestContext, forceTrigger: boolean = false): HybridResponse | null {
        if (!forceTrigger && !this.isStatusQuery(text)) return null;
        const strategy = (context?.strategyContext as any) || null;
        const l2 = strategy?.l2Status;
        if (!l2 || typeof l2 !== 'object') return null;

        const summary = this.summarizeL2Status(l2);
        const nodeName = strategy?.nodeName || '';

        let causeText =
            String((l2 as any)?.cause || (l2 as any)?.reason_zh || (l2 as any)?.reason_ja || (l2 as any)?.reason_en || (l2 as any)?.reason || '').trim();

        // Translate cause in correct locale
        causeText = translateDisruption(causeText, locale);

        const affectedLines = Array.isArray((l2 as any)?.affected_lines) ? (l2 as any).affected_lines.map((x: any) => String(x)).filter(Boolean) : [];
        const affected = affectedLines.length > 0 ? affectedLines.slice(0, 5).join('、') : '';
        const delay = Number((l2 as any)?.delay || (l2 as any)?.delay_minutes || 0);

        const hasIssues = this.hasL2Issues(l2);

        // Power outage or severe cause detection
        const hasPower = /停電|power outage|blackout|変電所|substation/i.test(causeText) || /停電|変電所/.test(JSON.stringify(l2));

        const rawText = String(text || '');
        const wantsLuggage = /行李|大行李|luggage|suitcase|荷物|スーツケース/i.test(rawText);
        const wantsWheelchair = /輪椅|wheelchair|車椅子/i.test(rawText);
        const wantsStroller = /嬰兒車|baby stroller|stroller|ベビーカー/i.test(rawText);
        const wantsLastTrain = /末班車|終電|last train|last subway|終電車/i.test(rawText);
        const wantsUrgent = /趕|來不及|急|urgent|asap|hurry|急いで/i.test(rawText);
        const secondaryLink = wantsLuggage
            ? { label: locale.startsWith('ja') ? '行李寄放（ecbo cloak）' : locale.startsWith('en') ? 'Luggage storage (ecbo cloak)' : '行李寄放（ecbo cloak）', url: getPartnerUrl('ecbo_cloak') }
            : { label: locale.startsWith('ja') ? '混雑の少ない場所を探す（Vacan）' : locale.startsWith('en') ? 'Find a less crowded place (Vacan)' : '找不擠的地方等（Vacan）', url: getPartnerUrl('vacan') };

        if (!hasIssues) {
            const normalBase = locale.startsWith('ja')
                ? `${nodeName ? `${nodeName}周辺で` : ''}いまのところ大きな遅延は見当たりません。${delay > 0 ? `（遅れ目安：${delay}分）` : ''}`
                : locale.startsWith('en')
                    ? `${nodeName ? `Around ${nodeName}, ` : ''}no major delays detected right now.${delay > 0 ? ` (Delay: ~${delay} min)` : ''}`
                    : `${nodeName ? `${nodeName}附近` : ''}目前看起來沒有明顯延誤。${delay > 0 ? `（延誤約 ${delay} 分）` : ''}`;

            const nextStep = locale.startsWith('ja')
                ? '目的地（駅名/観光地）を言ってくれれば、最短か乗換少なめで2案出します。'
                : locale.startsWith('en')
                    ? 'Tell me your destination (station/POI) and I’ll give 2 route options.'
                    : '你告訴我目的地（站名/景點），我就給你 2 個路線選項。';

            const content = `${normalBase}\n${nextStep}`.trim();

            return {
                source: 'algorithm',
                type: 'text',
                content,
                data: {
                    l2_summary: summary,
                    l2_status: l2
                },
                confidence: 0.85,
                reasoning: 'L2 live status (normal)'
            };
        }

        const base = locale.startsWith('ja')
            ? `${nodeName ? `${nodeName}周辺で` : ''}現在、運行に乱れがあります。${causeText ? `原因：${causeText}。` : ''}${affected ? `影響：${affected}。` : ''}`
            : locale.startsWith('en')
                ? `${nodeName ? `Around ${nodeName}, ` : ''}there is a live service disruption. ${causeText ? `Cause: ${causeText}. ` : ''}${affected ? `Affected: ${affected}. ` : ''}`
                : `${nodeName ? `${nodeName}附近` : ''}目前出現即時運行異常。${causeText ? `原因：${causeText}。` : ''}${affected ? `影響：${affected}。` : ''}`;

        const delayLine = delay > 0
            ? (locale.startsWith('ja')
                ? `遅れ目安：${delay}分。`
                : locale.startsWith('en')
                    ? `Estimated delay: ~${delay} min. `
                    : `延誤約 ${delay} 分。`)
            : '';

        // Disaster specific advice
        const isTyphoon = /台風|typhoon/i.test(causeText);
        const isSnow = /大雪|積雪|snow/i.test(causeText);
        const isEarthquake = /地震|earthquake|tsunami/i.test(causeText);
        const isRain = /大雨|豪雨|rain/i.test(causeText);

        let safetyAdvice = '';
        if (locale.startsWith('ja')) {
            if (isTyphoon) safetyAdvice = '台風接近時は運休が広がる恐れがあります。早めの帰宅を検討してください。';
            else if (isSnow) safetyAdvice = '降雪時は到着が大幅に遅れるほか、転倒にも注意が必要です。';
            else if (isEarthquake) safetyAdvice = '地震発生時はエレベーターを使わず、係員の指示に従ってください。余震に注意。';
            else if (isRain) safetyAdvice = '大雨の影響で運転見合わせの可能性があります。地下街など安全な場所へ。';
        } else if (locale.startsWith('en')) {
            if (isTyphoon) safetyAdvice = 'Typhoons may cause widespread suspension. Plan to return early.';
            else if (isSnow) safetyAdvice = 'Heavy snow causes major delays. Watch your step for slippery floors.';
            else if (isEarthquake) safetyAdvice = 'During earthquakes, avoid elevators. Follow staff instructions and beware of aftershocks.';
            else if (isRain) safetyAdvice = 'Heavy rain may suspend services. Stay safe indoors or underground.';
        } else {
            // Default zh-TW
            if (isTyphoon) safetyAdvice = '颱風接近時可能會擴大停駛範圍，建議儘早安排回程。';
            else if (isSnow) safetyAdvice = '大雪除造成大幅延誤外，地面濕滑請小心行走，建議預留2倍移動時間。';
            else if (isEarthquake) safetyAdvice = '地震發生時請勿使用電梯，遵從站務員指示。請注意餘震。';
            else if (isRain) safetyAdvice = '豪雨可能導致運轉暫停，請待在地下街等安全室內場所。';
        }

        const primary = locale.startsWith('ja')
            ? `**おすすめの行動**：まずは東京メトロ／都営に切り替えて迂回し、JRを無理に待たないのが安全です。${hasPower ? '停電は復旧見込みが読めないことが多いです。' : ''} ${safetyAdvice}`
            : locale.startsWith('en')
                ? `**Recommendation**: Switch to Tokyo Metro/Toei routes and avoid waiting on JR right now. ${hasPower ? 'Power outages often have uncertain recovery times.' : ''} ${safetyAdvice}`
                : `**唯一建議**：先改走東京Metro／都營迂回，暫時不要硬等 JR。${hasPower ? '停電通常恢復時間不穩。' : ''} ${safetyAdvice}`;

        const needsAdviceParts: string[] = [];
        if (locale.startsWith('ja')) {
            if (wantsWheelchair) needsAdviceParts.push('バリアフリー優先：エレベーター経路・乗換少なめを選びましょう。');
            if (wantsStroller) needsAdviceParts.push('ベビーカーは段差が多いので、乗換少なめ＋エレベーター優先が安心です。');
            if (wantsLastTrain) needsAdviceParts.push('終電が近い場合は待たずに迂回 or タクシーへ切り替えを。');
            if (wantsUrgent) needsAdviceParts.push('急ぎならタクシーが最短です。');
        } else if (locale.startsWith('en')) {
            if (wantsWheelchair) needsAdviceParts.push('Accessibility: choose elevator routes and fewer transfers.');
            if (wantsStroller) needsAdviceParts.push('Stroller: fewer transfers + elevator routes are safer.');
            if (wantsLastTrain) needsAdviceParts.push('If it’s close to the last train, don’t wait—detour or take a taxi.');
            if (wantsUrgent) needsAdviceParts.push('If you’re in a hurry, taxi is the fastest fallback.');
        } else {
            if (wantsWheelchair) needsAdviceParts.push('無障礙優先：挑電梯路線、少轉乘。');
            if (wantsStroller) needsAdviceParts.push('嬰兒車建議少轉乘＋電梯優先。');
            if (wantsLastTrain) needsAdviceParts.push('若接近末班車，別等延誤線，直接改繞行或計程車。');
            if (wantsUrgent) needsAdviceParts.push('趕時間的話，計程車通常最快。');
        }

        const needsAdvice = needsAdviceParts.length > 0 ? needsAdviceParts.join(' ') : '';

        // Transfer Transport Knowledge (Furikae Yuso)
        const isSuspended = (l2 as any).status_code === 'SUSPENDED' || /運転を見合わせ|suspended|halt/i.test(causeText);
        const mentionsTransfer = /振替輸送|transfer transport/i.test(causeText) || isSuspended; // Show if suspended or explicitly mentioned

        let transferInfo = '';
        if (mentionsTransfer) {
            if (locale.startsWith('ja')) {
                transferInfo = '\n💡 豆知識：対象路線の切符・定期券をお持ちの方は「振替輸送」により、追加運賃なしで指定の他社線を利用できます。';
            } else if (locale.startsWith('en')) {
                transferInfo = '\n💡 Tip: If you have a ticket/pass for the suspended line, you can use "Transfer Transport" (Furikae Yuso) to take alternative subway/private lines for free.';
            } else {
                transferInfo = '\n💡 小知識：持有該路線車票/定期票的旅客，可利用「振替輸送」機制，免費搭乘其他替代的地鐵或私鐵路線。';
            }
        }

        const endpoints = extractRouteEndpointsFromText(text);
        const guessed = (!endpoints?.destinationText && !(endpoints as any)?.destinationIds?.length) ? this.guessRouteLabelsFromText(rawText) : null;
        const originLabel =
            endpoints?.originText ||
            guessed?.origin ||
            endpoints?.originIds?.[0]?.split('.').pop() ||
            context?.currentStation?.split('.').pop() ||
            nodeName ||
            'Tokyo';
        const destLabel = endpoints?.destinationText || guessed?.destination || endpoints?.destinationIds?.[0]?.split('.').pop() || '';

        const originIdForCoord = endpoints?.originIds?.[0] || context?.currentStation || '';
        const destIdForCoord = endpoints?.destinationIds?.[0] || '';

        // Fallback coordinates for major hubs to ensure ETA calculation in critical scenarios
        const FALLBACK_COORDS: Record<string, { lat: number, lon: number }> = {
            'Tokyo': { lat: 35.6812, lon: 139.7671 }, '東京': { lat: 35.6812, lon: 139.7671 },
            'Ueno': { lat: 35.7141, lon: 139.7774 }, '上野': { lat: 35.7141, lon: 139.7774 },
            'Shinjuku': { lat: 35.6896, lon: 139.7006 }, '新宿': { lat: 35.6896, lon: 139.7006 },
            'Shibuya': { lat: 35.6580, lon: 139.7016 }, '渋谷': { lat: 35.6580, lon: 139.7016 },
            'Ikebukuro': { lat: 35.7295, lon: 139.7109 }, '池袋': { lat: 35.7295, lon: 139.7109 },
            'Shinagawa': { lat: 35.6284, lon: 139.7387 }, '品川': { lat: 35.6284, lon: 139.7387 },
            'Maihama': { lat: 35.6366, lon: 139.8831 }, '舞浜': { lat: 35.6366, lon: 139.8831 } // Disney
        };

        let originCoord = this.getStationCoord(originIdForCoord);
        if (!originCoord && FALLBACK_COORDS[originLabel]) originCoord = FALLBACK_COORDS[originLabel];

        let destCoord = this.getStationCoord(destIdForCoord);
        if (!destCoord && FALLBACK_COORDS[destLabel]) destCoord = FALLBACK_COORDS[destLabel];

        const hasRoutePair = Boolean(destLabel);

        const originParam = originCoord ? `${originCoord.lat},${originCoord.lon}` : originLabel;
        const destParam = destCoord ? `${destCoord.lat},${destCoord.lon}` : destLabel;

        const queryBase = nodeName ? `${nodeName}` : 'Tokyo';
        const mapsTransitUrl = hasRoutePair
            ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(originParam)}&destination=${encodeURIComponent(destParam)}&travelmode=transit`
            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${queryBase} metro bus`)}`;

        const mapsDrivingUrl = hasRoutePair
            ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(originParam)}&destination=${encodeURIComponent(destParam)}&travelmode=driving`
            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${queryBase} taxi`)}`;

        const mapsBikeUrl = hasRoutePair
            ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(originParam)}&destination=${encodeURIComponent(destParam)}&travelmode=bicycling`
            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${queryBase} bicycle share`)}`;

        const distanceKm = originCoord && destCoord
            ? this.getDistanceFromLatLonInKm(originCoord.lat, originCoord.lon, destCoord.lat, destCoord.lon)
            : (hasRoutePair ? 5.0 : null); // Default 5km if pair exists but coords missing to force some ETA logic

        const taxiEta = typeof distanceKm === 'number' ? this.estimateEtaMinutes(distanceKm, 'taxi') : null;
        const bikeEta = typeof distanceKm === 'number' ? this.estimateEtaMinutes(distanceKm, 'bike') : null;
        const walkEta = typeof distanceKm === 'number' ? this.estimateEtaMinutes(distanceKm, 'walk') : null;

        const etaSuffixTaxi = taxiEta ? this.formatEtaLabel(taxiEta.min, taxiEta.max, locale) : '';
        const etaSuffixBike = bikeEta ? this.formatEtaLabel(bikeEta.min, bikeEta.max, locale) : '';
        const etaSuffixWalk = walkEta ? this.formatEtaLabel(walkEta.min, walkEta.max, locale) : '';

        const content = [
            `${base}${delayLine ? `\n${delayLine}` : ''}`.trim(),
            primary,
            needsAdvice,
            hasRoutePair && (etaSuffixTaxi || etaSuffixBike || etaSuffixWalk)
                ? (locale.startsWith('ja')
                    ? `目安：タクシー${etaSuffixTaxi}／自転車${etaSuffixBike}／徒歩${etaSuffixWalk}`
                    : locale.startsWith('en')
                        ? `Rough ETA: taxi${etaSuffixTaxi} / bike${etaSuffixBike} / walk${etaSuffixWalk}`
                        : `粗估：計程車${etaSuffixTaxi}／單車${etaSuffixBike}／步行${etaSuffixWalk}`)
                : '',
            transferInfo
        ].filter(Boolean).join('\n').trim();

        return {
            source: 'l2_disruption',
            type: 'action',
            content,
            data: {
                l2_summary: summary,
                l2_status: l2,
                actions: (() => {
                    const primaryAction = {
                        type: 'discovery',
                        label: hasRoutePair
                            ? (locale.startsWith('ja') ? 'A→B 迂回（Google Maps）' : locale.startsWith('en') ? 'A→B detour (Google Maps)' : 'A→B 迂回（Google Maps）')
                            : (locale.startsWith('ja') ? '地下鉄/バス迂回（Google Maps）' : locale.startsWith('en') ? 'Subway/Bus detour (Google Maps)' : '地鐵/公車迂回（Google Maps）'),
                        target: mapsTransitUrl,
                        metadata: {
                            category: 'navigation',
                            origin: hasRoutePair ? originLabel : undefined,
                            destination: hasRoutePair ? destLabel : undefined,
                            distance_km: distanceKm ?? undefined
                        }
                    };

                    const taxiAction = {
                        type: 'taxi',
                        label: locale.startsWith('ja')
                            ? `タクシー（GO）${etaSuffixTaxi}`
                            : locale.startsWith('en')
                                ? `Taxi (GO)${etaSuffixTaxi}`
                                : `計程車（GO）${etaSuffixTaxi}`,
                        target: getPartnerUrl('go_taxi') || mapsDrivingUrl,
                        metadata: { category: 'mobility', partner_id: 'go_taxi', eta_min: taxiEta?.min, eta_max: taxiEta?.max, route_url: mapsDrivingUrl }
                    };

                    const busAction = {
                        type: 'transit',
                        label: locale.startsWith('ja')
                            ? '都営バス案内（アプリ内）'
                            : locale.startsWith('en')
                                ? 'Toei bus option (in-app)'
                                : '都營公車方案（App 內）',
                        target: `chat:${locale.startsWith('ja')
                            ? `都営バスで ${originLabel} → ${destLabel} の行き方を教えて（最短・迷いにくい）`
                            : locale.startsWith('en')
                                ? `Find a Toei bus option from ${originLabel} to ${destLabel} (simple + reliable)`
                                : `幫我找都營公車：${originLabel} → ${destLabel}（最簡單、最不容易迷路）`}`,
                        metadata: { category: 'transit', partner_id: 'toei_bus', origin: originLabel, destination: destLabel, distance_km: distanceKm ?? undefined }
                    };

                    const bikeAction = {
                        type: 'bike',
                        label: locale.startsWith('ja')
                            ? `シェアサイクル（LUUP）${etaSuffixBike}`
                            : locale.startsWith('en')
                                ? `Shared bike (LUUP)${etaSuffixBike}`
                                : `共享單車（LUUP）${etaSuffixBike}`,
                        target: getPartnerUrl('luup') || mapsBikeUrl,
                        metadata: { category: 'mobility', partner_id: 'luup', eta_min: bikeEta?.min, eta_max: bikeEta?.max, route_url: mapsBikeUrl }
                    };

                    const secondaryAction = wantsLuggage && secondaryLink.url
                        ? { type: 'discovery', label: secondaryLink.label, target: secondaryLink.url, metadata: { category: 'storage', partner_id: 'ecbo_cloak' } }
                        : (!hasRoutePair && secondaryLink.url
                            ? { type: 'discovery', label: secondaryLink.label, target: secondaryLink.url, metadata: { category: 'crowd', partner_id: 'vacan' } }
                            : (hasRoutePair && typeof distanceKm === 'number' && distanceKm >= 1.5 ? busAction : bikeAction));

                    return [primaryAction, taxiAction, secondaryAction];
                })()
            },
            confidence: 0.9,
            reasoning: 'L2 live disruption response'
        };
    }

    private getStationCoord(stationId: string): { lat: number; lon: number } | null {
        const key = String(stationId || '').trim();
        if (!key) return null;
        const direct = (STATION_MAP as any)[key];
        if (direct && typeof direct.lat === 'number' && typeof direct.lon === 'number') return direct;

        const normalized = key.replace('odpt:Station:', 'odpt.Station:');
        const normalized2 = key.replace('odpt.Station:', 'odpt:Station:');

        const a = (STATION_MAP as any)[normalized];
        if (a && typeof a.lat === 'number' && typeof a.lon === 'number') return a;

        const matches = (STATION_MAP as any)[normalized2];
        if (matches && typeof matches.lat === 'number' && typeof matches.lon === 'number') return matches;

        // Name-based fallback (e.g. "Tokyo", "東京")
        // Try to verify if input looks like a simple name or just strip operator parts
        const simpleName = key.split('.').pop()?.split(':').pop() || key;
        if (simpleName && simpleName.length > 1) {
            // Fix: STATION_MAP values are {lat, lon}, keys contain the name.
            const foundEntry = Object.entries(STATION_MAP).find(([k, v]) =>
                k.endsWith(`.${simpleName}`) || k.includes(`.${simpleName}.`)
            );
            if (foundEntry) return foundEntry[1] as { lat: number, lon: number };
        }

        return null;
    }

    private estimateEtaMinutes(distanceKm: number, mode: 'taxi' | 'bike' | 'walk'): { min: number; max: number } {
        const d = Math.max(0, distanceKm);

        if (mode === 'walk') {
            const base = d * 13.3;
            return this.makeEtaRange(base, 0.2, 2);
        }

        if (mode === 'bike') {
            const base = d * 5.0;
            return this.makeEtaRange(base, 0.25, 2);
        }

        const base = d * 3.5 + 5;
        return this.makeEtaRange(base, 0.3, 3);
    }

    private makeEtaRange(baseMinutes: number, ratio: number, minFloor: number): { min: number; max: number } {
        const base = Math.max(0, baseMinutes);
        const min = Math.max(minFloor, Math.round(base * (1 - ratio)));
        const max = Math.max(min + 1, Math.round(base * (1 + ratio)));
        return { min, max };
    }

    private formatEtaLabel(min: number, max: number, locale: SupportedLocale): string {
        const a = Math.max(1, Math.round(min));
        const b = Math.max(a, Math.round(max));
        if (locale.startsWith('en')) return ` (~${a}-${b} min)`;
        if (locale.startsWith('ja')) return `（約${a}〜${b}分）`;
        return `（約${a}-${b}分）`;
    }

    public getStats() { return { poiEngine: this.getPoiEngine().getCacheStats() }; }
    public clearCache(): void { this.getPoiEngine().clearCache(); }

    private deg2rad(deg: number) { return deg * (Math.PI / 180); }
    private getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
        const R = 6371;
        const dLat = this.deg2rad(lat2 - lat1);
        const dLon = this.deg2rad(lon2 - lon1);
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
}

function normalizeLocale(locale: string): string {
    if (locale.startsWith('zh')) return 'zh-TW';
    if (locale.startsWith('ja')) return 'ja';
    return 'en';
}

export const hybridEngine = new HybridEngine();
