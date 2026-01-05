import { NextRequest, NextResponse } from 'next/server';

// Ward center coordinates for Tokyo 23 wards
const WARD_CENTERS: Record<string, { lat: number; lng: number; name: { ja: string; en: string; zh: string } }> = {
    'ward:taito': { lat: 35.7148, lng: 139.7807, name: { ja: '台東区', en: 'Taito', zh: '台東區' } },
    'ward:chiyoda': { lat: 35.6938, lng: 139.7536, name: { ja: '千代田区', en: 'Chiyoda', zh: '千代田區' } },
    'ward:chuo': { lat: 35.6852, lng: 139.7738, name: { ja: '中央区', en: 'Chuo', zh: '中央區' } },
    'ward:minato': { lat: 35.6585, lng: 139.7454, name: { ja: '港区', en: 'Minato', zh: '港區' } },
    'ward:shinjuku': { lat: 35.6938, lng: 139.7037, name: { ja: '新宿区', en: 'Shinjuku', zh: '新宿區' } },
    'ward:bunkyo': { lat: 35.7148, lng: 139.7536, name: { ja: '文京区', en: 'Bunkyo', zh: '文京區' } },
    'ward:sumida': { lat: 35.7100, lng: 139.8100, name: { ja: '墨田区', en: 'Sumida', zh: '墨田區' } },
    'ward:koto': { lat: 35.6700, lng: 139.8200, name: { ja: '江東区', en: 'Koto', zh: '江東區' } },
    'ward:shinagawa': { lat: 35.6285, lng: 139.7278, name: { ja: '品川区', en: 'Shinagawa', zh: '品川區' } },
};

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    // Simple Euclidean distance (sufficient for this use case)
    return Math.sqrt(Math.pow(lat1 - lat2, 2) + Math.pow(lng1 - lng2, 2));
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { lat, lng } = body;

        if (typeof lat !== 'number' || typeof lng !== 'number') {
            return NextResponse.json(
                { error: 'Invalid coordinates' },
                { status: 400 }
            );
        }

        // Find the nearest ward
        let nearestWardId: string | null = null;
        let minDistance = Infinity;

        for (const [wardId, wardData] of Object.entries(WARD_CENTERS)) {
            const distance = calculateDistance(lat, lng, wardData.lat, wardData.lng);
            if (distance < minDistance) {
                minDistance = distance;
                nearestWardId = wardId;
            }
        }

        if (nearestWardId) {
            const wardData = WARD_CENTERS[nearestWardId];
            return NextResponse.json({
                ward: {
                    id: nearestWardId,
                    name: wardData.name,
                    code: nearestWardId.replace('ward:', ''),
                    prefecture: 'Tokyo',
                },
            });
        }

        return NextResponse.json({ ward: null });
    } catch (error) {
        console.error('[detect-ward] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
