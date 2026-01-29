import { describe, it } from 'node:test';
import assert from 'node:assert';
import { resolveText } from './utils';

describe('resolveText', () => {
    it('should return string as-is', () => {
        assert.strictEqual(resolveText('Hello'), 'Hello');
    });

    it('should resolve specific locale', () => {
        const input = { en: 'Hello', ja: 'こんにちは', 'zh-TW': '你好' };
        assert.strictEqual(resolveText(input, 'ja'), 'こんにちは');
        assert.strictEqual(resolveText(input, 'zh-TW'), '你好');
    });

    it('should fallback to en if locale missing', () => {
        const input = { en: 'Hello', ja: 'こんにちは' };
        assert.strictEqual(resolveText(input, 'fr'), 'Hello');
    });

    it('should fallback to zh-TW if en missing', () => {
        const input = { 'zh-TW': '你好', ja: 'こんにちは' };
        assert.strictEqual(resolveText(input, 'fr'), '你好');
    });

    it('should fallback to first value if nothing matches', () => {
        const input = { ko: 'Annyeong' };
        assert.strictEqual(resolveText(input, 'fr'), 'Annyeong');
    });

    it('should return empty string for undefined', () => {
        assert.strictEqual(resolveText(undefined), '');
    });
});
