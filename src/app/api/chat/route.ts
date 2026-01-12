import { NextRequest, NextResponse } from 'next/server';
import { StrategyEngine } from '@/lib/ai/strategyEngine';
import { hybridEngine } from '@/lib/l4/HybridEngine';

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

        // 2. Delegate to Hybrid Engine (L1-L5)
        const decision = await hybridEngine.processRequest({
            text: lastMessage,
            locale,
            context: {
                userId,
                userLocation,
                currentStation: strategyContext?.nodeId,
                strategyContext // Inject L4 Strategy Context
            }
        });

        if (decision) {
            void writeSecurityEvent(req, {
                type: `ai_decision_${decision.source}`,
                severity: 'low',
                actorUserId: null,
                metadata: { endpoint: 'POST /api/chat', confidence: decision.confidence }
            });

            // Map HybridResponse to Legacy Format
            return NextResponse.json({
                answer: decision.content,
                actions: [
                    ...(strategyContext?.commercialActions || []),
                    ...(decision.type === 'action' || decision.type === 'route' ? extractActionsFromDecision(decision) : []),
                    ...(decision.source === 'poi_tagged' && decision?.data?.results ? decision.data.results.map((r: any) => ({
                        type: 'poi',
                        label: r.name,
                        target: r.poiId || 'unknown',
                        description: r.category + (r.station ? ` · ${r.station}` : ''),
                        metadata: {
                            tags: r.tags || [],
                            score: r.relevanceScore
                        }
                    })) : []),
                    // L4 Knowledge Card Mapping
                    ...(decision.source === 'knowledge' && decision.data?.results ? decision.data.results.map((k: any) => {
                        // Map Knowledge Types to Action Types for Icons
                        let actionType = 'details';
                        if (['transfer_hack', 'exit_guide', 'short_transfer'].includes(k.knowledge_type)) actionType = 'navigation';
                        if (['anomaly_alert', 'crowd_warning'].includes(k.knowledge_type)) actionType = 'alert';
                        if (['photo_spot', 'food_guide'].includes(k.knowledge_type)) actionType = 'recommendation';

                        // Create localized title based on knowledge type
                        const titles: Record<string, any> = {
                            'transfer_hack': { 'zh-TW': '轉乘密技', 'en': 'Transfer Hack', 'ja': '乗換ハック' },
                            'exit_guide': { 'zh-TW': '出口攻略', 'en': 'Exit Guide', 'ja': '出口ガイド' },
                            'short_transfer': { 'zh-TW': '快速轉乘', 'en': 'Quick Transfer', 'ja': '乗換短縮' },
                            'anomaly_alert': { 'zh-TW': '異常注意', 'en': 'Alert', 'ja': '注意' },
                            'photo_spot': { 'zh-TW': '打卡熱點', 'en': 'Photo Spot', 'ja': '撮影スポット' }
                        };
                        const displayTitle = titles[k.knowledge_type] || { 'zh-TW': k.knowledge_type, 'en': k.knowledge_type, 'ja': k.knowledge_type };

                        return {
                            type: actionType,
                            title: displayTitle,
                            content: k.content, // Raw content from knowledge base
                            label: k.station_id, // TODO: Map to station name if available
                            target: k.station_id,
                            description: k.tags?.join(' · ') || '',
                            metadata: {
                                category: actionType,
                                score: k.similarity,
                                original_type: k.knowledge_type
                            }
                        };
                    }) : [])
                ],
                context: {
                    hub: strategyContext?.nodeName,
                    delay: strategyContext?.l2Status?.delay,
                    source: decision.source,
                    reasoning_log: decision.reasoningLog // Pass trace
                },
                mode: decision.source
            });
        }

        // 3. Fallback (Should rarely happen as HybridEngine has internal fallback)
        return NextResponse.json({
            answer: locale === 'zh-TW' ? '系統暫時無法處理您的請求。' : 'System unavailable.',
            actions: [],
            mode: 'error'
        }, { status: 503 });

    } catch (error) {
        console.error('Chat API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// Helper: Extract actions from non-standard decision types if needed
function extractActionsFromDecision(decision: any): any[] {
    // Implement if HybridEngine returns structured actions in `data`
    // For now, we trust StrategyEngine commercial actions + simple logic
    if (decision.data && decision.data.actions) {
        return decision.data.actions;
    }
    return [];
}
