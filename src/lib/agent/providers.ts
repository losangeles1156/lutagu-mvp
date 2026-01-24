/**
 * L4/L5 Agent Model Providers
 * 定義主要與備援模型實例，並提供 Fallback 機制
 */

import { google } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { streamText, LanguageModel, ModelMessage, ToolSet } from 'ai';

// =============================================================================
// Provider Instances
// =============================================================================

// Zeabur AI Hub (for gemini-2.5-flash-lite, replacing rate-limited Mistral)
const zeabur = createOpenAI({
    baseURL: 'https://hnd1.aihub.zeabur.ai/v1', // Standard OpenAI-compatible endpoint
    apiKey: process.env.ZEABUR_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
});

// DeepSeek (via Zeabur or Direct)
const deepseek = createOpenAI({
    baseURL: 'https://hnd1.aihub.zeabur.ai/v1',
    apiKey: process.env.DEEPSEEK_API_KEY || process.env.ZEABUR_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
});

// MiniMax (Fallback for Brain)
const minimax = createOpenAI({
    baseURL: 'https://api.minimax.io/v1', // International
    apiKey: process.env.MINIMAX_API_KEY
});

// =============================================================================
// Model Instances (Trinity Architecture)
// =============================================================================

// 1. Gatekeeper / Router: Gemini 2.5 Flash Lite
export const geminiFlashLite = zeabur('gemini-2.5-flash-lite');
export const mistralSmall = geminiFlashLite; // Legacy alias

// 2. Brain / Logic: Gemini 1.5 Flash (Primary), MiniMax M2.1 (Backup)
export const geminiBrain = zeabur('gemini-1.5-flash');
export const minimaxBrain = minimax('MiniMax-M2.1');

// 3. Synthesizer / Chat: DeepSeek V3
export const deepseekChat = deepseek('deepseek-v3');
export const geminiFlashFull = zeabur('gemini-2.5-flash'); // Fallback

// =============================================================================
// Model Roles Definition
// =============================================================================
export const AGENT_ROLES = {
    gatekeeper: geminiFlashLite,      // High Speed (Router)
    brain: geminiBrain,               // High IQ (Logic)
    synthesizer: deepseekChat,        // Creative/Long Output (Chat)
    fallback: minimaxBrain            // Reliable Backup
} as const;

// Legacy export for backward compatibility
export const AGENT_MODELS = {
    primary: geminiBrain,
    backup: minimaxBrain,
    reasoner: geminiBrain
} as const;

// =============================================================================
// Fallback Execution
// =============================================================================

export interface StreamWithFallbackOptions<TOOLS extends ToolSet> {
    system: string;
    messages: ModelMessage[];
    tools?: TOOLS;
    maxSteps?: number;
    model?: LanguageModel; // Allow overriding model
    onFinish?: (result: {
        text: string;
        toolCalls?: Array<{ toolName: string; args: unknown }>;
        toolResults?: unknown[];
        finishReason: string;
        usage: { promptTokens: number; completionTokens: number };
    }) => void;
    onFallback?: (error: Error, fallbackModel: string) => void;
}

/**
 * Executes streamText with automatic fallback on failure.
 */
export function streamWithFallback<TOOLS extends ToolSet>(
    options: StreamWithFallbackOptions<TOOLS>
) {
    const { system, messages, tools, maxSteps = 5, model, onFinish, onFallback } = options;

    // Helper to count steps and determine when to stop
    let stepCount = 0;
    const stopWhen = () => {
        stepCount++;
        return stepCount >= maxSteps;
    };

    try {
        // Try primary model (or specified model) first
        const result = streamText({
            model: model || AGENT_MODELS.primary,
            system,
            messages,
            tools,
            stopWhen,
            onFinish: onFinish as Parameters<typeof streamText>[0]['onFinish']
        });
        return result;
    } catch (primaryError: unknown) {
        const error = primaryError instanceof Error ? primaryError : new Error(String(primaryError));
        console.warn('[Providers] Primary model failed, attempting fallback:', error.message);

        // Notify caller about fallback
        onFallback?.(error, 'mistral-large-2411');

        // Reset step count for fallback
        stepCount = 0;

        try {
            // Fallback to backup model
            const fallbackResult = streamText({
                model: AGENT_MODELS.backup,
                system,
                messages,
                tools,
                stopWhen,
                onFinish: onFinish as Parameters<typeof streamText>[0]['onFinish']
            });
            return fallbackResult;
        } catch (backupError: unknown) {
            const bError = backupError instanceof Error ? backupError : new Error(String(backupError));
            console.error('[Providers] Backup model also failed:', bError.message);
            // Re-throw with combined context
            throw new Error(`All models failed. Primary: ${error.message}. Backup: ${bError.message}`);
        }
    }
}

// =============================================================================
// Model Health Check (Optional utility)
// =============================================================================

export async function checkModelHealth(model: LanguageModel): Promise<boolean> {
    try {
        // Simple ping with minimal tokens
        const result = streamText({
            model,
            system: 'Reply with OK.',
            messages: [{ role: 'user', content: 'ping' }]
        });
        await result.text;
        return true;
    } catch {
        return false;
    }
}
