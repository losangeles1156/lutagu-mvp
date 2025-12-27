import { useMemo } from 'react';
import { useL1Places, L1Place } from './useL1Places';

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
    shopping: { ja: '買い物', en: 'Shopping', zh: '購物' },
    dining: { ja: '食事', en: 'Dining', zh: '美食' },
    convenience: { ja: '便利', en: 'Convenience', zh: '便利' },
    medical: { ja: '医療', en: 'Medical', zh: '醫療' },
    leisure: { ja: 'レジャー', en: 'Leisure', zh: '休閒' },
    finance: { ja: '金融', en: 'Finance', zh: '金融' },
    accommodation: { ja: '宿泊', en: 'Hotel', zh: '住宿' },
    culture: { ja: '文化', en: 'Culture', zh: '文化' },
    service: { ja: 'サービス', en: 'Service', zh: '服務' },
    nature: { ja: '自然', en: 'Nature', zh: '自然' }
};

// Vibe Rules: Keyword matching
const VIBE_RULES = [
    {
        id: 'ramen',
        keywords: ['ramen', 'noodle', 'soba', 'udon'],
        label: { ja: 'ラーメン激戦区', en: 'Ramen Battleground', zh: '拉麵激戰區' },
        desc: { ja: '名店がひしめくエリア', en: 'High density of noods', zh: '名店雲集的麵食熱點' }
    },
    {
        id: 'izakaya',
        keywords: ['izakaya', 'pub', 'bar', 'beer'],
        label: { ja: '居酒屋天国', en: 'Izakaya Heaven', zh: '居酒屋天堂' },
        desc: { ja: '夜の街を楽しむならここ', en: 'Best for night out', zh: '享受微醺夜生活' }
    },
    {
        id: 'coffee',
        keywords: ['coffee', 'cafe', 'starbucks', 'roastery'],
        label: { ja: 'カフェ巡り', en: 'Cafe Culture', zh: '咖啡巡禮' },
        desc: { ja: 'おしゃれなカフェが多い', en: 'Relaxing coffee spots', zh: '適合享受悠閒午後' }
    },
    {
        id: 'market',
        keywords: ['market', 'ameyoko', 'street_vendor', 'marketplace'],
        label: { ja: '市場の活気', en: 'Market Vibes', zh: '熱鬧市場' },
        desc: { ja: 'アメ横のような活気', en: 'Bustling local markets', zh: '充滿活力的商店街' }
    },
    {
        id: 'museum',
        keywords: ['museum', 'gallery', 'art'],
        label: { ja: '芸術と文化', en: 'Art & Culture', zh: '藝文特區' },
        desc: { ja: '美術館やギャラリー', en: 'Museums & Galleries', zh: '美術館與藝廊' }
    }
];

export function useStationDNA() {
    const { places, loading } = useL1Places();

    const dna = useMemo(() => {
        if (loading) return null;

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
                representative_spots: items.slice(0, 30) // Keep more for drawer
            };
        });

        // 3. Generate Vibe Tags Strategy
        const vibeCounts: Record<string, number> = {};
        const vibeMatches: Record<string, L1Place[]> = {};

        places.forEach(p => {
            const rawTags = JSON.stringify(p.tags).toLowerCase() + ' ' + (p.name || '').toLowerCase();

            VIBE_RULES.forEach(rule => {
                if (rule.keywords.some(k => rawTags.includes(k))) {
                    vibeCounts[rule.id] = (vibeCounts[rule.id] || 0) + 1;
                    if (!vibeMatches[rule.id]) vibeMatches[rule.id] = [];
                    vibeMatches[rule.id].push(p);
                }
            });
        });

        const vibe_tags: VibeTag[] = VIBE_RULES
            .filter(r => (vibeCounts[r.id] || 0) > 0)
            .map(r => ({
                id: r.id,
                label: r.label,
                count: vibeCounts[r.id],
                description: r.desc,
                spots: vibeMatches[r.id] // Attach matched spots for Drawer
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 4); // Top 4 Vibes

        // 4. Generate Station Title/Tagline (Heuristics)
        let title = { ja: '都市の拠点', en: 'Urban Hub', zh: '城市樞紐' };
        let tagline = { ja: '多くの人々が行き交う場所', en: 'A bustling transit point', zh: '人來人往的熱鬧據點' };

        const cCounts = (id: string) => categories[id]?.count || 0;

        // Ueno-like signature
        if (cCounts('culture') >= 3 || vibeCounts['museum'] > 0 || vibeCounts['market'] > 0) {
            title = { ja: '文化と市場の融合', en: 'Culture & Market', zh: '文化與市集的交匯' };
            tagline = { ja: '下町の活気と芸術が同居する街', en: 'Where heritage meets bustling streets', zh: '下町活力與藝術氣息共存' };
        } else if (cCounts('dining') > 30) {
            title = { ja: 'グルメ天国', en: 'Foodie Paradise', zh: '美食天堂' };
            tagline = { ja: '美味しいお店が見つかる街', en: 'Endless dining options await', zh: '轉角就能遇見美味' };
        } else if (cCounts('nature') > 5) {
            title = { ja: '緑豊かな憩いの場', en: 'Green Oasis', zh: '城市綠洲' };
            tagline = { ja: '都会の喧騒を忘れる場所', en: 'Relax in nature', zh: '忘卻都市喧囂的角落' };
        }

        return {
            loading,
            title,
            tagline,
            categories,
            vibe_tags,
            signature_spots: places.slice(0, 3) // Placeholder for signature spots
        };
    }, [places, loading]);

    return dna || {
        loading: true,
        title: { ja: '', en: '', zh: '' },
        tagline: { ja: '', en: '', zh: '' },
        categories: {},
        vibe_tags: [],
        signature_spots: []
    };
}
