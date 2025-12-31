import { ExpertKnowledge } from '../types/lutagu_l4';
import { GENERATED_KNOWLEDGE } from './station_wisdom_generated';

/**
 * LUTAGU V3.0 Expert Knowledge Base
 * 
 * Rules are evaluated by the L4 Decision Engine against User Context.
 * Writing Guide:
 * - Action-Oriented: Tell users what to do, not just facts.
 * - Concise: < 60 chars per language.
 * - Authority: Friendly local expert tone.
 */
export const KNOWLEDGE_BASE: ExpertKnowledge[] = [
    // Scene 1: Transfer Warning (Tokyo Station Keiyo Line)
    {
        id: 'tokyo-keiyo-transfer',
        trigger: {
            station_ids: ['odpt:Station:JR-East.Tokyo'],
            line_ids: ['odpt:Railway:JR-East.Keiyo'],
        },
        type: 'warning',
        priority: 90,
        icon: '⚠️',
        title: {
            'zh-TW': '轉乘預警',
            ja: '乗り換え注意',
            en: 'Transfer Warning',
        },
        content: {
            'zh-TW': '總武快速線與京葉線月台位於地下深處，與其他月台步行約 15 分鐘。攜帶大行李請預留 20 分鐘。',
            ja: '京葉線・総武快速線のホームは深く、他ホームから徒歩約15分かかります。大きな荷物がある場合は20分見てください。',
            en: 'Keiyo/Sobu Line platforms are deep underground, 15m walk from others. Allow 20m if you have large luggage.',
        },
    },

    // Scene 2: Facility Barriers (Exit A1 - Wheelchair/Stroller)
    {
        id: 'generic-exit-a1-barrier', // Note: This should ideally be specific to a station. Using a generic-like ID for the example structure.
        trigger: {
            // In a real DB, we might tag specific Station+Exit. 
            // For this example, let's assume it targets a specific station where A1 is bad.
            // Let's assign it to 'Ueno' for demonstration, or leave station empty if it was a global rule (which this isn't).
            station_ids: ['odpt:Station:TokyoMetro.Ueno'],
            user_states: ['accessibility.wheelchair', 'accessibility.stroller'],
        },
        type: 'warning',
        priority: 85,
        icon: '♿',
        title: {
            'zh-TW': '無障礙提醒',
            ja: 'バリアフリー情報',
            en: 'Accessibility Alert',
        },
        content: {
            'zh-TW': '出口 A1 僅有長階梯。推嬰兒車或輪椅，請務必改由 B2 出口搭乘大樓透明電梯。',
            ja: 'A1出口は階段のみです。ベビーカーや車椅子の方は、B2出口の透明エレベーターをご利用ください。',
            en: 'Exit A1 has stairs only. For strollers/wheelchairs, use Exit B2 for the glass elevator.',
        },
    },

    // Scene 3: Ticket Hack (Day Pass)
    {
        id: 'ticket-day-pass-suggestion',
        trigger: {
            // Logic: This would be triggered by the engine if trip_count > 3. 
            // For now, we can leave direct triggers empty and let the Engine inject it based on calculated trip count.
            // Or we can set a manual trigger for "Budget" travelers.
            user_states: ['travel_style.budget', 'travel_style.comfort'],
        },
        type: 'ticket_advice',
        priority: 60,
        icon: '🎫',
        title: {
            'zh-TW': '省錢小撇步',
            ja: 'お得なきっぷ',
            en: 'Money Saving Tip',
        },
        content: {
            'zh-TW': '若今日計畫造訪超過 3 個地鐵站，購買 800 日圓的「Tokyo Subway Ticket」可省下 300 日圓以上。',
            ja: '地下鉄を3回以上乗るなら、800円の「Tokyo Subway Ticket」がお得です。',
            en: 'If visiting 3+ stations today, the 800 JPY "Tokyo Subway Ticket" saves you money.',
        },
    },

    // Scene 4: Timing Adjustment (Ueno Shinkansen)
    {
        id: 'ueno-shinkansen-timing',
        trigger: {
            station_ids: ['odpt:Station:JR-East.Ueno'],
            line_ids: ['odpt:Railway:JR-East.Shinkansen'], // Generic for Shinkansen lines
        },
        type: 'timing',
        priority: 70,
        icon: '⏰',
        title: {
            'zh-TW': '時間修正',
            ja: '移動時間注意',
            en: 'Time Adjustment',
        },
        content: {
            'zh-TW': '新幹線月台位於地下深層，進剪票口後需走 10-12 分鐘。建議比發車時間早 15 分鐘抵達。',
            ja: '新幹線ホームは地下深くにあります。改札からホームまで10分以上かかるため、15分前には到着を。',
            en: 'Shinkansen platforms are deep underground (10-12m walk). Please arrive 15 mins before departure.',
        },
    },

    // Scene 5: Seasonal/Event (Asakusa New Year)
    {
        id: 'asakusa-new-year-control',
        trigger: {
            station_ids: ['odpt:Station:TokyoMetro.Asakusa', 'odpt:Station:Toei.Asakusa'],
            time_patterns: ['12/31-01/01'], // Simple date matching
        },
        type: 'seasonal',
        priority: 95,
        icon: '🎍', // Kadomatsu for New Year
        title: {
            'zh-TW': '跨年管制',
            ja: '年末年始規制',
            en: 'New Year Control',
        },
        content: {
            'zh-TW': '跨年期間雷門路口僅限出站。若要搭車回程，請由 A4 入口進入以節省排隊時間。',
            ja: '雷門前は出場専用になります。帰りの乗車はA4入口からがスムーズです。',
            en: 'Kaminarimon gate is exit-only during New Year. Use Exit A4 to enter the station and avoid queues.',
        },
    },
    ...(GENERATED_KNOWLEDGE as any as ExpertKnowledge[])
];

// ==========================================
// Legacy Data Support (DEPRECATED)
// ==========================================
// Kept to prevent build errors in existing files:
// - src/app/api/agent/chat/route.ts
// - src/lib/ai/strategyEngine.ts
// etc.

export interface StationWisdomData {
    traps: { title: string; content?: string; advice: string; severity: 'critical' | 'high' | 'medium' }[];
    hacks: { title: string; content: string; type: 'ticket' | 'route' | 'facility' }[];
    l3Facilities: { type: string; location: any; attributes?: any }[];
    accessibilityRoutes?: any[];
}

export const STATION_WISDOM: Record<string, StationWisdomData> = {
    // Empty mock to satisfy TS. Real data migrated to KNOWLEDGE_BASE.
    'odpt:Station:TokyoMetro.Ueno': {
        traps: [
            { title: 'Legacy Trap', content: 'Deprecated', advice: 'Use KNOWLEDGE_BASE instead', severity: 'medium' }
        ],
        hacks: [],
        l3Facilities: [],
        accessibilityRoutes: []
    }
};
