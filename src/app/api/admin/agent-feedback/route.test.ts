import test from 'node:test';
import assert from 'node:assert/strict';
import { __private__ } from './route';

test('buildTrendSeries aggregates by day', () => {
    const events = [
        { created_at: '2026-02-06T10:00:00Z', helpful: true },
        { created_at: '2026-02-06T11:00:00Z', helpful: false },
        { created_at: '2026-02-07T08:00:00Z', helpful: true },
    ];
    const trend = __private__.buildTrendSeries(events as any, 2);
    assert.equal(trend.length, 2);
    assert.equal(trend[0].total, 2);
    assert.equal(trend[0].positive, 1);
    assert.equal(trend[0].negative, 1);
    assert.equal(trend[1].total, 1);
    assert.equal(trend[1].positive, 1);
});

test('buildWeightAlerts returns alert rows above threshold', () => {
    const weights = [
        { tag: 'route', weight: 0.5 },
        { tag: 'status', weight: 1.4 },
        { tag: 'local_guide', weight: -1.6 },
    ];
    const alerts = __private__.buildWeightAlerts(weights as any, 1.2);
    assert.equal(alerts.length, 2);
    assert.equal(alerts[0].tag, 'local_guide');
    assert.equal(alerts[1].tag, 'status');
});

