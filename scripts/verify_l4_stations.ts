
import { hybridEngine } from '../src/lib/l4/HybridEngine';
import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const targetStations = [
    { name: '上野站', id: 'odpt:Station:JR-East.Ueno' },
    { name: '淺草站', id: 'odpt:Station:TokyoMetro.Asakusa' },
    { name: '東京站', id: 'odpt:Station:JR-East.Tokyo' },
    { name: '秋葉原', id: 'odpt:Station:JR-East.Akihabara' },
    { name: '新宿站', id: 'odpt:Station:JR-East.Shinjuku' },
    { name: '澀谷站', id: 'odpt:Station:JR-East.Shibuya' },
    { name: '惠比壽站', id: 'odpt:Station:JR-East.Ebisu' },
    { name: '中野站', id: 'odpt:Station:JR-East.Nakano' },
    { name: '池袋站', id: 'odpt:Station:JR-East.Ikebukuro' },
    { name: '目黑站', id: 'odpt:Station:JR-East.Meguro' },
    { name: '飯田橋站', id: 'odpt:Station:JR-East.Iidabashi' },
    { name: '羽田機場第1・第2航廈', id: 'odpt.Station:Keikyu.Airport.HanedaAirportTerminal1And2' },
    { name: '羽田機場第3航廈', id: 'odpt.Station:Keikyu.Airport.HanedaAirportTerminal3' },
    { name: '成田機場第1航廈', id: 'odpt:Station:JR-East.NaritaAirportTerminal1' },
    { name: '成田機場第2・第3航廈', id: 'odpt:Station:JR-East.NaritaAirportTerminal23' },
    { name: '日本橋站', id: 'odpt:Station:TokyoMetro.Nihonbashi' },
    { name: '濱松町', id: 'odpt:Station:JR-East.Hamamatsucho' },
    { name: '飯田橋站', id: 'odpt:Station:TokyoMetro.Iidabashi' },
    { name: '御茶之水站', id: 'odpt:Station:JR-East.Ochanomizu' }
];

async function verifyStationL4(stationName: string, stationId: string) {
    console.log(`\n--- 🔍 Checking station: ${stationName} (${stationId}) ---`);
    const query = `${stationName} 有什麼轉乘建議或密技？`;

    const response = await hybridEngine.processRequest({
        text: query,
        locale: 'zh-TW',
        context: {
            currentStation: stationId
        }
    });

    if (response && response.source === 'knowledge') {
        console.log('✅ L4 Knowledge Found!');
        console.log('--- Synthesized Response ---');
        console.log(response.content);
        return true;
    } else {
        console.log(`❌ No L4 Knowledge found. Source: ${response?.source || 'none'}`);
        return false;
    }
}

async function run() {
    let successCount = 0;
    for (const station of targetStations) {
        const success = await verifyStationL4(station.name, station.id);
        if (success) successCount++;
    }
    console.log(`\nVerification Summary: ${successCount}/${targetStations.length} stations found L4 knowledge.`);
}

run();
