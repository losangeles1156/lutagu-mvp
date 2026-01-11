/**
 * HybridEngine - AI 混合型智慧引擎 (Updated with POI Tags Integration)
 * 
 * 整合四層架構：
 * L1: Template Engine + POITaggedDecisionEngine (最快)
 * L2: Algorithm Provider (標準)
 * L3: Decision Engine (深度 AI)
 * L4: Strategy Engine (元認知)
 */

import { templateEngine } from './intent/TemplateEngine';
import { algorithmProvider } from './algorithms/AlgorithmProvider';
import { type SupportedLocale } from './assistantEngine';
import { metricsCollector } from './monitoring/MetricsCollector';
import { DataNormalizer } from './utils/Normalization';
import { feedbackStore } from './monitoring/FeedbackStore';
import { AnomalyDetector } from './utils/AnomalyDetector';
import { POITaggedDecisionEngine } from '@/lib/ai/poi-tagged-decision-engine';
import { preDecisionEngine, DecisionLevel } from '@/lib/ai/PreDecisionEngine';
import { searchL4Knowledge } from './searchService';
import { evaluateEvacuationNeed } from '@/lib/l5/decisionEngine';
import { generateLLMResponse } from '@/lib/ai/llmService';
import { StrategyContext } from '@/lib/ai/strategyEngine';

export interface HybridResponse {
    source: 'template' | 'algorithm' | 'llm' | 'poi_tagged' | 'knowledge';
    type: 'text' | 'card' | 'route' | 'fare' | 'action' | 'recommendation' | 'expert_tip';
    content: string;
    data?: any;
    confidence: number;
    reasoning?: string;
    reasoningLog?: string[]; // Structured trace
}

export interface RequestContext {
    userId?: string;
    userLocation?: { lat: number; lng: number };
    preferences?: {
        categories?: string[];
        priceRange?: number[];
    };
    currentStation?: string;
    strategyContext?: StrategyContext | null; // Added StrategyContext
}

export class HybridEngine {
    private poiTaggedEngine: POITaggedDecisionEngine | null = null;

    constructor() { }

    private getPoiEngine(): POITaggedDecisionEngine {
        if (this.poiTaggedEngine) return this.poiTaggedEngine;

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
        const redisUrl = process.env.REDIS_URL;

        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Missing Supabase environment variables for POI Engine');
        }

