import assert from 'node:assert';
import { test } from 'node:test';

import { POST } from './route';

const __private__ = (POST as any).__private__ as {
    getMissingKeys: () => string[];
    rawBodyForFallback: (rawBody: string | undefined, body: Record<string, unknown>) => string;
    withTimeout: <T>(promise: Promise<T>, ms: number, label: string) => Promise<T>;
};

test('getMissingKeys reports missing OPENROUTER_API_KEY when unset', () => {
    const original = process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    const missing = __private__.getMissingKeys();
    assert.ok(missing.includes('OPENROUTER_API_KEY'));
    if (original) process.env.OPENROUTER_API_KEY = original;
});

test('rawBodyForFallback returns raw body when provided', () => {
    const body = { text: 'hello' };
    const raw = __private__.rawBodyForFallback('{"text":"hi"}', body);
    assert.equal(raw, '{"text":"hi"}');
});

test('withTimeout rejects after deadline', async () => {
    const slow = new Promise(resolve => setTimeout(() => resolve('ok'), 50));
    await assert.rejects(() => __private__.withTimeout(slow, 10, 'timeout'));
});
