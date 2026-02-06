import assert from 'node:assert/strict';
import test from 'node:test';
import { __private__ } from './route';

test('normalizeAdkEndpoint appends /api/chat for host-only urls', () => {
    assert.equal(__private__.normalizeAdkEndpoint('https://adk.example.com'), 'https://adk.example.com/api/chat');
    assert.equal(__private__.normalizeAdkEndpoint('https://adk.example.com/'), 'https://adk.example.com/api/chat');
});

test('normalizeAdkEndpoint keeps explicit path', () => {
    assert.equal(__private__.normalizeAdkEndpoint('https://adk.example.com/agent/chat'), 'https://adk.example.com/agent/chat');
});

test('extractSseEvent joins multi-line data fields', () => {
    const parsed = __private__.extractSseEvent('event: telem\r\ndata: {\"content\":\"hello\"}\r\ndata: world\r\n');
    assert.equal(parsed.eventType, 'telem');
    assert.equal(parsed.eventData, '{\"content\":\"hello\"}\nworld');
});

test('parseSseEvent returns raw telem data if json parsing fails', () => {
    const value = __private__.parseSseEvent('telem', 'plain stream text');
    assert.equal(value, 'plain stream text');
});
