import { NextResponse } from 'next/server';
import { NavigationService } from '@/lib/navigation/NavigationService';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const lat = parseFloat(searchParams.get('lat') || '');
        const lon = parseFloat(searchParams.get('lon') || '');
        const radius = parseInt(searchParams.get('radius') || '500'); // Default 500m
        const userProfile = searchParams.get('user_profile') || 'general'; // 'general' | 'wheelchair' | 'stroller'
        const weather = searchParams.get('weather') || 'clear'; // 'clear' | 'rain'

        if (isNaN(lat) || isNaN(lon)) {
            return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
        }

        const result = await NavigationService.getPedestrianGraph(lat, lon, radius, userProfile, weather);

        return NextResponse.json(result);

    } catch (err: any) {
        console.error('Navigation API Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
