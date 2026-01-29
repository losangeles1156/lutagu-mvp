/**
 * AI Agent 2.0 API Route
 * 
 * Uses AI SDK's streamText with maxSteps for true agent loop behavior.
 * This is the new architecture that replaces the monolithic HybridEngine approach.
 */

import { NextRequest } from 'next/server';
import { streamText, generateText } from 'ai';
import { createAgentTools, ToolContext } from '@/lib/agent/tools/AgentTools';
import { createAgentSystemPrompt, TOKYO_SYSTEM_PROMPT_CONFIG } from '@/lib/agent/prompts/SystemPrompt';
import { AGENT_TYPES, SubagentType } from '@/lib/agent/types';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

// Debug logging helper
function logDebug(message: string) {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(path.join(process.cwd(), 'AGENT_DEBUG.log'), logLine);
    console.log(`[Agent 2.0] ${message}`);
}

// Configuration
const MAX_STEPS = 5; // Allow up to 5 rounds of tool calls

// Use OpenRouter with DeepSeek V3.2 as primary model
import {
    openrouter,
    zeabur,
    MODEL_CONFIG,
    ZEABUR_MODEL_CONFIG,
    FALLBACK_CHAIN,
    getModel
} from '@/lib/agent/openRouterConfig';

/**
 * Stream text with automatic fallback to backup models
 */
async function streamWithFallback(
    params: Omit<Parameters<typeof streamText>[0], 'model'>,
    simulateFailure: boolean = false
) {
    for (let i = 0; i < FALLBACK_CHAIN.length; i++) {
        const modelId = FALLBACK_CHAIN[i];
        try {
            console.log(`[Agent 2.0] Attempting model: ${modelId}${i === 0 && simulateFailure ? ' (WILL FAIL)' : ''}`);
            // Use 'as any' to bypass AI SDK type inference issues
            return streamText({ ...params, model: getModel(modelId, i === 0 && simulateFailure) } as any);
        } catch (err: any) {
            console.warn(`[Agent 2.0] Model ${modelId} failed:`, err.message);
            if (i === FALLBACK_CHAIN.length - 1) {
                throw err; // All models failed
            }
            console.log(`[Agent 2.0] Falling back to next model...`);
        }
    }
    // TypeScript requires a return, but this is unreachable
    throw new Error('All models in fallback chain failed');
}

interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export async function POST(req: NextRequest) {
    const rawBody = await req.text();
    let body: Record<string, unknown> = {};

    try {
        body = rawBody ? JSON.parse(rawBody) : {};
    } catch {
        body = {};
    }

    // Extract user message
    const extractText = (value: unknown): string => {
        if (!value) return '';
        if (typeof value === 'string') return value;
        if (Array.isArray(value)) {
            return value
                .map((part) => {
                    if (typeof part === 'string') return part;
                    if (typeof part?.text === 'string') return part.text;
                    if (typeof part?.content === 'string') return part.content;
                    return '';
                })
                .join('')
                .trim();
        }
        if (typeof value === 'object' && value !== null) {
            const obj = value as Record<string, unknown>;
            if (typeof obj.text === 'string') return obj.text;
            if (typeof obj.content === 'string') return obj.content;
        }
        return '';
    };

    const locale = typeof body?.locale === 'string' ? body.locale : 'zh-TW';
    const userId = typeof body?.userId === 'string' ? body.userId : `anon-${randomUUID()}`;
    const currentStation = (body.nodeId || body.currentStation || body.current_station) as string | undefined;

    // Build messages array
    const messages: Message[] = [];

    if (Array.isArray(body.messages)) {
        for (const m of body.messages) {
            if (!m || typeof m !== 'object') continue;
            const msg = m as Record<string, unknown>;
            const role = msg?.role === 'assistant' ? 'assistant' : 'user';
            const content = extractText(msg?.content ?? msg?.parts ?? msg?.text ?? msg);
            if (content) {
                messages.push({ role, content });
            }
        }
    }

    // Add current user message if not in messages
    const currentText = extractText(body.text || body.input || body.prompt || body.message);
    if (currentText && !messages.some(m => m.role === 'user' && m.content === currentText)) {
        messages.push({ role: 'user', content: currentText });
    }

    // [P2 FIX] Enhance last user message with Tool Calling reinforcement to solve missing UI Cards
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.role === 'user') {
        const reinforcement = `\n\n[INSTRUCTION]: You MUST call the findRoute tool to get real route data. Do NOT output [HYBRID_DATA] without calling findRoute first.`;
        if (!lastMsg.content.includes('[INSTRUCTION]')) {
            lastMsg.content += reinforcement;
        }
    }



    // Fallback if no messages
    if (messages.length === 0) {
        messages.push({ role: 'user', content: 'Hello' });
    }

    // DEBUG LOGGING
    console.log(`[Agent 2.0] Messages to Model:`, JSON.stringify(messages, null, 2));
    console.log(`[Agent 2.0] Processing ${messages.length} messages, locale: ${locale}`);
    // Create tool context (initially without subagent runner to avoid circular reference)
    const toolContext: ToolContext = {
        locale,
        userId,
        currentStation,
        currentLocation: body.userLocation as { lat: number; lng: number } | undefined,
    };

    // Create tools first
    const tools = createAgentTools(toolContext);
    console.log(`[Agent 2.0] Tools count:`, Object.keys(tools).length);

    // Now inject runSubagent into context (it can now safely reference tools)
    toolContext.runSubagent = async ({ agentType, prompt, description }) => {
        console.log(`[Agent 2.0] Running subagent: ${agentType} (${description})`);
        const subConfig = AGENT_TYPES[agentType];

        try {
            const hasTools = subConfig.tools.length > 0;
            let subResult;

            if (hasTools) {
                // Tool-based agents use standard OpenRouter flow
                // CRITICAL: Filter out 'callSubagent' to prevent infinite recursion
                subResult = await generateText({
                    model: getModel(MODEL_CONFIG.primary),
                    system: subConfig.systemPrompt,
                    prompt: prompt,
                    tools: Object.fromEntries(
                        Object.entries(tools).filter(([name]) =>
                            subConfig.tools.includes(name) && name !== 'callSubagent'
                        )
                    ),
                });
            } else {
                // Tool-less agents use Zeabur (DeepSeek V3.2)
                console.log(`[Agent 2.0] Using Zeabur Provider for subagent: ${agentType}`);
                subResult = await generateText({
                    model: zeabur(ZEABUR_MODEL_CONFIG.model),
                    system: subConfig.systemPrompt,
                    prompt: prompt,
                    // No tools passed
                });
            }

            return {
                success: true,
                summary: subResult.text,
            };
        } catch (err) {
            console.error(`[Agent 2.0] Subagent ${agentType} failed:`, err);
            return {
                success: false,
                summary: `Error executing sub-task: ${description}`,
            };
        }
    };

    const systemPrompt = createAgentSystemPrompt({
        ...TOKYO_SYSTEM_PROMPT_CONFIG,
        locale,
    });

    // Agent loop stop condition
    const stopWhen = ({ steps }: { steps: any[] }) => {
        const lastStep = steps[steps.length - 1];
        if (lastStep?.toolCalls && lastStep.toolCalls.length > 0) return false;
        return steps.length >= MAX_STEPS;
    };

    // DEBUG: Log tools being passed
    console.log(`[Agent 2.0] Tools available:`, Object.keys(tools));
    console.log(`[Agent 2.0] System prompt length:`, systemPrompt.length);

    const simulateFailure = req.headers.get('x-simulate-failure') === 'true';

    try {
        // Use streamWithFallback for automatic model failover
        logDebug(`Starting streamWithFallback with ${Object.keys(tools).length} tools, last msg: ${messages[messages.length - 1]?.content?.slice(0, 100)}`);

        const result = await streamWithFallback({
            system: systemPrompt,
            messages,
            tools,
            maxSteps: MAX_STEPS as number, // Enable multi-step tool calling loop
            toolChoice: 'auto', // Let model decide when to use tools
            onFinish: ({ text, toolCalls, steps }) => {
                const stepCount = steps?.length || 0;
                const toolNames = toolCalls?.map(tc => tc.toolName) || [];

                logDebug(`=== STREAM FINISHED ===`);
                logDebug(`Steps: ${stepCount}`);
                logDebug(`Tool calls: ${toolNames.length > 0 ? toolNames.join(', ') : 'NONE'}`);
                logDebug(`Response preview: ${text?.slice(0, 300).replace(/\n/g, ' ')}`);

                if (toolNames.length === 0 && text?.includes('[HYBRID_DATA]')) {
                    logDebug(`WARNING: [HYBRID_DATA] output WITHOUT tool calls - this is hallucination!`);
                }
            },
        } as any, simulateFailure);

        // Return the stream directly
        return result.toTextStreamResponse({
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'no-cache, no-transform',
                'X-Accel-Buffering': 'no',
            },
        });

    } catch (error) {
        console.error('[Agent 2.0] Error:', error);

        const errorMessage = locale === 'en'
            ? 'Sorry, an error occurred. Please try again.'
            : '抱歉，發生錯誤，請重試。';

        return new Response(errorMessage, {
            status: 500,
            headers: { 'Content-Type': 'text/plain' },
        });
    }
}
