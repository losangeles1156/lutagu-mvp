
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

// === TARGETS (Chiyoda, Chuo, Taito) ===
// Slug corrections: Metro uses hyphens for compound names (e.g. ueno-hirokoji)
const TARGETS = [
    // CHIYODA
    { id: "odpt.Station:TokyoMetro.Chiyoda.Hibiya", slug: "hibiya", operator: "TokyoMetro" },
    { id: "odpt.Station:TokyoMetro.Chiyoda.Kasumigaseki", slug: "kasumigaseki", operator: "TokyoMetro" },
    { id: "odpt.Station:TokyoMetro.Chiyoda.Nijubashimae", slug: "nijubashimae", operator: "TokyoMetro" },
    { id: "odpt.Station:TokyoMetro.Chiyoda.Otemachi", slug: "otemachi", operator: "TokyoMetro" },
    { id: "odpt.Station:TokyoMetro.Chiyoda.ShinOchanomizu", slug: "shin-ochanomizu", operator: "TokyoMetro" },
    { id: "odpt.Station:TokyoMetro.Ginza.Kanda", slug: "kanda", operator: "TokyoMetro" },
    { id: "odpt.Station:TokyoMetro.Hanzomon.Kudanshita", slug: "kudanshita", operator: "TokyoMetro" },
    { id: "odpt.Station:TokyoMetro.Hanzomon.Hanzomon", slug: "hanzomon", operator: "TokyoMetro" },
    { id: "odpt.Station:TokyoMetro.Hanzomon.Jimbocho", slug: "jimbocho", operator: "TokyoMetro" },
    { id: "odpt.Station:TokyoMetro.Hanzomon.Nagatacho", slug: "nagatacho", operator: "TokyoMetro" },
    { id: "odpt.Station:TokyoMetro.Hibiya.Akihabara", slug: "akihabara", operator: "TokyoMetro" },
    { id: "odpt.Station:TokyoMetro.Marunouchi.Awajicho", slug: "awajicho", operator: "TokyoMetro" },
    { id: "odpt.Station:TokyoMetro.Marunouchi.Tokyo", slug: "tokyo", operator: "TokyoMetro" },
    { id: "odpt.Station:TokyoMetro.Marunouchi.Ochanomizu", slug: "ochanomizu", operator: "TokyoMetro" },
    { id: "odpt.Station:TokyoMetro.Namboku.Iidabashi", slug: "iidabashi", operator: "TokyoMetro" },
    { id: "odpt.Station:TokyoMetro.Tozai.Takebashi", slug: "takebashi", operator: "TokyoMetro" },
    { id: "odpt.Station:TokyoMetro.Yurakucho.Sakuradamon", slug: "sakuradamon", operator: "TokyoMetro" },
    { id: "odpt.Station:TokyoMetro.Yurakucho.Yurakucho", slug: "yurakucho", operator: "TokyoMetro" },

    // CHUO
    { id: "odpt.Station:TokyoMetro.Ginza.Ginza", slug: "ginza", operator: "TokyoMetro" },
    { id: "odpt.Station:TokyoMetro.Ginza.Kyobashi", slug: "kyobashi", operator: "TokyoMetro" },
    { id: "odpt.Station:TokyoMetro.Ginza.Mitsukoshimae", slug: "mitsukoshimae", operator: "TokyoMetro" },
    { id: "odpt.Station:TokyoMetro.Ginza.Nihombashi", slug: "nihombashi", operator: "TokyoMetro" },
    { id: "odpt.Station:TokyoMetro.Hanzomon.Suitengumae", slug: "suitengumae", operator: "TokyoMetro" },
    { id: "odpt.Station:TokyoMetro.Hibiya.HigashiGinza", slug: "higashi-ginza", operator: "TokyoMetro" }, // Hyphen?
    { id: "odpt.Station:TokyoMetro.Hibiya.Hatchobori", slug: "hatchobori", operator: "TokyoMetro" },
    { id: "odpt.Station:TokyoMetro.Hibiya.Kodemmacho", slug: "kodemmacho", operator: "TokyoMetro" },
    { id: "odpt.Station:TokyoMetro.Hibiya.Kayabacho", slug: "kayabacho", operator: "TokyoMetro" },
    { id: "odpt.Station:TokyoMetro.Hibiya.Ningyocho", slug: "ningyocho", operator: "TokyoMetro" },
    { id: "odpt.Station:TokyoMetro.Hibiya.Tsukiji", slug: "tsukiji", operator: "TokyoMetro" },
    { id: "odpt.Station:TokyoMetro.Yurakucho.GinzaItchome", slug: "ginza-itchome", operator: "TokyoMetro" }, // Hyphen likely
    { id: "odpt.Station:TokyoMetro.Yurakucho.Shintomicho", slug: "shintomicho", operator: "TokyoMetro" },
    { id: "odpt.Station:TokyoMetro.Yurakucho.Tsukishima", slug: "tsukishima", operator: "TokyoMetro" },

    // TAITO
    { id: "odpt.Station:TokyoMetro.Ginza.Ueno", slug: "ueno", operator: "TokyoMetro" },
    { id: "odpt.Station:TokyoMetro.Ginza.Asakusa", slug: "asakusa", operator: "TokyoMetro" },
    { id: "odpt.Station:TokyoMetro.Ginza.Inaricho", slug: "inaricho", operator: "TokyoMetro" },
    { id: "odpt.Station:TokyoMetro.Ginza.UenoHirokoji", slug: "ueno-hirokoji", operator: "TokyoMetro" },
    { id: "odpt.Station:TokyoMetro.Ginza.Tawaramachi", slug: "tawaramachi", operator: "TokyoMetro" },
    { id: "odpt.Station:TokyoMetro.Hibiya.Iriya", slug: "iriya", operator: "TokyoMetro" },
    { id: "odpt.Station:TokyoMetro.Hibiya.Minowa", slug: "minowa", operator: "TokyoMetro" },
    { id: "odpt.Station:TokyoMetro.Hibiya.NakaOkachimachi", slug: "naka-okachimachi", operator: "TokyoMetro" }
];

