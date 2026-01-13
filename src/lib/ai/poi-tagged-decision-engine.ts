/**
 * POITaggedDecisionEngine - Phase 4 Core Component (Optimized)
 * 
 * 使用預計算標籤進行快速 POI 決策的引擎
 * 整合 Redis 快取、查詢正規化、預取等優化
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Redis from 'ioredis';

// Type definitions
interface LocationTags {
    ward: string | null;
    micro_areas: string[];
    hub_id: string | null;
    station_id: string | null;
    station_name: string | null;
    near_station: boolean;
    walking_minutes: number | null;
    generated_at: string;
}

interface CategoryTags {
    primary: string;
    secondary: string;
    detailed: string;
    brand_name?: string;
    characteristics: {
        is_chain: boolean;
        is_24h: boolean;
        is_partner: boolean;
        price_range: number;
    };
}

interface AtmosphereCore {
    energy: 'lively' | 'calm' | 'bustling' | 'quiet' | 'cozy';
    style: 'modern' | 'traditional' | 'casual' | 'formal' | 'unique';
    crowd_level: 'empty' | 'sparse' | 'moderate' | 'crowded' | 'packed';
}

interface AtmosphereScenes {
    business: boolean;
    dating: boolean;
    family: boolean;
    solo: boolean;
    friends: boolean;
    tourist: boolean;
}

interface AtmosphereEnvironment {
    indoor: boolean;
    outdoor: boolean;
    rooftop: boolean;
    view: boolean;
    pet_friendly: boolean;
    smoking: 'allowed' | 'prohibited' | 'partial';
    noise_level: number;
}

interface AtmosphereTime {
    breakfast: boolean;
    lunch: boolean;
    dinner: boolean;
    late_night: boolean;
    all_day: boolean;
}

interface AtmosphereTags {
    core: AtmosphereCore;
    scenes: AtmosphereScenes;
    environment: AtmosphereEnvironment;
    time特性: AtmosphereTime;
    confidence: number;
    model_used: string;
    classified_at: string;
}

interface POIRecord {
    id: string;
    name: string;
    category: string;
    location_tags: LocationTags | null;
    category_tags: CategoryTags | null;
    atmosphere_tags: AtmosphereTags | null;
    location: string | null;
    tags_core: string[] | null;
    tags_intent: string[] | null;
    tags_visual: string[] | null;
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

interface QueryIntent {
    originalQuery: string;
    category: string | null;
    energy: string | null;
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night' | null;
    budget: number | null;
    keywords: string[];
    normalizedQuery: string;
}

interface POIDecisionResult {
    poiId: string;
    name: string;
    category: string;
    locationTags: LocationTags | null;
    categoryTags: CategoryTags | null;
    atmosphereTags: AtmosphereTags | null;
    tags_core?: string[];
    tags_intent?: string[];
    tags_visual?: string[];
    relevanceScore: number;
    matchedCriteria: string[];
    alternative?: POIDecisionResult[];
}

interface EngineConfig {
    enableRedisCache: boolean;
    enableQueryNormalization: boolean;
    enablePrefetch: boolean;
    enableSimilarityFallback: boolean;
    maxSimilarResults: number;
    similarityThreshold: number;
    cacheTTLSeconds: number;
    maxResults: number;
    redisPrefix: string;
}

// Default configuration with optimizations
const DEFAULT_CONFIG: EngineConfig = {
    enableRedisCache: true,
    enableQueryNormalization: true,
    enablePrefetch: false,
    enableSimilarityFallback: true,
    maxSimilarResults: 5,
    similarityThreshold: 0.6,
    cacheTTLSeconds: 3600,
    maxResults: 10,
    redisPrefix: 'poi:decisions'
};

// Category keyword mappings
const CATEGORY_KEYWORDS: Record<string, string[]> = {
    'dining': ['吃', '餐廳', '食物', '飯', '午餐', '晚餐', '日本料理', '拉麵', '壽司', '咖哩', '燒肉', '和食'],
    'shopping': ['買', '購物', '商店', '商場', '藥妝', '電器', '衣服', '超市'],
    'entertainment': ['玩', '遊樂', '景點', '博物館', '水族館', '樂園'],
    'cafe': ['咖啡', 'cafe', '下午茶', '甜點', '鬆餅'],
    'park': ['公園', '綠地', '散步', '賞櫻'],
    'service': ['銀行', '郵局', '診所', '藥局'],
    'transport': ['車站', '地鐵', '電車', '巴士']
};

// Energy keyword mappings
const ENERGY_KEYWORDS: Record<string, string[]> = {
    'lively': ['熱鬧', '熱闘', '人多', '熱烈', '繁華'],
    'quiet': ['安靜', '寧靜', '人少', '清靜', '幽靜'],
    'cozy': ['溫馨', '舒適', '悠閒', '輕鬆', '愜意'],
    'bustling': ['繁忙', '擁擠', '喧囂']
};

// Popular queries for prefetching
const POPULAR_QUERIES = [
    '日本料理',
    '咖啡廳',
    '拉麵',
    '壽司',
    '購物',
    '便宜的餐廳',
    '安靜的地方',
    '東京車站'
];

export class POITaggedDecisionEngine {
    private supabase: SupabaseClient;
    private redis: Redis | null;
    private config: EngineConfig;
    private localCache: Map<string, { data: POIDecisionResult[]; expiry: number }>;
    private queryStats: Map<string, number>;
    private normalizationCache: Map<string, string>;
    private prefetchStartupTimer: NodeJS.Timeout | null;
    private prefetchIntervalTimer: NodeJS.Timeout | null;

    constructor(
        supabaseUrl: string,
        supabaseKey: string,
        redisUrl?: string,
        config?: Partial<EngineConfig>
    ) {
        this.supabase = createClient(supabaseUrl, supabaseKey);
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.localCache = new Map();
        this.queryStats = new Map();
        this.normalizationCache = new Map();
        this.prefetchStartupTimer = null;
        this.prefetchIntervalTimer = null;

        // Initialize Redis if URL provided
        if (redisUrl && this.config.enableRedisCache) {
            try {
                this.redis = new Redis(redisUrl, {
                    maxRetriesPerRequest: 1,
                    enableReadyCheck: true,
                    lazyConnect: true
                } as any);
                this.redis.connect().catch(console.error);
            } catch (error) {
                console.warn('[POITaggedEngine] Redis connection failed:', error);
                this.redis = null;
            }
        } else {
            this.redis = null;
        }

        // Start prefetching popular queries
        if (this.config.enablePrefetch) {
            this.schedulePrefetch();
        }
    }

    /**
     * 查詢正規化 - 提升快取命中率
     */
    private normalizeQuery(query: string): string {
        // Check cache first
        if (this.normalizationCache.has(query)) {
            return this.normalizationCache.get(query)!;
        }

        let normalized = query.toLowerCase().trim();

        // Remove extra whitespace
        normalized = normalized.replace(/\s+/g, ' ');

        // Remove common fillers
        const fillers = ['我想', '我要', '想找', '要找', '請問', '幫我'];
        fillers.forEach(f => {
            normalized = normalized.replace(new RegExp(`^${f}\\s*`, 'g'), '');
        });

        // Sort keywords for consistency
        const keywords = normalized.split(' ').sort();
        normalized = keywords.join(' ');

        this.normalizationCache.set(query, normalized);

        // Keep cache size bounded
        if (this.normalizationCache.size > 10000) {
            const keys = Array.from(this.normalizationCache.keys());
            if (keys.length > 0) {
                this.normalizationCache.delete(keys[0]);
            }
        }

        return normalized;
    }

    /**
     * 根據用戶上下文和查詢進行 POI 決策
     */
    async decide(
        userContext: UserContext,
        query: string
    ): Promise<POIDecisionResult[]> {
        const startTime = Date.now();

        // Normalize query if enabled
        const normalizedQuery = this.config.enableQueryNormalization
            ? this.normalizeQuery(query)
            : query;

        const cacheKey = this.buildCacheKey(userContext, normalizedQuery);
        const intentKey = this.buildIntentKey(normalizedQuery);

        // Record query stats
        this.recordQueryStats(normalizedQuery);

        // Try Redis cache first
        if (this.config.enableRedisCache && this.redis) {
            try {
                const cached = await this.redis.get(cacheKey);
                if (cached) {
                    console.log(`[POITaggedEngine] Redis hit for: ${normalizedQuery}`);
                    const parsed = JSON.parse(cached);
                    this.recordCacheHit('redis');
                    return parsed;
                }
            } catch (error) {
                console.warn('[POITaggedEngine] Redis error, falling back to local cache');
            }
        }

        // Try local cache
        const cached = this.getFromLocalCache(cacheKey);
        if (cached) {
            console.log(`[POITaggedEngine] Local cache hit for: ${normalizedQuery}`);
            this.recordCacheHit('local');
            return cached;
        }

        console.log(`[POITaggedEngine] Processing query: ${normalizedQuery}`);

        try {
            // Parse query intent
            const intent = this.parseQueryIntent(normalizedQuery);
            intent.normalizedQuery = normalizedQuery;

            // Query by tags
            const candidates = await this.queryByTags(userContext, intent);

            let results: POIDecisionResult[];

            if (candidates.length === 0 && this.config.enableSimilarityFallback) {
                results = await this.fallbackToSimilar(userContext, intent);
            } else {
                results = this.rankAndFilter(candidates, userContext, intent);
            }

            // Cache results
            await this.cacheResults(cacheKey, results);

            const duration = Date.now() - startTime;
            console.log(`[POITaggedEngine] Completed in ${duration}ms, found ${results.length} results`);

            return results;

        } catch (error) {
            console.error('[POITaggedEngine] Error:', error);
            throw error;
        }
    }

    /**
     * 記錄查詢統計
     */
    private recordQueryStats(query: string): void {
        const count = (this.queryStats.get(query) || 0) + 1;
        this.queryStats.set(query, count);

        // Prefetch popular queries based on statistics
        if (count === 5 && this.config.enablePrefetch) {
            this.prefetchQuery(query);
        }
    }

    /**
     * 記錄快取命中
     */
    private recordCacheHit(type: 'redis' | 'local'): void {
        // This would be connected to metrics collector in production
    }

    /**
     * 預取查詢
     */
    private async prefetchQuery(query: string): Promise<void> {
        try {
            const intent = this.parseQueryIntent(query);
            const candidates = await this.queryByTags({}, intent);
            const results = this.rankAndFilter(candidates, {}, intent);

            const cacheKey = this.buildCacheKey({}, query);
            await this.cacheResults(cacheKey, results);

            console.log(`[POITaggedEngine] Prefetched: ${query}`);
        } catch (error) {
            // Silent fail for prefetch
        }
    }

    /**
     * 排程預取熱門查詢
     */
    private schedulePrefetch(): void {
        if (this.prefetchStartupTimer) clearTimeout(this.prefetchStartupTimer);
        if (this.prefetchIntervalTimer) clearInterval(this.prefetchIntervalTimer);

        this.prefetchStartupTimer = setTimeout(async () => {
            for (const query of POPULAR_QUERIES) {
                await this.prefetchQuery(query);
            }
            console.log('[POITaggedEngine] Prefetched popular queries');
        }, 1000);
        this.prefetchStartupTimer.unref?.();

        this.prefetchIntervalTimer = setInterval(async () => {
            for (const query of POPULAR_QUERIES) {
                await this.prefetchQuery(query);
            }
        }, 5 * 60 * 1000);
        this.prefetchIntervalTimer.unref?.();
    }

    private clearPrefetchTimers(): void {
        if (this.prefetchStartupTimer) {
            clearTimeout(this.prefetchStartupTimer);
            this.prefetchStartupTimer = null;
        }
        if (this.prefetchIntervalTimer) {
            clearInterval(this.prefetchIntervalTimer);
            this.prefetchIntervalTimer = null;
        }
    }

    /**
     * 解析查詢意圖
     */
    private parseQueryIntent(query: string): QueryIntent {
        const lowerQuery = query.toLowerCase();
        const keywords = lowerQuery.split(/\s+/);

        // Detect category
        let category: string | null = null;
        for (const [cat, catKeywords] of Object.entries(CATEGORY_KEYWORDS)) {
            if (catKeywords.some(k => lowerQuery.includes(k))) {
                category = cat;
                break;
            }
        }

        // Detect energy
        let energy: string | null = null;
        for (const [e, eKeywords] of Object.entries(ENERGY_KEYWORDS)) {
            if (eKeywords.some(k => lowerQuery.includes(k))) {
                energy = e;
                break;
            }
        }

        // Detect time of day
        let timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night' | null = null;
        if (lowerQuery.includes('早上') || lowerQuery.includes('早餐') || lowerQuery.includes('朝')) {
            timeOfDay = 'morning';
        } else if (lowerQuery.includes('下午') || lowerQuery.includes('午餐') || lowerQuery.includes('昼')) {
            timeOfDay = 'afternoon';
        } else if (lowerQuery.includes('晚上') || lowerQuery.includes('晚餐') || lowerQuery.includes('夜')) {
            timeOfDay = 'night';
        }

        // Detect budget
        let budget: number | null = null;
        if (lowerQuery.includes('便宜') || lowerQuery.includes('平價') || lowerQuery.includes('省錢')) {
            budget = 1;
        } else if (lowerQuery.includes('高檔') || lowerQuery.includes('高級') || lowerQuery.includes('奢華')) {
            budget = 4;
        } else if (lowerQuery.includes('中檔') || lowerQuery.includes('中等') || lowerQuery.includes('一般')) {
            budget = 2;
        }

        return {
            originalQuery: query,
            category,
            energy,
            timeOfDay,
            budget,
            keywords,
            normalizedQuery: query
        };
    }

    /**
     * 根據標籤查詢 POI
     */
    private async queryByTags(
        userContext: UserContext,
        intent: QueryIntent
    ): Promise<POIDecisionResult[]> {
        let queryBuilder = this.supabase
            .from('l1_places')
            .select(`
                id,
                name,
                category,
                location_tags,
                category_tags,
                atmosphere_tags,
                location,
                tags_core,
                tags_intent,
                tags_visual
            `)
            .not('category', 'is', null);

        if (intent.category) {
            queryBuilder = queryBuilder.eq('category', intent.category);
        } else if (intent.keywords.length > 0) {
            // Flexible matching fallback (handled in memory or via array overlap if supported)
        }

        if (userContext.preferences?.categories?.length) {
            queryBuilder = queryBuilder.in('category', userContext.preferences.categories);
        }

        queryBuilder = queryBuilder.limit(200);

        const { data, error } = await queryBuilder;

        if (error) {
            console.error('[POITaggedEngine] Query error:', error);
            return [];
        }

        return (data || []).map(poi =>
            this.mapToDecisionResult(poi as POIRecord, intent)
        );
    }

    /**
     * 映射資料庫記錄到決策結果
     */
    private mapToDecisionResult(poi: POIRecord, intent: QueryIntent): POIDecisionResult {
        const categoryTags = poi.category_tags;
        const atmosphereTags = poi.atmosphere_tags;
        const matchedCriteria: string[] = [];
        const keywords = intent.keywords;

        // --- 3-5-8 Matches (New) ---
        if (poi.tags_core?.some(tag => keywords.some(k => tag.includes(k) || k.includes(tag)))) {
            matchedCriteria.push('關鍵字匹配');
        }
        if (poi.tags_intent?.some(tag => keywords.some(k => tag.includes(k) || k.includes(tag)))) {
            matchedCriteria.push('意圖符合');
        }
        if (poi.tags_visual?.some(tag => keywords.some(k => tag.includes(k) || k.includes(tag)))) {
            matchedCriteria.push('風格符合');
        }

        // --- Original Criteria ---
        if (poi.category === intent.category) {
            matchedCriteria.push(`類別:${intent.category}`);
        }

        if (atmosphereTags?.core?.energy === intent.energy) {
            matchedCriteria.push(`氣氛:${intent.energy}`);
        }

        if (categoryTags?.characteristics?.price_range === intent.budget) {
            matchedCriteria.push(`預算:${intent.budget}`);
        }

        if (this.matchesTimeOfDay(atmosphereTags, intent.timeOfDay)) {
            matchedCriteria.push('適合時段');
        }

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
            locationTags: poi.location_tags,
            categoryTags: categoryTags || null,
            atmosphereTags: atmosphereTags || null,
            tags_core: poi.tags_core || [],
            tags_intent: poi.tags_intent || [],
            tags_visual: poi.tags_visual || [],
            relevanceScore,
            matchedCriteria: [...new Set(matchedCriteria)]
        };
    }

    /**
     * 計算相關性分數
     */
    private calculateRelevanceScore(
        poi: POIRecord,
        intent: QueryIntent,
        categoryTags: CategoryTags | null,
        atmosphereTags: AtmosphereTags | null
    ): number {
        let score = 0;

        // Base Score from Category (Reliable)
        if (poi.category === intent.category) score += 0.3;

        const keywords = intent.keywords;

        // --- 3-5-8 Strategy Boosts ---
        // Core Tags (The thing itself) - High confidence
        if (poi.tags_core?.some(t => keywords.some(k => t.includes(k) || k.includes(t)))) {
            score += 0.3;
        }

        // Intent Tags (Context/Action) - Medium confidence context
        if (poi.tags_intent?.some(t => keywords.some(k => t.includes(k) || k.includes(t)))) {
            score += 0.2;
        }

        // Visual Tags (Vibe) - Bonus
        if (poi.tags_visual?.some(t => keywords.some(k => t.includes(k) || k.includes(t)))) {
            score += 0.1;
        }

        // --- Original Attribute Boosts ---
        if (atmosphereTags?.core?.energy === intent.energy) score += 0.1;
        if (categoryTags?.characteristics?.price_range === intent.budget) score += 0.1;
        if (categoryTags?.characteristics?.is_chain) score += 0.05;

        return Math.min(1, score);
    }

    /**
     * 檢查是否匹配時段
     */
    private matchesTimeOfDay(
        atmosphereTags: AtmosphereTags | null,
        timeOfDay: string | null
    ): boolean {
        if (!timeOfDay || !atmosphereTags) return false;

        const timeProps = atmosphereTags.time特性;
        switch (timeOfDay) {
            case 'morning': return timeProps.breakfast;
            case 'afternoon': return timeProps.lunch;
            case 'evening':
            case 'night': return timeProps.dinner || timeProps.late_night;
            default: return false;
        }
    }

    /**
     * 降級到相似 POI
     */
    private async fallbackToSimilar(
        userContext: UserContext,
        intent: QueryIntent
    ): Promise<POIDecisionResult[]> {
        console.log('[POITaggedEngine] Using similarity fallback');

        const { data } = await this.supabase
            .from('l1_poi_similarities')
            .select(`
                similar_poi_id,
                similarity_score,
                recommendation_reason
            `)
            .gte('similarity_score', this.config.similarityThreshold)
            .limit(this.config.maxSimilarResults * 2);

        if (!data || data.length === 0) {
            return [];
        }

        const poiIds = [...new Set(data.map(d => d.similar_poi_id))];

        const { data: pois } = await this.supabase
            .from('l1_places')
            .select('*')
            .in('id', poiIds);

        const poiMap = new Map((pois || []).map(p => [p.id, p]));

        return (data || []).map(item => {
            const poi = poiMap.get(item.similar_poi_id);
            const baseResult = poi ? this.mapToDecisionResult(poi as POIRecord, intent) : null;
            return {
                ...baseResult!,
                poiId: item.similar_poi_id,
                name: poi?.name || 'Unknown',
                category: poi?.category || 'unknown',
                relevanceScore: item.similarity_score,
                matchedCriteria: ['相似推薦']
            };
        });
    }

    /**
     * 排序和過濾結果
     */
    private rankAndFilter(
        candidates: POIDecisionResult[],
        userContext: UserContext,
        intent: QueryIntent
    ): POIDecisionResult[] {
        let filtered = candidates.filter(c => c.relevanceScore >= 0.3);
        filtered.sort((a, b) => b.relevanceScore - a.relevanceScore);
        return filtered.slice(0, this.config.maxResults);
    }

    /**
     * 建構快取鍵
     */
    private buildCacheKey(userContext: UserContext, query: string): string {
        const parts = [
            this.config.redisPrefix,
            query,
            userContext.preferences?.categories?.join(',') || 'any'
        ];
        return parts.join(':');
    }

    /**
     * 建構意圖鍵（用於統計）
     */
    private buildIntentKey(query: string): string {
        return `intent:${query}`;
    }

    /**
     * 快取結果
     */
    private async cacheResults(key: string, results: POIDecisionResult[]): Promise<void> {
        const serialized = JSON.stringify(results);
        const ttl = this.config.cacheTTLSeconds;

        // Local cache
        this.localCache.set(key, {
            data: results,
            expiry: Date.now() + ttl * 1000
        });

        // Redis cache
        if (this.config.enableRedisCache && this.redis) {
            try {
                await this.redis.setex(key, ttl, serialized);
            } catch (error) {
                console.warn('[POITaggedEngine] Redis cache error:', error);
            }
        }
    }

    /**
     * 從本地快取獲取
     */
    private getFromLocalCache(key: string): POIDecisionResult[] | null {
        const cached = this.localCache.get(key);
        if (cached && cached.expiry > Date.now()) {
            return cached.data;
        }
        this.localCache.delete(key);
        return null;
    }

    /**
     * 清除快取
     */
    clearCache(): void {
        this.localCache.clear();
        this.queryStats.clear();
        this.normalizationCache.clear();

        if (this.redis) {
            this.redis.flushdb().catch(console.error);
        }
    }

    /**
     * 清除過期快取
     */
    cleanupExpiredCache(): number {
        const now = Date.now();
        let cleaned = 0;

        for (const [key, value] of this.localCache.entries()) {
            if (value.expiry <= now) {
                this.localCache.delete(key);
                cleaned++;
            }
        }

        return cleaned;
    }

    /**
     * 獲取快取統計
     */
    getCacheStats(): {
        localSize: number;
        statsSize: number;
        topQueries: [string, number][];
        hitRate?: number;
    } {
        const topQueries = [...this.queryStats.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        return {
            localSize: this.localCache.size,
            statsSize: this.queryStats.size,
            topQueries
        };
    }

    /**
     * 獲取熱門查詢
     */
    getPopularQueries(limit: number = 10): string[] {
        return [...this.queryStats.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([query]) => query);
    }

    /**
     * 關閉連接
     */
    async close(): Promise<void> {
        this.clearPrefetchTimers();
        if (this.redis) {
            await this.redis.quit();
        }
    }
}

// Factory function
export function createPOITaggedEngine(
    supabaseUrl: string,
    supabaseKey: string,
    redisUrl?: string,
    config?: Partial<EngineConfig>
): POITaggedDecisionEngine {
    return new POITaggedDecisionEngine(supabaseUrl, supabaseKey, redisUrl, config);
}
