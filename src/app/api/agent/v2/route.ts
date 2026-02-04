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
import { AGENT_TYPES } from '@/lib/agent/types';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { logger } from '@/lib/utils/logger';
import { recordAgentError, recordAgentFallback, recordAgentResult } from '@/lib/agent/healthState';

export const runtime = 'nodejs';

const IS_PROD = process.env.NODE_ENV === 'production';
const DEBUG_LOG_FILE = path.join(process.cwd(), 'AGENT_DEBUG.log');

// Debug logging helper (avoid file writes in production)
function logDebug(message: string) {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${message}\n`;
    if (!IS_PROD) {
        try {
            fs.appendFileSync(DEBUG_LOG_FILE, logLine);
        } catch (error) {
            console.warn('[Agent 2.0] Debug log write failed:', error);
        }
    }
    console.log(`[Agent 2.0] ${message}`);
}

// Configuration
const MAX_STEPS = 5; // Allow up to 5 rounds of tool calls
const AI_TIMEOUT_MS = Number(process.env.AGENT_V2_TIMEOUT_MS || 25000);
const FALLBACK_MODE = (process.env.AGENT_V2_FALLBACK || 'chat').toLowerCase();
const E2E_KEY = process.env.AGENT_E2E_KEY || '';
let lastModelUsed: string | null = null;

// Use OpenRouter with DeepSeek V3.2 as primary model
import {
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
            lastModelUsed = modelId;
            return streamText({ ...params, model: getModel(modelId, i === 0 && simulateFailure) } as any);
        } catch (err: any) {
            console.warn(`[Agent 2.0] Model ${modelId} failed:`, err.message);
            if (i === FALLBACK_CHAIN.length - 1) {
                // No more fallback models available
                recordAgentError(`model-unavailable:${modelId}`);
                throw new Error(`MODEL_UNAVAILABLE:${modelId}`);
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
    const requestId = randomUUID();
    const startTimeMs = Date.now();
    const e2eEnabled = Boolean(E2E_KEY) && req.headers.get('x-agent-e2e-key') === E2E_KEY;
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
        const query = lastMsg.content.toLowerCase();
        let reinforcement = '';

        if (query.includes('route') || query.includes('go to') || query.includes('從') || query.includes('到')) {
            reinforcement = `\n\n[INSTRUCTION]: You MUST call the findRoute tool to get real route data. Do NOT output [HYBRID_DATA] without calling findRoute first.`;
        } else if (query.includes('status') || query.includes('delay') || query.includes('延遲') || query.includes('運行')) {
            reinforcement = `\n\n[INSTRUCTION]: You MUST call the getTransitStatus tool to get real-time status. Summarize the findings clearly for the user.`;
        }

        if (reinforcement && !lastMsg.content.includes('[INSTRUCTION]')) {
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

    const rawBodyForProxy = rawBodyForFallback(rawBody, body);

    const missingKeys = getMissingKeys();
    if (missingKeys.length > 0) {
        const reason = `Missing AI keys: ${missingKeys.join(', ')}`;
        logger.warn(`[Agent 2.0] ${reason}`);
        recordAgentError(reason);
        if (!e2eEnabled) {
            const fallback = await tryFallback({
                mode: FALLBACK_MODE,
                req,
                rawBody: rawBodyForProxy,
                reason,
                locale
            });
            if (fallback) return withRequestIdHeader(fallback, requestId);
        }
        recordAgentResult({
            requestId,
            backend: 'v2',
            toolCalls: [],
            latencyMs: Date.now() - startTimeMs,
            success: false
        });
        return errorResponse(locale, reason, 503, requestId);
    }

    let toolResultsForSummary: any[] = [];
    let toolNamesForSummary: string[] = [];
    try {
        // Use streamWithFallback for automatic model failover
        logDebug(`Starting streamWithFallback with ${Object.keys(tools).length} tools, last msg: ${messages[messages.length - 1]?.content?.slice(0, 100)}`);

        const result = await withTimeout(streamWithFallback({
            system: systemPrompt,
            messages,
            tools,
            maxSteps: MAX_STEPS as number, // Enable multi-step tool calling loop
            toolChoice: 'auto', // Let model decide when to use tools
            onFinish: ({ text, toolCalls, steps }: { text: string; toolCalls?: Array<{ toolName: string }>; steps?: unknown[] }) => {
                const stepCount = steps?.length || 0;
                const toolNames = toolCalls?.map(tc => tc.toolName) || [];
                toolNamesForSummary = toolNames;
                toolResultsForSummary = extractToolResults(steps);
                recordAgentResult({
                    requestId,
                    backend: 'v2',
                    toolCalls: toolNames,
                    latencyMs: Date.now() - startTimeMs,
                    success: true
                });

                logDebug(`=== STREAM FINISHED ===`);
                logDebug(`Steps: ${stepCount}`);
                logDebug(`Tool calls: ${toolNames.length > 0 ? toolNames.join(', ') : 'NONE'}`);
                logDebug(`Response preview: ${text?.slice(0, 300).replace(/\n/g, ' ')}`);

                if (toolNames.length === 0 && text?.includes('[HYBRID_DATA]')) {
                    logDebug(`WARNING: [HYBRID_DATA] output WITHOUT tool calls - this is hallucination!`);
                }
            },
        } as any, simulateFailure), AI_TIMEOUT_MS, 'Agent v2 timeout');

        const encoder = new TextEncoder();
        let hasOutput = false;
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of result.textStream) {
                        if (chunk) {
                            hasOutput = true;
                            controller.enqueue(encoder.encode(chunk));
                        }
                    }
                    if (!hasOutput) {
                        const fallbackText = await buildFallbackFromTools(toolResultsForSummary, locale);
                        if (fallbackText) {
                            controller.enqueue(encoder.encode(fallbackText));
                        }
                    }
                    const hybridData = buildHybridData(toolResultsForSummary, toolNamesForSummary);
                    if (hybridData) {
                        controller.enqueue(encoder.encode(`\n[HYBRID_DATA]${JSON.stringify(hybridData)}[/HYBRID_DATA]`));
                    }
                    if (e2eEnabled) {
                        const meta = {
                            toolCalls: toolNamesForSummary,
                            latencyMs: Date.now() - startTimeMs
                        };
                        controller.enqueue(encoder.encode(`\n[E2E_META]${JSON.stringify(meta)}[/E2E_META]`));
                    }
                } finally {
                    controller.close();
                }
            }
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'no-cache, no-transform',
                'X-Accel-Buffering': 'no',
                'X-Agent-Backend': 'v2',
                ...(lastModelUsed ? { 'X-LLM-Model': lastModelUsed } : {}),
                'X-Agent-Request-Id': requestId
            },
        });

    } catch (error: any) {
        console.error('[Agent 2.0] Error:', error);
        logDebug(`!!! CRITICAL ERROR !!!: ${error?.message || String(error)}\nStack: ${error?.stack || ''}`);
        logger.error('[Agent 2.0] Error', error);
        recordAgentError(String(error?.message || error));

        const reason = error?.message || 'Agent v2 failure';
        if (!e2eEnabled) {
            const fallback = await tryFallback({
                mode: FALLBACK_MODE,
                req,
                rawBody: rawBodyForProxy,
                reason,
                locale
            });
            if (fallback) {
                return withRequestIdHeader(fallback, requestId);
            }
        }

        recordAgentResult({
            requestId,
            backend: 'v2',
            toolCalls: [],
            latencyMs: Date.now() - startTimeMs,
            success: false
        });
        return errorResponse(locale, reason, 500, requestId);
    }
}

function getMissingKeys(): string[] {
    const missing: string[] = [];
    if (!process.env.OPENROUTER_API_KEY) missing.push('OPENROUTER_API_KEY');
    return missing;
}

function rawBodyForFallback(rawBody: string | undefined, body: Record<string, unknown>): string {
    if (typeof rawBody === 'string' && rawBody.trim()) return rawBody;
    try {
        return JSON.stringify(body ?? {});
    } catch {
        return '{}';
    }
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    let timeoutId: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
            reject(new Error(label));
        }, ms);
    });
    try {
        return await Promise.race([promise, timeoutPromise]);
    } finally {
        if (timeoutId) clearTimeout(timeoutId);
    }
}

function errorResponse(locale: string, reason: string, status: number, requestId?: string): Response {
    const modelUnavailable = reason.startsWith('MODEL_UNAVAILABLE:');
    const errorMessage = modelUnavailable
        ? (locale === 'en'
            ? 'Model service is temporarily unavailable. Please try again shortly.'
            : '模型服務暫時異常，已記錄警示，請稍後再試。')
        : (locale === 'en'
            ? 'Sorry, an error occurred. Please try again.'
            : '抱歉，發生錯誤，請重試。');
    return new Response(`${errorMessage}\n${IS_PROD ? '' : `[DEBUG] ${reason}`}`.trim(), {
        status,
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'X-Agent-Backend': 'v2',
            ...(modelUnavailable ? { 'X-LLM-Alert': reason.replace('MODEL_UNAVAILABLE:', '') } : {}),
            ...(requestId ? { 'X-Agent-Request-Id': requestId } : {})
        },
    });
}

async function tryFallback(params: {
    mode: string;
    req: NextRequest;
    rawBody: string;
    reason: string;
    locale: string;
}): Promise<Response | null> {
    const mode = params.mode;
    if (mode === 'none') return null;

    const path =
        mode === 'chat' ? '/api/agent/chat' :
            mode === 'adk' ? '/api/agent/adk' :
                null;
    if (!path) return null;

    const origin = params.req.nextUrl.origin;
    try {
        recordAgentFallback(mode, params.reason);
        const upstream = await fetch(`${origin}${path}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Agent-Fallback-From': 'v2'
            },
            body: params.rawBody
        });

        if (!upstream.body) {
            logger.warn(`[Agent 2.0] Fallback ${mode} returned empty body`);
            return null;
        }

        return new Response(upstream.body, {
            status: upstream.status,
            headers: {
                'Content-Type': upstream.headers.get('Content-Type') || 'text/plain; charset=utf-8',
                'Cache-Control': 'no-cache, no-transform',
                'X-Accel-Buffering': 'no',
                'X-Agent-Backend': `fallback-${mode}`
            }
        });
    } catch (error) {
        logger.error(`[Agent 2.0] Fallback ${mode} failed`, error);
        recordAgentError(`fallback-${mode}-error`);
        return null;
    }
}

