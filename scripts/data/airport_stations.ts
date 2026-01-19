/**
 * Airport Stations Data File
 * Phase 4: Keikyu Haneda & Keisei Narita Airport Terminals
 *
 * Note: Airport stations use skipVibes=true for internal terminal facilities
 * because OSM data outside the station is irrelevant (it's an airport).
 */

import { TargetStation } from '../l1_pipeline/station_registry';

// Haneda Airport Terminals (Keikyu + Tokyo Monorail)
export const HANEDA_AIRPORT_STATIONS: TargetStation[] = [
    {
        id: 'odpt.Station:Keikyu.Airport.HanedaAirportTerminal1-2',
        name: { ja: '羽田空港第1・第2ターミナル', en: 'Haneda Airport Terminal 1・2' },
        ward: 'Ota', // 大田区
        location: { lat: 35.5494, lng: 139.7798 },
        wikiTitle: '羽田空港第1・第2ターミナル駅',
        skipVibes: false // L1 data for airport internal facilities
    },
    {
        id: 'odpt.Station:Keikyu.Airport.HanedaAirportTerminal3',
        name: { ja: '羽田空港第3ターミナル', en: 'Haneda Airport Terminal 3 (International)' },
        ward: 'Ota',
        location: { lat: 35.5467, lng: 139.7679 },
        wikiTitle: '羽田空港第3ターミナル駅',
        skipVibes: false
    }
];

// Narita Airport Terminals (Keisei + JR)
export const NARITA_AIRPORT_STATIONS: TargetStation[] = [
    {
        id: 'odpt.Station:Keisei.Main.NaritaAirportTerminal1',
        name: { ja: '成田空港', en: 'Narita Airport Terminal 1' },
        ward: 'Narita', // 成田市 (千葉県)
        location: { lat: 35.7647, lng: 140.3864 },
        wikiTitle: '成田空港駅',
        skipVibes: false
    },
    {
        id: 'odpt.Station:Keisei.Main.Airport-Daini-Building',
        name: { ja: '空港第2ビル', en: 'Narita Airport Terminal 2・3' },
        ward: 'Narita',
        location: { lat: 35.7720, lng: 140.3926 },
        wikiTitle: '空港第2ビル駅',
        skipVibes: false
    }
];

// Combined Airport Stations Export
const AIRPORT_STATIONS: TargetStation[] = [
    ...HANEDA_AIRPORT_STATIONS,
    ...NARITA_AIRPORT_STATIONS
];

export default AIRPORT_STATIONS;
