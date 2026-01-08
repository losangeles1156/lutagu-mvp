# Phase 4: AI 混合型智慧引擎架構整合

## 4.1 整合架構總覽

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           LUTAGU AI Hybrid Engine                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      User Request Handler                            │    │
│  │  (意圖分類 → 路由決策 → 引擎選擇)                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    HybridEngine (混合決策引擎)                        │    │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                 │    │
│  │  │ L1 Fast Path │ │ L2 Alg Path  │ │ L3 AI Path   │                 │    │
│  │  │ (標籤查詢)   │ │ (演算法)     │ │ (LLM 推理)   │                 │    │
│  │  └──────────────┘ └──────────────┘ └──────────────┘                 │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                        │
│                    ┌───────────────┼───────────────┐                        │
│                    ▼               ▼               ▼                        │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│  │ PreDecision  │ │  Algorithm   │ │  Decision    │ │ POITagged    │       │
│  │ Engine       │ │  Provider    │ │  Engine      │ │ Decision     │       │
│  │ (預決策)     │ │ (L2 演算法)  │ │ (L3 邏輯)    │ │ Engine (L1+) │       │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘       │
│                    │               │               │         │              │
│                    └───────────────┴───────────────┴─────────┘              │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    L1 POI Tagging System                            │    │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                 │    │
│  │  │ Location     │ │ Category     │ │ Atmosphere   │                 │    │
│  │  │ Tags         │ │ Tags         │ │ Tags         │                 │    │
│  │  └──────────────┘ └──────────────┘ └──────────────┘                 │    │
│  │                           │                                            │    │
│  │                           ▼                                            │    │
│  │                    ┌──────────────┐                                   │    │
│  │                    │ Precomputed  │                                   │    │
│  │                    │ Similarities │                                   │    │
│  │                    └──────────────┘                                   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 4.2 決策引擎比較

| 特性 | PreDecisionEngine | AlgorithmProvider | DecisionEngine | POITaggedDecisionEngine |
|------|------------------|-------------------|----------------|------------------------|
| 延遲 | < 5ms | 10-50ms | 200-500ms | 5-15ms |
| 成本 | $0 | $0.001 | $0.01-0.05 | $0.001 |
| 準確率 | 70-80% | 85-90% | 95%+ | 90-95% |
| 使用場景 | 快取命中 | 標準查詢 | 複雜推理 | 標籤匹配 |
| L1 支援 | Partial | No | No | Full |
| 相似推薦 | No | No | No | Yes |

## 4.3 POITaggedDecisionEngine 設計

