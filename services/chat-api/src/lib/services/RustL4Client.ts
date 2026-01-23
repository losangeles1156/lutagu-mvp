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

const RUST_SERVICE_URL = process.env.L4_SERVICE_URL || 'http://localhost:8787';

// Helper types for localization
type SupportedLocale = 'zh' | 'zh-TW' | 'ja' | 'en' | 'ar';

export class RustL4Client {
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
                console.warn(`[RustL4Client] Service returned status ${res.status}`);
                return [];
            }

            const data = await res.json() as RustRouteResponse;

            if (data.error) {
                console.warn(`[RustL4Client] Service error: ${data.error}`);
                return [];
            }

            return this.transformToLegacyFormat(data, railways, locale);
        } catch (error) {
            console.error('[RustL4Client] Request failed:', error);
            // Fallback to empty array implies "no route found" or "service down"
            // The caller (AlgorithmProvider) might fallback to legacy if needed, 
            // but our strategy is replacement.
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

            // Labels mapping from logic keys
            const labelMap: Record<string, string> = {
                'smart': t('最佳建議', 'おすすめ', 'Best Route'),
                'fastest': t('最快到達', '最速', 'Fastest'),
                'fewest_transfers': t('最少轉乘', '乗換最少', 'Fewest transfers'),
                'comfort': t('最舒適', 'らくらく', 'Comfortable')
            };

            const uniqueRailways = Array.from(new Set(edgeRailways.filter(rw => rw !== 'transfer')));

            // Estimate fare roughly if not provided by Rust (Legacy logic had simple estimation)
            // Ideally Rust service provides fare. For now, use legacy heuristic if Rust returns 0/null.
            // Rust struct shows `costs.time` etc. but not explicitly fare.
            // We'll leave fare as 0 or estimated by hops for now as per legacy.
            // Legacy: totalFare += estimateFareByDistance(op, hopCount);
            // We will skip detailed fare estimation here to keep client simple 
            // and assume Rust will eventually provide it, or AlgorithmProvider enriches it.

            return {
                id: r.key, // Ensure ID is passed if needed by frontend (though RouteOption doesn't strictly have ID, Enriched does)
                label: labelMap[r.key] || r.key,
                steps: steps,
                sources: [{ type: 'odpt:Railway', verified: true }],
                railways: uniqueRailways,
                transfers: Math.max(0, Number(r.costs.transfers)),
                duration: Math.max(1, Math.round(r.costs.time)),
                fare: { ic: 0, ticket: 0 } // Placeholder
            } as any; // Cast as ANY to bypass strict checks if RouteOption differs slightly until cleaned up
        });
    }

    private buildLabelHelpers(railways: RailwayTopology[], locale: SupportedLocale) {
        const stationTitleMap = new Map<string, string>();
        const railwayTitleMap = new Map<string, string>();

        // Simplified Map for brevity - in production this should be shared or imported
        // Ideally we should import `buildLabelHelpers` from a shared util if we split the file.
        // For now, basic fallback logic to extract names from ID if topology missing.

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

export const rustL4Client = new RustL4Client();
