import { useEffect, useState, useCallback, useRef } from 'react';
import { logger } from '@/lib/utils/logger';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/stores/appStore';
import { useLocale } from 'next-intl';
import { getLocaleString } from '@/lib/utils/localeUtils';
import { buildStationIdSearchCandidates } from '@/lib/api/nodes';
import { STATIC_L1_DATA } from '@/data/staticL1Data';
// import { cachedL1Places } from '@/lib/cache';
import { CacheKeyBuilder, hashStationIds } from '@/lib/cache/cacheKeyBuilder';

// Haversine 公式計算兩點間距離（公尺）
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // 地球半徑（公尺）
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export interface L1Place {
    id: string;
    osm_id: number;
    name: string;
    name_i18n: Record<string, string>;
    category: string;
    subcategory?: string;
    distance_meters?: number;
    navigation_url?: string;
    location: {
        coordinates: [number, number]; // [lon, lat]
    };
    lat?: number;
    lng?: number;
    tags: Record<string, any>;
    // 自定義景點/合作店家欄位
    isCustom?: boolean;
    isPartner?: boolean;
    affiliateUrl?: string;
    discountInfo?: {
        type: 'percent' | 'fixed' | 'special';
        value: number;
        description: string;
    };
    businessHours?: Record<string, any>;
    logoUrl?: string;
    priority?: number;
    description?: string;
}

