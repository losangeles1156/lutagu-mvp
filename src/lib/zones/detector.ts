import { BoundingBox } from '../adapters/types';
import { supabase } from '../supabase';

export type Zone = 'core' | 'buffer' | 'outer';

export interface ZoneConfig {
    coreBounds: BoundingBox;
    bufferRadiusKm: number;
}

export class ZoneDetector {
    private config: ZoneConfig;

    constructor(config: ZoneConfig) {
        this.config = config;
    }

    async detectZone(lat: number, lon: number): Promise<Zone> {
        // 1. Check if in Core Bounds
        if (this.isInCoreBounds(lat, lon)) {
            return 'core';
        }

        // 2. Check if has ODPT coverage (Buffer Zone)
        // We assume anything within the buffer radius of a known station is "Buffer".
        // For now, we query the DB to see if there is a 'station' nearby.
        const hasNearbyStation = await this.checkBufferZone(lat, lon);
        if (hasNearbyStation) {
            return 'buffer';
        }

        // 3. Else Outer
        return 'outer';
    }

    private isInCoreBounds(lat: number, lon: number): boolean {
        const { sw, ne } = this.config.coreBounds;
        // Lat check: sw[0] <= lat <= ne[0]
        // Lon check: sw[1] <= lon <= ne[1]
        return lat >= sw[0] && lat <= ne[0] && lon >= sw[1] && lon <= ne[1];
    }

    private async checkBufferZone(lat: number, lon: number): Promise<boolean> {
        try {
            const radiusMeters = this.config.bufferRadiusKm * 1000;

            // Use the RPC 'nearby_nodes' or similar check.
            // Optimized query: just check existence of ONE node within radius.
            let data: any = null;
            let error: any = null;

            ({ data, error } = await supabase
                .rpc('nearby_nodes_v2', {
                    center_lat: lat,
                    center_lon: lon,
                    radius_meters: radiusMeters,
                    max_results: 1
                }));

            if (error) {
                ({ data, error } = await supabase
                    .rpc('nearby_nodes', {
                        center_lat: lat,
                        center_lon: lon,
                        radius_meters: radiusMeters
                    })
                    .limit(1));
            }

            if (error) {
                console.error('Buffer zone check failed:', error);
                return false;
            }

            return data && data.length > 0;
        } catch (e) {
            return false;
        }
    }
}
