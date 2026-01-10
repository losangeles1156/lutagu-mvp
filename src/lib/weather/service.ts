
import { supabaseAdmin } from '@/lib/supabase';
import { WEATHER_REGION_POLICY } from './policy';
import { generateLLMResponse } from '@/lib/ai/llmClient';
import { createHash } from 'crypto';

// Helper to translate/summarize alert using AI with Caching
async function getTranslatedAlert(title: string, summary: string, updated: string, severity: string) {
    // 1. Create content hash
    const hash = createHash('md5').update(`${title}:${updated}:${summary}:${severity}`).digest('hex');
    const cacheKey = `weather:v1:${hash}`;

    // 2. Check Cache
    const { data: cached } = await supabaseAdmin
        .from('l2_cache')
        .select('value')
        .eq('key', cacheKey)
        .maybeSingle();

    if (cached?.value) {
        return cached.value;
    }

    // 3. Call AI if miss
    console.log(`[WeatherService] Cache miss for ${hash}. Calling AI...`);

    // Fallback default
    const fallback = {
        ja: summary,
        en: 'Detailed weather information is available in Japanese.',
        zh: '詳細天氣資訊僅提供日文版本。'
    };

    try {
        // Adjust translation style based on severity
        // ... (Reuse existing logic or simplified)
        const severityConfig = {
            critical: { style: '緊急、簡潔、嚴肅', maxLength: 30 },
            warning: { style: '謹慎、清晰、實用', maxLength: 40 },
            advisory: { style: '溫和、友善、提醒', maxLength: 50 },
            info: { style: '中性、資訊性', maxLength: 60 }
        };

        const config = severityConfig[severity as keyof typeof severityConfig] || severityConfig.info;

        const prompt = `
You are a weather translator for a travel app in Tokyo.
Translate and summarize the following JMA Weather Alert into a strictly valid JSON object.
Severity: ${severity}
Input: ${title} - ${summary}
Output JSON format: { "ja": "...", "en": "...", "zh": "..." }
Keep it concise.
`;
        const jsonStr = await generateLLMResponse({
            systemPrompt: 'Output raw JSON only.',
            userPrompt: prompt,
            temperature: 0.1
        });

        if (!jsonStr) return fallback;

        const cleanJson = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);

        if (!parsed.ja || !parsed.en || !parsed.zh) throw new Error('Invalid JSON structure');

        // 4. Write to Cache
        await supabaseAdmin.from('l2_cache').insert({
            key: cacheKey,
            value: parsed,
            updated_at: new Date().toISOString()
        });

        return parsed;

    } catch (e) {
        console.error('[WeatherService] AI Translation Failed:', e);
        return fallback;
    }
}

export async function fetchWeatherAlerts(locale: string = 'zh') {
    try {
        const response = await fetch('https://www.data.jma.go.jp/developer/xml/feed/extra.xml', {
            next: { revalidate: 300 }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch JMA RSS');
        }

        const xml = await response.text();
        const entries: any[] = [];
        const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
        let match;

        while ((match = entryRegex.exec(xml)) !== null) {
            const content = match[1];
            const title = content.match(/<title>(.*?)<\/title>/)?.[1] || '';
            const summary = content.match(/<content type="text">([\s\S]*?)<\/content>/)?.[1] ||
                content.match(/<summary>([\s\S]*?)<\/summary>/)?.[1] || '';
            const updated = content.match(/<updated>(.*?)<\/updated>/)?.[1] || '';

            if (!WEATHER_REGION_POLICY.isTargetRegion(title, summary)) {
                continue;
            }

            const severity = WEATHER_REGION_POLICY.getSeverity(title, summary);
            const severityLabel = WEATHER_REGION_POLICY.getSeverityLabel(severity);
            const cleanSummary = summary.replace(/<br \/>/g, '\n').trim();

            const polyglotSummary = await getTranslatedAlert(title, cleanSummary, updated, severity);

            let displaySummary = polyglotSummary.zh;
            if (locale === 'en') displaySummary = polyglotSummary.en;
            if (locale === 'ja') displaySummary = polyglotSummary.ja;

            const region = WEATHER_REGION_POLICY.extractRegion(title, cleanSummary);

            // [Filter] Double check: Explicitly exclude unwanted regions even if they passed isTargetRegion
            const isExcluded = WEATHER_REGION_POLICY.excludedRegions.some(ex => region.includes(ex)) ||
                region === '千葉南部' ||
                region === '千葉北東部' ||
                region === '神奈川西部';

            if (isExcluded) {
                continue;
            }

            entries.push({
                title,
                summary: displaySummary,
                severity: severityLabel,
                region
            });
        }

        return entries;

    } catch (error: any) {
        console.error('Weather Service Error:', error.message);
        return [];
    }
}

// Open-Meteo Live Weather Fetch
export async function getLiveWeather(lat: number = 35.6895, lon: number = 139.6917) {
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=Asia%2FTokyo`;

        const res = await fetch(url, { next: { revalidate: 300 } });
        if (!res.ok) throw new Error('OpenMeteo Failed');

        const data = await res.json();
        const current = data.current;

        if (!current) throw new Error('No current weather data');

        const code = current.weather_code;
        const condition = getWeatherLabel(code);
        const emoji = getWeatherEmoji(code);

        return {
            temp: current.temperature_2m,
            humidity: current.relative_humidity_2m,
            wind: current.wind_speed_10m,
            condition,
            label: condition, // Compat
            emoji,
            precipitationProbability: 0 // Not in basic current api
        };
    } catch (e) {
        console.warn('Live Weather Warning:', e);
        return {
            temp: 20,
            humidity: 50,
            wind: 2,
            condition: 'Unknown',
            label: 'Unknown',
            emoji: '☁️',
            precipitationProbability: 0
        };
    }
}

function getWeatherLabel(code: number): string {
    if (code === 0) return 'Clear';
    if (code >= 1 && code <= 3) return 'Cloudy';
    if (code >= 45 && code <= 48) return 'Fog';
    if (code >= 51 && code <= 67) return 'Rain';
    if (code >= 71 && code <= 77) return 'Snow';
    if (code >= 80 && code <= 82) return 'Showers';
    if (code >= 95) return 'Thunderstorm';
    return 'Unknown';
}

function getWeatherEmoji(code: number): string {
    if (code === 0) return '☀️';
    if (code >= 1 && code <= 3) return '☁️';
    if (code >= 51 && code <= 67) return 'Hz🌧️';
    if (code >= 95) return '⚡️';
    return '🌥️';
}
