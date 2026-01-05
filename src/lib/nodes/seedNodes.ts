import { supabaseAdmin } from '../supabase';
import { Translator } from '../utils/translator';
import { STATION_LINES } from '@/lib/constants/stationLines';

export const SEED_NODES = [
    {
        id: 'odpt:Station:TokyoMetro.Ueno',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '上野', 'ja': '上野', 'en': 'Ueno' },
        type: 'station',
        location: 'POINT(139.7774 35.7141)', // Lon Lat
        geohash: 'xn77k', // Dummy or approx
        is_hub: false,
        parent_hub_id: 'odpt:Station:JR-East.Ueno',
        zone: 'core',
        source_dataset: 'odpt_seed',
        vibe: 'culture',
        address: { 'ja': '東京都台東区東上野三丁目19-6', 'zh-TW': '東京都台東區東上野三丁目19-6', 'en': '3-19-6 Higashi-Ueno, Taito-ku, Tokyo' },
        facilityTags: [
            // Leisure - Culture & Park
            { mainCategory: 'leisure', subCategory: 'nature', detailCategory: 'park', name: 'Ueno Park', distanceMeters: 50, direction: 'Park Exit' },
            { mainCategory: 'leisure', subCategory: 'culture', detailCategory: 'museum', name: 'Tokyo National Museum', distanceMeters: 400, direction: 'Park Exit' },
            { mainCategory: 'leisure', subCategory: 'culture', detailCategory: 'zoo', name: 'Ueno Zoo', distanceMeters: 300, direction: 'Park Exit' },

            // Shopping - Ameyoko
            { mainCategory: 'shopping', subCategory: 'market', name: 'Ameya-Yokocho', distanceMeters: 100, direction: 'Shinobazu Exit', street: 'Ameyoko' },
            { mainCategory: 'shopping', subCategory: 'specialty', detailCategory: 'souvenir', name: 'Yamashiroya', distanceMeters: 50, direction: 'Central Exit' },

            // Dining
            { mainCategory: 'dining', subCategory: 'cafe', name: 'Starbucks Ueno Park', distanceMeters: 200, direction: 'Park Exit' }
        ]
    },
    {
        id: 'odpt:Station:JR-East.Ueno',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '上野', 'ja': '上野', 'en': 'Ueno' },
        type: 'station',
        location: 'POINT(139.7774 35.7141)', // Same loc as Metro for now, or slight offset?
        geohash: 'xn77k',
        is_hub: true,
        zone: 'core',
        source_dataset: 'odpt_seed',
        vibe: 'culture',
        facilityTags: [
            // JR specific tags if any, but copying shared ones is fine for seed logic
            { mainCategory: 'leisure', subCategory: 'nature', detailCategory: 'park', name: 'Ueno Park', distanceMeters: 50, direction: 'Park Exit' }
        ]
    },
    {
        id: 'odpt:Station:JR-East.Akihabara',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '秋葉原', 'ja': '秋葉原', 'en': 'Akihabara' },
        type: 'station',
        location: 'POINT(139.7742 35.6986)',
        geohash: 'xn77k',
        is_hub: true,
        zone: 'core',
        source_dataset: 'odpt_seed',
        vibe: 'geek'
    },
    {
        id: 'odpt:Station:TsukubaExpress.Akihabara',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '秋葉原', 'ja': '秋葉原', 'en': 'Akihabara' },
        type: 'station',
        location: 'POINT(139.7742 35.6986)',
        geohash: 'xn77k',
        is_hub: false,
        parent_hub_id: 'odpt:Station:JR-East.Akihabara',
        zone: 'core',
        source_dataset: 'odpt_seed',
        vibe: 'tech_gateway'
    },
    {
        id: 'odpt:Station:JR-East.Tokyo',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '東京', 'ja': '東京', 'en': 'Tokyo' },
        type: 'station',
        location: 'POINT(139.7671 35.6812)',
        geohash: 'xn76u',
        is_hub: true,
        zone: 'core',
        source_dataset: 'odpt_seed',
        vibe: 'historic'
    },
    // Chuo & Ginza Core
    {
        id: 'odpt:Station:TokyoMetro.Ginza',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '銀座', 'ja': '銀座', 'en': 'Ginza' },
        type: 'station',
        location: 'POINT(139.7665 35.6712)',
        vibe: 'luxury',
        geohash: 'xn76u',
        is_hub: true,
        zone: 'core',
        source_dataset: 'odpt_seed',
        address: { 'ja': '東京都中央区銀座四丁目1-2', 'zh-TW': '東京都中央區銀座四丁目1-2', 'en': '4-1-2 Ginza, Chuo-ku, Tokyo' },
        facilityTags: [
            // Shopping - Luxury
            { mainCategory: 'shopping', subCategory: 'department', name: 'Ginza Mitsukoshi', distanceMeters: 50, direction: 'Exit A7', note: 'Landmark' },
            { mainCategory: 'shopping', subCategory: 'department', name: 'Wako', distanceMeters: 50, direction: 'Exit A10', note: 'Clock Tower' },
            { mainCategory: 'shopping', subCategory: 'department', name: 'GINZA SIX', distanceMeters: 200, direction: 'Exit A3' },
            { mainCategory: 'shopping', subCategory: 'department', name: 'Matsuya Ginza', distanceMeters: 100, direction: 'Exit A12' },

            // Shopping - Stationery
            { mainCategory: 'shopping', subCategory: 'specialty', name: 'Ginza Itoya', distanceMeters: 200, direction: 'Exit A12', note: 'Stationery' },

            // Leisure
            { mainCategory: 'leisure', subCategory: 'culture', detailCategory: 'theater', name: 'Kabukiza Theatre', distanceMeters: 400, direction: 'Exit A7' }
        ]
    },
    {
        id: 'odpt:Station:TokyoMetro.Kyobashi',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '京橋', 'ja': '京橋', 'en': 'Kyobashi' },
        type: 'station',
        location: 'POINT(139.7702 35.6766)',
        vibe: 'art',
        geohash: 'xn76u',
        is_hub: false,
        zone: 'core',
        source_dataset: 'odpt_seed',
        address: { 'ja': '東京都中央区京橋二丁目2-10', 'zh-TW': '東京都中央區京橋二丁目2-10', 'en': '2-2-10 Kyobashi, Chuo-ku, Tokyo' },
        facilityTags: [
            // Culture
            { mainCategory: 'leisure', subCategory: 'culture', detailCategory: 'museum', name: 'Artizon Museum', distanceMeters: 300, direction: 'Exit 6' },
            { mainCategory: 'leisure', subCategory: 'culture', detailCategory: 'museum', name: 'National Film Archive', distanceMeters: 100, direction: 'Exit 1' },

            // Shopping & Dining
            { mainCategory: 'shopping', subCategory: 'department', name: 'Tokyo Square Garden', distanceMeters: 50, direction: 'Exit 3' },
            { mainCategory: 'dining', subCategory: 'restaurant', name: 'Kyobashi Edogrand', distanceMeters: 0, direction: 'Direct Access' }
        ]
    },
    {
        id: 'odpt:Station:TokyoMetro.Mitsukoshimae',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '三越前', 'ja': '三越前', 'en': 'Mitsukoshimae' },
        type: 'station',
        location: 'POINT(139.7746 35.6846)',
        vibe: 'historic_commerce',
        geohash: 'xn76u',
        is_hub: false,
        zone: 'core',
        source_dataset: 'odpt_seed',
        address: { 'ja': '東京都中央区日本橋室町一丁目8-1', 'zh-TW': '東京都中央區日本橋室町一丁目8-1', 'en': '1-8-1 Nihombashi-muromachi, Chuo-ku, Tokyo' },
        facilityTags: [
            // Shopping - Department Store
            { mainCategory: 'shopping', subCategory: 'department_store', name: 'Nihombashi Mitsukoshi Main Store', distanceMeters: 0, direction: 'Direct Access', note: 'Historic' },
            { mainCategory: 'shopping', subCategory: 'department_store', name: 'COREDO Muromachi', distanceMeters: 100, direction: 'Exit A4', note: 'Modern Mix' },

            // Culture - Museum
            { mainCategory: 'leisure', subCategory: 'culture', detailCategory: 'museum', name: 'Mitsui Memorial Museum', distanceMeters: 200, direction: 'Exit A7' },
            { mainCategory: 'leisure', subCategory: 'culture', detailCategory: 'museum', name: 'Currency Museum', distanceMeters: 300, direction: 'Exit B1' }
        ]
    },
    {
        id: 'odpt:Station:TokyoMetro.Kayabacho',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '茅場町', 'ja': '茅場町', 'en': 'Kayabacho' },
        type: 'station',
        location: 'POINT(139.7801 35.6797)',
        vibe: 'business',
        geohash: 'xn76u',
        is_hub: false,
        zone: 'core',
        source_dataset: 'odpt_seed',
        address: { 'ja': '東京都中央区日本橋茅場町一丁目4-6', 'zh-TW': '東京都中央區日本橋茅場町一丁目4-6', 'en': '1-4-6 Nihombashi-kayabacho, Chuo-ku, Tokyo' },
        facilityTags: [
            // Business - Finance
            { mainCategory: 'service', subCategory: 'office', name: 'Tokyo Stock Exchange', distanceMeters: 200, direction: 'Exit 11' },
            { mainCategory: 'service', subCategory: 'office', name: 'Tokyo Shoken Kaikan', distanceMeters: 100, direction: 'Exit 8' }
        ]
    },
    {
        id: 'odpt:Station:JR-East.Hatchobori',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '八丁堀', 'ja': '八丁堀', 'en': 'Hatchobori' },
        type: 'station',
        location: 'POINT(139.7779 35.6749)',
        vibe: 'residential_business',
        geohash: 'xn76u',
        is_hub: true, // Transfer to Keiyo Line
        zone: 'core',
        source_dataset: 'odpt_seed',
        address: { 'ja': '東京都中央区八丁堀三丁目25-10', 'zh-TW': '東京都中央區八丁堀三丁目25-10', 'en': '3-25-10 Hatchobori, Chuo-ku, Tokyo' },
        facilityTags: [
            // Leisure - River
            { mainCategory: 'leisure', subCategory: 'nature', detailCategory: 'park', name: 'Sumida River Terrace', distanceMeters: 300, direction: 'Exit B4' },

            // Accommodation
            { mainCategory: 'service', subCategory: 'hotel', name: 'Hotel Sardonyx Tokyo', distanceMeters: 100, direction: 'Exit A3' }
        ]
    },
    {
        id: 'odpt:Station:JR-East.Kanda',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '神田', 'ja': '神田', 'en': 'Kanda' },
        type: 'station',
        location: 'POINT(139.7707 35.6917)',
        vibe: 'curry',
        geohash: 'xn77k',
        is_hub: true,
        zone: 'core',
        source_dataset: 'odpt_seed',
        address: { 'ja': '東京都千代田区鍛冶町二丁目13-1', 'zh-TW': '東京都千代田區鍛冶町二丁目13-1', 'en': '2-13-1 Kajicho, Chiyoda-ku, Tokyo' },
        facilityTags: [
            // Dining - Curry
            { mainCategory: 'dining', subCategory: 'restaurant', name: 'Kanda Curry District', distanceMeters: 50, direction: 'Exit West', note: '400+ Shops' },
            { mainCategory: 'dining', subCategory: 'izakaya', name: 'Isegen', distanceMeters: 200, direction: 'Exit North', note: 'Monkfish' },

            // Culture
            { mainCategory: 'leisure', subCategory: 'culture', detailCategory: 'shrine', name: 'Kanda Myojin', distanceMeters: 400, direction: 'Exit North' },

            // Shopping - Books
            { mainCategory: 'shopping', subCategory: 'specialty', name: 'Jimbocho Book Town', distanceMeters: 600, direction: 'Exit West', note: 'Bookstores' },

            // Leisure - History
            { mainCategory: 'leisure', subCategory: 'culture', detailCategory: 'museum', name: 'Mitsui Memorial Museum', distanceMeters: 500, direction: 'Exit South' }
        ]
    },
    {
        id: 'odpt:Station:TokyoMetro.Kanda',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '神田', 'ja': '神田', 'en': 'Kanda' },
        type: 'station',
        location: 'POINT(139.7707 35.6917)',
        vibe: 'curry',
        geohash: 'xn77k',
        is_hub: false,
        zone: 'core',
        parent_hub_id: 'odpt:Station:JR-East.Kanda',
        source_dataset: 'odpt_seed'
    },
    // Asakusa Line - Chuo
    {
        id: 'odpt:Station:Toei.HigashiGinza',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '東銀座', 'ja': '東銀座', 'en': 'Higashi-ginza' },
        type: 'station',
        location: 'POINT(139.7675 35.6694)',
        vibe: 'theater',
        geohash: 'xn76u',
        is_hub: false,
        zone: 'core',
        source_dataset: 'odpt_seed',
        address: { 'ja': '東京都中央区銀座四丁目10-10', 'zh-TW': '東京都中央區銀座四丁目10-10', 'en': '4-10-10 Ginza, Chuo-ku, Tokyo' },
        facilityTags: [
            // Culture - Theater
            { mainCategory: 'leisure', subCategory: 'culture', detailCategory: 'theater', name: 'Kabukiza Theatre', distanceMeters: 0, direction: 'Direct Access', note: 'Kabuki' },
            { mainCategory: 'leisure', subCategory: 'culture', detailCategory: 'theater', name: 'Shinbashi Enbujo', distanceMeters: 300, direction: 'Exit 6' },

            // Dining
            { mainCategory: 'dining', subCategory: 'restaurant', name: 'Ginza Shochiku Square', distanceMeters: 200, direction: 'Exit 5' }
        ]
    },
    {
        id: 'odpt:Station:TokyoMetro.Nihombashi',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '日本橋', 'ja': '日本橋', 'en': 'Nihombashi' },
        type: 'station',
        location: 'POINT(139.7745 35.6812)',
        vibe: 'tradition',
        geohash: 'xn76u',
        is_hub: false,
        parent_hub_id: 'odpt:Station:Toei.Nihombashi',
        zone: 'core',
        source_dataset: 'odpt_seed'
    },
    {
        id: 'odpt:Station:Toei.Nihombashi',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '日本橋', 'ja': '日本橋', 'en': 'Nihombashi' },
        type: 'station',
        location: 'POINT(139.7745 35.6812)',
        vibe: 'tradition',
        geohash: 'xn76u',
        is_hub: true,
        zone: 'core',
        source_dataset: 'odpt_seed',
        address: { 'ja': '東京都中央区日本橋一丁目13-1', 'zh-TW': '東京都中央區日本橋一丁目13-1', 'en': '1-13-1 Nihonbashi, Chuo-ku, Tokyo' },
        facilityTags: [
            // Shopping - Department
            { mainCategory: 'shopping', subCategory: 'department', name: 'Nihombashi Takashimaya S.C.', distanceMeters: 50, direction: 'Exit B2', note: 'Important Cultural Property' },
            { mainCategory: 'shopping', subCategory: 'department', name: 'COREDO Nihonbashi', distanceMeters: 0, direction: 'Direct Access' },

            // Culture - History
            { mainCategory: 'leisure', subCategory: 'culture', detailCategory: 'historic_building', name: 'Nihonbashi Bridge', distanceMeters: 100, direction: 'Exit B12', note: 'Kilometer Zero' },
            { mainCategory: 'leisure', subCategory: 'culture', detailCategory: 'historic_building', name: 'Bank of Japan', distanceMeters: 400, direction: 'Exit B1' }
        ]
    },
    {
        id: 'odpt:Station:Toei.Ningyocho',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '人形町', 'ja': '人形町', 'en': 'Ningyocho' },
        type: 'station',
        location: 'POINT(139.7821 35.6865)',
        vibe: 'shitamachi',
        geohash: 'xn77k',
        is_hub: false,
        zone: 'core',
        source_dataset: 'odpt_seed',
        address: { 'ja': '東京都中央区日本橋人形町三丁目7-13', 'zh-TW': '東京都中央區日本橋人形町三丁目7-13', 'en': '3-7-13 Nihonbashi-ningyocho, Chuo-ku, Tokyo' },
        facilityTags: [
            // Religion
            { mainCategory: 'leisure', subCategory: 'culture', detailCategory: 'shrine', name: 'Suitengu Shrine', distanceMeters: 300, direction: 'Exit A2', note: 'Safe Childbirth' },

            // Shopping & Dining - Shitamachi
            { mainCategory: 'shopping', subCategory: 'market', name: 'Amazake Yokocho', distanceMeters: 50, direction: 'Exit A1', note: 'Traditional Street' },
            { mainCategory: 'dining', subCategory: 'restaurant', name: 'Tamahide', distanceMeters: 100, direction: 'Exit A2', note: 'Famous Oyakodon' }
        ]
    },
    {
        id: 'odpt:Station:TokyoMetro.Shinjuku',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '新宿', 'ja': '新宿', 'en': 'Shinjuku' },
        type: 'station',
        location: 'POINT(139.7006 35.6896)',
        geohash: 'xn77h',
        is_hub: false,
        parent_hub_id: 'odpt:Station:JR-East.Shinjuku',
        zone: 'core',
        source_dataset: 'odpt_seed',
        vibe: 'metropolis'
    },
    {
        id: 'odpt:Station:JR-East.Shinjuku',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '新宿', 'ja': '新宿', 'en': 'Shinjuku' },
        type: 'station',
        location: 'POINT(139.7006 35.6896)',
        geohash: 'xn77h',
        is_hub: true,
        zone: 'core',
        source_dataset: 'odpt_seed',
        vibe: 'metropolis'
    },
    {
        id: 'odpt:Station:TokyoMetro.Shibuya',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '澀谷', 'ja': '渋谷', 'en': 'Shibuya' },
        type: 'station',
        location: 'POINT(139.7016 35.6580)',
        geohash: 'xn76u',
        is_hub: false,
        parent_hub_id: 'odpt:Station:JR-East.Shibuya',
        zone: 'core',
        source_dataset: 'odpt_seed',
        vibe: 'youth_culture'
    },
    {
        id: 'odpt:Station:JR-East.Shibuya',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '澀谷', 'ja': '渋谷', 'en': 'Shibuya' },
        type: 'station',
        location: 'POINT(139.7016 35.6580)',
        geohash: 'xn76u',
        is_hub: true,
        zone: 'core',
        source_dataset: 'odpt_seed',
        vibe: 'youth_culture'
    },
    {
        id: 'odpt:Station:TokyoMetro.Ikebukuro',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '池袋', 'ja': '池袋', 'en': 'Ikebukuro' },
        type: 'station',
        location: 'POINT(139.7109 35.7289)',
        geohash: 'xn77k',
        is_hub: false,
        parent_hub_id: 'odpt:Station:JR-East.Ikebukuro',
        zone: 'core',
        source_dataset: 'odpt_seed',
        vibe: 'entertainment'
    },
    {
        id: 'odpt:Station:JR-East.Ikebukuro',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '池袋', 'ja': '池袋', 'en': 'Ikebukuro' },
        type: 'station',
        location: 'POINT(139.7109 35.7289)',
        geohash: 'xn77k',
        is_hub: true,
        zone: 'core',
        source_dataset: 'odpt_seed',
        vibe: 'entertainment'
    },
    {
        id: 'odpt:Station:Toei.BakuroYokoyama',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '馬喰橫山', 'ja': '馬喰横山', 'en': 'Bakuro-yokoyama' },
        type: 'station',
        location: 'POINT(139.7840 35.6922)',
        geohash: 'xn77k',
        is_hub: false,
        parent_hub_id: 'odpt:Station:Toei.HigashiNihombashi',
        zone: 'core',
        source_dataset: 'odpt_seed'
    },
    {
        id: 'odpt:Station:Toei.HigashiNihombashi',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '東日本橋・馬喰橫山', 'ja': '東日本橋・馬喰横山', 'en': 'Higashi-nihombashi / Bakuro-yokoyama' },
        type: 'station',
        location: 'POINT(139.7840 35.6922)', // Midpoint of co-located stations
        vibe: 'wholesale',
        geohash: 'xn77k',
        is_hub: true, // Transfer hub: Asakusa Line + Shinjuku Line
        zone: 'core',
        source_dataset: 'odpt_seed'
    },
    // Taito Ward
    {
        id: 'odpt:Station:TokyoMetro.Asakusa',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '淺草', 'ja': '浅草', 'en': 'Asakusa' },
        type: 'station',
        location: 'POINT(139.7967 35.7106)',
        address: { 'ja': '東京都台東区浅草一丁目1-3', 'zh-TW': '東京都台東區淺草一丁目1-3', 'en': '1-1-3 Asakusa, Taito-ku, Tokyo' },
        geohash: 'xn77k',
        is_hub: true,
        zone: 'core',
        source_dataset: 'odpt_seed',
        vibe: 'traditional',
        facilityTags: [
            // Shopping - Souvenirs & Traditional
            { mainCategory: 'shopping', subCategory: 'specialty', detailCategory: 'souvenir', name: '仲見世商店街', distanceMeters: 200, direction: 'Exit 1', street: 'Nakamise-dori' },
            { mainCategory: 'shopping', subCategory: 'specialty', detailCategory: 'souvenir', name: '新仲見世商店街', distanceMeters: 150, direction: 'Exit 1', street: 'Shin-Nakamise' },
            { mainCategory: 'shopping', subCategory: 'department', name: 'Matsuya Asakusa', distanceMeters: 0, direction: 'Direct Connect', brand: 'Matsuya' },

            // Shopping - Drugstores (High density)
            { mainCategory: 'shopping', subCategory: 'drugstore', brand: 'Matsumoto Kiyoshi', distanceMeters: 50, direction: 'Exit 1' },
            { mainCategory: 'shopping', subCategory: 'drugstore', brand: 'Sundrug', distanceMeters: 30, direction: 'Exit 3' },
            { mainCategory: 'shopping', subCategory: 'drugstore', brand: 'Daikoku Drug', distanceMeters: 150, street: 'Shin-Nakamise' },

            // Shopping - Lifestyle
            { mainCategory: 'shopping', subCategory: 'variety_store', brand: 'Don Quijote', distanceMeters: 400, direction: 'Exit A1' },
            { mainCategory: 'shopping', subCategory: 'shopping_mall', name: 'Asakusa ROX', distanceMeters: 500, direction: 'Exit A1' },

            // Dining - Traditional
            { mainCategory: 'dining', subCategory: 'japanese', detailCategory: 'tempura', name: 'Daikokuya', distanceMeters: 250 },
            { mainCategory: 'dining', subCategory: 'japanese', detailCategory: 'unagi', distanceMeters: 200 },
            { mainCategory: 'dining', subCategory: 'bar', detailCategory: 'izakaya', name: 'Hoppy Street', distanceMeters: 400, direction: 'West' },
            { mainCategory: 'dining', subCategory: 'bar', name: 'Kamiya Bar', distanceMeters: 50, direction: 'Exit 3' },

            // Leisure
            { mainCategory: 'leisure', subCategory: 'tourist', detailCategory: 'temple', name: 'Senso-ji', distanceMeters: 350, direction: 'North' },
            { mainCategory: 'leisure', subCategory: 'tourist', detailCategory: 'historic_building', name: 'Kaminarimon', distanceMeters: 100, direction: 'Exit 1' },
            { mainCategory: 'leisure', subCategory: 'tourist', detailCategory: 'theme_park', name: 'Hanayashiki', distanceMeters: 500, direction: 'North West' },
            { mainCategory: 'leisure', subCategory: 'nature', detailCategory: 'park', name: 'Sumida Park', distanceMeters: 150, direction: 'River Side' },
            { mainCategory: 'leisure', subCategory: 'tourist', detailCategory: 'activity', name: 'Rickshaw Stands', distanceMeters: 80, direction: 'Kaminarimon' }
        ]
    },
    {
        id: 'odpt:Station:Toei.Kuramae',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '藏前', 'ja': '蔵前', 'en': 'Kuramae' },
        type: 'station',
        location: 'POINT(139.7905 35.7050)',
        geohash: 'xn77k',
        is_hub: false,
        zone: 'core',
        source_dataset: 'odpt_seed',
        vibe: 'craft'
    },
    {
        id: 'odpt:Station:JR-East.Okachimachi',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '御徒町・上野御徒町', 'ja': '御徒町・上野御徒町', 'en': 'Okachimachi / Ueno-Okachimachi' },
        type: 'station',
        location: 'POINT(139.7752 35.7075)',
        geohash: 'xn77k',
        is_hub: true,
        zone: 'core',
        source_dataset: 'odpt_seed',
        vibe: 'market',
        address: { 'ja': '東京都台東区上野五丁目23-12', 'zh-TW': '東京都台東區上野五丁目23-12', 'en': '5-23-12 Ueno, Taito-ku, Tokyo' },
        facilityTags: [
            // Shopping - Department
            { mainCategory: 'shopping', subCategory: 'department', name: 'Matsuzakaya Ueno', distanceMeters: 100, direction: 'South Exit', brand: 'Matsuzakaya' },
            { mainCategory: 'shopping', subCategory: 'market', name: 'Ameya-Yokocho', distanceMeters: 50, direction: 'North Exit', street: 'Ameyoko' },
            { mainCategory: 'shopping', subCategory: 'specialty', name: 'Takeya', distanceMeters: 300, direction: 'South Exit', note: 'Discount Store' },
            { mainCategory: 'shopping', subCategory: 'specialty', name: '2k540 AKI-OKA ARTISAN', distanceMeters: 350, direction: 'South Exit', note: 'Artisan Shops under tracks' },

            // Dining
            { mainCategory: 'dining', subCategory: 'restaurant', name: 'Yoshiike Shokudo', distanceMeters: 50, direction: 'North Exit', note: 'Fresh Seafood' }
        ]
    },
    {
        id: 'odpt:Station:JR-East.Uguisudani',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '鶯谷', 'ja': '鶯谷', 'en': 'Uguisudani' },
        type: 'station',
        location: 'POINT(139.7788 35.7225)',
        geohash: 'xn77k',
        is_hub: false,
        zone: 'core',
        source_dataset: 'odpt_seed',
        vibe: 'retro',
        address: { 'ja': '東京都台東区根岸一丁目4', 'zh-TW': '東京都台東區根岸一丁目4', 'en': '1-4 Negishi, Taito-ku, Tokyo' },
        facilityTags: [
            // Leisure - Culture
            { mainCategory: 'leisure', subCategory: 'culture', detailCategory: 'museum', name: 'Tokyo National Museum', distanceMeters: 600, direction: 'South Exit' },
            { mainCategory: 'leisure', subCategory: 'entertainment', name: 'Tokyo Kinema Club', distanceMeters: 100, direction: 'South Exit', note: 'Live Venue' },

            // Dining
            { mainCategory: 'dining', subCategory: 'restaurant', name: 'Sasa-no-yuki', distanceMeters: 200, direction: 'North Exit', note: 'Traditional Tofu Cuisine' }
        ]
    },
    {
        id: 'odpt:Station:Toei.Asakusabashi',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '淺草橋', 'ja': '浅草橋', 'en': 'Asakusabashi' },
        type: 'station',
        location: 'POINT(139.7865 35.6974)',
        geohash: 'xn77k',
        is_hub: false,
        zone: 'core',
        source_dataset: 'odpt_seed',
        vibe: 'wholesale_craft'
    },
    {
        id: 'odpt:Station:TokyoMetro.Tawaramachi',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '田原町', 'ja': '田原町', 'en': 'Tawaramachi' },
        type: 'station',
        location: 'POINT(139.7892 35.7107)',
        geohash: 'xn77k',
        is_hub: false,
        zone: 'core',
        source_dataset: 'odpt_seed',
        vibe: 'kitchen',
        address: { 'ja': '東京都台東区西浅草一丁目1-18', 'zh-TW': '東京都台東區西淺草一丁目1-18', 'en': '1-1-18 Nishi-Asakusa, Taito-ku, Tokyo' },
        facilityTags: [
            // Shopping - Kitchen Town
            { mainCategory: 'shopping', subCategory: 'specialty', name: 'Kappabashi Kitchen Town', distanceMeters: 150, direction: 'Exit 3', street: 'Kappabashi-dori' },
            { mainCategory: 'shopping', subCategory: 'specialty', name: 'Niimi Kitchenware', distanceMeters: 200, direction: 'Exit 3', brand: 'Niimi' },

            // Dining
            { mainCategory: 'dining', subCategory: 'bakery', name: 'Pelican Bakery', distanceMeters: 100, direction: 'Exit 2' },

            // Leisure
            { mainCategory: 'leisure', subCategory: 'culture', detailCategory: 'temple', name: 'Higashi-Honganji', distanceMeters: 250, direction: 'Exit 3' }
        ]
    },
    {
        id: 'odpt:Station:TokyoMetro.Iriya',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '入谷', 'ja': '入谷', 'en': 'Iriya' },
        type: 'station',
        location: 'POINT(139.7850 35.7208)',
        geohash: 'xn77k',
        is_hub: false,
        zone: 'core',
        source_dataset: 'odpt_seed',
        vibe: 'quiet',
        address: { 'ja': '東京都台東区下谷二丁目15-1', 'zh-TW': '東京都台東區下谷二丁目15-1', 'en': '2-15-1 Shitaya, Taito-ku, Tokyo' },
        facilityTags: [
            // Leisure - Culture
            { mainCategory: 'leisure', subCategory: 'culture', detailCategory: 'temple', name: 'Shingen-ji (Kishibojin)', distanceMeters: 100, direction: 'Exit 1', note: 'Morning Glory Fair in July' },
            { mainCategory: 'leisure', subCategory: 'culture', detailCategory: 'shrine', name: 'Ootori Shrine', distanceMeters: 550, direction: 'Exit 3', note: 'Tori no Ichi' },

            // Dining - Cafe
            { mainCategory: 'dining', subCategory: 'cafe', name: 'Iriya Plus Cafe', distanceMeters: 300, direction: 'Exit 4', note: 'Kominka Cafe' },

            // Shopping
            { mainCategory: 'shopping', subCategory: 'supermarket', brand: 'My Basket', distanceMeters: 150, direction: 'Exit 1' }
        ]
    },
    {
        id: 'odpt:Station:TokyoMetro.Inaricho',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '稻荷町', 'ja': '稲荷町', 'en': 'Inaricho' },
        type: 'station',
        location: 'POINT(139.7825 35.7115)',
        geohash: 'xn77k',
        is_hub: false,
        zone: 'core',
        source_dataset: 'odpt_seed',
        vibe: 'temple',
        address: { 'ja': '東京都台東区東上野三丁目33-11', 'zh-TW': '東京都台東區東上野三丁目33-11', 'en': '3-33-11 Higashi-Ueno, Taito-ku, Tokyo' },
        facilityTags: [
            // Religion
            { mainCategory: 'leisure', subCategory: 'culture', detailCategory: 'shrine', name: 'Shitaya Shrine', distanceMeters: 100, direction: 'Exit 1' },

            // Leisure - Sento
            { mainCategory: 'leisure', subCategory: 'relaxation', detailCategory: 'sauna', name: 'Kotobukiyu', distanceMeters: 200, direction: 'Exit 1' },

            // Shopping - Niche
            { mainCategory: 'shopping', subCategory: 'specialty', name: 'Butsudan-dori', distanceMeters: 50, direction: 'Exit 2', street: 'Asakusa-dori' }
        ]
    },
    {
        id: 'odpt:Station:TokyoMetro.Minowa',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '三之輪', 'ja': '三ノ輪', 'en': 'Minowa' },
        type: 'station',
        location: 'POINT(139.7914 35.7296)',
        geohash: 'xn77k',
        is_hub: false,
        zone: 'core',
        source_dataset: 'odpt_seed',
        vibe: 'tram',
        address: { 'ja': '東京都台東区根岸五丁目19-6', 'zh-TW': '東京都台東區根岸五丁目19-6', 'en': '5-19-6 Negishi, Taito-ku, Tokyo' },
        facilityTags: [
            // Transportation
            { mainCategory: 'leisure', subCategory: 'tourist', detailCategory: 'activity', name: 'Toden Minowabashi Station', distanceMeters: 250, direction: 'Exit 3', note: 'Start of Toden Arakawa Line' },

            // Shopping - Retro
            { mainCategory: 'shopping', subCategory: 'market', name: 'Joyful Minowa', distanceMeters: 300, direction: 'Exit 3', street: 'Joyful Minowa Shopping Street' },

            // Leisure - History
            { mainCategory: 'leisure', subCategory: 'culture', detailCategory: 'temple', name: 'Jokan-ji', distanceMeters: 500, direction: 'Exit 3', note: 'Throw-Away Temple' }
        ]
    },
    {
        id: 'odpt:Station:Toei.ShinOkachimachi',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '新御徒町', 'ja': '新御徒町', 'en': 'Shin-Okachimachi' },
        type: 'station',
        location: 'POINT(139.7868 35.7071)',
        geohash: 'xn77k',
        is_hub: true,
        zone: 'core',
        source_dataset: 'odpt_seed',
        vibe: 'arcade',
        address: { 'ja': '東京都台東区小島二丁目21-18', 'zh-TW': '東京都台東區小島二丁目21-18', 'en': '2-21-18 Kojima, Taito-ku, Tokyo' },
        facilityTags: [
            // Shopping - Retro
            { mainCategory: 'shopping', subCategory: 'market', name: 'Satake Shopping Arcade', distanceMeters: 50, direction: 'Exit A2', street: 'Satake Shotengai', note: '2nd Oldest in Tokyo' },

            // Medical
            { mainCategory: 'medical', subCategory: 'hospital', name: 'Eiju General Hospital', distanceMeters: 500, direction: 'Exit A1' }
        ]
    },
    {
        id: 'odpt:Station:TokyoMetro.Yushima',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '湯島', 'ja': '湯島', 'en': 'Yushima' },
        type: 'station',
        location: 'POINT(139.7711 35.7077)',
        geohash: 'xn77k',
        is_hub: false,
        zone: 'core',
        source_dataset: 'odpt_seed',
        vibe: 'scholar',
        address: { 'ja': '東京都文京区湯島三丁目47-10', 'zh-TW': '東京都文京區湯島三丁目47-10', 'en': '3-47-10 Yushima, Bunkyo-ku, Tokyo' },
        facilityTags: [
            // Religion
            { mainCategory: 'leisure', subCategory: 'culture', detailCategory: 'shrine', name: 'Yushima Tenjin', distanceMeters: 150, direction: 'Exit 3', note: 'Scholar Shrine' },

            // Leisure - Culture
            { mainCategory: 'leisure', subCategory: 'culture', detailCategory: 'historic_building', name: 'Kyu-Iwasaki-tei Gardens', distanceMeters: 200, direction: 'Exit 1' }
        ]
    },
    {
        id: 'odpt:Station:TokyoMetro.Tsukiji',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '築地', 'ja': '築地', 'en': 'Tsukiji' },
        type: 'station',
        location: 'POINT(139.7715 35.6695)',
        geohash: 'xn76u',
        is_hub: false,
        zone: 'core',
        source_dataset: 'odpt_seed',
        vibe: 'market'
    },
    {
        id: 'odpt:Station:TokyoMetro.Ochanomizu',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '御茶之水', 'ja': '御茶ノ水', 'en': 'Ochanomizu' },
        type: 'station',
        location: 'POINT(139.7638 35.6994)',
        geohash: 'xn77k',
        is_hub: false,
        zone: 'core',
        source_dataset: 'odpt_seed',
        vibe: 'academic',
        address: { 'ja': '東京都文京区湯島一丁目5-8', 'zh-TW': '東京都文京區湯島一丁目5-8', 'en': '1-5-8 Yushima, Bunkyo-ku, Tokyo' },
        facilityTags: [
            // Academic & Medical
            { mainCategory: 'service', subCategory: 'hospital', name: 'Juntendo University Hospital', distanceMeters: 200, direction: 'Exit 1' },
            { mainCategory: 'service', subCategory: 'hospital', name: 'Tokyo Medical and Dental Univ. Hospital', distanceMeters: 50, direction: 'Exit 2' },

            // Culture
            { mainCategory: 'leisure', subCategory: 'culture', detailCategory: 'shrine', name: 'Kanda Myojin', distanceMeters: 300, direction: 'Exit 1', note: 'IT God' },
            { mainCategory: 'leisure', subCategory: 'culture', detailCategory: 'historic_building', name: 'Yushima Seido', distanceMeters: 150, direction: 'Exit 1', note: 'Confucius' },
            { mainCategory: 'leisure', subCategory: 'culture', detailCategory: 'historic_building', name: 'Holy Resurrection Cathedral', distanceMeters: 200, direction: 'Exit 1' },

            // Shopping - Instruments
            { mainCategory: 'shopping', subCategory: 'specialty', name: 'Meidai-dori', distanceMeters: 100, direction: 'Exit 2', note: 'Instrument Shops' }
        ]
    },
    {
        id: 'odpt:Station:TokyoMetro.Kasumigaseki',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '霞關', 'ja': '霞ヶ関', 'en': 'Kasumigaseki' },
        type: 'station',
        location: 'POINT(139.7513 35.6726)',
        geohash: 'xn76u',
        is_hub: false,
        zone: 'core',
        source_dataset: 'odpt_seed',
        vibe: 'government',
        address: { 'ja': '東京都千代田区霞が関二丁目1-2', 'zh-TW': '東京都千代田區霞關二丁目1-2', 'en': '2-1-2 Kasumigaseki, Chiyoda-ku, Tokyo' },
        facilityTags: [
            // Government
            { mainCategory: 'service', subCategory: 'government', name: 'Ministry of Foreign Affairs', distanceMeters: 100, direction: 'Exit A4' },
            { mainCategory: 'service', subCategory: 'government', name: 'Tokyo High Court', distanceMeters: 150, direction: 'Exit A1' },
            { mainCategory: 'service', subCategory: 'government', name: 'Metropolitan Police Department', distanceMeters: 200, direction: 'Exit A2' },

            // Leisure - Park
            { mainCategory: 'leisure', subCategory: 'nature', detailCategory: 'park', name: 'Hibiya Park', distanceMeters: 100, direction: 'Exit B2' }
        ]
    },
    {
        id: 'odpt:Station:TokyoMetro.Iidabashi',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '飯田橋', 'ja': '飯田橋', 'en': 'Iidabashi' },
        type: 'station',
        location: 'POINT(139.7450 35.7021)',
        geohash: 'xn77k',
        is_hub: false,
        parent_hub_id: 'odpt:Station:JR-East.Iidabashi',
        zone: 'core',
        source_dataset: 'odpt_seed',
        vibe: 'hub',
        address: { 'ja': '東京都新宿区神楽坂一丁目13', 'zh-TW': '東京都新宿區神楽坂一丁目13', 'en': '1-13 Kagurazaka, Shinjuku-ku, Tokyo' },
        facilityTags: [
            // Religion
            { mainCategory: 'leisure', subCategory: 'culture', detailCategory: 'shrine', name: 'Tokyo Daijingu', distanceMeters: 350, direction: 'Exit A4', note: 'Love Shrine' },

            // Leisure - Garden
            { mainCategory: 'leisure', subCategory: 'nature', detailCategory: 'garden', name: 'Koishikawa Korakuen', distanceMeters: 400, direction: 'Exit C3' },

            // Shopping & Dining
            { mainCategory: 'shopping', subCategory: 'market', name: 'Kagurazaka', distanceMeters: 100, direction: 'Exit B3', note: 'Little Paris' },
            { mainCategory: 'dining', subCategory: 'cafe', name: 'Canal Cafe', distanceMeters: 200, direction: 'Exit B2a', note: 'Riverside' },
            { mainCategory: 'shopping', subCategory: 'department', name: 'Iidabashi Ramla', distanceMeters: 50, direction: 'Exit B2b' }
        ]
    },
    {
        id: 'odpt:Station:JR-East.Iidabashi',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '飯田橋', 'ja': '飯田橋', 'en': 'Iidabashi' },
        type: 'station',
        location: 'POINT(139.7450 35.7021)',
        geohash: 'xn77k',
        is_hub: true,
        zone: 'core',
        source_dataset: 'odpt_seed',
        vibe: 'hub'
    },
    {
        id: 'odpt:Station:TokyoMetro.Hibiya',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '日比谷', 'ja': '日比谷', 'en': 'Hibiya' },
        type: 'station',
        location: 'POINT(139.7599 35.6738)',
        geohash: 'xn76u',
        is_hub: true,
        zone: 'core',
        source_dataset: 'odpt_seed',
        vibe: 'culture',
        address: { 'ja': '東京都千代田区有楽町一丁目5-1', 'zh-TW': '東京都千代田區有樂町一丁目5-1', 'en': '1-5-1 Yurakucho, Chiyoda-ku, Tokyo' },
        facilityTags: [
            // Culture
            { mainCategory: 'leisure', subCategory: 'culture', detailCategory: 'museum', name: 'Tokyo Takarazuka Theater', distanceMeters: 100, direction: 'Exit A5' },
            { mainCategory: 'leisure', subCategory: 'culture', detailCategory: 'museum', name: 'Nissay Theatre', distanceMeters: 50, direction: 'Exit A13' },

            // Leisure - Park
            { mainCategory: 'leisure', subCategory: 'nature', detailCategory: 'park', name: 'Hibiya Park', distanceMeters: 0, direction: 'Direct Access' },

            // Shopping
            { mainCategory: 'shopping', subCategory: 'department', name: 'Tokyo Midtown Hibiya', distanceMeters: 50, direction: 'Exit A11' },
            { mainCategory: 'shopping', subCategory: 'department', name: 'Hibiya Chanter', distanceMeters: 100, direction: 'Exit A5' }
        ]
    },
    {
        id: 'odpt:Station:TokyoMetro.Otemachi',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '大手町', 'ja': '大手町', 'en': 'Otemachi' },
        type: 'station',
        location: 'POINT(139.7639 35.6867)',
        geohash: 'xn76u',
        is_hub: false,
        parent_hub_id: 'odpt:Station:JR-East.Tokyo',
        zone: 'core',
        source_dataset: 'odpt_seed',
        vibe: 'business',
        address: { 'ja': '東京都千代田区大手町一丁目6-1', 'zh-TW': '東京都千代田區大手町一丁目6-1', 'en': '1-6-1 Otemachi, Chiyoda-ku, Tokyo' },
        facilityTags: [
            // Business
            { mainCategory: 'shopping', subCategory: 'department', name: 'Otemachi Tower', distanceMeters: 50, direction: 'Exit B1', note: 'Aman Tokyo' },
            { mainCategory: 'service', subCategory: 'office', name: 'Reading Room (The Otemachi Tower)', distanceMeters: 50, direction: 'Exit B1' },

            // Leisure - Nature
            { mainCategory: 'leisure', subCategory: 'nature', detailCategory: 'park', name: 'Imperial Palace East Gardens', distanceMeters: 200, direction: 'Exit C13a' },
            { mainCategory: 'leisure', subCategory: 'nature', detailCategory: 'garden', name: 'Wadakura Fountain Park', distanceMeters: 300, direction: 'Exit D2' },

            // Dining
            { mainCategory: 'dining', subCategory: 'restaurant', name: 'Otemachi Place', distanceMeters: 100, direction: 'Exit A5' }
        ]
    },
    // NOTE: Toei.UenoOkachimachi merged into JR-East.Okachimachi per co-location principle

    // Minato Ward
    {
        id: 'odpt:Station:TokyoMetro.Shimbashi',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '新橋', 'ja': '新橋', 'en': 'Shimbashi' },
        type: 'station',
        location: 'POINT(139.7582 35.6665)',
        geohash: 'xn76u',
        is_hub: true,
        zone: 'core',
        source_dataset: 'odpt_seed',
        vibe: 'salaryman'
    },
    {
        id: 'odpt:Station:TokyoMetro.Roppongi',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '六本木', 'ja': '六本木', 'en': 'Roppongi' },
        type: 'station',
        location: 'POINT(139.7322 35.6633)',
        geohash: 'xn76u',
        is_hub: true,
        zone: 'core',
        source_dataset: 'odpt_seed',
        vibe: 'nightlife'
    },
    // NOTE: Toei.Daimon merged into JR-East.Hamamatsucho per co-location principle

    {
        id: 'odpt:Station:JR-East.Hamamatsucho',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '濱松町・大門', 'ja': '浜松町・大門', 'en': 'Hamamatsucho / Daimon' },
        type: 'station',
        location: 'POINT(139.7571 35.6551)',
        geohash: 'xn76u',
        is_hub: true,
        zone: 'core',
        source_dataset: 'odpt_seed',
        vibe: 'airport_gateway'
    },
    {
        id: 'odpt:Station:TokyoMetro.Omotesando',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '表參道', 'ja': '表参道', 'en': 'Omotesando' },
        type: 'station',
        location: 'POINT(139.7126 35.6653)',
        geohash: 'xn76u',
        is_hub: true,
        zone: 'core',
        source_dataset: 'odpt_seed',
        vibe: 'fashion'
    },
    {
        id: 'odpt:Station:TokyoMetro.Hiroo',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '廣尾', 'ja': '広尾', 'en': 'Hiroo' },
        type: 'station',
        location: 'POINT(139.7219 35.6532)',
        geohash: 'xn76u',
        is_hub: false,
        zone: 'core',
        source_dataset: 'odpt_seed',
        vibe: 'international'
    },
    {
        id: 'odpt:Station:TokyoMetro.Akasakamitsuke',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '赤坂見附', 'ja': '赤坂見附', 'en': 'Akasaka-mitsuke' },
        type: 'station',
        location: 'POINT(139.7371 35.6770)',
        geohash: 'xn76u',
        is_hub: true,
        zone: 'core',
        source_dataset: 'odpt_seed',
        vibe: 'gourmet'
    },
    // NOTE: Toei Asakusa Line station merged into TokyoMetro.Asakusa per co-location principle
    // Chuo Ward - Toei Subway
    {
        id: 'odpt:Station:Toei.Takaracho',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '寶町', 'ja': '宝町', 'en': 'Takaracho' },
        type: 'station',
        location: 'POINT(139.7719 35.6754)',
        geohash: 'xn76u',
        is_hub: false,
        zone: 'core',
        source_dataset: 'odpt_seed',
        vibe: 'business'
    },
    // NOTE: (Toei.HigashiNihombashi duplicate removed - merged into earlier entry at line 256)
    {
        id: 'odpt:Station:Toei.Kachidoki',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '勝鬨', 'ja': '勝どき', 'en': 'Kachidoki' },
        type: 'station',
        location: 'POINT(139.7771 35.6590)',
        geohash: 'xn76u',
        is_hub: false,
        zone: 'core',
        source_dataset: 'odpt_seed',
        vibe: 'residential'
    },
    {
        id: 'odpt:Station:Toei.Tsukishima',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '月島', 'ja': '月島', 'en': 'Tsukishima' },
        type: 'station',
        location: 'POINT(139.7846 35.6645)',
        geohash: 'xn76u',
        is_hub: false,
        zone: 'core',
        source_dataset: 'odpt_seed',
        vibe: 'monja'
    },
    {
        id: 'odpt:Station:Toei.Tsukijishijo',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '築地市場', 'ja': '築地市場', 'en': 'Tsukijishijo' },
        type: 'station',
        location: 'POINT(139.7671 35.6649)',
        geohash: 'xn76u',
        is_hub: false,
        zone: 'core',
        source_dataset: 'odpt_seed',
        vibe: 'market_history'
    },
    // NOTE: Toei.BakuroYokoyama merged into Toei.HigashiNihombashi - co-located stations (<100m)
    {
        id: 'odpt:Station:Toei.Hamacho',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '濱町', 'ja': '浜町', 'en': 'Hamacho' },
        type: 'station',
        location: 'POINT(139.7891 35.6882)',
        geohash: 'xn76u',
        is_hub: false,
        zone: 'core',
        source_dataset: 'odpt_seed',
        vibe: 'residential_park'
    },
    // Chiyoda Ward - Toei Subway
    {
        id: 'odpt:Station:Toei.Jimbocho',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '神保町', 'ja': '神保町', 'en': 'Jimbocho' },
        type: 'station',
        location: 'POINT(139.7577 35.6959)',
        geohash: 'xn77h',
        is_hub: true,
        zone: 'core',
        source_dataset: 'odpt_seed',
        vibe: 'books'
    },
    {
        id: 'odpt:Station:Toei.Ogawamachi',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '小川町', 'ja': '小川町', 'en': 'Ogawamachi' },
        type: 'station',
        location: 'POINT(139.7667 35.6951)',
        geohash: 'xn77h',
        is_hub: false,
        zone: 'core',
        source_dataset: 'odpt_seed',
        vibe: 'sports'
    },
    {
        id: 'odpt:Station:Toei.Kudanshita',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '九段下', 'ja': '九段下', 'en': 'Kudanshita' },
        type: 'station',
        location: 'POINT(139.7514 35.6954)',
        geohash: 'xn77h',
        is_hub: true,
        zone: 'core',
        source_dataset: 'odpt_seed',
        vibe: 'budokan'
    },
    {
        id: 'odpt:Station:Toei.Iwamotocho',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '岩本町', 'ja': '岩本町', 'en': 'Iwamotocho' },
        type: 'station',
        location: 'POINT(139.7759 35.6955)',
        geohash: 'xn77k',
        is_hub: false,
        zone: 'core',
        source_dataset: 'odpt_seed',
        vibe: 'akiba_neighbor'
    },
    {
        id: 'odpt:Station:Toei.Hibiya',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '日比谷', 'ja': '日比谷', 'en': 'Hibiya' },
        type: 'station',
        location: 'POINT(139.7593 35.6762)',
        geohash: 'xn76u',
        is_hub: true,
        zone: 'core',
        source_dataset: 'odpt_seed',
        vibe: 'theater'
    },
    {
        id: 'odpt:Station:Toei.Uchisaiwaicho',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '內幸町', 'ja': '内幸町', 'en': 'Uchisaiwaicho' },
        type: 'station',
        location: 'POINT(139.7555 35.6694)',
        geohash: 'xn76u',
        is_hub: false,
        zone: 'core',
        source_dataset: 'odpt_seed',
        vibe: 'business'
    },
    {
        id: 'odpt:Station:Toei.Ichigaya',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '市谷', 'ja': '市ヶ谷', 'en': 'Ichigaya' },
        type: 'station',
        location: 'POINT(139.7377 35.6871)',
        geohash: 'xn77h',
        is_hub: true,
        zone: 'core',
        source_dataset: 'odpt_seed',
        vibe: 'moat'
    },
    // --- Nakano Ward ---
    {
        id: 'odpt:Station:JR-East.Nakano',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '中野', 'ja': '中野', 'en': 'Nakano' },
        type: 'station',
        location: 'POINT(139.6658 35.7058)',
        geohash: 'xn77h',
        is_hub: true,
        zone: 'core',
        source_dataset: 'odpt_seed',
        vibe: 'subculture',
        address: { 'ja': '東京都中野区中野五丁目31-1', 'zh-TW': '東京都中野區中野五丁目31-1', 'en': '5-31-1 Nakano, Nakano-ku, Tokyo' },
        facilityTags: [
            { mainCategory: 'shopping', subCategory: 'specialty', name: 'Nakano Broadway', distanceMeters: 200, direction: 'North Exit', note: 'Otaku Culture' },
            { mainCategory: 'dining', subCategory: 'bar', name: 'Nakano Sun Mall', distanceMeters: 50, direction: 'North Exit' }
        ]
    },
    {
        id: 'odpt:Station:TokyoMetro.Nakano',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '中野', 'ja': '中野', 'en': 'Nakano' },
        type: 'station',
        location: 'POINT(139.6658 35.7058)',
        geohash: 'xn77h',
        is_hub: false,
        parent_hub_id: 'odpt:Station:JR-East.Nakano',
        zone: 'core',
        source_dataset: 'odpt_seed',
        vibe: 'subculture'
    },

    // --- Nerima Ward ---
    {
        id: 'odpt:Station:Seibu.Nerima',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '練馬', 'ja': '練馬', 'en': 'Nerima' },
        type: 'station',
        location: 'POINT(139.6517 35.7373)',
        geohash: 'xn77k',
        is_hub: true,
        zone: 'core',
        source_dataset: 'odpt_seed',
        vibe: 'residential',
        address: { 'ja': '東京都練馬区練馬一丁目3-5', 'zh-TW': '東京都練馬區練馬一丁目3-5', 'en': '1-3-5 Nerima, Nerima-ku, Tokyo' },
        facilityTags: [
            { mainCategory: 'leisure', subCategory: 'culture', detailCategory: 'hall', name: 'Nerima Culture Center', distanceMeters: 100, direction: 'North Exit' },
            { mainCategory: 'leisure', subCategory: 'nature', detailCategory: 'park', name: 'Heisei Tsutsuji Park', distanceMeters: 150, direction: 'North Exit' }
        ]
    },
    {
        id: 'odpt:Station:Toei.Nerima',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '練馬', 'ja': '練馬', 'en': 'Nerima' },
        type: 'station',
        location: 'POINT(139.6517 35.7373)',
        geohash: 'xn77k',
        is_hub: false,
        parent_hub_id: 'odpt:Station:Seibu.Nerima',
        zone: 'core',
        source_dataset: 'odpt_seed',
        vibe: 'residential'
    },

    // --- Kita Ward ---
    {
        id: 'odpt:Station:JR-East.Oji',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '王子', 'ja': '王子', 'en': 'Oji' },
        type: 'station',
        location: 'POINT(139.7370 35.7553)',
        geohash: 'xn77s',
        is_hub: true,
        zone: 'core',
        source_dataset: 'odpt_seed',
        vibe: 'nature',
        address: { 'ja': '東京都北区王子一丁目3-1', 'zh-TW': '東京都北區王子一丁目3-1', 'en': '1-3-1 Oji, Kita-ku, Tokyo' },
        facilityTags: [
            { mainCategory: 'leisure', subCategory: 'nature', detailCategory: 'park', name: 'Asukayama Park', distanceMeters: 100, direction: 'Central Exit', note: 'Cherry Blossoms' },
            { mainCategory: 'leisure', subCategory: 'culture', detailCategory: 'museum', name: 'Paper Museum', distanceMeters: 300, direction: 'South Exit' }
        ]
    },
    {
        id: 'odpt:Station:TokyoMetro.Oji',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '王子', 'ja': '王子', 'en': 'Oji' },
        type: 'station',
        location: 'POINT(139.7370 35.7553)',
        geohash: 'xn77s',
        is_hub: false,
        parent_hub_id: 'odpt:Station:JR-East.Oji',
        zone: 'core',
        source_dataset: 'odpt_seed',
        vibe: 'nature'
    },

    // --- JR Hub: Shinagawa ---
    {
        id: 'odpt:Station:JR-East.Shinagawa',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '品川', 'ja': '品川', 'en': 'Shinagawa' },
        type: 'station',
        location: 'POINT(139.7387 35.6284)',
        geohash: 'xn76g',
        is_hub: true,
        zone: 'core',
        source_dataset: 'odpt_seed',
        vibe: 'gateway',
        address: { 'ja': '東京都港区高輪三丁目26-27', 'zh-TW': '東京都港區高輪三丁目26-27', 'en': '3-26-27 Takanawa, Minato-ku, Tokyo' },
        facilityTags: [
            { mainCategory: 'transport', subCategory: 'railway', name: 'Shinkansen Gates', distanceMeters: 50, direction: 'Central', note: 'Bullet Train' },
            { mainCategory: 'dining', subCategory: 'restaurant', name: 'Shinatatsu Ramen Street', distanceMeters: 200, direction: 'Takanawa Exit', note: 'Ramen' },
            { mainCategory: 'accommodation', subCategory: 'hotel', name: 'Shinagawa Prince Hotel', distanceMeters: 100, direction: 'Takanawa Exit', note: 'Major Hotel' }
        ]
    },

    // --- JR Hub: Akabane (Kita Ward) ---
    {
        id: 'odpt:Station:JR-East.Akabane',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '赤羽', 'ja': '赤羽', 'en': 'Akabane' },
        type: 'station',
        location: 'POINT(139.7208 35.7776)',
        geohash: 'xn77k', // Approx
        is_hub: true,
        zone: 'core',
        source_dataset: 'odpt_seed',
        vibe: 'izakaya',
        address: { 'ja': '東京都北区赤羽一丁目1-1', 'zh-TW': '東京都北區赤羽一丁目1-1', 'en': '1-1-1 Akabane, Kita-ku, Tokyo' },
        facilityTags: [
            { mainCategory: 'dining', subCategory: 'izakaya', name: 'OK Yokocho', distanceMeters: 100, direction: 'East Exit', note: 'Drinking Alley' },
            { mainCategory: 'dining', subCategory: 'izakaya', name: 'Ichibangai', distanceMeters: 50, direction: 'East Exit', note: 'Morning Drinking' }
        ]
    },

    // --- JR Yamanote South: Osaki, Gotanda, Meguro ---
    {
        id: 'odpt:Station:JR-East.Osaki',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '大崎', 'ja': '大崎', 'en': 'Osaki' },
        type: 'station',
        location: 'POINT(139.7285 35.6197)',
        geohash: 'xn76g',
        is_hub: true,
        zone: 'core',
        source_dataset: 'odpt_seed',
        vibe: 'business_tech',
        address: { 'ja': '東京都品川区大崎一丁目21-4', 'zh-TW': '東京都品川區大崎一丁目21-4', 'en': '1-21-4 Osaki, Shinagawa-ku, Tokyo' },
        facilityTags: [
            { mainCategory: 'service', subCategory: 'office', name: 'Gate City Osaki', distanceMeters: 100, direction: 'East Exit' },
            { mainCategory: 'service', subCategory: 'office', name: 'ThinkPark Tower', distanceMeters: 100, direction: 'West Exit' }
        ]
    },
    {
        id: 'odpt:Station:JR-East.Gotanda',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '五反田', 'ja': '五反田', 'en': 'Gotanda' },
        type: 'station',
        location: 'POINT(139.7237 35.6264)',
        geohash: 'xn76g',
        is_hub: true,
        zone: 'core',
        source_dataset: 'odpt_seed',
        vibe: 'nightlife_business',
        address: { 'ja': '東京都品川区東五反田一丁目26-2', 'zh-TW': '東京都品川區東五反田一丁目26-2', 'en': '1-26-2 Higashi-Gotanda, Shinagawa-ku, Tokyo' },
        facilityTags: [
            { mainCategory: 'dining', subCategory: 'restaurant', name: 'Gotanda Hills', distanceMeters: 200, direction: 'West Exit', note: 'Standing Bars' }
        ]
    },
    {
        id: 'odpt:Station:JR-East.Meguro',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '目黑', 'ja': '目黒', 'en': 'Meguro' },
        type: 'station',
        location: 'POINT(139.7157 35.6339)',
        geohash: 'xn76g',
        is_hub: true,
        zone: 'core',
        source_dataset: 'odpt_seed',
        vibe: 'fashion',
        address: { 'ja': '東京都品川区上大崎二丁目16-9', 'zh-TW': '東京都品川區上大崎二丁目16-9', 'en': '2-16-9 Kami-Osaki, Shinagawa-ku, Tokyo' },
        facilityTags: [
            { mainCategory: 'leisure', subCategory: 'nature', detailCategory: 'park', name: 'Meguro River', distanceMeters: 400, direction: 'West Exit', note: 'Cherry Blossoms' },
            { mainCategory: 'leisure', subCategory: 'culture', detailCategory: 'museum', name: 'Meguro Parasitological Museum', distanceMeters: 800, direction: 'West Exit', note: 'Unique' }
        ]
    }
];

