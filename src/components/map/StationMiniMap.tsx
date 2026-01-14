'use client';

import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

// Simple custom icon to avoid asset loading issues
const customIcon = L.divIcon({
    className: 'custom-station-marker',
    html: '<div style="background-color: #4f46e5; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);"></div>',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
});

// Component to handle View updates when props change
function MapUpdater({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center, 16);
        map.invalidateSize(); // Ensure map resizes correctly if container size changes
    }, [center, map]);
    return null;
}

interface StationMiniMapProps {
    lat: number;
    lon: number;
}

export default function StationMiniMap({ lat, lon }: StationMiniMapProps) {
    // Validate coordinates
    if (!lat || !lon || isNaN(lat) || isNaN(lon)) {
        return (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center text-xs text-gray-400 font-medium">
                Location Data Unavailable
            </div>
        );
    }

    return (
        <MapContainer
            center={[lat, lon]}
            zoom={16}
            className="w-full h-full bg-gray-100" // bg color prevents white flash
            zoomControl={false}
            scrollWheelZoom={false}
            dragging={true}
            doubleClickZoom={false}
            attributionControl={true}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                subdomains="abcd"
            />
            <Marker position={[lat, lon]} icon={customIcon} />
            <MapUpdater center={[lat, lon]} />
        </MapContainer>
    );
}
