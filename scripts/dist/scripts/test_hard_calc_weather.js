"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hardCalculationEngine_1 = require("../src/lib/l4/hardCalculationEngine");
// Mock global fetch manually
const originalFetch = global.fetch;
global.fetch = async (input, init) => {
    const url = input.toString();
    if (url.includes('open-meteo')) {
        return {
            ok: true,
            json: async () => ({
                current: { weather_code: 61 } // 61 = Rain
            })
        };
    }
    return { ok: false };
};
async function runTest() {
    console.log('Testing Hard Calculation Engine - Weather Advisory...');
    const context = {
        stationId: 'odpt:Station:JR-East.Tokyo',
        lineIds: [],
        userPreferences: {
            accessibility: { wheelchair: false, stroller: false, visual_impairment: false, elderly: false },
            luggage: { large_luggage: false, multiple_bags: false },
            travel_style: { rushing: false, budget: false, comfort: false, avoid_crowd: false, avoid_rain: false },
            companions: { with_children: false, family_trip: false }
        },
        currentDate: new Date(),
        locale: 'zh-TW'
    };
    const cards = await hardCalculationEngine_1.hardCalculationEngine.evaluate(context);
    // Find weather card
    const weatherCard = cards.find(c => c.id === 'hard-calc-weather-rain');
    if (weatherCard) {
        console.log('✅ Weather Advisory Triggered!');
        console.log('Title:', weatherCard.title);
        console.log('Desc:', weatherCard.description);
    }
    else {
        console.error('❌ Weather Advisory NOT Triggered');
        console.log('Cards found:', cards.map(c => c.id));
    }
}
runTest().catch(console.error);
