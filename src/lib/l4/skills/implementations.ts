import { DeepResearchSkill, SkillResult } from './SkillRegistry';
import { RequestContext } from '../HybridEngine';
import { DataMux } from '@/lib/data/DataMux';
import { SignalCollector } from '@/lib/analytics/SignalCollector';
import { generateLLMResponse } from '@/lib/ai/llmService';
import {
    FARE_RULES_SKILL,
    ACCESSIBILITY_MASTER_SKILL,
    LUGGAGE_LOGISTICS_SKILL,
    LAST_MILE_CONNECTOR_SKILL,
    CROWD_DISPATCHER_SKILL,
    SPATIAL_REASONER_SKILL
} from './provisional';
import {
    ToolDefinition,
    FARE_RULES_SCHEMA,
    ACCESSIBILITY_SCHEMA,
    LUGGAGE_SCHEMA,
    LAST_MILE_SCHEMA,
    CROWD_DISPATCHER_SCHEMA
} from './schemas';

// Base class for logic reuse
abstract class BaseSkill implements DeepResearchSkill {
    name: string;
    priority: number;
    keywords: string[];
    definition: ToolDefinition;

    constructor(name: string, priority: number, keywords: string[], definition: ToolDefinition) {
        this.name = name;
        this.priority = priority;
        this.keywords = keywords;
        this.definition = definition;
    }

    canHandle(input: string, _context: RequestContext): boolean {
        // Simple keyword match (can be overridden)
        return this.keywords.some(k => input.includes(k));
    }

    abstract execute(input: string, context: RequestContext, params?: any): Promise<SkillResult | null>;
}

export class FareRulesSkill extends BaseSkill {
    constructor() { super(FARE_RULES_SKILL.name, 100, FARE_RULES_SKILL.keywords, FARE_RULES_SCHEMA); } // Highest Priority

    async execute(input: string, context: RequestContext, params?: any): Promise<SkillResult | null> {
        console.log(`[Deep Research] Triggering Fare Rules (Expert RAG)... Params:`, params);
        // Use params.query if available (Agentic), else fallback to input (Regex)
        const query = params?.query || input;

        const rules = await DataMux.searchExpertRules(query);
        const ruleContext = rules.map(r => `- ${r.content}`).join('\n');

        let synthesis;
        try {
            synthesis = await generateLLMResponse({
                systemPrompt: `You are a Tokyo Transit Expert. Answer based ONLY on these rules:\n${ruleContext}\n\nIf the rules don't cover it, say 'I'm not sure specifically about that, but generally...' and give safe advice. Be concise.`,
                userPrompt: query
            });
        } catch (e) {
            synthesis = `(AI Synthesis Unavailable) Based on rules: ${rules[0]?.content}`;
        }

        if (!synthesis) synthesis = `(AI Synthesis Unavailable) Based on rules: ${rules[0]?.content}`;

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
    constructor() { super(ACCESSIBILITY_MASTER_SKILL.name, 90, ACCESSIBILITY_MASTER_SKILL.keywords, ACCESSIBILITY_SCHEMA); }

    async execute(input: string, context: RequestContext, params?: any): Promise<SkillResult | null> {
        console.log(`[Deep Research] Triggering Accessibility Master... Params:`, params);
        const targetStation = params?.station_id || context.currentStation || '';
        const graph = await DataMux.getFacilityGraph(targetStation);

        if (graph) {
            SignalCollector.collectSignal({ stationId: targetStation, policyCategory: 'barrier_free', intentTarget: 'Elevator Route', unmetNeed: false });
            return {
                source: 'knowledge',
                type: 'expert_tip',
                content: `收到！針對${targetStation}無障礙需求，請走這條路線：\n找尋標示「エレベーター (Elevator)」的出口...`,
                data: { strategy: 'accessibility_master', facilities: graph },
                confidence: 0.95,
                reasoning: 'Executed Accessibility Master Skill'
            };
        }
        return null;
    }
}

export class LuggageSkill extends BaseSkill {
    constructor() { super(LUGGAGE_LOGISTICS_SKILL.name, 80, LUGGAGE_LOGISTICS_SKILL.keywords, LUGGAGE_SCHEMA); }

