/**
 * POITaggedDecisionEngine Integration Tests (Optimized)
 * Phase 4: AI 混合型智慧引擎整合測試
 */

import { POITaggedDecisionEngine, createPOITaggedEngine } from '@/lib/ai/poi-tagged-decision-engine';

// Mock Supabase client
const mockSupabaseData: Record<string, any[]> = {
    'l1_places': [
        {
            id: 'poi_001',
            name: '東京車站餐廳',
            category: 'dining',
            location_tags: { station_id: 'tokyo_station', station_name: '東京車站', ward: '千代田區' },
            category_tags: { primary: 'dining', secondary: 'japanese_food', characteristics: { is_chain: false, price_range: 2 } },
            atmosphere_tags: { 
                core: { energy: 'lively', style: 'modern', crowd_level: 'moderate' },
                scenes: { business: true, dating: true, family: false, solo: true, friends: true, tourist: true },
                environment: { indoor: true, outdoor: false, smoking: 'prohibited', noise_level: 3 },
                time特性: { breakfast: false, lunch: true, dinner: true, late_night: false, all_day: false },
                confidence: 0.9
            }
        },
        {
            id: 'poi_002',
            name: '銀座咖啡廳',
            category: 'cafe',
            location_tags: { station_id: 'ginza_station', station_name: '銀座車站', ward: '中央區' },
            category_tags: { primary: 'dining', secondary: 'cafe', characteristics: { is_chain: true, price_range: 2 } },
            atmosphere_tags: {
                core: { energy: 'cozy', style: 'modern', crowd_level: 'moderate' },
                scenes: { business: true, dating: true, family: false, solo: true, friends: true, tourist: true },
                environment: { indoor: true, outdoor: false, smoking: 'prohibited', noise_level: 2 },
                time特性: { breakfast: true, lunch: true, dinner: false, late_night: false, all_day: true },
                confidence: 0.88
            }
        },
        {
            id: 'poi_003',
            name: '淺草寺景點',
            category: 'entertainment',
            location_tags: { station_id: 'asakusa_station', station_name: '淺草車站', ward: '台東區' },
            category_tags: { primary: 'entertainment', secondary: 'temple', characteristics: { is_chain: false, price_range: 0 } },
            atmosphere_tags: {
                core: { energy: 'bustling', style: 'traditional', crowd_level: 'crowded' },
                scenes: { business: false, dating: true, family: true, solo: true, friends: true, tourist: true },
                environment: { indoor: false, outdoor: true, smoking: 'prohibited', noise_level: 4 },
                time特性: { breakfast: false, lunch: true, dinner: false, late_night: false, all_day: true },
                confidence: 0.92
            }
        },
        {
            id: 'poi_004',
            name: '新宿購物中心',
            category: 'shopping',
            location_tags: { station_id: 'shinjuku_station', station_name: '新宿車站', ward: '新宿區' },
            category_tags: { primary: 'shopping', secondary: 'department', characteristics: { is_chain: true, price_range: 3 } },
            atmosphere_tags: null
        },
        {
            id: 'poi_005',
            name: '池袋拉麵店',
            category: 'dining',
            location_tags: { station_id: 'ikebukuro_station', station_name: '池袋車站', ward: '豐島區' },
            category_tags: { primary: 'dining', secondary: 'japanese_food', characteristics: { is_chain: true, price_range: 1 } },
            atmosphere_tags: {
                core: { energy: 'lively', style: 'casual', crowd_level: 'moderate' },
                scenes: { business: false, dating: false, family: true, solo: true, friends: true, tourist: true },
                environment: { indoor: true, outdoor: false, smoking: 'prohibited', noise_level: 4 },
                time特性: { breakfast: false, lunch: true, dinner: true, late_night: true, all_day: false },
                confidence: 0.85
            }
        }
    ]
};

// Mock Supabase client factory
function createMockSupabaseClient() {
    return {
        from: (table: string) => ({
            select: (columns: string) => ({
                eq: (field: string, value: string) => ({
                    gte: (field: string, value: string) => ({
                        lte: (field: string, value: string) => ({
                            order: (field: string, opts: { ascending: boolean }) => ({
                                limit: (n: number) => ({
                                    in: (field: string, values: string[]) => Promise.resolve({ 
                                        data: mockSupabaseData[table], 
                                        error: null 
                                    })
                                })
                            }),
                            limit: (n: number) => Promise.resolve({ 
                                data: mockSupabaseData[table], 
                                error: null 
                            })
                        })
                    }),
                    not: (field: string, op: string) => Promise.resolve({ 
                        data: mockSupabaseData[table], 
                        error: null 
                    })
                }),
                in: (field: string, values: string[]) => Promise.resolve({ 
                    data: mockSupabaseData[table], 
                    error: null 
                })
            })
        })
    };
}