export async function seedNodes() {
    console.log('Seeding Nodes (v3.0)...');

    for (const rawNode of SEED_NODES) {
        // Transform legacy data to v3.0 schema
        const node: any = {
            id: rawNode.id,
            city_id: rawNode.city_id,
            name: rawNode.name,
            node_type: rawNode.type,
            coordinates: rawNode.location,
            is_active: true,
            // IMPORTANT: Preserve is_hub and parent_hub_id from rawNode definition
            // If not defined in rawNode, default to standalone station (is_hub = false, parent_hub_id = null)
            is_hub: rawNode.is_hub === true,
            parent_hub_id: rawNode.parent_hub_id || null,
            // Derive transit_lines from STATION_LINES constant (line names for display and fallback)
            transit_lines: (STATION_LINES[rawNode.id] || []).map(line => line.name.en),
            updated_at: new Date().toISOString()
        };

        // L4 Demonstrate: Hub specific content
        if (node.id === 'odpt:Station:TokyoMetro.Ueno') {
            node.persona_prompt = "你是一位上野站的資深嚮導。你對文化、藝術與平民美食瞭如指掌。說話語氣溫柔但專業，喜歡用『文化氣息』等詞彙。";
            node.commercial_rules = [
                {
                    id: "ueno_taxi_push",
                    trigger: { condition: "delay", threshold: 10 },
                    action: { type: "taxi", provider: "go_taxi", label: "搭乘 GO 計程車", url: "https://go.mo-t.com/", priority: 10 }
                }
            ];
        } else if (node.id === 'odpt:Station:JR-East.Akihabara') {
            node.persona_prompt = "你是秋葉原電器街的熱血嚮導。你對電子產品、動漫文化充滿熱情。說話語氣充滿元氣，會使用一些次文化術語。";
        }

        // Map vibe to multi-lingual vibe_tags if available
        if ('vibe' in rawNode && rawNode.vibe) {
            const translated = Translator.vibe(rawNode.vibe);
            node.vibe_tags = {
                'zh-TW': [translated['zh-TW']],
                'ja': [translated.ja],
                'en': [translated.en]
            };
        }

        const { error } = await supabaseAdmin
            .from('nodes')
            .upsert(node);

        if (error) {
            console.error(`Error seeding node ${node.id}:`, error);
        } else {
            console.log(`Seeded node ${node.id} (is_hub=${node.is_hub}, parent=${node.parent_hub_id})`);
        }
    }
}
