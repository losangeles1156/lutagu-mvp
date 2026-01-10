import { NextRequest, NextResponse } from 'next/server';
import {
    findRankedRoutes,
    findStationIdsByName,
    normalizeOdptStationId,
    type RailwayTopology,
    type RouteStep,
} from '@/lib/l4/assistantEngine';
import CORE_TOPOLOGY from '@/lib/l4/generated/coreTopology.json';

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
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const fromStation = searchParams.get('from');
    const toStation = searchParams.get('to');
    const locale = (searchParams.get('locale') || 'zh-TW') as any;

    if (!fromStation || !toStation) {
        return NextResponse.json({ error: 'Missing from/to station parameters', routes: [] }, { status: 400 });
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
            error: 'Station not found',
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

        return NextResponse.json({ routes }, {
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
