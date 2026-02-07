import assert from 'node:assert/strict';
import test from 'node:test';

// 為了測試目的，在測試檔案中重新定義內部函數
// 這些函數與 route.ts 中的實作保持一致

function normalizeAdkEndpoint(urlStr: string): string {
    if (!urlStr) return '';
    const trimmed = urlStr.trim();
    const withoutTrailingSlash = trimmed.replace(/\/+$/, '');
    if (!withoutTrailingSlash.includes('/api/') && !withoutTrailingSlash.includes('/agent/')) {
        return `${withoutTrailingSlash}/api/chat`;
    }
    return withoutTrailingSlash;
}

function extractSseEvent(raw: string): { eventType: string; eventData: string } {
    const lines = raw.split(/\r?\n/);
    let eventType = 'message';
    const dataLines: string[] = [];
    for (const line of lines) {
        if (line.startsWith('event:')) {
            eventType = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
            dataLines.push(line.slice(5).trim());
        }
    }
    return { eventType, eventData: dataLines.join('\n') };
}

function parseSseEvent(eventType: string, eventData: string): string | null {
    if (eventType === 'telem') {
        try {
            const obj = JSON.parse(eventData);
            return obj?.content || eventData;
        } catch {
            return eventData;
        }
    }
    return null;
}

test('normalizeAdkEndpoint appends /api/chat for host-only urls', () => {
    assert.equal(normalizeAdkEndpoint('https://adk.example.com'), 'https://adk.example.com/api/chat');
    assert.equal(normalizeAdkEndpoint('https://adk.example.com/'), 'https://adk.example.com/api/chat');
});

test('normalizeAdkEndpoint keeps explicit path', () => {
    assert.equal(normalizeAdkEndpoint('https://adk.example.com/agent/chat'), 'https://adk.example.com/agent/chat');
});

test('extractSseEvent joins multi-line data fields', () => {
    const parsed = extractSseEvent('event: telem\r\ndata: {\"content\":\"hello\"}\r\ndata: world\r\n');
    assert.equal(parsed.eventType, 'telem');
    assert.equal(parsed.eventData, '{"content":"hello"}\nworld');
});

test('parseSseEvent returns raw telem data if json parsing fails', () => {
    const value = parseSseEvent('telem', 'plain stream text');
    assert.equal(value, 'plain stream text');
});
