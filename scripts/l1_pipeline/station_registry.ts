import { CONFIG } from './config';
import fs from 'fs';
import path from 'path';
import METRO_TOEI_PRIORITY_STATIONS from '../data/metro_toei_priority_stations';
import AIRPORT_STATIONS from '../data/airport_stations';

export interface TargetStation {
    id: string; // odpt:Station:Identify
    name: { ja: string; en: string };
    ward: string; // 行政区
    location: { lat: number; lng: number };
    wikiTitle?: string; // 手动指定 Wiki 标题，防止歧义
    skipVibes?: boolean; // 如果为 true，跳过周边 OSM 抓取（如机场）
}

export interface StationCluster {
    primaryId: string; // 选出的代表 ID
    ward: string;
    stations: TargetStation[]; // 包含的所有车站
    center: { lat: number; lng: number };
}

export const WARDS_15 = [
    'Chiyoda',
    'Minato',
    'Chuo',
    'Taito',
    'Arakawa',
    'Sumida',
    'Shinjuku',
    'Bunkyo',
    'Shibuya',
    'Shinagawa',
    'Kita',
    'Toshima',
    'Nakano',
    'Adachi',
    'Koto'
];

// 25 Core Stations + Samples (Restored JR + Airports, Filtered Private Rail)
const RAW_STATIONS: TargetStation[] = [
    // --- Core Stations (Hubs) ---
    { id: 'odpt.Station:JR-East.Yamanote.Ueno', name: { ja: '上野', en: 'Ueno' }, ward: 'Taito', location: { lat: 35.7141, lng: 139.7774 }, wikiTitle: '上野駅' },
    { id: 'odpt.Station:JR-East.Yamanote.Tokyo', name: { ja: '東京', en: 'Tokyo' }, ward: 'Chiyoda', location: { lat: 35.6812, lng: 139.7671 }, wikiTitle: '東京駅' },
    { id: 'odpt.Station:JR-East.Yamanote.Akihabara', name: { ja: '秋葉原', en: 'Akihabara' }, ward: 'Chiyoda', location: { lat: 35.6984, lng: 139.7731 }, wikiTitle: '秋葉原駅' },
    { id: 'odpt.Station:TokyoMetro.Ginza.Asakusa', name: { ja: '浅草', en: 'Asakusa' }, ward: 'Taito', location: { lat: 35.7119, lng: 139.7983 }, wikiTitle: '浅草駅' }, // Metro/Toei
    { id: 'odpt.Station:JR-East.Yamanote.Shibuya', name: { ja: '渋谷', en: 'Shibuya' }, ward: 'Shibuya', location: { lat: 35.6580, lng: 139.7016 }, wikiTitle: '渋谷駅' },
    { id: 'odpt.Station:JR-East.Yamanote.Shinjuku', name: { ja: '新宿', en: 'Shinjuku' }, ward: 'Shinjuku', location: { lat: 35.6896, lng: 139.7006 }, wikiTitle: '新宿駅' },
    { id: 'odpt.Station:JR-East.Yamanote.Ikebukuro', name: { ja: '池袋', en: 'Ikebukuro' }, ward: 'Toshima', location: { lat: 35.7295, lng: 139.7109 }, wikiTitle: '池袋駅' },
    { id: 'odpt.Station:TokyoMetro.Hibiya.Roppongi', name: { ja: '六本木', en: 'Roppongi' }, ward: 'Minato', location: { lat: 35.6640, lng: 139.7314 }, wikiTitle: '六本木駅' },
    { id: 'odpt.Station:TokyoMetro.Ginza.Ginza', name: { ja: '銀座', en: 'Ginza' }, ward: 'Chuo', location: { lat: 35.6719, lng: 139.7640 }, wikiTitle: '銀座駅' },
    { id: 'odpt.Station:JR-East.Yamanote.Shimbashi', name: { ja: '新橋', en: 'Shimbashi' }, ward: 'Minato', location: { lat: 35.6664, lng: 139.7583 }, wikiTitle: '新橋駅' },
    { id: 'odpt.Station:TokyoMetro.Chiyoda.Otemachi', name: { ja: '大手町', en: 'Otemachi' }, ward: 'Chiyoda', location: { lat: 35.6848, lng: 139.7631 }, wikiTitle: '大手町駅' },
    { id: 'odpt.Station:JR-East.Yamanote.Harajuku', name: { ja: '原宿', en: 'Harajuku' }, ward: 'Shibuya', location: { lat: 35.6702, lng: 139.7027 }, wikiTitle: '原宿駅' },
    { id: 'odpt.Station:JR-East.Chuo.Nakano', name: { ja: '中野', en: 'Nakano' }, ward: 'Nakano', location: { lat: 35.7058, lng: 139.6658 }, wikiTitle: '中野駅' },
    { id: 'odpt.Station:Toei.Shinjuku.Jimbocho', name: { ja: '神保町', en: 'Jimbocho' }, ward: 'Chiyoda', location: { lat: 35.6959, lng: 139.7581 }, wikiTitle: '神保町駅' },
    { id: 'odpt.Station:JR-East.Yamanote.Kanda', name: { ja: '神田', en: 'Kanda' }, ward: 'Chiyoda', location: { lat: 35.6918, lng: 139.7709 }, wikiTitle: '神田駅' },
    { id: 'odpt.Station:JR-East.Chuo.Ochanomizu', name: { ja: '御茶ノ水', en: 'Ochanomizu' }, ward: 'Bunkyo', location: { lat: 35.6997, lng: 139.7638 }, wikiTitle: '御茶ノ水駅' },
    { id: 'odpt.Station:JR-East.Chuo.Iidabashi', name: { ja: '飯田橋', en: 'Iidabashi' }, ward: 'Chiyoda', location: { lat: 35.7020, lng: 139.7450 }, wikiTitle: '飯田橋駅' },
    { id: 'odpt.Station:JR-East.Yamanote.Shinagawa', name: { ja: '品川', en: 'Shinagawa' }, ward: 'Minato', location: { lat: 35.6285, lng: 139.7414 }, wikiTitle: '品川駅' },
    { id: 'odpt.Station:JR-East.Yamanote.Ebisu', name: { ja: '恵比寿', en: 'Ebisu' }, ward: 'Shibuya', location: { lat: 35.6467, lng: 139.7101 }, wikiTitle: '恵比寿駅' },
    { id: 'odpt.Station:TokyoMetro.Ginza.Nihombashi', name: { ja: '日本橋', en: 'Nihombashi' }, ward: 'Chuo', location: { lat: 35.6811, lng: 139.7745 }, wikiTitle: '日本橋駅' },
    { id: 'odpt.Station:JR-East.Sobu.Kinshicho', name: { ja: '錦糸町', en: 'Kinshicho' }, ward: 'Sumida', location: { lat: 35.6962, lng: 139.8143 }, wikiTitle: '錦糸町駅' },
    { id: 'odpt.Station:TokyoMetro.Hanzomon.Oshiage', name: { ja: '押上', en: 'Oshiage' }, ward: 'Sumida', location: { lat: 35.7106, lng: 139.8133 }, wikiTitle: '押上駅' },
    { id: 'odpt.Station:TokyoMetro.Hibiya.Nakameguro', name: { ja: '中目黒', en: 'Nakameguro' }, ward: 'Meguro', location: { lat: 35.6444, lng: 139.6991 }, wikiTitle: '中目黒駅' },
    { id: 'odpt.Station:TokyoMetro.Chiyoda.Akasaka', name: { ja: '赤坂', en: 'Akasaka' }, ward: 'Minato', location: { lat: 35.6724, lng: 139.7380 }, wikiTitle: '赤坂駅' },
    { id: 'odpt.Station:JR-East.Yamanote.Nippori', name: { ja: '日暮里', en: 'Nippori' }, ward: 'Arakawa', location: { lat: 35.7277, lng: 139.7709 }, wikiTitle: '日暮里駅' },

    // --- Tourism Dispersion Alternatives (Added 2026-01-02) ---
    // 1. Asakusa Alternatives
    // Shibamata removed (Keisei Line - Private Rail)
    { id: 'odpt.Station:TokyoMetro.Tozai.MonzenNakacho', name: { ja: '門前仲町', en: 'Monzen-nakacho' }, ward: 'Koto', location: { lat: 35.6720, lng: 139.7960 }, wikiTitle: '門前仲町駅' },

    // 2. Shibuya/Harajuku Alternatives
    // Daikanyama removed (Tokyu Line - Private Rail)
    // Shimokitazawa removed (Odakyu/Keio Line - Private Rail)
    { id: 'odpt.Station:JR-East.Chuo.Kichijoji', name: { ja: '吉祥寺', en: 'Kichijoji' }, ward: 'Musashino', location: { lat: 35.7031, lng: 139.5797 }, wikiTitle: '吉祥寺駅' },
    { id: 'odpt.Station:JR-East.Chuo.Koenji', name: { ja: '高円寺', en: 'Koenji' }, ward: 'Suginami', location: { lat: 35.7053, lng: 139.6496 }, wikiTitle: '高円寺駅' },

    // 3. Tsukiji Alternatives
    { id: 'odpt.Station:TokyoMetro.Yurakucho.Tsukishima', name: { ja: '月島', en: 'Tsukishima' }, ward: 'Chuo', location: { lat: 35.6635, lng: 139.7820 }, wikiTitle: '月島駅' },
    { id: 'odpt.Station:TokyoMetro.Yurakucho.Toyosu', name: { ja: '豊洲', en: 'Toyosu' }, ward: 'Koto', location: { lat: 35.6551, lng: 139.7960 }, wikiTitle: '豊洲駅' }, // Updated to Metro ID
    { id: 'odpt.Station:JR-East.Joban.KitaSenju', name: { ja: '北千住', en: 'Kita-Senju' }, ward: 'Adachi', location: { lat: 35.7494, lng: 139.8051 }, wikiTitle: '北千住駅' },

    // 4. Shinjuku/Shopping Alternatives
    // Futako Tamagawa removed (Tokyu Line - Private Rail)
    // Jiyugaoka removed (Tokyu Line - Private Rail)

    // --- User Requested Additions (2026-01-02) ---
    { id: 'odpt.Station:JR-East.Yamanote.Osaki', name: { ja: '大崎', en: 'Osaki' }, ward: 'Shinagawa', location: { lat: 35.6194, lng: 139.7285 }, wikiTitle: '大崎駅' },
    { id: 'odpt.Station:JR-East.Yamanote.Takadanobaba', name: { ja: '高田馬場', en: 'Takadanobaba' }, ward: 'Shinjuku', location: { lat: 35.7126, lng: 139.7039 }, wikiTitle: '高田馬場駅' },
    { id: 'odpt.Station:JR-East.Sobu.NishiFunabashi', name: { ja: '西船橋', en: 'Nishi-Funabashi' }, ward: 'Funabashi', location: { lat: 35.7075, lng: 139.9592 }, wikiTitle: '西船橋駅' }, // Chiba
    // Kita-Senju already exists above
    { id: 'odpt.Station:JR-East.Joban.MinamiSenju', name: { ja: '南千住', en: 'Minami-Senju' }, ward: 'Arakawa', location: { lat: 35.7333, lng: 139.7990 }, wikiTitle: '南千住駅' },
    { id: 'odpt.Station:JR-East.Yamanote.Tamachi', name: { ja: '田町', en: 'Tamachi' }, ward: 'Minato', location: { lat: 35.6457, lng: 139.7477 }, wikiTitle: '田町駅' },
    { id: 'odpt.Station:JR-East.Yamanote.Gotanda', name: { ja: '五反田', en: 'Gotanda' }, ward: 'Shinagawa', location: { lat: 35.6263, lng: 139.7236 }, wikiTitle: '五反田駅' },
    { id: 'odpt.Station:JR-East.Yamanote.Uguisudani', name: { ja: '鶯谷', en: 'Uguisudani' }, ward: 'Taito', location: { lat: 35.7217, lng: 139.7779 }, wikiTitle: '鶯谷駅' },
    { id: 'odpt.Station:JR-East.Yamanote.Sugamo', name: { ja: '巣鴨', en: 'Sugamo' }, ward: 'Toshima', location: { lat: 35.7334, lng: 139.7394 }, wikiTitle: '巣鴨駅' },
    { id: 'odpt.Station:JR-East.KeihinTohoku.Akabane', name: { ja: '赤羽', en: 'Akabane' }, ward: 'Kita', location: { lat: 35.7781, lng: 139.7208 }, wikiTitle: '赤羽駅' },
    { id: 'odpt.Station:JR-East.Chuo.Yotsuya', name: { ja: '四ツ谷', en: 'Yotsuya' }, ward: 'Shinjuku', location: { lat: 35.6850, lng: 139.7299 }, wikiTitle: '四ツ谷駅' },
    { id: 'odpt.Station:JR-East.Chuo.Ogikubo', name: { ja: '荻窪', en: 'Ogikubo' }, ward: 'Suginami', location: { lat: 35.7045, lng: 139.6202 }, wikiTitle: '荻窪駅' },
    { id: 'odpt.Station:JR-East.Sobu.Asakusabashi', name: { ja: '浅草橋', en: 'Asakusabashi' }, ward: 'Taito', location: { lat: 35.6974, lng: 139.7863 }, wikiTitle: '浅草橋駅' },
    { id: 'odpt.Station:JR-East.Sobu.Suidobashi', name: { ja: '水道橋', en: 'Suidobashi' }, ward: 'Chiyoda', location: { lat: 35.7020, lng: 139.7536 }, wikiTitle: '水道橋駅' },
    { id: 'odpt.Station:JR-East.Keiyo.ShinKiba', name: { ja: '新木場', en: 'Shin-Kiba' }, ward: 'Koto', location: { lat: 35.6462, lng: 139.8274 }, wikiTitle: '新木場駅' },
    { id: 'odpt.Station:JR-East.Sobu.Kameido', name: { ja: '亀戸', en: 'Kameido' }, ward: 'Koto', location: { lat: 35.6973, lng: 139.8267 }, wikiTitle: '亀戸駅' },
    { id: 'odpt.Station:JR-East.Chuo.Ichigaya', name: { ja: '市ケ谷', en: 'Ichigaya' }, ward: 'Shinjuku', location: { lat: 35.6932, lng: 139.7367 }, wikiTitle: '市ケ谷駅' },

    { id: 'odpt.Station:Keikyu.Airport.HanedaAirportTerminal1And2', name: { ja: '羽田空港第1・第2ターミナル', en: 'Haneda Airport Terminal 1 & 2' }, ward: 'Ota', location: { lat: 35.5491, lng: 139.7847 }, wikiTitle: '羽田空港第1・第2ターミナル駅', skipVibes: true },
    { id: 'odpt.Station:Keikyu.Airport.HanedaAirportTerminal3', name: { ja: '羽田空港第3ターミナル', en: 'Haneda Airport Terminal 3' }, ward: 'Ota', location: { lat: 35.5469, lng: 139.7686 }, wikiTitle: '羽田空港第3ターミナル駅', skipVibes: true },

    // --- Others (Samples) ---
    /*
    {
        id: 'odpt.Station:JR-East.Yamanote.ShinOkubo',
        name: { ja: '新大久保', en: 'Shin-Okubo' },
        ward: 'Shinjuku',
        location: { lat: 35.701306, lng: 139.700044 },
        wikiTitle: '新大久保駅'
    },
    {
        id: 'odpt.Station:JR-East.Yamanote.Takadanobaba',
        name: { ja: '高田馬場', en: 'Takadanobaba' },
        ward: 'Shinjuku',
        location: { lat: 35.712285, lng: 139.703782 },
        wikiTitle: '高田馬場駅'
    },
    {
        id: 'odpt.Station:JR-East.Chuo.Ogikubo',
        name: { ja: '荻窪', en: 'Ogikubo' },
        ward: 'Suginami',
        location: { lat: 35.704555, lng: 139.620023 },
        wikiTitle: '荻窪駅'
    },
    {
        id: 'odpt.Station:JR-East.KeihinTohoku.Akabane',
        name: { ja: '赤羽', en: 'Akabane' },
        ward: 'Kita',
        location: { lat: 35.7776, lng: 139.7210 },
        wikiTitle: '赤羽駅'
    }
    */
];

