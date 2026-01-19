
import fs from 'fs';
import path from 'path';

// --- Types (Mirrored from src/lib/types/stationStandard.ts) ---
interface LocaleString { ja: string; en: string; zh: string; }

interface L1_Item {
    name: LocaleString;
    osm_id?: string;
}

interface L1_Subcategory {
    count: number;
    label: LocaleString;
}

interface L1_Category {
    id: string;
    count: number;
    label: LocaleString;
    subcategories?: { [key: string]: L1_Subcategory };
    representative_spots?: L1_Item[];
}

interface L1_VibeTag {
    id: string;
    label: LocaleString;
    score: number;
    description?: LocaleString;
}

interface L1_DNA_Data {
    categories: { [key: string]: L1_Category };
    vibe_tags: L1_VibeTag[];
    tagline?: LocaleString;
    title?: LocaleString;
    last_updated: string;
}

// --- Input Data Types (from l1_pipeline_result.json) ---
interface POI {
    osm_id: number;
    name: string;
    category: string;
    location: { lat: number; lng: number };
    tags: any;
    is_seasonal: boolean;
}

interface OSMStat {
    category: string;
    total: number;
    saved: number;
}

interface L1_Result {
    clusterId: string;
    name: { ja: string; en: string } | string;
    ward: string;
    isHub: boolean;
    wikiAnalysis: {
        summary: { ja: string; en: string; zh: string };
        title?: { ja: string; en: string; zh: string };
        tagline?: { ja: string; en: string; zh: string };
        seasonalFlags: string[];
        weightedKeywords: any[];
    };
    vibeTags: string[];
    osmStats: OSMStat[];
    poiSample: POI[];
}

// --- Paths ---
const INPUT_FILE = path.join(__dirname, 'output', 'l1_pipeline_result.json');
const OUTPUT_FILE = path.join(process.cwd(), 'src', 'data', 'staticL1Data.ts');

// --- Helpers ---
function getLocaleString(poi: POI): LocaleString {
    const ja = poi.tags['name:ja'] || poi.tags['name'] || poi.name;
    const en = poi.tags['name:en'] || poi.tags['name:en_rm'] || ja; // Fallback to ja if no en
    const zh = poi.tags['name:zh'] || poi.tags['name:zh_Hant'] || poi.tags['name:zh_Hans'] || ja; // Fallback to ja if no zh
    return { ja, en, zh };
}

function mapCategory(catId: string): LocaleString {
    switch (catId) {
        case 'dining': return { ja: '食事', en: 'Dining', zh: '美食' };
        case 'shopping': return { ja: '買い物', en: 'Shopping', zh: '購物' };
        case 'accommodation': return { ja: '宿泊', en: 'Accommodation', zh: '住宿' };
        case 'culture': return { ja: '文化・芸術', en: 'Culture', zh: '文化藝術' };
        case 'nature': return { ja: '自然・公園', en: 'Nature', zh: '自然公園' };
        case 'business': return { ja: 'ビジネス', en: 'Business', zh: '商務' };
        case 'medical': return { ja: '医療', en: 'Medical', zh: '醫療' };
        case 'leisure': return { ja: '休閒・娯楽', en: 'Leisure', zh: '休閒娛樂' };
        case 'finance': return { ja: '金融', en: 'Finance', zh: '金融' };
        case 'service': return { ja: '公共サービス', en: 'Public Service', zh: '公共服務' };
        default: return { ja: catId, en: catId, zh: catId };
    }
}

