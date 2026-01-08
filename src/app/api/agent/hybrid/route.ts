
import { NextRequest, NextResponse } from 'next/server';
import { hybridEngine } from '@/lib/l4/HybridEngine';

export const runtime = 'nodejs'; // Valid for using ioredis/fs

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { text, locale, context } = body;

        const result = await hybridEngine.processRequest({
            text,
            locale,
            context
        });

        // hybridEngine returns null if it decides to pass to LLM
        return NextResponse.json(result || { passToLLM: true });
    } catch (err: any) {
        console.error('[API/Hybrid] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
