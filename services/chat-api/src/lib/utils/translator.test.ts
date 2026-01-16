import test from 'node:test';
import assert from 'node:assert/strict';

import { Translator } from './translator';

test('Translator.vibe returns localized label for known keys', () => {
    const v = Translator.vibe('culture');
    assert.equal(v['zh-TW'], '文化脈動');
    assert.equal(v.ja, '文化');
    assert.equal(v.en, 'Culture');
});

test('Translator.vibe falls back to echo key for unknown keys', () => {
    const v = Translator.vibe('unknown_key');
    assert.equal(v['zh-TW'], 'unknown_key');
    assert.equal(v.ja, 'unknown_key');
    assert.equal(v.en, 'unknown_key');
});

test('Translator.getString returns correct locale and falls back safely', () => {
    assert.equal(Translator.getString(undefined, 'en'), '');
    assert.equal(Translator.getString('raw', 'en'), 'raw');

    const v = { 'zh-TW': '中文', ja: '日本語', en: 'English' };
    assert.equal(Translator.getString(v, 'ja'), '日本語');
    assert.equal(Translator.getString(v, 'en'), 'English');
    assert.equal(Translator.getString(v, 'fr'), '中文');
});
