'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { ZoneDetector } from '../lib/zones/detector';
import { tokyoCoreAdapter } from '../lib/adapters/tokyo';
import { calculateDistance } from '../lib/utils/distance';

// Ueno Station coordinates as the center of wisdom
const UENO_CENTER = { lat: 35.7138, lon: 139.7773 };
const MAX_DISTANCE_KM = 50;

// Initialize detector with Tokyo config
const detector = new ZoneDetector({
    coreBounds: tokyoCoreAdapter.bounds,
    bufferRadiusKm: 5 // 5km as per v2.1 spec
});

export function useZoneAwareness() {
    const { setZone, currentZone } = useAppStore();
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
                    const { latitude, longitude } = position.coords;

                    // Calculate distance to Ueno
                    const dist = calculateDistance(latitude, longitude, UENO_CENTER.lat, UENO_CENTER.lon);

                    if (dist > MAX_DISTANCE_KM) {
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
                            console.warn('[useZoneAwareness] Zone detection error:', zoneError);
                            // Fallback to core zone on detection error
                            if (isSubscribed) setZone('core');
                        }
                    }
                } catch (positionError) {
                    console.error('[useZoneAwareness] Position processing error:', positionError);
                    if (isSubscribed) {
                        setZone('core');
                        setIsTooFar(true);
                    }
                }
            },
            (error) => {
                // Handle geolocation errors gracefully
                console.warn('[useZoneAwareness] Geolocation error:', error.code, error.message);
                if (isSubscribed) {
                    setZone('core'); // Fallback to "Virtual Core"
                    setIsTooFar(true);
                }
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
