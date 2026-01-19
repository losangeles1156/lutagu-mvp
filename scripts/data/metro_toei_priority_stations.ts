/**
 * Tokyo Metro / Toei Independent Stations
 * These stations are NOT co-located with JR East
 *
 * Priority: 30 core stations for Phase 3
 * Format compatible with station_registry.ts
 */

import { TargetStation } from '../l1_pipeline/station_registry';

// JR Co-located stations (should use JR node):
// 御徒町, 両国, 目黒, 駒込, 大塚, 目白, 八丁堀

// Priority 30 Independent Tokyo Metro / Toei Stations
export const METRO_TOEI_PRIORITY_STATIONS: TargetStation[] = [
    // === HIGH PRIORITY: Tourism Hotspots ===
    { id: 'odpt.Station:TokyoMetro.Ginza.Omotesando', name: { ja: '表参道', en: 'Omote-sando' }, ward: 'Minato', location: { lat: 35.6654, lng: 139.7122 }, wikiTitle: '表参道駅' },
    { id: 'odpt.Station:TokyoMetro.Hanzomon.Kiyosumi-shirakawa', name: { ja: '清澄白河', en: 'Kiyosumi-shirakawa' }, ward: 'Koto', location: { lat: 35.6810, lng: 139.8014 }, wikiTitle: '清澄白河駅' },
    { id: 'odpt.Station:Toei.Oedo.Kuramae', name: { ja: '蔵前', en: 'Kuramae' }, ward: 'Taito', location: { lat: 35.7010, lng: 139.7866 }, wikiTitle: '蔵前駅' },
    { id: 'odpt.Station:TokyoMetro.Hibiya.Tsukiji', name: { ja: '築地', en: 'Tsukiji' }, ward: 'Chuo', location: { lat: 35.6673, lng: 139.7726 }, wikiTitle: '築地駅' },
    { id: 'odpt.Station:TokyoMetro.Hanzomon.Ningyocho', name: { ja: '人形町', en: 'Ningyocho' }, ward: 'Chuo', location: { lat: 35.6851, lng: 139.7828 }, wikiTitle: '人形町駅' },
    { id: 'odpt.Station:Toei.Oedo.Azabu-juban', name: { ja: '麻布十番', en: 'Azabu-juban' }, ward: 'Minato', location: { lat: 35.6554, lng: 139.7369 }, wikiTitle: '麻布十番駅' },
    { id: 'odpt.Station:TokyoMetro.Chiyoda.Nogizaka', name: { ja: '乃木坂', en: 'Nogizaka' }, ward: 'Minato', location: { lat: 35.6662, lng: 139.7271 }, wikiTitle: '乃木坂駅' },
    { id: 'odpt.Station:TokyoMetro.Hibiya.Hiroo', name: { ja: '広尾', en: 'Hiroo' }, ward: 'Shibuya', location: { lat: 35.6514, lng: 139.7223 }, wikiTitle: '広尾駅' },

    // === HIGH PRIORITY: Business Districts ===
    { id: 'odpt.Station:TokyoMetro.Hibiya.Hibiya', name: { ja: '日比谷', en: 'Hibiya' }, ward: 'Chiyoda', location: { lat: 35.6745, lng: 139.7600 }, wikiTitle: '日比谷駅' },
    { id: 'odpt.Station:TokyoMetro.Ginza.Toranomon', name: { ja: '虎ノ門', en: 'Toranomon' }, ward: 'Minato', location: { lat: 35.6698, lng: 139.7495 }, wikiTitle: '虎ノ門駅' },
    { id: 'odpt.Station:TokyoMetro.Hibiya.Kamiyacho', name: { ja: '神谷町', en: 'Kamiyacho' }, ward: 'Minato', location: { lat: 35.6630, lng: 139.7448 }, wikiTitle: '神谷町駅' },
    { id: 'odpt.Station:Toei.Mita.Daimon', name: { ja: '大門', en: 'Daimon' }, ward: 'Minato', location: { lat: 35.6558, lng: 139.7548 }, wikiTitle: '大門駅' },
    { id: 'odpt.Station:TokyoMetro.Hanzomon.Hanzomon', name: { ja: '半蔵門', en: 'Hanzomon' }, ward: 'Chiyoda', location: { lat: 35.6854, lng: 139.7428 }, wikiTitle: '半蔵門駅' },
    { id: 'odpt.Station:TokyoMetro.Hanzomon.Kudanshita', name: { ja: '九段下', en: 'Kudanshita' }, ward: 'Chiyoda', location: { lat: 35.6955, lng: 139.7508 }, wikiTitle: '九段下駅' },
    { id: 'odpt.Station:TokyoMetro.Namboku.Nagatacho', name: { ja: '永田町', en: 'Nagatacho' }, ward: 'Chiyoda', location: { lat: 35.6781, lng: 139.7411 }, wikiTitle: '永田町駅' },
    { id: 'odpt.Station:TokyoMetro.Marunouchi.Kokkaigijidomae', name: { ja: '国会議事堂前', en: 'Kokkai-gijidomae' }, ward: 'Chiyoda', location: { lat: 35.6736, lng: 139.7448 }, wikiTitle: '国会議事堂前駅' },

    // === MEDIUM PRIORITY: Shinjuku Area ===
    { id: 'odpt.Station:TokyoMetro.Fukutoshin.Shinjuku-sanchome', name: { ja: '新宿三丁目', en: 'Shinjuku-sanchome' }, ward: 'Shinjuku', location: { lat: 35.6916, lng: 139.7044 }, wikiTitle: '新宿三丁目駅' },
    { id: 'odpt.Station:Toei.Oedo.Tochomae', name: { ja: '都庁前', en: 'Tochomae' }, ward: 'Shinjuku', location: { lat: 35.6908, lng: 139.6912 }, wikiTitle: '都庁前駅' },
    { id: 'odpt.Station:Toei.Oedo.Higashi-shinjuku', name: { ja: '東新宿', en: 'Higashi-shinjuku' }, ward: 'Shinjuku', location: { lat: 35.6975, lng: 139.7092 }, wikiTitle: '東新宿駅' },

    // === MEDIUM PRIORITY: Minato Area ===
    { id: 'odpt.Station:TokyoMetro.Ginza.Aoyama-itchome', name: { ja: '青山一丁目', en: 'Aoyama-itchome' }, ward: 'Minato', location: { lat: 35.6726, lng: 139.7240 }, wikiTitle: '青山一丁目駅' },
    { id: 'odpt.Station:TokyoMetro.Ginza.Gaienmae', name: { ja: '外苑前', en: 'Gaienmae' }, ward: 'Minato', location: { lat: 35.6702, lng: 139.7172 }, wikiTitle: '外苑前駅' },
    { id: 'odpt.Station:TokyoMetro.Namboku.Roppongi-itchome', name: { ja: '六本木一丁目', en: 'Roppongi-itchome' }, ward: 'Minato', location: { lat: 35.6651, lng: 139.7394 }, wikiTitle: '六本木一丁目駅' },
    { id: 'odpt.Station:Toei.Mita.Onarimon', name: { ja: '御成門', en: 'Onarimon' }, ward: 'Minato', location: { lat: 35.6600, lng: 139.7513 }, wikiTitle: '御成門駅' },
    { id: 'odpt.Station:Toei.Mita.Shibakoen', name: { ja: '芝公園', en: 'Shibakoen' }, ward: 'Minato', location: { lat: 35.6566, lng: 139.7477 }, wikiTitle: '芝公園駅' },

    // === MEDIUM PRIORITY: Koto/Sumida Area ===
    { id: 'odpt.Station:TokyoMetro.Tozai.Kiba', name: { ja: '木場', en: 'Kiba' }, ward: 'Koto', location: { lat: 35.6710, lng: 139.8048 }, wikiTitle: '木場駅' },
    { id: 'odpt.Station:TokyoMetro.Tozai.Toyocho', name: { ja: '東陽町', en: 'Toyocho' }, ward: 'Koto', location: { lat: 35.6673, lng: 139.8171 }, wikiTitle: '東陽町駅' },
    { id: 'odpt.Station:Toei.Shinjuku.Morishita', name: { ja: '森下', en: 'Morishita' }, ward: 'Koto', location: { lat: 35.6904, lng: 139.7970 }, wikiTitle: '森下駅' },
    { id: 'odpt.Station:Toei.Oedo.Kachidoki', name: { ja: '勝どき', en: 'Kachidoki' }, ward: 'Chuo', location: { lat: 35.6575, lng: 139.7766 }, wikiTitle: '勝どき駅' },

    // === LOWER PRIORITY: Toshima/Kita Area ===
    { id: 'odpt.Station:TokyoMetro.Yurakucho.Higashi-ikebukuro', name: { ja: '東池袋', en: 'Higashi-ikebukuro' }, ward: 'Toshima', location: { lat: 35.7296, lng: 139.7205 }, wikiTitle: '東池袋駅' },
    { id: 'odpt.Station:TokyoMetro.Namboku.Oji', name: { ja: '王子', en: 'Oji' }, ward: 'Kita', location: { lat: 35.7527, lng: 139.7379 }, wikiTitle: '王子駅' },
];

// Export for use in station_registry.ts
export default METRO_TOEI_PRIORITY_STATIONS;
