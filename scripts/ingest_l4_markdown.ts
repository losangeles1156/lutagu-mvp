
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Service Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface L4Item {
    icon?: string;
    title: string;
    description?: string;
    advice?: string;
}

interface L4Facility {
    type: string;
    location: string;
    tags: string[];
}

interface RidingKnowledge {
    traps: L4Item[];
    hacks: L4Item[];
    facilities: L4Facility[];
}

const KNOWLEDGE_DIR = path.resolve(__dirname, '../knowledge/stations/riding_knowledge');
const EXCLUDE_FILES = ['metro_toei_all_stations.md', 'metro_toei_remaining.md', 'metro_remaining_lines_universal.md']; // Handle these separately or skip if redundant

async function findNodeId(searchId: string): Promise<string | null> {
    // 1. Try exact match
    let { data: node } = await supabase.from('nodes').select('id').eq('id', searchId).maybeSingle();
    if (node) return node.id;

    // 2. Try swapping separators (odpt: vs odpt.)
    const altId = searchId.includes('odpt:Station:')
        ? searchId.replace('odpt:Station:', 'odpt.Station:')
        : searchId.replace('odpt.Station:', 'odpt:Station:');

    ({ data: node } = await supabase.from('nodes').select('id').eq('id', altId).maybeSingle());
    if (node) return node.id;

    // Manual overrides for tricky Markdown headers
    const manualMappings: Record<string, string> = {
        'odpt:Station:京急電鐵 羽田機場第1・第2航廈站': 'odpt.Station:Keikyu.Airport.HanedaAirportTerminal1And2',
        'odpt:Station:京急電鐵 羽田機場第3航廈站': 'odpt.Station:Keikyu.Airport.HanedaAirportTerminal3',
        'odpt:Station:東京單軌電車 羽田機場國際線航廈站': 'odpt.Station:TokyoMonorail.HanedaAirport.HanedaAirportTerminal3',
        'odpt:Station:JR 機場第1航廈站 / JR 機場第2航廈站': 'odpt.Station:TokyoMonorail.HanedaAirport.HanedaAirportTerminal1',
        'odpt:Station:JR-East 成田機場第1航廈站': 'odpt.Station:JR-East.NaritaAirport.NaritaAirportTerminal1',
        'odpt:Station:JR-East 成田機場第2航廈站': 'odpt.Station:JR-East.NaritaAirport.NaritaAirportTerminal23',
    };

    if (manualMappings[searchId]) {
        return manualMappings[searchId];
    }

    // 3. Fuzzy search by "Line + StationName" segments
    // Input: "odpt:Station:JR-East.Nippori" -> Extract "JR-East" and "Nippori"
    // DB ID: "odpt.Station:JR-East.Yamanote.Nippori"
    const parts = searchId.split(/[:.]/);
    const stationName = parts[parts.length - 1]; // "Nippori"
    const operator = parts.find(p => p.includes('JR') || p.includes('TokyoMetro') || p.includes('Toei') || p.includes('Keisei')); // "JR-East"

    if (stationName && operator) {
        // Query IDs containing both operator and stationName
        const { data: nodes } = await supabase
            .from('nodes')
            .select('id')
            .ilike('id', `%${operator}%${stationName}%`)
            .limit(1);

        if (nodes && nodes.length > 0) return nodes[0].id;
    }

    return null;
}

// Output file path
const OUTPUT_SQL = path.resolve(__dirname, '../supabase/migrations/20260106_ingest_markdown_knowledge.sql');

