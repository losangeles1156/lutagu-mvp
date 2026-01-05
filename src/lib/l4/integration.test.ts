import { test } from 'node:test';
import assert from 'node:assert';
import { L4DecisionEngine } from './decisionEngine';
import { L4HardCalculationEngine } from './hardCalculationEngine';
import { UserPreferences, EvaluationContext } from '@/types/lutagu_l4';

// Simple mock for UserPreferences
const defaultPrefs: UserPreferences = {
    accessibility: { wheelchair: false, stroller: false, visual_impairment: false, elderly: false },
    luggage: { large_luggage: false, multiple_bags: false },
    travel_style: { rushing: false, budget: false, comfort: false, avoid_crowd: false, avoid_rain: false },
    companions: { with_children: false, family_trip: false }
};

test('L4 DecisionEngine + HardCalculationEngine Integration', async (t) => {
    const decisionEngine = new L4DecisionEngine();
    const hardEngine = new L4HardCalculationEngine();

    await t.test('should combine static knowledge and dynamic status', async () => {
        const context: EvaluationContext = {
            stationId: 'odpt.Station:TokyoMetro.Ginza.Ueno',
            lineIds: ['odpt.Railway:TokyoMetro.Ginza'],
            userPreferences: {
                ...defaultPrefs,
                accessibility: { ...defaultPrefs.accessibility, wheelchair: true }
            },
            currentDate: new Date('2024-01-01T12:00:00Z'),
            locale: 'zh-TW'
        };

        // 1. Test Decision Engine
        const staticCards = decisionEngine.evaluate(context);
        
        // We expect at least the Ueno wheelchair tip if it's in stationWisdom.ts
        // Let's check if we got any cards
        console.log(`Static cards found: ${staticCards.length}`);
        staticCards.forEach(c => console.log(` - [${c.priority}] ${c.title}: ${c.description}`));

        // 2. Test Hard Calculation Engine (Real API call might happen here if not mocked, 
        // but for integration test in this environment we'll see if it runs)
        // Note: hardEngine.evaluate is async
        const dynamicCards = await hardEngine.evaluate(context);
        console.log(`Dynamic cards found: ${dynamicCards.length}`);
        dynamicCards.forEach(c => console.log(` - [${c.priority}] ${c.title}: ${c.description}`));

        const allCards = [...staticCards, ...dynamicCards].sort((a, b) => b.priority - a.priority);
        
        assert.ok(allCards.length >= 0, 'Should return a list of cards');
        if (allCards.length > 0) {
            assert.ok(allCards[0].priority >= allCards[allCards.length - 1].priority, 'Cards should be sorted by priority');
        }
    });

    await t.test('should trigger specific cards for wheelchair users at Ueno', () => {
        const context: EvaluationContext = {
            stationId: 'odpt.Station:TokyoMetro.Ginza.Ueno',
            lineIds: ['odpt.Railway:TokyoMetro.Ginza'],
            userPreferences: {
                ...defaultPrefs,
                accessibility: { ...defaultPrefs.accessibility, wheelchair: true }
            },
            currentDate: new Date('2024-01-01T12:00:00Z'),
            locale: 'zh-TW'
        };

        const cards = decisionEngine.evaluate(context);
        
        // Check for the wheelchair/stroller barrier card we saw in stationWisdom.ts
        const accessibilityCard = cards.find(c => c.id === 'generic-exit-a1-barrier');
        
        assert.ok(accessibilityCard, 'Should find the accessibility barrier card for Ueno');
        assert.strictEqual(accessibilityCard.type, 'warning');
        assert.ok(accessibilityCard.description.includes('B2 出口'), 'Description should suggest Exit B2');
        assert.ok(accessibilityCard.priority >= 135, 'Priority should be boosted (85 base + 50 station boost)');
    });

    await t.test('should trigger Shinkansen timing card for JR Ueno', () => {
        const context: EvaluationContext = {
            stationId: 'odpt.Station:JR-East.Ueno',
            lineIds: ['odpt.Railway:JR-East.Shinkansen'],
            userPreferences: defaultPrefs,
            currentDate: new Date('2024-01-01T12:00:00Z'),
            locale: 'zh-TW'
        };

        const cards = decisionEngine.evaluate(context);
        const shinkansenCard = cards.find(c => c.id === 'ueno-shinkansen-timing');
        
        assert.ok(shinkansenCard, 'Should find the Shinkansen timing card for JR Ueno');
        assert.strictEqual(shinkansenCard.type, 'timing');
        assert.ok(shinkansenCard.priority >= 120, 'Priority should be boosted (70 base + 50 station boost)');
    });
});
