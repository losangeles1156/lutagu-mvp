import fs from 'fs';
import path from 'path';

const DEBUG_LOG_FILE = path.join(__dirname, 'debug_run.log');
function logDebug(message: string) {
    const timestamp = new Date().toISOString();
    const msg = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(DEBUG_LOG_FILE, msg);
    console.log(message);
}

logDebug('DEBUG: run.ts script started');

import { getStationClusters, getStationClustersForWards, WARDS_15 } from './station_registry';
logDebug('DEBUG: station_registry imported');
import { analyzeWiki } from './wiki_analyzer';
import { fetchOsmData, CategoryStat } from './osm_fetcher';
import { getStationProfile } from './hub_profiles';
import { STATIC_L1_DATA } from '../../src/data/staticL1Data';

logDebug('DEBUG: imports completed');

const OUTPUT_FILE = path.join(__dirname, 'output', 'l1_pipeline_result.json');
const DELAY_MS = 2000; // Delay between stations to be nice to APIs

async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    logDebug('DEBUG: main function started');
    const args = process.argv.slice(2);
    const runAll = args.includes('--all');
    const planOnly = args.includes('--plan');
    const wards15 = args.includes('--wards15');
    const wardsArg = args.find(a => a.startsWith('--wards='));

    const wards = wards15
        ? WARDS_15
        : (wardsArg ? wardsArg.replace(/^--wards=/, '').split(',').map(s => s.trim()).filter(Boolean) : null);

    const includeWardStations = runAll || wards15 || !!wards;

    const modeLabel = planOnly
        ? ' - PLAN'
        : (runAll ? ' - FULL MODE' : (wards ? ' - WARDS MODE' : ''));
    logDebug(`🚀 Starting L1 Pipeline v3.1 (Hub Station Enhanced)${modeLabel}...`);

    // 1. Get Clusters
    logDebug('DEBUG: Calling getStationClusters...');
    const clusters = wards ? getStationClustersForWards(wards, includeWardStations) : getStationClusters(includeWardStations);
    logDebug(`DEBUG: getStationClusters returned ${clusters.length} clusters`);
    logDebug(`📦 Loaded ${clusters.length} station clusters.`);

    let results: any[] = [];

    // Load existing results to resume
    if (fs.existsSync(OUTPUT_FILE)) {
        try {
            results = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
            console.log(`📂 Loaded ${results.length} existing results. Resuming...`);
        } catch (e) {
            console.warn('⚠️ Could not parse existing output file. Starting fresh.');
        }
    }

    const processedIds = new Set(results.map(r => r.clusterId));
    const staticIds = new Set(Object.keys(STATIC_L1_DATA || {}));

    if (planOnly) {
        const pending = clusters.filter(c => !processedIds.has(c.primaryId) && !staticIds.has(c.primaryId));
        const plan = pending.map(c => ({
            id: c.primaryId,
            ward: c.ward,
            name: typeof c.stations?.[0]?.name === 'string' ? c.stations[0].name : c.stations?.[0]?.name?.ja
        }));

        console.log(JSON.stringify({
            wards: wards || 'ALL',
            totalClusters: clusters.length,
            alreadyProcessed: clusters.length - pending.length,
            pending: pending.length,
            list: plan
        }, null, 2));
        return;
    }

    // 2. Process each cluster
    const TARGETS = ['Akihabara', 'Jimbocho', 'Jinbocho', 'Tokyo', 'Shinjuku', 'Shibuya', 'Ueno', 'Ginza', 'Asakusa'];
    
    for (const cluster of clusters) {
        if (processedIds.has(cluster.primaryId)) { // || staticIds.has(cluster.primaryId)) {
            // console.log(`⏭️ Skipping ${cluster.primaryId} (Already processed)`);
            continue;
        }

        const nameEn = typeof cluster.stations[0].name === 'string' ? cluster.stations[0].name : cluster.stations[0].name.en;
        const isTarget = TARGETS.some(t => nameEn.includes(t));
        
        if (!isTarget) continue;

        console.log(`\n📍 Processing Cluster: ${cluster.primaryId} (${cluster.ward})...`);

        // A. Identify Profile
        const profile = getStationProfile(cluster.primaryId);
        if (profile) {
            console.log(`   💎 Identified as HUB Station: ${profile.name} (${profile.core_vibes.join(', ')})`);
        }

        // B. Wiki Analysis (with Profile context)
        const stationName = typeof cluster.stations[0].name === 'string'
            ? cluster.stations[0].name
            : cluster.stations[0].name.ja;

        const wikiTitle = cluster.stations[0].wikiTitle || stationName.replace(/駅$/, '') + '駅';

        let wikiData;
        try {
            wikiData = await analyzeWiki(wikiTitle, profile);
            console.log(`   📖 Wiki Summary: ${wikiData.summary.ja.substring(0, 50)}...`);
            if (wikiData.seasonalFlags.length > 0) {
                console.log(`   🌸 Seasonal Flags: ${wikiData.seasonalFlags.join(', ')}`);
            }
        } catch (error) {
            console.error(`   ❌ Wiki Error: ${error}`);
            wikiData = { summary: { ja: '', en: '', zh: '' }, seasonalFlags: [] as string[], weightedKeywords: [] };
        }

        // C. OSM Fetching (with Profile overrides)
        const center = cluster.center;
        let categoryStats: CategoryStat[] = [];

        // Check for skipVibes (e.g. Airports)
        const shouldSkipVibes = cluster.stations.some(s => s.skipVibes);

        if (shouldSkipVibes) {
            console.log(`   ✈️ Skipping OSM Vibe Check (Airport/Terminal Node detected).`);
            // Manually inject "Airport" stats to ensure it gets tagged correctly later if needed
            // or just leave empty and rely on profile
        } else {
            try {
                categoryStats = await fetchOsmData(center.lat, center.lng, wikiData.seasonalFlags, profile);
            } catch (error) {
                console.error(`   ❌ OSM Error: ${error}`);
                // Continue with empty stats rather than crashing
            }
        }

        // D. Vibe Tag Generation (Enhanced)
        const vibeTags = new Set<string>();

        if (shouldSkipVibes) {
            vibeTags.add('International Airport');
            vibeTags.add('Transport Hub');
        } else {
            // 1. From Wiki/Profile (High Confidence)
            wikiData.weightedKeywords.forEach(k => vibeTags.add(k.word));

            // 2. From OSM Density
            const dining = categoryStats.find(c => c.categoryId === 'dining');
            const shopping = categoryStats.find(c => c.categoryId === 'shopping');
            const nature = categoryStats.find(c => c.categoryId === 'nature');
            const culture = categoryStats.find(c => c.categoryId === 'culture');
            const business = categoryStats.find(c => c.categoryId === 'business');

            if (dining && dining.totalCount >= 50) vibeTags.add('Gourmet Battleground (激戦区)');
            if (shopping && shopping.totalCount >= 50) vibeTags.add('Shoppers Heaven');
            if (business && business.totalCount >= 50) vibeTags.add('Business District');
            if (culture && culture.totalCount >= 10) vibeTags.add('Cultural Hub');

            // 3. Seasonal Logic
            if (wikiData.seasonalFlags.includes('Sakura') && nature && nature.totalCount > 2) {
                // Lower threshold if wiki confirms it
                vibeTags.add('Sakura Spot 🌸');
            }
        }

        results.push({
            clusterId: cluster.primaryId,
            name: cluster.stations[0].name,
            ward: cluster.ward,
            isHub: !!profile,
            profileName: profile?.name,
            location: center,
            wikiAnalysis: wikiData,
            vibeTags: Array.from(vibeTags),
            osmStats: categoryStats.map(s => ({
                category: s.categoryId,
                total: s.totalCount,
                saved: s.savedCount
            })),
            poiSample: categoryStats.flatMap(s => s.places.slice(0, 50)) // Keep up to 50 per category
        });

        // Save progress incrementally
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));

        // Sleep to respect rate limits
        await sleep(DELAY_MS);
    }

    console.log(`\n✅ Pipeline Completed! Results saved to: ${OUTPUT_FILE}`);
}

main().catch(console.error);
