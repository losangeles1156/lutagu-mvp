
import fs from 'fs';
import path from 'path';

const WARDS = [
    'Minato', 'Shinjuku', 'Bunkyo', 'Taito', 'Sumida', 'Koto',
    'Shinagawa', 'Meguro', 'Ota', 'Setagaya', 'Shibuya', 'Nakano',
    'Suginami', 'Toshima', 'Kita', 'Arakawa', 'Itabashi', 'Nerima',
    'Adachi', 'Katsushika', 'Edogawa', 'Chiyoda', 'Chuo'
];

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const OUTPUT_FILE = path.join(process.cwd(), 'scripts/data/stations_by_ward.json');

interface StationNode {
    id: number;
    lat: number;
    lon: number;
    tags: {
        name?: string;
        "name:en"?: string;
        "name:ja"?: string;
        railway?: string;
        operator?: string;
    };
}

async function fetchStationsForWard(ward: string) {
    console.log(`Fetching stations for ${ward} Ward...`);
    const query = `
        [out:json][timeout:25];
        area["name:en"="${ward}"]["admin_level"="7"]->.searchArea;
        (
            node["railway"="station"](area.searchArea);
        );
        out body;
    `;

    try {
        const response = await fetch(OVERPASS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `data=${encodeURIComponent(query)}`
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: any = await response.json();

        if (data && data.elements) {
            return data.elements
                .filter((el: any) => {
                    const operator = el.tags['operator'] || '';
                    const name = el.tags['name'] || el.tags['name:en'] || '';

                    // 1. Allow Haneda/Narita Airports (Terminal Stations)
                    if (/Haneda Airport|Narita Airport|羽田空港|成田空港/i.test(name)) {
                        return true;
                    }

                    // 2. Allow JR and Subway
                    if (/JR|East\s*Japan\s*Railway|Central\s*Japan\s*Railway|Tokyo\s*Metro|Toei\s*Subway|Tokyo\s*Metropolitan\s*Bureau\s*of\s*Transportation/i.test(operator)) {
                        return true;
                    }

                    // 3. Exclude Private Railways
                    return false;
                })
                .map((el: any) => ({
                    id: el.id,
                    lat: el.lat,
                    lon: el.lon,
                    name: el.tags['name'] || el.tags['name:en'] || 'Unknown',
                    name_en: el.tags['name:en'] || el.tags['name'] || 'Unknown',
                    ward: ward,
                    operator: el.tags['operator']
                }));
        }
        return [];
    } catch (error) {
        console.error(`Error fetching for ${ward}:`, error);
        return [];
    }
}

async function main() {
    let allStations: any[] = [];

    // Create data directory if not exists
    const dataDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    // Process wards sequentially to be nice to the API
    for (const ward of WARDS) {
        const stations = await fetchStationsForWard(ward);
        console.log(`  Found ${stations.length} stations in ${ward}.`);
        allStations = [...allStations, ...stations];
        // Sleep a bit
        await new Promise(r => setTimeout(r, 2000));
    }

    console.log(`Total stations found: ${allStations.length}`);
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allStations, null, 2));
    console.log(`Saved to ${OUTPUT_FILE}`);
}

main().catch(console.error);
