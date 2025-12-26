
import { STATION_WISDOM } from '../src/data/stationWisdom';
import * as fs from 'fs';
import * as path from 'path';

// Helper to format a station entry for RAG
function formatStationForRAG(stationId: string, data: any): string {
    const lines: string[] = [];

    // Header with clearly identifiable ID
    lines.push(`### Station Context: ${stationId}`);

    // Traps
    if (data.traps && data.traps.length > 0) {
        lines.push(`\n**Traps (Warnings & Pitfalls):**`);
        data.traps.forEach((trap: any, idx: number) => {
            lines.push(`- [Trap] ${trap.title || 'Untitled'}: ${trap.content} (Advice: ${trap.advice})`);
        });
    }

    // Hacks
    if (data.hacks && data.hacks.length > 0) {
        lines.push(`\n**Hacks (Tips & Shortcuts):**`);
        data.hacks.forEach((hack: string) => {
            lines.push(`- [Hack] ${hack}`);
        });
    }

    // L3 Facilities
    if (data.l3Facilities && data.l3Facilities.length > 0) {
        lines.push(`\n**Facilities (L3 Services):**`);
        data.l3Facilities.forEach((fac: any) => {
            let loc = '';
            // Handle multilingual location
            if (typeof fac.location === 'string') {
                loc = fac.location;
            } else if (typeof fac.location === 'object') {
                loc = fac.location.zh || fac.location.ja || fac.location.en; // Prefer ZH for this export as per user pref
            }

            let extra = '';
            if (fac.attributes) {
                if (fac.attributes.wheelchair) extra += '[Wheelchair Accessible] ';
                if (fac.attributes.hasBabyRoom) extra += '[Baby Room] ';
                if (fac.attributes.count) extra += `[Count: ${fac.attributes.count}] `;
            }

            lines.push(`- [${fac.type}] ${fac.floor || ''} ${fac.operator || ''}: ${loc} ${extra}`);
        });
    }

    // External Links
    if (data.links && data.links.length > 0) {
        lines.push(`\n**Useful Links:**`);
        data.links.forEach((link: any) => {
            lines.push(`- ${link.title}: ${link.url}`);
        });
    }

    lines.push(`\n---\n`); // Separator
    return lines.join('\n');
}

async function main() {
    const outputDir = path.join(__dirname, '../dify_import');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
    }

    const outputPath = path.join(outputDir, 'station_wisdom_rag.txt');
    const writeStream = fs.createWriteStream(outputPath, { encoding: 'utf8' });

    console.log('Exporting Station Wisdom for Dify...');

    let count = 0;
    for (const [id, data] of Object.entries(STATION_WISDOM)) {
        const textChunk = formatStationForRAG(id, data);
        writeStream.write(textChunk);
        count++;
    }

    writeStream.end();
    console.log(`Successfully exported ${count} stations to ${outputPath}`);
}

main();
