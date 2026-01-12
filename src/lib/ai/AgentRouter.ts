
import { generateLLMResponse } from './llmClient';
import { ToolDefinition } from '@/lib/l4/skills/schemas';

export interface ToolSelection {
    toolName: string;
    reasoning: string;
    parameters: any;
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
5. OUTPUT FORMAT: You must return a strict JSON object. No markdown.
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
                taskType: 'reasoning', // Use MiniMax M2.1
                temperature: 0.1
            });

            if (!response) return null;

            // Clean response (remove markdown code blocks if any)
            const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();

            if (cleanJson.toLowerCase() === 'null') return null;

            const parsed = JSON.parse(cleanJson);

            if (parsed.toolName && tools.some(t => t.definition.name === parsed.toolName)) {
                return parsed as ToolSelection;
            }

            console.warn('[AgentRouter] Invalid tool selection:', parsed.toolName);
            return null;

        } catch (error) {
            console.error('[AgentRouter] Failed to route intent:', error);
            return null;
        }
    }
}
