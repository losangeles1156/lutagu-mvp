'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useZoneAwareness } from '@/hooks/useZoneAwareness';
import { useAppStore } from '@/stores/appStore';
import { fetchNearbyNodes, fetchAllNodes, NodeDatum } from '@/lib/api/nodes';
import { NodeMarker } from './NodeMarker';

// Fix leafet icon
const icon = L.icon({
    iconUrl: '/images/marker-icon.png',
    shadowUrl: '/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

// Component to handle map center updates
function MapController({ center }: { center: { lat: number, lon: number } | null }) {
    const map = useMap();
    const mapCenter = useAppStore(state => state.mapCenter);

    // Priority: Store MapCenter > Props (User Location)
    const target = mapCenter || center;

    useEffect(() => {
        if (target) {
            map.flyTo([target.lat, target.lon], 15, {
                animate: true,
                duration: 1.5
            });
        }
    }, [target, map]);
    return null;
}

export default function AppMap() {
    const { zone, userLocation } = useZoneAwareness();
    const [nodes, setNodes] = useState<NodeDatum[]>([]);

    // Default Tokyo center
    const defaultCenter = [35.6895, 139.6917];

    useEffect(() => {
        // Always fetch ALL nodes for manual planning visibility
        fetchAllNodes().then(data => {
            console.log('Loaded nodes:', data.length);
            setNodes(data);
        });
    }, []);

    return (
        <div className="w-full h-screen relative z-0">
            <MapContainer
                center={defaultCenter as [number, number]}
                zoom={13}
                scrollWheelZoom={true}
                className="w-full h-full"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                />

                {userLocation && <MapController center={userLocation} />}

                {/* Render Real Nodes */}
                {nodes.map(node => (
                    <NodeMarker
                        key={node.id}
                        node={node}
                        // We can pass the zone logic down, or determine it per node if needed
                        // For now, simple zone passed from global state or node's own zone
                        zone={zone}
                    />
                ))}
            </MapContainer>

            {/* Zone Indicator (Debug/MVP) */}
            <div className="absolute top-4 left-4 z-[1000] bg-white/90 backdrop-blur px-3 py-1 rounded-full shadow-lg text-sm font-medium">
                <span className={
                    zone === 'core' ? 'text-green-600' :
                        zone === 'buffer' ? 'text-yellow-600' : 'text-gray-600'
                }>
                    {zone === 'core' ? '🔴 Core Zone' :
                        zone === 'buffer' ? '🟡 Buffer Zone' : '⚪ Outer Zone'}
                </span>
            </div>
        </div>
    );
}
