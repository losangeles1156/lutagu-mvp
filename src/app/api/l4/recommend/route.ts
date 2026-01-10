import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { MatchedStrategyCard, EvaluationContext } from '@/types/lutagu_l4';
import { decisionEngine } from '@/lib/l4/decisionEngine';
import { hardCalculationEngine } from '@/lib/l4/hardCalculationEngine';
import { generateLLMResponse } from '@/lib/ai/llmClient';

// Zod Schema for Request Validation (matches UserPreferences in lutagu_l4.ts)
const UserPreferencesSchema = z.object({
    accessibility: z.object({
        wheelchair: z.boolean(),
        stroller: z.boolean(),
        visual_impairment: z.boolean(),
        elderly: z.boolean()
    }).partial().default({}),
    luggage: z.object({
        large_luggage: z.boolean(),
        multiple_bags: z.boolean()
    }).partial().default({}),
    travel_style: z.object({
        rushing: z.boolean(),
        budget: z.boolean(),
        comfort: z.boolean(),
        avoid_crowd: z.boolean(),
        avoid_rain: z.boolean()
    }).partial().default({}),
    companions: z.object({
        with_children: z.boolean(),
        family_trip: z.boolean()
    }).partial().default({})
}).partial().default({});

const RecommendRequestSchema = z.object({
    stationId: z.string().min(1, 'stationId is required'),
    lineIds: z.array(z.string()).optional(),
    userPreferences: UserPreferencesSchema,
    locale: z.enum(['zh-TW', 'zh', 'ja', 'en']).optional().default('zh-TW'),
    waitMinutes: z.number().optional(),
    destinationValue: z.number().min(1).max(10).optional()
});

// Custom Error Classes
class ValidationError extends Error {
    constructor(message: string, public details?: z.ZodIssue[]) {
        super(message);
        this.name = 'ValidationError';
    }
}

export async function POST(req: NextRequest) {
    try {
        // Parse JSON body
        let rawBody: unknown;
        try {
            rawBody = await req.json();
        } catch {
            throw new ValidationError('Invalid JSON body');
        }

        // Validate request with Zod
        const parseResult = RecommendRequestSchema.safeParse(rawBody);
        if (!parseResult.success) {
            throw new ValidationError('Invalid request parameters', parseResult.error.issues);
        }

        const { stationId, lineIds, userPreferences, locale: rawLocale, waitMinutes, destinationValue } = parseResult.data;

        // Map 'zh' to 'zh-TW' for compatibility
        const locale: 'zh-TW' | 'ja' | 'en' = rawLocale === 'zh' ? 'zh-TW' : rawLocale;

        // Normalize userPreferences with defaults to satisfy UserPreferences type
        const normalizedPreferences = {
            accessibility: {
                wheelchair: false,
                stroller: false,
                visual_impairment: false,
                elderly: false,
                ...userPreferences?.accessibility
            },
            luggage: {
                large_luggage: false,
                multiple_bags: false,
                ...userPreferences?.luggage
            },
            travel_style: {
                rushing: false,
                budget: false,
                comfort: false,
                avoid_crowd: false,
                avoid_rain: false,
                ...userPreferences?.travel_style
            },
            companions: {
                with_children: false,
                family_trip: false,
                ...userPreferences?.companions
            }
        };

        const context: EvaluationContext = {
            stationId,
            lineIds: lineIds || [],
            userPreferences: normalizedPreferences,
            currentDate: new Date(),
            locale,
            waitMinutes,
            destinationValue
        };

        console.log('[L4 API] Evaluating for:', context.stationId);

        // 1. Soft Calculation (Rule-based / SLM)
        const softCards = decisionEngine.evaluate(context);

        // 2. Hard Calculation (Real-time / ODPT)
        let hardCards: MatchedStrategyCard[] = [];
        try {
            hardCards = await hardCalculationEngine.evaluate(context);
        } catch (e) {
            console.error('[L4 API] Hard calculation failed:', e);
        }

        // 3. Merge & Sort
        let cards = [...hardCards, ...softCards].sort((a, b) => b.priority - a.priority);

        // [New] AI Contextual Reranker (P0 Feature)
        // Convert preferences to tags for the AI
        const userNeeds: string[] = [];
        if (userPreferences?.accessibility?.wheelchair) userNeeds.push('wheelchair user');
        if (userPreferences?.accessibility?.stroller) userNeeds.push('with stroller');
        if (userPreferences?.luggage?.large_luggage) userNeeds.push('large luggage');
        if (userPreferences?.luggage?.multiple_bags) userNeeds.push('multiple bags');
        if (userPreferences?.companions?.with_children) userNeeds.push('with children');
        if (userPreferences?.travel_style?.rushing) userNeeds.push('rushing/hurry');

        // Only rerank if we have cards AND user has specific needs
        if (cards.length > 0 && userNeeds.length > 0) {
            console.log('[L4 API] Reranking cards for needs:', userNeeds);
            try {
                // We use dynamic import or ensure clean import to avoid circular deps if any
                // But imports are static here.
                const { rerankL4Cards } = await import('@/lib/ai/llmService');
                cards = await rerankL4Cards(cards, { stationId, userNeeds }, locale);
            } catch (e) {
                console.error('[L4 API] Rerank failed:', e);
            }
        }

        // 4. LLM Fallback (If no high-value cards found)
        const hasHighValue = cards.some(c => c.priority >= 50);

        if (!hasHighValue) {
            try {
                const { generateL4Advice } = await import('@/lib/ai/llmService');
                const aiText = await generateL4Advice({
                    stationId,
                    userNeeds
                }, locale);

                if (aiText) {
                    cards.push({
                        id: 'ai-fallback-advice',
                        type: 'ai_suggestion',
                        priority: 45,
                        icon: '🤖',
                        title: locale === 'zh-TW' ? 'Lutagu 助手建議' : 'AI Suggestion',
                        description: aiText,
                        _debug_reason: 'Generated by MiniMax-M2.1'
                    });
                }
            } catch (e) {
                console.error('[L4 API] LLM generation failed:', e);
            }
        }

        // 5. Final Fallback (Static)
        if (cards.length === 0) {
            cards.push({
                id: 'fallback-default',
                type: 'info',
                icon: '🧭',
                title: locale === 'zh-TW' ? '自由探索' : 'Explore',
                description: locale === 'zh-TW'
                    ? '目前沒有針對此場景的特別建議，請探索周邊或輸入具體目的地。'
                    : 'No specific advice for this context. Please explore nearby.',
                priority: 0,
                _debug_reason: undefined
            });
        }

        return NextResponse.json({
            cards: cards.map(c => ({ ...c }))
        });

    } catch (error) {
        // Distinguish 400 (Client Error) vs 500 (Server Error)
        if (error instanceof ValidationError) {
            console.warn('[L4 API] Validation Error:', error.message, error.details);
            return NextResponse.json(
                {
                    error: 'Bad Request',
                    message: error.message,
                    details: error.details
                },
                { status: 400 }
            );
        }

        console.error('[L4 API] Server Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
