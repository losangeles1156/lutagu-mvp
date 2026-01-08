
import { NextRequest, NextResponse } from 'next/server';
import { hybridEngine } from '@/lib/l4/HybridEngine';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { text, locale, context } = body;

        if (!text) {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }

        const result = await hybridEngine.processRequest({
            text,
            locale: locale || 'zh-TW',
            context: context || {}
        });

        return NextResponse.json({
            success: true,
            result: result || { source: 'llm', confidence: 0 }
        });
    } catch (error) {
        console.error('[API Hybrid] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
