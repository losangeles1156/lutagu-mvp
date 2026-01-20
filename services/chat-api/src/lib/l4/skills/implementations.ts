import { DeepResearchSkill, SkillPolicy, SkillResult } from './SkillRegistry';
import { RequestContext } from '../HybridEngine';
import { DataMux } from '@/lib/data/DataMux';
import { SignalCollector } from '@/lib/analytics/SignalCollector';
import { generateLLMResponse } from '@/lib/ai/llmService';
import { DataNormalizer } from '../utils/Normalization';
import {
    FARE_RULES_SKILL,
    ACCESSIBILITY_MASTER_SKILL,
    LUGGAGE_LOGISTICS_SKILL,
    LAST_MILE_CONNECTOR_SKILL,
    CROWD_DISPATCHER_SKILL,
    SPATIAL_REASONER_SKILL,
    EXIT_STRATEGIST_SKILL,
    LOCAL_GUIDE_SKILL,
    MEDICAL_SKILL
} from './provisional';
import {
    ToolDefinition,
    FARE_RULES_SCHEMA,
    ACCESSIBILITY_SCHEMA,
    LUGGAGE_SCHEMA,
    LAST_MILE_SCHEMA,
    CROWD_DISPATCHER_SCHEMA,
    EXIT_STRATEGIST_SCHEMA,
    LOCAL_GUIDE_SCHEMA,
    MEDICAL_SCHEMA
} from './schemas';

// ... (BaseSkill)



// Base class for logic reuse
abstract class BaseSkill implements DeepResearchSkill {
    name: string;
    priority: number;
    keywords: string[];
    definition: ToolDefinition;
    policy?: SkillPolicy;

    constructor(name: string, priority: number, keywords: string[], definition: ToolDefinition, policy?: SkillPolicy) {
        this.name = name;
        this.priority = priority;
        this.keywords = keywords;
        this.definition = definition;
        this.policy = policy;
    }

    canHandle(input: string, _context: RequestContext): boolean {
        // Simple keyword match (can be overridden)
        return this.keywords.some(k => input.includes(k));
    }

    abstract execute(input: string, context: RequestContext, params?: any): Promise<SkillResult | null>;
}

// ------------------------------------------------------------------
// NEW: Exit Strategist (Gemini 3 Brain)
// ------------------------------------------------------------------
export class ExitStrategistSkill extends BaseSkill {
    constructor() {
        super(EXIT_STRATEGIST_SKILL.name, 95, EXIT_STRATEGIST_SKILL.keywords, EXIT_STRATEGIST_SCHEMA); // High Priority
    }

    async execute(input: string, context: RequestContext, params?: any): Promise<SkillResult | null> {
        console.log(`[Deep Research] Triggering Exit Strategist... Params:`, params);
        const destination = params?.destination || input;
        const station = params?.station_id || context.currentStation || 'Current Station';

        // 1. Fetch Exit Rules (Accessibility & Strategy)
        const rules = await DataMux.searchExpertRules("exit selection accessibility traps");
        const ruleContext = rules.map(r => `- ${r.content}`).join('\n');

        // Real implementation would query mapped Exit DB. For now, use Gemini 3's reasoning.
        const synthesis = await generateLLMResponse({
            systemPrompt: `You are a Tokyo Station Exit Expert.
The user is at ${station} and wants to go to: "${destination}".

Strategic Rules (Must Follow):
${ruleContext}

Identify the BEST Exit (e.g. East Exit, B13, A4) to minimize walking.
If you are unsure, give the general direction (e.g. "East Side").
Format:
"最佳出口：[Exit Name]
導引：[Brief directions]"
`,
            userPrompt: `Destination: ${destination}`,
            taskType: 'reasoning' // Uses Gemini 3 Flash Preview
        });

        SignalCollector.collectSignal({ stationId: station, policyCategory: 'expert_rule', intentTarget: destination, unmetNeed: false });

        return {
            source: 'knowledge',
            type: 'action', // Direct guidance
            content: synthesis || `建議查閱站內地圖尋找前往 ${destination} 的最近出口。`,
            data: { strategy: 'exit_strategist', destination },
            confidence: 0.90,
            reasoning: 'Executed Exit Strategist (Gemini 3)'
        };
    }
}

