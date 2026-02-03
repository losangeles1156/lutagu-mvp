import { NextResponse } from 'next/server';
import { getAgentHealthSnapshot } from '@/lib/agent/healthState';

export const runtime = 'nodejs';

export async function GET() {
    const snapshot = getAgentHealthSnapshot();
    const missingKeys: string[] = [];
    if (!process.env.OPENROUTER_API_KEY) missingKeys.push('OPENROUTER_API_KEY');

    return NextResponse.json({
        ok: missingKeys.length === 0,
        missingKeys,
        fallbackMode: (process.env.AGENT_V2_FALLBACK || 'chat').toLowerCase(),
        timeoutMs: Number(process.env.AGENT_V2_TIMEOUT_MS || 25000),
        snapshot
    });
}
