import fs from 'fs';
import path from 'path';

const BASE_DIR = path.join(__dirname, '../src/data');
const JSON_FILE = path.join(BASE_DIR, 'station_wisdom_generated.json');
const TS_FILE = path.join(BASE_DIR, 'station_wisdom_generated.ts');

const STATION_MAP: Record<string, string[]> = {
    "東京車站": [
        "odpt:Station:JR-East.Tokyo",
        "odpt:Station:TokyoMetro.Tokyo"
    ],
    "上野車站": [
        "odpt:Station:JR-East.Ueno",
        "odpt:Station:TokyoMetro.Ueno",
        "odpt:Station:Keisei.KeiseiUeno"
    ],
    "淺草車站": [
        "odpt:Station:TokyoMetro.Asakusa",
        "odpt:Station:Toei.Asakusa",
        "odpt:Station:Tobu.Asakusa",
        "odpt:Station:MIR.Asakusa"
    ],
    "秋葉原車站": [
        "odpt:Station:JR-East.Akihabara",
        "odpt:Station:TokyoMetro.Akihabara",
        "odpt:Station:MIR.Akihabara"
    ],
    "押上車站": [
        "odpt:Station:Toei.Oshiage",
        "odpt:Station:TokyoMetro.Oshiage",
        "odpt:Station:Keisei.Oshiage",
        "odpt:Station:Tobu.Oshiage"
    ],
    "池袋車站": [
        "odpt:Station:JR-East.Ikebukuro",
        "odpt:Station:TokyoMetro.Ikebukuro",
        "odpt:Station:Seibu.Ikebukuro",
        "odpt:Station:Tobu.Ikebukuro"
    ],
    "日暮里車站": [
        "odpt:Station:JR-East.Nippori",
        "odpt:Station:Keisei.Nippori",
        "odpt:Station:Toei.NipporiToneri.Nippori"
    ],
    "舞濱車站": [
        "odpt:Station:JR-East.Maihama"
    ],
    "品川車站": [
        "odpt:Station:JR-East.Shinagawa",
        "odpt:Station:Keikyu.Shinagawa"
    ],
    "成田機場車站": [
        "odpt:Station:JR-East.NaritaAirportTerminal1",
        "odpt:Station:Keisei.NaritaAirportTerminal1"
    ],
    "羽田機場車站": [
        "odpt:Station:Keikyu.HanedaAirportTerminal1and2",
        "odpt:Station:Keikyu.HanedaAirportTerminal3",
        "odpt:Station:TokyoMonorail.HanedaAirportTerminal1",
        "odpt:Station:TokyoMonorail.HanedaAirportTerminal2",
        "odpt:Station:TokyoMonorail.HanedaAirportTerminal3"
    ],
    "都營淺草線沿線重要車站": [
        // This is a line-wide tip, so we might tag the line itself, but here we assume stations
        // Or we strictly map line_ids if the triggering logic supports it.
        // For now, let's map to line_ids in code logic below or just common stations
    ]
};

async function main() {
    console.log('Reading JSON...');
    const raw = fs.readFileSync(JSON_FILE, 'utf-8');
    const data = JSON.parse(raw);

    let updatedCount = 0;

    for (const item of data) {
        const hint = item.trigger.station_names_hint?.[0];
        if (hint && STATION_MAP[hint]) {
            item.trigger.station_ids = STATION_MAP[hint];
            updatedCount++;
        }
    }

    console.log(`Updated ${updatedCount} items.`);

    // Write JSON
    fs.writeFileSync(JSON_FILE, JSON.stringify(data, null, 2));

    // Write TS
    const tsContent = `export const GENERATED_KNOWLEDGE = ${JSON.stringify(data, null, 2)};`;
    fs.writeFileSync(TS_FILE, tsContent);

    console.log('Done.');
}

main();
