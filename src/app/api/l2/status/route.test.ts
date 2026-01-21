import assert from 'node:assert';
import { test } from 'node:test';

import { GET } from './route';

const __private__ = (GET as any).__private__ as {
    extractDelayMinutesFromText: (text: string) => number | null;
    classifyLineStatusFromText: (params: {
        severity?: string;
        statusText?: string;
        messageJa?: string;
        messageEn?: string;
        messageZh?: string;
    }) => { status: 'normal' | 'delay' | 'suspended'; detail: string; delayMinutes: number | null };
    getDisruptionSource: (input: any) => 'odpt' | 'yahoo' | 'snapshot' | 'unknown';
    getDisruptionSourceRank: (source: string) => number;
    normalizeRailwayId: (input: string) => string;
};

test('extractDelayMinutesFromText extracts Japanese delay minutes', () => {
    assert.equal(__private__.extractDelayMinutesFromText('最大 40 分の遅れが出ています'), 40);
    assert.equal(__private__.extractDelayMinutesFromText('遅れ 15分'), 15);
    assert.equal(__private__.extractDelayMinutesFromText('遅延が5分発生'), 5);
});

test('extractDelayMinutesFromText extracts English delay minutes', () => {
    assert.equal(__private__.extractDelayMinutesFromText('Delay of 35 minutes due to power outage'), 35);
    assert.equal(__private__.extractDelayMinutesFromText('Trains delayed by 8 mins'), 8);
});

test('classifyLineStatusFromText classifies canceled/halt/delay buckets', () => {
    {
        const r = __private__.classifyLineStatusFromText({
            statusText: '運行情報',
            messageJa: '本日は一部列車が運休となります',
        });
        assert.equal(r.status, 'suspended');
        assert.equal(r.detail, 'canceled');
        assert.equal(r.delayMinutes, null);
    }

    {
        const r = __private__.classifyLineStatusFromText({
            statusText: '運行情報',
            messageJa: '運転見合わせ',
        });
        assert.equal(r.status, 'suspended');
        assert.equal(r.detail, 'halt');
        assert.equal(r.delayMinutes, null);
    }

    {
        const r = __private__.classifyLineStatusFromText({
            statusText: '運行情報',
            messageJa: '最大 45 分の遅れ',
        });
        assert.equal(r.status, 'delay');
        assert.equal(r.detail, 'delay_major');
        assert.equal(r.delayMinutes, 45);
    }

    {
        const r = __private__.classifyLineStatusFromText({
            statusText: 'Service Update',
            messageEn: 'Delay of 12 minutes',
        });
        assert.equal(r.status, 'delay');
        assert.equal(r.detail, 'delay_minor');
        assert.equal(r.delayMinutes, 12);
    }
});

test('classifyLineStatusFromText returns normal on normal keywords', () => {
    {
        const r = __private__.classifyLineStatusFromText({
            statusText: '平常運転',
            messageJa: '平常通り運転しています',
        });
        assert.equal(r.status, 'normal');
        assert.equal(r.detail, 'normal');
        assert.equal(r.delayMinutes, null);
    }

    {
        const r = __private__.classifyLineStatusFromText({
            statusText: 'Service Update',
            messageEn: 'Operating normally',
        });
        assert.equal(r.status, 'normal');
        assert.equal(r.detail, 'normal');
        assert.equal(r.delayMinutes, null);
    }
});

test('getDisruptionSource classifies by ids and fields', () => {
    assert.equal(__private__.getDisruptionSource({ railway_id: 'odpt.Railway:TokyoMetro.Ginza' }), 'odpt');
    assert.equal(__private__.getDisruptionSource({ '@id': 'synthetic:yahoo:odpt.Railway:JR-East.Yamanote' }), 'yahoo');
    assert.equal(__private__.getDisruptionSource({ secondary_source: 'Yahoo Transit' }), 'yahoo');
    assert.equal(__private__.getDisruptionSource({ source: 'snapshot' }), 'snapshot');
    assert.equal(__private__.getDisruptionSource({}), 'unknown');
});

test('getDisruptionSourceRank prioritizes odpt over yahoo and snapshot', () => {
    assert.ok(__private__.getDisruptionSourceRank('odpt') > __private__.getDisruptionSourceRank('yahoo'));
    assert.ok(__private__.getDisruptionSourceRank('yahoo') > __private__.getDisruptionSourceRank('snapshot'));
    assert.ok(__private__.getDisruptionSourceRank('snapshot') > __private__.getDisruptionSourceRank('unknown'));
});

test('normalizeRailwayId normalizes odpt railway prefix', () => {
    assert.equal(
        __private__.normalizeRailwayId('odpt:Railway:TokyoMetro.Ginza'),
        'odpt.Railway:TokyoMetro.Ginza'
    );
});
