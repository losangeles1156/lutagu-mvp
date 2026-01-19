
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { Mistral } from '@mistralai/mistralai';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Setup Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Setup Mistral
const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

// Target URLs for Prototype
const TARGETS = [
    {
        stationId: 'odpt.Station:TokyoMetro.Ginza.Ueno',
        url: 'https://www.tokyometro.jp/station/ueno/accessibility/index.html',
        operator: 'TokyoMetro'
    }
];

async function fetchPageContent(url: string): Promise<string> {
    console.log(`fetching ${url}...`);
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const html = await res.text();

        // Simple HTML cleanup
        const textContent = html
            .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "")
            .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gim, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .slice(0, 30000);

        return textContent;
    } catch (e) {
        console.error(`Fetch error: ${e}`);
        return '';
    }
}

async function extractFacilities(text: string, operator: string) {
    const prompt = `
    You are a data extraction AI. Extract station facility information from the provided text (scraped from a Japanese train station website).

    Target Operator: ${operator}

    Extract the following strictly as a JSON array of objects:
    - type: "elevator", "escalator", "toilet", "barrier_free_entrance", "waiting_room"
    - name_ja: A short descriptive name (e.g., "改札内エレベーター (ホーム〜改札)")
    - name_en: English translation of the name
    - location_desc: The location description found in text (e.g., "ホーム階〜改札階")
    - attributes: JSON object with details (e.g., { "wheelchair": true, "ostomate": true, "baby_chair": true })

    Rules:
    - For toilets, look for "多機能トイレ", "車いす", "オストメイト".
    - Ignore generic headers like "Menu" or "Footer".
    - Only extract specific facilities mentioned with locations.
    - Return ONLY valid JSON, no markdown formatting.

    Input Text:
    ${text}
    `;

    try {
        const result = await mistral.chat.complete({
            model: 'mistral-large-latest',
            messages: [{ role: 'user', content: prompt }],
            responseFormat: { type: 'json_object' }
        });

        let content = result.choices[0].message.content as string;
        // Sometimes LLM wraps in { "facilities": [...] } or just [...]
        console.log("Raw LLM Response snippet:", content.slice(0, 50) + "...");

        content = content.replace(/```json/g, '').replace(/```/g, '').trim();

        const parsed = JSON.parse(content);
        return Array.isArray(parsed) ? parsed : (parsed.facilities || parsed.data || parsed.items || []);
    } catch (e) {
        console.error("LLM Extraction Error:", e);
        return [];
    }
}

async function main() {
    console.log('🚀 Phase 2 Scraper Prototype (Schema-Compliant) Started');

    for (const target of TARGETS) {
        console.log(`Processing ${target.stationId}...`);

        // 1. Fetch
        const rawText = await fetchPageContent(target.url);
        if (!rawText) continue;

        // 2. Extract
        const facilities = await extractFacilities(rawText, target.operator);
        console.log(`Found ${facilities.length} facilities.`);

        // 3. Save
        if (facilities.length > 0) {
            const rows = facilities.map((f: any) => ({
                station_id: target.stationId,
                type: f.type,
                name_i18n: { ja: f.name_ja, en: f.name_en },
                // Store tracking info in attributes JSONB to avoid schema errors
                attributes: {
                    ...f.attributes,
                    location_description: f.location_desc,
                    _source: 'OfficialWeb_Scraper_Mistral',
                    _source_url: target.url
                },
                updated_at: new Date().toISOString()
            }));

            const { error } = await supabase
                .from('l3_facilities')
                .upsert(rows); // Upsert to avoid duplicates

            if (error) console.error('DB Error:', error.message);
            else console.log('✅ Saved to DB.');
        } else {
            console.warn('⚠️ No facilities extracted via LLM.');
        }
    }
}

main().catch(console.error);
