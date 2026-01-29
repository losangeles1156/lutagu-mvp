import { MapDisplayTier, getNodeDisplayTier } from '@/lib/constants/MapDisplayPolicy';

// Tier 1 & 2 IDs are derived from MapDisplayPolicy logic or hardcoded lists if needed for prefetch
// For simplicity and robustness, we will fetch specific known hubs.
const PREFETCH_TARGETS = [
    // Tier 1
    'odpt:Station:JR-East.Tokyo',
    'odpt:Station:JR-East.Ueno',
    'odpt:Station:Keisei.KeiseiUeno',
    'odpt:Station:JR-East.Ikebukuro',
    'odpt:Station:JR-East.Shinjuku',
    'odpt:Station:JR-East.Shibuya',
    'odpt:Station:JR-East.Shinagawa',
    'odpt:Station:TokyoMetro.Ginza',
    'odpt:Station:JR-East.Akihabara',
    'odpt:Station:JR-East.Yokohama',
    'odpt:Station:JR-East.Kawasaki',
    'odpt:Station:Keisei.NaritaAirportTerminal1',
    'odpt:Station:Keikyu.HanedaAirportTerminal1and2',
    // Tier 2 (Key Junctions)
    'odpt:Station:TokyoMetro.Otemachi',
    'odpt:Station:TokyoMetro.Asakusa',
    'odpt:Station:TokyoMetro.Shimbashi',
    'odpt:Station:Tobu.Oshiage'
];

export class OfflineDataManager {
    private static isInitialized = false;

    static async initSilentPrefetch() {
        if (typeof window === 'undefined' || this.isInitialized) return;
        this.isInitialized = true;

        // Delay to avoid impacting TTI (Time to Interactive)
        setTimeout(() => this.runPrefetch(), 5000);
    }

    private static async runPrefetch() {
        console.log('[OfflineDataManager] Starting silent prefetch...');

        try {
            // [Phase 13.4 Fix] Use standard fetch to allow Service Worker interception
            // matches runtimeCaching in next.config.js

            // 1. Prefetch Routing Graph
            await fetch('/data/routing_graph.json');

            // 2. Prefetch Critical Stations
            const promises = PREFETCH_TARGETS.map(id =>
                fetch(`/api/nodes/${encodeURIComponent(id)}`)
            );

            await Promise.allSettled(promises);
            console.log(`[OfflineDataManager] Prefetch complete at ${new Date().toISOString()}`);

        } catch (err) {
            console.warn('[OfflineDataManager] Prefetch failed (low priority):', err);
        }
    }
}