(POST as any).__private__ = {
    getMissingKeys,
    rawBodyForFallback,
    withTimeout,
    errorResponse,
    tryFallback
};

function withRequestIdHeader(res: Response, requestId: string): Response {
    const headers = new Headers(res.headers);
    headers.set('X-Agent-Request-Id', requestId);
    return new Response(res.body, { status: res.status, headers });
}

function extractToolResults(steps?: unknown[]) {
    if (!Array.isArray(steps)) return [];
    const results: any[] = [];
    for (const step of steps) {
        const toolResults = (step as any)?.toolResults;
        if (Array.isArray(toolResults)) {
            results.push(...toolResults);
        }
    }
    return results;
}

function buildHybridData(toolResults: any[], toolNames: string[]) {
    if (!toolResults || toolResults.length === 0) return null;
    const lastResult = toolResults[toolResults.length - 1];
    const lastTool = (lastResult as any)?.toolName || toolNames[toolNames.length - 1] || '';
    const resultPayload = (lastResult as any)?.result ?? lastResult;

    const mapType = (toolName: string, result: any) => {
        if (result?.airportAccess) return 'airport_access';
        switch (toolName) {
            case 'findRoute':
                return 'route';
            case 'searchPOI':
                return 'poi';
            case 'getTransitStatus':
                return 'status';
            case 'getStationInfo':
                return 'station';
            case 'retrieveStationKnowledge':
                return 'knowledge';
            case 'getAirportAccess':
                return 'airport_access';
            default:
                return 'text';
        }
    };

    return {
        type: mapType(lastTool, lastResult),
        source: 'tool',
        data: resultPayload,
        toolName: lastTool
    };
}

async function buildFallbackFromTools(toolResults: any[], locale: string): Promise<string> {
    if (!toolResults || toolResults.length === 0) {
        return locale === 'en'
            ? 'I was unable to retrieve results. Please try again.'
            : '目前無法取得結果，請稍後再試。';
    }

    const prompt = `You are a transit assistant. Based on the tool results JSON below, provide a concise answer in ${locale}.\n\nTool Results JSON:\n${JSON.stringify(toolResults).slice(0, 6000)}`;

    try {
        const summary = await generateText({
            model: getModel(MODEL_CONFIG.primary),
            prompt
        });
        return summary.text || '';
    } catch (error) {
        console.error('[Agent 2.0] Fallback summarization failed:', error);
        return locale === 'en'
            ? 'I was unable to summarize the results. Please try again.'
            : '目前無法整理結果，請稍後再試。';
    }
}
