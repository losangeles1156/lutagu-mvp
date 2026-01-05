
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
