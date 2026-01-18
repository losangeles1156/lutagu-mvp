import { DEMO_SCENARIOS, DemoScenario } from './demoScenarios';
import CORE_TOPOLOGY from './generated/coreTopology.json';
import PRIVATE_RAILWAYS_TOPOLOGY from './generated/extraTopology.json';
import { PriorityQueue } from '../utils/PriorityQueue';
import { SEED_NODES } from '../nodes/seedNodes';
import { parsePointWKT, getDistanceKm } from '../utils/geoUtils';
import { RAPID_SERVICE_PATTERNS, RAPID_STATION_ALIASES } from './data/rapidServicePatterns';

// Initialize Station Coordinates Map for A* Heuristic
const STATION_COORDINATES = new Map<string, { lat: number, lng: number }>();
for (const node of SEED_NODES) {
    if (node.location && typeof node.location === 'string' && node.location.startsWith('POINT')) {
        const coords = parsePointWKT(node.location);
        if (coords) {
            STATION_COORDINATES.set(node.id, { lat: coords[0], lng: coords[1] });
        }
    }
}

/**
 * Heuristic function for A* Search.
 * Estimates the minimum time to reach any of the destination stations.
 * Uses Euclidean distance divided by max speed (e.g., 100km/h = ~0.6 min/km).
 * Admissible heuristic: never overestimates the cost (time).
 */
function calculateHeuristic(currentId: string, destIds: string[]): number {
    const currentLoc = STATION_COORDINATES.get(currentId);
    if (!currentLoc) return 0;

    let minTime = Infinity;
    for (const destId of destIds) {
        const destLoc = STATION_COORDINATES.get(destId);
        if (!destLoc) continue;

        const distKm = getDistanceKm(currentLoc.lat, currentLoc.lng, destLoc.lat, destLoc.lng);
        // Assume max speed 120km/h = 2km/min => 0.5 min/km
        // Using a lower bound to ensure admissibility
        const timeEst = distKm * 0.5;
        if (timeEst < minTime) minTime = timeEst;
    }
    return minTime === Infinity ? 0 : minTime;
}

const EXTRA_TOPOLOGY: any[] = [
    {
        railwayId: 'odpt.Railway:JR-East.NaritaExpress',
        operator: 'odpt.Operator:JR-East',
        title: { ja: '成田エクスプレス', en: 'Narita Express', 'zh-TW': "成田特快 N'EX" },
        stationOrder: [
            {
                index: 1,
                station: 'odpt.Station:JR-East.NaritaExpress.NaritaAirportTerminal1',
                title: { ja: '成田空港 第1ターミナル', en: 'Narita Airport Terminal 1', 'zh-TW': '成田第一航廈' },
            },
            {
                index: 2,
                station: 'odpt.Station:JR-East.NaritaExpress.NaritaAirportTerminal2and3',
                title: { ja: '成田空港 第2・第3ターミナル', en: 'Narita Airport Terminal 2 & 3', 'zh-TW': '成田第二/第三航廈' },
            },
            {
                index: 3,
                station: 'odpt.Station:JR-East.NaritaExpress.Tokyo',
                title: { ja: '東京', en: 'Tokyo', 'zh-TW': '東京' },
            },
            {
                index: 4,
                station: 'odpt.Station:JR-East.NaritaExpress.Shinagawa',
                title: { ja: '品川', en: 'Shinagawa', 'zh-TW': '品川' },
            },
        ],
    },
    {
        railwayId: 'lutagu.Railway:Keisei.SkylinerExpress',
        operator: 'lutagu.Operator:Keisei',
        title: { ja: 'スカイライナー', en: 'Keisei Skyliner', 'zh-TW': '京成 Skyliner' },
        stationOrder: [
            {
                index: 1,
                station: 'odpt.Station:Keisei.Skyliner.NaritaAirportTerminal1',
                title: { ja: '成田空港 第1ターミナル', en: 'Narita Airport Terminal 1', 'zh-TW': '成田第一航廈' },
            },
            {
                index: 2,
                station: 'odpt.Station:Keisei.Skyliner.NaritaAirportTerminal2and3',
                title: { ja: '成田空港 第2・第3ターミナル', en: 'Narita Airport Terminal 2 & 3', 'zh-TW': '成田第二/第三航廈' },
            },
            {
                index: 3,
                station: 'odpt.Station:Keisei.Skyliner.Nippori',
                title: { ja: '日暮里', en: 'Nippori', 'zh-TW': '日暮里' },
            },
            {
                index: 4,
                station: 'odpt.Station:Keisei.Skyliner.Ueno',
                title: { ja: '上野', en: 'Ueno', 'zh-TW': '上野' },
            },
        ],
    },
    {
        railwayId: 'lutagu.Railway:TokyoMonorail.HanedaAirport',
        operator: 'lutagu.Operator:TokyoMonorail',
        title: { ja: '東京モノレール', en: 'Tokyo Monorail', 'zh-TW': '東京單軌電車' },
        stationOrder: [
            {
                index: 1,
                station: 'odpt.Station:TokyoMonorail.Haneda.HanedaAirportTerminal3',
                title: { ja: '羽田空港 第3ターミナル', en: 'Haneda Airport Terminal 3', 'zh-TW': '羽田第三航廈' },
            },
            {
                index: 2,
                station: 'odpt.Station:TokyoMonorail.Haneda.HanedaAirportTerminal2',
                title: { ja: '羽田空港 第2ターミナル', en: 'Haneda Airport Terminal 2', 'zh-TW': '羽田第二航廈' },
            },
            {
                index: 3,
                station: 'odpt.Station:TokyoMonorail.Haneda.HanedaAirportTerminal1',
                title: { ja: '羽田空港 第1ターミナル', en: 'Haneda Airport Terminal 1', 'zh-TW': '羽田第一航廈' },
            },
            {
                index: 4,
                station: 'odpt.Station:TokyoMonorail.Haneda.Hamamatsucho',
                title: { ja: 'モノレール浜松町', en: 'Monorail Hamamatsucho', 'zh-TW': '濱松町（單軌）' },
            },
        ],
    },
    {
        railwayId: 'lutagu.Railway:Keikyu.HanedaAirport',
        operator: 'lutagu.Operator:Keikyu',
        title: { ja: '京急空港線', en: 'Keikyu Airport Line', 'zh-TW': '京急機場線' },
        stationOrder: [
            {
                index: 1,
                station: 'odpt.Station:Keikyu.Airport.HanedaAirportTerminal3',
                title: { ja: '羽田空港 第3ターミナル', en: 'Haneda Airport Terminal 3', 'zh-TW': '羽田第三航廈' },
            },
            {
                index: 2,
                station: 'odpt.Station:Keikyu.Airport.HanedaAirportTerminal1and2',
                title: { ja: '羽田空港 第1・第2ターミナル', en: 'Haneda Airport Terminal 1 & 2', 'zh-TW': '羽田第一/第二航廈' },
            },
            {
                index: 3,
                station: 'odpt.Station:Keikyu.Airport.Sengakuji',
                title: { ja: '泉岳寺', en: 'Sengakuji', 'zh-TW': '泉岳寺' },
            },
            {
                index: 4,
                station: 'odpt.Station:Keikyu.Main.Shinagawa',
                title: { ja: '品川', en: 'Shinagawa', 'zh-TW': '品川' },
            },
        ],
    },
];


const DEFAULT_TOPOLOGY = [...(CORE_TOPOLOGY as any[]), ...EXTRA_TOPOLOGY, ...(PRIVATE_RAILWAYS_TOPOLOGY as any[])];

export function getDefaultTopology(): any[] {
    return DEFAULT_TOPOLOGY as any[];
}

const STATION_INDEX = new Map<string, string[]>();

(DEFAULT_TOPOLOGY as any[]).forEach(railway => {
    railway.stationOrder.forEach((s: any) => {
        const id = s.station;
        const nameEn = s.title?.en?.toLowerCase();
        const nameJa = s.title?.ja;
        const nameZh = s.title?.['zh-TW'] || s.title?.['zh-Hant'] || s.title?.['zh-Hans'] || nameJa;
        const base = id.split('.').pop()?.toLowerCase();

        const terms = [nameEn, nameJa, nameZh, base].filter(Boolean);
        terms.forEach(term => {
            if (!STATION_INDEX.has(term)) STATION_INDEX.set(term, []);
            if (!STATION_INDEX.get(term)!.includes(id)) {
                STATION_INDEX.get(term)!.push(id);
            }
        });
    });
});

const STATION_TERMS = Array.from(STATION_INDEX.keys()).sort((a, b) => b.length - a.length);

import { calcTransferPainIndex } from './algorithms/TransferPainIndex';
import { calcCascadeDelayRisk } from './algorithms/CascadeDelayRisk';
import { TPIResult, CDRResult, JourneyLeg, TPIInput } from './types';

export type SupportedLocale = 'zh' | 'zh-TW' | 'ja' | 'en' | 'ar';

export type L4IntentKind = 'fare' | 'timetable' | 'route' | 'status' | 'amenity' | 'unknown';

export type L4TemplateCategory = 'basic' | 'advanced' | 'feature';

export type L4QuestionTemplate = {
    id: string;
    category: L4TemplateCategory;
    kind: Exclude<L4IntentKind, 'unknown'>;
    title: string;
    text: string;
    description?: string;
    preset?: {
        originStationId?: string;
        destinationStationId?: string;
        demand?: Partial<L4DemandState>;
        run?: boolean;
    };
};

export type L4DemandState = {
    // 無障礙需求 (Accessibility)
    wheelchair: boolean;
    stroller: boolean;
    vision: boolean;
    senior: boolean;

    // 行李狀態 (Luggage)
    largeLuggage: boolean;
    lightLuggage: boolean;

    // 行程偏好 (Preferences)
    rushing: boolean;
    budget: boolean;
    comfort: boolean;
    avoidCrowds: boolean;
    avoidRain: boolean;
};

export interface StationL4KnowledgeItem {
    icon: string;
    title: string;
    description: string;
    advice?: string;
}

export interface StationL4Knowledge {
    traps: StationL4KnowledgeItem[];
    hacks: StationL4KnowledgeItem[];
    vibe_tags?: string[];
    description?: string;
    facilities?: any[];
}

export type L4DataSource =
    | { type: 'odpt:RailwayFare'; verified: boolean }
    | { type: 'odpt:StationTimetable'; verified: boolean }
    | { type: 'odpt:Railway'; verified: boolean };

export type L4Suggestion = {
    title: string;
    options: RouteOption[];
};

export function normalizeOdptStationId(input: string): string {
    return input.replace(/^odpt:Station:/, 'odpt.Station:').trim();
}

function normalizeStationName(name: string): string {
    return name
        .trim()
        .toLowerCase()
        .replace(/藏/g, '蔵')
        .replace(/澀/g, '渋')
        .replace(/涩/g, '渋')
        .replace(/澁/g, '渋')
        .replace(/廣/g, '広')
        .replace(/广/g, '広')
        .replace(/邊/g, '辺')
        .replace(/樂/g, '楽')
        .replace(/澤/g, '沢')
        .replace(/濱/g, '浜')
        .replace(/關/g, '関')
        .replace(/鐵/g, '鉄')
        .replace(/驛/g, '駅')
        .replace(/區/g, '区')
        .replace(/圖/g, '図')
        .replace(/淺/g, '浅')
        .replace(/線/g, '') // Remove 'Line' or '線' suffix
        .replace(/站/g, '') // Remove 'Station' or '站' suffix
        .replace(/駅/g, '')
        .replace(/jr/g, '')
        .replace(/都營/g, '')
        .replace(/都営/g, '')
        .replace(/東京地下鐵/g, '')
        .replace(/東京メトロ/g, '')
        .replace(/地下鐵/g, '')
        .replace(/地下鉄/g, '')
        .replace(/大江戸/g, '')
        .replace(/大江戶/g, '');
}

export function findStationIdsByName(name: string): string[] {
    const term = normalizeStationName(name);
    if (term.length === 0) return [];

    if (STATION_INDEX.has(term)) return STATION_INDEX.get(term)!;

    // Fuzzy match
    for (const [key, ids] of STATION_INDEX.entries()) {
        const normalizedKey = normalizeStationName(key);
        if (normalizedKey.length > 0 && (normalizedKey === term || normalizedKey.includes(term) || term.includes(normalizedKey))) {
            return ids;
        }
    }
    return [];
}

export function extractOdptStationIds(text: string): string[] {
    const ids = new Set<string>();

    const explicit = extractExplicitOdptStationIds(text);
    explicit.forEach(id => ids.add(id));

    if (ids.size === 0) {
        for (const [name, stationIds] of STATION_INDEX.entries()) {
            if (name.length > 1 && text.includes(name)) {
                stationIds.forEach(id => ids.add(id));
            }
        }
    }

    return Array.from(ids);
}

function extractExplicitOdptStationIds(text: string): string[] {
    const ids = new Set<string>();
    const re = /(odpt[.:]Station:[A-Za-z0-9_.-]+)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
        ids.add(normalizeOdptStationId(m[1]));
    }
    return Array.from(ids);
}

type RouteEndpointExtraction = {
    originIds: string[];
    destinationIds: string[];
    originText?: string;
    destinationText?: string;
};

