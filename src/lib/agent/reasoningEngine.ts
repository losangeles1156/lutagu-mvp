/**
 * ReasoningEngine - Hybrid Agent Orchestrator
 *
 * Implements the 4-Stage Pipeline:
 * 1. Gatekeeper (Mistral Small): Intent Classification & Simple Query Handling
 * 2. Brain (MiniMax M2.1): Complex Reasoning & Tool Selection
 * 3. Nerves (L4 Tools): Execution (handled in route.ts, orchestrated here conceptually)
 * 4. Voice (Gemini Flash): Final Synthesis (handled in route.ts)
 */

import { generateObject, generateText, tool, ToolSet } from 'ai';
import { z } from 'zod';
import { AgentRuntimeContext } from './context';
import { AGENT_ROLES } from './providers';
import { tools } from './tools';

// =============================================================================
// Types
// =============================================================================

export type ReasoningPhase = 'perception' | 'cognition' | 'expression' | 'complete';

export type IntentCategory =
    | 'navigation'      // Route planning
    | 'facility'        // Facility search
    | 'accessibility'   // Accessibility needs
    | 'delay'           // Delay info
    | 'weather'         // Weather info
    | 'safety'          // Emergency/Safety
    | 'recommendation'  // Recommendations
    | 'general';        // General chat

// Gatekeeper Output Schema
const PerceptionSchema = z.object({
    intent: z.enum([
        'navigation', 'facility', 'accessibility', 'delay', 'weather', 'safety', 'recommendation', 'general'
    ]),
    confidence: z.number(),
    isComplex: z.boolean().describe('True if the query requires tool usage or complex reasoning. False for simple greetings or general chitchat.'),
    directResponse: z.string().optional().describe('If isComplex is false, provide the direct response here.')
});

export type PerceptionResult = z.infer<typeof PerceptionSchema>;

export interface CognitionResult {
    toolsToCall?: Array<{
        toolName: string;
        args: unknown;
    }>;
    chainOfThought: string;
    decision: 'call_tools' | 'skip_to_voice';
}

export interface ReasoningState {
    phase: ReasoningPhase;
    perception?: PerceptionResult;
    cognition?: CognitionResult;
    startTime: number;
}

// =============================================================================
// ReasoningEngine Class
// =============================================================================

export class ReasoningEngine {
    private state: ReasoningState;
    private context: AgentRuntimeContext;

    constructor(context: AgentRuntimeContext) {
        this.context = context;
        this.state = {
            phase: 'perception',
            startTime: Date.now()
        };
    }

    /**
     * Phase 1: Gatekeeper (Mistral Small)
     * Analyzes intent and filters simple queries.
     */
    async perceive(userMessage: string, history: any[] = []): Promise<PerceptionResult> {
        console.log('[ReasoningEngine] Phase 1: Knowledge Perception (Gatekeeper)');
        const startTime = Date.now();

        try {
            // Construct context from last few messages to help detect follow-ups
            const lastAssistantMsg = history.filter(m => m.role === 'assistant').pop()?.content || 'None';
            const contextPrompt = `
Previous Agent Message: "${typeof lastAssistantMsg === 'string' ? lastAssistantMsg.substring(0, 100) : 'Complex Content'}"
Current User Message: "${userMessage}"
`;

            const { object: result } = await generateObject({
                model: AGENT_ROLES.gatekeeper,
                schema: PerceptionSchema,
                system: `You are the Gatekeeper of the Lutagu Tokyo Station Guide system.
Your job is to classify the user's intent and determine if the query is complex enough to require the "Brain" (MiniMax) and Tools.

Rules:
1. "Hi", "Hello" -> intent: 'general', isComplex: false.
2. Specific questions ("How to get to...", "Is there a delay?") -> intent: specific, isComplex: true.
3. FOLLOW-UPS: If the user says "Yes", "Please", "Do it" in response to a previous agent suggestion (e.g., "Should I check the weather?"), MARK AS COMPLEX (isComplex: true).
4. Safety/Emergency -> intent: 'safety', isComplex: true.

Output JSON only.`,
                prompt: contextPrompt
            });

            this.state.phase = 'cognition';
            this.state.perception = result;

            console.log(`[Gatekeeper] Intent: ${result.intent}, Complex: ${result.isComplex}, Latency: ${Date.now() - startTime}ms`);
            return result;
        } catch (error) {
            console.error('[Gatekeeper] Failed, falling back to rule-based:', error);
            // Fallback object
            return {
                intent: 'general',
                confidence: 0.5,
                isComplex: true, // Fail safe to brain
            };
        }
    }