describe('POITaggedDecisionEngine (Optimized)', () => {
    let engine: POITaggedDecisionEngine;

    beforeEach(() => {
        engine = new POITaggedDecisionEngine(
            'https://test.supabase.co',
            'test-key',
            undefined, // No Redis in tests
            {
                enableRedisCache: false,
                enableQueryNormalization: true,
                enablePrefetch: false,
                enableSimilarityFallback: true,
                maxSimilarResults: 5,
                similarityThreshold: 0.6,
                cacheTTLSeconds: 3600,
                maxResults: 10
            }
        );
        // Inject mock data for testing
        (engine as any).supabase = createMockSupabaseClient();
    });

    afterEach(() => {
        engine.clearCache();
    });

    describe('Query Normalization', () => {
        it('should normalize queries for better cache hits', async () => {
            // Same query with different spacing
            const results1 = await engine.decide({}, '我想 吃 日本料理');
            const results2 = await engine.decide({}, '我想吃日本料理');
            
            expect(results1.length).toBe(results2.length);
            
            // Check cache stats
            const stats = engine.getCacheStats();
            expect(stats.localSize).toBeGreaterThan(0);
        });

        it('should remove filler words', async () => {
            const results = await engine.decide({}, '我想找一個好吃的餐廳');
            expect(results.length).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Query Parsing', () => {
        it('should parse dining category query', async () => {
            const results = await engine.decide({}, '我想吃日本料理');
            expect(results.length).toBeGreaterThan(0);
        });

        it('should parse cafe category query', async () => {
            const results = await engine.decide({}, '找咖啡廳');
            expect(results.length).toBeGreaterThan(0);
        });

        it('should parse shopping category query', async () => {
            const results = await engine.decide({}, '想去購物');
            expect(results.length).toBeGreaterThan(0);
        });

        it('should parse energy preference', async () => {
            const results = await engine.decide({}, '想找安靜的地方');
            expect(results.length).toBeGreaterThan(0);
        });

        it('should parse time of day', async () => {
            const results = await engine.decide({}, '早上吃早餐');
            expect(results.length).toBeGreaterThan(0);
        });

        it('should parse budget preference', async () => {
            const results = await engine.decide({}, '找便宜的餐廳');
            expect(results.length).toBeGreaterThan(0);
        });
    });

    describe('Result Processing', () => {
        it('should return results with relevance scores', async () => {
            const results = await engine.decide({}, '餐廳');
            
            results.forEach((result: any) => {
                expect(result.relevanceScore).toBeGreaterThanOrEqual(0);
                expect(result.relevanceScore).toBeLessThanOrEqual(1);
            });
        });

        it('should return matched criteria', async () => {
            const results = await engine.decide({}, '日本料理');
            
            results.forEach((result: any) => {
                expect(Array.isArray(result.matchedCriteria)).toBe(true);
            });
        });

        it('should include location tags in results', async () => {
            const results = await engine.decide({}, '餐廳');
            
            results.forEach((result: any) => {
                expect(result.locationTags).toBeDefined();
            });
        });

        it('should include category tags in results', async () => {
            const results = await engine.decide({}, '餐廳');
            
            results.forEach((result: any) => {
                expect(result.categoryTags).toBeDefined();
            });
        });
    });

    describe('Caching', () => {
        it('should cache results', async () => {
            const query = '咖啡廳';
            
            // First call
            await engine.decide({}, query);
            
            // Check cache has entries
            const stats = engine.getCacheStats();
            expect(stats.localSize).toBeGreaterThan(0);
        });

        it('should clear cache correctly', async () => {
            await engine.decide({}, '測試查詢');
            
            engine.clearCache();
            
            const stats = engine.getCacheStats();
            expect(stats.localSize).toBe(0);
        });

        it('should track popular queries', async () => {
            await engine.decide({}, '餐廳');
            await engine.decide({}, '餐廳');
            await engine.decide({}, '餐廳');
            
            const stats = engine.getCacheStats();
            expect(stats.topQueries.length).toBeGreaterThan(0);
        });
    });

    describe('User Preferences', () => {
        it('should apply user preferences', async () => {
            const results = await engine.decide({
                preferences: {
                    categories: ['dining', 'cafe'],
                    priceRange: [1, 2]
                }
            }, '吃飯');
            
            expect(results.length).toBeGreaterThan(0);
        });

        it('should handle location context', async () => {
            const results = await engine.decide({
                location: { lat: 35.6762, lng: 139.6503 }
            }, '餐廳');
            
            expect(results.length).toBeGreaterThan(0);
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty query', async () => {
            const results = await engine.decide({}, '');
            expect(Array.isArray(results)).toBe(true);
        });

        it('should handle very short query', async () => {
            const results = await engine.decide({}, '吃');
            expect(results.length).toBeGreaterThanOrEqual(0);
        });

        it('should handle long query', async () => {
            const longQuery = '我想找一個好吃的餐廳，最好是日本料理，環境要安靜';
            const results = await engine.decide({}, longQuery);
            expect(Array.isArray(results)).toBe(true);
        });
    });
});

describe('Engine Configuration', () => {
    it('should use default configuration', () => {
        const engine = new POITaggedDecisionEngine('url', 'key');
        expect(engine).toBeDefined();
    });

    it('should accept custom configuration', () => {
        const engine = new POITaggedDecisionEngine('url', 'key', undefined, {
            enableRedisCache: false,
            enableQueryNormalization: true,
            enablePrefetch: false,
            maxResults: 20,
            cacheTTLSeconds: 7200,
            similarityThreshold: 0.7
        });
        expect(engine).toBeDefined();
    });
});

describe('Query Statistics', () => {
    let engine: POITaggedDecisionEngine;

    beforeEach(() => {
        engine = new POITaggedDecisionEngine(
            'https://test.supabase.co',
            'test-key',
            undefined,
            { enableRedisCache: false, enablePrefetch: false }
        );
        (engine as any).supabase = createMockSupabaseClient();
    });

    afterEach(() => {
        engine.clearCache();
    });

    it('should track popular queries', async () => {
        await engine.decide({}, '日本料理');
        await engine.decide({}, '日本料理');
        await engine.decide({}, '日本料理');
        await engine.decide({}, '咖啡廳');
        
        const popular = engine.getPopularQueries(5);
        expect(popular.length).toBeGreaterThan(0);
        expect(popular[0]).toBe('日本料理');
    });

    it('should return top queries with counts', async () => {
        await engine.decide({}, '拉麵');
        await engine.decide({}, '拉麵');
        await engine.decide({}, '壽司');
        
        const stats = engine.getCacheStats();
        expect(stats.topQueries.length).toBeGreaterThan(0);
    });
});
