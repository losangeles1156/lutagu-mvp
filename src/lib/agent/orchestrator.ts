import { AGENT_TOOLS, TOOL_HANDLERS } from './toolDefinitions';
import { SecurityService } from '@/lib/security/securityService';

export interface AgentMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    name?: string;
    tool_call_id?: string;
    tool_calls?: any[];
}

export interface OrchestratorContext {
    nodeId: string;
    locale: string;
    userProfile: string;
    timestamp: number;
}

const FALLBACK_MESSAGES: Record<string, string> = {
    'zh-TW': '抱歉，我現在連線有點不穩定，暫時無法連接大腦。您可以稍後再試，或直接參考車站即時資訊看板。',
    'zh': '抱歉，我现在连线有点不稳定，暂时无法连接大脑。您可以稍后再试，或直接参考车站即时信息看板。',
    'ja': '申し訳ありません。現在接続が不安定で、AIサーバーに接続できません。しばらくしてからもう一度お試しください。',
    'en': 'I apologize, but I am having trouble connecting to the AI service right now. Please try again later or check the station information boards.',
    'ar': 'أعتذر، ولكن لدي مشكلة في الاتصال بخدمة الذكاء الاصطناعي حاليًا. يرجى المحاولة مرة أخرى لاحقًا.',
};

export class AgentOrchestrator {
    private mistralKey: string;
    private geminiKey: string;
    private model: string;
    private maxIterations: number;

    constructor() {
        this.mistralKey = process.env.MISTRAL_API_KEY || '';
        this.geminiKey = process.env.GEMINI_API_KEY || '';
        this.model = process.env.AI_SLM_MODEL || 'mistral-small-latest';
        // MVP optimization: reduce iterations for faster responses
        this.maxIterations = parseInt(process.env.AI_MAX_ITERATIONS || '3', 10);
    }

    async run(messages: AgentMessage[], context: OrchestratorContext): Promise<ReadableStream> {
        const encoder = new TextEncoder();
        const model = this.model;
        const isGemini = model.toLowerCase().includes('gemini');
        const apiKey = isGemini ? this.geminiKey : this.mistralKey;
        const maxIterations = this.maxIterations;

        // 1. Security: Prune history to prevent token overflow and memory poisoning
        let chatHistory = SecurityService.pruneHistory(messages, 10); // Keep last 10 turns

        // 2. Security: Validate latest user input
        const lastUserMsg = chatHistory.filter(m => m.role === 'user').pop();
        if (lastUserMsg) {
            const validation = SecurityService.validateInput(lastUserMsg.content);
            if (!validation.isSafe) {
                // Return a stream that immediately closes with a warning
                return new ReadableStream({
                    start(controller) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ event: 'message', answer: "⚠️ 您的輸入包含不允許的內容或過長，請修改後重試。" })}\n\n`));
                        controller.close();
                    }
                });
            }
        }

        let currentIteration = 0;
        const toolsCalled: string[] = []; // Track all tools called during this session


        return new ReadableStream({
            async start(controller) {
                try {
                    // Send initial meta event
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ event: 'meta', mode: isGemini ? 'gemini' : 'mistral' })}\n\n`));

                    while (currentIteration < maxIterations) {
                        currentIteration++;

                        const apiUrl = isGemini
                            ? `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`
                            : `https://api.mistral.ai/v1/chat/completions`;

                        // Execute API call with auto-retry
                        const response = await fetchWithRetry(apiUrl, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${apiKey}`
                            },
                            body: JSON.stringify({
                                model: model,
                                messages: chatHistory,
                                tools: AGENT_TOOLS,
                                tool_choice: 'auto',
                                temperature: 0.2
                            })
                        });

                        if (!response.ok) {
                            const errorText = await response.text();
                            throw new Error(`${isGemini ? 'Gemini' : 'Mistral'} API Error: ${response.status} ${errorText}`);
                        }

                        const data = await response.json();
                        const message = data.choices?.[0]?.message;

                        if (!message) {
                            throw new Error('Invalid API response format: missing message content');
                        }

                        if (message.tool_calls && message.tool_calls.length > 0) {
                            // Handle Tool Calls
                            chatHistory.push(message);

                            const toolPromises = message.tool_calls.map(async (toolCall: any) => {
                                const name = toolCall.function.name;
                                const args = JSON.parse(toolCall.function.arguments);
                                const handler = (TOOL_HANDLERS as any)[name];

                                // Track tool usage
                                if (!toolsCalled.includes(name)) {
                                    toolsCalled.push(name);
                                }

                                // Send tool call event for debugging
                                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                                    event: 'tool_call',
                                    name,
                                    args: Object.keys(args)
                                })}\n\n`));