function stripDateTimeNoise(text: string): string {
    return text
        .replace(/\b\d{1,2}\s*[/-]\s*\d{1,2}\s*(?:日)?\b/gi, ' ')
        .replace(/\b\d{1,2}:\d{2}\b/gi, ' ')
        .replace(/\b(?:am|pm)\b/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function findFirstIndex(text: string, tokens: string[], startAt = 0): number {
    let best = -1;
    for (const t of tokens) {
        const idx = text.indexOf(t, startAt);
        if (idx === -1) continue;
        if (best === -1 || idx < best) best = idx;
    }
    return best;
}

function findStationMentions(text: string): Array<{ term: string; index: number; ids: string[] }> {
    const original = text;
    const lower = text.toLowerCase();
    const used: Array<{ start: number; end: number }> = [];
    const out: Array<{ term: string; index: number; ids: string[] }> = [];

    const cjkRe = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u;

    for (const term of STATION_TERMS) {
        if (!term) continue;
        const isCjk = cjkRe.test(term);
        const minLen = isCjk ? 2 : 3;
        if (term.length < minLen) continue;

        const hay = isCjk ? original : lower;
        const needle = isCjk ? term : term.toLowerCase();
        const idx = hay.indexOf(needle);
        if (idx === -1) continue;

        const start = idx;
        const end = idx + needle.length;
        if (used.some(r => !(end <= r.start || start >= r.end))) continue;

        const ids = STATION_INDEX.get(term) || STATION_INDEX.get(needle);
        if (!ids || ids.length === 0) continue;

        used.push({ start, end });
        out.push({ term, index: idx, ids });
        if (out.length >= 12) break;
    }

    out.sort((a, b) => a.index - b.index);
    return out;
}

function resolveAirportAliases(text: string): Array<{ term: string; index: number; ids: string[] }> {
    const lower = text.toLowerCase();
    const out: Array<{ term: string; index: number; ids: string[] }> = [];

    const terminal1Ids = [
        'odpt.Station:JR-East.NaritaAirportBranch.NaritaAirportTerminal1',
        'odpt.Station:JR-East.NaritaExpress.NaritaAirportTerminal1',
        'odpt.Station:Keisei.Skyliner.NaritaAirportTerminal1',
    ];
    const terminal23Ids = [
        'odpt.Station:JR-East.NaritaAirportBranch.NaritaAirportTerminal2and3',
        'odpt.Station:JR-East.NaritaExpress.NaritaAirportTerminal2and3',
        'odpt.Station:Keisei.Skyliner.NaritaAirportTerminal2and3',
    ];

    const t1Patterns: Array<[RegExp, string]> = [
        [/(成田|narita).*?(第\s*1|第一|t\s*1|terminal\s*1)/i, '成田第一航廈'],
        [/narita\s*airport\s*(terminal\s*1|t\s*1)/i, 'Narita Airport Terminal 1'],
    ];
    const t23Patterns: Array<[RegExp, string]> = [
        [/(成田|narita).*?(第\s*2|第二|第\s*3|第三|t\s*2|t\s*3|terminal\s*2|terminal\s*3|terminal\s*2\s*&\s*3)/i, '成田第二/第三航廈'],
        [/narita\s*airport\s*(terminal\s*2|terminal\s*3|terminal\s*2\s*&\s*3)/i, 'Narita Airport Terminal 2 & 3'],
    ];

    for (const [re, label] of t1Patterns) {
        const m = re.exec(text);
        if (m && typeof m.index === 'number') {
            out.push({ term: label, index: m.index, ids: terminal1Ids });
            break;
        }
    }
    for (const [re, label] of t23Patterns) {
        const m = re.exec(text);
        if (m && typeof m.index === 'number') {
            out.push({ term: label, index: m.index, ids: terminal23Ids });
            break;
        }
    }

    const naritaGenericIdx = Math.min(
        ...['成田機場', '成田空港', 'narita airport', 'narita'].map(t => {
            const idx = lower.indexOf(t);
            return idx === -1 ? Number.POSITIVE_INFINITY : idx;
        })
    );
    if (Number.isFinite(naritaGenericIdx) && out.length === 0) {
        out.push({ term: '成田機場', index: naritaGenericIdx, ids: [...terminal1Ids, ...terminal23Ids] });
    }

    out.sort((a, b) => a.index - b.index);
    return out;
}

function resolveHanedaAirportAliases(text: string): Array<{ term: string; index: number; ids: string[] }> {
    const lower = text.toLowerCase();
    const out: Array<{ term: string; index: number; ids: string[] }> = [];

    const terminal3Ids = [
        'odpt.Station:TokyoMonorail.Haneda.HanedaAirportTerminal3',
        'odpt.Station:Keikyu.Airport.HanedaAirportTerminal3',
    ];
    const terminal12Ids = [
        'odpt.Station:TokyoMonorail.Haneda.HanedaAirportTerminal1',
        'odpt.Station:TokyoMonorail.Haneda.HanedaAirportTerminal2',
        'odpt.Station:Keikyu.Airport.HanedaAirportTerminal1and2',
    ];

    const t3Patterns: Array<[RegExp, string]> = [
        [/(羽田|haneda).*?(第\s*3|第三|t\s*3|terminal\s*3)/i, '羽田第三航廈'],
        [/haneda\s*airport\s*(terminal\s*3|t\s*3)/i, 'Haneda Airport Terminal 3'],
    ];
    const t12Patterns: Array<[RegExp, string]> = [
        [/(羽田|haneda).*?(第\s*1|第一|t\s*1|terminal\s*1|第\s*2|第二|t\s*2|terminal\s*2)/i, '羽田第一/第二航廈'],
        [/haneda\s*airport\s*(terminal\s*1|terminal\s*2|terminal\s*1\s*&\s*2|t\s*1|t\s*2)/i, 'Haneda Airport Terminal 1 & 2'],
    ];

    for (const [re, label] of t3Patterns) {
        const m = re.exec(text);
        if (m && typeof m.index === 'number') {
            out.push({ term: label, index: m.index, ids: terminal3Ids });
            break;
        }
    }
    for (const [re, label] of t12Patterns) {
        const m = re.exec(text);
        if (m && typeof m.index === 'number') {
            out.push({ term: label, index: m.index, ids: terminal12Ids });
            break;
        }
    }

    const hanedaGenericIdx = Math.min(
        ...['羽田機場', '羽田空港', 'haneda airport', 'haneda'].map(t => {
            const idx = lower.indexOf(t);
            return idx === -1 ? Number.POSITIVE_INFINITY : idx;
        })
    );
    if (Number.isFinite(hanedaGenericIdx) && out.length === 0) {
        out.push({ term: '羽田機場', index: hanedaGenericIdx, ids: [...terminal3Ids, ...terminal12Ids] });
    }

    out.sort((a, b) => a.index - b.index);
    return out;
}

export function extractRouteEndpointsFromText(text: string): RouteEndpointExtraction | null {
    const raw = String(text || '');
    const explicitIds = extractExplicitOdptStationIds(raw);
    if (explicitIds.length >= 2) {
        return {
            originIds: [explicitIds[0]],
            destinationIds: [explicitIds[explicitIds.length - 1]],
        };
    }

    const cleaned = stripDateTimeNoise(raw);
    const mentions = [...resolveAirportAliases(cleaned), ...resolveHanedaAirportAliases(cleaned), ...findStationMentions(cleaned)];
    mentions.sort((a, b) => a.index - b.index);

    if (mentions.length === 0) return null;

    const fromIdx = findFirstIndex(cleaned, ['從', 'from'], 0);
    const toIdx = fromIdx >= 0
        ? findFirstIndex(cleaned, ['前往', '到', '去', 'to', 'まで'], fromIdx + 1)
        : findFirstIndex(cleaned, ['前往', '到', '去', 'to', 'まで'], 0);

    const pickFirstAfter = (idx: number) => mentions.find(m => m.index >= idx);
    const pickBetween = (start: number, end: number) => mentions.find(m => m.index >= start && m.index < end);

    let originMention: { term: string; index: number; ids: string[] } | undefined;
    let destMention: { term: string; index: number; ids: string[] } | undefined;

    if (fromIdx >= 0 && toIdx >= 0 && toIdx > fromIdx) {
        originMention = pickBetween(fromIdx + 1, toIdx) || pickFirstAfter(fromIdx + 1);
        destMention = pickFirstAfter(toIdx + 1) || mentions[mentions.length - 1];
    } else if (toIdx >= 0) {
        originMention = mentions[0];
        destMention = pickFirstAfter(toIdx + 1) || mentions[mentions.length - 1];
    } else if (mentions.length >= 2) {
        originMention = mentions[0];
        destMention = mentions[mentions.length - 1];
    }

    if (!originMention || !destMention) return null;

    const originIds = Array.from(new Set(originMention.ids.map(normalizeOdptStationId)));
    const destinationIds = Array.from(new Set(destMention.ids.map(normalizeOdptStationId)));

    if (originIds.length === 0 || destinationIds.length === 0) return null;
    if (originIds.length === 1 && destinationIds.length === 1 && originIds[0] === destinationIds[0]) return null;

    return {
        originIds,
        destinationIds,
        originText: originMention.term,
        destinationText: destMention.term,
    };
}

export function inferOdptOperatorFromStationId(stationId: string): string | null {
    const id = stationId;
    if (id.includes('Toei')) return 'odpt.Operator:Toei';
    if (id.includes('TokyoMetro')) return 'odpt.Operator:TokyoMetro';
    if (id.includes('JR-East')) return 'odpt.Operator:JR-East';
    if (id.includes('MIR')) return 'odpt.Operator:MIR';
    return null;
}

export function findDemoScenario(text: string): DemoScenario | undefined {
    const trimmed = text.trim();
    return DEMO_SCENARIOS.find(s =>
        s.triggerQuestion === trimmed ||
        s.title === trimmed ||
        s.triggerQuestions?.some(q => q === trimmed)
    );
}

export function classifyQuestion(text: string, locale: SupportedLocale): { kind: L4IntentKind; toStationId?: string } {
    const trimmed = String(text || '').trim();
    const lower = trimmed.toLowerCase();
    const ids = extractOdptStationIds(trimmed);

    const hasFare =
        lower.includes('fare') ||
        lower.includes('ticket') ||
        lower.includes('price') ||
        trimmed.includes('票價') ||
        trimmed.includes('運賃') ||
        trimmed.includes('料金');

    const hasTimetable =
        lower.includes('timetable') ||
        lower.includes('schedule') ||
        lower.includes('next train') ||
        trimmed.includes('時刻表') ||
        trimmed.includes('下一班') ||
        trimmed.includes('終電') ||
        trimmed.includes('始發') ||
        trimmed.includes('時刻') ||
        trimmed.includes('ダイヤ');

    const hasRoute =
        lower.includes('transfer') ||
        lower.includes('route') ||
        lower.includes('how to get') ||
        lower.includes('directions') ||
        lower.includes('airport') ||
        trimmed.includes('轉乘') ||
        trimmed.includes('換乘') ||
        trimmed.includes('怎麼去') ||
        trimmed.includes('如何去') ||
        trimmed.includes('乘換') ||
        trimmed.includes('乗換') ||
        trimmed.includes('機場');

    const hasStatus =
        lower.includes('status') ||
        lower.includes('delay') ||
        trimmed.includes('延誤') ||
        trimmed.includes('誤點') ||
        trimmed.includes('狀態') ||
        trimmed.includes('運行') ||
        lower.includes('flight') ||
        lower.includes('airline') ||
        trimmed.includes('航班') ||
        trimmed.includes('班機');

    const hasAmenity =
        lower.includes('locker') ||
        lower.includes('elevator') ||
        lower.includes('toilet') ||
        trimmed.includes('置物櫃') ||
        trimmed.includes('電梯') ||
        trimmed.includes('廁所') ||
        trimmed.includes('輪椅') ||
        trimmed.includes('嬰兒車');

    const toStationId = ids.length > 0 ? ids[ids.length - 1] : undefined;

    if (hasStatus) return { kind: 'status', toStationId };
    if (hasAmenity) return { kind: 'amenity', toStationId };
    if (hasTimetable) return { kind: 'timetable' };
    if (hasFare) return { kind: 'fare', toStationId };
    if (hasRoute) {
        const zhMatch = text.match(/從\s*([^到\s]+)\s*到\s*([^?\s]+)/) || text.match(/([^从\s]+)\s*到\s*([^?\s]+)/);
        if (zhMatch) {
            const destCandidates = findStationIdsByName(zhMatch[2]);
            if (destCandidates.length > 0) {
                return { kind: 'route', toStationId: destCandidates[0] };
            }
        }

        return { kind: 'route', toStationId };
    }

    if (locale?.startsWith('zh')) {
        if (trimmed.includes('票') || trimmed.includes('價')) return { kind: 'fare', toStationId };
        if (trimmed.includes('車') && trimmed.includes('幾點')) return { kind: 'timetable' };
    }

    return { kind: 'unknown' };
}

export function filterFaresForOrigin<T extends { [k: string]: any }>(fares: T[], originStationId: string): T[] {
    const origin = normalizeOdptStationId(originStationId);
    return (fares || []).filter(f => normalizeOdptStationId(String(f?.['odpt:fromStation'] || '')) === origin);
}

export function filterTimetablesForStation<T extends { [k: string]: any }>(timetables: T[], stationId: string): T[] {
    const station = normalizeOdptStationId(stationId);
    return (timetables || []).filter(t => normalizeOdptStationId(String(t?.['odpt:station'] || '')) === station);
}

export function buildL4DefaultQuestionTemplates(params: {
    originStationId: string;
    locale: SupportedLocale;
}): L4QuestionTemplate[] {
    const origin = normalizeOdptStationId(params.originStationId);
    const locale = params.locale;

    const exampleDestination = 'odpt.Station:TokyoMetro.Marunouchi.Tokyo';
    const dest = exampleDestination;

    const t = (zh: string, ja: string, en: string) => (locale === 'ja' ? ja : locale === 'en' ? en : zh);
    const fareText = t(
        `票價 from: ${origin} to: ${dest}`,
        `運賃 from: ${origin} to: ${dest}`,
        `Fare from: ${origin} to: ${dest}`
    );
    const timetableText = t(
        `時刻表 station: ${origin}`,
        `時刻表 station: ${origin}`,
        `Timetable station: ${origin}`
    );
    const routeText = t(
        `怎麼去 ${dest} from: ${origin}`,
        `${dest} まで行きたい from: ${origin}`,
        `How to get to ${dest} from: ${origin}`
    );

    const featureTemplates: L4QuestionTemplate[] = [
        {
            id: 'demo-01',
            category: 'feature',
            kind: 'route',
            title: t('演示：過度觀光建議', 'デモ：オーバーツーリズム', 'Demo: Overtourism'),
            text: t(
                '淺草寺這裡人潮多到有點不舒服，附近有沒有人少一點，但也能感受江戶風情的地方？',
                '浅草寺は混雑していて少し疲れます。近くで混雑が少なく、江戸情緒を感じられる場所はありますか？',
                'Senso-ji is so crowded it feels a bit uncomfortable. Is there somewhere nearby that is less crowded but still has that Edo period atmosphere?'
            ),
            description: t('避開人潮也能感受江戶風情', '混雑回避で江戸情緒', 'Avoid crowds, keep Edo vibes'),
            preset: { demand: { avoidCrowds: true, comfort: true } }
        },
        {
            id: 'demo-02',
            category: 'feature',
            kind: 'status',
            title: t('演示：交通中斷應變', 'デモ：交通障害対応', 'Demo: Disruption'),
            text: t(
                '我要從東京車站去東京都廳看夜景，但聽說中央線現在大誤點，該怎麼辦？',
                '東京駅から東京都庁へ夜景を見に行きたいのですが、中央線が大幅に遅れていると聞きました。どうすればいいですか？',
                'I want to go from Tokyo Station to the Tokyo Metropolitan Government Building for the night view, but I heard the Chuo Line is heavily delayed. What should I do?'
            ),
            description: t('遇到誤點時的替代方案', '遅延時の代替案', 'Alternatives during delays')
        },
        {
            id: 'demo-03',
            category: 'feature',
            kind: 'amenity',
            title: t('演示：空手觀光服務', 'デモ：手ぶら観光', 'Demo: Hands-free'),
            text: t(
                '我剛從成田機場到淺草，但飯店下午才能進房，淺草站的置物櫃還有位子嗎？',
                '成田空港から浅草に着いたばかりですが、ホテルへのチェックインは午後からです。浅草駅のコインロッカーに空きはありますか？',
                'I just arrived in Asakusa from Narita Airport, but I can\'t check into my hotel until this afternoon. Are there any lockers available at Asakusa Station?'
            ),
            description: t('先寄放行李再逛街', '荷物を預けて観光', 'Store luggage and explore'),
            preset: { demand: { largeLuggage: true } }
        },
        {
            id: 'demo-04',
            category: 'feature',
            kind: 'amenity',
            title: t('演示：無障礙規劃', 'デモ：バリアフリー', 'Demo: Accessibility'),
            text: t(
                '我推著嬰兒車要去上野動物園，請問搭到上野站要從哪個出口出來最方便？',
                'ベビーカーで上野動物園に行きたいのですが、上野駅のどの出口から出るのが一番便利ですか？',
                'I\'m going to Ueno Zoo with a stroller. Which exit at Ueno Station is the most convenient?'
            ),
            description: t('推嬰兒車的友善路線', 'ベビーカー向け', 'Stroller-friendly route'),
            preset: { demand: { stroller: true, comfort: true } }
        }
    ];

    // [New] Airport Specific Templates
    const isHaneda = origin.includes('Haneda') || origin.includes('Airport.Haneda');
    const isNarita = origin.includes('Narita') || origin.includes('Airport.Narita');

    if (isHaneda) {
        featureTemplates.unshift(
            {
                id: 'haneda-to-shinjuku',
                category: 'feature',
                kind: 'route',
                title: t('去新宿（市中心）', '新宿へ（都心アクセス）', 'To Shinjuku (City Center)'),
                text: t('怎麼去新宿站？', '新宿駅への行き方は？', 'How to get to Shinjuku Station?'),
                description: t('推薦單軌或京急轉乘', 'モノレール/京急乗り換え', 'Monorail/Keikyu transfer'),
                preset: { originStationId: origin, destinationStationId: 'odpt.Station:JR-East.Yamanote.Shinjuku', demand: { comfort: true } }
            },
            {
                id: 'haneda-to-asakusa',
                category: 'feature',
                kind: 'route',
                title: t('去淺草（直達車？）', '浅草へ（直通？）', 'To Asakusa (Direct?)'),
                text: t('怎麼去淺草站？推薦直達車嗎？', '浅草駅への行き方は？直通はありますか？', 'How to get to Asakusa Station? Is there a direct train?'),
                description: t('京急線有直達班次', '京急線で直通あり', 'Direct train via Keikyu Line'),
                preset: { originStationId: origin, destinationStationId: 'odpt.Station:TokyoMetro.Ginza.Asakusa' }
            }
        );
    } else if (isNarita) {
        featureTemplates.unshift(
            {
                id: 'narita-to-tokyo',
                category: 'feature',
                kind: 'route',
                title: t('去東京站（N\'EX）', '東京駅へ（N\'EX）', 'To Tokyo Station (N\'EX)'),
                text: t('怎麼去東京站？比較 N\'EX 和巴士。', '東京駅への行き方は？N\'EXとバスを比較。', 'How to get to Tokyo Station? Compare N\'EX and bus.'),
                description: t('成田特快直達最舒適', '成田エクスプレスが快適', 'Narita Express is comfortable'),
                preset: { originStationId: origin, destinationStationId: 'odpt.Station:JR-East.Yamanote.Tokyo', demand: { comfort: true, largeLuggage: true } }
            },
            {
                id: 'narita-to-ueno',
                category: 'feature',
                kind: 'route',
                title: t('去上野（Skyliner）', '上野へ（スカイライナー）', 'To Ueno (Skyliner)'),
                text: t('搭 Skyliner 去上野要多久？', 'スカイライナーで上野までどのくらい？', 'How long to Ueno via Skyliner?'),
                description: t('最快 40 分鐘進市區', '最速40分で都心へ', 'Fastest 40min to city'),
                preset: { originStationId: origin, destinationStationId: 'odpt.Station:TokyoMetro.Ginza.Ueno', demand: { rushing: true } }
            }
        );
    }

    return [
        ...featureTemplates,
        {
            id: 'basic-fare',
            category: 'basic',
            kind: 'fare',
            title: t('查票價（本站 → 東京）', '運賃（この駅 → 東京）', 'Fare (this station → Tokyo)'),
            text: fareText,
            description: t('選好目的地就能直接計算', '目的地を選べばすぐ計算', 'Pick a destination and calculate'),
            preset: { originStationId: origin, destinationStationId: dest }
        },
        {
            id: 'basic-timetable',
            category: 'basic',
            kind: 'timetable',
            title: t('查時刻表（本站）', '時刻表（この駅）', 'Timetable (this station)'),
            text: timetableText,
            description: t('查看下一班車與方向', '次の電車と方面', 'Next trains and directions'),
            preset: { originStationId: origin }
        },
        {
            id: 'basic-route',
            category: 'basic',
            kind: 'route',
            title: t('查路線（本站 → 東京）', '経路（この駅 → 東京）', 'Route (this station → Tokyo)'),
            text: routeText,
            description: t('少轉乘、可依需求調整', '乗換少なめ、条件で調整', 'Fewer transfers; adjust by needs'),
            preset: { originStationId: origin, destinationStationId: dest, demand: { comfort: true } }
        },
        {
            id: 'adv-fare-ic',
            category: 'advanced',
            kind: 'fare',
            title: t('票價：IC/車票比對（示例）', '運賃：IC/切符の比較（例）', 'Fares: IC vs ticket (example)'),
            text: fareText
        },
        {
            id: 'adv-timetable-weekend',
            category: 'advanced',
            kind: 'timetable',
            title: t('時刻表：平日/假日差異', '時刻表：平日/休日の違い', 'Timetable: weekday vs holiday'),
            text: timetableText
        },
        {
            id: 'adv-route-transfer',
            category: 'advanced',
            kind: 'route',
            title: t('路線：轉乘建議（示例）', '経路：乗換案内（例）', 'Route: transfer suggestions (example)'),
            text: routeText
        },
        {
            id: 'feature-verified-fare',
            category: 'feature',
            kind: 'fare',
            title: t('系統特色：顯示資料來源與驗證', '特徴：データソースと検証表示', 'Feature: sources & verification'),
            text: fareText
        },
        {
            id: 'feature-passive-timetable',
            category: 'feature',
            kind: 'timetable',
            title: t('系統特色：被動觸發（範例查詢）', '特徴：パッシブ起動（例）', 'Feature: passive trigger (example)'),
            text: timetableText
        },
        {
            id: 'feature-isolation-route',
            category: 'feature',
            kind: 'route',
            title: t('系統特色：跨站隔離（範例查詢）', '特徴：駅ごとの分離（例）', 'Feature: station isolation (example)'),
            text: routeText
        }
    ];
}

export type RailwayTopology = {
    railwayId: string;
    operator: string;
    title?: { en?: string; ja?: string;[key: string]: string | undefined };
    stationOrder: Array<{ index: number; station: string; title?: { en?: string; ja?: string;[key: string]: string | undefined } }>;
};

export type RouteStepKind = 'origin' | 'destination' | 'train' | 'walk' | 'transfer' | 'info';

export type RouteStep = {
    kind: RouteStepKind;
    text: string;
    railwayId?: string;
    icon?: string;
    note?: string;
};

export type RouteOption = {
    label: string;
    steps: RouteStep[];
    sources: L4DataSource[];
    railways?: string[]; // Added to track railways in the route
    fare?: { ic: number; ticket: number };
    duration?: number;
    transfers?: number;
    nextDeparture?: string;
};

export type EnrichedRouteOption = RouteOption & {
    transfers: number;
    fare?: { ic: number; ticket: number };
    duration?: number;
    nextDeparture?: string;
    tpi?: TPIResult;
    cdr?: CDRResult;
};

function normalizeOdptRailwayId(input: string): string {
    const s = String(input || '').trim();
    if (!s) return '';
    return s
        .replace(/^odpt:Railway:/, 'odpt.Railway:')
        .replace(/^odpt\.Railway:/, 'odpt.Railway:');
}

function normalizeLineToken(input: string): string {
    return String(input || '')
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/line$/g, '')
        .replace(/線$/g, '')
        .replace(/^jr/, '')
        .replace(/^jreast/, '')
        .replace(/^tokyometro/, '')
        .replace(/^metro/, '')
        .replace(/^toei/, '')
        .replace(/^keikyu/, '')
        .replace(/^seibu/, '')
        .replace(/^tobu/, '')
        .replace(/^tokyu/, '')
        .replace(/^twr/, '')
        .replace(/^mir/, '')
        .replace(/[\-_.:]/g, '');
}

function mapRailwayOperatorToLineOperator(operatorToken: string): string {
    const raw = String(operatorToken || '').trim();
    if (!raw) return '';

    const token = raw
        .replace(/^odpt[.:]Operator:/i, '')
        .replace(/^operator:/i, '')
        .trim();

    const simple = token.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (
        token === 'JR' ||
        token === 'JR-East' ||
        simple === 'jr' ||
        simple === 'jreast' ||
        raw.toLowerCase().includes('jr-east') ||
        raw.includes('東日本')
    ) {
        return 'JR';
    }

    if (
        token === 'TokyoMetro' ||
        token === 'Metro' ||
        simple === 'tokyometro' ||
        simple === 'metro' ||
        raw.includes('東京メトロ')
    ) {
        return 'Metro';
    }

    if (token === 'Toei' || simple === 'toei' || raw.includes('都営')) return 'Toei';
    if (token === 'Keikyu' || simple === 'keikyu') return 'Keikyu';
    if (token === 'Seibu' || simple === 'seibu') return 'Seibu';
    if (token === 'Tobu' || simple === 'tobu') return 'Tobu';
    if (token === 'Tokyu' || simple === 'tokyu') return 'Tokyu';
    if (token === 'TWR' || simple === 'twr') return 'TWR';
    if (token === 'MIR' || simple === 'mir') return 'MIR';

    return token;
}

function extractOperatorAndLineFromRailwayId(railwayId: string): { operator: string; line: string } | null {
    const norm = normalizeOdptRailwayId(railwayId);
    const m = norm.match(/^odpt\.Railway:([^\.]+)\.(.+)$/);
    if (!m) return null;
    const op = mapRailwayOperatorToLineOperator(m[1]);
    const tail = String(m[2] || '');
    const parts = tail.split('.').filter(Boolean);
    const line = parts.length > 0 ? parts[parts.length - 1] : tail;
    return { operator: op, line };
}

function isSuspendedLineStatus(ls: any): boolean {
    const status = String(ls?.status || '').toLowerCase();
    if (status === 'suspended' || status === 'suspend') return true;
    if (status === 'stopped' || status === 'stop') return true;
    if (status === 'cancelled' || status === 'canceled') return true;
    const msg = String(ls?.message?.ja || ls?.message?.en || ls?.message?.['zh-TW'] || ls?.message?.zh || '').trim();
    const combined = `${status} ${msg}`;
    return /運転見合わせ|運休|終日運休|運転中止|運行停止|見合わせ|ストップ|停駛|停運|停電|suspend|suspended|service\s*suspended|stoppage|stopped|cancel/i.test(combined);
}

export function filterRoutesByL2Status(params: {
    routes: RouteOption[];
    l2Status: any;
}): { routes: RouteOption[]; removed: RouteOption[]; blockedRailwayIds: string[] } {
    const routes = Array.isArray(params.routes) ? params.routes : [];
    const l2 = params.l2Status;
    const lineStatus = Array.isArray(l2?.line_status) ? l2.line_status : [];

    const blockedByOperator = new Map<string, Set<string>>();
    const addBlocked = (operator: string, lineToken: string) => {
        const op = mapRailwayOperatorToLineOperator(String(operator || '')).trim().toLowerCase();
        const line = normalizeLineToken(lineToken);
        if (!op || !line) return;
        const set = blockedByOperator.get(op) || new Set<string>();
        set.add(line);
        blockedByOperator.set(op, set);
    };

    for (const ls of lineStatus) {
        if (!ls || !isSuspendedLineStatus(ls)) continue;

        const op = String(ls.operator || '').trim();
        const lineToken =
            String(ls.line || '').trim() ||
            String(ls?.name?.en || ls?.name?.ja || ls?.name?.['zh-TW'] || ls?.name?.zh || '').trim();
        if (op && lineToken) addBlocked(op, lineToken);

        const railwayId = String(ls.railway_id || ls.railwayId || '').trim();
        if (railwayId) {
            const parsed = extractOperatorAndLineFromRailwayId(railwayId);
            if (parsed) addBlocked(parsed.operator, parsed.line);
        }
    }

    if (blockedByOperator.size === 0) {
        return { routes, removed: [], blockedRailwayIds: [] };
    }

    const isLineBlocked = (operator: string, lineToken: string): boolean => {
        const op = String(operator || '').trim().toLowerCase();
        const token = normalizeLineToken(lineToken);
        if (!op || !token) return false;
        const blockedTokens = blockedByOperator.get(op);
        if (!blockedTokens || blockedTokens.size === 0) return false;
        if (blockedTokens.has(token)) return true;

        for (const b of blockedTokens) {
            if (!b) continue;
            if (token.startsWith(b) || b.startsWith(token)) {
                if (Math.min(token.length, b.length) >= 4) return true;
            }
        }
        return false;
    };

    const kept: RouteOption[] = [];
    const removed: RouteOption[] = [];
    const blockedRailwayIds = new Set<string>();

    for (const r of routes) {
        const stepRailways = (r?.steps || [])
            .map(s => (s && s.kind === 'train' ? String(s.railwayId || '').trim() : ''))
            .filter(Boolean);

        const blocked = stepRailways.some((rid) => {
            const parsed = extractOperatorAndLineFromRailwayId(rid);
            if (!parsed) return false;
            if (isLineBlocked(parsed.operator, parsed.line)) {
                blockedRailwayIds.add(normalizeOdptRailwayId(rid));
                return true;
            }
            return false;
        });

        if (blocked) removed.push(r);
        else kept.push(r);
    }

    return { routes: kept, removed, blockedRailwayIds: Array.from(blockedRailwayIds) };
}

// Expert Knowledge Repository
const EXPERT_KNOWLEDGE: Record<string, string[]> = {
    // --- Railways ---
    'odpt.Railway:TokyoMetro.Ginza': [
        '💡 銀座線是最古老的地鐵，月台較窄，攜帶大行李時請多留意。',
        '💡 銀座線車廂較小，尖峰時段非常擁擠。',
        '🎫 適合使用「東京地鐵 24/48/72 小時券」，單日搭乘 3 次以上即划算。'
    ],
    'odpt.Railway:TokyoMetro.Marunouchi': [
        '💡 丸之內線部分車站月台與車廂間隙較大，推嬰兒車請小心。',
        '💡 在赤坂見附站可與銀座線進行「零距離」同月台轉乘。'
    ],
    'odpt.Railway:JR-East.Yamanote': [
        '💡 山手線為環狀線，轉乘其他 JR 線路通常不需出站。',
        '💡 尖峰時段（08:00-09:30）建議避開新宿、澀谷等大站。',
        '🎫 適合使用「JR 都區內巴士地鐵一日券」或單純 Suica。',
        '💡 山手線雖是環狀運轉，但部分列車會以「大崎」或「池袋」為終點站（回庫車），並非所有列車都會一直繞圈行駛。'
    ],
    'odpt.Railway:TokyoMetro.Fukutoshin': [
        '💡 副都心線與東急東橫線、西武有樂町線直通運轉，需注意終點站。',
        '💡 月台通常位於地下深處，轉乘請預留足夠時間。'
    ],

    // --- Stations ---
    'odpt.Station:TokyoMetro.Ginza.Asakusa': [
        '💡 淺草站 1 號出口最靠近雷門。',
        '💡 淺草站與東武線轉乘需出站，請預留 5-10 分鐘。',
        '📦 置物櫃指南：若淺草站內置物櫃已滿，可前往「淺草文化觀光中心」或雷門對面的專用行李寄放店，通常空間較充裕。'
    ],
    'odpt.Station:TokyoMetro.Ginza.Ueno': [
        '💡 上野站 3 號出口有電梯，適合大行李與嬰兒車使用者。',
        '💡 轉乘日比谷線需經過一段較長的地下通道。',
        '🦽 無障礙動線：從銀座線前往 JR 上野站，建議使用「不忍口」方向的電梯最為順暢。'
    ],
    'odpt.Station:TokyoMetro.Hibiya.Roppongi': [
        '💡 六本木站日比谷線月台非常深，建議使用電梯。'
    ],
    'odpt.Station:JR-East.Yamanote.Shibuya': [
        '⚠️ 澀谷站正在進行長期整修工程（至 2027 年），動線頻繁變動且較擁擠。',
        '💡 JR 澀谷站與副都心線轉乘距離極長（徒步約 10-15 分鐘），建議預留緩衝。',
        '💡 埼京線月台已移至山手線旁，不再需要長距離步行。'
    ],
    'odpt.Station:JR-East.Yamanote.Shinjuku': [
        '⚠️ 新宿站是世界最繁忙車站，共有超過 200 個出口，請務必確認目標出口名稱。',
        '💡 「西口」與「東口」之間可透過「東西自由通路」直接穿過，無需購買月台票。',
        '💡 轉乘京王線或小田急線有專用的轉乘剪票口，不需先出站。'
    ],
    'odpt.Station:JR-East.Yamanote.Tokyo': [
        '💡 東京站是轉乘新幹線的主要站點，建議從「中央線」月台前往新幹線需約 10 分鐘。',
        '💡 京葉線（前往迪士尼）月台位於地下深處，距離山手線月台步行約 15-20 分鐘。',
        '💡 站內「GranSta」商場有豐富的鐵路便當與伴手禮。'
    ],
    'odpt.Station:TokyoMetro.Marunouchi.Ikebukuro': [
        '💡 池袋站動線複雜，主要分為東口（西武百貨）與西口（東武百貨），容易搞混。',
        '💡 轉乘有樂町線或副都心線需步行一段距離。'
    ],
    'odpt.Station:JR-East.Yamanote.Osaki': [
        '💡 大崎站是山手線的主要始發與終點站之一，若遇到列車回庫（不再載客），請在同月台等候下一班。',
        '💡 與臨海線（前往台場）直通運轉的列車會在此經過，無需轉乘。'
    ],
    // --- Special Locations & Lines ---
    'odpt.Railway:JR-East.Chuo': [
        '⚠️ 中央線（快速）班次密集但容易受人身事故影響導致延誤。',
        '💡 前往新宿御苑建議在「新宿門」下車，步行約 10 分鐘。'
    ],
    'Narita-Airport': [
        '✈️ 成田機場交通建議：帶嬰兒車最輕鬆的方式是搭乘「Skyliner」（上野/日暮里直達）或「成田特快 N\'EX」（新宿/東京直達），全車對號座且行李空間大。',
        '💡 若目的地是淺草，搭乘「京成 Access 特急」可直達，不需轉乘但人潮較多。'
    ]
};

// Pass Knowledge Repository
const PASS_KNOWLEDGE: Array<{
    id: string;
    name: string;
    price: string;
    rule: string;
    advice: string;
}> = [
        {
            id: 'tokyo-subway-ticket',
            name: 'Tokyo Subway Ticket (24/48/72h)',
            price: '¥800 / ¥1200 / ¥1500',
            rule: '可無限次搭乘全線東京地鐵 (Tokyo Metro) 與都營地鐵。',
            advice: '平均一天搭乘 3 次以上即划算，不含 JR 線路。'
        },
        {
            id: 'tokunai-pass',
            name: 'JR 都區內一日券 (Tokunai Pass)',
            price: '¥760',
            rule: '可無限次搭乘東京 23 區內的 JR 普通與快速列車。',
            advice: '適合整天都在山手線或中央線周邊活動的旅客。'
        },
        {
            id: 'greater-tokyo-pass',
            name: 'Greater Tokyo Pass (3 Days)',
            price: '¥7200',
            rule: '涵蓋 13 家私鐵公司與都營巴士，但不含 JR。',
            advice: '適合前往鎌倉、秩父等郊區且不搭乘 JR 的深度旅遊。'
        }
    ];

// Accessibility Advice Repository
const ACCESSIBILITY_ADVICE: Record<string, Record<string, string>> = {
    'odpt.Station:TokyoMetro.Ginza.Ueno': {
        'wheelchair': '🛗 上野站 3 號出口設有大型無障礙電梯。',
        'stroller': '🛗 上野站 3 號出口有寬敞電梯，方便推車進出。',
        'largeLuggage': '🛗 上野站 3 號出口有直達地面的電梯。'
    },
    'odpt.Station:TokyoMetro.Ginza.Asakusa': {
        'wheelchair': '🛗 淺草站 1 號出口設有電梯。',
        'stroller': '🛗 淺草站 1 號出口有電梯。',
        'largeLuggage': '🛗 淺草站 1 號出口有電梯。'
    },
    'odpt.Station:JR-East.Yamanote.Shibuya': {
        'wheelchair': '🛗 建議使用「澀谷 Scramble Square」內的電梯連通地下與地上層。',
        'stroller': '🛗 澀谷站動線複雜，電梯通常位於角落，請預留找路時間。',
        'largeLuggage': '🛗 建議利用「Shibuya Stream」出口方向的電梯，人潮較少。'
    },
    'odpt.Station:JR-East.Yamanote.Shinjuku': {
        'wheelchair': '🛗 新宿站「南口」動線相對較新且無障礙設施較完善。',
        'stroller': '🛗 避開新宿站地下街人潮，建議從路面層移動。',
        'largeLuggage': '🛗 JR 新宿站南口與新南口之間有完善的電梯系統。'
    }
};

const SAME_STATION_MAP: Record<string, string> = {
    'hamamatsucho': 'daimon',
    'daimon': 'hamamatsucho',
    'kasuga': 'korakuen',
    'korakuen': 'kasuga',
    'tameikesanno': 'kokkaigijidomae',
    'kokkaigijidomae': 'tameikesanno',
    'ueno okachimachi': 'ueno',
    'ueno': 'ueno okachimachi',
    'shin okachimachi': 'okachimachi',
    'okachimachi': 'shin okachimachi',
    'naka okachimachi': 'ueno okachimachi',
    'awajicho': 'ogawamachi',
    'ogawamachi': 'awajicho',
    'mitsukoshimae': 'nihombashi',
    'nihombashi': 'mitsukoshimae',
    'shimbashi': 'shiodome',
    'shiodome': 'shimbashi',
    'yurakucho': 'hibiya',
    'hibiya': 'yurakucho',
    'meiji jingumae': 'harajuku',
    'harajuku': 'meiji jingumae',
    'suidobashi': 'kasuga',
    'roppongi itchome': 'roppongi',
    'sanjugonme': 'tokyo' // This is a bit far but sometimes mapped
};

function buildAdjacency(railways: RailwayTopology[]) {
    const adj = new Map<string, Array<{ to: string; railwayId: string }>>();
    const addEdge = (a: string, b: string, railwayId: string) => {
        if (!adj.has(a)) adj.set(a, []);
        adj.get(a)!.push({ to: b, railwayId });
    };

    const stationGroups = new Map<string, string[]>();

    for (const r of railways) {
        if (!r.stationOrder) continue;
        const stations = r.stationOrder
            .slice()
            .sort((x, y) => x.index - y.index)
            .map(s => normalizeOdptStationId(s.station));

        for (let i = 0; i < stations.length; i++) {
            const s = stations[i];
            const baseName = normalizeStationName(s.split('.').pop()!);

            // Grouping by base name
            if (!stationGroups.has(baseName)) stationGroups.set(baseName, []);
            if (!stationGroups.get(baseName)!.includes(s)) {
                stationGroups.get(baseName)!.push(s);
            }

            // Grouping by SAME_STATION_MAP
            if (SAME_STATION_MAP[baseName]) {
                const targetBase = SAME_STATION_MAP[baseName];
                if (!stationGroups.has(targetBase)) stationGroups.set(targetBase, []);
                if (!stationGroups.get(targetBase)!.includes(s)) {
                    stationGroups.get(targetBase)!.push(s);
                }
            }

            if (i < stations.length - 1) {
                const next = stations[i + 1];
                addEdge(s, next, r.railwayId);
                addEdge(next, s, r.railwayId);
            }
        }
    }

    for (const [_, group] of stationGroups) {
        for (let i = 0; i < group.length; i++) {
            for (let j = i + 1; j < group.length; j++) {
                addEdge(group[i], group[j], 'transfer');
                addEdge(group[j], group[i], 'transfer');
            }
        }
    }

    // === Add Rapid/Express Service Edges ===
    for (const pattern of RAPID_SERVICE_PATTERNS) {
        const stops = pattern.stops;
        for (let i = 0; i < stops.length - 1; i++) {
            const from = normalizeOdptStationId(stops[i]);
            const to = normalizeOdptStationId(stops[i + 1]);
            addEdge(from, to, pattern.railwayId);
            addEdge(to, from, pattern.railwayId);
        }
        // Add transfers from rapid stations to local network using aliases
        for (const stopId of stops) {
            const baseName = stopId.split('.').pop()!;
            if (RAPID_STATION_ALIASES[baseName]) {
                for (const aliasId of RAPID_STATION_ALIASES[baseName]) {
                    const normalized = normalizeOdptStationId(aliasId);
                    if (normalized !== normalizeOdptStationId(stopId)) {
                        addEdge(normalizeOdptStationId(stopId), normalized, 'transfer');
                        addEdge(normalized, normalizeOdptStationId(stopId), 'transfer');
                    }
                }
            }
        }
    }

    return adj;
}

const ADJACENCY_CACHE = new WeakMap<object, Map<string, Array<{ to: string; railwayId: string }>>>();

function getAdjacency(railways: RailwayTopology[]) {
    const key = railways as unknown as object;
    const cached = ADJACENCY_CACHE.get(key);
    if (cached) return cached;
    const adj = buildAdjacency(railways);
    ADJACENCY_CACHE.set(key, adj);
    return adj;
}



import { TRANSFER_DATABASE, getTransferDistance, isOutOfStationTransfer, getHubBufferMinutes } from './data/transferDatabase';

type RouteCosts = {
    time: number;
    fare: number;
    transfers: number;           // 總轉乘次數
    hops: number;                // 經過的站數
    railwaySwitches: number;     // 同公司換線次數
    operatorSwitches: number;    // 跨公司轉乘次數
    transferDistance: number;    // 總轉乘距離 (公尺)
    crowding: number;            // 擁擠度得分 (0-100)
};

function operatorKeyFromRailwayId(railwayId: string): string {
    if (railwayId.includes('TokyoMetro')) return 'TokyoMetro';
    if (railwayId.includes('JR-East')) return 'JR-East';
    if (railwayId.includes('Toei')) return 'Toei';
    return 'Other';
}

function baseFareForOperator(operatorKey: string): number {
    if (operatorKey === 'JR-East') return 150;
    if (operatorKey === 'TokyoMetro') return 180;
    if (operatorKey === 'Toei') return 180;
    return 180;
}

function perHopFareForOperator(operatorKey: string): number {
    if (operatorKey === 'JR-East') return 10;
    if (operatorKey === 'TokyoMetro') return 12;
    if (operatorKey === 'Toei') return 12;
    return 12;
}

/**
 * 基於距離（以站數估算）計算票價
 * JR/Metro/Toei 票價都是基於距離，同公司內換乘票價一致
 * 
 * JR 東日本東京圈票價表（IC卡）：
 * 1-3km: ¥140, 4-6km: ¥160, 7-10km: ¥170, 11-15km: ¥200, 16-20km: ¥220
 * 
 * Tokyo Metro 票價表（IC卡）：
 * 1-6km: ¥180, 7-11km: ¥200, 12-19km: ¥250, 20-27km: ¥290, 28km+: ¥330
 */
function estimateFareByDistance(operatorKey: string, hops: number): number {
    // 平均每站距離約 1.5km
    const estimatedKm = hops * 1.5;

    if (operatorKey === 'JR-East') {
        // JR 東日本票價區間
        if (estimatedKm <= 3) return 150;
        if (estimatedKm <= 6) return 170;
        if (estimatedKm <= 10) return 180;
        if (estimatedKm <= 15) return 210;
        if (estimatedKm <= 20) return 240;
        if (estimatedKm <= 25) return 260;
        if (estimatedKm <= 30) return 300;
        return 340;
    } else if (operatorKey === 'TokyoMetro') {
        // Tokyo Metro 票價區間
        if (estimatedKm <= 6) return 180;
        if (estimatedKm <= 11) return 210;
        if (estimatedKm <= 19) return 260;
        if (estimatedKm <= 27) return 300;
        return 340;
    } else if (operatorKey === 'Toei') {
        // 都營地下鐵票價區間
        if (estimatedKm <= 4) return 180;
        if (estimatedKm <= 8) return 220;
        if (estimatedKm <= 12) return 270;
        if (estimatedKm <= 16) return 320;
        return 380;
    }
    return 200;
}

export interface TrafficCondition {
    railwayId: string;
    status: 'Normal' | 'Delays' | 'Suspended';
    delayMinutes: number;
    text?: string;
}

// Phase 4: Wait Value Time (WVT) - Informational Layer
export type AmenityTier = 'S' | 'A' | 'B' | 'C';

interface StationFacility {
    tier: AmenityTier;
    facilities: {
        netCafe?: string;
        hotel?: string;
        restaurant24h?: string;
        convenienceStore?: string;
    };
    lastTrainNote?: Partial<Record<SupportedLocale, string>>;
}

const STATION_FACILITIES: Record<string, StationFacility> = {
    'Shinjuku': {
        tier: 'S',
        facilities: {
            netCafe: '快活CLUB 新宿西口店 (24h)',
            hotel: 'First Cabin 新宿 (膠囊旅館)',
            restaurant24h: 'すき家、松屋、吉野家 (24h)',
            convenienceStore: '7-11, FamilyMart (站內多家)',
        },
        lastTrainNote: {
            ja: '西口地下に24時間営業のネットカフェやカプセルホテルがあります',
            en: 'West exit underground has 24h net cafes and capsule hotels',
            'zh-TW': '西口地下街有多家 24h 網咖和膠囊旅館',
        },
    },
    'Shibuya': {
        tier: 'S',
        facilities: {
            netCafe: '快活CLUB 渋谷道玄坂店 (24h)',
            hotel: 'The Millennials Shibuya (膠囊)',
            restaurant24h: 'すき家、マクドナルド (24h)',
        },
        lastTrainNote: {
            ja: '道玄坂エリアに24時間営業の店舗が多数',
            en: 'Dogenzaka area has many 24h establishments',
            'zh-TW': '道玄坂區有多家 24h 營業店家',
        },
    },
    'Ikebukuro': {
        tier: 'A',
        facilities: {
            netCafe: '快活CLUB 池袋東口店 (24h)',
            hotel: 'Booth Net Cafe & Capsule',
            restaurant24h: '松屋、なか卯 (24h)',
        },
        lastTrainNote: {
            ja: '東口・西口ともにネットカフェあり',
            en: 'Net cafes available at both East and West exits',
            'zh-TW': '東口、西口皆有網咖',
        },
    },
    'Tokyo': {
        tier: 'S',
        facilities: {
            convenienceStore: 'NewDays, KIOSK (站內)',
            restaurant24h: '周辺に24h店舗少なめ',
        },
        lastTrainNote: {
            ja: '八重洲口側にビジネスホテル多数。終電後は周辺が静か',
            en: 'Many business hotels on Yaesu side. Area quiet after last train',
            'zh-TW': '八重洲口有多家商務旅館，末班車後周邊較為安靜',
        },
    },
    'Ueno': {
        tier: 'A',
        facilities: {
            netCafe: '快活CLUB 上野広小路店 (24h)',
            hotel: 'カプセルホテル上野',
        },
        lastTrainNote: {
            ja: '御徒町方面に24時間営業の店舗あり',
            en: 'Okachimachi direction has 24h shops',
            'zh-TW': '御徒町方向有 24h 店家',
        },
    },
    'Akihabara': {
        tier: 'A',
        facilities: {
            netCafe: '@home cafe, 各種ネットカフェ多数',
            restaurant24h: 'すき家、松屋 (24h)',
        },
        lastTrainNote: {
            ja: '電気街口周辺にネットカフェ多数',
            en: 'Many net cafes around Electric Town exit',
            'zh-TW': '電器街口附近有多家網咖',
        },
    },
    'Shinagawa': {
        tier: 'A',
        facilities: {
            hotel: '京品ホテル、アパホテル',
            convenienceStore: 'NewDays (站內)',
        },
        lastTrainNote: {
            ja: '港南口にビジネスホテル集中',
            en: 'Business hotels concentrated at Konan exit',
            'zh-TW': '港南口有多家商務旅館',
        },
    },
    'Yokohama': {
        tier: 'A',
        facilities: {
            netCafe: '快活CLUB 横浜西口店 (24h)',
            hotel: '東横イン横浜西口',
            restaurant24h: 'すき家、松屋 (24h)',
        },
        lastTrainNote: {
            ja: '西口にネットカフェとビジネスホテルあり',
            en: 'Net cafes and business hotels at West exit',
            'zh-TW': '西口有網咖和商務旅館',
        },
    },
    // === Additional Stations (Expansion) ===
    'Roppongi': {
        tier: 'A',
        facilities: {
            netCafe: 'BAGUS 六本木店 (24h)',
            restaurant24h: '24h 餐廳多 (夜店區)',
        },
        lastTrainNote: {
            ja: '夜遊びエリアなので24時間営業の店が多い',
            en: 'Nightlife area with many 24h establishments',
            'zh-TW': '夜生活區，24h 營業店家多',
        },
    },
    'Ebisu': {
        tier: 'B',
        facilities: {
            restaurant24h: 'すき家、松屋 (24h)',
            convenienceStore: 'FamilyMart, 7-11',
        },
        lastTrainNote: {
            ja: '西口方面に飲食店あり',
            en: 'Restaurants around West exit',
            'zh-TW': '西口方向有餐廳',
        },
    },
    'Nakano': {
        tier: 'B',
        facilities: {
            netCafe: '快活CLUB 中野店 (24h)',
            restaurant24h: '松屋、日高屋 (24h)',
        },
        lastTrainNote: {
            ja: '北口サンモール近くにネットカフェあり',
            en: 'Net cafe near North exit Sun Mall',
            'zh-TW': '北口 Sun Mall 附近有網咖',
        },
    },
    'Kichijoji': {
        tier: 'B',
        facilities: {
            netCafe: '快活CLUB 吉祥寺店 (24h)',
            restaurant24h: 'すき家、松屋 (24h)',
        },
        lastTrainNote: {
            ja: '北口にネットカフェ・カラオケあり',
            en: 'Net cafes and karaoke at North exit',
            'zh-TW': '北口有網咖、卡拉OK',
        },
    },
    'Machida': {
        tier: 'B',
        facilities: {
            netCafe: '快活CLUB 町田店 (24h)',
            hotel: 'ホテル町田ヴィラ',
        },
        lastTrainNote: {
            ja: '小田急側にネットカフェあり',
            en: 'Net cafe near Odakyu side',
            'zh-TW': '小田急側有網咖',
        },
    },
    'Omiya': {
        tier: 'A',
        facilities: {
            netCafe: '快活CLUB 大宮東口店 (24h)',
            hotel: '東横イン大宮',
            restaurant24h: 'すき家、松屋 (24h)',
        },
        lastTrainNote: {
            ja: '東口に深夜営業の店舗集中',
            en: 'Late-night establishments at East exit',
            'zh-TW': '東口有多家深夜營業店家',
        },
    },
    'Asakusa': {
        tier: 'B',
        facilities: {
            hotel: 'カプセルホテル浅草',
            convenienceStore: 'FamilyMart, Lawson',
        },
        lastTrainNote: {
            ja: '雷門周辺にカプセルホテルあり。深夜は静か',
            en: 'Capsule hotels near Kaminarimon. Quiet at night',
            'zh-TW': '雷門附近有膠囊旅館，深夜較安靜',
        },
    },
    'Ginza': {
        tier: 'B',
        facilities: {
            restaurant24h: '周辺は高級店多く深夜営業少なめ',
        },
        lastTrainNote: {
            ja: '深夜は新橋方面に移動した方が店舗多い',
            en: 'Move towards Shinbashi for more late-night options',
            'zh-TW': '深夜建議往新橋方向，店家較多',
        },
    },
    'Oshiage': {
        tier: 'B',
        facilities: {
            convenienceStore: 'FamilyMart (東京晴空塔內)',
        },
        lastTrainNote: {
            ja: 'スカイツリー内の店舗は閉まるので押上駅周辺へ',
            en: 'Skytree shops close late; head to Oshiage station area',
            'zh-TW': '晴空塔內店鋪會打烊，請往押上站周邊',
        },
    },
    'Odaiba': {
        tier: 'C',
        facilities: {
            hotel: '大江戸温泉物語 (宿泊可)',
        },
        lastTrainNote: {
            ja: '終電後は大江戸温泉で仮眠可能。他の施設は少ない',
            en: 'Oedo Onsen allows overnight stay. Few other options',
            'zh-TW': '末班車後可在大江戶溫泉過夜，其他設施較少',
        },
    },
    'Hachioji': {
        tier: 'B',
        facilities: {
            netCafe: '快活CLUB 八王子店 (24h)',
            hotel: '東横イン八王子',
        },
        lastTrainNote: {
            ja: '北口にネットカフェとビジネスホテルあり',
            en: 'Net cafe and business hotels at North exit',
            'zh-TW': '北口有網咖和商務旅館',
        },
    },
    'Tachikawa': {
        tier: 'B',
        facilities: {
            netCafe: '快活CLUB 立川店 (24h)',
            restaurant24h: 'すき家、松屋 (24h)',
        },
        lastTrainNote: {
            ja: '南口・北口両方に深夜営業店舗あり',
            en: 'Late-night shops at both South and North exits',
            'zh-TW': '南口、北口皆有深夜營業店家',
        },
    },
};

function getAmenityTier(stationId: string): AmenityTier {
    for (const [key, facility] of Object.entries(STATION_FACILITIES)) {
        if (stationId.includes(`.${key}`)) return facility.tier;
    }
    return 'B';
}

function getStationFacility(stationId: string): StationFacility | null {
    for (const [key, facility] of Object.entries(STATION_FACILITIES)) {
        if (stationId.includes(`.${key}`)) return facility;
    }
    return null;
}

/**
 * Build suggestion for last-train/late-night scenarios.
 * Returns null if not applicable (not late night or no facility data).
 */
export function buildLastTrainSuggestion(params: {
    stationId: string;
    currentTime: Date;
    locale: SupportedLocale;
}): L4Suggestion | null {
    const hour = params.currentTime.getHours();
    const isLateNight = hour >= 23 || hour < 5; // 23:00 - 05:00

    if (!isLateNight) return null;

    const facility = getStationFacility(params.stationId);
    if (!facility) return null;

    const steps: RouteStep[] = [];
    const locale = params.locale;

    // Build facility info steps
    if (facility.facilities.netCafe) {
        steps.push({ kind: 'info', text: `🖥️ ${facility.facilities.netCafe}`, icon: '🖥️' });
    }
    if (facility.facilities.hotel) {
        steps.push({ kind: 'info', text: `🏨 ${facility.facilities.hotel}`, icon: '🏨' });
    }
    if (facility.facilities.restaurant24h) {
        steps.push({ kind: 'info', text: `🍜 ${facility.facilities.restaurant24h}`, icon: '🍜' });
    }
    if (facility.facilities.convenienceStore) {
        steps.push({ kind: 'info', text: `🏪 ${facility.facilities.convenienceStore}`, icon: '🏪' });
    }

    // Add note
    if (facility.lastTrainNote) {
        const note = facility.lastTrainNote[locale] || facility.lastTrainNote['zh-TW'];
        steps.push({ kind: 'info', text: `💡 ${note}`, icon: '💡' });
    }

    if (steps.length === 0) return null;

    const titles: Record<SupportedLocale, string> = {
        ja: '🌙 終電後のご案内',
        en: '🌙 After Last Train',
        zh: '🌙 末班车后建议',
        'zh-TW': '🌙 末班車後建議',
        ar: '🌙 بعد آخر قطار',
    };

    return {
        title: titles[locale] || titles['zh-TW'],
        options: [{
            label: titles[locale] || titles['zh-TW'],
            steps,
            sources: [{ type: 'odpt:Railway', verified: false }]
        }]
    };
}

// Removed: getAmenityMultiplier - WVT no longer affects routing weights

function edgeTimeMinutes(railwayId: string, conditions?: Map<string, TrafficCondition>): number {
    if (railwayId === 'transfer') return 5;

    // Check traffic conditions
    if (conditions && conditions.has(railwayId)) {
        const cond = conditions.get(railwayId)!;
        if (cond.status === 'Suspended') return Infinity;
        // If delayed, we add a fraction of delay per edge?
        // Better: The caller handles the "initial wait" penalty.
        // Here we just add a small "slowdown" factor if trains are running slower.
        // For MVP, we assume running time is same, but intervals are longer (wait time).
        // So we keep edge time same, but caller adds penalty.
    }

    // Check if this is a rapid service pattern with defined avgMinutesPerEdge
    const rapidPattern = RAPID_SERVICE_PATTERNS.find(p => p.railwayId === railwayId);
    if (rapidPattern) {
        return rapidPattern.avgMinutesPerEdge;
    }

    // Fallback for general rapid detection
    const isRapid = railwayId.includes('Rapid') || railwayId.includes('Express') ||
        railwayId.includes('LimitedExpress') || railwayId.includes('Shinkansen') ||
        railwayId.includes('SpecialRapid');

    // Core metro lines have short station intervals
    const isCoreMetro = railwayId.includes('Ginza') || railwayId.includes('Marunouchi') || railwayId.includes('Hibiya');

    if (railwayId.includes('TokyoMetro') || railwayId.includes('Toei')) {
        if (isCoreMetro) return 1.5;
        return isRapid ? 2.5 : 1.8;
    }
    if (railwayId.includes('JR-East')) {
        return isRapid ? 4.0 : 2.0; // Tuned: Rapid slightly slower, Local faster
    }
    // Private railways (Tobu, Seibu, Keio, Odakyu, etc.)
    if (railwayId.includes('Tobu') || railwayId.includes('Seibu') ||
        railwayId.includes('Keio') || railwayId.includes('Odakyu')) {
        return isRapid ? 5.0 : 2.2;
    }
    return 2.5;
}

function buildLabelHelpers(params: { railways: RailwayTopology[]; locale: SupportedLocale }) {
    const { railways, locale } = params;
    const stationTitleMap = new Map<string, string>();
    const railwayTitleMap = new Map<string, string>();

    railways.forEach(r => {
        const rTitle =
            locale === 'ja'
                ? r.title?.ja
                : locale === 'en'
                    ? r.title?.en
                    : (r.title?.['zh-TW'] || r.title?.ja || r.title?.en);
        if (rTitle) railwayTitleMap.set(normalizeOdptStationId(r.railwayId), rTitle);

        r.stationOrder.forEach(s => {
            const sTitle =
                locale === 'ja'
                    ? s.title?.ja
                    : locale === 'en'
                        ? s.title?.en
                        : (s.title?.['zh-TW'] || s.title?.ja || s.title?.en);
            if (sTitle) stationTitleMap.set(normalizeOdptStationId(s.station), sTitle);
        });
    });

    const stationLabel = (stationId: string) => {
        const normalized = normalizeOdptStationId(stationId);
        if (stationTitleMap.has(normalized)) return stationTitleMap.get(normalized)!;
        const raw = normalized.split(':').pop() || normalized;
        const parts = raw.split('.');
        return parts[parts.length - 1] || raw;
    };

    const railwayLabel = (railwayId: string) => {
        const normalized = normalizeOdptStationId(railwayId);
        if (railwayTitleMap.has(normalized)) return railwayTitleMap.get(normalized)!;
        const raw = String(railwayId || '').split(':').pop() || String(railwayId || '');
        const parts = raw.split('.');
        return parts[parts.length - 1] || raw;
    };

    return { stationLabel, railwayLabel };
}

function encodeStateKey(station: string, lastRailway: string | null, lastOperator: string | null): string {
    return `${station}\u0001${lastRailway || ''}\u0001${lastOperator || ''}`;
}

function decodeStateKey(key: string): { station: string; lastRailway: string | null; lastOperator: string | null } {
    const [station, lastRailway, lastOperator] = key.split('\u0001');
    return {
        station,
        lastRailway: lastRailway ? lastRailway : null,
        lastOperator: lastOperator ? lastOperator : null,
    };
}

function buildRouteOptionFromPath(params: {
    path: string[];
    edgeRailways: string[];
    railways: RailwayTopology[];
    locale: SupportedLocale;
    label: string;
    costs: RouteCosts;
}): RouteOption {
    const { path, edgeRailways, railways, locale, label, costs } = params;
    const t = (zh: string, ja: string, en: string) => (locale === 'ja' ? ja : locale === 'en' ? en : zh);
    const { stationLabel, railwayLabel } = buildLabelHelpers({ railways, locale });

    const origin = path[0];
    const dest = path[path.length - 1];
    const steps: RouteStep[] = [
        {
            kind: 'origin',
            text: `${t('出發', '出発', 'Origin')}: ${stationLabel(origin)}`,
            icon: '🏠',
        },
    ];

    let currentRailway = edgeRailways.length > 0 ? edgeRailways[0] : '';
    let segmentStart = origin;

    for (let i = 0; i < edgeRailways.length; i++) {
        const rw = edgeRailways[i];
        if (rw !== currentRailway) {
            const segmentEnd = path[i];
            if (currentRailway === 'transfer') {
                steps.push({ kind: 'transfer', text: `${t('站內轉乘', '乗換', 'Transfer')}`, icon: '🚶' });
            } else {
                steps.push({
                    kind: 'train',
                    text: `${t('乘坐', '乗車', 'Take')} ${railwayLabel(currentRailway)}: ${stationLabel(segmentStart)} → ${stationLabel(segmentEnd)}`,
                    railwayId: currentRailway,
                    icon: '🚃',
                });
            }
            currentRailway = rw;
            segmentStart = segmentEnd;
        }
    }

    if (currentRailway !== '') {
        const lastEnd = dest;
        if (currentRailway === 'transfer') {
            steps.push({ kind: 'transfer', text: `${t('站內轉乘', '乗換', 'Transfer')}`, icon: '🚶' });
        } else {
            steps.push({
                kind: 'train',
                text: `${t('乘坐', '乗車', 'Take')} ${railwayLabel(currentRailway)}: ${stationLabel(segmentStart)} → ${stationLabel(lastEnd)}`,
                railwayId: currentRailway,
                icon: '🚃',
            });
        }
    }

    steps.push({ kind: 'destination', text: `${t('到達', '到着', 'Destination')}: ${stationLabel(dest)}`, icon: '📍' });

    const uniqueRailways = Array.from(new Set(edgeRailways.filter(rw => rw !== 'transfer')));
    const transfers = edgeRailways.filter(rw => rw === 'transfer').length;

    // 計算每個運營商的總 hops，基於距離估算票價
    const hopsByOperator: Record<string, number> = {};
    for (const rw of edgeRailways) {
        if (rw === 'transfer') continue;
        const op = operatorKeyFromRailwayId(rw);
        hopsByOperator[op] = (hopsByOperator[op] || 0) + 1;
    }

    let totalFare = 0;
    for (const [op, hopCount] of Object.entries(hopsByOperator)) {
        totalFare += estimateFareByDistance(op, hopCount);
    }

    return {
        label,
        steps,
        sources: [{ type: 'odpt:Railway', verified: true }],
        railways: uniqueRailways,
        transfers,
        duration: Math.max(1, Math.round(costs.time)),
        fare: { ic: Math.max(0, Math.round(totalFare)), ticket: Math.max(0, Math.round(totalFare + 10)) },
    };
}

function dijkstraBestPath(params: {
    origins: string[];
    dests: string[];
    adj: Map<string, Array<{ to: string; railwayId: string }>>;
    maxHops: number;
    score: (c: RouteCosts) => number;
    trafficConditions?: Map<string, TrafficCondition>;
}): { path: string[]; edgeRailways: string[]; costs: RouteCosts } | null {
    const { origins, dests, adj, maxHops, score, trafficConditions } = params;

    const dist = new Map<string, number>(); // gScore: actual cost from start
    const costsByKey = new Map<string, RouteCosts>();
    const prev = new Map<string, { prevKey: string; fromStation: string; viaRailwayId: string }>();

    // PriorityQueue stores { element: stateKey, priority: fScore }
    // fScore = gScore + h(n)
    const pq = new PriorityQueue<string>();

    const destSet = new Set(dests);
    const BASE_WAIT_TIME = 2.0;

    for (const origin of origins) {
        const startKey = encodeStateKey(origin, null, null);
        dist.set(startKey, 0);
        costsByKey.set(startKey, {
            time: 0,
            fare: 0,
            transfers: 0,
            hops: 0,
            railwaySwitches: 0,
            operatorSwitches: 0,
            transferDistance: 0,
            crowding: 20
        });

        // Initial heuristic
        const h = calculateHeuristic(origin, dests);
        pq.push(startKey, h);
    }

    while (!pq.isEmpty) {
        const currentKey = pq.pop()!;
        const currentCosts = costsByKey.get(currentKey);

        // If state was updated after being added to PQ, skip if current extraction is stale
        // (Not strictly necessary if we don't support updating priority, but standard optimization)
        // With generic PQ, we can't easily check "staleness" without tracking visited set or current best gScore check.
        // We check if current gScore > known best gScore.
        // Wait, dist.get(currentKey) IS the best known.
        // The issue is if we pushed the specific key multiple times.
        // Our PQ doesn't deduplicate.
        // So we strictly check:
        // Actually, we don't store "gScore" in the node, so we rely on dist map.

        if (!currentCosts) continue;

        // Verify if we found a destination
        const decoded = decodeStateKey(currentKey);
        if (destSet.has(decoded.station)) {
            const path: string[] = [decoded.station];
            const edgeRailways: string[] = [];
            let k = currentKey;
            while (costsByKey.get(k)?.hops! > 0) {
                const p = prev.get(k);
                if (!p) break;
                edgeRailways.unshift(p.viaRailwayId);
                path.unshift(p.fromStation);
                k = p.prevKey;
            }
            return { path, edgeRailways, costs: currentCosts };
        }

        if (currentCosts.hops >= maxHops) continue;
        const edges = adj.get(decoded.station) || [];

        for (const edge of edges) {
            const nextStation = edge.to;
            const viaRailwayId = edge.railwayId;

            // Traffic Check: If Suspended, skip edge
            let trafficDelay = 0;
            if (trafficConditions && trafficConditions.has(viaRailwayId)) {
                const cond = trafficConditions.get(viaRailwayId)!;
                if (cond.status === 'Suspended') continue; // Skip suspended lines
                if (cond.status === 'Delays') {
                    // For edges, we don't add full delay (that's for boarding).
                    // We can add a small congestion factor if needed, but for now 0.
                }
            }

            // Calculate Edge Time
            const edgeTime = edgeTimeMinutes(viaRailwayId, trafficConditions);
            if (edgeTime === Infinity) continue; // Safety check

            const nextCosts: RouteCosts = {
                time: currentCosts.time,
                fare: currentCosts.fare,
                transfers: currentCosts.transfers,
                hops: currentCosts.hops + 1,
                railwaySwitches: currentCosts.railwaySwitches,
                operatorSwitches: currentCosts.operatorSwitches,
                transferDistance: currentCosts.transferDistance,
                crowding: currentCosts.crowding,
            };

            if (viaRailwayId === 'transfer') {
                const decoded = decodeStateKey(currentKey);
                const fromStationId = decoded.station;
                const toStationId = nextStation;
                const fromOp = inferOdptOperatorFromStationId(fromStationId);
                const toOp = inferOdptOperatorFromStationId(toStationId);

                // 從資料庫獲取精確轉乘資訊
                const stationIdParts = nextStation.split(':');
                const lineAndStation = stationIdParts[1] || '';
                const lineParts = lineAndStation.split('.');
                const operator = lineParts[0];
                const line = lineParts[1];
                const toLineId = `odpt.Railway:${operator}.${line}`;

                const distance = getTransferDistance(fromStationId, toLineId);
                const isOutStation = isOutOfStationTransfer(fromStationId, toLineId);

                let transferTime = distance / 60; // 稍微提高步行速度至 60m/min (東京節奏)

                if (isOutStation) {
                    transferTime += 2; // 降低站外轉乘額外懲罰 (3 -> 2)
                }

                if (fromOp && toOp && fromOp !== toOp) {
                    transferTime += 1.5; // 跨公司購票/閘門時間 (2 -> 1.5)
                    nextCosts.operatorSwitches += 1;
                }

                // 加上大型車站補償，但對於短途行程進行衰減
                let hubBuffer = getHubBufferMinutes(fromStationId);
                if (currentCosts.hops < 4) {
                    hubBuffer *= 0.4; // 極短途行程進一步減少樞紐補償
                } else if (currentCosts.hops < 8) {
                    hubBuffer *= 0.7;
                }
                transferTime += hubBuffer;

                // === TPI Integration ===
                // Look up baseTpi from TRANSFER_DATABASE and add normalized penalty
                const stationTransfers = TRANSFER_DATABASE[fromStationId];
                if (stationTransfers && stationTransfers[toLineId]) {
                    const tpiData = stationTransfers[toLineId];
                    // Add baseTpi / 10 as additional time penalty (TPI 60 = 6 min extra)
                    transferTime += (tpiData.baseTpi || 0) / 10;
                    // Add floor difference penalty
                    transferTime += (tpiData.floorDifference || 0) * 0.5;
                }

                nextCosts.time += transferTime;
                nextCosts.transfers += 1;
                nextCosts.transferDistance += distance;
            } else {
                const operatorKey = operatorKeyFromRailwayId(viaRailwayId);
                const isRailwaySwitch = decoded.lastRailway && decoded.lastRailway !== viaRailwayId;
                const isOperatorSwitch = decoded.lastOperator && decoded.lastOperator !== operatorKey;

                let boardingPenalty = 0;
                let lineWaitTime = (viaRailwayId.includes('TokyoMetro') || viaRailwayId.includes('Toei'))
                    ? BASE_WAIT_TIME * 0.6  // 地鐵班次更密 (0.7 -> 0.6)
                    : BASE_WAIT_TIME;

                // Add Traffic Delay if boarding/switching to this line
                if (isRailwaySwitch || !decoded.lastRailway) {
                    if (trafficConditions && trafficConditions.has(viaRailwayId)) {
                        const cond = trafficConditions.get(viaRailwayId)!;
                        if (cond.status === 'Delays') {
                            lineWaitTime += cond.delayMinutes; // Add full delay to wait time
                        }
                    }
                }

                // Phase 4: Wait Value Time (WVT) - REMOVED FROM ROUTING LOGIC
                // WVT should be an informational layer for末班車/長等待 scenarios,
                // not a path weight modifier. AmenityTier data is preserved for L4 Knowledge.
                // See: Sequential Thinking analysis on TPI vs WVT relationship.

                if (currentCosts.hops < 4) {
                    lineWaitTime *= 0.6; // 極短途通常發生在繁華區，班次更密且用戶通常會趕車
                }

                if (isRailwaySwitch) {
                    // 同站換線，但不是透過 'transfer' 邊
                    boardingPenalty = 2 + lineWaitTime; // 換線基礎時間降低 (3 -> 2)
                    nextCosts.transfers += 1;
                    if (isOperatorSwitch) {
                        nextCosts.operatorSwitches += 1;
                    } else {
                        nextCosts.railwaySwitches += 1;
                    }
                } else if (!decoded.lastRailway) {
                    // 第一次上車
                    boardingPenalty = lineWaitTime;
                }

                nextCosts.time += edgeTime + boardingPenalty; // Use calculated edgeTime
                // nextCosts.time += edgeTimeMinutes(viaRailwayId) + boardingPenalty; // Original line

                // 擁擠度簡單估算：某些線路較擁擠
                if (viaRailwayId.includes('Yamanote') || viaRailwayId.includes('Chuo')) {
                    nextCosts.crowding = Math.min(100, nextCosts.crowding + 5);
                }
            }

            const nextLastRailway = viaRailwayId === 'transfer' ? decoded.lastRailway : viaRailwayId;
            const nextLastOperator =
                viaRailwayId === 'transfer' ? decoded.lastOperator : operatorKeyFromRailwayId(viaRailwayId);

            const nextKey = encodeStateKey(nextStation, nextLastRailway, nextLastOperator);
            // Calculate new gScore (cost from start)
            // Note: 'score' function returns the weighted cost of the PATH, not just the edge.
            // Wait, let's verify how 'score' input is constructed.
            // It takes 'nextCosts'. 'nextCosts' accumulates time/transfers/etc.
            // So 'score(nextCosts)' is the g(n) for the neighbor.
            const newGScore = score(nextCosts);
            const currentBestG = dist.get(nextKey);

            if (currentBestG === undefined || newGScore < currentBestG) {
                dist.set(nextKey, newGScore);
                costsByKey.set(nextKey, nextCosts);
                prev.set(nextKey, { prevKey: currentKey, fromStation: decoded.station, viaRailwayId });

                // A*: f(n) = g(n) + h(n)
                const hScore = calculateHeuristic(nextStation, dests);
                const fScore = newGScore + hScore;

                pq.push(nextKey, fScore);
            }
        }
    }

    return null;
}

export function enrichRoutesWithL4Scores(
    routes: RouteOption[],
    userDemand: L4DemandState,
    locale: string = 'zh'
): EnrichedRouteOption[] {
    return routes.map(route => {
        // 1. Calculate TPI (Transfer Pain Index)
        // For simplicity, we aggregate TPIs of all transfers in the route
        // In a real app, we might want to show TPI per transfer
        let totalTpiScore = 0;
        let transferCount = 0;

        route.steps.forEach(step => {
            if (step.kind === 'transfer') {
                // Mocking TPI input based on demand
                const tpiInput: TPIInput = {
                    transfer: {
                        fromStationId: 'mock-station',
                        fromLineId: 'mock-line-a',
                        toStationId: 'mock-station',
                        toLineId: 'mock-line-b',
                        walkingDistanceMeters: 300,
                        floorDifference: 2,
                        verticalMethod: 'stairs' as const,
                        complexity: {
                            turnCount: 3,
                            signageClarity: 2,
                            exitCount: 8,
                            underConstruction: false
                        },
                        baseTpi: 20,
                        peakHourMultiplier: 1.2
                    },
                    crowdLevel: 'normal' as const,
                    userHasLuggage: userDemand.largeLuggage,
                    userAccessibilityNeeds: {
                        wheelchair: userDemand.wheelchair || false,
                        stroller: userDemand.stroller || false,
                        elderly: userDemand.senior || false,
                        visualImpairment: false
                    }
                };

                const tpiResult = calcTransferPainIndex(tpiInput, undefined, locale);
                totalTpiScore += tpiResult.score;
                transferCount++;
            }
        });

        const avgTpi = transferCount > 0 ? totalTpiScore / transferCount : 0;
        // Mock TPI result for the whole route
        const routeTpi: TPIResult = {
            score: Math.round(avgTpi),
            level: avgTpi <= 20 ? 'easy' : avgTpi <= 40 ? 'normal' : avgTpi <= 60 ? 'hard' : avgTpi <= 80 ? 'difficult' : 'extreme',
            breakdown: { distance: 20, vertical: 20, complexity: 20, crowd: 20, userModifier: 20 },
            recommendation: '這是一條評估後的路徑建議'
        };

        // 2. Calculate CDR (Cascade Delay Risk)
        const legs: JourneyLeg[] = [];
        let currentTime = new Date();

        route.steps.forEach((step, i) => {
            if (step.kind === 'train') {
                legs.push({
                    line: step.railwayId || 'unknown',
                    lineName: step.text,
                    fromStation: 'station-a',
                    toStation: 'station-b',
                    scheduledDeparture: new Date(currentTime.getTime()),
                    scheduledArrival: new Date(currentTime.getTime() + 10 * 60000),
                    currentDelayMinutes: 0
                });
                currentTime = new Date(currentTime.getTime() + 15 * 60000); // 10 min travel + 5 min buffer
            }
        });

        const cdrResult = calcCascadeDelayRisk(legs, locale);

        return {
            ...route,
            transfers: route.transfers || 0,
            tpi: routeTpi,
            cdr: cdrResult
        };
    });
}

export function findRankedRoutes(params: {
    originStationId: string | string[];
    destinationStationId: string | string[];
    railways: RailwayTopology[];
    maxHops?: number;
    locale?: SupportedLocale;
    userDemand?: L4DemandState; // Added userDemand
    trafficConditions?: TrafficCondition[]; // New input for dynamic traffic
}): EnrichedRouteOption[] {
    const originIds = Array.isArray(params.originStationId)
        ? params.originStationId.map(normalizeOdptStationId)
        : [normalizeOdptStationId(params.originStationId)];
    const destIds = Array.isArray(params.destinationStationId)
        ? params.destinationStationId.map(normalizeOdptStationId)
        : [normalizeOdptStationId(params.destinationStationId)];

    const railways = params.railways || [];
    const maxHops = Math.max(4, params.maxHops ?? 30);
    const locale = params.locale || 'zh-TW';
    const t = (zh: string, ja: string, en: string) => (locale === 'ja' ? ja : locale === 'en' ? en : zh);

    const TRANSFER_THRESHOLD = 150; // 建議步行轉乘上限 (公尺)

    const candidates: Array<{ key: string; label: string; score: (c: RouteCosts) => number }> = [
        {
            key: 'smart',
            label: t('最佳建議', 'おすすめ', 'Best Route'),
            score: (c) => {
                // 1. 實際行程時間 (65% 權重) - 提高時間權重以更精確匹配 Google Maps
                const timeScore = c.time * 0.65;

                // 2. 轉乘次數 (15% 權重) - 每次轉乘約等同於 6 分鐘乘車痛感
                const transferScore = c.transfers * 6 * 0.15;

                // 3. 轉乘距離與補償 (15% 權重)
                let distancePenalty = 0;
                if (c.transferDistance > TRANSFER_THRESHOLD) {
                    distancePenalty = (c.transferDistance - TRANSFER_THRESHOLD) * 1.5;
                }
                const distanceScore = (c.transferDistance / 100 * 5 + distancePenalty) * 0.15;

                // 4. 列車擁擠度 (5% 權重)
                const crowdScore = (c.crowding / 10) * 0.05;

                return timeScore + transferScore + distanceScore + crowdScore;
            },
        },
        {
            key: 'fastest',
            label: t('最快到達', '最速', 'Fastest'),
            score: (c) => c.time + c.transfers * 3, // 極度追求時間，轉乘懲罰極低
        },
        {
            key: 'fewest_transfers',
            label: t('最少轉乘', '乗換最少', 'Fewest transfers'),
            score: (c) => c.transfers * 1000 + c.time,
        },
        {
            key: 'comfort',
            label: t('最舒適', 'らくらく', 'Comfortable'),
            score: (c) => c.transfers * 60 + c.transferDistance * 0.3 + c.time, // 極度厭惡轉乘與步行
        },
    ];

    const results: RouteOption[] = [];
    const signatureToIndex = new Map<string, number>();
    const usedLabels = new Set<string>();
    const adj = getAdjacency(railways);
    const trafficMap = params.trafficConditions
        ? new Map(params.trafficConditions.map(c => [c.railwayId, c]))
        : undefined;

    for (const cand of candidates) {
        const found = dijkstraBestPath({
            origins: originIds,
            dests: destIds,
            adj,
            maxHops,
            score: cand.score,
            trafficConditions: trafficMap
        });
        if (!found) continue;
        const signature = `${found.path.join('>')}|${found.edgeRailways.join(',')}`;
        const existingIndex = signatureToIndex.get(signature);
        if (typeof existingIndex === 'number') {
            if (results.length < 2 && !usedLabels.has(cand.label)) {
                const base = results[existingIndex];
                results.push({
                    ...base,
                    label: cand.label,
                });
                usedLabels.add(cand.label);
            }
            continue;
        }

        results.push(
            buildRouteOptionFromPath({
                path: found.path,
                edgeRailways: found.edgeRailways,
                railways,
                locale,
                label: cand.label,
                costs: found.costs,
            })
        );
        signatureToIndex.set(signature, results.length - 1);
        usedLabels.add(cand.label);
    }

    if (results.length === 0) {
        return [];
    }

    // Enrich with L4 Scores
    const userDemand = params.userDemand || {
        wheelchair: false, stroller: false, vision: false, senior: false,
        largeLuggage: false, lightLuggage: true,
        rushing: false, budget: false, comfort: true, avoidCrowds: false, avoidRain: false
    };

    return enrichRoutesWithL4Scores(results, userDemand, locale.startsWith('ja') ? 'ja' : locale.startsWith('en') ? 'en' : 'zh');
}

export function findSimpleRoutes(params: {
    originStationId: string | string[];
    destinationStationId: string | string[];
    railways: RailwayTopology[];
    maxHops?: number;
    locale?: SupportedLocale;
}): RouteOption[] {
    return findRankedRoutes(params);
}

export function buildAmenitySuggestion(params: {
    stationId: string;
    stationName?: string; // Optional localized name
    text: string;
    demand: L4DemandState;
    verified: boolean;
}): L4Suggestion {
    const text = params.text.toLowerCase();
    const stationId = normalizeOdptStationId(params.stationId);
    const expertTips: RouteStep[] = [];

    // 1. Generic Amenity Knowledge
    if (text.includes('置物櫃') || text.includes('locker')) {
        expertTips.push({ kind: 'info', text: '提示：車站內的置物櫃通常在上午 10 點前就會客滿，建議利用站外的行李寄放服務。', icon: '💡' });
    }
    if (text.includes('電梯') || text.includes('elevator') || text.includes('輪椅') || text.includes('嬰兒車')) {
        expertTips.push({ kind: 'info', text: '提示：日本車站電梯通常位於月台中段或特定車廂位置，請留意月台上的標示。', icon: '💡' });
    }

    // 2. Station Specific Amenity Knowledge
    if (EXPERT_KNOWLEDGE[stationId]) {
        EXPERT_KNOWLEDGE[stationId].filter(tip =>
            tip.includes('置物櫃') || tip.includes('🦽') || tip.includes('電梯') || tip.includes('📦')
        ).forEach(tip => {
            const icon = tip.match(/^[💡⚠️🦽📦]/)?.[0] || '💡';
            expertTips.push({ kind: 'info', text: tip.replace(/^[💡⚠️🦽📦]\s*/, ''), icon });
        });
    }

    // 3. Accessibility Advice based on demand
    const advice = ACCESSIBILITY_ADVICE[stationId];
    if (advice) {
        if (params.demand.wheelchair && advice.wheelchair) expertTips.push({ kind: 'info', text: advice.wheelchair.replace(/^[🛗]\s*/, ''), icon: '🛗' });
        if (params.demand.stroller && advice.stroller) expertTips.push({ kind: 'info', text: advice.stroller.replace(/^[🛗]\s*/, ''), icon: '🛗' });
    }

    return {
        title: '設施與無障礙建議',
        options: [
            {
                label: '查詢結果',
                steps: expertTips.length > 0 ? expertTips : [{ kind: 'info', text: '目前無特定設施建議，請參考車站平面圖。', icon: 'ℹ️' }],
                sources: [{ type: 'odpt:Railway', verified: params.verified }]
            }
        ]
    };
}

export function buildStatusSuggestion(params: {
    stationId: string;
    stationName?: string; // Optional localized name
    text: string;
    verified: boolean;
}): L4Suggestion {
    const text = params.text.toLowerCase();
    const stationId = normalizeOdptStationId(params.stationId);
    const expertTips: RouteStep[] = [];

    // 1. Line specific status knowledge
    if (text.includes('中央線') || text.includes('chuo')) {
        const tips = EXPERT_KNOWLEDGE['odpt.Railway:JR-East.Chuo'] || [];
        tips.forEach(tip => {
            const icon = tip.match(/^[💡⚠️]/)?.[0] || '💡';
            expertTips.push({ kind: 'info', text: tip.replace(/^[💡⚠️]\s*/, ''), icon });
        });
    }

    return {
        title: '運行狀態與提醒',
        options: [
            {
                label: '實時提醒',
                steps: [
                    { kind: 'info', text: '正在調用 L2 實時 API 獲取最新運行狀態...', icon: '🔍' },
                    ...expertTips
                ],
                sources: [{ type: 'odpt:Railway', verified: params.verified }]
            }
        ]
    };
}

export function buildFareSuggestion(params: {
    originStationId: string;
    originStationName?: string;
    destinationStationId?: string;
    destinationStationName?: string;
    demand: L4DemandState;
    verified: boolean;
}): L4Suggestion {
    const sources: L4DataSource[] = [{ type: 'odpt:RailwayFare', verified: params.verified }];
    const notes: RouteStep[] = [];
    if (params.demand.budget) notes.push({ kind: 'info', text: '以車票/IC 價差為優先比較基準。', icon: '💰' });
    if (params.demand.largeLuggage || params.demand.stroller || params.demand.wheelchair) {
        notes.push({ kind: 'info', text: '若需無障礙/大行李，票價相同時優先「少轉乘」。', icon: '🧳' });
    }
    if (params.demand.rushing) notes.push({ kind: 'info', text: '趕時間時優先「直達或少轉乘」方案。', icon: '🏃' });

    const labelStation = (id: string, name?: string) => {
        if (name) return name;
        const normalized = normalizeOdptStationId(id);
        const raw = normalized.split(':').pop() || normalized;
        const parts = raw.split('.');
        return parts[parts.length - 1] || raw;
    };

    const dest = params.destinationStationId ? labelStation(params.destinationStationId, params.destinationStationName) : '（未指定）';
    return {
        title: '票價建議',
        options: [
            {
                label: '查詢條件',
                steps: [
                    { kind: 'info', text: `from: ${labelStation(params.originStationId, params.originStationName)}`, icon: '🏠' },
                    { kind: 'info', text: `to: ${dest}`, icon: '📍' },
                    ...notes
                ],
                sources
            }
        ]
    };
}

export function buildTimetableSuggestion(params: {
    stationId: string;
    stationName?: string;
    demand: L4DemandState;
    verified: boolean;
}): L4Suggestion {
    const sources: L4DataSource[] = [{ type: 'odpt:StationTimetable', verified: params.verified }];
    const labelStation = (id: string, name?: string) => {
        if (name) return name;
        const normalized = normalizeOdptStationId(id);
        const raw = normalized.split(':').pop() || normalized;
        const parts = raw.split('.');
        return parts[parts.length - 1] || raw;
    };
    const notes: RouteStep[] = [];
    if (params.demand.rushing) notes.push({ kind: 'info', text: '趕時間：以「最近 1–3 班」為主。', icon: '🏃' });
    if (params.demand.largeLuggage || params.demand.stroller || params.demand.wheelchair) {
        notes.push({ kind: 'info', text: '行李/無障礙：可搭配「電梯動線」優先選擇出口與月台。', icon: '🛗' });
    }
    return {
        title: '時刻表建議',
        options: [
            {
                label: '查詢條件',
                steps: [
                    { kind: 'info', text: `station: ${labelStation(params.stationId, params.stationName)}`, icon: '🚉' },
                    { kind: 'info', text: '顯示平日/假日兩套班次', icon: '📅' },
                    ...notes
                ],
                sources
            }
        ]
    };
}

export function buildRouteSuggestion(params: {
    originStationId: string;
    destinationStationId: string;
    demand: L4DemandState;
    verified: boolean;
    options: RouteOption[];
    text?: string; // Added to capture intent
}): L4Suggestion {
    const baseSources: L4DataSource[] = [{ type: 'odpt:Railway', verified: params.verified }];
    const text = (params.text || '').toLowerCase();

    return {
        title: '轉乘/路線建議',
        options: params.options.map(o => {
            const notes: RouteStep[] = [];
            const expertTips: RouteStep[] = [];
            const accessibilityTips: RouteStep[] = [];

            // 0. Special Location Recognition (e.g. Airport)
            if (text.includes('機場') || text.includes('airport') || text.includes('narita')) {
                const tips = EXPERT_KNOWLEDGE['Narita-Airport'] || [];
                tips.forEach(tip => {
                    const icon = tip.match(/^[💡⚠️✈️]/)?.[0] || '💡';
                    expertTips.push({ kind: 'info', text: tip.replace(/^[💡⚠️✈️]\s*/, ''), icon });
                });
            }

            // 1. Collect Expert Knowledge based on railways and stations
            const stations = [normalizeOdptStationId(params.originStationId), normalizeOdptStationId(params.destinationStationId)];
            const railways = o.railways || [];

            railways.forEach(rw => {
                if (EXPERT_KNOWLEDGE[rw]) {
                    EXPERT_KNOWLEDGE[rw].forEach(tip => {
                        const icon = tip.match(/^[💡⚠️🎫]/)?.[0] || '💡';
                        expertTips.push({ kind: 'info', text: tip.replace(/^[💡⚠️🎫]\s*/, ''), icon });
                    });
                }
            });

            stations.forEach(st => {
                if (EXPERT_KNOWLEDGE[st]) {
                    EXPERT_KNOWLEDGE[st].forEach(tip => {
                        const icon = tip.match(/^[💡⚠️📦🦽]/)?.[0] || '💡';
                        expertTips.push({ kind: 'info', text: tip.replace(/^[💡⚠️📦🦽]\s*/, ''), icon });
                    });
                }
            });

            // 2. Collect Accessibility Advice based on demand
            stations.forEach(st => {
                const advice = ACCESSIBILITY_ADVICE[st];
                if (advice) {
                    if (params.demand.wheelchair && advice.wheelchair) accessibilityTips.push({ kind: 'info', text: advice.wheelchair.replace(/^[🛗]\s*/, ''), icon: '🛗' });
                    if (params.demand.stroller && advice.stroller) accessibilityTips.push({ kind: 'info', text: advice.stroller.replace(/^[🛗]\s*/, ''), icon: '🛗' });
                    if (params.demand.largeLuggage && advice.largeLuggage) accessibilityTips.push({ kind: 'info', text: advice.largeLuggage.replace(/^[🛗]\s*/, ''), icon: '🛗' });
                }
            });

            // 3. Peak time warnings
            const now = new Date();
            const hour = now.getHours();
            const isPeak = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);
            if (isPeak && (params.demand.avoidCrowds || params.demand.largeLuggage || params.demand.stroller)) {
                accessibilityTips.push({ kind: 'info', text: '目前正值通勤尖峰時段，車廂內會非常擁擠，建議避開或多加留意。', icon: '⏰' });
            } else if (params.demand.avoidCrowds) {
                accessibilityTips.push({ kind: 'info', text: '建議避開 07:30-09:30 與 17:30-19:30 的尖峰時段。', icon: '⏰' });
            }

            // 4. General demand notes
            if (params.demand.largeLuggage || params.demand.stroller || params.demand.wheelchair) {
                notes.push({ kind: 'info', text: '行李/無障礙：優先建議「少轉乘」與「設有電梯」的路線。', icon: '🧳' });
            }
            if (params.demand.budget) {
                notes.push({ kind: 'info', text: '省錢：跨公司轉乘（如 JR 轉地鐵）票價較高，建議優先選擇同一公司的路線。', icon: '💰' });

                // Add ticket suggestions based on budget demand
                PASS_KNOWLEDGE.forEach(pass => {
                    notes.push({ kind: 'info', text: `推薦票券：${pass.name} (${pass.price}) - ${pass.advice}`, icon: '🎫' });
                });
            }

            // Combine all steps
            const finalSteps = [...o.steps];

            if (expertTips.length > 0) {
                finalSteps.push({ kind: 'info', text: '────────────────', icon: '' });
                finalSteps.push(...expertTips);
            }

            if (accessibilityTips.length > 0 || notes.length > 0) {
                finalSteps.push({ kind: 'info', text: '────────────────', icon: '' });
                finalSteps.push(...accessibilityTips, ...notes);
            }

            return {
                label: o.label,
                steps: finalSteps,
                sources: o.sources.length > 0 ? o.sources : baseSources,
                // Preserve numeric fields for display
                duration: o.duration,
                fare: o.fare,
                transfers: o.transfers,
                railways: o.railways,
                nextDeparture: o.nextDeparture,
            };
        })
    };
}
