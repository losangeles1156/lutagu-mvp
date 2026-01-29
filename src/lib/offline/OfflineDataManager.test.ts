import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { OfflineDataManager } from './OfflineDataManager';

describe('OfflineDataManager', () => {
    let fetchCalls: string[] = [];
    //@ts-ignore
    const originalFetch = global.fetch;

    beforeEach(() => {
        fetchCalls = [];
        //@ts-ignore
        global.window = {}; // Simulate browser
        //@ts-ignore
        global.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
            fetchCalls.push(input.toString());
            return new Response('{}', { status: 200 });
        };
        // Reset private static state hack
        (OfflineDataManager as any).isInitialized = false;
    });

    afterEach(() => {
        //@ts-ignore
        delete global.window;
        //@ts-ignore
        global.fetch = originalFetch;
    });

    it('should initialize and run prefetch', async () => {
        // Mock setTimeout to execute immediately
        const originalSetTimeout = global.setTimeout;
        //@ts-ignore
        global.setTimeout = ((cb: any) => cb()) as any;

        try {
            await OfflineDataManager.initSilentPrefetch();

            // Allow promises to settle
            await new Promise(resolve => setImmediate(resolve));

            // Assertions
            assert.ok(fetchCalls.length > 0, 'Should make fetch calls');
            assert.ok(fetchCalls.some(url => url.includes('/data/routing_graph.json')), 'Should fetch graph');
            assert.ok(fetchCalls.some(url => url.includes('Tokyo')), 'Should fetch Tokyo');
        } finally {
            global.setTimeout = originalSetTimeout;
        }
    });

    it('should not initialize twice', async () => {
        const originalSetTimeout = global.setTimeout;
        //@ts-ignore
        global.setTimeout = ((cb: any) => cb()) as any;

        try {
            (OfflineDataManager as any).isInitialized = true;
            await OfflineDataManager.initSilentPrefetch();

            assert.strictEqual(fetchCalls.length, 0, 'Should not fetch if already initialized');
        } finally {
            global.setTimeout = originalSetTimeout;
        }
    });
});