// ------------------------------------------------------------------
// NEW: Local Guide (DeepSeek Creative)
// ------------------------------------------------------------------
export class LocalGuideSkill extends BaseSkill {
    constructor() {
        super(LOCAL_GUIDE_SKILL.name, 85, LOCAL_GUIDE_SKILL.keywords, LOCAL_GUIDE_SCHEMA);
    }

    async execute(input: string, context: RequestContext, params?: any): Promise<SkillResult | null> {
        console.log(`[Deep Research] Triggering Local Guide... Params:`, params);
        const category = params?.category || 'food';
        const station = params?.station_id || context.currentStation || 'Tokyo';
        const vibe = params?.vibe || 'authentic';

        // DeepSeek V3 is excellent at this "travel guide" persona
        const synthesis = await generateLLMResponse({
            systemPrompt: `You are a savvy local Tokyo guide.
Recommend 3 specific spots for "${category}" near ${station} with a "${vibe}" vibe.
Be specific (Name, Why it's good).
Tone: Friendly, enthusiastic, like a local friend.
Output in Traditional Chinese (Taiwan).`,
            userPrompt: `Recommend places for: ${input}`,
            taskType: 'chat', // Uses DeepSeek V3
            model: 'deepseek-v3',
            temperature: 0.8 // More creative for recommendations
        });

        SignalCollector.collectSignal({ stationId: station, policyCategory: 'expert_rule', intentTarget: category, unmetNeed: false });

        return {
            source: 'knowledge',
            type: 'recommendation', // Discovery
            content: synthesis || `附近有很多不錯的 ${category}，但我暫時連線不到地圖資料庫 😅`,
            data: { strategy: 'local_guide', category },
            confidence: 0.95,
            reasoning: 'Executed Local Guide (DeepSeek)'
        };
    }
}

// ------------------------------------------------------------------
// NEW: Medical Skill (Safety First)
// ------------------------------------------------------------------
export class MedicalSkill extends BaseSkill {
    constructor() {
        super(MEDICAL_SKILL.name, 110, MEDICAL_SKILL.keywords, MEDICAL_SCHEMA); // Highest Priority (Emergency)
    }

    async execute(input: string, context: RequestContext, params?: any): Promise<SkillResult | null> {
        console.log(`[Deep Research] Triggering Medical Skill... Params:`, params);
        const symptom = params?.symptom || input;

        // 1. Fetch Medical Rules (Triage & Penalty Fee)
        const rules = await DataMux.searchExpertRules("medical triage penalty fee clinic hospital");
        const ruleContext = rules.map(r => `- ${r.content}`).join('\n');

        const synthesis = await generateLLMResponse({
            systemPrompt: `You are a Japan Travel Medical Assistant.
User Status: "${symptom}".

Medical Rules (CRITICAL):
${ruleContext}

Task: Provide immediate, safe guidance based on Triage Rules.
1. EMERGENCY CHECK: If critical (breathing, chest pain), DIRECT TO 119.
2. TRIAGE: For minor issues (fever, cold), recommend CLINICS, NOT Hospitals (warn about Penalty Fee).
3. Include clear Japanese phrasing for help.

Output in Traditional Chinese.`,
            userPrompt: `Description: ${symptom}`,
            taskType: 'reasoning', // Uses Gemini 3 Flash Preview (Logic/Safety)
            temperature: 0.1 // High precision for medical
        });

        SignalCollector.collectSignal({ stationId: context.currentStation || 'general', policyCategory: 'expert_rule', intentTarget: 'Medical Help', unmetNeed: true });

        return {
            source: 'knowledge',
            type: 'expert_tip', // Alert type
            content: synthesis || `緊急情況請撥打 119 (救護車) 或 #7119 (醫療諮詢)。請向站務員尋求協助並說明你不舒服。`,
            data: { strategy: 'medical_assistance', symptom },
            confidence: 0.99,
            reasoning: 'Executed Medical Skill (Gemini 3)'
        };
    }
}

export class FareRulesSkill extends BaseSkill {
    constructor() {
        super(FARE_RULES_SKILL.name, 100, FARE_RULES_SKILL.keywords, FARE_RULES_SCHEMA, {
            timeoutMs: 12000,
            cacheTtlMs: 5 * 60 * 1000
        });
    }

