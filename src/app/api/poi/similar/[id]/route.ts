/**
 * Similar POI API Endpoint
 * Phase 4: 相似 POI 查詢 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type AnySupabase = ReturnType<typeof createClient<any>>;

let supabase: AnySupabase | null = null;

function getSupabase(): AnySupabase {
    if (supabase) return supabase;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase credentials');
    }

    supabase = createClient<any>(supabaseUrl, supabaseKey);
    return supabase;
}

// GET /api/poi/similar/[id]
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const poiId = params.id;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const minSimilarity = parseFloat(searchParams.get('minSimilarity') || '0.4');

    console.log(`[SimilarPOI] Getting similar POIs for: ${poiId}`);

    try {
        // First get similar POI IDs
        const { data: similarities, error } = await getSupabase()
            .from('l1_poi_similarities')
            .select(`
                similar_poi_id,
                similarity_score,
                common_tags,
                recommendation_reason
            `)
            .eq('poi_id', poiId)
            .gte('similarity_score', minSimilarity)
            .lte('expires_at', '9999-12-31')
            .order('similarity_score', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('[SimilarPOI] Supabase error:', error);
            throw error;
        }

        if (!similarities || similarities.length === 0) {
            return NextResponse.json({
                success: true,
                data: {
                    sourcePoiId: poiId,
                    resultCount: 0,
                    results: []
                }
            });
        }

        // Get POI details
        const poiIds = similarities.map(s => s.similar_poi_id);
        const { data: pois, error: poiError } = await getSupabase()
            .from('l1_places')
            .select('id, name, category, location')
            .in('id', poiIds);

        if (poiError) {
            console.error('[SimilarPOI] POI fetch error:', poiError);
            throw poiError;
        }

        // Map results
        const poiMap = new Map((pois || []).map(p => [p.id, p]));

        const results = similarities.map(item => {
            const poi = poiMap.get(item.similar_poi_id);
            return {
                poiId: item.similar_poi_id,
                name: poi?.name || 'Unknown',
                category: poi?.category || 'unknown',
                location: poi?.location || null,
                similarity: Math.round((item.similarity_score || 0) * 1000) / 1000,
                commonTags: item.common_tags || [],
                reason: item.recommendation_reason
            };
        });

        return NextResponse.json({
            success: true,
            data: {
                sourcePoiId: poiId,
                resultCount: results.length,
                results
            }
        });

    } catch (error) {
        console.error('[SimilarPOI] Error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
