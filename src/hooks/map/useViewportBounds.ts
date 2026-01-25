import { useState, useEffect } from 'react';
import { useMap } from 'react-leaflet';
import type { LatLngBounds } from 'leaflet';

export function useViewportBounds() {
    // This hook must be used inside a child of <MapContainer>
    const map = useMap();
    const [bounds, setBounds] = useState<LatLngBounds | null>(null);
    const [zoom, setZoom] = useState<number>(15);

    useEffect(() => {
        if (!map) return;

        const updateBounds = () => {
            // Add padding to fetch slightly more than visible
            setBounds(map.getBounds().pad(0.2));
            setZoom(map.getZoom());
        };

        map.on('moveend', updateBounds);
        map.on('zoomend', updateBounds);

        // Initial set
        updateBounds();

        return () => {
            map.off('moveend', updateBounds);
            map.off('zoomend', updateBounds);
        };
    }, [map]);

    return { bounds, zoom };
}
