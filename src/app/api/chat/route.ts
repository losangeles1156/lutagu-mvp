import { NextRequest, NextResponse } from 'next/server';
import { StrategyEngine } from '@/lib/ai/strategyEngine';

import { logUserActivity } from '@/lib/activityLogger';
import { getVisitorIdFromRequest } from '@/lib/visitorIdentity';
import { writeAuditLog, writeSecurityEvent } from '@/lib/security/audit';


export const runtime = 'nodejs';

type SupportedLocale = 'zh-TW' | 'en' | 'ja';

function normalizeLocale(input?: string): SupportedLocale {
    const raw = String(input || '').trim().toLowerCase();
    if (raw.startsWith('ja')) return 'ja';
    if (raw.startsWith('en')) return 'en';
    return 'zh-TW';
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { messages, userLocation, zone, locale: inputLocale = 'zh-TW' } = body;
        const locale = normalizeLocale(inputLocale);

        // Use last message as query
        const lastMessage = messages[messages.length - 1]?.content || 'Hello';
        const visitorId = getVisitorIdFromRequest(req);
        const userId = visitorId || ('lutagu-user-' + Math.random().toString(36).substring(7));

        await logUserActivity({
            request: req,
            activityType: 'chat_query',
            queryContent: { message: lastMessage, zone: zone || 'core', locale },
            metadata: {
                hasLocation: Boolean(userLocation?.lat && userLocation?.lon)
            }
        });

        void writeAuditLog(req, {
            actorUserId: null,
            action: 'read',
            resourceType: 'chat',
            resourceId: String(userId || '*'),
            before: null,
            after: {
                zone: zone || 'core',
                locale,
                hasLocation: Boolean(userLocation?.lat && userLocation?.lon)
            }
        });

        // 1. Get Strategy Synthesis (L4)
        let strategyContext = null;
        if (userLocation?.lat && userLocation?.lon) {
            strategyContext = await StrategyEngine.getSynthesis(userLocation.lat, userLocation.lon, locale);
        }

        const mistralText = await generateMistralAnswer({ query: lastMessage, locale, strategyContext, zone, userLocation });
        if (mistralText) {
            void writeSecurityEvent(req, {
                type: 'ai_provider_mistral',
                severity: 'low',
                actorUserId: null,
                metadata: { endpoint: 'POST /api/chat' }
            });

            return NextResponse.json({
                answer: mistralText,
                actions: strategyContext?.commercialActions || [],
                context: {
                    hub: strategyContext?.nodeName,
                    delay: strategyContext?.l2Status?.delay
                },
                mode: 'mistral'
            });
        }

        void writeSecurityEvent(req, {
            type: 'ai_fallback_offline',
            severity: 'medium',
            actorUserId: null,
            metadata: { endpoint: 'POST /api/chat' }
        });

        const offline = mockResponse({ query: lastMessage, locale });
        if (strategyContext?.commercialActions && strategyContext.commercialActions.length > 0) {
            offline.actions = [...offline.actions, ...strategyContext.commercialActions];
        }
        return NextResponse.json(offline);

    } catch (error) {
        console.error('Chat API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

async function generateMistralAnswer(params: { query: string; locale: SupportedLocale; strategyContext: any; zone?: string; userLocation?: any }) {
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) return null;

    const model = process.env.AI_SLM_MODEL || 'mistral-small-latest';
    const { query, locale, strategyContext, zone, userLocation } = params;

    const system =
        locale === 'en'
            ? 'You are LUTAGU, a gentle guide. Like a guardian deer, you provide the most thoughtful travel advice based on real-time data (L2). Be accurate, concise, and actionable. If unsure, say you cannot confirm.'
            : locale === 'ja'
                ? 'あなたはLUTAGUという名の優しい案内人です。守護霊鹿のように、リアルタイムデータ（L2）に基づいてユーザーに最も思いやりのある行動提案を行います。正確・簡潔・実用的に答えてください。不確かな場合は推測しないでください。'
                : '你是一個名為 LUTAGU 的溫柔指引者，像守護靈鹿一樣，根據即時數據 (L2) 為用戶提供最貼心的行動建議。回答要正確、簡潔、可執行；不確定就直說無法確認，避免臆測。';

    const context =
        `zone: ${zone || 'core'}\n` +
        `user_location: ${userLocation?.lat && userLocation?.lon ? `${userLocation.lat},${userLocation.lon}` : 'unknown'}\n` +
        `nearest_hub: ${strategyContext?.nodeName || 'Unknown'}\n` +
        `l2_delay: ${strategyContext?.l2Status?.delay || 0}\n` +
        `persona_prompt: ${(strategyContext?.personaPrompt || '').slice(0, 1500)}\n` +
        `wisdom: ${(strategyContext?.wisdomSummary || '').slice(0, 2000)}`;

    const userPrompt =
        locale === 'en'
            ? `[Context]\n${context}\n\n[User]\n${query}`
            : locale === 'ja'
                ? `【コンテキスト】\n${context}\n\n【ユーザー】\n${query}`
                : `【背景】\n${context}\n\n【使用者】\n${query}`;

    try {
        const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model,
                messages: [
                    { role: 'system', content: system },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.2
            })
        });

        if (!res.ok) return null;
        const data: any = await res.json();
        const content = data?.choices?.[0]?.message?.content;

        const text =
            typeof content === 'string'
                ? content
                : Array.isArray(content)
                    ? content.map((c: any) => c?.text || '').join('')
                    : '';

        const trimmed = String(text || '').trim();
        return trimmed || null;
    } catch {
        return null;
    }
}

