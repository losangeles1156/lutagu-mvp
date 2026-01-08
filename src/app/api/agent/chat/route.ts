
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { orchestrator, AgentMessage } from '@/lib/agent/orchestrator';
import { resolveNodeInheritance } from '@/lib/nodes/inheritance';

type SupportedLocale = 'zh-TW' | 'zh' | 'en' | 'ja' | 'ar';

function normalizeLocale(input?: string): SupportedLocale {
    const raw = String(input || '').trim().toLowerCase();
    if (raw.startsWith('ja')) return 'ja';
    if (raw.startsWith('en')) return 'en';
    if (raw.startsWith('ar')) return 'ar';
    if (raw.startsWith('zh-cn') || raw === 'zh') return 'zh';
    return 'zh-TW';
}

function pickLocaleText(input: any, locale: SupportedLocale) {
    if (!input) return '';
    if (typeof input === 'string') return input;
    if (typeof input !== 'object') return '';
    return String(input?.[locale] || input?.['zh-TW'] || input?.en || input?.ja || '')
        .trim();
}

/**
 * SSE Fallback for errors and offline mode
 */
function createOfflineStream(message: string, mode: 'offline' | 'error' = 'error') {
    const encoder = new TextEncoder();
    return new ReadableStream<Uint8Array>({
        start(controller) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ event: 'meta', mode })}

`));
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ event: 'message', answer: message })}

`));
            controller.close();
        }
    });
}

/**
 * Check if AI service is available
 */
function isAIServiceAvailable(): boolean {
    const hasMistral = Boolean(process.env.MISTRAL_API_KEY);
    const hasGemini = Boolean(process.env.GEMINI_API_KEY);
    const model = process.env.AI_SLM_MODEL;
    
    console.log('[Chat API] Checking AI availability:', { 
        hasMistral, 
        hasGemini, 
        model 
    });
    
    return hasMistral || hasGemini;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const clientMessages = Array.isArray(body?.messages) ? body.messages : [];
        const nodeId = typeof body?.nodeId === 'string' ? body.nodeId : '';
        const inputs = typeof body?.inputs === 'object' && body?.inputs ? body.inputs : {};

        const locale = normalizeLocale(inputs?.locale);
        const userProfile = typeof inputs?.user_profile === 'string' ? inputs.user_profile : 'general';
        const timestamp = Date.now();

        // Early check: If no AI service available, return offline mode immediately
        if (!isAIServiceAvailable()) {
            let offlineMessage = '🔌 Currently in offline mode (AI service unavailable). I can still provide basic station info.';
            if (locale === 'zh-TW') offlineMessage = '🔌 目前為離線模式（AI 服務未連線）。我仍可以提供基礎站點資訊。';
            else if (locale === 'zh') offlineMessage = '🔌 目前为离线模式（AI 服务未连线）。我仍可以提供基础站点信息。';
            else if (locale === 'ja') offlineMessage = '🔌 現在オフラインモードです。基本的な駅情報はお手伝いできます。';
            else if (locale === 'ar') offlineMessage = '🔌 حالياً في وضع عدم الاتصال (خدمة AI غير متوفرة). لا يزال بإمكاني تقديم معلومات المحطة الأساسية.';
            
            return new NextResponse(createOfflineStream(offlineMessage, 'offline'), {
                headers: { 'Content-Type': 'text/event-stream' }
            });
        }

        // 1. Resolve Node Identity
        let nodeName = 'Tokyo Station'; // Default
        let personaPrompt = '';

        if (nodeId) {
            const resolved = await resolveNodeInheritance({ nodeId, client: supabaseAdmin });
            const identityNode = resolved?.hub || resolved?.leaf || null;
            nodeName = pickLocaleText(identityNode?.name, locale) || nodeName;
            personaPrompt = typeof identityNode?.persona_prompt === 'string' ? identityNode.persona_prompt : '';
        }

        // 2. Build System Prompt (Dynamic & Concise)
        // [NEW] Inject L1 Custom Places
        const { getApprovedL1PlacesContext } = await import('@/lib/l1/queries');
        const l1Context = await getApprovedL1PlacesContext(nodeId, locale);

        const systemPrompt = `You are "Lutagu", a professional DIGITAL STATION STAFF at ${nodeName}.
Tone: Helpful, warm, and natural.
CRITICAL: You MUST answer the user in the language of "${locale}". 
Even if the user greets you in another language, your response MUST be in ${locale}.
Current Station: ${nodeName} (${nodeId || 'Ambient Mode'}).
User Profile: ${userProfile}.

GOALS:
1. Answer questions about station facilities, train status, and local tips using TOOLS. 
2. CRITICAL: For specific needs (wheelchair, lockers, crowd), you MUST call the relevant tool before answering. Do not guess.
3. If tool data is found, synthesize it into a helpful answer. If empty, suggest Google Maps.
4. RECOMMENDATIONS: If asked for food, coffee, or spots, prioritize the VERIFIED LOCAL SPOTS provided below.

STRICT TOOL RULES:
- "Timetable", "Schedule", "Next train", "時刻表", "末班車" -> Call 'get_timetable'.
- "Fare", "Ticket price", "多少錢", "票價" -> Call 'get_fare'.
- "Route", "How to get", "怎麼去", "轉乘" -> Call 'get_route'.
- "Wheelchair", "Elevator", "Baby Car" -> Call 'retrieve_station_knowledge' (query='accessibility') AND 'get_station_facilities' (category='elevator').
- "Locker", "Luggage" -> Call 'get_station_facilities' (category='locker') AND 'retrieve_station_knowledge' (query='luggage').
- "Crowded", "Busy", "Rush Hour", "People" -> Call 'get_station_crowd_context'.
- "Status", "Delay" -> Call 'get_train_status'.
- "Weather", "Rain" -> Call 'get_weather'.

CONSTRAINTS:
- Answer primarily in ${locale}.
- Do NOT say "Tokyo Subway Ticket" unless asked about fares.
- Do NOT give generic advice like "check the website" if you can check via tools.
- NEVER use ** symbols to bold text. Use natural language and emojis for emphasis.
- ${personaPrompt}${l1Context}`;

        // 3. Prepare Message History
        const messages: AgentMessage[] = [
            { role: 'system', content: systemPrompt },
            ...clientMessages.map((m: any) => ({
                role: m.role,
                content: m.content
            }))
        ];

        // 4. Run Orchestrator
        const stream = await orchestrator.run(messages, {
            nodeId,
            locale,
            userProfile,
            timestamp
        });

        return new NextResponse(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache, no-transform',
                Connection: 'keep-alive'
            }
        });

    } catch (error: any) {
        console.error('[Chat API] Fatal Error:', error);
        return new NextResponse(createOfflineStream(`⚠️ ${error.message || 'Internal Server Error'}`, 'error'), {
            headers: { 'Content-Type': 'text/event-stream' }
        });
    }
}
