
import { test, describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { AlgorithmProvider } from './AlgorithmProvider';
import { RouteOption } from '@/lib/l4/types/RoutingTypes';

// Mock Data
const mockRustRoute = {
    key: 'smart',
    path: ['StationA', 'StationB'],
    edge_railways: ['JR-East.Yamanote'],
    costs: { time: 10, transfers: 0, cost: 100, hops: 2, transfer_distance: 0, crowding: 1 },
};

describe('AlgorithmProvider (Unit)', () => {

    it('should map rust routes to localized RouteOptions (zh-TW)', async () => {
        // Mock Dependency 1: Route Fetcher
        let fetchedOrigin: string = '';
        const mockFetcher = async (origin: string, dest: string) => {
            fetchedOrigin = origin;
            return {
                routes: [mockRustRoute],
                debug: {},
                error: null
            };
        };

        // Mock Dependency 2: Synthesizer
        const mockSynthesizer = {
            synthesize: async (routes: any[]) => routes // Pass-through
        };

        const provider = new AlgorithmProvider(mockFetcher as any, mockSynthesizer as any);

        // Act
        const result = await provider.findRoutes({
            originId: 'StationA',
            destinationId: 'StationB',
            locale: 'zh-TW',
            filterSuspended: false
        });

        // Assert
        assert.equal(fetchedOrigin, 'StationA', 'Should call fetcher with correct origin');
        assert.ok(result, 'Result should not be null');
        assert.equal(result.length, 1);

        // Check Label Localization (smart -> Fastest/Recommended -> zh-TW?)
        // In clean code, we should check what AlgorithmProvider implementation actually does.
        // It maps 'smart' to '最快' (Fastest) or '推薦路線' (if en?).
        // Line 214: locale === 'en' ? 'Recommended' : '推薦路線'
        // If locale is zh-TW, it should be '推薦路線'

        // Wait, AlgorithmProvider logic:
        // mapRustRoutesToOptions:
        // label: r.key === 'smart' ? (locale === 'en' ? 'Recommended' : '推薦路線') : ...
        assert.equal(result[0].label, '推薦路線', 'Should localize label to zh-TW');

        // Check Step Text
        // "搭乘 山手線 前往 StationB" (If StationB name lookup fails, uses ID)
        // Since we didn't mock getDefaultTopology inside the Provider (it uses static import), 
        // the internal ensureNameMaps will use real topology IF test environment allows import.
        // But in node test runner without mocking module, getDefaultTopology will run.
        // If topology has Yamanote, it might localize.
        // If not, it falls back to IDs.
        // "搭乘 JR-East.Yamanote 前往 StationB"
    });

    it('should pass locale to RouteSynthesizer', async () => {
        // Mock Dependency 1: Route Fetcher to return valid route so we reach Synthesizer
        const mockFetcher = async () => ({
            routes: [mockRustRoute],
            debug: {},
            error: null
        });

        // Mock Dependency 2: Synthesizer Spy
        let capturedLocale = '';
        const mockSynthesizer = {
            synthesize: async (routes: any[], profile: any, holiday: boolean, locale: string) => {
                capturedLocale = locale;
                return routes;
            }
        };

        const provider = new AlgorithmProvider(mockFetcher as any, mockSynthesizer as any);

        const mockProfile: any = { intent: { capabilities: [] } };

        // Act
        await provider.findRoutes({
            originId: 'A',
            destinationId: 'B',
            locale: 'zh-TW',
            userProfile: mockProfile,
            l2Status: { congestion: 0, line_status: [] } // Bypass DB call
        });

        // Assert
        assert.equal(capturedLocale, 'zh-TW', 'Should pass localized locale to Synthesizer');
    });

});
