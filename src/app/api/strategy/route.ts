import { NextResponse } from 'next/server';
import { knowledgeService } from '@/lib/l4/knowledgeService';
import { ActionCard } from '@/lib/types/stationStandard';
import { logUserActivity } from '@/lib/activityLogger';

// Define the request body structure
interface StrategyRequest {
    stationId: string;
    demand: string | null;      // 'speed' | 'luggage' | 'budget' | ...
    destination: string;        // 'Narita', 'Shinjuku', etc.
    locale?: string;
}

export async function POST(request: Request) {
    try {
        const body: StrategyRequest = await request.json();
        const { stationId, demand, destination, locale = 'en' } = body;

        await logUserActivity({
            request,
            activityType: 'strategy_request',
            queryContent: { stationId, demand, destination, locale },
            metadata: { feature: 'l4_strategy' }
        });

        // 1. Get Wisdom for the station via KnowledgeService
        const knowledgeItems = knowledgeService.getKnowledgeByStationId(stationId);
        const cards: ActionCard[] = [];

        if (knowledgeItems.length === 0) {
            // Fallback for unknown stations
            return NextResponse.json({
                cards: [{
                    id: 'fallback',
                    type: 'primary',
                    title: { ja: '検索中...', en: 'Analyzing...', zh: '分析中...' },
                    description: { ja: 'この駅のデータはまだありません。', en: 'No specific data for this station yet.', zh: '尚無此車站的詳細數據。' },
                    actionLabel: { ja: '地図を見る', en: 'View Map', zh: '查看地圖' },
                    actionUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination || stationId)}`
                }]
            });
        }

        // Adapt Knowledge Items to old "wisdom" structure where needed
        const wisdom = {
            hacks: knowledgeItems.filter(k => k.type === 'tip' || (k.type as string) === 'hack').map(k => ({ title: k.section, content: k.content })),
            traps: knowledgeItems.filter(k => k.type === 'warning' || (k.type as string) === 'seasonal').map(k => ({ title: k.section, content: k.content, severity: k.priority > 80 ? 'critical' : 'medium', advice: '' })),
            l3Facilities: [] as any[] // Explicitly empty for now to fix build
        };

        // 2. Rule Engine Logic

        // --- DESTINATION RULES (Priority: High) ---
        if (destination) {
            const destLower = destination.toLowerCase();

            // Rule: Narita Airport (General)
            if (destLower.includes('narita') || destLower.includes('成田')) {
                if (stationId.includes('Ueno')) {
                    if (demand === 'budget') {
                        cards.push({
                            id: 'ueno-narita-budget',
                            type: 'primary',
                            title: { ja: '京成線特急 (Access Express)', en: 'Keisei Access Express', zh: '京成成田Sky Access特急' },
                            description: {
                                ja: 'スカイライナーより安く、乗り換えなしで空港へ行けます。',
                                en: 'Cheaper than Skyliner, direct access to the airport.',
                                zh: '比Skyliner便宜，且不需要對號座，直接抵達機場。'
                            },
                            actionLabel: { ja: '時刻表', en: 'Timetable', zh: '時刻表' },
                            actionUrl: 'https://www.keisei.co.jp/keisei/tetudou/skyliner/tc/timetable/index.php'
                        });
                    } else {
                        // Default to Skyliner for Speed/Comfort
                        cards.push({
                            id: 'ueno-narita-skyliner',
                            type: 'primary',
                            title: { ja: '京成スカイライナー', en: 'Keisei Skyliner', zh: '京成 Skyliner' },
                            description: {
                                ja: '最速で成田空港へ。全席指定で快適です。',
                                en: 'Fastest way to Narita. Reserved seating and comfortable.',
                                zh: '前往成田機場最快的方式 (約41分)。全車對號座，舒適且有行李架。'
                            },
                            actionLabel: { ja: '予約する', en: 'Reserve', zh: '預約車票' },
                            actionUrl: 'https://www.keisei.co.jp/keisei/tetudou/skyliner/e-ticket/zht/'
                        });
                    }
                } else if (stationId.includes('Asakusa') || stationId.includes('Oshiage')) {
                    cards.push({
                        id: 'asakusa-narita-direct',
                        type: 'primary',
                        title: { ja: '都営淺草線直通 (エアポート快特)', en: 'Asakusa Line Direct (Airport Kaitoku)', zh: '都營淺草線直通 (機場快特)' },
                        description: {
                            ja: '乗り換えなしで成田空港へ直行できます。',
                            en: 'Direct train to Narita Airport without transfers.',
                            zh: '免轉乘！搭乘「Access特急」或「機場快特」可直接抵達航廈。'
                        },
                        actionLabel: { ja: '時刻表', en: 'Timetable', zh: '時刻表' },
                        actionUrl: 'https://www.kotsu.metro.tokyo.jp/subway/stations/asakusa.html'
                    });
                }
            }
        }

        // --- TRAIN / HACK SUGGESTIONS ---
        // If wisdom.hacks exists, promote the first one
        if (wisdom.hacks.length > 0) {
            const hack = wisdom.hacks[0];
            cards.push({
                id: 'speed-hack',
                type: 'primary',
                title: { ja: hack.title, en: hack.title, zh: hack.title },
                description: { ja: hack.content, en: hack.content, zh: hack.content },
                actionLabel: { ja: '確認', en: 'Check', zh: '確認' }
            });
        }

        // --- TRAP WARNINGS ---
        wisdom.traps.forEach((trap, idx) => {
            if (trap.severity === 'critical') {
                cards.push({
                    id: `trap-${idx}`,
                    type: 'secondary',
                    title: { ja: trap.title, en: trap.title, zh: trap.title },
                    description: { ja: trap.content, en: trap.content, zh: trap.content },
                    actionLabel: { ja: '注意', en: 'Warning', zh: '注意' }
                });
            }
        });

        // --- DEFAULT FALLBACK ---
        if (cards.length === 0) {
            cards.push({
                id: 'default-explore',
                type: 'primary',
                title: { ja: '周辺を探索', en: 'Explore Around', zh: '探索周邊' },
                description: {
                    ja: '特定の条件に合う提案が見つかりませんでした。地図で周辺を確認してみましょう。',
                    en: 'No specific advice found for your criteria. Let\'s check the map.',
                    zh: '暫無針對此條件的特定建議。不妨打開地圖探索周邊景點。'
                },
                actionLabel: { ja: 'Google Maps', en: 'Google Maps', zh: 'Google Maps' },
                actionUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stationId)}`
            });
        }

        return NextResponse.json({ cards });

    } catch (error) {
        console.error('Strategy API Error:', error);
        return NextResponse.json({ error: 'Failed to generate strategy' }, { status: 500 });
    }
}
