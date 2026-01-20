/**
 * LUTAGU LLM Service Layer
 *
 * Unified entry point for AI-powered content generation.
 * Uses MiniMax-M2.1 for reasoning tasks, with fallbacks.
 */

import { generateLLMResponse, SupportedLocale } from './llmClient';
export { generateLLMResponse, type SupportedLocale };

// ==========================================
// Types
// ==========================================

export interface WeatherContext {
    temp: number;
    condition: string;
    windSpeed?: number;
    humidity?: number;
    alerts?: string[];
}

export interface L1Context {
    stationName: string;
    poiCounts: Record<string, number>;
    nearbyHighlights?: string[];
}

export interface L4Context {
    stationId: string;
    userNeeds?: string[];
    currentTime?: Date;
    weather?: WeatherContext;
}

// ==========================================
// Weather Advice Generation
// ==========================================

export async function generateWeatherAdvice(
    weather: WeatherContext,
    locale: SupportedLocale = 'zh-TW'
): Promise<string> {
    const { temp, condition, windSpeed, alerts } = weather;

    const systemPrompt = locale === 'zh-TW'
        ? `你是東京交通助手 LUTAGU。請根據氣溫提供「合乎邏輯」的穿著建議。
        指引：
        - <10°C：羽絨服或厚大衣 (Down jacket/Coat)
        - 10-15°C：風衣、夾克或毛衣 (Trench coat/Sweater)
        - 15-20°C：薄外套或長袖 (Thin jacket/Long sleeves)
        - 20-25°C：舒適單衣 (Comfortable shirt)
        - >25°C：透氣短袖 (Breathable wear)

        請用一句話（20字以內）給出建議。若有下雨或強風請一併考慮。不要給出矛盾建議（如同時穿薄外套又穿毛衣）。`
        : locale === 'ja'
            ? 'あなたは東京交通アシスタント LUTAGU です。天気に基づき、論理的で実用的な服装アドバイスをしてください（30文字以内）。矛盾するアドバイスは避けてください。'
            : 'You are LUTAGU. Provide logical outfit advice based on temperature mapping. One sentence (max 20 words). Avoid contradictory advice.';

    const userPrompt = `Temperature: ${temp}°C, Condition: ${condition}${windSpeed ? `, Wind: ${windSpeed}m/s` : ''}${alerts?.length ? `, Alerts: ${alerts.join(', ')}` : ''}`;

    const result = await generateLLMResponse({
        systemPrompt,
        userPrompt,
        taskType: 'simple', // Trinity: Gemini 2.5 Flash Lite
        temperature: 0.4
    });

    // Fallback if LLM fails
    if (!result) {
        if (temp < 10) return locale === 'zh-TW' ? '早晚較涼，建議攜帶外套' : 'It\'s cool, bring a jacket';
        if (temp > 30) return locale === 'zh-TW' ? '天氣炎熱，注意補充水分' : 'It\'s hot, stay hydrated';
        return locale === 'zh-TW' ? '天氣舒適，祝您旅途愉快' : 'Weather is nice, enjoy your trip';
    }

    return result;
}

// ==========================================
// L1 DNA Generation (Location Gene & Vibe Tags)
// ==========================================

export interface L1DNAResult {
    tagline: string;
    vibeTags: string[];
}

