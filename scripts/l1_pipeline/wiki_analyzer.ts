import { CONFIG } from './config';
import { StationProfile } from './hub_profiles';

import { generateLLMResponse } from '../../src/lib/ai/llmClient';

interface WikiAnalysisResult {
    summary: { ja: string; en: string; zh: string };
    title: { ja: string; en: string; zh: string };
    tagline: { ja: string; en: string; zh: string };
    seasonalFlags: string[];
    keywords: string[];
    weightedKeywords: { word: string; weight: number }[];
}

export async function analyzeWiki(title: string, profile?: StationProfile): Promise<WikiAnalysisResult> {
    console.log(`📘 Analyzing Wiki for: ${title} ${profile ? `(Profile: ${profile.name})` : ''}...`);

    // 1. Fetch Wiki Content (JA) + Langlinks
    const endpoint = 'https://ja.wikipedia.org/w/api.php';
    const params = new URLSearchParams({
        action: 'query',
        prop: 'extracts|langlinks',
        titles: title,
        explaintext: 'true',
        lllimit: '500', // Get all langlinks
        format: 'json',
        origin: '*'
    });

    try {
        const res = await fetch(`${endpoint}?${params.toString()}`);
        const data = await res.json();

        const pages = data.query?.pages;
        if (!pages) throw new Error('No pages found');

        const pageId = Object.keys(pages)[0];
        if (pageId === '-1') throw new Error('Page missing');

        const page = pages[pageId];
        const contentJa = page.extract as string;
        const langlinks = page.langlinks || [];

        // Find EN and ZH titles
        const enLink = langlinks.find((l: any) => l.lang === 'en');
        const zhLink = langlinks.find((l: any) => l.lang === 'zh');

        // Fetch EN and ZH content if available
        let contentEn = '';
        let contentZh = '';

        if (enLink) {
            try {
                const resEn = await fetch(`https://en.wikipedia.org/w/api.php?action=query&prop=extracts&titles=${encodeURIComponent(enLink['*'])}&explaintext=true&format=json&origin=*`);
                const dataEn = await resEn.json();
                const pageEn = Object.values(dataEn.query?.pages || {})[0] as any;
                if (pageEn && pageEn.extract) contentEn = pageEn.extract;
            } catch (e) { console.warn('Failed to fetch EN wiki', e); }
        }

        if (zhLink) {
            try {
                const resZh = await fetch(`https://zh.wikipedia.org/w/api.php?action=query&prop=extracts&titles=${encodeURIComponent(zhLink['*'])}&explaintext=true&format=json&origin=*`);
                const dataZh = await resZh.json();
                const pageZh = Object.values(dataZh.query?.pages || {})[0] as any;
                if (pageZh && pageZh.extract) contentZh = pageZh.extract;
            } catch (e) { console.warn('Failed to fetch ZH wiki', e); }
        }

        // 2. Analyze Seasonal Flags (Use JA content)
        const seasonalFlags: string[] = [];

        if (matchesAny(contentJa, CONFIG.SEASONAL_KEYWORDS.SAKURA)) seasonalFlags.push('Sakura');
        if (matchesAny(contentJa, CONFIG.SEASONAL_KEYWORDS.AUTUMN)) seasonalFlags.push('Autumn Leaves');
        if (matchesAny(contentJa, CONFIG.SEASONAL_KEYWORDS.HYDRANGEA)) seasonalFlags.push('Hydrangea');
        if (matchesAny(contentJa, CONFIG.SEASONAL_KEYWORDS.PLUM)) seasonalFlags.push('Plum');

        // 3. Keyword Extraction with Weights (Use JA content)
        // If a profile exists, we force include its core vibes
        const weightedKeywords: { word: string; weight: number }[] = [];
        const rawKeywords: string[] = [];

        // A. Profile Mandatory Vibes (Weight: 10)
        if (profile) {
            profile.core_vibes.forEach(vibe => {
                weightedKeywords.push({ word: vibe, weight: 10 });
                rawKeywords.push(vibe);
            });

            // Validate Landmarks in Text
            profile.mandatory_landmarks.forEach(lm => {
                if (contentJa.includes(lm)) {
                    // Confirmed landmark presence
                    // weightedKeywords.push({ word: lm, weight: 5 }); // Optional: add specific landmark tag
                }
            });
        }

        // B. Wiki Content Analysis (Weight: 1-5)
        // General Dictionaries
        const DICT = {
            'Student Area': ['学生', '大学', '専門学校', 'キャンパス', '早稲田', '東洋大学', '法政大学'],
            'Korea Town': ['韓国', 'コリアン', 'キムチ'],
            'Book Town': ['古書', '書店', '神保町', '古本'],
            'Ramen': ['ラーメン', '拉麺', '激戦区', 'つけ麺'],
            'Izakaya': ['飲み屋', '居酒屋', '横丁', 'センベロ', '千ベロ', '立ち飲み', '焼き鳥', 'ホッピー'],
            'Electronics': ['電気街', '家電', 'パソコン', 'パーツ'],
            'Otaku': ['アニメ', 'メイド', 'サブカル', 'フィギュア'],
            'High-end': ['高級', 'ブランド', '百貨店', '洗練', 'タワーマンション'],
            'Hidden Gem': ['穴場', '隠れ家', '知る人ぞ知る', '秘境', '静か', '混雑回避', '地元民'],
            'Retro': ['レトロ', '昭和', 'ノスタルジック', '懐かしい', '老舗', '歴史的建造物', '銭湯', '純喫茶'],
            'Shitamachi': ['下町', '人情', '風情', '江戸', '路地', '深川', '職人'],
            'Subculture': ['サブカル', '古着', 'ライブハウス', '演劇', '若者文化', '劇場'],
            'Gourmet': ['グルメ', '食べ歩き', '名物', 'B級グルメ', 'もんじゃ', '海鮮', 'うなぎ', '団子'],
            'Power Spot': ['パワースポット', '縁結び', '御利益', '運気', '神社', '寺院', '亀戸天神', 'とげぬき地蔵'],
            'Market': ['市場', '商店街', '横丁', 'マルシェ', '問屋街', 'アメ横', '道具街'],
            'Nature': ['公園', '緑地', '自然', '庭園', '川沿い', '運河', '桜並木'],
            'Grandma Harajuku': ['おばあちゃんの原宿', '高齢者', '地蔵通り'],
            'Wholesale': ['問屋', '卸売', 'ビーズ', '手芸', '革製品', 'パーツ'],
            'Family Friendly': ['家族連れ', 'ファミリー', '公園', '動物園', '遊園地', '水族館']
        };

        for (const [tag, keywords] of Object.entries(DICT)) {
            let hits = 0;
            keywords.forEach(k => {
                const regex = new RegExp(k, 'g');
                const count = (contentJa.match(regex) || []).length;
                hits += count;
            });

            if (hits > 0) {
                // If profile already has this, skip or boost?
                // For now, simple add if not exists
                if (!rawKeywords.includes(tag)) {
                    // Logic: High hits = high weight?
                    // Cap weight at 5 for auto-detected
                    const weight = Math.min(hits, 5);
                    if (weight >= 2) { // Threshold
                        weightedKeywords.push({ word: tag, weight });
                        rawKeywords.push(tag);
                    }
                }
            }
        }

        // 4. Extract Summaries (First 150 chars)
        // If profile exists, prefer expert description + wiki excerpt
        const cleanText = (text: string) => text.substring(0, 150).replace(/\n/g, ' ') + '...';

        let summaryJa = cleanText(contentJa);
        let summaryEn = contentEn ? cleanText(contentEn) : 'Description available in Japanese.';
        let summaryZh = contentZh ? cleanText(contentZh) : '詳細描述僅提供日文版本。';

        if (profile) {
            summaryJa = `【${profile.name}】${profile.description} (Wiki: ${summaryJa})`;
        }

        // 5. Generate Tagline & Title (AI)
        let tagline = { ja: '', en: '', zh: '' };
        let vibeTitle = { ja: '', en: '', zh: '' };

        try {
            const profileDesc = profile ? profile.description : '';
            const coreVibes = profile ? profile.core_vibes.join(', ') : '';
            const prompt = `
You are a travel editor for a Tokyo guide app.
Generate a short "Vibe Title" (max 15 chars) and a punchy "Tagline" (max 30-60 chars) for the station "${title}".

Context from Wiki: "${contentJa.substring(0, 500)}..."
${profileDesc ? `Expert Insight: "${profileDesc}"` : ''}
${coreVibes ? `Core Vibes: "${coreVibes}"` : ''}

Requirements:
1. Title: A short, poetic or descriptive title (e.g., "Electric Town" for Akihabara, "Kitchen of Tokyo" for Tsukiji). NOT the station name itself.
2. Tagline: A catchy phrase describing the personality.
3. Format: JSON object {
    "title": { "ja": "...", "en": "...", "zh": "..." },
    "tagline": { "ja": "...", "en": "...", "zh": "..." }
}
4. Language: "zh" MUST be Traditional Chinese (繁體中文/台灣正體). Do NOT use Simplified Chinese.
5. Example for Akihabara: { "title": { "ja": "電気とオタクの街", "en": "Electric Town", "zh": "電器動漫之街" }, "tagline": { "ja": "アニメと電気の聖地", "en": "The holy land of anime and electronics", "zh": "動漫與電器的聖地" } }
`;
            const jsonStr = await generateLLMResponse({
                systemPrompt: 'Output raw JSON only. No markdown.',
                userPrompt: prompt,
                temperature: 0.7
            });
            if (jsonStr) {
                const cleanJson = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
                const result = JSON.parse(cleanJson);
                tagline = result.tagline || tagline;
                vibeTitle = result.title || vibeTitle;
            } else if (profile) {
                tagline = { ja: profile.description, en: profile.description, zh: profile.description };
                vibeTitle = { ja: profile.core_vibes[0] || 'Tokyo Spot', en: profile.core_vibes[0] || 'Tokyo Spot', zh: profile.core_vibes[0] || 'Tokyo Spot' };
            }
        } catch (e) {
            console.warn('Tagline generation failed:', e);
            if (profile) {
                tagline = { ja: profile.description, en: profile.description, zh: profile.description };
                vibeTitle = { ja: profile.core_vibes[0] || 'Tokyo Spot', en: profile.core_vibes[0] || 'Tokyo Spot', zh: profile.core_vibes[0] || 'Tokyo Spot' };
            }
        }

        // Fill empty title/tagline if still empty
        if (!vibeTitle.ja) vibeTitle = { ja: '人気のエリア', en: 'Popular Spot', zh: '熱門景點' };
        if (!tagline.ja) tagline = { ja: '魅力的な東京の街', en: 'A charming Tokyo district', zh: '充滿魅力的東京街區' };

        return {
            summary: {
                ja: summaryJa,
                en: summaryEn,
                zh: summaryZh
            },
            title: vibeTitle,
            tagline,
            seasonalFlags,
            keywords: rawKeywords,
            weightedKeywords
        };

    } catch (error) {
        console.warn(`⚠️ Wiki fetch failed for ${title}:`, error);
        // Fallback to profile if available
        if (profile) {
            return {
                summary: {
                    ja: profile.description,
                    en: profile.description, // TODO: Translation
                    zh: profile.description  // TODO: Translation
                },
                title: {
                     ja: profile.core_vibes[0] || 'Popular Spot',
                     en: profile.core_vibes[0] || 'Popular Spot',
                     zh: profile.core_vibes[0] || 'Popular Spot'
                },
                tagline: {
                    ja: profile.description,
                    en: profile.description,
                    zh: profile.description
                },
                seasonalFlags: [],
                keywords: profile.core_vibes,
                weightedKeywords: profile.core_vibes.map(v => ({ word: v, weight: 10 }))
            };
        }
        return {
            summary: { ja: '', en: '', zh: '' },
            title: { ja: '', en: '', zh: '' },
            tagline: { ja: '', en: '', zh: '' },
            seasonalFlags: [],
            keywords: [],
            weightedKeywords: []
        };
    }
}

function matchesAny(text: string, keywords: string[]): boolean {
    return keywords.some(k => text.includes(k));
}
