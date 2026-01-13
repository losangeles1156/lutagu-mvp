
import { WEATHER_REGION_POLICY } from '../src/lib/weather/policy';
import { generateLLMResponse } from '../src/lib/ai/llmClient';
import { createClient } from '@supabase/supabase-js';

// Setup Supabase Client (Service Role for Admin Write)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase Credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function isOperatingHours(): boolean {
    const now = new Date();
    // Convert to JST (UTC+9)
    const jstHours = (now.getUTCHours() + 9) % 24;
    return jstHours >= 5 && jstHours < 23;
}

async function getTranslatedAlert(title: string, summary: string, severity: string) {
    const fallback = {
        ja: summary,
        en: 'Details available in Japanese.',
        zh: '詳細內容僅提供日文。'
    };

    try {
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
            taskType: 'classification',
            temperature: 0.1
        });

        if (!jsonStr) return fallback;
        const cleanJson = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanJson);
    } catch (e) {
        console.error('Translation failed', e);
        return fallback;
    }
}

async function updateWeatherCache() {
    if (!isOperatingHours()) {
        console.log('[Cron] Outside operating hours (05:00-23:00 JST). Skipping.');
        return;
    }

    console.log('[Cron] Fetching JMA RSS...');
    try {
        const response = await fetch('https://www.data.jma.go.jp/developer/xml/feed/extra.xml');
        if (!response.ok) throw new Error('Failed to fetch JMA RSS');

        const xml = await response.text();
        const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
        let match;

        const validEntries: any[] = [];

        while ((match = entryRegex.exec(xml)) !== null) {
            const content = match[1];
            const title = content.match(/<title>(.*?)<\/title>/)?.[1] || '';
            const summary = content.match(/<content type="text">([\s\S]*?)<\/content>/)?.[1] ||
                content.match(/<summary>([\s\S]*?)<\/summary>/)?.[1] || '';
            const updated = content.match(/<updated>(.*?)<\/updated>/)?.[1] || '';

            if (!WEATHER_REGION_POLICY.isTargetRegion(title, summary)) continue;

            const region = WEATHER_REGION_POLICY.extractRegion(title, summary.replace(/<br \/>/g, '\n').trim());
            const isExcluded = WEATHER_REGION_POLICY.excludedRegions.some(ex => region.includes(ex)) ||
                region === '千葉南部' ||
                region === '千葉北東部' ||
                region === '神奈川西部';

            if (isExcluded) continue;

            validEntries.push({ title, summary, updated, region });
        }

        console.log(`[Cron] Found ${validEntries.length} valid alerts. Processing...`);

        const processedAlerts = await Promise.all(validEntries.map(async (entry) => {
            const cleanSummary = entry.summary.replace(/<br \/>/g, '\n').trim();
            const severity = WEATHER_REGION_POLICY.getSeverity(entry.title, cleanSummary);
            const severityLabel = WEATHER_REGION_POLICY.getSeverityLabel(severity);
            const polyglotSummary = await getTranslatedAlert(entry.title, cleanSummary, severity);

            return {
                title: entry.title,
                summary: polyglotSummary,
                severity: severityLabel,
                region: entry.region,
                updated: entry.updated
            };
        }));

        await supabase.from('l2_cache').upsert({
            key: 'weather:alerts:global',
            value: processedAlerts,
            updated_at: new Date().toISOString()
        });

        console.log('[Cron] Weather cache updated successfully.');

    } catch (e) {
        console.error('[Cron] Update failed:', e);
    }
}

updateWeatherCache();
