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

export interface HybridResponse {
    source: 'template' | 'algorithm' | 'llm' | 'poi_tagged' | 'knowledge';
    type: 'text' | 'card' | 'route' | 'fare' | 'action' | 'recommendation' | 'expert_tip';
    content: string;
    data?: any;
    confidence: number;
    reasoning?: string;
}

export interface RequestContext {
    userId?: string;
    userLocation?: { lat: number; lng: number };
    preferences?: {
        categories?: string[];
        priceRange?: number[];
    };
    currentStation?: string;
}

export class HybridEngine {
    private poiTaggedEngine: POITaggedDecisionEngine | null = null;
    private isInitialized: boolean = false;

    constructor() {
        // Initialize POI Tagged Engine with Redis support (graceful degradation)
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
        const redisUrl = process.env.REDIS_URL;

        // Only initialize POI engine if Supabase is configured
        if (supabaseUrl && supabaseKey) {
            try {
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
                this.isInitialized = true;
                console.log('[HybridEngine] Initialized with POI engine');
            } catch (error) {
                console.warn('[HybridEngine] POI engine init failed, running in degraded mode:', error);
                this.isInitialized = true; // Still mark as initialized, just without POI
            }
        } else {
            console.warn('[HybridEngine] Missing Supabase config, running in degraded mode (Template + Algorithm only)');
            this.isInitialized = true;
        }
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

        // 0. Anomaly Detection
        const anomaly = AnomalyDetector.isAnomaly(text);
        if (anomaly.isAnomaly) {
            console.warn(`[HybridEngine] Anomaly detected: ${anomaly.reason}`);
            return {
                source: 'template',
                type: 'text',
                content: locale.startsWith('zh') 
                    ? '抱歉，我不太明白您的意思，請試著輸入具體的站點或問題。' 
                    : 'Sorry, I don\'t quite understand. Please try entering a specific station or question.',
                confidence: 1.0,
                reasoning: `Anomaly detection: ${anomaly.reason}`
            };
        }

        // 1. AI-First Intent Classification (PreDecisionEngine)
        const decision = await preDecisionEngine.classifyIntent(text);
        console.log(`[HybridEngine] AI-First Decision: ${decision.level} | Reason: ${decision.reason} | Confidence: ${decision.confidence}`);

        let bestMatch: HybridResponse | null = null;

        // 2. Level 1: Template Engine
        if (decision.level === DecisionLevel.LEVEL_1_SIMPLE) {
            bestMatch = await this.checkTemplates(text, locale);
        }

        // 3. Level 2: Algorithm Provider + POI Search
        if (!bestMatch && (decision.level === DecisionLevel.LEVEL_2_MEDIUM || decision.level === DecisionLevel.LEVEL_1_SIMPLE)) {
            const [poiMatch, algorithmMatch] = await Promise.all([
                this.checkPOITags(text, locale, context),
                this.checkAlgorithms(text, locale, context)
            ]);

            // Priority: POI > Algorithm (for L2)
            if (poiMatch && poiMatch.confidence >= 0.6) {
                bestMatch = poiMatch;
            } else if (algorithmMatch && algorithmMatch.confidence >= 0.8) {
                bestMatch = algorithmMatch;
            }
        }

        // 4. Level 3/4: Semantic Search (Expert Knowledge)
        // Try this if no match yet, or if explicitly classified as complex
        if (!bestMatch) {
            const knowledgeMatch = await this.checkL4Knowledge(text, locale, context);
            if (knowledgeMatch && knowledgeMatch.confidence >= 0.7) {
                bestMatch = knowledgeMatch;
            }
        }

        // 5. Post-processing and Metrics
        if (bestMatch) {
            metricsCollector.recordRequest(bestMatch.source, Date.now() - startTime);
            feedbackStore.logRequest({ text, source: bestMatch.source, timestamp: startTime });
            console.log(`[HybridEngine] Match: ${bestMatch.source} | Type: ${bestMatch.type} | Conf: ${bestMatch.confidence}`);
            return bestMatch;
        }

        // 6. Fallback (LLM) - Return null to trigger LLM response
        feedbackStore.logRequest({ text, source: 'llm', timestamp: startTime });
        return null;
    }

    /**
     * Check L4 Expert Knowledge via Semantic Search
     */
    private async checkL4Knowledge(
        text: string,
        locale: SupportedLocale,
        context?: RequestContext
    ): Promise<HybridResponse | null> {
        try {
            const results = await searchL4Knowledge({
                query: text,
                stationId: context?.currentStation,
                topK: 3,
                threshold: 0.6
            });

            if (!results || results.length === 0) {
                return null;
            }

            const bestResult = results[0];
            
            // Format the content nicely
            let content = locale.startsWith('zh') 
                ? `根據專家建議：\n${bestResult.content}`
                : `Expert tip:\n${bestResult.content}`;
            
            if (results.length > 1) {
                const moreTips = results.slice(1).map((r, i) => `• ${r.content}`).join('\n');
                content += locale.startsWith('zh') 
                    ? `\n\n其他相關建議：\n${moreTips}`
                    : `\n\nOther related tips:\n${moreTips}`;
            }

            return {
                source: 'knowledge',
                type: 'expert_tip',
                content: content,
                data: { results },
                confidence: bestResult.similarity || 0.8,
                reasoning: 'Found relevant expert knowledge via semantic search.'
            };
        } catch (error) {
            console.error('[HybridEngine] Semantic search error:', error);
            return null;
        }
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

        // Check if POI engine is available
        if (!this.poiTaggedEngine) {
            console.log('[HybridEngine] POI engine not available, skipping POI search');
            return null;
        }

        try {
            const results = await this.poiTaggedEngine.decide(
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
                        matchedCriteria: r.matchedCriteria
                    })),
                    totalCount: results.length
                },
                confidence: Math.min(0.95, 0.5 + results.length * 0.1),
                reasoning: 'Matched POI tags (Location, Category, Atmosphere)'
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
            poiEngine: this.poiTaggedEngine?.getCacheStats() || { available: false },
            isInitialized: this.isInitialized,
            hasPOIEngine: !!this.poiTaggedEngine
        };
    }

    /**
     * Clear Cache
     */
    public clearCache(): void {
        this.poiTaggedEngine?.clearCache();
    }
}

export const hybridEngine = new HybridEngine();
