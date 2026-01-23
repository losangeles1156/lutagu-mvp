import { RouteOption, RouteStep, RailwayTopology } from '../l4/types/RoutingTypes';

interface RustRouteResponse {
    routes: Array<{
        key: string;
        path: string[];
        edge_railways: string[];
        costs: {
            time: number;
            transfers: number;
            hops: number;
            transfer_distance: number;
            crowding: number;
        };
    }>;
    error?: string;
}

const RUST_SERVICE_URL = process.env.L4_ROUTING_API_URL || 'http://localhost:8787';

// Helper types for localization
type SupportedLocale = 'zh' | 'zh-TW' | 'ja' | 'en' | 'ar';

export class RustL4Client {
    private static instance: RustL4Client;

    public static getInstance(): RustL4Client {
        if (!RustL4Client.instance) {
            RustL4Client.instance = new RustL4Client();
        }
        return RustL4Client.instance;
    }

    /**
     * Finds routes using the high-performance Rust microservice.
     */
    async findRoutes(params: {
        originId: string;
        destinationId: string;
        maxHops?: number;
        locale: SupportedLocale;
        railways: RailwayTopology[];
    }): Promise<RouteOption[]> {
        const { originId, destinationId, maxHops = 35, locale, railways } = params;

        try {
            const url = new URL(`${RUST_SERVICE_URL}/l4/route`);
            url.searchParams.append('from', originId);
            url.searchParams.append('to', destinationId);
            url.searchParams.append('max_hops', maxHops.toString());

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout

            const res = await fetch(url.toString(), {
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json'
                }
            });
            clearTimeout(timeoutId);

            if (!res.ok) {
                // console.warn(`[RustL4Client] Service returned status ${res.status}`);
                return [];
            }

            const data = await res.json() as RustRouteResponse;

            if (data.error) {
                // console.warn(`[RustL4Client] Service error: ${data.error}`);
                return [];
            }

            return this.transformToLegacyFormat(data, railways, locale);
        } catch (error) {
            // console.error('[RustL4Client] Request failed:', error);
            return [];
        }
    }

    private transformToLegacyFormat(data: RustRouteResponse, railways: RailwayTopology[], locale: SupportedLocale): RouteOption[] {
        const { stationLabel, railwayLabel } = this.buildLabelHelpers(railways, locale);
        const t = (zh: string, ja: string, en: string) => (locale === 'ja' ? ja : locale === 'en' ? en : zh);

        return data.routes.map(r => {
            const path = r.path;
            const edgeRailways = r.edge_railways;
            const origin = path[0];
            const dest = path[path.length - 1];

            const steps: RouteStep[] = [
                {
                    kind: 'origin',
                    text: `${t('出發', '出発', 'Origin')}: ${stationLabel(origin)}`,
                    icon: '🏠',
                },
            ];

            let currentRailway = edgeRailways.length > 0 ? edgeRailways[0] : '';
            let segmentStart = origin;

            for (let i = 0; i < edgeRailways.length; i++) {
                const rw = edgeRailways[i];
                if (rw !== currentRailway) {
                    const segmentEnd = path[i];
                    if (currentRailway === 'transfer') {
                        steps.push({ kind: 'transfer', text: `${t('站內轉乘', '乗換', 'Transfer')}`, icon: '🚶' });
                    } else {
                        steps.push({
                            kind: 'train',
                            text: `${t('乘坐', '乗車', 'Take')} ${railwayLabel(currentRailway)}: ${stationLabel(segmentStart)} → ${stationLabel(segmentEnd)}`,
                            railwayId: currentRailway,
                            icon: '🚃',
                        });
                    }
                    currentRailway = rw;
                    segmentStart = segmentEnd;
                }
            }

            if (currentRailway !== '') {
                const lastEnd = dest;
                if (currentRailway === 'transfer') {
                    steps.push({ kind: 'transfer', text: `${t('站內轉乘', '乗換', 'Transfer')}`, icon: '🚶' });
                } else {
                    steps.push({
                        kind: 'train',
                        text: `${t('乘坐', '乗車', 'Take')} ${railwayLabel(currentRailway)}: ${stationLabel(segmentStart)} → ${stationLabel(lastEnd)}`,
                        railwayId: currentRailway,
                        icon: '🚃',
                    });
                }
            }

            steps.push({ kind: 'destination', text: `${t('到達', '到着', 'Destination')}: ${stationLabel(dest)}`, icon: '📍' });

            const labelMap: Record<string, string> = {
                'smart': t('最佳建議', 'おすすめ', 'Best Route'),
                'fastest': t('最快到達', '最速', 'Fastest'),
                'fewest_transfers': t('最少轉乘', '乗換最少', 'Fewest transfers'),
                'comfort': t('最舒適', 'らくらく', 'Comfortable')
            };

            const uniqueRailways = Array.from(new Set(edgeRailways.filter(rw => rw !== 'transfer')));

            return {
                label: labelMap[r.key] || r.key,
                steps: steps,
                sources: [{ type: 'odpt:Railway', verified: true }],
                railways: uniqueRailways,
                transfers: Math.max(0, Number(r.costs.transfers)),
                duration: Math.max(1, Math.round(r.costs.time)),
                fare: { ic: 0, ticket: 0 }
            } as any;
        });
    }

    private buildLabelHelpers(railways: RailwayTopology[], locale: SupportedLocale) {
        const stationTitleMap = new Map<string, string>();
        const railwayTitleMap = new Map<string, string>();

        railways.forEach(r => {
            let rTitle =
                locale === 'ja'
                    ? r.title?.ja
                    : locale === 'en'
                        ? r.title?.en
                        : (r.title?.['zh-TW'] || r.title?.ja || r.title?.en);

            if (rTitle) railwayTitleMap.set(this.normalizeOdptStationId(r.railwayId), rTitle);

            r.stationOrder.forEach(s => {
                let sTitle =
                    locale === 'ja'
                        ? s.title?.ja
                        : locale === 'en'
                            ? s.title?.en
                            : (s.title?.['zh-TW'] || s.title?.ja || s.title?.en);
                if (sTitle) stationTitleMap.set(this.normalizeOdptStationId(s.station), sTitle);
            });
        });

        const stationLabel = (stationId: string) => {
            const normalized = this.normalizeOdptStationId(stationId);
            return stationTitleMap.get(normalized) || normalized.split(':').pop()?.split('.').pop() || stationId;
        };

        const railwayLabel = (railwayId: string) => {
            const normalized = this.normalizeOdptStationId(railwayId);
            return railwayTitleMap.get(normalized) || normalized.split(':').pop()?.split('.').pop() || railwayId;
        };

        return { stationLabel, railwayLabel };
    }

    private normalizeOdptStationId(input: string): string {
        return input.replace(/^odpt:Station:/, 'odpt.Station:').trim();
    }
}

export const rustL4Client = RustL4Client.getInstance();
