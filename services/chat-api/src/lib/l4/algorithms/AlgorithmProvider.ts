
import { findRankedRoutes, RouteOption } from './RoutingGraph';
import { getDefaultTopology } from '../search/topologyLoader';
import { filterRoutesByL2Status } from '../status/L2Filter';
import { supabaseAdmin } from '../../supabase';
import { getCache, LAYER_CACHE_CONFIG } from '../../cache/cacheService';

/**
 * L4 Algorithm Provider (Unified)
 * Wraps refined graph algorithms with L2 context awareness
 */
export class AlgorithmProvider {
    // Note: LAYER_CACHE_CONFIG.L4 might not exist in backend types yet. Check definition.
    // If L4 is missing, use L2 as fallback or define it locally.
    private routeCache = getCache<RouteOption[]>('route_planning', LAYER_CACHE_CONFIG.L2); // Fallback to L2 config if L4 missing

    // L2 Cache for Status (TTL 30s)
    private l2Cache = getCache<any>('l2_status_cache', {
        ...LAYER_CACHE_CONFIG.L2,
        ttlMs: 30 * 1000,
        maxSize: 1200
    });

    private async getL2StatusForStation(stationId: string): Promise<any | null> {
        const id = String(stationId || '').trim();
        if (!id) return null;

        const cached = this.l2Cache.get(id);
        if (cached) return cached;

        try {
            // Note: In backend service, we might need a different way to access Supabase
            // depending on the setup. Assuming supabaseAdmin fits the service context.
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

    async findRoutes(params: {
        originId: string;
        destinationId: string;
        locale: string;
        l2Status?: any;
        filterSuspended?: boolean;
    }): Promise<RouteOption[]> {
        const { originId, destinationId, locale } = params;
        const cacheKey = `${originId}:${destinationId}:${locale}`;

        const cached = this.routeCache.get(cacheKey);

        const baseRoutes = cached || await findRankedRoutes({
            originStationId: originId,
            destinationStationId: destinationId,
            railways: getDefaultTopology() as any, // Using Dynamic Topology
            locale: locale as any // Cast to satisfy type if needed, or fix import
        });

        if (!cached && baseRoutes && baseRoutes.length > 0) {
            this.routeCache.set(cacheKey, baseRoutes);
        }

        // L2 Filtering Logic
        const shouldFilter = params.filterSuspended !== false;
        if (!shouldFilter) return baseRoutes;

        const l2 = params.l2Status || (await this.getL2StatusForStation(originId));
        if (!l2) return baseRoutes;

        const filtered = filterRoutesByL2Status({ routes: baseRoutes, l2Status: l2 }).routes;
        return filtered;
    }

    async calculateFare(originId: string, destId: string): Promise<{ ic: number, ticket?: number } | null> {
        // Simple fallback or lookup
        // For now return null or mock
        return null;
    }

    async getRouteDetails(routeId: string): Promise<any> {
        return null; // TODO
    }

    async quickOptimize(originId: string, destId: string): Promise<RouteOption[]> {
        // Force L2-aware optimization
        const routes = await this.findRoutes({ originId, destinationId: destId, locale: 'zh-TW', filterSuspended: false });
        return routes.slice(0, 1);
    }
}

export const algorithmProvider = new AlgorithmProvider();
