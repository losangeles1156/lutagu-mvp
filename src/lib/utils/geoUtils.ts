
/**
 * Tokyo 23 Wards bounding box (with buffer for edge stations)
 * 東京23區邊界座標（含緩衝區以涵蓋邊緣車站）
 */
export const TOKYO_23_WARDS_BOUNDS = {
    minLat: 35.52,  // 南端（大田區）
    maxLat: 35.82,  // 北端（北區、足立區）
    minLng: 139.56, // 西端（世田谷區）
    maxLng: 139.93  // 東端（江東區、江戸川區）
};

/**
 * Check if coordinates are within Tokyo 23 wards area
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns true if coordinates are within Tokyo 23 wards bounds
 */
export function isWithinTokyo23Wards(lat: number, lng: number): boolean {
    if (typeof lat !== 'number' || typeof lng !== 'number') return false;
    if (isNaN(lat) || isNaN(lng)) return false;

    return (
        lat >= TOKYO_23_WARDS_BOUNDS.minLat &&
        lat <= TOKYO_23_WARDS_BOUNDS.maxLat &&
        lng >= TOKYO_23_WARDS_BOUNDS.minLng &&
        lng <= TOKYO_23_WARDS_BOUNDS.maxLng
    );
}

/**
 * Calculate distance between two points in kilometers using Haversine formula
 */
export function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
}

function deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
}

/**
 * Helper to extract lat/lon from NodeDatum which might have various shapes
 */
export function getNodeCoordinates(node: any): [number, number] | null {
    if (!node) return null;

    // Shape 1: PostGIS object { coordinates: [lon, lat] }
    if (Array.isArray(node.coordinates?.coordinates)) {
        return [node.coordinates.coordinates[1], node.coordinates.coordinates[0]];
    }

    // Shape 2: Flat coordinates array [lon, lat]
    if (Array.isArray(node.coordinates) && typeof node.coordinates[0] === 'number') {
        const [lon, lat] = node.coordinates;
        return [lat, lon];
    }

    // Shape 3: Lat/Lng object
    if (typeof node.coordinates?.lat === 'number') {
        return [node.coordinates.lat, node.coordinates.lng];
    }

    // Shape 4: location object
    if (Array.isArray(node.location?.coordinates)) {
        return [node.location.coordinates[1], node.location.coordinates[0]];
    }

    return null;
}
