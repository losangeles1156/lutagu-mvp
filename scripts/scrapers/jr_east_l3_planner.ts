/**
 * JR East L3 Facility Scraper
 * 
 * Strategy:
 * 1. For each JR East station missing L3 data:
 *    - Look up the JR East internal station code (from a mapping table or ODPT API)
 *    - Fetch the barrier-free page: /estation/stations/[ID].html
 *    - Parse facility availability (elevator, toilet, wheelchair toilet, escalator)
 * 2. Output: SQL insert statements for l3_facilities table
 * 
 * Note: JR East website requires browser automation due to 403 blocking of simple HTTP requests.
 * This script generates a list of URLs and expected data structure for manual review or
 * Puppeteer-based execution.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { normalizeToLogicalId } from '../src/lib/nodes/nodeIdNormalizer';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// JR East Station Code Mapping (station_name -> code)
// This is a partial mapping for major stations
// Full mapping should be built from ODPT API or JR East data
const JR_EAST_STATION_CODES: Record<string, number> = {
    'Shinjuku': 866,
    'Tokyo': 1039,
    'Shibuya': 859,
    'Ikebukuro': 108,
    'Ueno': 204,
    'Akihabara': 10,
    'Shinagawa': 788,
    'Yurakucho': 1156,
    'Kanda': 311,
    'Ochanomizu': 232,
    'Harajuku': 624,
    'Ebisu': 205,
    'Meguro': 1002,
    'Osaki': 205,
    'Gotanda': 578,
    'Tamachi': 939,
    'Hamamatsucho': 616,
    'Shimbashi': 793,
    'Nippori': 528,
    'Uguisudani': 157,
    'Sugamo': 839,
    'Komagome': 473,
    'Tabata': 938,
    'Nishi-Nippori': 535,
    'OkachimachiParsed later': 240,
    'Akabane': 1,
    'Kinshicho': 397,
    'Ryogoku': 1147,
    'Kameido': 308,
    'Naka-Okachimachi': 0, // Needs lookup
    // ... Add more as needed
};

interface MissingStation {
    id: string;
    name_en: string | null;
    name_ja: string | null;
}

async function generateScrapingPlan() {
    console.log('🔍 Generating JR East L3 Scraping Plan...\n');

    // 1. Get missing JR East stations
    const { data: missing, error } = await supabase
        .from('nodes')
        .select('id, name')
        .like('id', '%JR-East%')
        .eq('is_active', true)
        .not('id', 'in', supabase.from('l3_facilities').select('station_id'));

    // Workaround: Direct query for missing
    const { data: allJR } = await supabase.from('nodes').select('id, name').like('id', '%JR-East%').eq('is_active', true);
    const { data: hasL3 } = await supabase.from('l3_facilities').select('station_id').like('station_id', '%JR-East%');

    const hasL3Set = new Set((hasL3 || []).map(r => r.station_id));
    const missingJR = (allJR || []).filter(n => !hasL3Set.has(n.id));

    console.log(`Found ${missingJR.length} JR East stations without L3 data.\n`);

    // 2. Build scraping plan
    const plan: { stationId: string; nameEn: string; nameJa: string; jrCode: number | null; url: string }[] = [];

    for (const station of missingJR) {
        // Extract station name from ID: odpt:Station:JR-East.StationName
        const parts = station.id.split('.');
        const stationNameFromId = parts[parts.length - 1];

        const nameEn = station.name?.en || stationNameFromId;
        const nameJa = station.name?.ja || stationNameFromId;

        // Try to find JR East code
        const jrCode = JR_EAST_STATION_CODES[stationNameFromId] || null;
        const url = jrCode ? `https://www.jreast.co.jp/estation/stations/${jrCode}.html` : 'Unknown';

        plan.push({
            stationId: station.id,
            nameEn,
            nameJa,
            jrCode,
            url
        });
    }

    // 3. Generate output files

    // 3a. CSV for manual review
    let csv = 'station_id,name_en,name_ja,jr_code,url,status\n';
    for (const p of plan) {
        csv += `"${p.stationId}","${p.nameEn}","${p.nameJa}",${p.jrCode || ''},${p.url},pending\n`;
    }
    fs.writeFileSync(path.join(process.cwd(), 'scripts/jr_east_scrape_plan.csv'), csv);
    console.log('📄 Saved: scripts/jr_east_scrape_plan.csv');

    // 3b. JSON for programmatic use
    fs.writeFileSync(
        path.join(process.cwd(), 'scripts/jr_east_scrape_plan.json'),
        JSON.stringify(plan, null, 2)
    );
    console.log('📄 Saved: scripts/jr_east_scrape_plan.json');

    // 3c. Summary
    const withCode = plan.filter(p => p.jrCode !== null).length;
    const withoutCode = plan.filter(p => p.jrCode === null).length;
    console.log(`\n📊 Summary:`);
    console.log(`   - With JR Code (can scrape): ${withCode}`);
    console.log(`   - Without JR Code (need mapping): ${withoutCode}`);
    console.log(`\nNext Steps:`);
    console.log(`   1. Review jr_east_scrape_plan.csv and add missing JR codes`);
    console.log(`   2. Run jr_east_scraper_puppeteer.ts to fetch data`);
    console.log(`   3. Generate SQL migration from scraped data`);
}

generateScrapingPlan().catch(console.error);