// Load stations from JSON file
function loadWardStations(wards?: Set<string>): TargetStation[] {
    try {
        const filePath = path.join(process.cwd(), 'scripts/data/stations_by_ward.json');
        if (!fs.existsSync(filePath)) return [];

        const rawData = fs.readFileSync(filePath, 'utf-8');
        const stations = JSON.parse(rawData);

        return stations
            .filter((s: any) => {
                if (!wards) return true;
                return !!s?.ward && wards.has(String(s.ward));
            })
            .filter((s: any) => {
                const operator = s.operator || '';
                const name = s.name || '';

                // 1. Allow Haneda/Narita Airports (Terminal Stations) regardless of operator
                if (/Haneda Airport|Narita Airport|羽田空港|成田空港/i.test(name)) {
                    return true;
                }

                const isJREast = /JR\s*-?\s*East|East\s*Japan\s*Railway|JR\s*East/i.test(operator) || /東日本旅客鉄道|JR東日本/.test(operator);
                const isTokyoMetro = /Tokyo\s*Metro/i.test(operator) || /東京地下鉄|東京メトロ/.test(operator);
                const isToei = /Toei|Tokyo\s*Metropolitan\s*Bureau\s*of\s*Transportation/i.test(operator) || /東京都交通局/.test(operator);

                return isJREast || isTokyoMetro || isToei;
            })
            .map((s: any) => ({
                id: `osm:${s.id}`,
                name: { ja: s.name, en: s.name_en },
                ward: s.ward,
                location: { lat: s.lat, lng: s.lon },
                wikiTitle: `${s.name}駅`,
                skipVibes: /Haneda Airport|Narita Airport|羽田空港|成田空港/i.test(s.name) // Auto-flag airports
            }));
    } catch (error) {
        console.error('Error loading ward stations:', error);
        return [];
    }
}

