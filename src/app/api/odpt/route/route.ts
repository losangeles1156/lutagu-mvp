import { NextRequest, NextResponse } from 'next/server';
import {
    buildRouteOptionFromPath,
    findRankedRoutes,
    findStationIdsByName,
    normalizeOdptStationId,
    filterRoutesByL2Status,
} from '@/lib/l4/assistantEngine';
import {
    type RailwayTopology,
    type RouteStep,
    type RouteCosts,
    type RouteOption,
} from '@/lib/l4/types/RoutingTypes';
import { rustL4Client } from '@/lib/services/RustL4Client';
import CORE_TOPOLOGY from '@/lib/l4/generated/coreTopology.json';
import { supabaseAdmin } from '@/lib/supabase';

interface RouteResponse {
    routes: Array<{
        label: string;
        steps: RouteStep[];
        duration?: number;
        transfers: number;
        fare?: { ic: number; ticket: number };
        nextDeparture?: string;
        railways?: string[]; // Added to pass to AssistantEngine
        sources: Array<{ type: string; verified: boolean }>;
    }>;
    error?: string;
    error_code?: string;
}

// RustRoute* types and fetchRustRoutes function removed as they are now in RustL4Client


export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const fromStation = searchParams.get('from');
    const toStation = searchParams.get('to');
    const locale = (searchParams.get('locale') || 'zh-TW') as any;

    const getErrorText = (kind: 'missing_params' | 'station_not_found' | 'no_usable_due_to_disruption' | 'no_direct_route' | 'failed') => {
        const l = String(locale || 'zh-TW');
        const isJa = l.startsWith('ja');
        const isEn = l.startsWith('en');

        if (kind === 'missing_params') {
            return isJa ? 'from/to の指定が必要です。' : isEn ? 'Missing from/to station parameters.' : '缺少 from/to 站點參數。';
        }
        if (kind === 'station_not_found') {
            return isJa ? '駅が見つかりませんでした。' : isEn ? 'Station not found.' : '找不到車站。';
        }
        if (kind === 'no_usable_due_to_disruption') {
            return isJa
                ? '現在の運行乱れにより、利用できない路線を除外するとルートが見つかりませんでした。迂回は Google Maps（公共交通）で確認するのが早いです。'
                : isEn
                    ? "Live disruption is affecting service, so I couldn't find a usable route after removing suspended lines. The fastest workaround is Google Maps (Transit) detours."
                    : '因為目前有即時運行異常，我已排除不能搭乘的路線，但暫時找不到可用路線。建議先用 Google Maps（大眾運輸）確認繞行。';
        }
        if (kind === 'no_direct_route') {
            return isJa
                ? '直通ルートが見つかりませんでした。事業者をまたぐ乗換が必要な可能性があります。'
                : isEn
                    ? 'No direct route found. Cross-operator transfer may be required.'
                    : '找不到直達路線，可能需要跨營運商轉乘。';
        }
        return isJa ? 'ルートの作成に失敗しました。' : isEn ? 'Failed to plan route.' : '路線規劃失敗。';
    };

    if (!fromStation || !toStation) {
        return NextResponse.json(
            { error_code: 'missing_params', error: getErrorText('missing_params'), routes: [] },
            { status: 400, headers: { 'Cache-Control': 'no-store' } }
        );
    }

    // Helper to resolve station IDs from user input
    // Input can be: Japanese name ("上野"), English name ("Ueno"), or full ODPT ID ("odpt.Station:TokyoMetro.Ginza.Ueno")
    const resolveIds = (input: string) => {
        const normalizedInput = normalizeOdptStationId(input.trim());

        const nameVariants = (() => {
            const raw = input.trim();
            const variants = new Set<string>();
            variants.add(raw);
            variants.add(raw.replace(/[\s　]+/g, ' '));

            const stripped = raw
                .replace(/\s*[\(（][^\)）]*[\)）]\s*/g, ' ')
                .replace(/(神社|寺|公園|タワー|Tower|Shrine|Temple)$/i, '')
                .trim();
            if (stripped) variants.add(stripped);
            return Array.from(variants);
        })();

        // Check if input is already a valid ODPT Station ID format
        const isOdptId = normalizedInput.startsWith('odpt.Station:');

        if (isOdptId) {
            // Extract the station base name (last part after the final dot)
            // e.g. "odpt.Station:TokyoMetro.Ginza.Ueno" -> "Ueno"
            const parts = normalizedInput.split('.');
            const stationBaseName = parts[parts.length - 1]; // "Ueno"

            // Use the base name for lookup to get all matching station variants
            const potentialIds = findStationIdsByName(stationBaseName);
            if (potentialIds.length > 0) {
                return potentialIds;
            }

            // Fallback: If base name lookup fails, return the original ID as-is
            return [normalizedInput];
        }

        // For plain names (Japanese, English), use direct name lookup
        for (const v of nameVariants) {
            const potentialIds = findStationIdsByName(v);
            if (potentialIds.length > 0) return potentialIds;
        }

        return [];
    };

    let fromIds: string[] = resolveIds(fromStation);
    let toIds: string[] = resolveIds(toStation);

    if (fromIds.length === 0 || toIds.length === 0) {
        return NextResponse.json({
            error_code: 'station_not_found',
            error: getErrorText('station_not_found'),
            routes: []
        }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
    }

    try {
        const railways: RailwayTopology[] = CORE_TOPOLOGY as unknown as RailwayTopology[];
        const rustApiUrl = process.env.L4_ROUTING_API_URL;
        const maxHops = 35;

        // Use RustL4Client if API URL is set, otherwise fall back to legacy algorithm
        const rustRouteOptions = process.env.L4_ROUTING_API_URL
            ? await rustL4Client.findRoutes({
                originId: fromIds[0], // Rust client typically takes single ID, or we loop. Legacy 'fromIds' is array.
                destinationId: toIds[0],
                // Note: Rust service supports comma-separated in client if we pass raw params, 
                // but client takes single strings in signature above. 
                // Actually the RustL4Client we generated takes `originId: string`.
                // However, the backend Rust service supports multiple. 
                // For simplicity, we'll iterate or take the first valid ones as primary candidate.
                // Or better, let's update RustL4Client to match backend capability or just use primary.
                // Assuming primary ID is sufficient for new routing engine which handles aliases internally.
                maxHops,
                locale,
                railways
            })
            : [];

        const routeOptionsBase = rustRouteOptions.length > 0
            ? rustRouteOptions
            : findRankedRoutes({
                originStationId: fromIds,
                destinationStationId: toIds,
                railways,
                maxHops,
                locale,
            });

        let routeOptions = routeOptionsBase;
        let removedDueToL2 = 0;

        if (routeOptionsBase.length > 0) {
            let l2Status: any = null;

            try {
                const keys = fromIds.map((id) => `l2:${id}`);
                const { data } = await supabaseAdmin
                    .from('l2_cache')
                    .select('key,value')
                    .in('key', keys);
                const rows = Array.isArray(data) ? data : [];
                l2Status = rows.find((r: any) => r && r.value)?.value || null;
            } catch {
                for (const fromId of fromIds) {
                    try {
                        const { data } = await supabaseAdmin
                            .from('l2_cache')
                            .select('value')
                            .eq('key', `l2:${fromId}`)
                            .maybeSingle();

                        const val = (data as any)?.value || null;
                        if (val) {
                            l2Status = val;
                            break;
                        }
                    } catch {
                        continue;
                    }
                }
            }

            if (l2Status) {
                const filtered = filterRoutesByL2Status({ routes: routeOptionsBase, l2Status });
                routeOptions = filtered.routes as unknown as typeof routeOptionsBase;
                removedDueToL2 = filtered.removed.length;
            }
        }

        if (routeOptions.length === 0) {
            const isDisruption = routeOptionsBase.length > 0 && removedDueToL2 > 0;
            const errorCode = isDisruption ? 'no_usable_due_to_disruption' : 'no_direct_route';
            const cacheControl = isDisruption
                ? 'public, s-maxage=30, stale-while-revalidate=30'
                : 'public, s-maxage=300, stale-while-revalidate=60';

            return NextResponse.json({
                error_code: errorCode,
                error: getErrorText(errorCode as any),
                routes: []
            }, {
                headers: {
                    'Cache-Control': cacheControl
                }
            });
        }

        const routes: RouteResponse['routes'] = routeOptions.map((opt) => {
            return {
                label: opt.label,
                steps: opt.steps.map(s => ({
                    kind: s.kind,
                    text: s.text,
                    railwayId: s.railwayId,
                    icon: s.icon
                })),
                duration: opt.duration,
                transfers: Number(opt.transfers ?? 0),
                fare: opt.fare,
                sources: [] // Keeping as empty array to satisfy interface without adding token weight
            };
        });

        const cacheControl = removedDueToL2 > 0
            ? 'public, s-maxage=30, stale-while-revalidate=30'
            : 'public, s-maxage=300, stale-while-revalidate=60';

        return NextResponse.json({ routes }, {
            headers: {
                'Cache-Control': cacheControl
            }
        });

    } catch (error) {
        console.error('Route API Error:', error);
        return NextResponse.json({
            error_code: 'failed',
            error: getErrorText('failed'),
            routes: []
        }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
    }
}
