import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HybridEngine } from './HybridEngine';
import { executeSkill, type DeepResearchSkill } from './skills/SkillRegistry';
import { clearAllCaches } from '../cache/cacheService';
import { AnomalyDetector } from './utils/AnomalyDetector';

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
    assert.ok(typeof taxi.target === 'string' && taxi.target.length > 0);
    assert.equal(taxi?.metadata?.partner_id, 'go_taxi');
    {
        const url = typeof taxi.target === 'string' ? taxi.target : '';
        const routeUrl = typeof taxi?.metadata?.route_url === 'string' ? taxi.metadata.route_url : '';
        assert.ok(
            (url.includes('google.com/maps/dir/?api=1') && url.includes('travelmode=driving')) ||
            (routeUrl.includes('google.com/maps/dir/?api=1') && routeUrl.includes('travelmode=driving'))
        );
    }
    assert.ok(typeof taxi.label === 'string' && taxi.label.includes('min'));

    const bike = actions.find((a: any) => a?.type === 'bike');
    const toeiBus = actions.find((a: any) => a?.metadata?.partner_id === 'toei_bus');
    assert.ok(bike || toeiBus);

    if (bike) {
        assert.ok(typeof bike.target === 'string' && bike.target.length > 0);
        assert.equal(bike?.metadata?.partner_id, 'luup');
        const url = typeof bike.target === 'string' ? bike.target : '';
        const routeUrl = typeof bike?.metadata?.route_url === 'string' ? bike.metadata.route_url : '';
        assert.ok(
            (url.includes('google.com/maps/dir/?api=1') && url.includes('travelmode=bicycling')) ||
            (routeUrl.includes('google.com/maps/dir/?api=1') && routeUrl.includes('travelmode=bicycling'))
        );
    }

    if (toeiBus) {
        assert.equal(toeiBus?.type, 'transit');
        assert.ok(typeof toeiBus.target === 'string' && toeiBus.target.startsWith('chat:'));
        assert.equal(toeiBus?.metadata?.partner_id, 'toei_bus');
    }
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

test('HybridEngine uses deterministic normal response for recovery status query (en)', async () => {
    const engine = new HybridEngine();

    const l2Status = {
        status_code: 'NORMAL',
        has_issues: false,
        delay_minutes: 0,
        line_status: [
            {
                line: 'Yamanote Line',
                operator: 'JR-East',
                status: 'normal',
                status_detail: 'normal',
                delay_minutes: 0,
                message: 'normal'
            }
        ]
    };

    const res = await engine.processRequest({
        text: 'Is it back to normal now? Can I take JR as usual, and what risk remains during recovery?',
        locale: 'en',
        context: {
            currentStation: 'odpt.Station:JR-East.Tokyo',
            strategyContext: {
                nodeName: 'Tokyo',
                l2Status
            } as any
        }
    });

    assert.ok(res);
    assert.equal(res.source, 'algorithm');
    assert.equal(res.type, 'text');
    assert.ok(/no major delays/i.test(res.content));
});

test('HybridEngine uses deterministic normal response for status query (ja)', async () => {
    const engine = new HybridEngine();

    const l2Status = {
        status_code: 'NORMAL',
        has_issues: false,
        delay_minutes: 0,
        line_status: [
            {
                line: '山手線',
                operator: 'JR-East',
                status: 'normal',
                status_detail: 'normal',
                delay_minutes: 0,
                message: '平常運転'
            }
        ]
    };

    const res = await engine.processRequest({
        text: '今は通常運転に戻りましたか？山手線はいつも通り乗って大丈夫？',
        locale: 'ja',
        context: {
            currentStation: 'odpt.Station:JR-East.Yamanote.Shibuya',
            strategyContext: {
                nodeName: '渋谷',
                l2Status
            } as any
        }
    });

    assert.ok(res);
    assert.equal(res.source, 'algorithm');
    assert.equal(res.type, 'text');
    assert.ok(/大きな遅延は見当たりません/.test(res.content));
});

