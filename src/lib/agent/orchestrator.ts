import { AGENT_TOOLS, TOOL_HANDLERS } from './toolDefinitions';

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

export class AgentOrchestrator {
    private mistralKey: string;
    private geminiKey: string;
    private model: string;
    private maxIterations = 5;

    constructor() {
        this.mistralKey = process.env.MISTRAL_API_KEY || '';
        this.geminiKey = process.env.GEMINI_API_KEY || '';
        this.model = process.env.AI_SLM_MODEL || 'mistral-small-latest';
    }

    async run(messages: AgentMessage[], context: OrchestratorContext): Promise<ReadableStream> {
        const encoder = new TextEncoder();
        const model = this.model;
        const isGemini = model.toLowerCase().includes('gemini');
        const apiKey = isGemini ? this.geminiKey : this.mistralKey;
        const maxIterations = this.maxIterations;

        let currentIteration = 0;
        let chatHistory = [...messages];
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

                        const response = await fetch(apiUrl, {
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
                        const message = data.choices[0].message;

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
                                        return {
                                            role: 'tool',
                                            name: name,
                                            tool_call_id: toolCall.id,
                                            content: typeof result === 'string' ? result : JSON.stringify(result)
                                        } as AgentMessage;
                                    } catch (e: any) {
                                        return {
                                            role: 'tool',
                                            name: name,
                                            tool_call_id: toolCall.id,
                                            content: `Error executing tool ${name}: ${e.message}`
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
                    console.error('[AgentOrchestrator] Error:', error);
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ event: 'message', answer: `⚠️ Error: ${error.message}` })}\n\n`));
                    controller.close();
                }
            }
        });
    }
}

export const orchestrator = new AgentOrchestrator();
