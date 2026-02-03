import { NextRequest, NextResponse } from 'next/server';
import { streamText } from 'ai';
import { createAgentTools, ToolContext } from '@/lib/agent/tools/AgentTools';
import { createAgentSystemPrompt, TOKYO_SYSTEM_PROMPT_CONFIG } from '@/lib/agent/prompts/SystemPrompt';
import { randomUUID } from 'crypto';
import { getModel, MODEL_CONFIG, zeabur, ZEABUR_MODEL_CONFIG } from '@/lib/agent/openRouterConfig';

export const runtime = 'nodejs';

function getE2EKey() {
    return process.env.AGENT_E2E_KEY || '';
}

function resolveE2EProvider() {
    const requested = (process.env.E2E_PROVIDER || 'openrouter').toLowerCase();
    const hasOpenRouterKey = Boolean(process.env.OPENROUTER_API_KEY);
    const hasZeaburKey = Boolean(process.env.ZEABUR_API_KEY);

    if (requested === 'openrouter' && !hasOpenRouterKey && hasZeaburKey) {
        return { provider: 'zeabur', hasOpenRouterKey, hasZeaburKey };
    }
    if (requested === 'zeabur' && !hasZeaburKey && hasOpenRouterKey) {
        return { provider: 'openrouter', hasOpenRouterKey, hasZeaburKey };
    }
    return { provider: requested, hasOpenRouterKey, hasZeaburKey };
}

export async function POST(req: NextRequest) {
    const key = getE2EKey();
    const provided = req.headers.get('x-agent-e2e-key') || '';
    if (key && provided !== key) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rawBody = await req.text();
    let body: Record<string, unknown> = {};
    try {
        body = rawBody ? JSON.parse(rawBody) : {};
    } catch {
        body = {};
    }

    const locale = typeof body?.locale === 'string' ? body.locale : 'zh-TW';
    const userId = typeof body?.userId === 'string' ? body.userId : `anon-${randomUUID()}`;
    const currentStation = (body.nodeId || body.currentStation || body.current_station) as string | undefined;
    const text = typeof body?.text === 'string' ? body.text : '';

    const extractText = (value: unknown): string => {
        if (!value) return '';
        if (typeof value === 'string') return value;
        if (Array.isArray(value)) {
            return value
                .map((part) => {
                    if (typeof part === 'string') return part;
                    if (typeof part?.text === 'string') return part.text;
                    if (typeof part?.content === 'string') return part.content;
                    return '';
                })
                .join('')
                .trim();
        }
        if (typeof value === 'object' && value !== null) {
            const obj = value as Record<string, unknown>;
            if (typeof obj.text === 'string') return obj.text;
            if (typeof obj.content === 'string') return obj.content;
        }
        return '';
    };

    const messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [];
    if (Array.isArray(body.messages)) {
        for (const m of body.messages) {
            if (!m || typeof m !== 'object') continue;
            const msg = m as Record<string, unknown>;
            const role = msg?.role === 'assistant' ? 'assistant' : 'user';
            const content = extractText(msg?.content ?? msg?.parts ?? msg?.text ?? msg);
            if (content) messages.push({ role, content });
        }
    }
    if (text && !messages.some(m => m.role === 'user' && m.content === text)) {
        messages.push({ role: 'user', content: text });
    }

    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.role === 'user') {
        const query = lastMsg.content.toLowerCase();
        let reinforcement = '';
        if (query.includes('route') || query.includes('go to') || query.includes('從') || query.includes('到')) {
            reinforcement = `\n\n[INSTRUCTION]: You MUST call the findRoute tool to get real route data.`;
        } else if (query.includes('status') || query.includes('delay') || query.includes('延遲') || query.includes('運行')) {
            reinforcement = `\n\n[INSTRUCTION]: You MUST call the getTransitStatus tool to get real-time status.`;
        } else if (query.includes('locker') || query.includes('toilet') || query.includes('elevator') || query.includes('寄物') || query.includes('電梯') || query.includes('トイレ')) {
            reinforcement = `\n\n[INSTRUCTION]: You MUST call the getStationInfo tool.`;
        } else if (query.includes('nearby') || query.includes('附近') || query.includes('周辺') || query.includes('spot') || query.includes('景點')) {
            reinforcement = `\n\n[INSTRUCTION]: You MUST call the searchPOI tool.`;
        } else if (query.includes('weather') || query.includes('天氣') || query.includes('天気')) {
            reinforcement = `\n\n[INSTRUCTION]: You MUST call the getWeather tool.`;
        }

        if (reinforcement && !lastMsg.content.includes('[INSTRUCTION]')) {
            lastMsg.content += reinforcement;
        }
    }

    const toolContext: ToolContext = {
        locale,
        userId,
        currentStation,
        currentLocation: body.userLocation as { lat: number; lng: number } | undefined,
    };

    const tools = createAgentTools(toolContext);
    const systemPrompt = createAgentSystemPrompt({
        ...TOKYO_SYSTEM_PROMPT_CONFIG,
        locale,
    });

    const start = Date.now();
    const providerInfo = resolveE2EProvider();
    try {
        let toolNames: string[] = [];
        const result = await streamText({
            model: providerInfo.provider === 'zeabur'
                ? zeabur(ZEABUR_MODEL_CONFIG.model)
                : getModel(MODEL_CONFIG.primary),
            system: systemPrompt,
            messages,
            tools,
            maxSteps: 5,
            toolChoice: 'auto',
            onFinish: ({ toolCalls }: { toolCalls?: Array<{ toolName: string }> }) => {
                toolNames = toolCalls?.map(tc => tc.toolName) || [];
            },
        } as any);

        const textResult = await result.text;
        return NextResponse.json({
            ok: true,
            requestId: randomUUID(),
            backend: 'e2e',
            toolCalls: toolNames,
            latencyMs: Date.now() - start,
            text: textResult || '',
            provider: providerInfo.provider
        });
    } catch (error: any) {
        return NextResponse.json({
            ok: false,
            requestId: randomUUID(),
            backend: 'e2e',
            toolCalls: [],
            latencyMs: Date.now() - start,
            error: error?.message || 'E2E execution failed',
            errorName: error?.name || null,
            provider: providerInfo.provider,
            hasOpenRouterKey: providerInfo.hasOpenRouterKey,
            hasZeaburKey: providerInfo.hasZeaburKey
        }, { status: 500 });
    }
}