    canHandle(input: string, _context: RequestContext): boolean {
        const text = String(input || '').toLowerCase();
        const anti = /(?:錢不是問題|不在乎錢|錢不重要|不要管錢|不管錢|money is not a problem|price is not an issue)/i;
        const fare = /(?:票價|車資|費用|多少錢|多少円|多少日幣|多少日元|jr\s*pass|suica|pasmo|ic\s*卡|ic\s*card|一日券|周遊券|定期券|回數券|折扣|優惠票|買票|購票|售票|ticket|fare|cost|price|pass)/i;
        if (anti.test(text) && !fare.test(text)) return false;
        return fare.test(text);
    }

    async execute(input: string, context: RequestContext, params?: any): Promise<SkillResult | null> {
        console.log(`[Deep Research] Triggering Fare Rules (Expert RAG)... Params:`, params);
        // Use params.query if available (Agentic), else fallback to input (Regex)
        const query = params?.query || input;
        const text = String(query || '').toLowerCase();
        const fare = /(?:票價|車資|費用|多少錢|多少円|多少日幣|多少日元|jr\s*pass|suica|pasmo|ic\s*卡|ic\s*card|一日券|周遊券|定期券|回數券|折扣|優惠票|買票|購票|售票|ticket|fare|cost|price|pass)/i;
        if (!fare.test(text)) {
            return null;
        }

        const rules = await DataMux.searchExpertRules(query);
        const ruleContext = rules.map(r => `- ${r.content}`).join('\n');

        let synthesis;
        try {
            synthesis = await generateLLMResponse({
                systemPrompt: `你是東京交通票價專家。請只根據以下規則回答：\n${ruleContext}\n\n若規則未涵蓋，請說「我不太確定，但一般情況是...」並給出安全建議。請用繁體中文且簡潔。`,
                userPrompt: query,
                taskType: 'reasoning',
                temperature: 0.1
            });
        } catch (e) {
            synthesis = `目前無法合成回覆，但根據規則：${rules[0]?.content || '暫無資料'}`;
        }

        if (!synthesis || !/[\u4e00-\u9fa5]/.test(synthesis)) {
            synthesis = `根據規則：${rules.map(r => r.content).join('；') || '暫無資料'}`;
        }

        // Signal
        SignalCollector.collectSignal({ stationId: context.currentStation || 'general', policyCategory: 'expert_rule', intentTarget: 'Fare/Ticket Rule', unmetNeed: false });

        return {
            source: 'knowledge',
            type: 'expert_tip',
            content: synthesis,
            data: { strategy: 'expert_knowledge_rag', rules },
            confidence: 0.95,
            reasoning: 'Executed Expert Knowledge RAG'
        };
    }
}

export class AccessibilitySkill extends BaseSkill {
    constructor() {
        super(ACCESSIBILITY_MASTER_SKILL.name, 90, ACCESSIBILITY_MASTER_SKILL.keywords, ACCESSIBILITY_SCHEMA, {
            timeoutMs: 6000,
            cacheTtlMs: 3 * 60 * 1000
        });
    }

    async execute(input: string, context: RequestContext, params?: any): Promise<SkillResult | null> {
        console.log(`[Deep Research] Triggering Accessibility Master... Params:`, params);
        const stationInput = params?.station_id || context.currentStation || '';
        const targetStation = DataNormalizer.lookupStationId(stationInput) || stationInput;
        if (!targetStation) {
            return {
                source: 'knowledge',
                type: 'expert_tip',
                content: '要提供無障礙路線，需要先知道車站名稱。請告訴我你目前在或要去的車站。',
                data: { strategy: 'accessibility_master', facilities: [] },
                confidence: 0.4,
                reasoning: 'Missing station id'
            };
        }
        const graph = await DataMux.getFacilityGraph(targetStation);

        if (!graph || graph.length === 0) {
            return {
                source: 'knowledge',
                type: 'expert_tip',
                content: `目前沒有 ${targetStation} 的無障礙資料。我可以先提供通用建議：找「電梯」標示，避開僅樓梯出口。若你願意，告訴我具體出口或目的地，我再幫你判斷。`,
                data: { strategy: 'accessibility_master', facilities: [] },
                confidence: 0.5,
                reasoning: 'No facility graph'
            };
        }

        if (graph) {
            let synthesis: string | undefined;
            try {
                synthesis = await generateLLMResponse({
                    systemPrompt: `Data: ${JSON.stringify(graph)}.
User Needs: Wheelchair/Stroller accessible route.
Task: Explain the best elevator route clearly based on the data. Be reassuring.`,
                    userPrompt: input,
                    taskType: 'classification',
                    temperature: 0.3
                });
            } catch (e) {
            }

            SignalCollector.collectSignal({ stationId: targetStation, policyCategory: 'barrier_free', intentTarget: 'Elevator Route', unmetNeed: false });

            return {
                source: 'knowledge',
                type: 'expert_tip',
                content: synthesis || `收到！針對${targetStation}無障礙需求，請走這條路線：\n找尋標示「電梯」的出口...`,
                data: { strategy: 'accessibility_master', facilities: graph },
                confidence: 0.95,
                reasoning: 'Executed Accessibility Master Skill'
            };
        }
        return null;
    }
}

