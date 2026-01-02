import { NextRequest, NextResponse } from 'next/server';
import { UserPreferences } from '@/types/lutagu_l4';

interface RouteRequest {
    from: string;          // Origin station ID (ODPT format)
    to: string;            // Destination station ID (ODPT format)
    userPreferences: UserPreferences;
    locale?: 'zh-TW' | 'ja' | 'en';
}

interface RouteSegment {
    from: string;
    to: string;
    line: string;
    lineColor?: string;
    duration: number;      // minutes
    transfer?: boolean;
}

interface RouteOption {
    id: string;
    type: 'primary' | 'alternative';
    segments: RouteSegment[];
    totalDuration: number; // minutes
    totalFare: number;     // JPY
    transferCount: number;
    priority: number;      // Higher = better match for user preferences
    tags: string[];        // e.g., ['fastest', 'wheelchair_accessible', 'avoid_stairs']
    warnings: string[];    // e.g., ['Crowded during rush hour']
    tips: string[];        // Expert knowledge
}

interface RouteResponse {
    routes: RouteOption[];
    contextAlerts: string[]; // Real-time alerts (delays, weather)
    expertTips: string[];    // Station-specific wisdom
}

export async function POST(req: NextRequest) {
    try {
        const body: RouteRequest = await req.json();
        const { from, to, userPreferences, locale = 'zh-TW' } = body;

        console.log('[L4 Route API] Request:', { from, to, preferences: userPreferences });

        // Validate input
        if (!from || !to) {
            return NextResponse.json(
                { error: 'Missing required parameters: from, to' },
                { status: 400 }
            );
        }

        // For MVP: Return mock routes with realistic structure
        // TODO: Integrate with ODPT API for real route calculation
        const routes = await calculateRoutes(from, to, userPreferences, locale);
        const contextAlerts = await getContextAlerts(from, to);
        const expertTips = await getExpertTips(from, to, userPreferences);

        const response: RouteResponse = {
            routes,
            contextAlerts,
            expertTips
        };

        return NextResponse.json(response);

    } catch (error) {
        console.error('[L4 Route API] Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}

/**
 * Calculate routes based on user preferences
 * MVP: Returns mock data structure
 * Future: Integrate ODPT API
 */
async function calculateRoutes(
    from: string,
    to: string,
    preferences: UserPreferences,
    locale: string
): Promise<RouteOption[]> {
    // Extract preference flags
    const needsAccessibility = preferences.accessibility.wheelchair || preferences.accessibility.stroller;
    const hasLuggage = preferences.luggage.large_luggage;
    const isRushing = preferences.travel_style.rushing;
    const wantsBudget = preferences.travel_style.budget;
    const avoidsRain = preferences.travel_style.avoid_rain;

    // Mock routes (replace with ODPT API call)
    const mockRoutes: RouteOption[] = [
        {
            id: 'route-1-fastest',
            type: 'primary',
            segments: [
                {
                    from: extractStationName(from),
                    to: extractStationName(to),
                    line: 'Tokyo Metro Ginza Line',
                    lineColor: '#FF9500',
                    duration: 5,
                    transfer: false
                }
            ],
            totalDuration: 5,
            totalFare: 170,
            transferCount: 0,
            priority: 100,
            tags: ['fastest', 'direct'],
            warnings: needsAccessibility
                ? ['Narrow platforms at some stations']
                : [],
            tips: hasLuggage
                ? ['Avoid rush hours (7-9 AM, 5-7 PM) with large luggage']
                : []
        },
        {
            id: 'route-2-accessible',
            type: 'alternative',
            segments: [
                {
                    from: extractStationName(from),
                    to: 'Ueno-okachimachi',
                    line: 'Tokyo Metro Hibiya Line',
                    lineColor: '#B5B5AC',
                    duration: 3,
                    transfer: false
                },
                {
                    from: 'Ueno-okachimachi',
                    to: extractStationName(to),
                    line: 'Toei Oedo Line',
                    lineColor: '#B6007A',
                    duration: 9,
                    transfer: true
                }
            ],
            totalDuration: 15,
            totalFare: 280,
            transferCount: 1,
            priority: needsAccessibility ? 95 : 60,
            tags: needsAccessibility ? ['wheelchair_accessible', 'elevator_available'] : [],
            warnings: [],
            tips: needsAccessibility
                ? ['All stations on this route have elevators', 'Transfer corridor is barrier-free']
                : []
        },
        {
            id: 'route-3-budget',
            type: 'alternative',
            segments: [
                {
                    from: extractStationName(from),
                    to: extractStationName(to),
                    line: 'JR Yamanote Line',
                    lineColor: '#9ACD32',
                    duration: 8,
                    transfer: false
                }
            ],
            totalDuration: 8,
            totalFare: 140,
            transferCount: 0,
            priority: wantsBudget ? 90 : 50,
            tags: wantsBudget ? ['cheapest'] : [],
            warnings: ['Crowded during rush hours'],
            tips: []
        }
    ];

    // Filter and sort based on preferences
    let filteredRoutes = mockRoutes;

    // If rushing, prioritize by duration
    if (isRushing) {
        filteredRoutes.sort((a, b) => a.totalDuration - b.totalDuration);
    }

    // If budget-conscious, prioritize by fare
    if (wantsBudget) {
        filteredRoutes.sort((a, b) => a.totalFare - b.totalFare);
    }

    // If needs accessibility, filter for elevator routes
    if (needsAccessibility) {
        filteredRoutes = filteredRoutes.filter(r =>
            r.tags.includes('wheelchair_accessible') || r.transferCount === 0
        );
    }

    return filteredRoutes.slice(0, 3); // Return top 3 routes
}

/**
 * Get real-time context alerts (delays, weather)
 */
async function getContextAlerts(from: string, to: string): Promise<string[]> {
    const alerts: string[] = [];

    // TODO: Integrate with ODPT TrainInformation API
    // TODO: Integrate with weather API

    // Mock alerts
    // alerts.push('⚠️ JR Yamanote Line is delayed by 5 minutes due to signal failure');
    // alerts.push('🌧️ Rain expected in 2 hours');

    return alerts;
}

/**
 * Get expert tips from station wisdom
 */
async function getExpertTips(
    from: string,
    to: string,
    preferences: UserPreferences
): Promise<string[]> {
    const tips: string[] = [];

    // TODO: Fetch from STATION_WISDOM database
    // For now, return generic tips based on preferences

    if (preferences.accessibility.wheelchair) {
        tips.push('💡 Use Exit 1 at destination - it has elevator access');
    }

    if (preferences.luggage.large_luggage) {
        tips.push('💡 Ginza Line platforms are narrow - consider alternative route during rush hour');
    }

    if (preferences.travel_style.avoid_rain) {
        tips.push('💡 Route 2 has underground connections - stays dry in rain');
    }

    return tips;
}

/**
 * Extract station name from ODPT ID
 * e.g., "odpt:Station:TokyoMetro.Ueno" -> "Ueno"
 */
function extractStationName(stationId: string): string {
    const parts = stationId.split('.');
    return parts[parts.length - 1] || stationId;
}
