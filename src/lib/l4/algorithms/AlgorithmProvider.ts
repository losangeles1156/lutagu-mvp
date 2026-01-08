
import { 
    findRankedRoutes, 
    normalizeOdptStationId,
    type RouteOption,
    type SupportedLocale
} from '../assistantEngine';
import { DataNormalizer } from '../utils/Normalization';
import { getCache, LAYER_CACHE_CONFIG } from '../../cache/cacheService';
import CORE_TOPOLOGY from '../generated/coreTopology.json';

export class AlgorithmProvider {
    private routeCache = getCache<RouteOption[]>('route_cache', {
        ...LAYER_CACHE_CONFIG.L2,
        maxSize: 500 // 擴大路線快取容量
    });

    public async findRoutes(params: {
        originName?: string;
        destinationName?: string;
        originId?: string;
        destinationId?: string;
        locale: SupportedLocale;
    }): Promise<RouteOption[] | null> {
        const originId = params.originId || (params.originName ? DataNormalizer.lookupStationId(params.originName) : null);
        const destId = params.destinationId || (params.destinationName ? DataNormalizer.lookupStationId(params.destinationName) : null);

        if (!originId || !destId) return null;

        const cacheKey = `${originId}-${destId}-${params.locale}`;
        const cached = this.routeCache.get(cacheKey);
        if (cached) return cached;

        const routes = findRankedRoutes({
            originStationId: originId,
            destinationStationId: destId,
            railways: CORE_TOPOLOGY as any,
            locale: params.locale
        });

        if (routes && routes.length > 0) {
            this.routeCache.set(cacheKey, routes);
        }

        return routes;
    }

    public async calculateFare(originId: string, destId: string): Promise<{ ic: number; ticket: number } | null> {
        // In a real scenario, this would use a fare table. 
        // For now, we reuse the route finding logic which includes fare calculation.
        const routes = await this.findRoutes({ originId, destinationId: destId, locale: 'zh-TW' });
        if (routes && routes.length > 0) {
            return routes[0].fare || null;
        }
        return null;
    }
}

export const algorithmProvider = new AlgorithmProvider();
