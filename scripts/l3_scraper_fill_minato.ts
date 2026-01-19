
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

const TARGETS = [
    // Metro
    { id: "odpt:Station:TokyoMetro.Hiroo", slug: "hiroo", type: "metro" },
    { id: "odpt:Station:TokyoMetro.Roppongi", slug: "roppongi", type: "metro" },
    { id: "odpt:Station:TokyoMetro.Akasakamitsuke", slug: "akasaka-mitsuke", type: "metro" },
    { id: "odpt:Station:TokyoMetro.Shimbashi", slug: "shimbashi", type: "metro" },
    { id: "odpt.Station:TokyoMetro.Yurakucho.Tsukishima", slug: "tsukishima", type: "metro" },

    // Toei
    { id: "odpt:Station:Toei.Kachidoki", slug: "kachidoki", type: "toei" },
    { id: "odpt:Station:Toei.Tsukishima", slug: "tsukishima", type: "toei" },
    // Roppongi Toei (Oedo)
    { id: "odpt:Station:Toei.Oedo.Roppongi", slug: "roppongi", type: "toei" }
];

async function fetchPageContent(url: string): Promise<string> {
    console.log(`fetching ${url}...`);
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        return await res.text();
    } catch (e) {
        console.error(`Fetch error: ${(e as Error).message}`);
        return '';
    }
}

async function extractFacilities(text: string, operator: string) {
    const prompt = `
    Extract station facilities (elevator, toilet, barrier_free) from this ${operator} website text.
    Return strictly JSON array (no markdown) with objects:
    { type, name_ja, name_en, location_desc, attributes }

    Text: ${text.slice(0, 15000)}
    `;

    try {
        await new Promise(r => setTimeout(r, 1000));
        const result = await mistral.chat.complete({
            model: 'mistral-large-latest',
            messages: [{ role: 'user', content: prompt }],
            responseFormat: { type: 'json_object' }
        });
        const content = (result.choices?.[0]?.message?.content as string).replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(content);
        return Array.isArray(parsed) ? parsed : (parsed.facilities || parsed.items || []);
    } catch (e) {
        console.error("LLM Error", e);
        return [];
    }
}

async function main() {
    console.log(`🚀 Starting Minato Fill (${TARGETS.length} stations)`);

    for (const t of TARGETS) {
        let url = '';
        if (t.type === 'metro') url = `https://www.tokyometro.jp/station/${t.slug}/accessibility/index.html`;
        else if (t.type === 'toei') url = `https://www.kotsu.metro.tokyo.jp/subway/stations/${t.slug}.html`;

        const html = await fetchPageContent(url);
        if (!html) continue;

        const facilities = await extractFacilities(html, t.type === 'metro' ? 'TokyoMetro' : 'Toei');
        console.log(`${t.slug} (${t.type}): Found ${facilities.length}`);

        if (facilities.length > 0) {
            const rows = facilities.map((f: any) => ({
                station_id: t.id,
                type: f.type,
                name_i18n: { ja: f.name_ja, en: f.name_en },
                attributes: { ...f.attributes, location_description: f.location_desc },
                updated_at: new Date().toISOString()
            }));
            const { error } = await supabase.from('l3_facilities').upsert(rows);
            if (error) console.error('DB Error', error);
            else console.log('✅ Saved');
        }
    }
}

main();
