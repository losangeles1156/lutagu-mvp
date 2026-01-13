import { test } from 'node:test';
import assert from 'node:assert/strict';

import en from '../../../messages/en.json';
import ja from '../../../messages/ja.json';

function getPath(obj: any, path: string): any {
  return path.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

function expectString(value: any, keyPath: string) {
  assert.equal(typeof value, 'string', `Expected string for ${keyPath}`);
  assert.notEqual(value.trim(), '', `Expected non-empty string for ${keyPath}`);
}

test('i18n: required fallback keys exist (en)', () => {
  expectString(getPath(en, 'l1.noHighlights'), 'en.l1.noHighlights');
});

test('i18n: required fallback keys exist (ja)', () => {
  expectString(getPath(ja, 'common.retry'), 'ja.common.retry');
  expectString(getPath(ja, 'l1.items'), 'ja.l1.items');
  expectString(getPath(ja, 'l1.categories.park'), 'ja.l1.categories.park');
  expectString(getPath(ja, 'l1.categories.market'), 'ja.l1.categories.market');
  expectString(getPath(ja, 'l1.categories.museum'), 'ja.l1.categories.museum');
});
