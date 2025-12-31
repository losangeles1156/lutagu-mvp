import { hardCalculationEngine } from '../src/lib/l4/hardCalculationEngine';
import { EvaluationContext } from '../src/types/lutagu_l4';
import { odptClient } from '../src/lib/odpt/client';

// Mock global fetch manually for Weather API
global.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = input.toString();
    if (url.includes('open-meteo')) {
        console.log(`[MockFetch] Calling Open-Meteo for: ${url}`);
        return {
            ok: true,
            json: async () => ({
                current: { weather_code: 61 } // 61 = Rain
            })
        } as Response;
    }
    return { ok: false } as Response;
};

// Mock odptClient.getStation
// We need to spy on it or overwrite it
const mockStationData: Record<string, any> = {
    'mainland-st': [{ 'geo:lat': 35.68, 'geo:long': 139.76 }], // Tokyo
    'island-st': [{ 'geo:lat': 33.1, 'geo:long': 139.8 }]    // Hachijojima (Island)
};

odptClient.getStation = async (id: string) => {
    console.log(`[MockODPT] Fetching station: ${id}`);
    return mockStationData[id] || [];
};

async function runTest() {
    console.log('--- Test 1: Mainland Station (should trigger) ---');
    const context1: EvaluationContext = {
        stationId: 'mainland-st',
        lineIds: [],
        userPreferences: {} as any,
        currentDate: new Date(),
        locale: 'zh-TW'
    };
    const cards1 = await hardCalculationEngine.evaluate(context1);
    const rainCard1 = cards1.find(c => c.id === 'hard-calc-weather-rain');
    console.log('Result 1:', rainCard1 ? '✅ Triggered' : '❌ NOT Triggered (FAIL)');

    console.log('\n--- Test 2: Island Station (should SKIP) ---');
    const context2: EvaluationContext = {
        stationId: 'island-st',
        lineIds: [],
        userPreferences: {} as any,
        currentDate: new Date(),
        locale: 'zh-TW'
    };
    const cards2 = await hardCalculationEngine.evaluate(context2);
    const rainCard2 = cards2.find(c => c.id === 'hard-calc-weather-rain');
    console.log('Result 2:', !rainCard2 ? '✅ Skipped (Correct)' : '❌ Triggered (FAIL)');
}

runTest().catch(console.error);
