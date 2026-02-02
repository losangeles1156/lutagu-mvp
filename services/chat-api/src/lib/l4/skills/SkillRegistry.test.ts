import test from 'node:test';
import assert from 'node:assert/strict';

import { executeSkill, SkillRegistry, type DeepResearchSkill, type SkillResult } from './SkillRegistry';
import { getCache } from '../../cache/cacheService';

function sleep(ms: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

test('executeSkill returns invalid_input for empty input', async () => {
    getCache('skill_execution').clear();

    const skill: DeepResearchSkill = {
        name: 'dummy',
        priority: 1,
        definition: {
            name: 'dummy_tool',
            description: 'dummy',
            parameters: { type: 'object', properties: {} }
        },
        canHandle: () => true,
        calculateRelevance: async () => 0.5,
        execute: async () => ({ source: 'knowledge', type: 'text', content: 'ok', confidence: 1.0 })
    };

    const { result, meta } = await executeSkill(skill, '   ', {} as any);
    assert.equal(result, null);
    assert.equal(meta.errorCode, 'invalid_input');
});

test('executeSkill returns invalid_params when required params missing', async () => {
    getCache('skill_execution').clear();

    const skill: DeepResearchSkill = {
        name: 'dummy',
        priority: 1,
        definition: {
            name: 'dummy_tool',
            description: 'dummy',
            parameters: {
                type: 'object',
                properties: { q: { type: 'string' } },
                required: ['q']
            }
        },
        canHandle: () => true,
        calculateRelevance: async () => 0.5,
        execute: async () => ({ source: 'knowledge', type: 'text', content: 'ok', confidence: 1.0 })
    };

    const { result, meta } = await executeSkill(skill, 'hello', {} as any, {});
    assert.equal(result, null);
    assert.equal(meta.errorCode, 'invalid_params');
});

test('executeSkill caches results when enabled', async () => {
    getCache('skill_execution').clear();

    let calls = 0;
    const skill: DeepResearchSkill = {
        name: 'dummy',
        priority: 1,
        policy: { enableCache: true, cacheTtlMs: 60_000 },
        definition: {
            name: 'dummy_tool',
            description: 'dummy',
            parameters: { type: 'object', properties: {} }
        },
        canHandle: () => true,
        calculateRelevance: async () => 0.5,
        execute: async () => {
            calls += 1;
            const out: SkillResult = { source: 'knowledge', type: 'text', content: `ok-${calls}`, confidence: 1.0 };
            return out;
        }
    };

    const input = `hello-${Date.now()}`;
    const a = await executeSkill(skill, input, {} as any);
    assert.equal(a.meta.fromCache, false);
    assert.ok(a.result);
    assert.equal(calls, 1);

    const b = await executeSkill(skill, input, {} as any);
    assert.equal(calls, 1);
    assert.equal(b.meta.fromCache, true);
    assert.ok(b.result);
    assert.equal(b.result!.content, a.result!.content);
});

test('executeSkill returns timeout when execution exceeds policy', async () => {
    getCache('skill_execution').clear();

    const skill: DeepResearchSkill = {
        name: 'slow',
        priority: 1,
        policy: { timeoutMs: 5, enableCache: false },
        definition: {
            name: 'slow_tool',
            description: 'slow',
            parameters: { type: 'object', properties: {} }
        },
        canHandle: () => true,
        calculateRelevance: async () => 0.5,
        execute: async () => {
            await sleep(30);
            return { source: 'knowledge', type: 'text', content: 'late', confidence: 1.0 };
        }
    };

    const { result, meta } = await executeSkill(skill, 'hello', {} as any);
    assert.equal(result, null);
    assert.equal(meta.errorCode, 'timeout');
});

test('SkillRegistry.findByToolName matches by definition.name', () => {
    const reg = new SkillRegistry();
    const s: DeepResearchSkill = {
        name: 'skillA',
        priority: 1,
        definition: { name: 'tool_a', description: 'a', parameters: { type: 'object', properties: {} } },
        canHandle: () => false,
        calculateRelevance: async () => 0,
        execute: async () => null
    };
    reg.register(s);

    assert.equal(reg.findByToolName('tool_a')?.name, 'skillA');
    assert.equal(reg.findByToolName('skillA')?.definition.name, 'tool_a');
});