export class LuggageSkill extends BaseSkill {
    constructor() {
        super(LUGGAGE_LOGISTICS_SKILL.name, 80, LUGGAGE_LOGISTICS_SKILL.keywords, LUGGAGE_SCHEMA, {
            timeoutMs: 6000,
            cacheTtlMs: 60 * 1000
        });
    }

    async execute(input: string, context: RequestContext, params?: any): Promise<SkillResult | null> {
        console.log(`[Deep Research] Triggering Luggage Logistics... Params:`, params);
        const targetStation = params?.station_id || context.currentStation || '';

        const status = await DataMux.checkLockerStatus(targetStation);
        const full = status.lockers.every((l: any) => l.status === 'full');

        // Agentic Synthesis
        let synthesis;
        try {
            synthesis = await generateLLMResponse({
                systemPrompt: `Locker Data: ${JSON.stringify(status)}.
Task: Inform the user about locker availability.
If full, suggest nearby storage (${status.nearbyStorage[0].name}).
Tone: Helpful.`,
                userPrompt: input,
                taskType: 'classification' // Lite is enough
            });
        } catch (e) { }

        SignalCollector.collectSignal({ stationId: targetStation, policyCategory: 'hands_free', intentTarget: 'Locker', unmetNeed: full });

        return {
            source: 'knowledge',
            type: 'action',
            content: synthesis || (full
                ? `⚠️ ${targetStation} 站內置物櫃目前全滿！\n建議前往南口的 **${status.nearbyStorage[0].name}** 寄放 (費用 ${status.nearbyStorage[0].price})。`
                : `✅ 目前 ${status.lockers.find((l: any) => l.status === 'available').location} 的置物櫃還有空位喔！`),
            data: { strategy: 'luggage_logistics', status },
            confidence: 0.98,
            reasoning: 'Executed Luggage Logistics Skill'
        };
    }
}

export class LastMileSkill extends BaseSkill {
    constructor() {
        super(LAST_MILE_CONNECTOR_SKILL.name, 70, LAST_MILE_CONNECTOR_SKILL.keywords, LAST_MILE_SCHEMA, {
            timeoutMs: 6000,
            cacheTtlMs: 60 * 1000
        });
    }

    async execute(input: string, context: RequestContext, params?: any): Promise<SkillResult | null> {
        console.log(`[Deep Research] Triggering Last Mile Connector...Params:`, params);
        const targetStation = params?.station_id || context.currentStation || '';
        const dest = params?.destination || 'Nearby';

        const options = await DataMux.searchMicroMobility(targetStation);

        // Agentic Synthesis
        let synthesis;
        try {
            synthesis = await generateLLMResponse({
                systemPrompt: `Mobility Options: ${JSON.stringify(options)}.
Goal: Go to ${dest}.
Task: Recommend best option (Bus vs Luup vs Walk).
Note: Bus is good for luggage, Luup for speed.`,
                userPrompt: input,
                taskType: 'classification'
            });
        } catch (e) { }

        SignalCollector.collectSignal({ stationId: targetStation, policyCategory: 'traffic_vacuum', intentTarget: dest, unmetNeed: false });

        return {
            source: 'knowledge',
            type: 'recommendation',
            content: synthesis || `去 ${dest} 走路稍遠 (>15分)。\n🚌 建議搭乘 **${options.bus[0].name}**，或者是騎 **Luup** (目前有 ${options.luup[0].count} 台車) 會更快喔！🛴`,
            data: { strategy: 'last_mile_connector', options },
            confidence: 0.95,
            reasoning: 'Executed Last Mile Connector Skill'
        };
    }
}

export class CrowdDispatcherSkill extends BaseSkill {
    constructor() {
        super(CROWD_DISPATCHER_SKILL.name, 60, CROWD_DISPATCHER_SKILL.keywords, CROWD_DISPATCHER_SCHEMA, {
            timeoutMs: 8000,
            cacheTtlMs: 5 * 60 * 1000
        });
    }

