
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
        const cacheKey = buildAgentRouterCacheKey(input, tools);
        const cached = agentRouterCache.get(cacheKey);
        if (cached) {
            return cached.t === 'null' ? null : cached.v;
        }

        // 1. Construct Tool Definitions Block
        const toolsBlock = tools.map(t => JSON.stringify(t.definition)).join('\n');

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
5. OUTPUT FORMAT: Return ONLY a valid JSON object. Do not use markdown blocks.
{
  "toolName": "name_of_the_tool",
  "reasoning": "Max 10 words explanation",
  "parameters": { ...extracted params... }
}
`;

        try {
            const response = await generateLLMResponse({
                systemPrompt,
                userPrompt: input,
                taskType: 'classification',
                model: 'gemini-3-flash-preview',
                temperature: 0.0,
                maxTokens: 1024 // Ensure enough space for JSON with reasoning
            });

            if (!response) return null;

            // Attempt to extract JSON object from response
            let jsonString = response.trim();
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                jsonString = jsonMatch[0];
            }

            // Clean response (remove markdown code blocks if any left)
            const cleanJson = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();

            if (cleanJson.toLowerCase() === 'null') {
                agentRouterCache.set(cacheKey, { t: 'null' });
                return null;
            }

            let parsed;
            try {
                parsed = JSON.parse(cleanJson);
            } catch (e) {
                console.warn('[AgentRouter] JSON Parse Failed. Raw:', response);
                throw e; // Let the outer catch handle it
            }

            if (parsed.toolName && tools.some(t => t.definition.name === parsed.toolName)) {
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
