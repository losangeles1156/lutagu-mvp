import fs from 'fs';
import path from 'path';

const sourceFile = 'supabase/migrations/20260106_ingest_markdown_knowledge.sql';
const outputDir = 'supabase/migrations/split';

// Check output directory
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// Key stations to extract
const targetStations = ['Shinjuku', 'Shibuya', 'Ikebukuro', 'Tokyo', 'TokyoMetro.Tokyo'];

const content = fs.readFileSync(sourceFile, 'utf8');
const lines = content.split('\n');

// Map to store SQL for each target
const stationSql: { [key: string]: string } = {};
targetStations.forEach(s => stationSql[s] = '');

let currentStation: string | null = null;

for (const line of lines) {
    if (line.startsWith('-- Update for')) {
        // Find which station this line belongs to
        const found = targetStations.find(s => line.includes(s));
        if (found) {
            currentStation = found;
            stationSql[found] += line + '\n';
        } else {
            currentStation = null;
        }
    } else if (currentStation) {
        stationSql[currentStation] += line + '\n';
        // Note: we just accumulate everything for that station
    }
}

// Write files
targetStations.forEach(station => {
    const filename = `update_${station.replace(/\./g, '_').toLowerCase()}.sql`;
    const filePath = path.join(outputDir, filename);
    const sql = stationSql[station];
    if (sql.trim().length > 0) {
        fs.writeFileSync(filePath, sql);
        console.log(`✅ Generated ${filename} (${sql.length} chars)`);
    } else {
        console.log(`⚠️ No SQL found for ${station}`);
    }
});
