import { useEffect, useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { ZoneDetector, Zone } from '../lib/zones/detector';
import { tokyoCoreAdapter } from '../lib/adapters/tokyo';

// Initialize detector with Tokyo config
const detector = new ZoneDetector({
    coreBounds: tokyoCoreAdapter.bounds,
    bufferRadiusKm: 5 // 5km as per v2.1 spec
});

export function useZoneAwareness() {
    const { setZone, currentZone } = useAppStore();
    const [userLocation, setUserLocation] = useState<{ lat: number, lon: number } | null>(null);

    useEffect(() => {
        if (!navigator.geolocation) {
            setZone('outer');
            return;
        }

        const watchId = navigator.geolocation.watchPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                setUserLocation({ lat: latitude, lon: longitude });

                // Use the modular detector
                const detectedZone = await detector.detectZone(latitude, longitude);

                // Only update store if changed to avoid renders
                if (detectedZone !== currentZone) {
                    setZone(detectedZone);
                }
            },
            (error) => {
                console.error('Geolocation error:', error);
                setZone('outer'); // Fallback
            }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, [currentZone, setZone]);

    return { zone: currentZone, userLocation };
}