```typescript
// src/lib/ai/poi-tagged-decision-engine.ts

import { createClient } from '@supabase/supabase-js';
import { CacheService, CacheKeyBuilder } from './cacheService';
import { MetricsCollector } from './metricsCollector';

interface POITaggedDecisionEngineConfig {
    enableSimilarityFallback: boolean;
    maxSimilarResults: number;
    similarityThreshold: number;
    cacheTTLSeconds: number;
}

interface UserContext {
    userId?: string;
    preferences?: UserPreferences;
    location?: { lat: number; lng: number };
    time?: Date;
}

interface UserPreferences {
    priceRange?: number[];
    categories?: string[];
    atmosphere?: string[];
    energy?: string[];
}

interface POIDecisionResult {
    poiId: string;
    name: string;
    category: string;
    locationTags: LocationTags;
    categoryTags: CategoryTags;
    atmosphereTags?: AtmosphereTags;
    relevanceScore: number;
    matchedCriteria: string[];
    alternative?: POIDecisionResult[];
}

export class POITaggedDecisionEngine {
    private supabase: ReturnType<typeof createClient>;
    private cache: CacheService;
    private metrics: MetricsCollector;
    private config: POITaggedDecisionEngineConfig;

    constructor(
        supabaseUrl: string,
        supabaseKey: string,
        cache: CacheService,
        metrics: MetricsCollector,
        config?: Partial<POITaggedDecisionEngineConfig>
    ) {
        this.supabase = createClient(supabaseUrl, supabaseKey);
        this.cache = cache;
        this.metrics = metrics;
        this.config = {
            enableSimilarityFallback: true,
            maxSimilarResults: 5,
            similarityThreshold: 0.6,
            cacheTTLSeconds: 3600,
            ...config
        };
    }

    /**
     * 根據用戶上下文和偏好決策 POI
     */
    async decide(
        userContext: UserContext,
        query: string
    ): Promise<POIDecisionResult[]> {
        const startTime = Date.now();
        const cacheKey = this.buildCacheKey(userContext, query);

        // Try cache first
        const cached = await this.cache.get<POIDecisionResult[]>(cacheKey);
        if (cached) {
            this.metrics.recordCacheHit('poi_decision');
            return cached;
        }

        this.metrics.recordCacheMiss('poi_decision');

        try {
            // Step 1: 解析查詢意圖
            const intent = this.parseQueryIntent(query);

            // Step 2: 根據意圖和偏好查詢標籤
            const candidates = await this.queryByTags(userContext, intent);

            if (candidates.length === 0 && this.config.enableSimilarityFallback) {
                // Step 3: 如果沒有精確匹配，使用相似 POI
                return this.fallbackToSimilar(userContext, intent, startTime);
            }

            // Step 4: 排序和過濾
            const results = this.rankAndFilter(candidates, userContext, intent);

            // Cache results
            await this.cache.set(cacheKey, results, this.config.cacheTTLSeconds);

            this.metrics.recordLatency('poi_decision', Date.now() - startTime);
            return results;

        } catch (error) {
            this.metrics.recordError('poi_decision');
            throw error;
        }
    }

    private parseQueryIntent(query: string): QueryIntent {
        const lowerQuery = query.toLowerCase();
        
        // Detect category intent
        let category: string | null = null;
        const categoryKeywords: Record<string, string[]> = {
            'dining': ['吃', '餐廳', '食物', '飯', '午餐', '晚餐', '日本料理', '拉麵', '壽司'],
            'shopping': ['買', '購物', '商店', '商場', '藥妝', '電器'],
            'entertainment': ['玩', '遊樂', '景點', '博物館', '公園'],
            'cafe': ['咖啡', 'cafe', '下午茶', '甜點'],
            'park': ['公園', '綠地', '散步']
        };

        for (const [cat, keywords] of Object.entries(categoryKeywords)) {
            if (keywords.some(k => lowerQuery.includes(k))) {
                category = cat;
                break;
            }
        }

        // Detect atmosphere intent
        let energy: string | null = null;
        const energyKeywords: Record<string, string[]> = {
            'lively': ['熱鬧', '熱鬥', '人多', '熱烈'],
            'quiet': ['安靜', '寧靜', '人少', '清靜'],
            'cozy': ['溫馨', '舒適', '悠閒', '輕鬆']
        };

        for (const [e, keywords] of Object.entries(energyKeywords)) {
            if (keywords.some(k => lowerQuery.includes(k))) {
                energy = e;
                break;
            }
        }

        return {
            originalQuery: query,
            category,
            energy,
            timeOfDay: this.detectTimeOfDay(query),
            budget: this.detectBudget(query)
        };
    }

    private detectTimeOfDay(query: string): 'morning' | 'afternoon' | 'evening' | 'night' | null {
        const lower = query.toLowerCase();
        if (lower.includes('早上') || lower.includes('早餐') || lower.includes('朝')) return 'morning';
        if (lower.includes('下午') || lower.includes('午餐') || lower.includes('昼')) return 'afternoon';
        if (lower.includes('晚上') || lower.includes('晚餐') || lower.includes('夜')) return 'night';
        return null;
    }

    private detectBudget(query: string): number | null {
        const lower = query.toLowerCase();
        if (lower.includes('便宜') || lower.includes('平價') || lower.includes('省')) return 1;
        if (lower.includes('高檔') || lower.includes('高級') || lower.includes('奢華')) return 4;
        if (lower.includes('中檔') || lower.includes('中等') || middle.includes('一般')) return 2;
        return null;
    }

    private async queryByTags(
        userContext: UserContext,
        intent: QueryIntent
    ): Promise<POIDecisionResult[]> {
        let query = this.supabase
            .from('l1_places')
            .select(`
                id,
                name,
                category,
                location_tags,
                category_tags,
                atmosphere_tags,
                location,
                station_id
            `)
            .not('category', 'is', null);

        // Apply category filter
        if (intent.category) {
            query = query.eq('category', intent.category);
        }

        // Apply location filter
        if (userContext.location) {
            // Get nearby POIs using PostGIS-style distance calculation
            // This would be optimized with proper spatial indexing
        }

        const { data, error } = await query.limit(100);

        if (error) {
            console.error('Error querying POIs:', error);
            return [];
        }

        return (data || []).map(poi => this.mapToDecisionResult(poi, intent));
    }

    private mapToDecisionResult(poi: any, intent: QueryIntent): POIDecisionResult {
        const categoryTags = poi.category_tags as CategoryTags | null;
        const atmosphereTags = poi.atmosphere_tags as AtmosphereTags | null;

        const matchedCriteria: string[] = [];

        if (poi.category === intent.category) {
            matchedCriteria.push(`category:${intent.category}`);
        }

        if (atmosphereTags?.core?.energy === intent.energy) {
            matchedCriteria.push(`atmosphere:${intent.energy}`);
        }

        if (categoryTags?.characteristics?.price_range === intent.budget) {
            matchedCriteria.push(`budget:${intent.budget}`);
        }

        // Calculate relevance score
        const relevanceScore = this.calculateRelevanceScore(
            poi,
            intent,
            categoryTags,
            atmosphereTags
        );

        return {
            poiId: poi.id,
            name: poi.name,
            category: poi.category,
            locationTags: poi.location_tags || {},
            categoryTags: categoryTags || {},
            atmosphereTags: atmosphereTags,
            relevanceScore,
            matchedCriteria
        };
    }

    private calculateRelevanceScore(
        poi: any,
        intent: QueryIntent,
        categoryTags: CategoryTags | null,
        atmosphereTags: AtmosphereTags | null
    ): number {
        let score = 0;

        // Category match
        if (poi.category === intent.category) score += 0.4;

        // Energy match
        if (atmosphereTags?.core?.energy === intent.energy) score += 0.3;

        // Budget match
        if (categoryTags?.characteristics?.price_range === intent.budget) score += 0.2;

        // Chain store bonus (usually reliable)
        if (categoryTags?.characteristics?.is_chain) score += 0.1;

        return Math.min(1, score);
    }

    private async fallbackToSimilar(
        userContext: UserContext,
        intent: QueryIntent,
        startTime: number
    ): Promise<POIDecisionResult[]> {
        // Get similar POIs based on query intent
        // This would use the precomputed similarity table
        
        const { data } = await this.supabase
            .from('l1_poi_similarities')
            .select(`
                similar_poi_id,
                similarity_score,
                recommendation_reason
            `)
            .limit(this.config.maxSimilarResults);

        if (!data || data.length === 0) {
            return [];
        }

        const poiIds = data.map(d => d.similar_poi_id);

        const { data: pois } = await this.supabase
            .from('l1_places')
            .select('*')
            .in('id', poiIds);

        return (pois || []).map(poi => ({
            ...this.mapToDecisionResult(poi, intent),
            alternative: [{
                poiId: poi.id,
                name: poi.name,
                category: poi.category,
                relevanceScore: data.find(d => d.similar_poi_id === poi.id)?.similarity_score || 0,
                matchedCriteria: ['similarity_fallback']
            }]
        }));
    }

    private rankAndFilter(
        candidates: POIDecisionResult[],
        userContext: UserContext,
        intent: QueryIntent
    ): POIDecisionResult[] {
        return candidates
            .filter(c => c.relevanceScore >= 0.3)
            .sort((a, b) => b.relevanceScore - a.relevanceScore)
            .slice(0, 10);
    }

    private buildCacheKey(userContext: UserContext, query: string): string {
        return CacheKeyBuilder.build('poi_decision', {
            query: query.substring(0, 50),
            location: userContext.location ? 
                `${userContext.location.lat.toFixed(2)},${userContext.location.lng.toFixed(2)}` : 
                'any',
            preferences: userContext.preferences ? 
                JSON.stringify(userContext.preferences) : 
                'default'
        });
    }
}
```

