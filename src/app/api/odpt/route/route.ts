import { NextRequest, NextResponse } from 'next/server';
import {
    findRankedRoutes,
    findStationIdsByName,
    normalizeOdptStationId,
    type RailwayTopology,
    type RouteStep,
    type SupportedLocale,
} from '@/lib/l4/assistantEngine';
import { findPOIStations, resolveStationAlias, type POIMapping } from '@/lib/l4/poiMapping';
import CORE_TOPOLOGY from '@/lib/l4/generated/coreTopology.json';

interface ExpertAdvice {
    icon: string;
    text: string;
    priority: number;
}

interface RouteResponse {
    routes: Array<{
        label: string;
        steps: RouteStep[];
        duration?: number;
        transfers: number;
        fare?: { ic: number; ticket: number };
        nextDeparture?: string;
        railways?: string[];
        sources: Array<{ type: string; verified: boolean }>;
    }>;
    /** POI 資訊（如果目的地是景點） */
    poiInfo?: {
        name: string;
        category: string;
        recommendedStation: string;
        walkMinutes: number;
        advice?: string;
    };
    /** 專家建議 */
    expertAdvice?: ExpertAdvice[];
    error?: string;
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const fromStation = searchParams.get('from');
    const toStation = searchParams.get('to');
    const locale = (searchParams.get('locale') || 'zh-TW') as SupportedLocale;
    // 用戶需求參數（可選）
    const userNeeds = searchParams.get('needs')?.split(',') as ('comfort' | 'rushing' | 'luggage' | 'wheelchair' | 'stroller')[] | undefined;

    if (!fromStation || !toStation) {
        return NextResponse.json({ error: 'Missing from/to station parameters', routes: [] }, { status: 400 });
    }

    // POI 資訊（如果目的地是景點）
    let poiInfo: RouteResponse['poiInfo'] | undefined;
    let expertAdvice: ExpertAdvice[] = [];

    /**
     * 智能解析輸入 - 支援車站名稱、POI、別名
     * 優先順序：1. POI 映射 2. 車站別名 3. 標準車站名稱查詢
     */
    const resolveIdsWithPOI = (input: string, isDestination: boolean = false): { ids: string[], poi?: ReturnType<typeof findPOIStations> } => {
        const trimmedInput = input.trim();
        const normalizedInput = normalizeOdptStationId(trimmedInput);

        // 1. 首先檢查是否為 POI（景點/地標）
        const poiResult = findPOIStations(trimmedInput, userNeeds);
        if (poiResult.poi && poiResult.recommendedStation) {
            // 如果是目的地，記錄 POI 資訊
            if (isDestination) {
                const localeKey = locale === 'ja' ? 'ja' : locale === 'en' ? 'en' : 'zh-TW';
                poiInfo = {
                    name: poiResult.poi.displayName[localeKey],
                    category: poiResult.poi.category,
                    recommendedStation: poiResult.recommendedStation.stationId.split('.').pop() || '',
                    walkMinutes: poiResult.recommendedStation.walkMinutes,
                    advice: poiResult.recommendedStation.note?.[localeKey]
                };

                // 添加 POI 相關的專家建議
                if (poiResult.recommendedStation.note?.[localeKey]) {
                    expertAdvice.push({
                        icon: '💡',
                        text: poiResult.recommendedStation.note[localeKey]!,
                        priority: 90
                    });
                }

                // 如果有其他可選車站，也提供建議
                if (poiResult.allStations.length > 1) {
                    const alternativeStation = poiResult.allStations.find(s => s !== poiResult.recommendedStation);
                    if (alternativeStation?.note?.[localeKey]) {
                        expertAdvice.push({
                            icon: '📍',
                            text: `替代方案：${alternativeStation.note[localeKey]}`,
                            priority: 70
                        });
                    }
                }
            }

            return {
                ids: [poiResult.recommendedStation.stationId],
                poi: poiResult
            };
        }

        // 2. 檢查車站別名
        const aliasIds = resolveStationAlias(trimmedInput);
        if (aliasIds && aliasIds.length > 0) {
            return { ids: aliasIds };
        }

        // 3. 標準車站名稱解析
        const nameVariants = (() => {
            const raw = trimmedInput;
            const variants = new Set<string>();
            variants.add(raw);
            variants.add(raw.replace(/[\s　]+/g, ' '));

            const stripped = raw
                .replace(/\s*[\(（][^\)）]*[\)）]\s*/g, ' ')
                .replace(/(神社|寺|公園|タワー|Tower|Shrine|Temple|展望台|Observatory)$/i, '')
                .trim();
            if (stripped) variants.add(stripped);
            return Array.from(variants);
        })();

