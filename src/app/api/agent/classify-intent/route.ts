
import { NextRequest, NextResponse } from 'next/server';
import { classifyQuestion, SupportedLocale } from '@/lib/l4/assistantEngine';

export const maxDuration = 30;

/**
 * Intent Classification API
 * 
 * Uses AssistantEngine logic to classify user intent for L4 features.
 */
export async function POST(req: NextRequest) {
    try {
        const { query, locale } = await req.json();

        if (!query) {
            return NextResponse.json({ error: 'No query provided' }, { status: 400 });
        }

        const result = classifyQuestion(query, (locale || 'zh-TW') as SupportedLocale);

        // Return in format expected by useIntentClassifier
        return NextResponse.json({
            kind: result.kind,
            confidence: 1.0, // classifyQuestion is regex-based, so 1.0 if match
            suggestedStationId: result.toStationId,
        });

    } catch (error: any) {
        console.error('[Intent API] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