                                if (handler) {
                                    try {
                                        const result = await handler(args, context);
                                        const resultStr = typeof result === 'string' ? result : JSON.stringify(result);
                                        // Security: Sanitize tool output
                                        const sanitizedResult = SecurityService.sanitizeContent(resultStr);

                                        return {
                                            role: 'tool',
                                            name: name,
                                            tool_call_id: toolCall.id,
                                            content: sanitizedResult
                                        } as AgentMessage;
                                    } catch (e: any) {
                                        // Security: Sanitize error message
                                        const sanitizedError = SecurityService.sanitizeContent(e.message);
                                        return {
                                            role: 'tool',
                                            name: name,
                                            tool_call_id: toolCall.id,
                                            content: `Error executing tool ${name}: ${sanitizedError}`
                                        } as AgentMessage;
                                    }
                                } else {
                                    return {
                                        role: 'tool',
                                        name: name,
                                        tool_call_id: toolCall.id,
                                        content: `Tool ${name} not found.`
                                    } as AgentMessage;
                                }
                            });

                            const toolResults = await Promise.all(toolPromises);
                            chatHistory.push(...toolResults);
                            // Continue loop to give results back to LLM
                        } else {
                            // Final Answer - send tools_called summary if any tools were used
                            if (toolsCalled.length > 0) {
                                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                                    event: 'tools_summary',
                                    tools_called: toolsCalled
                                })}\n\n`));
                            }

                            const content = message.content || '';
                            // Stream the final answer in chunks for UX
                            const chunkSize = 80;
                            for (let i = 0; i < content.length; i += chunkSize) {
                                const part = content.slice(i, i + chunkSize);
                                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ event: 'message', answer: part })}\n\n`));
                            }
                            break; // End iterations
                        }
                    }

                    if (currentIteration >= maxIterations) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ event: 'message', answer: "I've reached my thinking limit for this request. Is there anything else I can help with?" })}\n\n`));
                    }

                    controller.close();
                } catch (error: any) {
                    // Security: Sanitize log
                    const sanitizedErrorMsg = SecurityService.sanitizeContent(error.message || String(error));
                    console.error('[AgentOrchestrator] Error:', sanitizedErrorMsg);

                    // Graceful Fallback
                    const locale = context.locale || 'en';
                    // Determine language prefix (e.g., 'zh' from 'zh-TW') or use direct match
                    let fallbackMsg = FALLBACK_MESSAGES[locale];
                    if (!fallbackMsg) {
                        if (locale.startsWith('zh')) fallbackMsg = FALLBACK_MESSAGES['zh'];
                        else if (locale.startsWith('ja')) fallbackMsg = FALLBACK_MESSAGES['ja'];
                        else fallbackMsg = FALLBACK_MESSAGES['en'];
                    }

                    // Append technical error for debugging if needed, or keep it clean for user
                    // Ideally, user just sees friendly message.
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ event: 'message', answer: `⚠️ ${fallbackMsg}` })}\n\n`));
                    controller.close();
                }
            }
        });
    }
}

/**
 * Fetch with exponential backoff retry logic.
 * Retries on 5xx status codes or network errors.
 */
async function fetchWithRetry(url: string, options: RequestInit, retries: number = 3, backoff: number = 1000): Promise<Response> {
    try {
        const response = await fetch(url, options);

        // Retry only on server errors (5xx)
        if (response.status >= 500 && retries > 0) {
            console.warn(`[fetchWithRetry] Request to ${url} failed with status ${response.status}. Retrying in ${backoff}ms... (${retries} retries left)`);
            await new Promise(resolve => setTimeout(resolve, backoff));
            return fetchWithRetry(url, options, retries - 1, backoff * 2);
        }

        return response;
    } catch (error: any) {
        // Retry on network errors
        if (retries > 0) {
            console.warn(`[fetchWithRetry] Network error: ${error.message}. Retrying in ${backoff}ms... (${retries} retries left)`);
            await new Promise(resolve => setTimeout(resolve, backoff));
            return fetchWithRetry(url, options, retries - 1, backoff * 2);
        }
        throw error;
    }
}

export const orchestrator = new AgentOrchestrator();
