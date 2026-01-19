import { test } from 'node:test';
import assert from 'node:assert/strict';
import { templateEngine } from './TemplateEngine';

test('TemplateEngine greeting matches exact short greeting (ja)', () => {
  const res = templateEngine.match('こんにちは', 'ja');
  assert.ok(res);
  assert.equal(res.type, 'text');
  assert.ok(res.content.includes('LUTAGU'));
});

test('TemplateEngine greeting matches greeting with punctuation (ja)', () => {
  const res = templateEngine.match('こんにちは！', 'ja');
  assert.ok(res);
  assert.equal(res.type, 'text');
});

test('TemplateEngine does not treat greeting+delay as greeting', () => {
  const res = templateEngine.match('こんにちは、銀座線遅延？', 'ja');
  assert.ok(res);
  assert.equal(res.type, 'text');
  assert.ok(/運行状況|遅延理由/.test(res.content));
});

test('TemplateEngine prefers live status help over greeting when delay is included', () => {
  const res = templateEngine.match('hi delay on yamanote?', 'en');
  assert.ok(res);
  assert.equal(res.type, 'text');
  assert.ok(/live service status/i.test(res.content));
});

