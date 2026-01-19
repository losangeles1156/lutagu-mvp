import { ExpertKnowledge } from '../types/lutagu_l4';

/**
 * @deprecated
 * LUTAGU V3.0 Expert Knowledge Base - DEPRECATED
 *
 * This file is deprecated in favor of the SSOT Markdown file:
 * src/data/tokyo_transit_knowledge_base.md
 *
 * The knowledge is now loaded via `knowledgeService.ts` (knowledge_base.json)
 * and served dynamically via the AI Fallback (generateL4Advice).
 *
 * Do not add new rules here. Add them to the Markdown file and run `npm run sync:knowledge`.
 */
export const KNOWLEDGE_BASE: ExpertKnowledge[] = [
    {
        id: 'generic-exit-a1-barrier',
        trigger: {
            station_ids: ['odpt.Station:TokyoMetro.Ginza.Ueno'],
            user_states: ['accessibility.wheelchair', 'accessibility.stroller'],
        },
        type: 'warning',
        priority: 85,
        icon: '⚠️',
        title: {
            'zh-TW': '上野站：無障礙出口提醒',
            ja: '上野駅：バリアフリー出口の注意',
            en: 'Ueno: Accessible Exit Tip',
        },
        content: {
            'zh-TW': 'A1 出口路線常有階梯/高低差，輪椅/嬰兒車建議改走 B2 出口（電梯路線）。',
            ja: 'A1出口は階段や段差が多い場合があります。車椅子/ベビーカーはB2出口（エレベーター）推奨。',
            en: 'Exit A1 may involve stairs/level changes. For wheelchair/strollers, use Exit B2 (elevator route).',
        },
    },
    {
        id: 'ueno-shinkansen-timing',
        trigger: {
            station_ids: ['odpt.Station:JR-East.Ueno'],
            line_ids: ['odpt.Railway:JR-East.Shinkansen'],
        },
        type: 'timing',
        priority: 70,
        icon: '⏰',
        title: {
            'zh-TW': '上野站：新幹線候車時間提醒',
            ja: '上野駅：新幹線の乗車タイミング',
            en: 'Ueno: Shinkansen Timing',
        },
        content: {
            'zh-TW': '上野站新幹線月台距離較遠，建議至少提早 10 分鐘進站並確認月台號。',
            ja: '上野駅の新幹線ホームは移動が必要です。少なくとも10分前に改札へ、ホーム番号を確認してください。',
            en: 'At Ueno, Shinkansen platforms may require walking. Enter gates at least 10 minutes early and confirm platform number.',
        },
    },
];