export async function generateL1DNA(
    context: L1Context,
    locale: SupportedLocale = 'zh-TW'
): Promise<L1DNAResult> {
    const { stationName, poiCounts, nearbyHighlights } = context;

    const systemPrompt = locale === 'zh-TW'
        ? `你是東京城市觀察家 LUTAGU。請結合「POI數據」與你對該地點的「百科知識/大眾印象」，分析該車站的一句話人格與氛圍。

        任務：
        1. tagline (一句話人格)：基於Wiki印象，描述該地的核心特色（例如：秋葉原=電器與動漫聖地、新大久保=韓國街、淺草=下町風情）。(15字內)
        2. vibeTags (氛圍標籤)：描述該地的「氣氛」或「體驗感」（例如：復古、熱鬧、神聖、新舊交融、次文化）。(3-5個)

        以 JSON 格式回覆：{"tagline": "...", "vibeTags": ["...", "..."]}`
        : `You are LUTAGU. Analyze the station's personality based on POI data and specific Wiki-style knowledge.

        Tasks:
        1. tagline: The station's unique "Persona" (e.g. Akihabara = Anime Holy Land). (Max 10 words)
        2. vibeTags: The "Atmosphere" or "Vibe" (e.g. Retro, Bustling, Spiritual). (3-5 tags)

        Reply in JSON: {"tagline": "...", "vibeTags": ["...", "..."]}`;

    const poiSummary = Object.entries(poiCounts)
        .filter(([_, count]) => count > 0)
        .map(([cat, count]) => `${cat}: ${count}`)
        .join(', ');

    const userPrompt = `Station: ${stationName}\nPOI Summary: ${poiSummary}${nearbyHighlights?.length ? `\nHighlights: ${nearbyHighlights.join(', ')}` : ''}`;

    const result = await generateLLMResponse({
        systemPrompt,
        userPrompt,
        taskType: 'chat', // Trinity: DeepSeek V3.2 (Creative)
        temperature: 0.7,
        model: 'deepseek-v3.2' // Corrected model name for Zeabur AI Hub
    });

    // Parse result
    if (result) {
        try {
            // Extract JSON from response (may have extra text)
            const jsonMatch = result.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    tagline: parsed.tagline || '',
                    vibeTags: Array.isArray(parsed.vibeTags) ? parsed.vibeTags : []
                };
            }
        } catch (e) {
            console.warn('[llmService] Failed to parse L1 DNA response:', e);
        }
    }

    // Fallback
    return {
        tagline: locale === 'zh-TW' ? '探索這個車站的魅力' : 'Discover this station',
        vibeTags: ['Transit Hub']
    };
}

// ==========================================
// Knowledge Translation
// ==========================================

/**
 * Translates a list of knowledge items to the target locale.
 * Uses a batch processing approach to save tokens and maintain consistency.
 */
export async function translateKnowledgeItems(
    items: Array<{ id: string; content: string; section: string }>,
    targetLocale: SupportedLocale
): Promise<Array<{ id: string; content: string; section: string }>> {
    if (targetLocale === 'zh-TW' || targetLocale === 'zh') return items;
    if (items.length === 0) return items;

    const languageMap: Record<string, string> = {
        'en': 'English',
        'ja': 'Japanese',
        'zh-TW': 'Traditional Chinese'
    };

    const targetLang = languageMap[targetLocale] || 'English';

    const systemPrompt = `You are LUTAGU, a Tokyo transit expert.
    Translate the following transit tips from Traditional Chinese to ${targetLang}.

    Guidelines:
    - Keep the tone helpful, professional, and concise.
    - Keep specific proper nouns (station names, line names) as is if they are commonly known in ${targetLang}, or provide the ${targetLang} equivalent.
    - Maintain the Markdown bullet point structure.
    - DO NOT change the meaning or remove technical details.
    - Return ONLY the translated items in a valid JSON array format matching the input structure.`;

    const userPrompt = JSON.stringify(items.map(i => ({ id: i.id, content: i.content, section: i.section })));

    try {
        const result = await generateLLMResponse({
            systemPrompt,
            userPrompt,
            taskType: 'reasoning', // Trinity: Gemini 3 Flash Preview (Precision)
            temperature: 0.1, // Low temperature for factual translation
            model: 'gemini-3-flash-preview'
        });

        if (result) {
            // Attempt to parse the JSON array
            const cleanedResult = result.replace(/```json\n?|\n?```/g, '').trim();
            const translatedItems = JSON.parse(cleanedResult);
            if (Array.isArray(translatedItems)) {
                return translatedItems;
            }
        }
    } catch (e) {
        console.error('[llmService] Knowledge translation failed:', e);
    }

    // Fallback: Return original items if translation fails
    return items;
}

// ==========================================
// L4 Strategy Card Text Generation
// ==========================================

import { knowledgeService } from '../l4/knowledgeService';

// ...

