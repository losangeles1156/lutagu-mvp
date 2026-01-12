
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { IdMatcher } from '../src/lib/utils/idMatcher';

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
const OUTPUT_SQL = path.resolve(__dirname, '../supabase/migrations/20260106_ingest_markdown_knowledge.sql');

async function findNodeIds(searchId: string): Promise<string[]> {
    console.log(`[ID] Resolving nodes for: ${searchId}...`);
    let results: string[] = [];

    // Use IdMatcher to get all potential variants
    const variants = IdMatcher.getVariants(searchId);

    // Manual overrides
    const manualMappings: Record<string, string[]> = {
        'odpt:Station:京急電鐵 羽田機場第1・第2航廈站': ['odpt.Station:Keikyu.Airport.HanedaAirportTerminal1And2'],
        'odpt:Station:京急電鐵 羽田機場第3航廈站': ['odpt.Station:Keikyu.Airport.HanedaAirportTerminal3'],
        'odpt:Station:東京單軌電車 羽田機場國際線航廈站': ['odpt.Station:TokyoMonorail.HanedaAirport.HanedaAirportTerminal3'],
        'odpt:Station:JR 機場第1航廈站 / JR 機場第2航廈站': ['odpt.Station:TokyoMonorail.HanedaAirport.HanedaAirportTerminal1'],
        'odpt:Station:JR-East 成田機場第1航廈站': ['odpt.Station:JR-East.NaritaAirport.NaritaAirportTerminal1'],
        'odpt:Station:JR-East 成田機場第2航廈站': ['odpt.Station:JR-East.NaritaAirport.NaritaAirportTerminal23'],
    };

    const canonicalId = IdMatcher.normalize(searchId);
    if (manualMappings[canonicalId] || manualMappings[searchId]) {
        results = manualMappings[canonicalId] || manualMappings[searchId];
    } else {
        // Try exact match for all variants
        const { data: nodes } = await supabase
            .from('nodes')
            .select('id')
            .in('id', variants);

        if (nodes && nodes.length > 0) {
            results = nodes.map(n => n.id);
        } else {
            // Fuzzy search by station name if variants fail
            const stationName = IdMatcher.getCoreName(searchId);

            // Try name-based match first (more reliable for weird IDs like .a, .u)
            const { data: nameNodes } = await supabase
                .from('nodes')
                .select('id')
                .or(`name->>'ja'.eq.${stationName},name->>'en'.ilike.${stationName}`);

            if (nameNodes && nameNodes.length > 0) {
                results = nameNodes.map(n => n.id);
            } else {
                // Last resort: ID suffix match
                const { data: fuzzyNodes } = await supabase
                    .from('nodes')
                    .select('id')
                    .ilike('id', `%${stationName}`)
                    .limit(10);

                if (fuzzyNodes && fuzzyNodes.length > 0) {
                    results = fuzzyNodes.map(n => n.id);
                }
            }
        }
    }

    console.log(`[ID] Found ${results.length} nodes for ${searchId}: ${results.join(', ')}`);
    return results;
}

// Map to store aggregated knowledge keyed by Node ID
const globalKnowledge: Map<string, RidingKnowledge> = new Map();

