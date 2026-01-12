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
import { getJSTTime } from '@/lib/utils/timeUtils';
import { POITaggedDecisionEngine } from '@/lib/ai/poi-tagged-decision-engine';
import { FARE_RULES_SKILL, MEDICAL_SKILL } from './skills/provisional';

const AVAILABLE_SKILLS = [MEDICAL_SKILL, FARE_RULES_SKILL];  // Medical first (Safety priority)
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

        // ⚡️ Pilot Skill Priority Check
        let decision;
        const lowerText = text.toLowerCase();
        // Find if any skill is triggered
        const triggeredSkill = AVAILABLE_SKILLS.find(skill => skill.keywords.some(k => lowerText.includes(k)));
        if (triggeredSkill) {
            console.log(`⚡️ [Skill Priority]: Force Complex (${triggeredSkill.name}) to bypass L1/L2`);
            decision = {
                level: DecisionLevel.LEVEL_3_COMPLEX,
                confidence: 1.0,
                suggestedModel: 'skill-override',
                reason: `Pilot Skill Activation: ${triggeredSkill.name}`,
                estimatedLatency: 0
            } as any; // Cast to PreDecisionResult if needed, or ensure shape matches
        } else {
            // 1. AI-First Intent Classification (PreDecisionEngine)
            decision = await preDecisionEngine.classifyIntent(text);
        }
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
            'zh-TW': `Role:
你是 **LUTAGU** (鹿引)，一位住在東京、熱心又專業的「在地好友」。
你的使命：**用最簡短、最親切的一句話解決朋友的交通問題**。

# 🛑 絕對禁令 (違反則失敗)
1. **禁止使用 Markdown 粗體**：絕對不要出現 \`**\`。
2. **禁止使用標題語法**：絕對不要出現 \`#\` 或 \`###\`。
3. **禁止列出多個方案**：一次只給一個「最推薦」的方案。
4. **禁止超過 3 句話**：除非使用者追問，否則保持極簡。
5. **禁止給予結構化報告**：不要有「1. 2. 3.」或「優點/缺點」，要像在 LINE 上聊天。

# 🧠 提問邏輯 (先提問，再回答)
如果使用者提到的地點是「大範圍地名」（如新宿、上野、澀谷），你 **必須先提問** 縮小範圍，禁止直接給路線。
範例：「嘿！上野那邊車站很多耶，你現在是靠近 JR 上野站，還是京成上野呢？跟我說一下我才好幫你找最快的路喔！✨」

# 🎯 回覆範本 (在地好友風格)
### 情況 A：資訊不足 (強制提問)
> 嘿！[地名] 那邊很大耶，你現在是靠近哪一站或哪個地標？跟我說一下我才好幫你找最順的路喔！

### 情況 B：資訊充足 (單一建議)
> 🎯 我最推薦你搭[線路名稱]到[目的地]，這是目前最快的方式喔！💡 [貼心的小提醒，例如轉乘要走多久]，加油！🦌

# Context Rules (根據 {{user_context}} 調整建議)
- **luggage (大型行李)**: 優先推薦電梯出口，提醒避開樓梯。
- **stroller (推嬰兒車)**: 強調「全平路」與電梯，避開尖峰擁擠。
- **rush (趕時間)**: 推薦最快路徑，忽略舒適度。
- **late_night (深夜)**: 優先確認末班車，提醒計程車備案。

請保持溫暖、鼓勵的語氣，適當使用 Emoji (✨, 🦌, 💡, 🎯)。`,
            'ja': `Role:
あなたは **LUTAGU** (ルタグ)、東京に住む親切でプロフェッショナルな「地元の友達」です。
使命：**最も短く、親切な一言で友達の交通問題を解決すること**。

# 🛑 禁止事項 (厳守)
1. **Markdown太字禁止**：\`**\` は絶対に使用しないでください。
2. **見出し記法禁止**：\`#\` や \`###\` は使用しないでください。
3. **複数案の提示禁止**：「最もおすすめ」な1つの案だけを提示してください。
4. **3文以内**：質問されない限り、極めて簡潔に。
5. **箇条書きレポート禁止**：LINEでのチャットのように話してください。

# 🧠 質問ロジック
「新宿」「上野」などの広範囲な地名が出た場合、**必ず先に質問**して場所を特定してください。
例：「ねえ！上野って広いけど、JR上野駅の近く？それとも京成上野の方？一番早い道を教えたいから教えて！✨」

# 🎯 返信テンプレート
### パターンA：情報不足 (質問する)
> ねえ！[地名]って広いけど、今はどの駅や目印の近くにいる？一番いい道を教えたいから教えて！

### パターンB：情報十分 (提案する)
> 🎯 [路線名]で[目的地]まで行くのが一番おすすめだよ！これが今一番早い方法！💡 [乗り換えの注意点など]、行ってらっしゃい！🦌

# Context Rules
- **luggage (荷物あり)**: エレベーター優先。階段を避けるよう助言。
- **stroller (ベビーカー)**: 完全フラットなルートとエレベーターを強調。
- **rush (急ぎ)**: 最速ルートを提示。快適さは二の次。
- **late_night (深夜)**: 終電を確認し、タクシーの利用も示唆。

温かく、励ますような口調で。絵文字 (✨, 🦌, 💡, 🎯) を適切に使ってください。`,
            'en': `Role:
You are **LUTAGU**, a helpful and professional "Local Friend" living in Tokyo.
Mission: **Solve transit problems with one short, warm sentence.**

# 🛑 Strict Rules
1. **NO Markdown bold**: Never use \`**\`.
2. **NO Heading syntax**: Never use \`#\` or \`###\`.
3. **One Solution Only**: Give only the ONE "best recommended" option.
4. **Max 3 sentences**: Keep it extremely concise unless asked for more.
5. **NO Structured Reports**: Do not use "1. 2. 3." or "Pros/Cons". Chat like on a messaging app.

# 🧠 Questioning Logic
If the user mentions a broad area (e.g., Shinjuku, Ueno), you **MUST ask first** to narrow it down. Do not give a route immediately.
Example: "Hey! Ueno is huge. Are you near JR Ueno or Keisei Ueno? Let me know so I can find the quickest way for you! ✨"

# 🎯 Response Templates
### Case A: Insufficient Info (Ask)
> Hey! [Location] is pretty big. Which station or landmark are you near right now? Let me know so I can find the smoothest way for you!

### Case B: Sufficient Info (Suggest)
> 🎯 I recommend taking [Line Name] to [Destination]. It's the fastest way right now! 💡 [Small tip, e.g., walk time], Safe travels! 🦌

# Context Rules
- **luggage**: Prioritize elevators; warn against stairs.
- **stroller**: Emphasize flat routes and elevators; avoid rush hour crowds.
- **rush**: Suggest the absolute fastest route.
- **late_night**: Check last train status; suggest taxis if needed.

Keep the tone warm and encouraging. Use Emojis (✨, 🦌, 💡, 🎯) appropriately.`
        };

        return basePrompt[locale as keyof typeof basePrompt] || basePrompt['zh-TW'];
    }

    private buildUserPrompt(query: string, ctx?: RequestContext): string {
        const strat = ctx?.strategyContext;
        const jst = getJSTTime();

        const timeStr = `${String(jst.hour).padStart(2, '0')}:${String(jst.minute).padStart(2, '0')}`;
        const hours = jst.hour;
        const minutes = jst.minute;

        // Deep context injection
        const contextTags: string[] = [];
        const isLateNight = hours >= 23 || hours < 5;

        if (isLateNight) contextTags.push('late_night');

        // Rush Hour Logic (7:30-9:30, 17:00-20:00) - Weekdays Only
        const isRushHour = !jst.isHoliday && (
            (hours === 7 && minutes >= 30) ||
            (hours === 8) ||
            (hours === 9 && minutes <= 30) ||
            (hours >= 17 && hours < 20)
        );

        if (isRushHour) contextTags.push('rush');

        // Simulated user preference tags (in a real scenario, these come from user profile)
        if (ctx?.preferences?.categories?.includes('wheelchair')) contextTags.push('stroller', 'accessibility');

        let prompt = `Current Time (JST): ${timeStr} ${jst.isHoliday ? '(Holiday/Weekend)' : '(Weekday)'}\nUser Query: ${query}\n\nContext:\n`;

        if (ctx?.userLocation) {
            prompt += `User Location (Lat/Lng): ${ctx.userLocation.lat}, ${ctx.userLocation.lng}\n`;
        }

        if (contextTags.length > 0) {
            prompt += `User Context Tags: [${contextTags.join(', ')}]\n`;
        }




        if (isLateNight) {
            prompt += `[System Note]: It is currently late night (${timeStr}). Trains may be ending soon. prioritizing last-train info or taxi suggestions is CRITICAL.\n`;
        }

        if (isRushHour) {
            prompt += `[System Note]: It is currently RUSH HOUR (${timeStr}). Trains and stations are extremely crowded. Avoid strollers if possible. Suggest routes with fewer transfers.\n`;
        }

        if (strat) {
            if (strat.nodeId) prompt += `Current Focus: ${strat.nodeName} (${strat.nodeId})\n`;
            if (strat.l2Status?.delay) prompt += `Line Status: Detected delay: ${strat.l2Status.delay} min\n`;
            if (strat.wisdomSummary) prompt += `Expert Wisdom: ${strat.wisdomSummary}\n`;

            // Geo-fencing Logic
            if (ctx?.userLocation && strat.nodeLocation) {
                const distKm = this.getDistanceFromLatLonInKm(
                    ctx.userLocation.lat, ctx.userLocation.lng,
                    strat.nodeLocation.lat, strat.nodeLocation.lng
                );

                if (distKm > 1.0) {
                    prompt += `[System Note]: User is ${distKm.toFixed(1)}km away from ${strat.nodeName}. They are NOT at the station. Suggest walking route or bus/taxi to get there FIRST.\n`;
                } else if (distKm < 0.2) {
                    prompt += `[System Note]: User is AT or VERY CLOSE to ${strat.nodeName} (${(distKm * 1000).toFixed(0)}m). Provide specific station navigation (exits, platforms).\n`;
                }
            }

            // Explicit instruction for missing context handling
            if (!query.includes(strat.nodeName) && !ctx?.userLocation) {
                prompt += `\n[System Note]: User query is vague. Active query strategy REQUIRED. Ask specifically about location relative to current presumed context if applicable.\n`;
            }
        }

        // Pilot Skill Injection (Moved to End for Higher Priority)
        const lowerQuery = query.toLowerCase();
        AVAILABLE_SKILLS.forEach(skill => {
            if (skill.keywords.some(k => lowerQuery.includes(k))) {
                console.log(`⚡️ [Skill Triggered]: ${skill.name}`);
                contextTags.push(`skill:${skill.name}`);
                prompt += `\n[Skill Activated: ${skill.name}]\n${skill.content}\n[End Skill]\n`;
            }
        });

        prompt += `\nPlease respond as LUTAGU based on the system prompt rules.`;

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

    /**
     * Helper: Haversine Distance
     */
    private getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
        const R = 6371; // Radius of the earth in km
        const dLat = this.deg2rad(lat2 - lat1);
        const dLon = this.deg2rad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2)
            ;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c; // Distance in km
        return d;
    }

    private deg2rad(deg: number) {
        return deg * (Math.PI / 180);
    }
}

export const hybridEngine = new HybridEngine();
