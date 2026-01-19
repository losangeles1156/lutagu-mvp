
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

// Target
const TARGET = {
    stationId: 'odpt:Station:JR-East.Ueno',
    url: 'https://www.jreast.co.jp/estation/stations/204.html',
    operator: 'JR-East'
};

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
    You are a data extraction AI. Extract station facility information from the provided text (scraped from a JR East station website).

    Target Operator: ${operator}

    Extract strictly as a JSON array of objects:
    - type: "elevator", "escalator", "toilet", "barrier_free_entrance", "waiting_room", "ticket_gate"
    - name_ja: A short descriptive name (e.g., "中央改札 エレベーター")
    - name_en: English translation of the name
    - location_desc: The location description found in text (e.g., "3F改札〜1Fホーム")
    - attributes: JSON object with details (e.g., { "wheelchair": true, "ostomate": true })

    Rules:
    - Look for "Barrier Free", "Elevator", "Restroom" sections.
    - JR East pages often list facilities in tables.
    - Return ONLY valid JSON, no markdown.

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
    console.log('🚀 JR East Ueno Scraper Started');
    console.log(`Processing ${TARGET.stationId}...`);

    // 1. Fetch
    const rawText = await fetchPageContent(TARGET.url);
    if (!rawText) return;

    // 2. Extract
    const facilities = await extractFacilities(rawText, TARGET.operator);
    console.log(`Found ${facilities.length} facilities.`);

    // 3. Save to stations_static
    if (facilities.length > 0) {
        // Transform to ServiceFacility like structure for storage
        const l3Services = facilities.map((f: any, idx: number) => ({
            type: f.type,
            name: { ja: f.name_ja, en: f.name_en },
            location: f.location_desc,
            attributes: {
                ...f.attributes,
                updated_at: new Date().toISOString()
            }
        }));

        const { error } = await supabase
            .from('stations_static')
            .upsert({
                station_id: TARGET.stationId,
                l3_services: l3Services,
                updated_at: new Date().toISOString()
            }, { onConflict: 'station_id' });

        if (error) console.error('DB Error:', error.message);
        else console.log('✅ Saved to stations_static.');
    } else {
        console.warn('⚠️ No facilities extracted via LLM.');
    }
}

main().catch(console.error);
