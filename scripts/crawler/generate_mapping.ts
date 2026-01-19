import fs from 'fs';
import path from 'path';

const TOPOLOGY_PATH = path.join(process.cwd(), 'src/lib/l4/generated/coreTopology.json');
const STATIONS_BY_WARD_PATH = path.join(process.cwd(), 'scripts/data/stations_by_ward.json');
const KNOWLEDGE_STATIONS_DIR = path.join(process.cwd(), 'knowledge/stations');

interface TopologyLine {
    railwayId: string;
    operator: string;
    title: { ja: string; en: string; };
    stationOrder: {
        index: number;
        station: string;
        title: { ja: string; en: string; };
    }[];
}

interface WardStation {
    id: number;
    name: string;
    name_en: string;
    operator: string;
}

function simplifyId(id: string): string {
    const parts = id.split('.');
    if (parts.length === 4 && parts[1] === 'Station:JR-East') {
        return `odpt.Station:JR-East.${parts[3]}`;
    }
    return id;
}

function getPriority(id: string): number {
    if (id.includes('Yamanote')) return 10;
    if (id.includes('Chuo')) return 9;
    if (id.includes('Ginza')) return 8;
    if (id.includes('Marunouchi')) return 8;
    return 1;
}

function generateMapping() {
    const finalMapping: Record<string, string> = {};

    // 1. Load from coreTopology.json (JR & Metro)
    if (fs.existsSync(TOPOLOGY_PATH)) {
        const data: TopologyLine[] = JSON.parse(fs.readFileSync(TOPOLOGY_PATH, 'utf-8'));
        data.forEach(line => {
            line.stationOrder.forEach(s => {
                const name = s.title.ja;
                const id = s.station;
                if (!finalMapping[name] || getPriority(id) > getPriority(finalMapping[name])) {
                    finalMapping[name] = simplifyId(id);
                }
            });
        });
    }

    // 2. Load Ward Stations for reference
    let wardStations: WardStation[] = [];
    if (fs.existsSync(STATIONS_BY_WARD_PATH)) {
        wardStations = JSON.parse(fs.readFileSync(STATIONS_BY_WARD_PATH, 'utf-8'));
    }

    // 3. Scan knowledge/stations for more ODPT IDs
    if (fs.existsSync(KNOWLEDGE_STATIONS_DIR)) {
        const stationDirs = fs.readdirSync(KNOWLEDGE_STATIONS_DIR);
        stationDirs.forEach(dir => {
            if (dir.startsWith('odpt.Station:')) {
                const id = dir;
                const parts = id.split('.');
                const stationPart = parts[parts.length - 1]; // e.g. Jiyugaoka, Yutenji

                // Try to find matching Japanese name from wardStations
                const match = wardStations.find(ws =>
                    ws.name_en.replace(/-/g, '').toLowerCase() === stationPart.toLowerCase() ||
                    ws.name_en.toLowerCase() === stationPart.toLowerCase()
                );

                if (match) {
                    if (!finalMapping[match.name] || getPriority(id) > getPriority(finalMapping[match.name])) {
                        finalMapping[match.name] = id;
                    }
                } else {
                    // Fallback: If we can't find a match, we might have a Japanese name in some other way
                    // For now, skip if no match to avoid incorrect mappings
                }
            }
        });
    }

    // 4. Manual Additions & Corrections
    const manualAdditions: Record<string, string> = {
        '澀谷': 'odpt.Station:JR-East.Shibuya',
        '新宿': 'odpt.Station:JR-East.Shinjuku',
        '秋葉原': 'odpt.Station:JR-East.Akihabara',
        '淺草': 'odpt.Station:TokyoMetro.Ginza.Asakusa',
        '池袋': 'odpt.Station:JR-East.Ikebukuro',
        '銀座': 'odpt.Station:TokyoMetro.Ginza.Ginza',
        '品川': 'odpt.Station:JR-East.Shinagawa',
        '成田機場': 'odpt.Station:Keisei.NaritaAirportTerminal1',
        '羽田機場': 'odpt.Station:TokyoMonorail.HanedaAirportTerminal1',
        '自由が丘': 'odpt.Station:Tokyu.Toyoko.Jiyugaoka',
        '二子玉川': 'odpt.Station:Tokyu.DenEnToshi.FutakoTamagawa',
        '三軒茶屋': 'odpt.Station:Tokyu.DenEnToshi.SangenJaya',
        '下北沢': 'odpt.Station:Odakyu.Odawara.Shimokitazawa',
        '吉祥寺': 'odpt.Station:JR-East.Chuo.Kichijoji'
    };

    Object.assign(finalMapping, manualAdditions);

    // Sort mapping by station name for consistency
    const sortedMapping: Record<string, string> = {};
    Object.keys(finalMapping).sort().forEach(key => {
        sortedMapping[key] = finalMapping[key];
    });

    console.log(JSON.stringify(sortedMapping, null, 2));
}

generateMapping();
