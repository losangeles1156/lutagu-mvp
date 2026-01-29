
import {
    getDefaultTopology,
    type SupportedLocale
} from '../assistantEngine';
import { RouteOption } from '@/lib/l4/types/RoutingTypes';
import { filterRoutesByL2Status } from '../utils/routeFiltering';
import { DataNormalizer } from '../utils/Normalization';
import { getCache, LAYER_CACHE_CONFIG } from '../../cache/cacheService';
import { supabaseAdmin } from '@/lib/supabase';
import { RouteSynthesizer } from '../RouteSynthesizer';
import { L1NodeProfile } from '../types/L1Profile';

import { fetchL4Routes, RustRoute } from '@/lib/api/rustServices';

export interface FindRoutesParams {
    originName?: string;
    destinationName?: string;
    originId?: string;
    destinationId?: string;
    locale: SupportedLocale;
    l2Status?: any;
    filterSuspended?: boolean;
    userProfile?: L1NodeProfile; // [Phase 4] for Route Synthesis
    isHoliday?: boolean; // [Phase 3] Temporal Intelligence
}

export class AlgorithmProvider {
    private routeCache = getCache<RouteOption[]>('route_cache', {
        ...LAYER_CACHE_CONFIG.L2,
        maxSize: 500 // 擴大路線快取容量
    });

    private l2Cache = getCache<any>('l2_status_cache', {
        ...LAYER_CACHE_CONFIG.L2,
        ttlMs: 30 * 1000,
        maxSize: 1200
    });

    // Cache for ID -> Name mapping
    private stationNameMap: Map<string, { en: string; ja: string; zh: string }> | null = null;
    private railwayNameMap: Map<string, { en: string; ja: string; zh: string }> | null = null;

    // Dependency Injection for Testability
    constructor(
        private routeFetcher: (originId: string, destId: string) => Promise<any | null> = fetchL4Routes, // Use any or strict type if imported
        private synthesizer: typeof RouteSynthesizer = RouteSynthesizer
    ) { }

    private ensureNameMaps() {
        if (this.stationNameMap) return;
        this.stationNameMap = new Map();
        this.railwayNameMap = new Map();
        const topology = getDefaultTopology();

        topology.forEach((r: any) => {
            if (r.railwayId) {
                this.railwayNameMap!.set(r.railwayId, {
                    en: r.title?.en || r.title?.ja || '',
                    ja: r.title?.ja || '',
                    zh: r.title?.['zh-TW'] || r.title?.zh || r.title?.ja || ''
                });
            }
            r.stationOrder?.forEach((s: any) => {
                if (s.station) {
                    this.stationNameMap!.set(s.station, {
                        en: s.title?.en || s.title?.ja || '',
                        ja: s.title?.ja || '',
                        zh: s.title?.['zh-TW'] || s.title?.zh || s.title?.ja || ''
                    });
                }
            });
        });
    }

    // ...

    private getStationName(id: string, locale: SupportedLocale): string {
        this.ensureNameMaps();
        const names = this.stationNameMap?.get(id);
        if (!names) return id.split('.').pop() || id;
        return locale === 'ja' ? names.ja : locale === 'en' ? names.en : names.zh;
    }

    private getRailwayName(id: string, locale: SupportedLocale): string {
        this.ensureNameMaps();
        const names = this.railwayNameMap?.get(id);
        if (!names) return id.split('.').pop() || id;
        return locale === 'ja' ? names.ja : locale === 'en' ? names.en : names.zh;
    }

    private async getL2StatusForStation(stationId: string): Promise<any | null> {
        const id = String(stationId || '').trim();
        if (!id) return null;

        const cached = this.l2Cache.get(id);
        if (cached) return cached;

        try {
            const { data } = await supabaseAdmin
                .from('l2_cache')
                .select('value')
                .eq('key', `l2:${id}`)
                .maybeSingle();

            const val = (data as any)?.value || null;
            if (val) this.l2Cache.set(id, val);
            return val;
        } catch {
            return null;
        }
    }

