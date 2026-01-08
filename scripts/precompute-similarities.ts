/**
 * Phase 3: Similar POI Precomputation Script
 * 
 * Purpose: Precompute similar POIs based on tags (location, category, atmosphere)
 * This enables fast similarity lookups without real-time computation
 * 
 * Usage:
 *   npx tsx scripts/precompute-similarities.ts \
 *     --batch-size 100 \
 *     --min-similarity 0.4 \
 *     --max-per-poi 20 \
 *     --workers 4
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Configuration
interface Config {
    batchSize: number;
    minSimilarity: number;
    maxPerPOI: number;
    workers: number;
    similarityWeights: {
        category: number;
        location: number;
        atmosphere: number;
        price: number;
    };
}

const config: Config = {
    batchSize: parseInt(process.argv.find(a => a.startsWith('--batch-size'))?.split('=')[1] || '100'),
    minSimilarity: parseFloat(process.argv.find(a => a.startsWith('--min-similarity'))?.split('=')[1] || '0.4'),
    maxPerPOI: parseInt(process.argv.find(a => a.startsWith('--max-per-poi'))?.split('=')[1] || '20'),
    workers: parseInt(process.argv.find(a => a.startsWith('--workers'))?.split('=')[1] || '4'),
    similarityWeights: {
        category: 0.30,
        location: 0.25,
        atmosphere: 0.25,
        price: 0.10,
    },
};

interface POI {
    id: string;
    name: string;
    category: string;
    location_tags: Record<string, unknown> | null;
    category_tags: Record<string, unknown> | null;
    atmosphere_tags: Record<string, unknown> | null;
    coordinates: { x: number; y: number } | null;
}

interface SimilarityBreakdown {
    category_score: number;
    location_score: number;
    atmosphere_score: number;
    price_score: number;
    popularity_score: number;
}

interface PrecomputedSimilarity {
    poi_id: string;
    similar_poi_id: string;
    similarity_score: number;
    similarity_breakdown: SimilarityBreakdown;
    common_tags: string[];
    recommendation_reason: string;
    computed_at: string;
    expires_at: string;
}

// Semaphore for concurrency control
class Semaphore {
    private count: number;
    private queue: (() => void)[];

    constructor(count: number) {
        this.count = count;
        this.queue = [];
    }

    async acquire(): Promise<void> {
        if (this.count > 0) {
            this.count--;
            return;
        }
        return new Promise(resolve => this.queue.push(resolve));
    }

    release(): void {
        this.count++;
        if (this.queue.length > 0) {
            this.count--;
            const next = this.queue.shift();
            if (next) next();
        }
    }
}

function getParentCategory(category: string): string {
    const parentMap: Record<string, string> = {
        'dining': 'dining',
        'shopping': 'shopping',
        'entertainment': 'entertainment',
        'service': 'service',
        'park': 'park',
        'transport': 'transport',
        'japanese_food': 'dining',
        'western_food': 'dining',
        'cafe': 'dining',
        'izakaya': 'dining',
        'convenience': 'shopping',
        'department': 'shopping',
        'electronics': 'shopping',
    };
    return parentMap[category] || 'other';
}

function calculateCategorySimilarity(poi1: POI, poi2: POI): number {
    if (poi1.category === poi2.category) return 1.0;
    if (getParentCategory(poi1.category) === getParentCategory(poi2.category)) return 0.7;
    return 0.0;
}

function calculateLocationSimilarity(poi1: POI, poi2: POI): number {
    const loc1 = poi1.location_tags;
    const loc2 = poi2.location_tags;
    
    // Same station = 1.0
    if (loc1?.station_id === loc2?.station_id) return 1.0;
    if (loc1?.hub_id === loc2?.hub_id) return 0.9;
    
    // Same ward = 0.8
    if (loc1?.ward === loc2?.ward) return 0.8;
    
    // Calculate distance if coordinates available
    if (poi1.coordinates && poi2.coordinates) {
        const distance = Math.sqrt(
            Math.pow(poi1.coordinates.x - poi2.coordinates.x, 2) +
            Math.pow(poi1.coordinates.y - poi2.coordinates.y, 2)
        );
        // Approximate: 1 degree ≈ 111km
        const distanceKm = distance * 111;
        
        if (distanceKm <= 0.5) return 0.6;
        if (distanceKm <= 1) return 0.5;
        if (distanceKm <= 2) return 0.4;
        if (distanceKm <= 5) return 0.2;
    }
    
    return 0.1;
}

function calculateAtmosphereSimilarity(poi1: POI, poi2: POI): number {
    const atm1 = poi1.atmosphere_tags;
    const atm2 = poi2.atmosphere_tags;
    
    if (!atm1 || !atm2) return 0.5; // Default when no atmosphere data
    
    const core1 = atm1.core as Record<string, string> | undefined;
    const core2 = atm2.core as Record<string, string> | undefined;
    
    if (!core1 || !core2) return 0.5;
    
    // Energy similarity
    const energySim = core1.energy === core2.energy ? 1.0 : 0.5;
    
    // Style similarity
    const styleSim = core1.style === core2.style ? 1.0 : 0.6;
    
    // Scenes overlap
    const scenes1 = atm1.scenes as Record<string, boolean> | undefined;
    const scenes2 = atm2.scenes as Record<string, boolean> | undefined;
    let sceneOverlap = 0;
    let sceneCount = 0;
    
    if (scenes1 && scenes2) {
        const keys = Object.keys(scenes1);
        for (const key of keys) {
            if (scenes1[key] && scenes2[key]) sceneOverlap++;
            if (scenes1[key] || scenes2[key]) sceneCount++;
        }
        sceneOverlap = sceneCount > 0 ? sceneOverlap / sceneCount : 0;
    }
    
    return energySim * 0.3 + styleSim * 0.3 + sceneOverlap * 0.4;
}

function calculatePriceSimilarity(poi1: POI, poi2: POI): number {
    const cat1 = poi1.category_tags as Record<string, unknown> | undefined;
    const cat2 = poi2.category_tags as Record<string, unknown> | undefined;
    
    const price1 = (cat1?.characteristics as Record<string, number> | undefined)?.price_range || 2;
    const price2 = (cat2?.characteristics as Record<string, number> | undefined)?.price_range || 2;
    
    const diff = Math.abs(price1 - price2);
    return Math.max(0, 1 - diff * 0.3);
}

function calculateOverallSimilarity(poi1: POI, poi2: POI): { score: number; breakdown: SimilarityBreakdown } {
    const categoryScore = calculateCategorySimilarity(poi1, poi2);
    const locationScore = calculateLocationSimilarity(poi1, poi2);
    const atmosphereScore = calculateAtmosphereSimilarity(poi1, poi2);
    const priceScore = calculatePriceSimilarity(poi1, poi2);
    
    const breakdown: SimilarityBreakdown = {
        category_score: categoryScore,
        location_score: locationScore,
        atmosphere_score: atmosphereScore,
        price_score: priceScore,
        popularity_score: 0.5, // Placeholder
    };
    
    const score = 
        categoryScore * config.similarityWeights.category +
        locationScore * config.similarityWeights.location +
        atmosphereScore * config.similarityWeights.atmosphere +
        priceScore * config.similarityWeights.price;
    
    return { score, breakdown };
}

function generateRecommendationReason(poi1: POI, poi2: POI, breakdown: SimilarityBreakdown): string {
    const reasons: string[] = [];
    
    if (breakdown.category_score >= 0.7) {
        reasons.push('同類型店家');
    }
    if (breakdown.location_score >= 0.8) {
        reasons.push('位置邻近');
    }
    if (breakdown.atmosphere_score >= 0.7) {
        const atm2 = poi2.atmosphere_tags?.core as Record<string, string> | undefined;
        if (atm2) {
            reasons.push(`氣氛同為${atm2.energy}`);
        }
    }
    if (breakdown.price_score >= 0.7) {
        reasons.push('價格相近');
    }
    
    return reasons.length > 0 ? reasons.slice(0, 2).join('、') : '相似推薦';
}

function findCommonTags(poi1: POI, poi2: POI): string[] {
    const tags1 = new Set();
    const tags2 = new Set();
    
    // Add category tags
    const cat1 = poi1.category_tags as Record<string, string> | undefined;
    const cat2 = poi2.category_tags as Record<string, string> | undefined;
    
    if (cat1?.primary) tags1.add(String(cat1.primary));
    if (cat1?.secondary) tags1.add(String(cat1.secondary));
    if (cat2?.primary) tags2.add(String(cat2.primary));
    if (cat2?.secondary) tags2.add(String(cat2.secondary));
    
    // Intersection
    const common = [...tags1].filter(t => tags2.has(t));
    return common.slice(0, 5) as string[];
}

async function getAllPOIs(): Promise<POI[]> {
    const { data, error } = await supabase
        .from('l1_places')
        .select('id, name, category, location_tags, category_tags, atmosphere_tags, location')
        .not('category', 'is', null);
    
    if (error) {
        console.error('Error fetching POIs:', error);
        return [];
    }
    
    return (data || []).map(poi => {
        let coordinates = null;
        if (poi.location) {
            try {
                const parts = poi.location.split(';');
                if (parts.length === 2) {
                    coordinates = { x: parseFloat(parts[1].split(',')[0]), y: parseFloat(parts[1].split(',')[1]) };
                }
            } catch (e) {}
        }
        
        return {
            ...poi,
            coordinates
        } as POI;
    });
}

async function getProcessedPOIs(): Promise<Set<string>> {
    const { data } = await supabase
        .from('l1_poi_similarities')
        .select('poi_id')
        .gte('expires_at', new Date().toISOString());
    
    return new Set((data || []).map(r => r.poi_id));
}

async function batchInsertSimilarities(similarities: PrecomputedSimilarity[]): Promise<void> {
    if (similarities.length === 0) return;
    
    const { error } = await supabase
        .from('l1_poi_similarities')
        .upsert(similarities, {
            onConflict: 'poi_id,similar_poi_id',
            ignoreDuplicates: false
        });
    
    if (error) {
        console.error('Error inserting similarities:', error);
    }
}

async function logJobProgress(jobId: string, status: string, stats: { processed: number; inserted: number }): Promise<void> {
    try {
        await supabase.from('l1_similarity_job_log').insert({
            job_id: jobId,
            status,
            pois_processed: stats.processed,
            similarities_inserted: stats.inserted
        });
    } catch (e) {
        // Ignore log errors
    }
}

async function main() {
    const jobId = `job_${Date.now()}`;
    console.log('=== Phase 3: Similar POI Precomputation ===');
    console.log(`Job ID: ${jobId}`);
    console.log(`Config:`, config);
    console.log('');
    
    // Fetch all POIs
    console.log('Loading POIs...');
    const pois = await getAllPOIs();
    console.log(`Loaded ${pois.length} POIs`);
    
    // Get already processed POIs
    const processedPOIs = await getProcessedPOIs();
    const unprocessedPOIs = pois.filter(p => !processedPOIs.has(p.id));
    console.log(`Unprocessed: ${unprocessedPOIs.length}, Already processed: ${processedPOIs.size}`);
    console.log('');
    
    if (unprocessedPOIs.length === 0) {
        console.log('All POIs have been processed. No new computations needed.');
        return;
    }
    
    const semaphore = new Semaphore(config.workers);
    const allSimilarities: PrecomputedSimilarity[] = [];
    let totalProcessed = 0;
    let totalInserted = 0;
    
    console.log(`Processing ${unprocessedPOIs.length} POIs with ${config.workers} workers...`);
    
    for (let i = 0; i < unprocessedPOIs.length; i++) {
        const poi = unprocessedPOIs[i];
        
        await semaphore.acquire();
        
        (async () => {
            try {
                const poiSimilarities: PrecomputedSimilarity[] = [];
                
                // Calculate similarity with all other POIs
                for (const candidate of pois) {
                    if (candidate.id === poi.id) continue;
                    
                    const { score, breakdown } = calculateOverallSimilarity(poi, candidate);
                    
                    if (score >= config.minSimilarity) {
                        poiSimilarities.push({
                            poi_id: poi.id,
                            similar_poi_id: candidate.id,
                            similarity_score: Math.round(score * 1000) / 1000,
                            similarity_breakdown: breakdown,
                            common_tags: findCommonTags(poi, candidate),
                            recommendation_reason: generateRecommendationReason(poi, candidate, breakdown),
                            computed_at: new Date().toISOString(),
                            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
                        });
                    }
                }
                
                // Sort by score and limit
                poiSimilarities.sort((a, b) => b.similarity_score - a.similarity_score);
                const limitedSimilarities = poiSimilarities.slice(0, config.maxPerPOI);
                
                // Batch insert
                if (limitedSimilarities.length > 0) {
                    await batchInsertSimilarities(limitedSimilarities);
                    totalInserted += limitedSimilarities.length;
                }
                
                totalProcessed++;
                
                if (totalProcessed % 20 === 0) {
                    console.log(`Progress: ${totalProcessed}/${unprocessedPOIs.length} (${((totalProcessed / unprocessedPOIs.length) * 100).toFixed(1)}%)`);
                    await logJobProgress(jobId, 'running', { processed: totalProcessed, inserted: totalInserted });
                }
                
            } finally {
                semaphore.release();
            }
        })();
        
        // Small delay to avoid overwhelming the database
        if (i % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
    
    // Wait for all workers to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await logJobProgress(jobId, 'completed', { processed: totalProcessed, inserted: totalInserted });
    
    console.log('\n=== Summary ===');
    console.log(`Total POIs processed: ${totalProcessed}`);
    console.log(`Total similarities inserted: ${totalInserted}`);
    console.log(`Job ID: ${jobId}`);
}

main().catch(console.error);
