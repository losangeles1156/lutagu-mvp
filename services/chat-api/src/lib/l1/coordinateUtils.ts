/**
 * 座標轉換工具
 * 處理 WKT、GeoJSON 和內部座標格式之間的轉換
 */

export interface Point {
    /** 經度 (Longitude) */
    lng: number;
    /** 緯度 (Latitude) */
    lat: number;
}

export interface GeoJSONPoint {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
}

/**
 * 解析 WKT POINT 格式
 * 例如: "POINT(139.76 35.68)"
 */
export function parseWKTPoint(wkt: string): Point | null {
    if (!wkt || typeof wkt !== 'string') {
        return null;
    }

    // 匹配 POINT(lon lat) 格式
    const match = wkt.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
    if (!match) {
        return null;
    }

    const lng = parseFloat(match[1]);
    const lat = parseFloat(match[2]);

    if (isNaN(lng) || isNaN(lat)) {
        return null;
    }

    return { lng, lat };
}

/**
 * 生成 WKT POINT 格式
 */
export function createWKTPoint(point: Point): string {
    return `POINT(${point.lng} ${point.lat})`;
}

/**
 * 轉換為 GeoJSON Point 格式
 */
export function toGeoJSONPoint(point: Point): GeoJSONPoint {
    return {
        type: 'Point',
        coordinates: [point.lng, point.lat]
    };
}

/**
 * 解析 GeoJSON Point
 */
export function parseGeoJSONPoint(geojson: GeoJSONPoint | null): Point | null {
    if (!geojson || !geojson.coordinates || geojson.coordinates.length < 2) {
        return null;
    }

    return {
        lng: geojson.coordinates[0],
        lat: geojson.coordinates[1]
    };
}

// 內部介面用於類型檢查
interface GeoJSONLike {
    type?: string;
    coordinates?: [number, number];
}

/**
 * 解析任何類型的座標來源
 * 支援: WKT POINT 字串、GeoJSON 物件、{coordinates: [lng, lat]} 格式
 */
export function parseCoordinates(
    source: string | { coordinates?: [number, number] } | GeoJSONLike | null | undefined
): Point | null {
    if (!source) {
        return null;
    }

    // WKT POINT 字串
    if (typeof source === 'string') {
        return parseWKTPoint(source);
    }

    // GeoJSON 格式檢查
    const geoSource = source as GeoJSONLike;
    if (geoSource.type === 'Point' && geoSource.coordinates) {
        return {
            lng: geoSource.coordinates[0],
            lat: geoSource.coordinates[1]
        };
    }

    // { coordinates: [lng, lat] } 格式
    if (geoSource.coordinates && Array.isArray(geoSource.coordinates) && geoSource.coordinates.length >= 2) {
        return {
            lng: geoSource.coordinates[0],
            lat: geoSource.coordinates[1]
        };
    }

    return null;
}

/**
 * 轉換為 { coordinates: [lng, lat] } 格式
 */
export function toCoordinatesArray(point: Point): [number, number] {
    return [point.lng, point.lat];
}

/**
 * 驗證座標是否有效
 */
export function isValidCoordinate(point: Point): boolean {
    if (!point || typeof point.lng !== 'number' || typeof point.lat !== 'number') {
        return false;
    }

    // 經度範圍: -180 到 180
    if (point.lng < -180 || point.lng > 180) {
        return false;
    }

    // 緯度範圍: -90 到 90
    if (point.lat < -90 || point.lat > 90) {
        return false;
    }

    return true;
}

/**
 * 檢查座標是否在合理範圍內 (日本東京附近)
 */
export function isNearTokyo(point: Point): boolean {
    // 東京大致範圍
    const TOKYO_BOUNDS = {
        minLat: 35.4,
        maxLat: 35.8,
        minLng: 139.4,
        maxLng: 140.0
    };

    return (
        point.lat >= TOKYO_BOUNDS.minLat &&
        point.lat <= TOKYO_BOUNDS.maxLat &&
        point.lng >= TOKYO_BOUNDS.minLng &&
        point.lng <= TOKYO_BOUNDS.maxLng
    );
}

/**
 * 計算兩點間距離 (Haversine 公式，回傳公尺)
 */
export function calculateDistance(
    point1: Point,
    point2: Point
): number {
    const R = 6371000; // 地球半徑 (公尺)
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLng = (point2.lng - point1.lng) * Math.PI / 180;

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

/**
 * 計算點到線段的最短距離
 */
export function pointToLineSegmentDistance(
    point: Point,
    lineStart: Point,
    lineEnd: Point
): number {
    const A = point.lng - lineStart.lng;
    const B = point.lat - lineStart.lat;
    const C = lineEnd.lng - lineStart.lng;
    const D = lineEnd.lat - lineStart.lat;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;

    let param = -1;
    if (lenSq !== 0) {
        param = dot / lenSq;
    }

    let xx, yy;

    if (param < 0) {
        xx = lineStart.lng;
        yy = lineStart.lat;
    } else if (param > 1) {
        xx = lineEnd.lng;
        yy = lineEnd.lat;
    } else {
        xx = lineStart.lng + param * C;
        yy = lineStart.lat + param * D;
    }

    return calculateDistance(point, { lng: xx, lat: yy });
}

export type { Point as PointType, GeoJSONPoint as GeoJSONPointType };