function mapVibeTag(tagStr: string): L1_VibeTag {
    // Tokyo
    if (tagStr.includes('Capital Gateway')) return { id: 'capital_gateway', label: { en: 'Capital Gateway', ja: '日本の玄関口', zh: '首都玄關' }, score: 5 };
    if (tagStr.includes('Historical Architecture')) return { id: 'historical_arch', label: { en: 'Historical Architecture', ja: '歴史的建築', zh: '歷史建築' }, score: 4 };

    // Asakusa
    if (tagStr.includes('Traditional Japan')) return { id: 'traditional_japan', label: { en: 'Traditional Japan', ja: '日本の伝統', zh: '傳統風情' }, score: 5 };
    if (tagStr.includes('Sightseeing Hub')) return { id: 'sightseeing_hub', label: { en: 'Sightseeing Hub', ja: '観光拠点', zh: '觀光勝地' }, score: 5 };
    if (tagStr.includes('Senso-ji')) return { id: 'sensoji', label: { en: 'Senso-ji Temple', ja: '浅草寺', zh: '淺草寺' }, score: 5 };

    // Ueno
    if (tagStr.includes('Museum Hub')) return { id: 'museum_hub', label: { en: 'Museum Hub', ja: '美術館・博物館', zh: '博物館群' }, score: 5 };
    if (tagStr.includes('Ameyoko')) return { id: 'ameyoko', label: { en: 'Ameyoko Market', ja: 'アメ横', zh: '阿美橫町' }, score: 5 };
    if (tagStr.includes('Transport Hub')) return { id: 'transport_hub', label: { en: 'Transport Hub', ja: '交通の要衝', zh: '交通樞紐' }, score: 4 };

    // Akihabara
    if (tagStr.includes('Electric Town')) return { id: 'electric_town', label: { en: 'Electric Town', ja: '電気街', zh: '電器街' }, score: 5 };
    if (tagStr.includes('Maid Cafe')) return { id: 'maid_cafe', label: { en: 'Maid Cafe', ja: 'メイドカフェ', zh: '女僕咖啡廳' }, score: 4 };

    // Shibuya / Harajuku
    if (tagStr.includes('Youth Culture')) return { id: 'youth_culture', label: { en: 'Youth Culture', ja: '若者文化', zh: '年輕文化' }, score: 5 };
    if (tagStr.includes('IT Hub')) return { id: 'it_hub', label: { en: 'IT Hub (Bit Valley)', ja: 'IT企業の集積地', zh: 'IT產業聚落' }, score: 4 };
    if (tagStr.includes('Fashion')) return { id: 'fashion', label: { en: 'Fashion Center', ja: 'ファッションの中心', zh: '時尚中心' }, score: 5 };
    if (tagStr.includes('Kawaii')) return { id: 'kawaii', label: { en: 'Kawaii Culture', ja: 'カワイイ文化', zh: '可愛文化' }, score: 5 };

    // General / Existing
    if (tagStr.includes('Gourmet Battleground')) {
        return { id: 'gourmet', label: { en: 'Gourmet Battleground', ja: 'グルメ激戦区', zh: '美食激戰區' }, score: 5 };
    }
    if (tagStr.includes('Shoppers Heaven')) {
        return { id: 'shopping_heaven', label: { en: 'Shoppers Heaven', ja: '買い物天国', zh: '購物天堂' }, score: 5 };
    }
    if (tagStr.includes('Business District')) {
        return { id: 'business', label: { en: 'Business District', ja: 'ビジネス街', zh: '商業區' }, score: 4 };
    }
    if (tagStr.includes('Cultural Hub')) {
        return { id: 'culture', label: { en: 'Cultural Hub', ja: '文化の中心', zh: '文化中心' }, score: 4 };
    }
    if (tagStr.includes('Sakura Spot')) {
        return { id: 'sakura', label: { en: 'Sakura Spot', ja: '桜の名所', zh: '賞櫻勝地' }, score: 5 };
    }

    // New Tourism Dispersion Tags
    if (tagStr === 'Hidden Gem') return { id: 'hidden_gem', label: { en: 'Hidden Gem', ja: '穴場スポット', zh: '私房景點' }, score: 4 };
    if (tagStr === 'Retro') return { id: 'retro', label: { en: 'Retro Vibes', ja: 'レトロな雰囲気', zh: '復古氛圍' }, score: 4 };
    if (tagStr === 'Shitamachi') return { id: 'shitamachi', label: { en: 'Old Tokyo Vibes', ja: '下町情緒', zh: '下町風情' }, score: 5 };
    if (tagStr === 'Subculture') return { id: 'subculture', label: { en: 'Subculture', ja: 'サブカルチャー', zh: '亞文化' }, score: 4 };
    if (tagStr === 'Gourmet') return { id: 'gourmet', label: { en: 'Local Gourmet', ja: 'ご当地グルメ', zh: '在地美食' }, score: 4 };
    if (tagStr === 'Power Spot') return { id: 'power_spot', label: { en: 'Power Spot', ja: 'パワースポット', zh: '能量景點' }, score: 3 };
    if (tagStr === 'Market') return { id: 'market', label: { en: 'Local Market', ja: '商店街・市場', zh: '市場商圈' }, score: 4 };
    if (tagStr === 'Nature') return { id: 'nature', label: { en: 'Nature & Parks', ja: '自然・公園', zh: '自然公園' }, score: 3 };
    if (tagStr === 'High-end') return { id: 'high_end', label: { en: 'High-end', ja: '高級・洗練', zh: '高級時尚' }, score: 4 };

    // New Specific Tags
    if (tagStr === 'Grandma Harajuku') return { id: 'grandma_harajuku', label: { en: "Grandma's Harajuku", ja: 'おばあちゃんの原宿', zh: '老奶奶的原宿' }, score: 5 };
    if (tagStr === 'Wholesale') return { id: 'wholesale', label: { en: 'Wholesale District', ja: '問屋街', zh: '批發街' }, score: 4 };
    if (tagStr === 'Family Friendly') return { id: 'family_friendly', label: { en: 'Family Friendly', ja: '家族向け', zh: '親子友善' }, score: 4 };

    // Existing Tags Localization
    if (tagStr === 'Student Area') return { id: 'student_area', label: { en: 'Student Area', ja: '学生街', zh: '學生區' }, score: 3 };
    if (tagStr === 'Korea Town') return { id: 'korea_town', label: { en: 'Korea Town', ja: 'コリアンタウン', zh: '韓國城' }, score: 5 };
    if (tagStr === 'Book Town') return { id: 'book_town', label: { en: 'Book Town', ja: '本の街', zh: '書街' }, score: 5 };
    if (tagStr === 'Ramen') return { id: 'ramen', label: { en: 'Ramen Battleground', ja: 'ラーメン激戦区', zh: '拉麵激戰區' }, score: 4 };
    if (tagStr === 'Izakaya') return { id: 'izakaya', label: { en: 'Izakaya Alleys', ja: '飲み屋街', zh: '居酒屋街' }, score: 4 };
    if (tagStr === 'Electronics') return { id: 'electronics', label: { en: 'Electronics District', ja: '電気街', zh: '電器街' }, score: 5 };
    if (tagStr === 'Otaku') return { id: 'otaku', label: { en: 'Otaku Culture', ja: 'オタク文化', zh: '御宅文化' }, score: 5 };

    // Fallback for generated tags or unknown ones
    // Expected format might be just a word or "En (Ja)"
    // Let's try to parse "En (Ja)"
    const match = tagStr.match(/^(.+?)\s*\((.+?)\)$/);
    if (match) {
        const en = match[1];
        const ja = match[2];
        return {
            id: en.toLowerCase().replace(/\s+/g, '_'),
            label: { en, ja, zh: ja }, // Fallback zh to ja
            score: 3
        };
    }

    return {
        id: tagStr.toLowerCase().replace(/\s+/g, '_'),
        label: { en: tagStr, ja: tagStr, zh: tagStr },
        score: 3
    };
}