// 简单的距离计算 (Haversine formula)
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    var R = 6371; // Radius of the earth in km
    var dLat = deg2rad(lat2 - lat1);  // deg2rad below
    var dLon = deg2rad(lon2 - lon1);
    var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat1)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
        ;
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c; // Distance in km
    return d;
}

function deg2rad(deg: number) {
    return deg * (Math.PI / 180)
}

export function getStationClusters(includeWardStations: boolean = false): StationCluster[] {
    console.log('DEBUG: getStationClusters started');
    return buildStationClusters(includeWardStations, null);
}

export function getStationClustersForWards(wards: string[], includeWardStations: boolean = true): StationCluster[] {
    const wardsFilter = new Set(wards);
    return buildStationClusters(includeWardStations, wardsFilter);
}

function buildStationClusters(includeWardStations: boolean, wardsFilter: Set<string> | null): StationCluster[] {
    const clusters: StationCluster[] = [];
    const processedIds = new Set<string>();

    // Start with RAW_STATIONS (Core JR/Metro stations)
    let allStations = wardsFilter ? RAW_STATIONS.filter(s => wardsFilter.has(s.ward)) : [...RAW_STATIONS];
    console.log(`DEBUG: Initial RAW_STATIONS count: ${RAW_STATIONS.length}`);

    // Add Tokyo Metro / Toei Priority Stations (Phase 3)
    const metroToeiStations = wardsFilter
        ? METRO_TOEI_PRIORITY_STATIONS.filter(s => wardsFilter.has(s.ward))
        : [...METRO_TOEI_PRIORITY_STATIONS];
    console.log(`DEBUG: Adding ${metroToeiStations.length} Metro/Toei priority stations.`);
    allStations = [...allStations, ...metroToeiStations];

    // Add Airport Stations (Phase 4) - Always include, no ward filter
    console.log(`DEBUG: Adding ${AIRPORT_STATIONS.length} airport stations.`);
    allStations = [...allStations, ...AIRPORT_STATIONS];

    if (includeWardStations) {
        console.log('DEBUG: Loading ward stations...');
        const wardStations = loadWardStations(wardsFilter || undefined);
        console.log(`DEBUG: Loaded ${wardStations.length} additional stations from ward scan.`);
        allStations = [...allStations, ...wardStations];
    }

    console.log(`DEBUG: Total stations to process: ${allStations.length}`);

    // 优先处理有 Wiki Title 的作为 Primary (Core stations always have WikiTitle)
    // Actually, Ward stations also have generated WikiTitle, but Core stations come first in the array
    // so they will be processed first.
    // Let's ensure Core stations are processed first to be the cluster centers.

    // Sort logic: Core stations (from RAW_STATIONS) first?
    // Actually, RAW_STATIONS are already at the beginning of the array.
    // But let's refine the sort:
    // 1. Stations present in RAW_STATIONS (prioritize official IDs over osm: IDs)
    // 2. Then by Wiki Title existence (all have it now)

    const coreStationIds = new Set(RAW_STATIONS.map(s => s.id));

    const sortedStations = allStations.sort((a, b) => {
        const aIsCore = coreStationIds.has(a.id);
        const bIsCore = coreStationIds.has(b.id);
        if (aIsCore && !bIsCore) return -1;
        if (!aIsCore && bIsCore) return 1;
        return 0;
    });

    for (const station of sortedStations) {
        if (processedIds.has(station.id)) continue;

        const cluster: StationCluster = {
            primaryId: station.id,
            ward: station.ward,
            stations: [station],
            center: station.location
        };
        processedIds.add(station.id);

        // 查找附近的车站
        for (const other of sortedStations) {
            if (processedIds.has(other.id)) continue;

            const distKm = getDistanceFromLatLonInKm(
                station.location.lat, station.location.lng,
                other.location.lat, other.location.lng
            );

            if (distKm * 1000 <= CONFIG.OSM.DEDUP_RADIUS) {
                cluster.stations.push(other);
                processedIds.add(other.id);
            }
        }

        clusters.push(cluster);
    }

    console.log(`DEBUG: Clusters created: ${clusters.length}`);
    return clusters;
}