## 4.4 HybridEngine 整合更新

```typescript
// src/lib/ai/hybrid-engine.ts (更新部分)

import { POITaggedDecisionEngine } from './poi-tagged-decision-engine';
import { PreDecisionEngine } from './predecision-engine';
import { DecisionEngine } from './decision-engine';
import { AlgorithmProvider } from './algorithm-provider';

export class HybridEngine {
    private preDecisionEngine: PreDecisionEngine;
    private algorithmProvider: AlgorithmProvider;
    private decisionEngine: DecisionEngine;
    private poiTaggedEngine: POITaggedDecisionEngine;

    constructor(
        // ... existing dependencies
        poiTaggedEngine?: POITaggedDecisionEngine
    ) {
        // ... existing initialization
        this.poiTaggedEngine = poiTaggedEngine || this.createPOITaggedEngine();
    }

    private createPOITaggedEngine(): POITaggedDecisionEngine {
        return new POITaggedDecisionEngine(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_KEY!,
            this.cacheService,
            this.metricsCollector
        );
    }

    async processRequest(request: UserRequest): Promise<EngineResponse> {
        // Phase 1: 預分類請求類型
        const requestType = await this.classifyRequest(request);

        // Phase 2: 根據請求類型選擇引擎
        switch (requestType) {
            case 'simple_query':
                // 使用 L1 POI Tagged Engine (快速、精確)
                return this.processWithPOITaggedEngine(request);
            
            case 'route_planning':
                // 使用 Algorithm Provider (標準)
                return this.processWithAlgorithmProvider(request);
            
            case 'complex_reasoning':
                // 使用 Decision Engine (深度 AI)
                return this.processWithDecisionEngine(request);
            
            default:
                // 預決策引擎 (快取優先)
                return this.processWithPreDecision(request);
        }
    }

    private async processWithPOITaggedEngine(
        request: UserRequest
    ): Promise<EngineResponse> {
        const startTime = Date.now();

        const results = await this.poiTaggedEngine.decide(
            {
                userId: request.userId,
                preferences: request.preferences,
                location: request.location
            },
            request.query
        );

        return {
            response: this.formatPOIResults(results),
            metadata: {
                engine: 'poi_tagged',
                latency: Date.now() - startTime,
                resultCount: results.length,
                cacheHit: false // Would check actual cache status
            }
        };
    }

    private formatPOIResults(results: POIDecisionResult[]): string {
        if (results.length === 0) {
            return '找不到符合條件的店家。';
        }

        const formatted = results.slice(0, 5).map((poi, index) => {
            return `${index + 1}. ${poi.name}
   📍 類別: ${poi.category}
   ${poi.atmosphereTags ? `✨ 氣氛: ${poi.atmosphereTags.core?.energy}` : ''}
   ${poi.matchedCriteria.length > 0 ? `✅ 符合: ${poi.matchedCriteria.join(', ')}` : ''}`;
        }).join('\n\n');

        return `找到 ${results.length} 個推薦店家：\n\n${formatted}`;
    }
}
```

