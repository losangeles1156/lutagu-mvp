import { useMemo } from 'react';
import { useL1Places, L1Place } from './useL1Places';
import { getLocaleString } from '@/lib/utils/localeUtils';

export interface L1CategorySummary {
    id: string;
    label: { ja: string; en: string; zh: string };
    count: number;
    representative_spots: L1Place[];
}

export interface VibeTag {
    id: string;
    label: { ja: string; en: string; zh: string };
    count: number;
    description: { ja: string; en: string; zh: string };
    spots: L1Place[];
}

export interface StationDNA {
    loading: boolean;
    title: { ja: string; en: string; zh: string };
    tagline: { ja: string; en: string; zh: string };
    categories: Record<string, L1CategorySummary>;
    vibe_tags: VibeTag[];
    signature_spots: L1Place[];
}

const CATEGORY_LABELS: Record<string, { ja: string; en: string; zh: string }> = {
    shopping: { ja: 'ショッピング', en: 'Shopping', zh: '購物' },
    dining: { ja: 'グルメ', en: 'Dining', zh: '美食' },
    business: { ja: 'ビジネス', en: 'Business', zh: '商務' },
    medical: { ja: '医療', en: 'Medical', zh: '醫療' },
    leisure: { ja: 'レジャー', en: 'Leisure', zh: '休閒' },
    finance: { ja: '金融', en: 'Finance', zh: '金融' },
    accommodation: { ja: '宿泊', en: 'Hotel', zh: '住宿' },
    culture: { ja: '文化', en: 'Culture', zh: '文化' },
    service: { ja: '公共サービス', en: 'Public Services', zh: '公共服務' },
    nature: { ja: '自然', en: 'Nature', zh: '自然' }
};

export const VIBE_RULES = [
    {
        id: 'ramen',
        keywords: ['ramen', 'noodle', 'soba', 'udon'],
        label: { ja: 'ラーメン激戦区', en: 'Ramen Battleground', zh: '拉麵激戰區' },
        desc: { ja: '名店がひしめくエリア', en: 'High density of noods', zh: '名店雲集的麵食熱點' },
        relatedCategories: ['dining']
    },
    {
        id: 'izakaya',
        keywords: ['izakaya', 'pub', 'bar', 'beer'],
        label: { ja: '居酒屋天国', en: 'Izakaya Heaven', zh: '居酒屋天堂' },
        desc: { ja: '夜の街を楽しむならここ', en: 'Best for night out', zh: '享受微醺夜生活' },
        relatedCategories: ['dining']
    },
    {
        id: 'coffee',
        keywords: ['coffee', 'cafe', 'starbucks', 'roastery'],
        label: { ja: 'カフェ巡り', en: 'Cafe Culture', zh: '咖啡巡禮' },
        desc: { ja: 'おしゃれなカフェが多い', en: 'Relaxing coffee spots', zh: '適合享受悠閒午後' },
        relatedCategories: ['dining', 'leisure']
    },
    {
        id: 'market',
        keywords: ['market', 'ameyoko', 'street_vendor', 'marketplace'],
        label: { ja: '市場の活気', en: 'Market Vibes', zh: '熱鬧市場' },
        desc: { ja: 'アメ横のような活氣', en: 'Bustling local markets', zh: '充滿活力的商店街' },
        relatedCategories: ['shopping']
    },
    {
        id: 'museum',
        keywords: ['museum', 'gallery', 'art'],
        label: { ja: '芸術と文化', en: 'Art & Culture', zh: '藝文特區' },
        desc: { ja: '美術館やギャラリー', en: 'Museums & Galleries', zh: '美術館與藝廊' },
        relatedCategories: ['culture']
    },
    {
        id: 'park',
        keywords: ['park', 'garden', 'nature'],
        label: { ja: '都会の緑地', en: 'Urban Green', zh: '城市綠意' },
        desc: { ja: '散策に最適な公園', en: 'Perfect for a walk', zh: '適合漫步的大型公園' },
        relatedCategories: ['nature', 'leisure']
    }
];

