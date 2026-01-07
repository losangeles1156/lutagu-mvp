import { NextRequest, NextResponse } from 'next/server';

// Dify API configuration
const DIFY_API_URL = process.env.DIFY_API_URL || 'https://api.dify.ai/v1';
const DIFY_API_KEY = process.env.DIFY_API_KEY || '';

interface IntentClassificationRequest {
    query: string;
    currentStationId: string;
    currentStationName: string;
    locale: string;
    context: {
        userPreferences: string[];
        recentQueries: string[];
    };
}

export async function POST(request: NextRequest) {
    try {
        const body: IntentClassificationRequest = await request.json();
        const { query, currentStationId, currentStationName, locale, context } = body;

        if (!query?.trim()) {
            return NextResponse.json(
                { error: 'Query is required' },
                { status: 400 }
            );
        }

        // Build the prompt for intent classification
        const classificationPrompt = buildClassificationPrompt(query, currentStationId, currentStationName, locale, context);

        // Call Dify API for intent classification
        const difyResponse = await fetch(`${DIFY_API_URL}/chat-messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${DIFY_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                inputs: {
                    query,
                    current_station_id: currentStationId,
                    current_station_name: currentStationName,
                    locale,
                    user_preferences: context.userPreferences,
                    recent_queries: context.recentQueries,
                },
                query,
                response_mode: 'streaming',
                user: `intent-classifier-${Date.now()}`,
            }),
        });

        if (!difyResponse.ok) {
            throw new Error(`Dify API error: ${difyResponse.status}`);
        }

        // Collect the full response for classification
        const reader = difyResponse.body?.getReader();
        const decoder = new TextDecoder();
        let accumulatedResponse = '';
        let conversationId = '';

        if (reader) {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data:')) {
                        const data = line.slice(5).trim();
                        if (data === '[DONE]') continue;

                        try {
                            const parsed = JSON.parse(data);
                            
                            if (parsed.conversation_id && !conversationId) {
                                conversationId = parsed.conversation_id;
                            }

                            if (parsed.event === 'agent_message' || parsed.event === 'message') {
                                accumulatedResponse += parsed.answer || '';
                            }
                        } catch {
                            // Ignore parse errors
                        }
                    }
                }
            }
        }

        // Parse the classification result
        const classificationResult = parseClassificationResult(accumulatedResponse, query);

        return NextResponse.json({
            ...classificationResult,
            conversationId,
        });

    } catch (error) {
        console.error('Intent classification error:', error);
        
        // Fallback to rule-based classification
        const fallbackResult = ruleBasedClassification(
            await request.json().catch(() => ({}))
        );
        
        return NextResponse.json(fallbackResult);
    }
}

function buildClassificationPrompt(
    query: string,
    stationId: string,
    stationName: string,
    locale: string,
    context: { userPreferences: string[]; recentQueries: string[] }
): string {
    const localeInstructions = locale.startsWith('zh') 
        ? 'Response in JSON format with Traditional Chinese labels.' 
        : locale === 'ja'
            ? '返信は JSON 形式で、日本語のラベルを使用してください。'
            : 'Response should be in JSON format with English labels.';

    const recentQueriesStr = context.recentQueries.join(', ') || 'none';
    const userPrefsStr = context.userPreferences.join(', ') || 'none';

    return `Analyze user intent for transit query.

User query: ${query}
Current station: ${stationName} (${stationId})
Language: ${locale}
User preferences: ${userPrefsStr}
Recent queries: ${recentQueriesStr}

Return JSON format:
${JSON.stringify({
    kind: 'route|timetable|fare|status|amenity|unknown',
    confidence: 0.5,
    suggestedStationId: 'optional',
    alternativeIntents: [{ kind: 'string', score: 0.5 }],
    needsMoreInfo: false,
    missingInfoPrompt: 'question if needed'
}, null, 2)}

Intent definitions:
- route: directions, transfers, how to get somewhere
- timetable: schedules, next train, departure times
- fare: ticket prices, costs, IC vs ticket
- status: delays, disruptions, service status
- amenity: facilities, lockers, elevators, accessibility
- unknown: cannot determine

${localeInstructions}`;
}

function parseClassificationResult(response: string, query: string): {
    kind: string;
    confidence: number;
    suggestedStationId?: string;
    alternativeIntents?: Array<{ kind: string; score: number }>;
    needsMoreInfo?: boolean;
    missingInfoPrompt?: string;
} {
    // Try to parse as JSON
    try {
        // Extract JSON from response if it contains extra text
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                kind: parsed.kind || 'unknown',
                confidence: parsed.confidence || 0.5,
                suggestedStationId: parsed.suggestedStationId,
                alternativeIntents: parsed.alternativeIntents,
                needsMoreInfo: parsed.needsMoreInfo || false,
                missingInfoPrompt: parsed.missingInfoPrompt,
            };
        }
    } catch {
        // Ignore parse errors
    }

    // Fallback to keyword-based classification
    return ruleBasedClassification({ query });
}

function ruleBasedClassification(data: { query: string }): {
    kind: string;
    confidence: number;
    needsMoreInfo: boolean;
} {
    const query = (data.query || '').toLowerCase();

    // Define keyword patterns for each intent
    const patterns: Record<string, string[]> = {
        route: ['route', 'transfer', 'how to get', '怎么去', '如何去', '轉乘', '乘換', '前往', 'go to', '目的地', 'airport', '機場'],
        timetable: ['timetable', 'schedule', '時刻表', '下一班', '時間', 'when', 'departure', 'arrival', '終電', '始發'],
        fare: ['fare', 'ticket', 'price', '票價', '費用', '多少钱', '票价', '运费', '料金', 'IC'],
        status: ['status', 'delay', '延誤', '誤點', '運行', '取消', 'disruption', 'delay', '運休'],
        amenity: ['locker', 'elevator', 'toilet', '廁所', '電梯', '置物櫃', 'wheelchair', 'stroller', '無障礙', '嬰兒車']
    };

    // Calculate scores for each intent
    const scores: Record<string, number> = {};
    let totalScore = 0;
    
    for (const [intent, keywords] of Object.entries(patterns)) {
        const score = keywords.reduce((s, keyword) => s + (query.includes(keyword) ? 1 : 0), 0);
        scores[intent] = score;
        totalScore += score;
    }

    // Find the best match
    let bestIntent = 'unknown';
    let bestScore = 0;

    for (const [intent, score] of Object.entries(scores)) {
        if (score > bestScore) {
            bestScore = score;
            bestIntent = intent;
        }
    }

    // Calculate confidence
    const confidence = totalScore > 0 
        ? Math.min(0.95, 0.5 + (bestScore / totalScore) * 0.45)
        : 0.3;

    return {
        kind: bestIntent,
        confidence,
        needsMoreInfo: confidence < 0.6,
    };
}
