
import { 
    findRankedRoutes, 
    type RouteOption,
    type SupportedLocale,
    filterRoutesByL2Status,
    getDefaultTopology
} from '../assistantEngine';
import { DataNormalizer } from '../utils/Normalization';
import { getCache, LAYER_CACHE_CONFIG } from '../../cache/cacheService';
import { supabaseAdmin } from '@/lib/supabase';

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

    public async findRoutes(params: {
        originName?: string;
        destinationName?: string;
        originId?: string;
        destinationId?: string;
        locale: SupportedLocale;
        l2Status?: any;
        filterSuspended?: boolean;
    }): Promise<RouteOption[] | null> {
        const originId = params.originId || (params.originName ? DataNormalizer.lookupStationId(params.originName) : null);
        const destId = params.destinationId || (params.destinationName ? DataNormalizer.lookupStationId(params.destinationName) : null);

        if (!originId || !destId) return null;

        const cacheKey = `${originId}-${destId}-${params.locale}`;
        const cached = this.routeCache.get(cacheKey);
        const baseRoutes = cached || findRankedRoutes({
            originStationId: originId,
            destinationStationId: destId,
            railways: getDefaultTopology() as any,
            locale: params.locale
        });

        if (!cached && baseRoutes && baseRoutes.length > 0) {
            this.routeCache.set(cacheKey, baseRoutes);
        }

        const shouldFilter = params.filterSuspended !== false;
        if (!shouldFilter) return baseRoutes;

        const l2 = params.l2Status || (await this.getL2StatusForStation(originId));
        if (!l2) return baseRoutes;

        const filtered = filterRoutesByL2Status({ routes: baseRoutes, l2Status: l2 }).routes;
        return filtered;
    }

    public async calculateFare(originId: string, destId: string): Promise<{ ic: number; ticket: number } | null> {
        // In a real scenario, this would use a fare table. 
        // For now, we reuse the route finding logic which includes fare calculation.
        const routes = await this.findRoutes({ originId, destinationId: destId, locale: 'zh-TW', filterSuspended: false });
        if (routes && routes.length > 0) {
            return routes[0].fare || null;
        }
        return null;
    }
}

export const algorithmProvider = new AlgorithmProvider();