export function useL1Places() {
    const { currentNodeId } = useAppStore();
    const [places, setPlaces] = useState<L1Place[]>([]);
    const [loading, setLoading] = useState(false);
    const locale = useLocale();
    const fetchIdRef = useRef(0);

    // 從資料庫獲取景點資料的輔助函數
    const fetchPlacesFromDB = useCallback(async (stationIds: string[], hubId: string | null | undefined, loc: string): Promise<L1Place[]> => {
        // 先獲取自定義景點（高優先級）
        const customPlaces: L1Place[] = [];
        try {
            const { data: customData, error: customError } = await supabase
                .from('l1_custom_places')
                .select('*')
                .in('station_id', stationIds)
                .eq('is_active', true)
                .eq('status', 'approved');

            if (customError) {
                logger.warn('[useL1Places] Error fetching custom places:', customError);
            } else if (customData && customData.length > 0) {
                for (const row of customData) {
                    let coords: [number, number] = [0, 0];
                    if (typeof row.location === 'string' && row.location.startsWith('POINT')) {
                        const match = row.location.match(/POINT\(([-0-9\.]+) ([-0-9\.]+)\)/);
                        if (match) {
                            coords = [parseFloat(match[1]), parseFloat(match[2])];
                        }
                    } else if (row.location?.coordinates) {
                        coords = row.location.coordinates;
                    }

                    customPlaces.push({
                        id: row.id,
                        osm_id: 0,
                        name: getLocaleString(row.name_i18n || { en: row.name }, loc),
                        name_i18n: row.name_i18n || { en: row.name },
                        category: row.category,
                        subcategory: row.subcategory,
                        distance_meters: 0,
                        navigation_url: row.affiliate_url,
                        location: { coordinates: coords },
                        lat: coords[1],
                        lng: coords[0],
                        tags: {},
                        isCustom: true,
                        isPartner: row.is_partner || false,
                        affiliateUrl: row.affiliate_url,
                        discountInfo: row.discount_info,
                        businessHours: row.business_hours,
                        logoUrl: row.logo_url,
                        priority: row.priority || 100,
                        description: getLocaleString(row.description_i18n || {}, loc)
                    });
                }
            }
        } catch (err) {
            logger.warn('[useL1Places] Error fetching custom places:', err);
        }

        // 獲取 OSM 景點
        const { data, error } = await supabase
            .from('l1_places')
            .select('*')
            .in('station_id', stationIds)
            .order('distance_meters', { ascending: true })
            .limit(200);

        if (error) throw error;

        const parsed = (data || []).map((row: any) => {
            let coords: [number, number] = [0, 0];
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
                name: getLocaleString(row.name_i18n || { en: row.name }, loc),
                name_i18n: row.name_i18n,
                category: row.category,
                subcategory: row.subcategory,
                distance_meters: row.distance_meters,
                navigation_url: row.navigation_url,
                location: { coordinates: coords },
                lat: row.lat,
                lng: row.lng,
                tags: row.tags,
                isCustom: false,
                isPartner: false
            } as L1Place;
        });

        // 去重：自定義景點優先於 OSM 景點
        const allPlaces: L1Place[] = [];
        allPlaces.push(...parsed);

        for (const custom of customPlaces) {
            let isDuplicate = false;
            for (const osmPlace of parsed) {
                const distance = calculateDistance(
                    custom.location.coordinates[1], custom.location.coordinates[0],
                    osmPlace.location.coordinates[1], osmPlace.location.coordinates[0]
                );
                if (distance < 50) {
                    const idx = allPlaces.findIndex(p => p.id === osmPlace.id);
                    if (idx >= 0) {
                        allPlaces[idx] = { ...osmPlace, ...custom };
                    }
                    isDuplicate = true;
                    break;
                }
            }
            if (!isDuplicate) {
                allPlaces.push(custom);
            }
        }

        // [Safety Guard] Max 30 items per category
        // Sort first
        allPlaces.sort((a, b) => {
            if (a.isCustom !== b.isCustom) return a.isCustom ? -1 : 1;
            if (a.priority && b.priority) return b.priority - a.priority;
            return (a.distance_meters || 0) - (b.distance_meters || 0);
        });

        const categoryGroups: Record<string, L1Place[]> = {};
        const limitedPlaces: L1Place[] = [];

        for (const place of allPlaces) {
            const cat = place.category || 'default';
            if (!categoryGroups[cat]) categoryGroups[cat] = [];

            if (categoryGroups[cat].length < 30) {
                categoryGroups[cat].push(place);
                limitedPlaces.push(place);
            }
        }

        return limitedPlaces;
    }, []);

    useEffect(() => {
        if (!currentNodeId) {
            setPlaces([]);
            return;
        }

        const nodeId = currentNodeId;
        const currentFetchId = ++fetchIdRef.current;

        async function fetchPlaces() {
            setLoading(true);
            try {
                const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
                const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

                if (!supabaseUrl || !supabaseKey) {
                    logger.warn('[useL1Places] Supabase credentials missing, using local fallback');
                    const stationIds = buildStationIdSearchCandidates(nodeId);
                    const fallbackPlaces: L1Place[] = [];

                    for (const sId of stationIds) {
                        const staticData = STATIC_L1_DATA[sId];
                        if (staticData && staticData.categories) {
                            Object.entries(staticData.categories).forEach(([catId, cat]) => {
                                if (cat && Array.isArray(cat.representative_spots)) {
                                    cat.representative_spots.forEach((spot: any, idx: number) => {
                                        fallbackPlaces.push({
                                            id: `fallback-${sId}-${catId}-${idx}`,
                                            osm_id: typeof spot.osm_id === 'number' ? spot.osm_id : idx + 1000,
                                            name: getLocaleString(spot.name, locale),
                                            name_i18n: spot.name,
                                            category: catId,
                                            subcategory: spot.subcategory || '',
                                            distance_meters: spot.distance_meters || 100,
                                            location: { coordinates: [139.77, 35.71] },
                                            tags: {},
                                            description: getLocaleString(spot.description_i18n || {}, locale)
                                        } as L1Place);
                                    });
                                }
                            });
                        }
                    }

                    if (currentFetchId === fetchIdRef.current) {
                        setPlaces(fallbackPlaces);
                    }
                    setLoading(false);
                    return;
                }

                let hubId: string | null = null;
                try {
                    const { data: nodeRow } = await supabase
                        .from('nodes')
                        .select('parent_hub_id')
                        .eq('id', nodeId)
                        .maybeSingle();
                    hubId = nodeRow?.parent_hub_id ?? null;
                } catch {
                    hubId = null;
                }

                const stationIds = Array.from(
                    new Set([
                        ...buildStationIdSearchCandidates(nodeId),
                        ...(hubId ? buildStationIdSearchCandidates(hubId) : [])
                    ])
                );

                // 生成一致的快取鍵（排序後的站台 ID）
                const cacheKey = CacheKeyBuilder.forL1Places(stationIds, {
                    locale: locale
                });

                // 使用快取獲取資料
                // Client-side: Skip Redis cache, fetch directly
                const result = await fetchPlacesFromDB(stationIds, hubId, locale);

                if (currentFetchId === fetchIdRef.current) {
                    setPlaces(result);
                }
            } catch (err) {
                logger.error('[useL1Places] Error:', err);
            } finally {
                if (currentFetchId === fetchIdRef.current) {
                    setLoading(false);
                }
            }
        }

        fetchPlaces();
    }, [currentNodeId, locale, fetchPlacesFromDB]);

    return { places, loading };
}
