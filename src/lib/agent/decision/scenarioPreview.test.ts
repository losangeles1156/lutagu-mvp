import test from 'node:test';
import assert from 'node:assert/strict';
import { buildScenarioPreview } from './scenarioPreview';
import type { IntentProfile } from './types';

const baseIntent: IntentProfile = {
    intent: 'route',
    urgency: 'low',
    constraints: [],
    userStateTags: [],
};

test('scenarioPreview: route intent uses transfers and duration', () => {
    const toolResults = [
        {
            toolName: 'findRoute',
            result: {
                routes: [
                    { totalDuration: 35, transfers: 2 }
                ]
            }
        }
    ];
    const res = buildScenarioPreview({ intent: baseIntent, toolResults, locale: 'zh-TW' });
    assert.match(res.preview, /2/);
    assert.match(res.preview, /35/);
});

test('scenarioPreview: status intent uses status summary', () => {
    const intent: IntentProfile = { ...baseIntent, intent: 'status' };
    const toolResults = [
        { toolName: 'getTransitStatus', result: { status: 'delay' } }
    ];
    const res = buildScenarioPreview({ intent, toolResults, locale: 'en' });
    assert.match(res.preview.toLowerCase(), /delay/);
});

test('scenarioPreview: rush overrides', () => {
    const intent: IntentProfile = { ...baseIntent, userStateTags: ['rush'] };
    const res = buildScenarioPreview({ intent, toolResults: [], locale: 'zh-TW' });
    assert.match(res.preview, /趕時間/);
});
