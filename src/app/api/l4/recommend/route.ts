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
    locale: z.enum(['zh-TW', 'ja', 'en']).optional().default('zh-TW'),
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

        const { stationId, lineIds, userPreferences, locale, waitMinutes, destinationValue } = parseResult.data;

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

        // 4. LLM Fallback (If no high-value cards found)
        const hasHighValue = cards.some(c => c.priority >= 50);

        if (!hasHighValue) {
            try {
                const systemPrompt = locale === 'zh-TW'
                    ? '你是東京交通助手 Lutagu。用戶目前在車站遇到困難，且我們的規則庫沒有匹配到特定建議。請根據用戶情境（行李、天氣、同行者）提供一個簡短、溫暖且實用的通用建議 (50字以內)。'
                    : 'You are Lutagu, a Tokyo transit assistant. The user is at a station and our rule engine found no matches. Provide short, warm, practical general advice based on their context (max 30 words).';

                const userPrompt = `Station: ${stationId}\nPreferences: ${JSON.stringify(userPreferences)}\nContext: No specific rules matched.`;

                const aiText = await generateLLMResponse({ systemPrompt, userPrompt });

                if (aiText) {
                    cards.push({
                        id: 'ai-fallback-advice',
                        type: 'ai_suggestion',
                        priority: 45,
                        icon: '🤖',
                        title: locale === 'zh-TW' ? 'Lutagu 助手建議' : 'AI Suggestion',
                        description: aiText,
                        _debug_reason: 'Generated by Mistral (10% Layer)'
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
