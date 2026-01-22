import { roundToStep } from './geometry';
import { viewportStepForZoom } from './zoom';

export interface CacheEntry {
    nodes: any[]; // Using any[] here as NodeDatum might need import, could be refined
    ts: number;
    version: number;
}

export function buildViewportKey(
    zoom: number,
    swLat: number,
    swLon: number,
    neLat: number,
    neLon: number
): string {
    const step = viewportStepForZoom(zoom);
    const rSwLat = roundToStep(swLat, step);
    const rSwLon = roundToStep(swLon, step);
    const rNeLat = roundToStep(neLat, step);
    const rNeLon = roundToStep(neLon, step);

    return `z${Math.floor(zoom)}_${rSwLat}_${rSwLon}_${rNeLat}_${rNeLon}`;
}

export function getCacheTTL(zoom: number): number {
    // Zoom detailed -> short TTL (data updates frequently or precision matters)
    // Zoom overview -> long TTL
    if (zoom >= 15) return 30 * 1000; // 30s
    if (zoom >= 13) return 60 * 1000; // 1m
    return 5 * 60 * 1000; // 5m
}
