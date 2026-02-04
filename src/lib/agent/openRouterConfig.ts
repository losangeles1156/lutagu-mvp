/**
 * OpenRouter Configuration
 * 
 * Central configuration for OpenRouter API integration.
 * Single-model configuration: DeepSeek V3.2
 */

import { createOpenAI } from '@ai-sdk/openai';
// OpenRouter provider using dedicated SDK for better compatibility
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

export const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
    headers: {
        'HTTP-Referer': 'https://lutagu.app',
        'X-Title': 'LUTAGU Agent',
    },
});

// Zeabur AI Hubs provider (DeepSeek V3.2)
// Uses the Tokyo endpoint (hnd1) for valid latency
export const zeabur = createOpenAI({
    baseURL: 'https://hnd1.aihub.zeabur.ai/v1',
    apiKey: process.env.ZEABUR_API_KEY,
});

// Dedicated Zeabur Model Config
export const ZEABUR_MODEL_CONFIG = {
    model: 'deepseek-v3.2', // Specific model identifier for Zeabur
} as const;

// Model configuration with fallback chain
export const MODEL_CONFIG = {
    primary: 'deepseek/deepseek-v3.2',
} as const;

export const FALLBACK_CHAIN = [
    MODEL_CONFIG.primary,
] as const;

/**
 * Get a model instance from OpenRouter
 */
export function getModel(modelId: string, simulateFailure: boolean = false) {
    if (simulateFailure && modelId === MODEL_CONFIG.primary) {
        throw new Error('Simulated primary model failure (header triggered)');
    }
    return openrouter(modelId);
}

/**
 * Get the primary model instance
 */
export function getPrimaryModel() {
    return getModel(MODEL_CONFIG.primary);
}