export function getMatchingVibes(place: L1Place): string[] {
    const matchedVibes: string[] = [];
    const text = (
        (place.name || '') + ' ' +
        (place.name_i18n?.en || '') + ' ' +
        (place.name_i18n?.ja || '') + ' ' +
        (place.name_i18n?.zh || '') + ' ' +
        Object.keys(place.tags || {}).join(' ') + ' ' +
        Object.values(place.tags || {}).join(' ')
    ).toLowerCase();

    VIBE_RULES.forEach(rule => {
        if (rule.keywords.some(k => text.includes(k))) {
            matchedVibes.push(rule.id);
        }
    });
    return matchedVibes;
}

export function useStationDNA(initialData?: any, locale?: string) {
    const { places, loading: placesLoading } = useL1Places();

    const dna = useMemo(() => {
        const hasInitialCategories = !!initialData && typeof initialData === 'object' && initialData.categories && Object.keys(initialData.categories).length > 0;
        const hasInitialVibes = !!initialData && typeof initialData === 'object' && Array.isArray(initialData.vibe_tags) && initialData.vibe_tags.length > 0;

        if (hasInitialCategories || hasInitialVibes) {
            const toL1Place = (spot: any, categoryId: string, index: number): L1Place => {
                if (spot && typeof spot === 'object' && typeof spot.category === 'string' && typeof spot.name === 'string') {
                    return spot as L1Place;
                }

                const osmIdRaw = spot?.osm_id;
                const osmIdNum = typeof osmIdRaw === 'number'
                    ? osmIdRaw
                    : (typeof osmIdRaw === 'string' ? Number.parseInt(osmIdRaw, 10) : Number.NaN);

                const fallbackOsmId = Number.isFinite(osmIdNum) ? osmIdNum : index + 1;
                const nameI18n = (spot && typeof spot === 'object' && typeof spot.name === 'object')
                    ? spot.name
                    : { ja: String(spot?.name ?? ''), en: String(spot?.name ?? ''), zh: String(spot?.name ?? '') };

                const name = getLocaleString(nameI18n, locale || 'en') || String(spot?.name ?? '');

                return {
                    id: `l1-${categoryId}-${fallbackOsmId}-${index}`,
                    osm_id: fallbackOsmId,
                    name,
                    name_i18n: nameI18n,
                    category: categoryId,
                    subcategory: spot?.subcategory || '',
                    distance_meters: spot?.distance_meters,
                    navigation_url: spot?.navigation_url,
                    location: { coordinates: [139.77, 35.71] },
                    tags: spot?.tags || {}
                } as L1Place;
            };

            // Base structure from static data
            const categories: Record<string, L1CategorySummary> = {};

            // 1. Populate from Static Data first
            if (hasInitialCategories) {
                Object.entries(initialData.categories).forEach(([catId, cat]: any) => {
                    const representative = Array.isArray(cat?.representative_spots)
                        ? cat.representative_spots.map((s: any, idx: number) => toL1Place(s, catId, idx))
                        : [];

                    categories[catId] = {
                        id: cat?.id || catId,
                        label: cat?.label || CATEGORY_LABELS[catId] || { ja: catId, en: catId, zh: catId },
                        count: typeof cat?.count === 'number' ? cat.count : representative.length,
                        representative_spots: representative
                    };
                });
            }

            // 2. Merge with Dynamic DB Data (if available)
            if (places && places.length > 0) {
                // Group dynamic places by category
                const groups: Record<string, L1Place[]> = {};
                places.forEach(p => {
                    if (!groups[p.category]) groups[p.category] = [];
                    groups[p.category].push(p);
                });

                // Update categories with dynamic data
                Object.keys(groups).forEach(catId => {
                    if (categories[catId]) {
                        // If category exists, update spots and count (if dynamic has more or strictly use dynamic for spots)
                        categories[catId].representative_spots = groups[catId];
                        // Update count if dynamic count is greater (or just trust dynamic count if we want to be accurate to DB)
                        // For MVP, likely keep the max to show "richness" but spots are limited by what we fetched.
                        // Actually, static count might be the "total OSM count" which is high, while DB places are just "fetched sample".
                        // So keep static count unless it's 0.
                        if (categories[catId].count < groups[catId].length) {
                            categories[catId].count = groups[catId].length;
                        }
                    } else {
                        // If category was missing in static but found in DB, add it
                        categories[catId] = {
                            id: catId,
                            label: CATEGORY_LABELS[catId] || { ja: catId, en: catId, zh: catId },
                            count: groups[catId].length,
                            representative_spots: groups[catId]
                        };
                    }
                });
            }

            const vibe_tags: VibeTag[] = hasInitialVibes
                ? initialData.vibe_tags.map((v: any, idx: number) => {
                    const score = typeof v?.score === 'number' ? v.score : 1;
                    return {
                        id: v?.id || `vibe-${idx}`,
                        label: v?.label || { ja: String(v?.id || ''), en: String(v?.id || ''), zh: String(v?.id || '') },
                        count: score,
                        description: v?.description || { ja: '', en: '', zh: '' },
                        spots: []
                    } as VibeTag;
                })
                : [];

            // 3. Generate Smart Title/Tagline based on Vibe Tags & Categories
            let title = { ja: '都市の拠点', en: 'Urban Hub', zh: '城市樞紐' };
            
            // Prioritize Wiki-derived tagline if available in initialData
            let tagline = (initialData && initialData.tagline && (initialData.tagline.ja || initialData.tagline.en || initialData.tagline.zh))
                ? initialData.tagline
                : { ja: '多くの人々が行き交う場所', en: 'A bustling transit point', zh: '人來人往的熱鬧據點' };

            // Helper to check if a specific vibe tag exists (case insensitive)
            const hasVibe = (keyword: string) => vibe_tags.some(v => v.label.en.toLowerCase().includes(keyword.toLowerCase()) || v.id.toLowerCase().includes(keyword.toLowerCase()));
            const cCounts = (id: string) => categories[id]?.count || 0;

            // Strategy Flags
            const isCulture = hasVibe('Museum') || hasVibe('Culture') || hasVibe('Art') || cCounts('culture') >= 3;
            const isMarket = hasVibe('Market') || hasVibe('Ameyoko') || hasVibe('Shopping') || cCounts('shopping') > 20;
            const isPark = hasVibe('Nature') || hasVibe('Park') || hasVibe('Garden') || hasVibe('Zoo') || cCounts('nature') > 3;
            const isFood = hasVibe('Food') || hasVibe('Dining') || hasVibe('Izakaya') || hasVibe('Ramen') || cCounts('dining') > 40;
            const isNight = hasVibe('Night') || hasVibe('Bar') || hasVibe('Club');
            const isBusiness = hasVibe('Business') || hasVibe('Office') || cCounts('business') > 10;
            const isRetro = hasVibe('Retro') || hasVibe('Shitamachi') || hasVibe('Old');

            // Complex Scenarios (Mixed Vibes)
            if (initialData?.title) {
                title = initialData.title;
                if (initialData?.tagline) tagline = initialData.tagline;
            } else if (isCulture && isMarket) {
                // E.g. Ueno (Museums + Ameyoko)
                title = { ja: '文化と活気の融合', en: 'Culture & Market Hub', zh: '文化與市集的交匯' };
                if (!initialData?.tagline) tagline = { ja: '芸術、歴史、そして活気ある商店街が共存する街', en: 'A unique blend of museums, history, and bustling markets', zh: '融合美術館的優雅與阿美橫町的熱鬧活力' };
            } else if (isCulture && isPark) {
                // E.g. Ueno Park area (without market focus)
                title = { ja: '芸術と自然の調和', en: 'Art & Nature', zh: '藝文與自然的協奏' };
                if (!initialData?.tagline) tagline = { ja: '豊かな緑の中に美術館が点在するエリア', en: 'Museums and galleries set amidst lush greenery', zh: '綠意盎然的公園中散落著美術館與博物館' };
            } else if (isMarket && isFood) {
                // E.g. Ameyoko / Tsukiji
                title = { ja: '食と買い物の天国', en: 'Gourmet & Shopping', zh: '美食與購物天堂' };
                if (!initialData?.tagline) tagline = { ja: '活気ある市場と絶品グルメが楽しめる', en: 'Endless shopping options and delicious local food', zh: '讓人流連忘返的熱鬧市集與道地美食' };
            } else if (isBusiness && isFood) {
                // E.g. Shimbashi / Tokyo Station
                title = { ja: 'ビジネスと美食の拠点', en: 'Business & Dining', zh: '商務與美食重鎮' };
                if (!initialData?.tagline) tagline = { ja: '働く人々の胃袋を満たす名店が多い', en: 'A business hub with excellent dining options', zh: '匯聚商務菁英與絕佳美食的繁華街區' };
            } 
            // Single Dominant Vibes
            else if (isCulture) {
                title = { ja: '芸術と文化の街', en: 'Art & Culture Hub', zh: '藝文與歷史重鎮' };
                if (!initialData?.tagline) tagline = { ja: '美術館や歴史的名所が集まる文化的エリア', en: 'Home to museums, galleries, and historical sites', zh: '匯聚美術館、博物館與歷史古蹟的文化中心' };
            } else if (isMarket) {
                 title = { ja: '買い物の天国', en: 'Shopping Paradise', zh: '購物天堂' };
                 if (!initialData?.tagline) tagline = { ja: 'あらゆるものが揃うショッピングエリア', en: 'A vibrant district for all your shopping needs', zh: '應有盡有的繁華購物商圈' };
            } else if (isPark) {
                title = { ja: '都会のオアシス', en: 'Urban Oasis', zh: '城市綠洲' };
                if (!initialData?.tagline) tagline = { ja: '都会の喧騒を忘れる自然空間', en: 'Relax in the vast greenery within the city', zh: '在都市叢林中享受片刻寧靜的自然空間' };
            } else if (isBusiness) {
                title = { ja: 'ビジネスの中心地', en: 'Business District', zh: '商務中心' };
                if (!initialData?.tagline) tagline = { ja: '高層ビルが立ち並ぶオフィス街', en: 'A major hub for business and commerce', zh: '摩天大樓林立的現代化商業區' };
            } else if (isNight) {
                title = { ja: '眠らない街', en: 'Nightlife Hub', zh: '不夜城' };
                if (!initialData?.tagline) tagline = { ja: '夜遅くまで賑わうエンターテインメント', en: 'Exciting nightlife and entertainment', zh: '越夜越美麗的娛樂與夜生活中心' };
            } else if (isRetro) {
                 title = { ja: '下町情緒あふれる街', en: 'Retro Vibes', zh: '懷舊下町風情' };
                 if (!initialData?.tagline) tagline = { ja: '昔ながらの雰囲気が残るエリア', en: 'Experience the nostalgic atmosphere of old Tokyo', zh: '保留濃厚昭和風情與人情味的傳統街區' };
            } else if (isFood) {
                title = { ja: '美食の迷宮', en: 'Gourmet Labyrinth', zh: '美食迷宮' };
                if (!initialData?.tagline) tagline = { ja: 'あらゆる料理が楽しめる激戦区', en: 'Culinary adventures await', zh: '各式料理雲集的味蕾挑戰區' };
            }

            return {
                loading: false,
                title,
                tagline,
                categories,
                vibe_tags,
                signature_spots: places.length > 0 ? places.slice(0, 3) : []
            };
        }

        if (placesLoading || places.length === 0) return null;

        // 1. Group by Category
        const groups: Record<string, L1Place[]> = {};
        places.forEach(p => {
            if (!groups[p.category]) groups[p.category] = [];
            groups[p.category].push(p);
        });

        // 2. Build Category Summaries
        const categories: Record<string, L1CategorySummary> = {};
        Object.keys(groups).forEach(cat => {
            const items = groups[cat];
            categories[cat] = {
                id: cat,
                label: CATEGORY_LABELS[cat] || { ja: cat, en: cat, zh: cat },
                count: items.length,
                representative_spots: items // Keep all for full list in drawer
            };
        });

        // 3. Generate Vibe Tags Strategy
        const vibeCounts: Record<string, number> = {};
        const vibeMatches: Record<string, L1Place[]> = {};

        places.forEach(p => {
            const rawTags = JSON.stringify(p.tags).toLowerCase() + ' ' + (p.name || '').toLowerCase() + ' ' + (p.subcategory || '');

            VIBE_RULES.forEach(rule => {
                if (rule.keywords.some(k => rawTags.includes(k))) {
                    vibeCounts[rule.id] = (vibeCounts[rule.id] || 0) + 1;
                    if (!vibeMatches[rule.id]) vibeMatches[rule.id] = [];
                    // Avoid too many duplicates in vibe spots, but keep some diversity
                    if (vibeMatches[rule.id].length < 20) vibeMatches[rule.id].push(p);
                }
            });
        });

        const dynamicVibes = VIBE_RULES
            .filter(r => (vibeCounts[r.id] || 0) > 0)
            .map(r => ({
                id: r.id,
                label: r.label,
                count: vibeCounts[r.id],
                description: r.desc,
                spots: vibeMatches[r.id]
            }));

        const staticVibes = (initialData?.vibe_tags || []).map((v: any) => ({
             id: v.id,
             label: v.label,
             count: (v.score || 3) * 10, // Weight static vibes higher
             description: v.description || { ja: '', en: '', zh: '' },
             spots: []
        }));

        // Merge, prioritizing static
        const mergedVibesMap = new Map();
        [...staticVibes, ...dynamicVibes].forEach(v => {
            if (!mergedVibesMap.has(v.id)) {
                mergedVibesMap.set(v.id, v);
            } else {
                 // If dynamic matches static, keep static label/desc but add dynamic spots/count
                 const existing = mergedVibesMap.get(v.id);
                 existing.count += v.count;
                 if (v.spots && v.spots.length > 0) existing.spots = v.spots;
            }
        });

        const vibe_tags: VibeTag[] = Array.from(mergedVibesMap.values())
            .sort((a: any, b: any) => b.count - a.count)
            .slice(0, 4);

        // 4. Generate Station Title/Tagline (Heuristics)
        let title = { ja: '都市の拠点', en: 'Urban Hub', zh: '城市樞紐' };
        let tagline = { ja: '多くの人々が行き交う場所', en: 'A bustling transit point', zh: '人來人往的熱鬧據點' };

        const cCounts = (id: string) => categories[id]?.count || 0;

        if (cCounts('culture') >= 3 || vibeCounts['museum'] > 0) {
            title = { ja: '文化と歴史の交差點', en: 'Heritage & Culture', zh: '文化與歷史的交會' };
            tagline = { ja: '博物館や歴史的建造物が多い街', en: 'Rich in history and arts', zh: '博物館與古蹟環繞的藝文特區' };
        } else if (cCounts('nature') > 3 || vibeCounts['park'] > 0) {
            title = { ja: '都会のオアシス', en: 'Urban Oasis', zh: '城市綠洲' };
            tagline = { ja: '豊かな緑と静寂が広がるエリア', en: 'Serene green spaces', zh: '坐擁廣闊綠地與寧靜氛圍' };
        } else if (cCounts('dining') > 40) {
            title = { ja: '美食の迷宮', en: 'Gourmet Labyrinth', zh: '美食迷宮' };
            tagline = { ja: 'あらゆる料理が楽しめる激戦区', en: 'Culinary adventures await', zh: '各式料理雲集的味蕾挑戰區' };
        } else if (cCounts('business') > 10) {
            title = { ja: 'ビジネスの心臓部', en: 'Business Core', zh: '商務核心區' };
            tagline = { ja: 'オフィスビルが立ち並ぶ活気ある街', en: 'A dynamic office district', zh: '商辦大樓林立的活力街區' };
        }

        return {
            loading: false,
            title,
            tagline,
            categories,
            vibe_tags,
            signature_spots: places.slice(0, 3)
        };
    }, [places, placesLoading, initialData, locale]);

    return dna || {
        loading: placesLoading && !initialData,
        title: { ja: '', en: '', zh: '' },
        tagline: { ja: '', en: '', zh: '' },
        categories: {} as Record<string, L1CategorySummary>,
        vibe_tags: [],
        signature_spots: []
    };
}
