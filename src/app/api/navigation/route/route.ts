import { NextResponse } from 'next/server';
import { NavigationService } from '@/lib/navigation/NavigationService';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => null);
        if (!body || typeof body !== 'object') {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        }

        const startNodeId = typeof body.startNodeId === 'string' ? body.startNodeId : undefined;
        const endNodeId = typeof body.endNodeId === 'string' ? body.endNodeId : undefined;

        const startLat = typeof body.startLat === 'number' ? body.startLat : undefined;
        const startLon = typeof body.startLon === 'number' ? body.startLon : undefined;
        const endLat = typeof body.endLat === 'number' ? body.endLat : undefined;
        const endLon = typeof body.endLon === 'number' ? body.endLon : undefined;

        const userProfile = typeof body.userProfile === 'string' ? body.userProfile : undefined;
        const weather = typeof body.weather === 'string' ? body.weather : undefined;
        const searchRadiusMeters = typeof body.searchRadiusMeters === 'number' ? body.searchRadiusMeters : undefined;

        if ((startNodeId && !endNodeId) || (!startNodeId && endNodeId)) {
            return NextResponse.json({ error: 'Both startNodeId and endNodeId are required when using node IDs' }, { status: 400 });
        }

        const hasStartCoords = typeof startLat === 'number' && typeof startLon === 'number';
        const hasEndCoords = typeof endLat === 'number' && typeof endLon === 'number';
        if (!startNodeId && !(hasStartCoords && hasEndCoords)) {
            return NextResponse.json({ error: 'Provide either startNodeId/endNodeId or both start/end coordinates' }, { status: 400 });
        }

        const result = await NavigationService.getPedestrianRoute({
            startNodeId,
            endNodeId,
            startLat,
            startLon,
            endLat,
            endLon,
            userProfile,
            weather,
            searchRadiusMeters,
        });

        return NextResponse.json(result);
    } catch (err: any) {
        console.error('Navigation Route API Error:', err);
        return NextResponse.json({ error: err?.message || 'Failed to compute route' }, { status: 500 });
    }
}
