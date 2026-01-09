/**
 * Test Script for L5 Evacuation Logic
 * 測試 L5 避難規則與決策引擎
 */

import { evaluateFloodSafety, calculateRouteScore } from './src/lib/l5/evacuationRules';
import { evaluateEvacuationNeed } from './src/lib/l5/decisionEngine';
import { JMAAlertInfo, UserEvacuationProfile, EvacuationRoute, OfficialShelter } from './src/lib/l5/types';

async function runTests() {
    console.log('--- Starting L5 Evacuation Logic Tests ---\n');

    // Test 1: Flood Safety Rule
    console.log('[Test 1] Flood Safety Rule');
    const safeShelter: OfficialShelter = {
        id: 's1',
        wardCode: '13101',
        suitableFor: ['flood'],
    } as any;

    const result1 = evaluateFloodSafety({ lat: 0, lng: 0 }, safeShelter);
    console.log('Result 1 (Should be safe):', result1.isSafe, result1.score);

    const unsafeUnderground: any = { floorLevel: -1 };
    const result2 = evaluateFloodSafety({ lat: 0, lng: 0 }, unsafeUnderground);
    console.log('Result 2 (Should be unsafe):', result2.isSafe, result2.score);


    // Test 2: Decision Engine Trigger
    console.log('\n[Test 2] Decision Engine Trigger');

    const mockAlerts: JMAAlertInfo[] = [{
        type: 'heavy_rain',
        level: 'special_emergency',
        issuedAt: new Date(),
        affectedAreas: ['13108'], // 江東区
        headline: 'TEST ALERT',
        description: 'TEST'
    }];

    const profile: UserEvacuationProfile = {
        mobilityLevel: 'full',
        preferredLocale: 'zh-TW',
        canReadJapanese: false,
        priorities: [],
        hasVisualImpairment: false,
        isPregnant: false,
        isElderly: false,
        hasFamilyWithInfant: false,
        hasLargeLuggage: false,
        hasCashAvailable: true,
        batteryLevel: 80
    };

    const decision = await evaluateEvacuationNeed('13108', profile, mockAlerts);
    console.log('Decision Level (Should be RED):', decision.triggerLevel);
    console.log('Localized Message:', decision.localizedMessage.zh);

    console.log('\n--- Tests Completed ---');
}

runTests().catch(console.error);