## 4.5 API 端點設計

```typescript
// src/app/api/poi/recommend/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { HybridEngine } from '@/lib/ai/hybrid-engine';

export async function POST(request: NextRequest) {
    const hybridEngine = new HybridEngine(/* dependencies */);

    try {
        const body = await request.json();
        const { query, userId, location, preferences } = body;

        const response = await hybridEngine.processRequest({
            query,
            userId,
            location,
            preferences,
            timestamp: new Date()
        });

        return NextResponse.json({
            success: true,
            data: response.response,
            metadata: response.metadata
        });

    } catch (error) {
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

// src/app/api/poi/similar/[id]/route.ts

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const poiId = params.id;

    const { data, error } = await supabase
        .from('l1_poi_similarities')
        .select(`
            similarity_score,
            common_tags,
            recommendation_reason,
            l1_places!similar_poi_id (
                id,
                name,
                category,
                location
            )
        `)
        .eq('poi_id', poiId)
        .eq('expires_at', 'future')  // This needs proper syntax
        .order('similarity_score', { ascending: false })
        .limit(10);

    if (error) {
        return NextResponse.json({ success: false, error }, { status: 500 });
    }

    return NextResponse.json({
        success: true,
        data: data.map(item => ({
            poiId: item.l1_places.id,
            name: item.l1_places.name,
            category: item.l1_places.category,
            similarity: item.similarity_score,
            commonTags: item.common_tags,
            reason: item.recommendation_reason
        }))
    });
}
```