// Fallback Mock Logic
function mockResponse(params: { query: string; locale: SupportedLocale }) {
    const { query, locale } = params;
    const lowerMsg = query.toLowerCase();
    let actions: any[] = [];
    let answer =
        locale === 'en'
            ? "I'm currently running in offline mode. I can still help with basic navigation and station info."
            : locale === 'ja'
                ? '現在オフラインモードです。簡単な案内や駅情報ならお手伝いできます。'
                : '目前為離線模式（AI 服務未連線）。我仍可以先提供基礎導航與站點資訊。';

    const extractStationId = () => {
        const idMatch = query.match(/odpt:Station:[A-Za-z0-9_.-]+/);
        if (idMatch) return idMatch[0];

        const pairs: Array<{ id: string; keywords: string[] }> = [
            { id: 'odpt:Station:TokyoMetro.Ueno', keywords: ['ueno', '上野', 'うえの'] },
            { id: 'odpt:Station:TokyoMetro.Asakusa', keywords: ['asakusa', '浅草', 'あさくさ'] },
            { id: 'odpt:Station:JR-East.Akihabara', keywords: ['akihabara', '秋葉原', 'あきはばら'] },
            { id: 'odpt:Station:JR-East.Tokyo', keywords: ['tokyo station', 'tokyo', '東京駅', '東京'] }
        ];
        for (const p of pairs) {
            if (p.keywords.some(k => lowerMsg.includes(k))) return p.id;
        }
        return null;
    };

    const stationId = extractStationId();
    if (stationId) {
        // [Refactor] knowledgeService can be used here if needed, but for minimal offline fallback 
        // we omit complex facility listing to fix build errors.
        actions.push({
            type: 'details',
            label: locale === 'en' ? 'View station details' : locale === 'ja' ? '駅の詳細を見る' : '查看車站詳情',
            target: stationId
        });
    }

    if (lowerMsg.includes('ueno') || lowerMsg.includes('上野')) {
        answer =
            locale === 'en'
                ? 'Ueno is a great area. Do you want to head to Ueno Park or Ameyoko?'
                : locale === 'ja'
                    ? '上野は文化もグルメも楽しめます。上野公園かアメ横、どちらに行きますか？'
                    : '上野是個充滿文化氣息的好地方！要去上野公園還是阿美橫町逛逛呢？';
        actions.push({
            type: 'navigate',
            label: locale === 'en' ? 'Go to Ueno' : locale === 'ja' ? '上野へ移動' : '前往上野',
            target: 'ueno',
            metadata: { coordinates: [35.7141, 139.7774] }
        });
        actions.push({
            type: 'details',
            label: locale === 'en' ? 'View station details' : locale === 'ja' ? '駅の詳細を見る' : '查看車站詳情',
            target: 'odpt:Station:TokyoMetro.Ueno'
        });
    }

    return {
        answer,
        actions,
        mode: 'offline'
    };
}