    /**
     * Phase 2: Brain (MiniMax M2.1)
     * Performs Interleaved Thinking and decides Tool Calls.
     * 
     * Strategy:
     * - We feed the brain the tools definitions but NOT the full knowledge base.
     * - We want it to use its "Thinking" capability to plan the tool usage.
     */
    async cogitate(userMessage: string, history: any[] = []): Promise<CognitionResult> {
        console.log('[ReasoningEngine] Phase 2: Cognition (Brain)');
        const startTime = Date.now();

        // If Gatekeeper said it's simple, skip Brain
        if (this.state.perception && !this.state.perception.isComplex) {
            console.log('[Brain] Skipped (Simple Query)');
            return {
                chainOfThought: 'Gatekeeper handled this request.',
                decision: 'skip_to_voice'
            };
        }

        try {
            const contextSummary = `
Current Context:
- User Profile: ${JSON.stringify(this.context.userProfile)}
- Location: ${this.context.nodeId}
- Time: ${new Date().toISOString()}
`;

            // Call MiniMax with Tools
            // Note: We use generateText to get the tool calls and thinking trace
            const result = await generateText({
                model: AGENT_ROLES.brain,
                tools: tools, // Pass available agent tools
                system: `You are the Brain of the system.
Your goal is to PLAN the solution for the user's request.
Use the available tools to gather necessary information.

CRITICAL:
- Think before you act. Analyze the user's needs multiple steps ahead.
- If the user has accessibility needs (wheelchair/stroller), ALWAYS check accessibility info.
- If the user asks for routes, consider TPI (Transfer Pain Index).
- If safety/emergency is mentioned, prioritize 'check_safety'.

Analyze the request and call the appropriate tools.`,
                messages: [
                    ...history,
                    { role: 'user', content: contextSummary + '\n\nUser Question: ' + userMessage }
                ]
            });

            // Extract tool calls
            const toolCalls = result.toolCalls;

            // MiniMax Native Format: Thought is wrapped in <think> tags within content
            const fullText = result.text || '';
            const thinkMatch = fullText.match(/<think>([\s\S]*?)<\/think>/);
            const chainOfThought = thinkMatch ? thinkMatch[1].trim() : fullText; // Fallback to full text if no tags
            const cleanContent = fullText.replace(/<think>[\s\S]*?<\/think>/, '').trim();

            this.state.cognition = {
                toolsToCall: toolCalls.map((tc: any) => ({ toolName: tc.toolName, args: tc.args })),
                chainOfThought: chainOfThought,
                decision: toolCalls.length > 0 ? 'call_tools' : 'skip_to_voice'
            };
            this.state.phase = 'expression';

            console.log(`[Brain] Thought: ${chainOfThought.substring(0, 50)}...`);
            console.log(`[Brain] Tool Calls: ${toolCalls.length} -> ${toolCalls.map(t => t.toolName).join(', ')}`);
            console.log(`[Brain] Latency: ${Date.now() - startTime}ms`);

            return this.state.cognition;

        } catch (error) {
            console.error('[Brain] Failed:', error);
            throw error;
        }
    }

    getState(): ReasoningState {
        return { ...this.state };
    }
}

export function createReasoningEngine(context: AgentRuntimeContext): ReasoningEngine {
    return new ReasoningEngine(context);
}