test('Conversation matrix: HybridEngine routes deterministic paths without LLM', async () => {
    const engine = new HybridEngine();

    const cases: Array<{
        name: string;
        text: string;
        locale: 'zh-TW' | 'en' | 'ja';
        context?: any;
        expect: { source: string; type: string };
    }> = [
        {
            name: 'L1 greeting -> template',
            text: 'hi',
            locale: 'en',
            expect: { source: 'template', type: 'text' }
        },
        {
            name: 'L2 route -> algorithm',
            text: 'How can I get from odpt.Station:TokyoMetro.Ginza.Ueno to odpt.Station:TokyoMetro.Ginza.Ginza?',
            locale: 'en',
            expect: { source: 'algorithm', type: 'route' }
        },
        {
            name: 'L2 fare -> algorithm',
            text: '票價 到 銀座',
            locale: 'zh-TW',
            context: { currentStation: 'odpt.Station:TokyoMetro.Ginza.Ueno' },
            expect: { source: 'algorithm', type: 'fare' }
        },
        {
            name: 'L2 disruption fuse overrides non-disruption response',
            text: 'hi',
            locale: 'en',
            context: {
                currentStation: 'odpt.Station:TokyoMetro.Ginza.Ueno',
                strategyContext: {
                    nodeName: 'Ueno Station',
                    l2Status: {
                        status_code: 'SUSPENDED',
                        has_issues: true,
                        cause: '信号トラブル',
                        affected_lines: ['JR Yamanote'],
                        delay_minutes: 15
                    }
                }
            },
            expect: { source: 'l2_disruption', type: 'action' }
        }
    ];

    for (const c of cases) {
        const res = await engine.processRequest({
            text: c.text,
            locale: c.locale,
            context: c.context
        });

        assert.ok(res, c.name);
        assert.equal(res.source, c.expect.source, c.name);
        assert.equal(res.type, c.expect.type, c.name);
        assert.ok(typeof res.content === 'string' && res.content.length > 0, c.name);
    }
});

test('Skill execution validates params, enforces timeout, and caches results', async () => {
    clearAllCaches();

    let calls = 0;
    const skill: DeepResearchSkill = {
        name: 'dummy_skill',
        priority: 1,
        definition: {
            name: 'dummy_skill',
            description: 'dummy',
            parameters: {
                type: 'object',
                properties: {
                    query: { type: 'string' }
                },
                required: ['query']
            }
        },
        policy: {
            enableCache: true,
            cacheTtlMs: 60_000,
            timeoutMs: 50,
            maxInputChars: 20,
            maxStringParamChars: 10
        },
        canHandle: () => true,
        execute: async (_input, _context, params) => {
            calls++;
            return {
                source: 'knowledge',
                type: 'expert_tip',
                content: `ok:${params.query}`,
                confidence: 1
            };
        }
    };

    {
        const { result, meta } = await executeSkill(skill, '', {}, { query: 'abc' });
        assert.equal(result, null);
        assert.equal(meta.errorCode, 'invalid_input');
    }

    {
        const { result, meta } = await executeSkill(skill, 'hello', {}, {});
        assert.equal(result, null);
        assert.equal(meta.errorCode, 'invalid_params');
    }

    {
        const slowSkill: DeepResearchSkill = {
            ...skill,
            execute: async () => {
                await new Promise(r => setTimeout(r, 200));
                return {
                    source: 'knowledge',
                    type: 'expert_tip',
                    content: 'late',
                    confidence: 1
                };
            }
        };

        const { result, meta } = await executeSkill(slowSkill, 'hello', {}, { query: 'abc' });
        assert.equal(result, null);
        assert.equal(meta.errorCode, 'timeout');
    }

    {
        const r1 = await executeSkill(skill, 'hello world', { currentStation: 'odpt.Station:TokyoMetro.Ginza.Ueno' }, { query: 'abcdefghijk' });
        assert.ok(r1.result);
        assert.equal(r1.meta.fromCache, false);
        assert.equal(calls, 1);
        assert.ok(r1.result.content.includes('ok:abcdefghij'));

        const r2 = await executeSkill(skill, 'hello world', { currentStation: 'odpt.Station:TokyoMetro.Ginza.Ueno' }, { query: 'abcdefghijk' });
        assert.ok(r2.result);
        assert.equal(r2.meta.fromCache, true);
        assert.equal(calls, 1);
    }
});

test('AnomalyDetector allows structured ODPT ids in user queries', () => {
    const text = 'How can I get from odpt.Station:TokyoMetro.Ginza.Ueno to odpt.Station:TokyoMetro.Ginza.Ginza now?';
    const res = AnomalyDetector.isAnomaly(text);
    assert.equal(res.isAnomaly, false);
});

test('AnomalyDetector flags obvious random strings', () => {
    const text = 'bcdfghjklmnpqrstvwxzBCDFGHJKLMNPQRSTVWXZ1234567890';
    const res = AnomalyDetector.isAnomaly(text);
    assert.equal(res.isAnomaly, true);
});

test('AnomalyDetector flags punctuation-only messages', () => {
    assert.equal(AnomalyDetector.isAnomaly('....').isAnomaly, true);
    assert.equal(AnomalyDetector.isAnomaly('    ....   ').isAnomaly, true);
    assert.equal(AnomalyDetector.isAnomaly('😂😂😂😂').isAnomaly, true);
    assert.equal(AnomalyDetector.isAnomaly('上野....').isAnomaly, false);
});
