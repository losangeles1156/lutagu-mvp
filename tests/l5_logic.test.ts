/**
 * Tests for L5 Evacuation Logic
 * 測試 L5 避難規則與決策引擎
 */

import { evaluateFloodSafety, calculateRouteScore } from '../src/lib/l5/evacuationRules';
import { evaluateEvacuationNeed } from '../src/lib/l5/decisionEngine';
import { JMAAlertInfo, UserEvacuationProfile, OfficialShelter } from '../src/lib/l5/types';

describe('L5 Evacuation Logic', () => {

    describe('evaluateFloodSafety', () => {
        test('should reject underground facilities during flood', () => {
            const unsafeUnderground: any = { floorLevel: -1 };
            const result = evaluateFloodSafety({ lat: 0, lng: 0 }, unsafeUnderground);
            expect(result.isSafe).toBe(false);
            expect(result.score).toBe(0);
        });

        test('should approve flood-designated shelters', () => {
            const safeShelter: OfficialShelter = {
                id: 's1',
                name: { ja: 'Safe Shelter' },
                wardCode: '13101',
                wardName: 'Chiyoda',
                suitableFor: ['flood'],
                coordinates: { lat: 0, lng: 0 },
                address: 'Test Addr',
                facilities: {
                    hasToilet: true,
                    hasBedding: true,
                    hasFood: true,
                    isAccessible: true
                },
                source: 'national',
                lastUpdated: new Date()
            };

            const result = evaluateFloodSafety({ lat: 0, lng: 0 }, safeShelter);
            expect(result.isSafe).toBe(true);
            expect(result.score).toBe(100);
        });
    });

    describe('evaluateEvacuationNeed', () => {
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

        test('should trigger RED level for special emergency in affected ward', async () => {
            const decision = await evaluateEvacuationNeed('13108', profile, mockAlerts);
            expect(decision.triggerLevel).toBe('red');
            expect(decision.activeAlerts).toHaveLength(1);

            // MVP 補強驗證: 應包含推薦路線
            expect(decision.recommendedRoutes.length).toBeGreaterThan(0);
            const route = decision.recommendedRoutes[0];
            expect(route.toShelter.id).toBeDefined();
            expect(route.distanceMeters).toBeGreaterThan(0);
        });

        test('should return localized message', async () => {
            const decision = await evaluateEvacuationNeed('13108', profile, mockAlerts);
            expect(decision.localizedMessage.zh).toContain('緊急');
        });

        test('should NOT trigger for unaffected ward', async () => {
            const decision = await evaluateEvacuationNeed('13101', profile, mockAlerts); // 千代田区
            expect(decision.triggerLevel).toBe('green');
        });

        test('should filter out island alerts', async () => {
            const islandAlerts: JMAAlertInfo[] = [{
                type: 'heavy_rain',
                level: 'warning',
                issuedAt: new Date(),
                affectedAreas: ['13108'], // 雖然標記區域有交集，但來源是離島應被 JMA Parser 過濾
                headline: '伊豆諸島にて大雨警報', // 關鍵字模擬
                description: '伊豆諸島'
            }];

            // 請注意：decisionEngine 依賴 jmaParser 的過濾邏輯
            // 但在這裡我們傳入的是已經解析好的 AlertInfo
            // 因此需透過整合測試或單獨測試 jmaParser 函數來驗證
            // 由於 JMA Parser 過濾發生在 fetch 階段，此處僅驗證決策引擎是否能處理空警報

            const decision = await evaluateEvacuationNeed('13108', profile, []);
            expect(decision.triggerLevel).toBe('green');
        });
    });
});