    async execute(input: string, context: RequestContext, params?: any): Promise<SkillResult | null> {
        console.log(`[Deep Research] Triggering Crowd Dispatcher... Params:`, params);
        const targetStation = params?.current_station || context.currentStation || '';

        const vibes = await DataMux.findSimilarVibePlaces(targetStation);

        if (vibes.length > 0) {
            let synthesis;
            try {
                synthesis = await generateLLMResponse({
                    systemPrompt: `Similar Vibe Places: ${JSON.stringify(vibes)}.
User is at crowded ${targetStation}.
Task: Recommend these quieter alternatives.`,
                    userPrompt: input,
                    taskType: 'chat', // DeepSeek for "Vibe" description
                    model: 'deepseek-v3'
                });
            } catch (e) { }

            SignalCollector.collectSignal({ stationId: targetStation, policyCategory: 'overtourism', intentTarget: 'Quiet Place', unmetNeed: false });
            return {
                source: 'knowledge',
                type: 'recommendation',
                content: synthesis || `根據氣氛分析，為您找到幾個類似但人潮較少的地方：\n` + vibes.map(v => `• ${v.name} (相似度 ${(v.similarity * 100).toFixed(0)}%)`).join('\n'),
                data: { strategy: 'crowd_dispatcher', results: vibes },
                confidence: 0.98,
                reasoning: 'Executed Crowd Dispatcher Skill'
            };
        }
        return null;
    }
}

export class SpatialReasonerSkill extends BaseSkill {
    // Spatial Reasoner is a bit special, simpler schema or fallback
    // For now, let's reuse FARE_RULES_SCHEMA structure or create a dummy one if strictly needed,
    // but since it's a fallback, maybe we keep it simple.
    // Let's create a minimal schema for it in schemas.ts or just ANY matching
    constructor() {
        super(
            SPATIAL_REASONER_SKILL.name,
            10,
            SPATIAL_REASONER_SKILL.keywords,
            { name: "spatial_reasoner", description: "Fallback for routing", parameters: { type: "object", properties: {} } },
            {
                timeoutMs: 6000,
                cacheTtlMs: 15 * 1000
            }
        );
    }

    async execute(input: string, context: RequestContext, params?: any): Promise<SkillResult | null> {
        console.log(`[Deep Research] Triggering Spatial Reasoner...`);
        let dest = context.strategyContext?.nodeName;
        if (!dest) {
            const match = input.match(/(?:到|前往|to)\s*([^?\s]+)/);
            if (match) dest = match[1];
        }

        // 1. Fetch Alternative Stations (Spatial)
        const alts = await DataMux.getAlternativeStations(context.currentStation || '', dest);

        // 2. Fetch Strategic Knowledge (WVC, TPI, Anomaly Rules)
        // We explicitly search for "delay strategy" and "wait value" to pull in anomaly-response.md content
        const strategies = await DataMux.searchExpertRules("delay strategy wait value route planning");
        const strategyContext = strategies.map(s => `- ${s.content}`).join('\n');

        if (alts.length > 0) {
            let synthesis;
            try {
                synthesis = await generateLLMResponse({
                    systemPrompt: `Alternative Routes: ${JSON.stringify(alts)}.
Strategic Rules (Apply these!):
${strategyContext}

User wants to go to: ${dest}. Current Station: ${context.currentStation}.
Task: Suggest alternatives.
CRITICAL: Use the "Wait Value Coefficient" (WVC) formula to advise whether to WAIT or DETOUR.
If WVC < 1, strongly recommend detour.`,
                    userPrompt: input,
                    taskType: 'reasoning' // Upgrade to Reasoning (Gemini 3) for Math/Logic
                });
            } catch (e) { }

            SignalCollector.collectSignal({ stationId: context.currentStation || '', policyCategory: 'expert_rule', intentTarget: dest || 'Unknown', unmetNeed: true });

            return {
                source: 'knowledge',
                type: 'action',
                content: synthesis || `建議替代方案：\n` + alts.map(a => `• 改搭 ${a.line} 到 ${a.name.ja} (步行 ${a.distance_to_dest}m)`).join('\n'),
                data: { strategy: 'spatial_reasoner', alternatives: alts },
                confidence: 0.95,
                reasoning: 'Executed Spatial Reasoner Skill'
            };
        }
        return null;
    }
}
