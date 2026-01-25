
import { StationUIProfile, L4Knowledge } from '@/lib/types/stationStandard';
import { generateLLMResponse } from '@/lib/ai/llmClient';
import { searchL4Knowledge } from '@/lib/l4/searchService';
import { supabaseAdmin } from '@/lib/supabase';

import { getL2StatusCached } from '@/lib/cache/l2CacheService';
import { getCached } from '@/lib/cache/redisCacheService';

// L2 Status Fetcher (Delegated to specialized cache service)
async function fetchL2Status(stationId: string): Promise<any> {
    try {
        const status = await getL2StatusCached(stationId);
        if (status) return status;
    } catch (e) {
        console.warn('[DataMux] L2 Cache Service failed, falling back to snapshot', e);
    }

    // Fallback: Old Snapshot (Weather/Crowd only)
    const { data } = await supabaseAdmin
        .from('transit_dynamic_snapshot')
        .select('weather_info, crowd_level')
        .eq('station_id', stationId)
        .maybeSingle();
    return data || {};
}

// L3 Facility Fetcher (Cached 1h)
async function fetchL3Facilities(stationId: string): Promise<any> {
    return getCached(
        `l3:facilities:${stationId}`,
        async () => {
            const { data } = await supabaseAdmin
                .from('station_facilities')
                .select('*')
                .eq('station_id', stationId)
                .maybeSingle();
            return data || {};
        },
        3600 // 1 hour TTL
    );
}

interface DataMuxContext {
    userId: string;
    locale: string;
    userProfile?: string; // e.g. 'wheelchair', 'tourist'
    time?: Date;
}

export class DataMux {
    /**
     * Enriches raw station data with Context-Aware Intelligence (MiniMax)
     */

    static async enrichStationData(
        stationId: string,
        context: DataMuxContext
    ): Promise<Partial<StationUIProfile>> {
        console.log(`[DataMux] Fast Aggregation for ${stationId}`);

        // 1. Parallel Fetch of Raw Data
        // We skip the heavy "Brain" LLM synthesis in favor of speed (Optimistic UI)
        // 1. Parallel Fetch of Raw Data (Resilient)
        // We use allSettled to ensure that if L3/L4 caches fail (Redis/API down), 
        // L2 (Weather/Crowd) or basic partial data is still returned.
        const results = await Promise.allSettled([
            fetchL2Status(stationId),
            fetchL3Facilities(stationId),
            getCached(
                `l4:tips:${stationId}`,
                () => searchL4Knowledge({
                    query: `Important tips for ${stationId}`,
                    stationId: stationId,
                    topK: 5
                }),
                1800 // 30 min TTL
            )
        ]);

        const l2Data = results[0].status === 'fulfilled' ? results[0].value : {};
        if (results[0].status === 'rejected') console.warn('[DataMux] L2 Fetch Failed', results[0].reason);

        const l3Data = results[1].status === 'fulfilled' ? results[1].value : {};
        if (results[1].status === 'rejected') console.warn('[DataMux] L3 Fetch Failed', results[1].reason);

        const l4Knowledge = results[2].status === 'fulfilled' ? results[2].value : [];
        if (results[2].status === 'rejected') console.warn('[DataMux] L4 Fetch Failed', results[2].reason);

        // 2. Direct Aggregation (No LLM Latency)
        // We construct the UI Profile directly from raw signals.
        // Frontend will handle the "Brain" or "Insight" visualization if needed via separate stream.

        const enrichedData: any = {
            // L2: Weather & Crowd
            l2_status: l2Data, // Pass full L2 object (lines, weather, crowd) to frontend
            weather_condition: l2Data.weather_info?.condition || 'Unknown',
            crowd_level: l2Data.crowd_level || 'low',

            // L3: Facilities
            facilities: {
                has_elevator: l3Data.has_elevator || false,
                has_escalator: l3Data.has_escalator || false,
                has_waiting_room: l3Data.has_waiting_room || false,
                toilet_location: l3Data.toilet_location || 'Unknown'
            },

            // L4: Knowledge Cards (Top 3)
            // We return raw cards so frontend can render them immediately
            l4_cards: l4Knowledge.slice(0, 3).map(k => ({
                id: k.id,
                title: { ja: 'トラベルチップ', en: 'Travel Tip', zh: '旅遊攻略' },
                description: typeof k.content === 'object' ? k.content : { ja: k.content, en: k.content, zh: k.content },
                type: k.knowledge_type,
                tags: k.tags
            })),

            // Metadata
            last_updated: new Date().toISOString()
        };

        // 3. Return immediately
        return {
            id: stationId,
            ...enrichedData
        };
    }



