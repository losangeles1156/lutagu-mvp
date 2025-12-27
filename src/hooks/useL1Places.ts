import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/stores/appStore';
import { useLocale } from 'next-intl';
import { getLocaleString } from '@/lib/utils/localeUtils';

export interface L1Place {
    id: string; // The UUID from DB
    osm_id: number;
    name: string;
    name_i18n: Record<string, string>;
    category: string;
    location: {
        coordinates: [number, number]; // [lon, lat]
    };
    tags: Record<string, any>;
}

export function useL1Places() {
    const { currentNodeId } = useAppStore();
    const [places, setPlaces] = useState<L1Place[]>([]);
    const [loading, setLoading] = useState(false);
    const locale = useLocale();

    useEffect(() => {
        if (!currentNodeId) {
            setPlaces([]);
            return;
        }

        async function fetchPlaces() {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('l1_places')
                    .select('*')
                    .eq('station_id', currentNodeId);

                if (error) throw error;

                // Parse PostGIS point string "POINT(lon lat)" to array
                // Or if we use .geojson() helper in RPC... 
                // But simple select returns raw string or object depending on driver
                // Supabase JS usually returns GeoJSON if configured, but default is WKT "POINT(x y)"

                // Note: Standard Supabase select on Geography column usually requires conversion or returns object.
                // Optimally we'd use an RPC for GeoJSON, but let's try client-side parsing for MVP.
                // Actually PostgREST returns GeoJSON by default for headers, but JS client might not.
                // Let's assume it returns GeoJSON object or we parse WKT.

                const parsed = (data || []).map((row: any) => {
                    let coords = [0, 0];
                    if (typeof row.location === 'string' && row.location.startsWith('POINT')) {
                        const match = row.location.match(/POINT\(([-0-9\.]+) ([-0-9\.]+)\)/);
                        if (match) {
                            coords = [parseFloat(match[1]), parseFloat(match[2])];
                        }
                    } else if (row.location?.coordinates) {
                        coords = row.location.coordinates;
                    }

                    return {
                        id: row.id,
                        osm_id: row.osm_id,
                        name: getLocaleString(row.name_i18n || { en: row.name }, locale),
                        name_i18n: row.name_i18n,
                        category: row.category,
                        location: { coordinates: coords },
                        tags: row.tags
                    } as L1Place;
                });

                setPlaces(parsed);
            } catch (err) {
                console.error('[useL1Places] Error:', err);
            } finally {
                setLoading(false);
            }
        }

        fetchPlaces();
    }, [currentNodeId, locale]);

    return { places, loading };
}
