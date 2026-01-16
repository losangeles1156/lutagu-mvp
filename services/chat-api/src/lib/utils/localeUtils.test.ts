import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeVibeTagsForDisplay, toLocaleString } from './localeUtils';

test('toLocaleString normalizes zh-TW and falls back across locales', () => {
    const v = toLocaleString({ 'zh-TW': '台灣', en: 'EN', ja: 'JA' });
    assert.deepEqual(v, { zh: '台灣', en: 'EN', ja: 'JA' });

    const v2 = toLocaleString({ 'zh-TW': '台灣' });
    assert.deepEqual(v2, { zh: '台灣', en: '台灣', ja: '台灣' });
});

test('normalizeVibeTagsForDisplay supports LocalizedVibeTags object', () => {
    const tags = normalizeVibeTagsForDisplay({
        'zh-TW': ['購物天堂', '自然秘境'],
        ja: ['ショッピング'],
        en: ['Shopping', 'Nature']
    });

    assert.equal(tags.length, 2);
    assert.deepEqual(tags[0], {
        id: 'vibe-0',
        label: { zh: '購物天堂', ja: 'ショッピング', en: 'Shopping' }
    });
    assert.deepEqual(tags[1], {
        id: 'vibe-1',
        label: { zh: '自然秘境', ja: 'Nature', en: 'Nature' }
    });
});

test('normalizeVibeTagsForDisplay supports L1 vibe tag objects with score', () => {
    const tags = normalizeVibeTagsForDisplay([
        { id: 'historic', label: { en: 'Historic', ja: '歴史', zh: '歷史' }, score: 5 }
    ]);
    assert.equal(tags.length, 1);
    assert.deepEqual(tags[0], {
        id: 'historic',
        label: { en: 'Historic', ja: '歴史', zh: '歷史' },
        count: 5
    });
});