async function ingestFile(filePath: string) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const filename = path.basename(filePath);
    console.log(`\n--- Processing ${filename} ---`);

    const rawStations: { id: string; data: RidingKnowledge }[] = [];

    if (filename.startsWith('area') || filename === 'expansion_minimax.md') {
        const sections = content.split(/^## /m).slice(1);
        for (const section of sections) {
            const lines = section.split('\n');
            const header = lines[0].trim();
            let idPart = header.split('（')[0].split('(')[0].trim();
            let searchId = '';
            if (idPart.includes('Station Context')) {
                searchId = idPart.replace('Station Context:', '').trim();
            } else {
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
            if (hasContent(knowledge)) rawStations.push({ id: searchId, data: knowledge });
        }
    } else if (filename.includes('metro_toei') || filename.includes('metro_remaining')) {
        const sections = content.split(/^### Station Context: /m).slice(1);
        for (const section of sections) {
            const lines = section.split('\n');
            let stationId = lines[0].trim();
            if (!stationId.startsWith('odpt')) {
                if (stationId.includes('JR-East')) stationId = `odpt:Station:${stationId}`;
                else stationId = `odpt.Station:${stationId}`;
            }
            const knowledge = parseSectionBody(lines.slice(1));
            if (hasContent(knowledge)) rawStations.push({ id: stationId, data: knowledge });
        }
    }

    // Resolve IDs and Aggregate
    for (const station of rawStations) {
        const nodeIds = await findNodeIds(station.id);
        if (nodeIds.length === 0) {
            console.warn(`[SKIP] ID resolution failed for: ${station.id}`);
            continue;
        }

        for (const nodeId of nodeIds) {
            if (!globalKnowledge.has(nodeId)) {
                globalKnowledge.set(nodeId, { traps: [], hacks: [], facilities: [] });
            }
            const agg = globalKnowledge.get(nodeId)!;

            // Merge and Dedup (by title for items, by type+location for facilities)
            mergeItems(agg.traps, station.data.traps);
            mergeItems(agg.hacks, station.data.hacks);
            mergeFacilities(agg.facilities, station.data.facilities);
        }
    }
}

function hasContent(k: RidingKnowledge) {
    return k.traps.length > 0 || k.hacks.length > 0 || k.facilities.length > 0;
}

function mergeItems(target: L4Item[], source: L4Item[]) {
    for (const s of source) {
        if (!target.some(t => t.title === s.title)) {
            target.push(s);
        }
    }
}

function mergeFacilities(target: L4Facility[], source: L4Facility[]) {
    for (const s of source) {
        // Simple dedup based on type and location
        if (!target.some(t => t.type === s.type && t.location === s.location)) {
            target.push(s);
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
            const content = trimmed.replace('- [Trap] ', '');
            const parts = parseItemLine(content);
            if (parts) knowledge.traps.push(parts);
        } else if (trimmed.startsWith('- [Hack]')) {
            const content = trimmed.replace('- [Hack] ', '');
            const parts = parseItemLine(content);
            if (parts) knowledge.hacks.push(parts);
        } else if (trimmed.match(/^- \[(toilet|elevator|wifi|atm|locker)\]/)) {
            const typeMatch = trimmed.match(/^-\s*\[(.*?)\]/);
            if (typeMatch) {
                const type = typeMatch[1];
                let rest = trimmed.substring(typeMatch[0].length).trim();
                const tags: string[] = [];
                const tagMatches = rest.matchAll(/\[(.*?)\]/g);
                for (const m of tagMatches) tags.push(m[1]);
                const location = rest.replace(/\[.*?\]/g, '').trim();
                knowledge.facilities.push({ type, location, tags });
            }
        }
    }
    return knowledge;
}

function parseItemLine(line: string): L4Item | null {
    const parts = line.split('**');
    if (parts.length < 3) return null;
    const icon = parts[0].trim();
    const title = parts[1].trim();
    let rest = parts[2].trim();
    if (rest.startsWith(':')) rest = rest.substring(1).trim();
    let advice = '';
    const adviceMatch = rest.match(/\(Advice:\s*(.*?)\)$/);
    if (adviceMatch) {
        advice = adviceMatch[1].replace(/^[⚠️💡]\s*/u, '').trim();
        rest = rest.replace(adviceMatch[0], '').trim();
    }
    return { icon, title, description: rest, advice };
}

async function main() {
    // Clear output file
    if (fs.existsSync(OUTPUT_SQL)) fs.unlinkSync(OUTPUT_SQL);
    fs.writeFileSync(OUTPUT_SQL, '-- Auto-generated L4 Knowledge Ingestion (Aggregated)\n\n');

    // 1. Process bulk files
    const bulkFiles = ['metro_toei_all_stations.md', 'metro_toei_remaining.md', 'metro_remaining_lines_universal.md'];
    for (const bf of bulkFiles) {
        const fullPath = path.join(KNOWLEDGE_DIR, bf);
        if (fs.existsSync(fullPath)) await ingestFile(fullPath);
    }

    // 2. Process area/specialized files
    const files = fs.readdirSync(KNOWLEDGE_DIR);
    for (const f of files) {
        if (bulkFiles.includes(f) || !f.endsWith('.md')) continue;
        await ingestFile(path.join(KNOWLEDGE_DIR, f));
    }

    console.log(`\n--- Generating SQL for ${globalKnowledge.size} unique nodes ---`);

    // Generate SQL
    for (const [nodeId, data] of globalKnowledge.entries()) {
        const safeData: any = {
            traps: data.traps.map((t: any) => ({ ...t, advice: t.advice || undefined })),
            hacks: data.hacks.map((h: any) => ({ ...h, advice: h.advice || undefined })),
            facilities: data.facilities || []
        };

        const jsonStr = JSON.stringify(safeData).replace(/'/g, "''");

        const sql = `
-- Update for ${nodeId}
UPDATE nodes
SET riding_knowledge = '${jsonStr}'
WHERE id = '${nodeId}';
`;
        fs.appendFileSync(OUTPUT_SQL, sql + '\n');
    }

    console.log(`\nDone! SQL written to ${OUTPUT_SQL}`);
    process.exit(0);
}

main();