    /**
     * Skill Support: Vibe Matcher (Deep Research Scenario 1)
     * Finds places with similar vibe vectors (Cosine Similarity).
     */
    static async findSimilarVibePlaces(anchorStationId: string, limit = 3): Promise<any[]> {
        try {
            // 1. Get Anchor Embedding
            const { data: anchor } = await supabaseAdmin
                .from('l1_places')
                .select('vibe_embedding, location')
                .eq('location_tags->>station_id', anchorStationId) // Assuming mapping, or use id directly if anchor is a place
                .limit(1)
                .maybeSingle();

            // Fallback if no specific anchor place found, try to get representative embedding of station
            // For MVP: We return simulated data if no embedding
            if (!anchor?.vibe_embedding) {
                console.warn('[DataMux] No vibe embedding found for anchor, using simulation.');
                return this.getSimulatedVibeResults(anchorStationId);
            }

            // 2. Call RPC
            const { data, error } = await supabaseAdmin.rpc('match_l1_vibes', {
                query_embedding: anchor.vibe_embedding,
                match_threshold: 0.8,
                match_count: limit,
                filter_crowd_max: 2 // Filter out crowded places
            });

            if (error) throw error;
            return data || [];

        } catch (e) {
            console.error('[DataMux] Vibe Search failed:', e);
            return this.getSimulatedVibeResults(anchorStationId);
        }
    }

    private static getSimulatedVibeResults(anchor: string) {
        // Fallback for Demo without real vectors
        return [
            { id: 'sim-1', name: 'Shibamata (柴又)', similarity: 0.92, crowd_level: 1, reason: 'Similar traditional temple town vibe but much quieter.' },
            { id: 'sim-2', name: 'Yanaka Ginza (谷中銀座)', similarity: 0.88, crowd_level: 2, reason: 'Old Tokyo atmosphere with local shopping street.' },
        ];
    }

    /**
     * Skill Support: Spatial Reasoner (Deep Research Scenario 2)
     * Finds alternative stations and calculates basic geometry.
     */
    static async getAlternativeStations(currentStationId: string, targetDestination?: string): Promise<any[]> {
        // Mock spatial logic for MVP
        // In real impl: PostGIS queries to find stations within 1.5km

        console.log(`[DataMux] Spatial Search: Nearby ${currentStationId} -> ${targetDestination}`);

        const alternatives = [
            {
                station_id: 'odpt:Station:TokyoMetro.Marunouchi.NishiShinjuku',
                name: { en: 'Nishi-Shinjuku', ja: '西新宿', zh: '西新宿' },
                line: 'Marunouchi Line',
                distance_to_dest: 400, // meters (simulated)
                walk_time_min: 5
            },
            {
                station_id: 'odpt:Station:Toei.Oedo.Tochomae',
                name: { en: 'Tochomae', ja: '都庁前', zh: '都廳前' },
                line: 'Oedo Line',
                distance_to_dest: 100, // meters (simulated)
                walk_time_min: 2
            }
        ];

        return alternatives;
    }

    /**
     * Skill Support: Facility Pathfinder (Scenario 3)
     * Retrieves detailed facility nodes for pathfinding.
     */
    static async getFacilityGraph(stationId: string): Promise<any> {
        const { data } = await supabaseAdmin
            .from('l3_facilities')
            .select('*')
            .eq('station_id', stationId);
        return data || [];
    }

    /**
     * Skill Support: Luggage Logistics (Policy: Hands-Free)
     * Checks real-time locker availability and nearby storage services.
     */
    static async checkLockerStatus(stationId: string): Promise<any> {
        // Mock Data for MVP
        // In real impl: Connect to station-locker-api or IoT sensors
        return {
            lockers: [
                { location: 'Exit East', size: 'Large', status: 'full', total: 10, available: 0 },
                { location: 'Exit South', size: 'Medium', status: 'available', total: 20, available: 5 }
            ],
            nearbyStorage: [
                { name: 'Sagawa Hands-Free Center', location: 'South Exit via 2F', hours: '08:00-20:00', price: '800 JPY' }
            ]
        };
    }

