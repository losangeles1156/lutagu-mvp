
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { translateDisruption, getDisruptionCause } from '../odptDisruptionTranslations';

test('odptDisruptionTranslations', async (t) => {
    await t.test('getDisruptionCause should identify specific causes', () => {
        const text = '変電所の電気設備故障の影響で、運転を見合わせています。';
        assert.equal(getDisruptionCause(text, 'zh-TW'), '變電站設備故障');
        assert.equal(getDisruptionCause(text, 'en'), 'Substation equipment failure');
    });

    await t.test('getDisruptionCause should return null if no known cause found', () => {
        const text = 'なんか変な感じです';
        assert.equal(getDisruptionCause(text, 'zh-TW'), null);
    });

    await t.test('translateDisruption should replace keywords in sentences (ZH)', () => {
        const text = '人身事故の影響で、ダイヤが乱れています。';
        const translated = translateDisruption(text, 'zh-TW');
        // Expect something like "人身事故 導致，時刻表混亂。"
        assert.ok(translated.includes('人身事故'));
        assert.ok(translated.includes('時刻表混亂'));
    });

    await t.test('translateDisruption should replace keywords in sentences (EN)', () => {
        const text = '人身事故の影響で、遅れが出ています。';
        const translated = translateDisruption(text, 'en');
        assert.ok(translated.includes('Passenger injury / Accident'));
        assert.ok(translated.includes('Delays'));
    });

    await t.test('translateDisruption should handle complex causes', () => {
        const text = '変電所の電気設備故障の影響で';
        const translated = translateDisruption(text, 'zh-TW');
        assert.ok(translated.includes('變電站設備故障'));
    });
});
