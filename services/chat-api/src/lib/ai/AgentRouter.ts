
import { generateLLMResponse } from './llmClient';
import { ToolDefinition } from '@/lib/l4/skills/schemas';
import { CacheService, getCache } from '@/lib/cache/cacheService';

export interface ToolSelection {
    toolName: string;
    reasoning: string;
    parameters: any;
}

type CachedToolSelection = { t: 'null' } | { t: 'sel'; v: ToolSelection };

const agentRouterCache = getCache<CachedToolSelection>('agent_router', {
    maxSize: 500,
    ttlMs: 2 * 60 * 1000,
    evictionRatio: 0.1
});

function clampString(value: string, maxChars: number): string {
    if (!value) return '';
    if (value.length <= maxChars) return value;
    return value.slice(0, maxChars);
}

function buildAgentRouterCacheKey(input: string, tools: { definition: ToolDefinition }[]): string {
    const toolNames = tools.map(t => t.definition?.name).filter(Boolean).sort();
    return CacheService.generateKey('agent_router', {
        input: clampString(String(input || '').trim(), 600),
        tools: toolNames
    });
}

export class AgentRouter {
    /**
     * Analyzes user input and selects the most appropriate tool from the provided list.
     * Uses MiniMax (Reasoning) for high-accuracy intent classification.
     */
    static async selectTool(
        input: string,
        tools: { name: string, definition: ToolDefinition }[]
    ): Promise<ToolSelection | null> {
        const normalizedInput = String(input || '').trim();
        const fareRegex = /(?:票價|車資|費用|多少錢|多少円|多少日幣|多少日元|jr\s*pass|suica|pasmo|ic\s*卡|ic\s*card|一日券|周遊券|定期券|回數券|折扣|優惠票|買票|購票|售票|ticket|fare|cost|price|pass)/i;
        const saveMoneyRegex = /(?:省錢|便宜|節省|budget|save money|cheap|低預算)/i;
        if (!fareRegex.test(normalizedInput) && saveMoneyRegex.test(normalizedInput)) {
            return null;
        }
        const filteredTools = (!fareRegex.test(normalizedInput) && saveMoneyRegex.test(normalizedInput))
            ? tools.filter(t => t.definition?.name !== 'search_fare_rules')
            : tools;

        const cacheKey = buildAgentRouterCacheKey(normalizedInput, filteredTools);
        const cached = agentRouterCache.get(cacheKey);
        if (cached) {
            return cached.t === 'null' ? null : cached.v;
        }

        // 1. Construct Tool Definitions Block
        const toolsBlock = filteredTools.map(t => JSON.stringify(t.definition)).join('\n');

        const systemPrompt = `
You are the "Intent Router" for the Tokyo Transit Assistant.
Your goal is to decide which tool (skill) to use to best answer the user's request.

Available Tools:
${toolsBlock}

Rules:
1. Analyze the user's input carefully.
2. If the input matches a tool's capability, select that tool.
3. Extract necessary parameters from the input based on the tool's schema.
4. If NO tool is suitable, or the user is just chit-chatting, return "null".
5. Only select fare rule tools when the user explicitly asks about tickets, fares, passes, or prices.
6. If the user asks about saving money without mentioning tickets or fares, return "null".
7. OUTPUT FORMAT: You must return a strict JSON object. No markdown.
{
  "toolName": "name_of_the_tool",
  "reasoning": "Why you chose this tool",
  "parameters": { ...extracted params... }
}
`;

        try {
            const response = await generateLLMResponse({
                systemPrompt,
                userPrompt: input,
                taskType: 'classification',
                temperature: 0.0
            });

            if (!response) return null;

            // Clean response (remove markdown code blocks if any)
            const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();

            if (cleanJson.toLowerCase() === 'null') {
                agentRouterCache.set(cacheKey, { t: 'null' });
                return null;
            }

            const parsed = JSON.parse(cleanJson);

            if (parsed.toolName && filteredTools.some(t => t.definition.name === parsed.toolName)) {
                const out = parsed as ToolSelection;
                agentRouterCache.set(cacheKey, { t: 'sel', v: out });
                return out;
            }

            console.warn('[AgentRouter] Invalid tool selection:', parsed.toolName);
            agentRouterCache.set(cacheKey, { t: 'null' });
            return null;

        } catch (error) {
            console.error('[AgentRouter] Failed to route intent:', error);
            agentRouterCache.set(cacheKey, { t: 'null' });
            return null;
        }
    }
}