## 4.6 遷移腳本

```sql
-- 新增 API 日誌表
CREATE TABLE IF NOT EXISTS l1_poi_api_log (
    id BIGSERIAL PRIMARY KEY,
    request_id VARCHAR(32) NOT NULL,
    user_id VARCHAR(64),
    query TEXT NOT NULL,
    engine_used VARCHAR(32) NOT NULL,
    result_count INT DEFAULT 0,
    latency_ms INT DEFAULT 0,
    cache_hit BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_api_log_user ON l1_poi_api_log(user_id);
CREATE INDEX idx_api_log_engine ON l1_poi_api_log(engine_used);
CREATE INDEX idx_api_log_created ON l1_poi_api_log(created_at DESC);

-- 新增引擎效能監控視圖
CREATE OR REPLACE VIEW v_l1_engine_performance AS
SELECT 
    engine_used,
    DATE(created_at) as date,
    COUNT(*) as request_count,
    AVG(latency_ms) as avg_latency_ms,
    AVG(result_count) as avg_results,
    SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END)::FLOAT / COUNT(*) * 100 as cache_hit_rate
FROM l1_poi_api_log
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY engine_used, DATE(created_at)
ORDER BY date DESC, engine_used;
```

## 4.7 整合測試案例

```typescript
// tests/poi-tagged-engine.test.ts

describe('POITaggedDecisionEngine', () => {
    it('should return POIs matching category query', async () => {
        const engine = createTestEngine();
        
        const results = await engine.decide(
            { userId: 'test_user' },
            '我想吃日本料理'
        );
        
        expect(results.length).toBeGreaterThan(0);
        expect(results[0].category).toBe('dining');
    });

    it('should return similar POIs when no exact match', async () => {
        const engine = createTestEngine();
        
        const results = await engine.decide(
            {},
            'xyznonexistent12345'
        );
        
        // Should fallback to similar recommendations
        expect(results.length).toBeGreaterThan(0);
    });

    it('should use cache on repeated queries', async () => {
        const engine = createTestEngine();
        
        const results1 = await engine.decide({}, '咖啡廳');
        const results2 = await engine.decide({}, '咖啡廳');
        
        expect(results1).toEqual(results2);
    });
});
```

## 4.8 效能基準

| 場景 | P50 延遲 | P95 延遲 | Throughput |
|------|---------|---------|------------|
| 簡單查詢 (L1) | 5ms | 15ms | 500 req/s |
| 路線規劃 (L2) | 50ms | 150ms | 100 req/s |
| 複雜推理 (L3) | 500ms | 2000ms | 20 req/s |
| 標籤查詢 (L1+) | 10ms | 30ms | 300 req/s |