    /**
     * Skill Support: Last Mile Connector (Policy: Traffic Vacuum)
     * Searches for micro-mobility options (Bus, Luup, Taxi).
     */
    static async searchMicroMobility(stationId: string, destination?: string): Promise<any> {
        // Mock Data for MVP
        // In real impl: Connect to Luup API / Bus GTFS
        return {
            bus: [
                { name: 'Hachiko Bus', route: 'Yoyogi Route', next_departure: '10:15', stop: 'South Exit Bus Stop 3' }
            ],
            luup: [
                { port: 'Station South Park', battery: 'High', count: 5, distance_to_dest: '200m' }
            ],
            taxi: {
                stand_location: 'West Exit Rotary',
                estimated_wait: '5 mins'
            }
        };
    }

    /**
     * Skill Support: Expert Knowledge RAG (Phase 4)
     * Simulates vector search for unstructured rules (Fares, Passes).
     */
    static async searchExpertRules(query: string): Promise<any[]> {
        console.log(`[DataMux] Searching Expert Rules for: "${query}"`);

        // Cache Key: normalize query to lowercase and trim
        return getCached(
            `expert_rules:${query.trim().toLowerCase()}`,
            async () => {
                // 1. Try Vector Search first
                try {
                    const { EmbeddingService } = await import('@/lib/ai/embeddingService');
                    const embedding = await EmbeddingService.generateEmbedding(query);
                    // Check if it's a real embedding (not zero vector mock)
                    const isRealEmbedding = embedding.some(v => v !== 0);

                    if (isRealEmbedding) {
                        // Use a local createClient or import shared one if possible, but SignalCollector has logic.
                        // For now, instantiate client directly for read-only RPC.
                        const { createClient } = await import('@supabase/supabase-js');
                        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
                        const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

                        if (supabaseUrl && supabaseKey) {
                            const supabase = createClient(supabaseUrl, supabaseKey);
                            const { data: vectorResults, error } = await supabase.rpc('match_expert_knowledge', {
                                query_embedding: embedding,
                                match_threshold: 0.7,
                                match_count: 3
                            });

                            if (!error && vectorResults && vectorResults.length > 0) {
                                console.log(`[DataMux] Vector Search found ${vectorResults.length} hits.`);
                                return vectorResults.map((r: any) => ({
                                    id: r.id,
                                    content: r.content,
                                    tags: ['vector-match'],
                                    similarity: r.similarity
                                }));
                            }
                        }
                    } else {
                        console.log('[DataMux] Using Mock Search (No Logic/API Key for Embeddings)');
                    }
                } catch (e) {
                    console.warn('[DataMux] Vector Search failed, falling back to Mock:', e);
                }

                // 2. Fallback: Mock Knowledge Base (Unstructured Text)
                const ruleBase = [
                    {
                        id: 'rule-child-fare',
                        content: 'Child Fare (6-11 yo) is 50% of Adult Fare. Toddlers (1-5 yo) are FREE (up to 2 per adult). Infants (<1 yo) are always FREE.',
                        tags: ['fare', 'child', 'toddler', 'baby', 'price']
                    },
                    {
                        id: 'rule-jr-pass-subway',
                        content: 'The Japan Rail Pass (JR Pass) is VALID on JR Lines (Yamanote, Chuo, etc.) and Tokyo Monorail. It is NOT valid on Tokyo Metro or Toei Subway lines.',
                        tags: ['jr pass', 'subway', 'metro', 'ticket', 'validity']
                    },
                    {
                        id: 'rule-transfer-discount',
                        content: 'Transferring between Tokyo Metro and Toei Subway within 60 minutes grants a 70 JPY discount on the total fare (Adult).',
                        tags: ['transfer', 'discount', 'metro', 'toei', 'price']
                    },
                    {
                        id: 'rule-suica-pasmo',
                        content: 'Suica and Pasmo are fully interchangeable. You can use either card on almost all trains, subways, and buses in Tokyo.',
                        tags: ['ic card', 'suica', 'pasmo', 'compatibility']
                    }
                ];

                // Simple Keyword Matching Simulation (Vector Search Proxy)
                const lowerQuery = query.toLowerCase();
                const results = ruleBase.filter(rule =>
                    rule.tags.some(tag => lowerQuery.includes(tag)) ||
                    rule.content.toLowerCase().includes(lowerQuery)
                );

                // If no match, return generic fare rule as fallback
                if (results.length === 0) {
                    return [ruleBase[0]];
                }

                return results;
            },
            3600 // 1 hour TTL
        );

    }
}

