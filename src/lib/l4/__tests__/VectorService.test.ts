
import { describe, it, before, after, mock } from 'node:test';
import assert from 'node:assert';
import { searchVectorDB } from '../../api/vectorService';

describe('VectorService', () => {
    let originalFetch: any;

    before(() => {
        originalFetch = global.fetch;
    });

    after(() => {
        global.fetch = originalFetch;
    });

    it('should spy on telemetry logging when pruning is active', async () => {
        // Mock Fetch
        global.fetch = mock.fn(async () => {
            return {
                ok: true,
                json: async () => ({ results: [{ id: 1, content: 'test docs' }] })
            };
        }) as any;

        // Spy on console.log
        const logs: string[] = [];
        const originalLog = console.log;
        console.log = (...args) => logs.push(args.join(' '));

        try {
            await searchVectorDB('query', 5, { node_id: 'test-node' });

            // Check logs for Telemetry
            const telemetryLog = logs.find(l => l.includes('[VectorTelemetry] Context Pruning Active'));
            assert.ok(telemetryLog, 'Should log pruning activation');
        } finally {
            console.log = originalLog;
        }
    });

    it('should warn when searching "naked" (no filter)', async () => {
        global.fetch = mock.fn(async () => {
            return {
                ok: true,
                json: async () => ({ results: [] })
            };
        }) as any;

        const logs: string[] = [];
        const originalWarn = console.warn;
        console.warn = (...args) => logs.push(args.join(' '));

        try {
            await searchVectorDB('global query', 5);

            const nakedLog = logs.find(l => l.includes('Naked Search'));
            assert.ok(nakedLog, 'Should warn about naked search');
        } finally {
            console.warn = originalWarn;
        }
    });

    it('should return empty array on fetch failure (Graceful Degradation)', async () => {
        global.fetch = mock.fn(async () => {
            return { ok: false, status: 500, statusText: 'Server Error' };
        }) as any;

        const results = await searchVectorDB('query', 5);
        assert.deepStrictEqual(results, [], 'Should return empty array on failure');
    });
});
