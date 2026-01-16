import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HybridEngine } from './HybridEngine';

test('HybridEngine reads L2 disruption and returns alternative actions', async () => {
    const engine = new HybridEngine();

    const l2Status = {
        status_code: 'SUSPENDED',
        has_issues: true,
        cause: '変電所の電気設備故障',
        affected_lines: ['JR Yamanote'],
        delay_minutes: 0,
        line_status: [
            {
                line: 'JR Yamanote',
                operator: 'JR-East',
                status: 'suspended',
                status_detail: 'halt',
                delay_minutes: null,
                message: '変電所の電気設備故障'
            }
        ]
    };

    const res = await engine.processRequest({
        text: 'How can I get from odpt.Station:TokyoMetro.Ginza.Ueno to odpt.Station:TokyoMetro.Ginza.Ginza now? I am in a hurry.',
        locale: 'en',
        context: {
            currentStation: 'odpt.Station:TokyoMetro.Ginza.Ueno',
            strategyContext: {
                nodeName: 'Ueno Station',
                l2Status
            } as any
        }
    });

    assert.ok(res);
    assert.equal(res.source, 'l2_disruption');
    assert.equal(res.type, 'action');
    assert.ok(res.content.includes('Substation equipment failure'));
    assert.ok(res.content.includes('Rough ETA:'));

    const actions = Array.isArray(res.data?.actions) ? res.data.actions : [];
    assert.equal(actions.length, 3);

    const primary = actions[0];
    assert.equal(primary?.type, 'discovery');
    assert.ok(typeof primary?.target === 'string' && primary.target.includes('google.com/maps/dir/?api=1'));
    assert.ok(primary.target.includes('travelmode=transit'));

    const taxi = actions.find((a: any) => a?.type === 'taxi');
    assert.ok(taxi);
    assert.ok(typeof taxi.target === 'string' && taxi.target.includes('google.com/maps/dir/?api=1'));
    assert.ok(taxi.target.includes('travelmode=driving'));
    assert.ok(typeof taxi.label === 'string' && taxi.label.includes('min'));

    const bike = actions.find((a: any) => a?.type === 'bike');
    assert.ok(bike);
    assert.ok(typeof bike.target === 'string' && bike.target.includes('google.com/maps/dir/?api=1'));
    assert.ok(bike.target.includes('travelmode=bicycling'));
});

test('HybridEngine L2 disruption uses luggage storage as secondary action', async () => {
    const engine = new HybridEngine();

    const l2Status = {
        status_code: 'SUSPENDED',
        has_issues: true,
        cause: '信号トラブル',
        affected_lines: ['JR Chuo'],
        delay_minutes: 22,
        line_status: [
            {
                line: 'JR Chuo',
                operator: 'JR-East',
                status: 'suspended',
                status_detail: 'halt',
                delay_minutes: 22,
                message: '信号トラブル'
            }
        ]
    };

    const res = await engine.processRequest({
        text: 'I have 2 suitcases. How can I get from odpt.Station:TokyoMetro.Ginza.Ueno to odpt.Station:TokyoMetro.Ginza.Ginza now?',
        locale: 'en',
        context: {
            currentStation: 'odpt.Station:TokyoMetro.Ginza.Ueno',
            strategyContext: {
                nodeName: 'Ueno Station',
                l2Status
            } as any
        }
    });

    assert.ok(res);
    assert.equal(res.source, 'l2_disruption');
    assert.equal(res.type, 'action');

    const actions = Array.isArray(res.data?.actions) ? res.data.actions : [];
    assert.equal(actions.length, 3);
    assert.ok(actions.some((a: any) => a?.metadata?.partner_id === 'ecbo_cloak'));
});

test('HybridEngine L2 disruption includes accessibility and last train guidance', async () => {
    const engine = new HybridEngine();

    const l2Status = {
        status_code: 'SUSPENDED',
        has_issues: true,
        cause: '運転を見合わせ',
        affected_lines: ['JR Yamanote'],
        delay_minutes: 0
    };

    const res = await engine.processRequest({
        text: 'Wheelchair user, last train soon. How can I get from odpt.Station:TokyoMetro.Ginza.Ueno to odpt.Station:TokyoMetro.Ginza.Ginza?',
        locale: 'en',
        context: {
            currentStation: 'odpt.Station:TokyoMetro.Ginza.Ueno',
            strategyContext: {
                nodeName: 'Ueno Station',
                l2Status
            } as any
        }
    });

    assert.ok(res);
    assert.equal(res.source, 'l2_disruption');
    assert.equal(res.type, 'action');
    assert.ok(res.content.includes('Accessibility:'));
    assert.ok(res.content.includes('last train'));
});
