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
import { type SupportedLocale } from './assistantEngine';
import { metricsCollector } from './monitoring/MetricsCollector';
import { DataNormalizer } from './utils/Normalization';
import { feedbackStore } from './monitoring/FeedbackStore';
import { AnomalyDetector } from './utils/AnomalyDetector';
import { getJSTTime } from '@/lib/utils/timeUtils';
import { POITaggedDecisionEngine } from '@/lib/ai/poi-tagged-decision-engine';
import { preDecisionEngine, DecisionLevel } from '@/lib/ai/PreDecisionEngine';
import { generateLLMResponse } from '@/lib/ai/llmService';
import { DataMux } from '@/lib/data/DataMux';
import { StrategyContext } from '@/lib/ai/strategyEngine';
import { AgentRouter } from '@/lib/ai/AgentRouter';
import { executeSkill, skillRegistry } from './skills/SkillRegistry';
import {
    FareRulesSkill,
    AccessibilitySkill,
    LuggageSkill,
    LastMileSkill,
    CrowdDispatcherSkill,
    SpatialReasonerSkill
} from './skills/implementations';

export interface HybridResponse {
    source: 'template' | 'algorithm' | 'llm' | 'poi_tagged' | 'knowledge';
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
    }): Promise<HybridResponse | null> {
        const startTime = Date.now();
        const { text, locale: inputLocale, context } = params;
        const locale = (inputLocale || 'zh-TW') as SupportedLocale;
        const logs: string[] = [];

        const safeText = typeof text === 'string' && text.length > 500 ? `${text.slice(0, 500)}…` : text;
        logs.push(`[Input] Text: "${safeText}", Locale: ${locale}`);

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

            // 1. Legacy Regex Skill (Fast Path)
            const matchedSkill = skillRegistry.findMatchingSkill(text, context || {});
            if (matchedSkill) {
                logs.push(`[Deep Research] Legacy Skill Triggered: ${matchedSkill.name}`);
                const { result: skillResult, meta } = await executeSkill(matchedSkill, text, context || {});
                logs.push(`[Deep Research] Skill Exec: cache=${meta.fromCache}, dur=${meta.durationMs}ms${meta.errorCode ? `, code=${meta.errorCode}` : ''}`);
                if (skillResult) {
                    const finalResult = { ...skillResult, reasoningLog: [...logs, ...(skillResult.reasoningLog || [])] };
                    metricsCollector.recordRequest(finalResult.source, Date.now() - startTime);
                    return finalResult;
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
                                const finalResult = {
                                    ...skillResult,
                                    reasoningLog: [...logs, `Agent Logic: ${agentDecision.reasoning}`, ...(skillResult.reasoningLog || [])]
                                };
                                metricsCollector.recordRequest(finalResult.source, Date.now() - startTime);
                                return finalResult;
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
                metricsCollector.recordRequest(bestMatch.source, Date.now() - startTime);
                feedbackStore.logRequest({ text, source: bestMatch.source, timestamp: startTime });
                return { ...bestMatch, reasoningLog: logs };
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

            const llmResponse = await generateLLMResponse({
                systemPrompt: this.buildSystemPrompt(locale),
                userPrompt: this.buildUserPrompt(text, { ...context, wisdomSummary: activeKnowledgeSnippet } as any),
                taskType: 'chat', // Trinity: DeepSeek V3 (High Output CP)
                temperature: 0.7, // Higher temp for chat
                model: 'deepseek-v3.2'
            });

            if (llmResponse) {
                metricsCollector.recordRequest('llm', Date.now() - startTime);
                return {
                    source: 'llm',
                    type: 'text',
                    content: llmResponse,
                    confidence: 0.6,
                    reasoning: 'Fallback to General LLM with Context',
                    reasoningLog: logs
                };
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

        // Route Intent
        if (lowerText.match(/(?:到|to|まで|route|怎么去|怎麼去|去|前往|步行|走路)/)) {
            // Regex handles: [From] Origin [To/WalkTo/GoTo] Dest
            // Excludes "步行", "走路" from station name capture
            // Order sensitive: Match longer separators (步行到) before shorter ones (到)
            const zhMatch = text.match(/(?:從|from)?\s*([^到去前往步行走路\s]+)\s*(?:步行到|走路去|到|去|前往|to)\s*([^?\s？！!，,。]+)/) || text.match(/([^从\s]+)\s*到\s*([^?\s？！!，,。]+)/);
            const enMatch = text.match(/from\s+([a-zA-Z\s]+)\s+to\s+([a-zA-Z\s]+)/i);
            const origin = zhMatch?.[1] || enMatch?.[1];
            const dest = zhMatch?.[2] || enMatch?.[2];

            if (origin && dest) {
                try {
                    const routes = await algorithmProvider.findRoutes({ originName: origin, destinationName: dest, locale });
                    if (routes && routes.length > 0) {
                        return {
                            source: 'algorithm',
                            type: 'route',
                            content: locale.startsWith('zh') ? `為您找到從 ${origin} 到 ${dest} 的路線建議。` : `Found routes from ${origin} to ${dest}.`,
                            data: { routes },
                            confidence: 0.95,
                            reasoning: 'Calculated route via algorithm.'
                        };
                    }
                } catch (e) { }
            }
        }

        // Fare Intent
        if (lowerText.match(/(?:票價|多少錢|fare|運賃)/)) {
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
        return null;
    }

    private buildSystemPrompt(locale: SupportedLocale): string {
        const prompts: Record<string, string> = {
            'zh-TW': `你是 LUTAGU (鹿引)，一位住在東京、熱心又專業的「在地好友」。
你的使命：用溫暖、口語且像真實朋友對話的方式，提供東京交通決策。
請善用提供給你的「攻略 (Hacks)」與「陷阱 (Traps)」資訊。
✅ 格式要求：可以使用 Markdown 加粗關鍵字 (如 **平台號碼**、**出口名稱**)。可以使用條列式說明多個步驟。
⚠️ 邏輯安全守則：若無確切數據，請優先建議搭乘電車/地鐵。**嚴禁** 建議用戶步行超過 1.5 公里 (除非用戶明確要求健行)。
🛑 限制：回覆不超過 5 句話。保持語氣自然親切，不要像機器人。`,
            'ja': `あなたは LUTAGU (ルタグ)、東京に住む親切でプロフェッショナルな「地元の友達」です。
使命：温かく、親しみやすい口調で、実用的な東京の交通アドバイスを提供すること。
提供された「攻略 (Hacks)」や「罠 (Traps)」の情報を活用してください。
✅ 形式：Markdown太字（**ホーム番号**、**出口名**など）や箇条書きを使用して見やすくしてください。
🛑 制限：5文以内。ロボットのような堅苦しい口調は避けてください。`,
            'en': `You are LUTAGU, a helpful and professional "Local Friend" in Tokyo.
Mission: Provide practical transit advice with a warm, conversational tone.
Use the provided "Hacks" and "Traps" context whenever relevant.
✅ Format: You MAY use Markdown bold (**platforms**, **exit names**) and bullet points for clarity.
🛑 Constraint: Max 5 sentences. Keep it natural and friendly.`
        };
        return prompts[locale] || prompts['zh-TW'];
    }

    private buildUserPrompt(query: string, ctx?: RequestContext & { wisdomSummary?: string }): string {
        const jst = getJSTTime();
        const timeStr = `${String(jst.hour).padStart(2, '0')}:${String(jst.minute).padStart(2, '0')}`;
        let prompt = `Current Time (JST): ${timeStr}\nUser Query: ${query}\n`;
        if (ctx?.userLocation) prompt += `Location: ${ctx.userLocation.lat}, ${ctx.userLocation.lng}\n`;
        if (ctx?.currentStation) prompt += `Station: ${ctx.currentStation}\n`;

        // Inject rich knowledge
        const knowledge = ctx?.wisdomSummary || (ctx?.strategyContext as any)?.wisdomSummary;
        if (knowledge) prompt += `Context Info:\n${knowledge}\n`;

        return prompt + `\nPlease respond as LUTAGU based on the system prompt.`;
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
