import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeIntent } from './intentNormalizer';
import type { SupportedLocale } from '@/lib/l4/assistantEngine';

test('normalizeIntent: rush detection', () => {
    const res = normalizeIntent('我趕時間，要去上野', 'zh-TW' as SupportedLocale);
    assert.equal(res.urgency, 'high');
    assert.ok(res.userStateTags.includes('rush'));
});

test('normalizeIntent: accessibility constraint', () => {
    const res = normalizeIntent('需要無障礙電梯', 'zh-TW' as SupportedLocale);
    assert.ok(res.constraints.includes('accessibility'));
});
