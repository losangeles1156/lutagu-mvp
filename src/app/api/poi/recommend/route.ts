/**
 * POI Recommendation API Endpoint
 * Phase 4: AI 混合型智慧引擎整合 API (Optimized)
 */

import { NextRequest, NextResponse } from 'next/server';
import { POITaggedDecisionEngine } from '@/lib/ai/poi-tagged-decision-engine';

let poiEngine: POITaggedDecisionEngine | null = null;

function getPoiEngine(): POITaggedDecisionEngine {
    if (poiEngine) return poiEngine;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    const redisUrl = process.env.REDIS_URL;

    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase credentials');
    }

    poiEngine = new POITaggedDecisionEngine(supabaseUrl, supabaseKey, redisUrl, {
        enableRedisCache: !!redisUrl,
        enableQueryNormalization: true,
        enablePrefetch: true,
        enableSimilarityFallback: true,
        maxSimilarResults: 5,
        similarityThreshold: 0.6,
        cacheTTLSeconds: 3600,
        maxResults: 10,
        redisPrefix: 'poi:decisions'
    });

    return poiEngine;
}

// POST /api/poi/recommend
export async function POST(request: NextRequest) {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    console.log(`[${requestId}] POI Recommend API called`);

    try {
        const body = await request.json();
        const { 
            query, 
            userId, 
            location, 
            preferences,
            limit = 10 
        } = body;

        if (!query || typeof query !== 'string') {
            return NextResponse.json({
                success: false,
                error: 'Missing or invalid query parameter',
                requestId
            }, { status: 400 });
        }

        if (query.length < 2 || query.length > 200) {
            return NextResponse.json({
                success: false,
                error: 'Query must be between 2 and 200 characters',
                requestId
            }, { status: 400 });
        }

        const userContext = {
            userId,
            preferences: preferences ? {
                categories: preferences.categories,
                priceRange: preferences.priceRange,
                atmosphere: preferences.atmosphere,
                energy: preferences.energy
            } : undefined,
            location: location ? {
                lat: parseFloat(location.lat),
                lng: parseFloat(location.lng)
            } : undefined,
            time: new Date()
        };

        const results = await getPoiEngine().decide(userContext, query);
        const limitedResults = results.slice(0, limit);

        const response = {
            success: true,
            data: {
                query,
                resultCount: limitedResults.length,
                results: limitedResults.map(result => ({
                    poiId: result.poiId,
                    name: result.name,
                    categoryType: result.category,
                    relevanceScore: Math.round(result.relevanceScore * 100) / 100,
                    matchedCriteria: result.matchedCriteria,
                    location: {
                        station: result.locationTags?.station_name,
                        ward: result.locationTags?.ward,
                        walkingMinutes: result.locationTags?.walking_minutes
                    },
                    categoryInfo: {
                        primary: result.categoryTags?.primary,
                        secondary: result.categoryTags?.secondary,
                        isChain: result.categoryTags?.characteristics?.is_chain,
                        priceRange: result.categoryTags?.characteristics?.price_range
                    },
                    atmosphere: result.atmosphereTags ? {
                        energy: result.atmosphereTags.core?.energy,
                        style: result.atmosphereTags.core?.style,
                        scenes: result.atmosphereTags.scenes,
                        confidence: result.atmosphereTags.confidence
                    } : null,
                    alternativeCount: result.alternative?.length || 0
                })),
                fallbackUsed: results.some(r => r.alternative && r.alternative.length > 0)
            },
            metadata: {
                requestId,
                engine: 'poi_tagged_optimized',
                timestamp: new Date().toISOString()
            }
        };

        console.log(`[${requestId}] Completed with ${limitedResults.length} results`);
        return NextResponse.json(response);

    } catch (error) {
        console.error(`[${requestId}] Error:`, error);
        
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            requestId
        }, { status: 500 });
    }
}

// GET /api/poi/recommend
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query) {
        return NextResponse.json({
            success: false,
            error: 'Missing query parameter q'
        }, { status: 400 });
    }

    try {
        const results = await getPoiEngine().decide(
            { userId: userId || undefined },
            query
        );

        return NextResponse.json({
            success: true,
            data: {
                query,
                resultCount: results.length,
                results: results.slice(0, limit)
            }
        });

    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to get recommendations'
        }, { status: 500 });
    }
}