async function ingestFile(filePath: string) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const filename = path.basename(filePath);
    console.log(`\n--- Processing ${filename} ---`);

    const stations: { id: string; data: RidingKnowledge }[] = [];

    if (filename.startsWith('area')) {
        const sections = content.split(/^## /m).slice(1);

        for (const section of sections) {
            const lines = section.split('\n');
            const header = lines[0].trim();

            let idPart = header.split('（')[0].split('(')[0].trim(); // Remove ()

            // Heuristic Construction
            let searchId = '';
            if (idPart.includes('Station Context')) {
                searchId = idPart.replace('Station Context:', '').trim();
            } else {
                // Basic normalization
                if (!idPart.startsWith('odpt')) {
                    if (idPart.includes('TokyoMetro') || idPart.includes('Toei')) {
                        searchId = `odpt.Station:${idPart}`;
                    } else {
                        searchId = `odpt:Station:${idPart}`;
                    }
                    if (idPart.match(/[^\w\.\-\:]/)) {
                        searchId = `odpt:Station:${idPart}`;
                    }
                } else {
                    searchId = idPart;
                }
            }

            const knowledge = parseSectionBody(lines.slice(1));
            if (knowledge.traps.length > 0 || knowledge.hacks.length > 0 || knowledge.facilities.length > 0) {
                stations.push({ id: searchId, data: knowledge });
            }
        }
    } else if (filename.includes('metro_toei')) {
        const sections = content.split(/^### Station Context: /m).slice(1);
        for (const section of sections) {
            const lines = section.split('\n');
            let stationId = lines[0].trim();

            if (!stationId.startsWith('odpt')) {
                if (stationId.includes('JR-East')) stationId = `odpt:Station:${stationId}`;
                else stationId = `odpt.Station:${stationId}`;
            }

            const knowledge = parseSectionBody(lines.slice(1));
            if (knowledge.traps.length > 0 || knowledge.facilities.length > 0) {
                stations.push({ id: stationId, data: knowledge });
            }
        }
    }

    for (const station of stations) {
        const finalId = await findNodeId(station.id);

        if (finalId) {
            const rawData = JSON.parse(JSON.stringify(station.data));
            // Sanitize: Remove empty advice
            const safeData: any = {
                traps: rawData.traps.map((t: any) => ({ ...t, advice: t.advice || undefined })),
                hacks: rawData.hacks.map((h: any) => ({ ...h, advice: h.advice || undefined })),
                facilities: rawData.facilities || []
            };

            // Escape single quotes in JSON for SQL
            const jsonStr = JSON.stringify(safeData).replace(/'/g, "''");

            const sql = `
-- Update for ${finalId} (${station.id})
UPDATE nodes
SET riding_knowledge = '${jsonStr}'
WHERE id = '${finalId}';
`;
            fs.appendFileSync(OUTPUT_SQL, sql);
            console.log(`[SQL] Generated for ${finalId}`);
        } else {
            console.warn(`[SKIP] ID resolution failed for: ${station.id}`);
        }
    }
}

function parseSectionBody(lines: string[]): RidingKnowledge {
    const knowledge: RidingKnowledge = { traps: [], hacks: [], facilities: [] };
    let currentSection = ''; // 'Traps', 'Hacks', 'Facilities'

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.includes('### Traps') || trimmed.includes('**Traps')) currentSection = 'Traps';
        else if (trimmed.includes('### Hacks') || trimmed.includes('**Hacks')) currentSection = 'Hacks';
        else if (trimmed.includes('### Facilities') || trimmed.includes('**Facilities')) currentSection = 'Facilities';

        if (trimmed.startsWith('- [Trap]')) {
            // Format: - [Trap] ICON **TITLE**: DESCRIPTION (Advice: ADVICE)
            const content = trimmed.replace('- [Trap] ', '');
            const parts = parseItemLine(content);
            if (parts) knowledge.traps.push(parts);
        } else if (trimmed.startsWith('- [Hack]')) {
            const content = trimmed.replace('- [Hack] ', '');
            const parts = parseItemLine(content);
            if (parts) knowledge.hacks.push(parts);
        } else if (trimmed.match(/^- \[(toilet|elevator|wifi|atm|locker)\]/)) {
            // Facility line
            // Format: - [type] Location [Tag1] [Tag2]
            const typeMatch = trimmed.match(/^-\s*\[(.*?)\]/);
            if (typeMatch) {
                const type = typeMatch[1];
                let rest = trimmed.substring(typeMatch[0].length).trim();

                const tags: string[] = [];
                const tagMatches = rest.matchAll(/\[(.*?)\]/g);
                for (const m of tagMatches) {
                    tags.push(m[1]);
                }

                // Remove tags from location string
                const location = rest.replace(/\[.*?\]/g, '').trim();

                knowledge.facilities.push({ type, location, tags });
            }
        }
    }
    return knowledge;
}

function parseItemLine(line: string): L4Item | null {
    // Regex to extract Icon, Title, Description, Advice
    // Attempt 1: ICON **TITLE**: DESCRIPTION (Advice: ADVICE)
    // Note: Icon might be missing or fused.

    // Split by ** to find title
    const parts = line.split('**');
    if (parts.length < 3) return null; // Need pre (icon), title, post (desc)

    const icon = parts[0].trim(); // Usually the emoji
    const title = parts[1].trim();
    let rest = parts[2].trim();

    // Remove leading ":" if present
    if (rest.startsWith(':')) rest = rest.substring(1).trim();

    // Extract Advice
    let advice = '';
    const adviceMatch = rest.match(/\(Advice:\s*(.*?)\)$/);
    if (adviceMatch) {
        advice = adviceMatch[1].replace(/^[⚠️💡]\s*/, '').trim(); // Remove leading emoji in advice
        rest = rest.replace(adviceMatch[0], '').trim();
    }

    return { icon, title, description: rest, advice };
}

// Main execution
async function main() {
    // Clear output file
    if (fs.existsSync(OUTPUT_SQL)) fs.unlinkSync(OUTPUT_SQL);
    fs.writeFileSync(OUTPUT_SQL, '-- Auto-generated L4 Knowledge Ingestion\n\n');

    const files = fs.readdirSync(KNOWLEDGE_DIR);
    for (const f of files) {
        if (EXCLUDE_FILES.includes(f)) continue; // Keep processing excluded files logic separate if needed
        if (!f.endsWith('.md')) continue;
        await ingestFile(path.join(KNOWLEDGE_DIR, f));
    }

    // Optionally process bulk files
    console.log('Processing bulk Metro/Toei file...');
    await ingestFile(path.join(KNOWLEDGE_DIR, 'metro_toei_all_stations.md'));

    console.log(`\nDone! SQL written to ${OUTPUT_SQL}`);
    process.exit(0);
}

main();