// --- Main ---
async function main() {
    if (!fs.existsSync(INPUT_FILE)) {
        console.error(`❌ Input file not found: ${INPUT_FILE}`);
        process.exit(1);
    }

    const rawData: L1_Result[] = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
    console.log(`📦 Loaded ${rawData.length} stations from raw data.`);

    const outputData: Record<string, L1_DNA_Data> = {};

    for (const station of rawData) {
        // Map Categories
        const categories: { [key: string]: L1_Category } = {};

        for (const stat of station.osmStats) {
            if (stat.total === 0) continue;

            const label = mapCategory(stat.category);

            // Find spots for this category
            const spots = station.poiSample
                .filter(p => p.category === stat.category)
                .slice(0, 50) // Limit to 50
                .map(p => ({
                    name: getLocaleString(p),
                    osm_id: String(p.osm_id)
                }));

            categories[stat.category] = {
                id: stat.category,
                count: stat.total,
                label: label,
                subcategories: {}, // Not populated in L1 yet
                representative_spots: spots
            };
        }

        // Map Vibe Tags
        const vibe_tags = station.vibeTags.map(mapVibeTag);

        // Add to output
        outputData[station.clusterId] = {
            categories,
            vibe_tags,
            tagline: station.wikiAnalysis.tagline || station.wikiAnalysis.summary,
            title: station.wikiAnalysis.title,
            last_updated: new Date().toISOString()
        };
    }

    // Generate Name Index (for name-based lookup fallback)
    const nameIndex: Record<string, string> = {};
    for (const station of rawData) {
        const name = station.name;
        if (typeof name === 'object' && name.ja) {
            nameIndex[name.ja] = station.clusterId;
        }
        if (typeof name === 'object' && name.en && name.en !== name.ja) {
            nameIndex[name.en] = station.clusterId;
        }
    }

    // Generate TypeScript File Content
    const fileContent = `
import { L1_DNA_Data } from '@/lib/types/stationStandard';

export const STATIC_L1_DATA: Record<string, L1_DNA_Data> = ${JSON.stringify(outputData, null, 4)};

// Name-based lookup index (Station Name -> Cluster ID)
export const L1_NAME_INDEX: Record<string, string> = ${JSON.stringify(nameIndex, null, 4)};
`;

    fs.writeFileSync(OUTPUT_FILE, fileContent.trim());
    console.log(`✅ Successfully generated ${OUTPUT_FILE} with ${Object.keys(outputData).length} stations and ${Object.keys(nameIndex).length} name mappings.`);
}

main().catch(console.error);
