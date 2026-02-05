import { createHash } from 'crypto';
import { getCached } from '@/lib/cache/redisCacheService';
import { generateLLMResponse } from '@/lib/ai/llmClient';
import type { SemanticRelayResult } from './types';

export async function buildSemanticRelay(text: string, locale: string): Promise<SemanticRelayResult> {
    const sourceText = text || '';
    const isZh = locale.startsWith('zh');

    if (!isZh || !sourceText.trim()) {
        return { sourceText, relayLanguage: 'none' };
    }

    const hash = createHash('sha256').update(sourceText).digest('hex');
    const cacheKey = `relay:zh-en:${hash}`;

    const relayText = await getCached(
        cacheKey,
        async () => {
            const systemPrompt = `You are a semantic relay for transit intent understanding.\nSummarize the user's intent into concise English for retrieval.\nRules:\n- Keep names, station IDs, and proper nouns as-is.\n- Focus on intent, constraints, urgency, and decision context.\n- Output only one short sentence.`;
            const userPrompt = `User: ${sourceText}`;
            const result = await generateLLMResponse({
                systemPrompt,
                userPrompt,
                taskType: 'classification',
                temperature: 0.2,
                maxTokens: 120,
            });
            return (result || '').trim();
        },
        60 * 60 * 24 * 3
    );

    return {
        sourceText,
        relayText: relayText || undefined,
        relayLanguage: relayText ? 'en' : 'none',
        cacheKey,
    };
}