export async function generateL4Advice(
    context: L4Context,
    locale: SupportedLocale = 'zh-TW'
): Promise<string> {
    const { stationId, userNeeds, weather } = context;

    // Fetch Station Knowledge (Limit to top items if many)
    const stationKnowledge = knowledgeService.getKnowledgeByStationId(stationId);
    let knowledgeContext = '';

    if (stationKnowledge.length > 0) {
        knowledgeContext = '\n\nStation Knowledge (Use if relevant):\n' +
            stationKnowledge.map(k => `- ${k.section}: ${k.content}`).join('\n');
    }

    const systemPrompt = locale === 'zh-TW'
        ? '你是東京交通助手 LUTAGU。根據用戶情境與車站知識，生成一條簡潔、實用的建議（30字以內）。若知識庫中有對應用戶需求的資訊（如大行李、電梯），請優先引用。'
        : 'You are LUTAGU. Generate one short, practical advice (max 30 words) based on user context and station knowledge. Prioritize knowledge base info if relevant.';

    const userPrompt = `Station: ${stationId}\n${userNeeds?.length ? `User Needs: ${userNeeds.join(', ')}` : 'General tourist'}${weather ? `\nWeather: ${weather.temp}°C, ${weather.condition}` : ''}${knowledgeContext}`;

    const result = await generateLLMResponse({
        systemPrompt,
        userPrompt,
        taskType: 'simple', // Trinity: Gemini 2.5 Flash Lite (Fast Logic)
        temperature: 0.3
    });

    return result || (locale === 'zh-TW' ? '祝您旅途順利！有任何問題請隨時詢問。' : 'Have a safe journey!');
}

// ==========================================
// Batch Generation Utility
// ==========================================

export async function batchGenerateContent<T>(
    items: T[],
    generator: (item: T) => Promise<any>,
    options: { concurrency?: number; delayMs?: number } = {}
): Promise<any[]> {
    const { concurrency = 3, delayMs = 100 } = options;
    const results: any[] = [];

    for (let i = 0; i < items.length; i += concurrency) {
        const batch = items.slice(i, i + concurrency);
        const batchResults = await Promise.all(batch.map(generator));
        results.push(...batchResults);

        if (i + concurrency < items.length) {
            await new Promise(r => setTimeout(r, delayMs));
        }
    }

    return results;
}

// ==========================================
// L4 Card Contextual Reranking
// ==========================================

export async function rerankL4Cards(
    cards: any[],
    context: L4Context,
    locale: SupportedLocale = 'zh-TW'
): Promise<any[]> {
    // If no user needs specified (general user), keep all cards (or maybe top K)
    // But typically we only want to filter if there are specific constraints (wheelchair, stroller, heavy luggage)
    const activeNeeds = context.userNeeds?.filter(n => n && n !== 'general');
    if (!cards || cards.length === 0 || !activeNeeds || activeNeeds.length === 0) {
        return cards;
    }

    const systemPrompt = locale === 'zh-TW'
        ? `你是東京交通助手 LUTAGU 的智能過濾器。請根據用戶的具體需求（如：輪椅、嬰兒車、大型行李），審核以下建議卡片是否相關。

        審核標準：
        1. 剔除「矛盾」或「不可行」的建議（例如：對輪椅用戶建議走樓梯）。
        2. 剔除「無關」建議（例如：對商務客顯示兒童樂園折扣）。
        3. 保留「通用」且「有價值」的建議（例如：車站Wi-Fi、廁所位置）。

        請回傳一個 JSON 陣列，包含所有應該【保留】的卡片 ID。`
        : `You are LUTAGU's smart filter. Review advice cards based on user needs (e.g. Wheelchair, Stroller).
        Task: Return a JSON array of card IDs that should be KEPT.
        Criteria: Remove irrelevant or physically impossible advice for this user. Keep helpful general advice.`;

    const cardList = cards.map(c => `ID: ${c.id}\nTitle: ${c.title}\nContent: ${c.description || c.content}`).join('\n---\n');

    // Include Weather in prompt if available
    const weatherInfo = context.weather
        ? `\nWeather: ${context.weather.temp}°C, ${context.weather.condition} (Prioritize indoor/dry routes if raining)`
        : '';

    const userPrompt = `User Needs: ${activeNeeds.join(', ')}\nStation: ${context.stationId}${weatherInfo}\n\nCandidate Cards:\n${cardList}`;

    const result = await generateLLMResponse({
        systemPrompt,
        userPrompt,
        taskType: 'simple', // Trinity: Gemini 2.5 Flash Lite (Fast Logic)
        temperature: 0.1 // Specificity is key
    });

    if (result) {
        try {
            // Extract JSON array (using [\s\S]* for multiline compatibility instead of /s flag)
            const jsonMatch = result.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const keptIds = JSON.parse(jsonMatch[0]);
                if (Array.isArray(keptIds)) {
                    const idSet = new Set(keptIds);
                    // Filter original cards
                    return cards.filter(c => idSet.has(c.id));
                }
            }
        } catch (e) {
            console.warn('[llmService] Rerank parsing failed:', e);
        }
    }

    // Fallback: Return original
    return cards;
}