    async execute(input: string, context: RequestContext, params?: any): Promise<SkillResult | null> {
        console.log(`[Deep Research] Triggering Luggage Logistics... Params:`, params);
        const targetStation = params?.station_id || context.currentStation || '';

        const status = await DataMux.checkLockerStatus(targetStation);
        const full = status.lockers.every((l: any) => l.status === 'full');

        SignalCollector.collectSignal({ stationId: targetStation, policyCategory: 'hands_free', intentTarget: 'Locker', unmetNeed: full });

        return {
            source: 'knowledge',
            type: 'action',
            content: full
                ? `⚠️ ${targetStation} 站內置物櫃目前全滿！\n建議前往南口的 **${status.nearbyStorage[0].name}** 寄放 (費用 ${status.nearbyStorage[0].price})。`
                : `✅ 目前 ${status.lockers.find((l: any) => l.status === 'available').location} 的置物櫃還有空位喔！`,
            data: { strategy: 'luggage_logistics', status },
            confidence: 0.98,
            reasoning: 'Executed Luggage Logistics Skill'
        };
    }
}

export class LastMileSkill extends BaseSkill {
    constructor() { super(LAST_MILE_CONNECTOR_SKILL.name, 70, LAST_MILE_CONNECTOR_SKILL.keywords, LAST_MILE_SCHEMA); }

    async execute(input: string, context: RequestContext, params?: any): Promise<SkillResult | null> {
        console.log(`[Deep Research] Triggering Last Mile Connector...Params:`, params);
        const targetStation = params?.station_id || context.currentStation || '';
        // If destination is provided in params, we could theoretically use it for better routing
        const dest = params?.destination || 'Nearby';

        const options = await DataMux.searchMicroMobility(targetStation);

        SignalCollector.collectSignal({ stationId: targetStation, policyCategory: 'traffic_vacuum', intentTarget: dest, unmetNeed: false });

        return {
            source: 'knowledge',
            type: 'recommendation',
            content: `去 ${dest} 走路稍遠 (>15分)。\n🚌 建議搭乘 **${options.bus[0].name}**，或者是騎 **Luup** (目前有 ${options.luup[0].count} 台車) 會更快喔！🛴`,
            data: { strategy: 'last_mile_connector', options },
            confidence: 0.95,
            reasoning: 'Executed Last Mile Connector Skill'
        };
    }
}

export class CrowdDispatcherSkill extends BaseSkill {
    constructor() { super(CROWD_DISPATCHER_SKILL.name, 60, CROWD_DISPATCHER_SKILL.keywords, CROWD_DISPATCHER_SCHEMA); }

    async execute(input: string, context: RequestContext, params?: any): Promise<SkillResult | null> {
        console.log(`[Deep Research] Triggering Crowd Dispatcher... Params:`, params);
        const targetStation = params?.current_station || context.currentStation || '';

        const vibes = await DataMux.findSimilarVibePlaces(targetStation);

        if (vibes.length > 0) {
            SignalCollector.collectSignal({ stationId: targetStation, policyCategory: 'overtourism', intentTarget: 'Quiet Place', unmetNeed: false });
            return {
                source: 'knowledge',
                type: 'recommendation',
                content: `根據氣氛分析，為您找到幾個類似但人潮較少的地方：\n` + vibes.map(v => `• ${v.name} (相似度 ${(v.similarity * 100).toFixed(0)}%)`).join('\n'),
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
            { name: "spatial_reasoner", description: "Fallback for routing", parameters: { type: "object", properties: {} } }
        );
    }

    async execute(input: string, context: RequestContext, params?: any): Promise<SkillResult | null> {
        console.log(`[Deep Research] Triggering Spatial Reasoner...`);
        let dest = context.strategyContext?.nodeName;
        if (!dest) {
            const match = input.match(/(?:到|前往|to)\s*([^?\s]+)/);
            if (match) dest = match[1];
        }

        const alts = await DataMux.getAlternativeStations(context.currentStation || '', dest);
        if (alts.length > 0) {
            SignalCollector.collectSignal({ stationId: context.currentStation || '', policyCategory: 'expert_rule', intentTarget: dest || 'Unknown', unmetNeed: true });
            return {
                source: 'knowledge',
                type: 'action',
                content: `建議替代方案：\n` + alts.map(a => `• 改搭 ${a.line} 到 ${a.name.ja} (步行 ${a.distance_to_dest}m)`).join('\n'),
                data: { strategy: 'spatial_reasoner', alternatives: alts },
                confidence: 0.95,
                reasoning: 'Executed Spatial Reasoner Skill'
            };
        }
        return null;
    }
}