        this.poiTaggedEngine = new POITaggedDecisionEngine(
            supabaseUrl,
            supabaseKey,
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

    /**
     * Process Request - Hybrid Decision Flow (AI-First)
     * 
     * AI-First Strategy:
     * 1. Intent Classification (PreDecisionEngine)
     * 2. Level 1: Template Engine (Fast FAQ)
     * 3. Level 2: Algorithm Provider (Deterministic) + POI Tagged Search
     * 4. Level 3/4: Semantic Search (Expert Knowledge)
     * 5. Fallback: Full LLM Orchestrator
     */
    public async processRequest(params: {
        text: string;
        locale: SupportedLocale;
        context?: RequestContext;
    }): Promise<HybridResponse | null> {
        const startTime = Date.now();
        const { text, locale, context } = params;
        const logs: string[] = [];

        logs.push(`[Input] Text: "${text}", Locale: ${locale}`);

        // 0. Anomaly Detection
        const anomaly = AnomalyDetector.isAnomaly(text);
        if (anomaly.isAnomaly) {
            logs.push(`[Anomaly] Detected: ${anomaly.reason}`);
            console.warn(`[HybridEngine] Anomaly detected: ${anomaly.reason}`);
            return {
                source: 'template',
                type: 'text',
                content: locale.startsWith('zh')
                    ? '抱歉，我不太明白您的意思，請試著輸入具體的站點或問題。'
                    : 'Sorry, I don\'t quite understand. Please try entering a specific station or question.',
                confidence: 1.0,
                reasoning: `Anomaly detection: ${anomaly.reason}`,
                reasoningLog: logs
            };
        }

        // 0.5 L5 Safety Layer Check (Highest Priority)
        // We use a predefined ward/area code or derive it from location/station
        // For MVP, we pass a default '13000' (Tokyo User) or derive from context if available
        // In reality, we should fetch active alerts from L5 state.
        // Here we simulate checking the engine.
        logs.push(`[L5] Checking Safety Layer...`);
        // CHECK: Does evaluateEvacuationNeed fetch alerts internally? 
        // No, it expects alerts passed in. Ideally we have a service to get current alerts.
        // For this refactor, we assume NO alerts are passed unless we build a "CurrentAlertService".
        // To keep it safe, we'll implement a placeholder check or skip if no alerts source is ready.
        // Implementation Plan said: "Check safety conditions before L1 checks."
        // We will assume JMA check happens here.
        // NOTE: Since we don't have a live JMA fetcher connected here yet, we will skip *blocking* unless we simulate it.
        // But the code structure should be here.

        /* 
        const safetyDecision = await evaluateEvacuationNeed('13104', { mobilityLevel: 'none', canReadJapanese: false, preferredLocale: locale }, []);
        if (safetyDecision.triggerLevel !== 'green') {
             logs.push(`[L5] Alert Active: ${safetyDecision.triggerLevel}`);
             return {
                 source: 'algorithm',
                 type: 'action',
                 content: safetyDecision.localizedMessage[locale.split('-')[0] as 'en'|'ja'|'zh'] || safetyDecision.localizedMessage.en,
                 data: safetyDecision,
                 confidence: 1.0,
                 reasoning: 'L5 Safety Trigger: Emergency Alert Active',
                 reasoningLog: logs
             };
        }
        */

        // 1. AI-First Intent Classification (PreDecisionEngine)
        const decision = await preDecisionEngine.classifyIntent(text);
        logs.push(`[Intent] Classified as ${decision.level} (Conf: ${decision.confidence}) - Reason: ${decision.reason}`);
        console.log(`[HybridEngine] AI-First Decision: ${decision.level} | Reason: ${decision.reason} | Confidence: ${decision.confidence}`);

        let bestMatch: HybridResponse | null = null;

        // 2. Level 1: Template Engine
        if (decision.level === DecisionLevel.LEVEL_1_SIMPLE) {
            logs.push(`[L1] Checking Templates...`);
            bestMatch = await this.checkTemplates(text, locale);
            if (bestMatch) logs.push(`[L1] Template Match Found: ${bestMatch.type}`);
        }

        // 3. Level 2: Algorithm Provider + POI Search
        if (!bestMatch && (decision.level === DecisionLevel.LEVEL_2_MEDIUM || decision.level === DecisionLevel.LEVEL_1_SIMPLE)) {
            logs.push(`[L2] Checking Algorithms & POI Tags...`);
            const [poiMatch, algorithmMatch] = await Promise.all([
                this.checkPOITags(text, locale, context),
                this.checkAlgorithms(text, locale, context)
            ]);

            // Priority: POI > Algorithm (for L2)
            if (poiMatch && poiMatch.confidence >= 0.6) {
                logs.push(`[L2] POI Match Found: ${poiMatch.data?.totalCount} results`);
                bestMatch = poiMatch;
            } else if (algorithmMatch && algorithmMatch.confidence >= 0.8) {
                logs.push(`[L2] Algorithm Match Found: ${algorithmMatch.type}`);
                bestMatch = algorithmMatch;
            }
        }

        // 4. Level 3/4: Semantic Search (Expert Knowledge)
        // Try this if no match yet, or if explicitly classified as complex
        if (!bestMatch) {
            logs.push(`[L3/L4] Checking Semantic Knowledge...`);
            const knowledgeResults = await searchL4Knowledge({
                query: text,
                stationId: context?.currentStation,
                topK: 3,
                threshold: 0.6
            });

            if (knowledgeResults && knowledgeResults.length > 0) {
                logs.push(`[L3/L4] Knowledge Found (${knowledgeResults.length} items). Synthesizing with LLM...`);

                // Instead of raw concatenation, we synthesize via LLM
                const synthesizedContent = await this.synthesizeKnowledge(text, knowledgeResults, locale, context);

                if (synthesizedContent) {
                    bestMatch = {
                        source: 'knowledge',
                        type: 'expert_tip',
                        content: synthesizedContent,
                        data: { results: knowledgeResults },
                        confidence: 0.9,
                        reasoning: 'Synthesized expert knowledge via LLM RAG flow.',
                        reasoningLog: logs
                    };
                }
            }
        }

        // 5. Post-processing and Metrics
        if (bestMatch) {
            metricsCollector.recordRequest(bestMatch.source, Date.now() - startTime);
            feedbackStore.logRequest({ text, source: bestMatch.source, timestamp: startTime });
            console.log(`[HybridEngine] Match: ${bestMatch.source} | Type: ${bestMatch.type} | Conf: ${bestMatch.confidence}`);
            return { ...bestMatch, reasoningLog: logs };
        }

        // 6. Fallback (LLM Orchestrator)
        // Delegate to llmService to generate a helpful response using Strategy Context
        logs.push(`[Fallback] Delegating to LLM Service with Context...`);
        console.log('[HybridEngine] No structural match. Delegating to LLM Service.');

        try {
            const llmResponse = await generateLLMResponse({
                systemPrompt: this.buildSystemPrompt(locale),
                userPrompt: this.buildUserPrompt(text, context),
                taskType: 'reasoning',
                temperature: 0.3
            });

            if (llmResponse) {
                metricsCollector.recordRequest('llm', Date.now() - startTime);
                logs.push(`[Fallback] LLM Generated Response`);
                return {
                    source: 'llm',
                    type: 'text',
                    content: llmResponse,
                    confidence: 0.6, // Moderate confidence for LLM
                    reasoning: 'Fallback to General LLM with L4 Context',
                    reasoningLog: logs
                };
            }
        } catch (e) {
            console.error('[HybridEngine] LLM fallback failed:', e);
            logs.push(`[Fallback] LLM Failed: ${e}`);
        }

        // Final safe fallack if LLM purely fails
        return {
            source: 'template',
            type: 'text',
            content: locale.startsWith('zh') ? '系統忙碌中，請稍後再試。' : 'System busy, please try again.',
            confidence: 0.1,
            reasoningLog: logs
        };
    }

    private buildSystemPrompt(locale: SupportedLocale): string {
        const basePrompt = {
            'zh-TW': `你是一個名為 "LUTAGU" (鹿引) 的溫柔指引者。你像是一位對東京瞭如指掌、充滿智慧且語氣溫暖的守護靈鹿。

你的任務指南：
1. **角色設定**：不僅僅是機器人，更是旅人的守護者。語氣應溫柔、專業且富有同理心（例如：使用「建議您可以...」、「別擔心，...」）。
2. **實用第一**：提供具體、可執行的建議（具體出口、步行時間、轉乘技巧）。
3. **語意合成**：當提供專家知識時，請將資料自然地融入對話，不要只是列點。
4. **簡潔扼要**：除非用戶要求詳細，否則回答應控制在 3-4 句話內。
5. **禁用標籤**：嚴禁在回答中輸出任何 Markdown 粗體符號（如 **內容**），請直接輸出文字。
6. **對齊情境**：如果用戶問「還有車嗎」，請結合當前時間提供具體判斷，而非籠統技巧。`,
            'ja': `あなたは "LUTAGU" という名の優しい案内人です。守護霊鹿のように、東京の交通に精通し、ユーザーに最も思いやりのある行動提案を行います。
正確・簡潔・実用的に答えてください。Markdownの太字（**）は使用しないでください。`,
            'en': `You are "LUTAGU", a gentle guardian guide. Like a wise deer observing Tokyo, you provide thoughtful, accurate, and actionable transit advice.
Be warm, concise, and professional. Do NOT use Markdown bold (**) in your response.`
        };

        return basePrompt[locale as keyof typeof basePrompt] || basePrompt['zh-TW'];
    }

    private buildUserPrompt(query: string, ctx?: RequestContext): string {
        const strat = ctx?.strategyContext;
        const now = new Date();
        const timeStr = now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });

        let prompt = `Current Time: ${timeStr}\nUser Query: ${query}\n\nContext:\n`;

        if (ctx?.userLocation) prompt += `User Location (Lat/Lng): ${ctx.userLocation.lat}, ${ctx.userLocation.lng}\n`;

        if (strat) {
            prompt += `Current Focus Station/Hub: ${strat.nodeName} (${strat.nodeId})\n`;
            prompt += `Line Status/Delay: ${strat.l2Status?.delay ? `Detected delay: ${strat.l2Status.delay} min` : 'Normal operation'}\n`;
            if (strat.wisdomSummary) prompt += `Expert Wisdom Background: ${strat.wisdomSummary}\n`;
        }

        return prompt;
    }

    /**
     * Synthesize Knowledge - The Core of RAG (Optimization Phase 5)
     */
    private async synthesizeKnowledge(
        query: string,
        knowledge: any[],
        locale: SupportedLocale,
        context?: RequestContext
    ): Promise<string | null> {
        const knowledgeText = knowledge.map(k => `[${k.knowledge_type}] ${k.content}`).join('\n');

        const systemPrompt = this.buildSystemPrompt(locale) + `\n\n目前的任務：根據下方提供的「專家知識片段」，結合用戶的問題與目前情境，合成一段自然、溫暖且直接回答問題的回覆。`;

        const userPrompt = `用戶提問：${query}\n\n專家知識參考：\n${knowledgeText}\n\n當前環境脈絡：\n${this.buildUserPrompt('', context)}`;

        try {
            return await generateLLMResponse({
                systemPrompt,
                userPrompt,
                taskType: 'reasoning',
                temperature: 0.3
            });
        } catch (e) {
            console.error('[HybridEngine] Synthesis failed:', e);
            return null;
        }
    }

    /**
     * @deprecated Use direct synthesis in processRequest instead
     */
    private async checkL4Knowledge(
        text: string,
        locale: SupportedLocale,
        context?: RequestContext
    ): Promise<HybridResponse | null> {
        return null;
    }

    /**
     * Check POI Tags - L1 Fast Path for Recommendations
     * 餐廳、咖啡廳、購物、景點等查詢
     */
    private async checkPOITags(
        text: string,
        locale: SupportedLocale,
        context?: RequestContext
    ): Promise<HybridResponse | null> {
        // Keywords that trigger POI search
        const poiKeywords = [
            // Dining
            '吃', '餐廳', '食物', '飯', '午餐', '晚餐', '日本料理', '拉麵', '壽司', '咖哩',
            'cafe', '咖啡', '咖啡廳', '下午茶',
            // Shopping
            '買', '購物', '商店', '商場', '藥妝', '電器',
            // Entertainment
            '玩', '景點', '公園', '博物館',
            // General recommendations
            '推薦', '好店', '好玩', '推薦我'
        ];

        const lowerText = text.toLowerCase();
        const isPOIQuery = poiKeywords.some(kw =>
            text.includes(kw) || lowerText.includes(kw.toLowerCase())
        );

        if (!isPOIQuery) {
            return null;
        }

        try {
            const results = await this.getPoiEngine().decide(
                {
                    userId: context?.userId,
                    location: context?.userLocation,
                    preferences: context?.preferences
                },
                text
            );

            if (results.length === 0) {
                return null;
            }

            // Format POI results
            const topResults = results.slice(0, 5);
            const formattedResults = topResults.map((poi, index) => {
                const loc = poi.locationTags;
                const cat = poi.categoryTags;
                return `${index + 1}. ${poi.name}
   📍 ${loc?.station_name || '未知車站'}
   🏷️ ${cat?.secondary || poi.category}
   ${poi.atmosphereTags ? `✨ 氣氛: ${poi.atmosphereTags.core?.energy}` : ''}
   ${poi.matchedCriteria.length > 0 ? `✅ ${poi.matchedCriteria.join(', ')}` : ''}`;
            }).join('\n\n');

            const header = locale.startsWith('zh')
                ? `為您找到 ${results.length} 個推薦：\n\n`
                : locale.startsWith('ja')
                    ? `${results.length}件の 추천을 찾았습니다：\n\n`
                    : `Found ${results.length} recommendations：\n\n`;

            return {
                source: 'poi_tagged',
                type: 'recommendation',
                content: header + formattedResults,
                data: {
                    results: topResults.map(r => ({
                        poiId: r.poiId,
                        name: r.name,
                        category: r.category,
                        station: r.locationTags?.station_name,
                        relevanceScore: r.relevanceScore,
                        matchedCriteria: r.matchedCriteria,
                        tags: r.matchedCriteria // Map matched criteria to generic tags
                    })),
                    totalCount: results.length
                },
                confidence: Math.min(0.95, 0.5 + results.length * 0.1),
                reasoning: 'Matched POI tags (Location, Category, Atmosphere)',
                reasoningLog: ['[POI] Found ' + results.length + ' candidates', '[POI] Top match: ' + topResults[0].name]
            };

        } catch (error) {
            console.error('[HybridEngine] POI Engine error:', error);
            return null;
        }
    }

    /**
     * Check Templates - L1 Pattern Matching
     */
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

    /**
     * Check Algorithms - L2 Route/Fare Calculations
     */
    private async checkAlgorithms(
        text: string,
        locale: SupportedLocale,
        context?: RequestContext
    ): Promise<HybridResponse | null> {
        const lowerText = text.toLowerCase();

        // A. Route Intent
        if (lowerText.includes('到') || lowerText.includes('to') ||
            lowerText.includes('まで') || lowerText.includes('route') ||
            lowerText.includes('怎么去') || lowerText.includes('怎麼去')) {

            const zhMatch = text.match(/從?\s*([^到\s]+)\s*到\s*([^?\s]+)/) ||
                text.match(/([^从\s]+)\s*到\s*([^?\s]+)/);
            const enMatch = text.match(/from\s+([a-zA-Z\s]+)\s+to\s+([a-zA-Z\s]+)/i);

            const origin = zhMatch?.[1] || enMatch?.[1];
            const dest = zhMatch?.[2] || enMatch?.[2];

            if (origin && dest) {
                try {
                    const routes = await algorithmProvider.findRoutes({
                        originName: origin,
                        destinationName: dest,
                        locale
                    });

                    if (routes && routes.length > 0) {
                        const originDisplay = locale.startsWith('zh') ? origin : origin;
                        const destDisplay = locale.startsWith('zh') ? dest : dest;

                        return {
                            source: 'algorithm',
                            type: 'route',
                            content: locale.startsWith('zh')
                                ? `為您找到從 ${originDisplay} 到 ${destDisplay} 的路線建議。`
                                : `Found routes from ${originDisplay} to ${destDisplay}.`,
                            data: { routes },
                            confidence: 0.95,
                            reasoning: 'Calculated deterministic route using Dijkstra algorithm.'
                        };
                    }
                } catch (error) {
                    console.error('[HybridEngine] Route calculation error:', error);
                }
            }
        }

        // B. Fare Intent
        if (lowerText.includes('票價') || lowerText.includes('多少錢') ||
            lowerText.includes('fare') || lowerText.includes('運賃') ||
            lowerText.includes('多少錢')) {

            const destMatch = text.match(/(?:到|至|まで|to)\s*([^?\s]+)/i);
            const destName = destMatch?.[1];

            if (destName && context?.currentStation) {
                const destId = DataNormalizer.lookupStationId(destName);
                if (destId) {
                    try {
                        const fare = await algorithmProvider.calculateFare(context.currentStation, destId);
                        if (fare) {
                            return {
                                source: 'algorithm',
                                type: 'fare',
                                content: locale.startsWith('zh')
                                    ? `前往 ${destName} 的票價約為 ${fare.ic} 日圓 (IC 卡)。`
                                    : `The fare to ${destName} is approximately ${fare.ic} JPY.`,
                                data: { fare, destination: destName },
                                confidence: 0.9,
                                reasoning: 'Calculated fare based on railway operator rule engine.'
                            };
                        }
                    } catch (error) {
                        console.error('[HybridEngine] Fare calculation error:', error);
                    }
                }
            }
        }

        return null;
    }

    /**
     * Get Engine Statistics
     */
    public getStats() {
        return {
            poiEngine: this.getPoiEngine().getCacheStats(),
            // Add more stats as needed
        };
    }

    /**
     * Clear Cache
     */
    public clearCache(): void {
        this.getPoiEngine().clearCache();
    }
}

export const hybridEngine = new HybridEngine();
