
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { Mistral } from '@mistralai/mistralai';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

// Manual slug corrections for Toei (based on typical patterns)
// Usually hyphenated for compound names.
const TARGETS = [
    { id: "odpt.Station:Toei.Asakusa.Kuramae", slug: "kuramae", operator: "Toei" },
    { id: "odpt.Station:Toei.Arakawa.Minowabashi", slug: "minowabashi", operator: "Toei" },
    { id: "odpt.Station:Toei.Asakusa.Asakusabashi", slug: "asakusabashi", operator: "Toei" },
    { id: "odpt.Station:Toei.Asakusa.HigashiNihombashi", slug: "higashi-nihombashi", operator: "Toei" },
    { id: "odpt.Station:Toei.Mita.Hibiya", slug: "hibiya", operator: "Toei" },
    { id: "odpt.Station:Toei.Mita.Suidobashi", slug: "suidobashi", operator: "Toei" },
    { id: "odpt.Station:Toei.Oedo.Kachidoki", slug: "kachidoki", operator: "Toei" },
    { id: "odpt.Station:Toei.Oedo.Kuramae", slug: "kuramae-oedo", operator: "Toei" }, // Oedo Kuramae is separate? Or same page. Toei usually merges. Let's try 'kuramae' first.
    { id: "odpt.Station:Toei.Oedo.ShinOkachimachi", slug: "shin-okachimachi", operator: "Toei" },
    { id: "odpt.Station:Toei.Oedo.Tsukijishijo", slug: "tsukijishijo", operator: "Toei" },
    { id: "odpt.Station:Toei.Oedo.UenoOkachimachi", slug: "ueno-okachimachi", operator: "Toei" },
    { id: "odpt.Station:Toei.Shinjuku.Hamacho", slug: "hamacho", operator: "Toei" },
    { id: "odpt.Station:Toei.Shinjuku.Iwamotocho", slug: "iwamotocho", operator: "Toei" },
    { id: "odpt.Station:Toei.Shinjuku.Ogawamachi", slug: "ogawamachi", operator: "Toei" }
];

async function fetchPageContent(url: string): Promise<string> {
    console.log(`fetching ${url}...`);
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const html = await res.text();

        // Strip out non-content to save tokens
        const textContent = html
            .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "")
            .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gim, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .slice(0, 30000);

        return textContent;
    } catch (e) {
        console.error(`Fetch error: ${e instanceof Error ? e.message : String(e)}`);
        return '';
    }
}

async function extractFacilities(text: string, operator: string) {
    const prompt = `
    You are a data extraction AI. Extract station facility information from the scraping text (Toei Subway website).

    Target Operator: ${operator}

    Extract strictly as JSON array of objects:
    - type: "elevator", "escalator", "toilet", "barrier_free_entrance", "waiting_room"
    - name_ja: Short descriptive name (e.g. "改札内エレベーター")
    - name_en: English name or null
    - location_desc: Location text found (e.g. "A1出口付近")
    - attributes: JSON object (e.g. { "count": 2, "wheelchair": true })

    Rules:
    - Toei pages list counts (e.g. "エスカレーター : 6台"). Capture this in attributes.count.
    - If specific locations aren't listed, generic "Station Facility" is okay.
    - Look for "バリアフリー設備" section.

    Input:
    ${text}
    `;

    try {
        await new Promise(r => setTimeout(r, 1000));

        const result = await mistral.chat.complete({
            model: 'mistral-large-latest',
            messages: [{ role: 'user', content: prompt }],
            responseFormat: { type: 'json_object' }
        });

        let content = result.choices[0].message.content as string;
        content = content.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(content);
        return Array.isArray(parsed) ? parsed : (parsed.facilities || parsed.data || parsed.items || []);
    } catch (e) {
        console.error("LLM Extraction Error:", e);
        return [];
    }
}

async function main() {
    console.log(`🚀 Starting Toei Batch (${TARGETS.length} stations)`);
    let successCount = 0;

    for (const target of TARGETS) {
        // Try slug variations if needed. But let's start with hyphens.
        const url = `https://www.kotsu.metro.tokyo.jp/subway/stations/${target.slug}.html`;

        const rawText = await fetchPageContent(url);
        if (!rawText) continue; // Skip if 404

        const facilities = await extractFacilities(rawText, target.operator);
        console.log(`Found ${facilities.length} facilities for ${target.slug}.`);

        if (facilities.length > 0) {
            const rows = facilities.map((f: any) => ({
                station_id: target.id,
                type: f.type,
                name_i18n: { ja: f.name_ja, en: f.name_en },
                attributes: {
                    ...f.attributes,
                    location_description: f.location_desc,
                    _source: 'OfficialWeb_Scraper_Mistral',
                    _source_url: url
                },
                updated_at: new Date().toISOString()
            }));

            const { error } = await supabase.from('l3_facilities').upsert(rows);

            if (error) console.error('DB Error:', error.message);
            else {
                console.log('✅ Saved.');
                successCount++;
            }
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    console.log(`Toei Batch Complete: ${successCount}/${TARGETS.length}`);
}

main().catch(console.error);