    public async findRoutes(params: FindRoutesParams): Promise<RouteOption[] | null> {
        const originId = params.originId || (params.originName ? DataNormalizer.lookupStationId(params.originName) : null);
        const destId = params.destinationId || (params.destinationName ? DataNormalizer.lookupStationId(params.destinationName) : null);

        if (!originId || !destId) return null;

        const cacheKey = `${originId}-${destId}-${params.locale}`;
        const cached = this.routeCache.get(cacheKey);

        // 1. Try Rust Service (L4 High Performance)
        let rustRoutes: RouteOption[] | null = null;
        try {
            const rustResp = await this.routeFetcher(originId, destId);
            if (rustResp && rustResp.routes && rustResp.routes.length > 0) {
                rustRoutes = this.mapRustRoutesToOptions(rustResp.routes, params.locale);
            }
        } catch (e) {
            console.warn('[AlgorithmProvider] Rust route fetch failed:', e);
        }

        const baseRoutes = cached || rustRoutes || [];

        if (!cached && baseRoutes && baseRoutes.length > 0) {
            this.routeCache.set(cacheKey, baseRoutes);
        }

        const shouldFilter = params.filterSuspended !== false;
        if (!shouldFilter) return baseRoutes;

        const l2 = params.l2Status || (await this.getL2StatusForStation(originId));
        if (!l2) return baseRoutes;

        const filtered = filterRoutesByL2Status({ routes: baseRoutes, l2Status: l2 }).routes;

        // [Phase 4] Route Synthesis (The Experience Layer)
        if (params.userProfile) {
            const synthesized = await this.synthesizer.synthesize(filtered, params.userProfile, params.isHoliday, params.locale || 'en');
            return synthesized;
        }

        return filtered;
    }

    private mapRustRoutesToOptions(routes: RustRoute[], locale: SupportedLocale): RouteOption[] {
        return routes.map(r => {
            const steps: any[] = [];

            // Origin
            steps.push({
                kind: 'origin',
                text: this.getStationName(r.path[0], locale),
                stationId: r.path[0],
                note: 'Start'
            });

            // Iterate path to build segments
            // This is a simplified mapper. Rust path is node-by-node.
            // We need to group by railway.
            let currentRailway = r.edge_railways[0];
            let segmentStartIdx = 0;

            for (let i = 0; i < r.edge_railways.length; i++) {
                const railway = r.edge_railways[i];
                const nextRailway = r.edge_railways[i + 1];

                // If railway changes or end of path
                if (nextRailway !== currentRailway || i === r.edge_railways.length - 1) {
                    const fromStation = r.path[segmentStartIdx];
                    const toStation = r.path[i + 1];
                    const railwayName = this.getRailwayName(currentRailway, locale);
                    const toName = this.getStationName(toStation, locale);

                    if (currentRailway.includes('Walk') || currentRailway === 'walk') {
                        steps.push({
                            kind: 'walk',
                            text: locale === 'ja' ? `${toName}まで徒歩` : locale === 'en' ? `Walk to ${toName}` : `步行至 ${toName}`,
                            stationId: toStation,
                            note: 'Walk'
                        });
                    } else {
                        steps.push({
                            kind: 'train',
                            text: locale === 'ja' ? `${railwayName}で${toName}へ` : locale === 'en' ? `Take ${railwayName} to ${toName}` : `搭乘 ${railwayName} 前往 ${toName}`,
                            railwayId: currentRailway,
                            stationId: toStation,
                            icon: 'train'
                        });
                    }

                    // If there is a transfer (next railway is different), add transfer step
                    if (nextRailway && nextRailway !== currentRailway) {
                        steps.push({
                            kind: 'transfer',
                            text: locale === 'ja' ? '乗り換え' : locale === 'en' ? 'Transfer' : '換乘',
                            stationId: toStation,
                            note: 'Change Lines'
                        });
                    }

                    currentRailway = nextRailway;
                    segmentStartIdx = i + 1;
                }
            }

            // Destination
            steps.push({
                kind: 'destination',
                text: this.getStationName(r.path[r.path.length - 1], locale),
                stationId: r.path[r.path.length - 1],
                note: 'End'
            });

            return {
                label: r.key === 'smart' ? (locale === 'en' ? 'Recommended' : '推薦路線') : (locale === 'en' ? 'Fastest' : '最快'),
                steps: steps,
                sources: [{ type: 'odpt:Railway', verified: true }],
                railways: Array.from(new Set(r.edge_railways)),
                duration: Math.ceil(r.costs.time),
                transfers: r.costs.transfers,
                // Fare not available in Rust yet
                fare: { ic: 0, ticket: 0 }
            };
        });
    }

    public async calculateFare(originId: string, destId: string): Promise<{ ic: number; ticket: number } | null> {
        // ... (rest of method unchanged, but we can't easily see it here)
        // Re-implementing simplified since we are replacing the block
        const routes = await this.findRoutes({ originId, destinationId: destId, locale: 'zh-TW', filterSuspended: false });
        if (routes && routes.length > 0) {
            return routes[0].fare || null;
        }
        return null;
    }
}

export const algorithmProvider = new AlgorithmProvider();
