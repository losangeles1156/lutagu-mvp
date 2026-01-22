'use client';

import { useEffect, useState } from 'react';
import { logger } from '@/lib/utils/logger';
import { useMapStore } from '@/stores/mapStore';
import { ZoneDetector } from '../lib/zones/detector';
import { tokyoCoreAdapter } from '../lib/adapters/tokyo';
import { calculateDistance } from '../lib/utils/distance';
import { TOKYO_CENTER, UENO_CENTER, TOKYO_RADIUS_THRESHOLD_KM } from '../lib/constants/geo';

// Initialize detector with Tokyo config
const detector = new ZoneDetector({
    coreBounds: tokyoCoreAdapter.bounds,
    bufferRadiusKm: 5 // 5km as per v2.1 spec
});

export function useZoneAwareness() {
    const setZone = useMapStore(s => s.setZone);
    const currentZone = useMapStore(s => s.currentZone);
    const [userLocation, setUserLocation] = useState<{ lat: number, lon: number } | null>(null);
    const [isTooFar, setIsTooFar] = useState(false);

    useEffect(() => {
        // [PERF] Check for geolocation API availability
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
            setZone('core'); // Fallback to Virtual Core
            setIsTooFar(true);
            return;
        }

        let isSubscribed = true;

        const watchId = navigator.geolocation.watchPosition(
            async (position) => {
                if (!isSubscribed) return;

                try {
                    const { latitude, longitude, accuracy } = position.coords;

                    // Handle unstable GPS signal (e.g. accuracy > 500m)
                    if (accuracy > 500) {
                        logger.warn('[useZoneAwareness] Low GPS accuracy:', accuracy);
                        // We still use it but maybe we shouldn't reset if it's just a temporary jump
                    }

                    // Calculate distance to Tokyo Center
                    const distFromCenter = calculateDistance(latitude, longitude, TOKYO_CENTER.lat, TOKYO_CENTER.lon);

                    if (distFromCenter > TOKYO_RADIUS_THRESHOLD_KM) {
                        setIsTooFar(true);
                        setUserLocation(null); // Don't track real location if too far
                        setZone('core'); // Fallback to "Virtual Core"
                    } else {
                        setIsTooFar(false);
                        setUserLocation({ lat: latitude, lon: longitude });

                        // [FIX] Wrap async detector call in try/catch
                        try {
                            const detectedZone = await detector.detectZone(latitude, longitude);

                            // Only update store if component still mounted and zone changed
                            if (isSubscribed && detectedZone !== currentZone) {
                                setZone(detectedZone);
                            }
                        } catch (zoneError) {
                            logger.warn('[useZoneAwareness] Zone detection error:', zoneError);
                            // Fallback to core zone on detection error
                            if (isSubscribed) setZone('core');
                        }
                    }
                } catch (positionError) {
                    logger.error('[useZoneAwareness] Position processing error:', positionError);
                    if (isSubscribed) {
                        setZone('core');
                        setIsTooFar(true);
                    }
                }
            },
            (error) => {
                // Handle geolocation errors gracefully
                if (!isSubscribed) return;

                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        logger.warn('[useZoneAwareness] Geolocation permission denied');
                        break;
                    case error.POSITION_UNAVAILABLE:
                        logger.warn('[useZoneAwareness] Geolocation position unavailable');
                        break;
                    case error.TIMEOUT:
                        logger.warn('[useZoneAwareness] Geolocation timeout');
                        break;
                    default:
                        logger.warn('[useZoneAwareness] Unknown geolocation error:', error.message);
                }

                setZone('core'); // Fallback to "Virtual Core"
                setIsTooFar(true);
                setUserLocation(null);
            },
            {
                // [PERF] Optimized settings for mobile
                enableHighAccuracy: false, // Reduces battery usage and timeout risk on mobile
                timeout: 15000,            // 15 second timeout
                maximumAge: 60000          // Accept cached position up to 1 minute old
            }
        );

        return () => {
            isSubscribed = false;
            navigator.geolocation.clearWatch(watchId);
        };
    }, [currentZone, setZone]);

    return { zone: currentZone, userLocation, isTooFar, centerFallback: UENO_CENTER };
}
