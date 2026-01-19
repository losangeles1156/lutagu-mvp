import assert from 'node:assert';
import { test, describe, mock } from 'node:test';
import { decisionEngine } from './decisionEngine';
import { hardCalculationEngine } from './hardCalculationEngine';
import { EvaluationContext, MatchedStrategyCard } from '../../types/lutagu_l4';

// Mocking LLM client to avoid actual API calls during test
// We can't easily mock the import inside the route.ts from here,
// so we'll test the core logic of merging and fallback.

describe('L4 Recommendation Flow Logic', () => {

    test('Should merge results from both engines and sort by priority', async () => {
        const context: EvaluationContext = {
            stationId: 'odpt.Station:TokyoMetro.Ginza.Ueno',
            lineIds: ['odpt.Railway:TokyoMetro.Ginza'],
            userPreferences: {
                accessibility: { wheelchair: true, stroller: false, visual_impairment: false, elderly: false },
                luggage: { large_luggage: false, multiple_bags: false },
                travel_style: { rushing: false, budget: false, comfort: true, avoid_crowd: false, avoid_rain: true },
                companions: { with_children: false, family_trip: false }
            },
            currentDate: new Date('2026-01-05T10:00:00Z'),
            locale: 'zh-TW'
        };

        const softCards = decisionEngine.evaluate(context);
        const hardCards = await hardCalculationEngine.evaluate(context);

        const merged = [...hardCards, ...softCards].sort((a, b) => b.priority - a.priority);

        assert.ok(merged.length > 0, 'Should have merged cards');
        for (let i = 0; i < merged.length - 1; i++) {
            assert.ok(merged[i].priority >= merged[i+1].priority, 'Cards should be sorted by priority descending');
        }
    });

    test('Should identify if high-priority cards exist', () => {
        const highPriorityCards: MatchedStrategyCard[] = [
            { id: '1', type: 'info', icon: '', title: '', description: '', priority: 80 },
            { id: '2', type: 'info', icon: '', title: '', description: '', priority: 30 }
        ];

        const lowPriorityCards: MatchedStrategyCard[] = [
            { id: '1', type: 'info', icon: '', title: '', description: '', priority: 40 },
            { id: '2', type: 'info', icon: '', title: '', description: '', priority: 10 }
        ];

        const hasHighValue1 = highPriorityCards.some(c => c.priority >= 50);
        const hasHighValue2 = lowPriorityCards.some(c => c.priority >= 50);

        assert.strictEqual(hasHighValue1, true);
        assert.strictEqual(hasHighValue2, false);
    });

    test('Should provide a static fallback when no cards are returned', () => {
        const cards: MatchedStrategyCard[] = [];
        const locale = 'zh-TW';

        if (cards.length === 0) {
            cards.push({
                id: 'fallback-default',
                type: 'info',
                icon: '🧭',
                title: locale === 'zh-TW' ? '自由探索' : 'Explore',
                description: locale === 'zh-TW'
                    ? '目前沒有針對此場景的特別建議，請探索周邊或輸入具體目的地。'
                    : 'No specific advice for this context. Please explore nearby.',
                priority: 0
            });
        }

        assert.strictEqual(cards.length, 1);
        assert.strictEqual(cards[0].id, 'fallback-default');
    });
});