        // Check if input is already a valid ODPT Station ID format
        const isOdptId = normalizedInput.startsWith('odpt.Station:');

        if (isOdptId) {
            const parts = normalizedInput.split('.');
            const stationBaseName = parts[parts.length - 1];
            const potentialIds = findStationIdsByName(stationBaseName);
            if (potentialIds.length > 0) {
                return { ids: potentialIds };
            }
            return { ids: [normalizedInput] };
        }

        // For plain names (Japanese, English), use direct name lookup
        for (const v of nameVariants) {
            const potentialIds = findStationIdsByName(v);
            if (potentialIds.length > 0) return { ids: potentialIds };
        }

        return { ids: [] };
    };

    const fromResult = resolveIdsWithPOI(fromStation, false);
    const toResult = resolveIdsWithPOI(toStation, true);

    let fromIds: string[] = fromResult.ids;
    let toIds: string[] = toResult.ids;

    if (fromIds.length === 0 || toIds.length === 0) {
        // 提供更友好的錯誤訊息
        const missingFrom = fromIds.length === 0;
        const missingTo = toIds.length === 0;
        let errorMsg = locale === 'ja'
            ? `駅が見つかりません: ${missingFrom ? fromStation : ''} ${missingTo ? toStation : ''}`
            : locale === 'en'
                ? `Station not found: ${missingFrom ? fromStation : ''} ${missingTo ? toStation : ''}`
                : `找不到車站: ${missingFrom ? fromStation : ''} ${missingTo ? toStation : ''}`;

        // 如果是非車站地點，提供建議
        if (missingTo && !toResult.poi) {
            const suggestion = locale === 'ja'
                ? '。ヒント：目的地が観光地の場合、「〇〇駅」と入力してください'
                : locale === 'en'
                    ? '. Tip: If destination is a landmark, try searching for the nearest station name'
                    : '。提示：如果目的地是景點，請嘗試輸入最近的車站名稱';
            errorMsg += suggestion;
        }

        return NextResponse.json({
            error: errorMsg,
            routes: []
        }, { status: 404 });
    }

    try {
        const railways: RailwayTopology[] = CORE_TOPOLOGY as unknown as RailwayTopology[];

        const routeOptions = findRankedRoutes({
            originStationId: fromIds,
            destinationStationId: toIds,
            railways,
            maxHops: 35,
            locale,
        });

        if (routeOptions.length === 0) {
            return NextResponse.json({
                error: 'No direct route found. Cross-operator transfer may be required.',
                routes: []
            });
        }

        const routes: RouteResponse['routes'] = routeOptions.map((opt) => {
            return {
                label: opt.label,
                steps: opt.steps,
                duration: opt.duration,
                transfers: Number(opt.transfers ?? 0),
                fare: opt.fare,
                railways: opt.railways,
                sources: [
                    { type: 'odpt:Railway', verified: true },
                ]
            };
        });

        // 構建回應（包含 POI 資訊和專家建議）
        const response: RouteResponse = { routes };

        if (poiInfo) {
            response.poiInfo = poiInfo;
        }

        if (expertAdvice.length > 0) {
            // 按優先級排序
            response.expertAdvice = expertAdvice.sort((a, b) => b.priority - a.priority);
        }

        return NextResponse.json(response, {
            headers: {
                'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60'
            }
        });

    } catch (error) {
        console.error('Route API Error:', error);
        return NextResponse.json({
            error: 'Failed to plan route',
            routes: []
        }, { status: 500 });
    }
}