async function fetchPageContent(url: string): Promise<string> {
    console.log(`fetching ${url}...`);
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const html = await res.text();

        const textContent = html
            .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "")
            .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gim, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .slice(0, 30000); // 30KB limit

        return textContent;
    } catch (e) {
        console.error(`Fetch error: ${e instanceof Error ? e.message : String(e)}`);
        return '';
    }
}

async function extractFacilities(text: string, operator: string) {
    const prompt = `
    You are a data extraction AI. Extract station facility information from the scraping text.
    Target Operator: ${operator}

    Extract strictly as JSON array of objects:
    - type: "elevator", "escalator", "toilet", "barrier_free_entrance", "waiting_room"
    - name_ja: Short descriptive name (e.g. "改札内エレベーター")
    - name_en: English name
    - location_desc: Location text (e.g. "ホーム階〜改札階")
    - attributes: JSON object (e.g. { "wheelchair": true, "ostomate": true })

    Rules:
    - Look for "多機能トイレ", "車いす", "オストメイト".
    - Ignore navigation menus.

    Input:
    ${text}
    `;

    try {
        await new Promise(r => setTimeout(r, 1000)); // Rate limit prevention

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
    console.log(`🚀 Starting Phase 2 Batch for 3 Wards (${TARGETS.length} stations)`);

    let successCount = 0;

    for (const target of TARGETS) {
        const url = `https://www.tokyometro.jp/station/${target.slug}/accessibility/index.html`;
        console.log(`\nProcessing ${target.slug} (${target.id})...`);

        const rawText = await fetchPageContent(url);
        if (!rawText) {
            console.warn(`Skipping ${target.slug} due to fetch error.`);
            continue;
        }

        const facilities = await extractFacilities(rawText, target.operator);
        console.log(`Found ${facilities.length} facilities.`);

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

        // Polite delay
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log(`\nBatch Complete. Success: ${successCount}/${TARGETS.length}`);
}

main().catch(console.error);
