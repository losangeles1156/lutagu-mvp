'use client';

import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useZoneAwareness } from '@/hooks/useZoneAwareness';
import { useAppStore } from '@/stores/appStore';
import { fetchAllNodes, NodeDatum } from '@/lib/api/nodes';
import { NodeMarker } from './NodeMarker';

// Component to handle map center updates
function MapController({ center, isTooFar, fallback }: {
    center: { lat: number, lon: number } | null,
    isTooFar: boolean,
    fallback: { lat: number, lon: number }
}) {
    const map = useMap();
    const mapCenter = useAppStore(state => state.mapCenter);
    const setMapCenter = useAppStore(state => state.setMapCenter);
    const lastTargetRef = useRef<{ lat: number, lon: number } | null>(null);

    const target = mapCenter || (isTooFar ? null : center);
    const { currentNodeId } = useAppStore();
    const [prevNodeId, setPrevNodeId] = useState<string | null>(null);

    useEffect(() => {
        // 1. Handle Selection Centering
        if (currentNodeId && currentNodeId !== prevNodeId) {
            fetchAllNodes().then(nodes => {
                const selectedNode = nodes.find(n => n.id === currentNodeId);
                if (selectedNode) {
                    const [lon, lat] = selectedNode.location.coordinates;
                    map.flyTo([lat, lon], 16, { animate: true, duration: 1.2 });
                    setPrevNodeId(currentNodeId);
                }
            });
            return;
        }

        // 2. Handle System Centering (Fallback or User Location)
        if (!target && isTooFar && !mapCenter) {
            const fallbackTarget = fallback;
            if (JSON.stringify(lastTargetRef.current) !== JSON.stringify(fallbackTarget)) {
                map.flyTo([fallbackTarget.lat, fallbackTarget.lon], 15, { animate: true, duration: 1.5 });
                lastTargetRef.current = fallbackTarget;
            }
            return;
        }

        if (target) {
            const targetChanged = JSON.stringify(lastTargetRef.current) !== JSON.stringify(target);
            if (targetChanged) {
                map.flyTo([target.lat, target.lon], 15, {
                    animate: true,
                    duration: 1.5
                });
                lastTargetRef.current = target;
            }
        }
    }, [target, map, isTooFar, fallback, mapCenter, currentNodeId, prevNodeId]);

    // Clear mapCenter if user starts dragging to allow manual exploration
    useEffect(() => {
        const onMove = () => {
            if (mapCenter) {
                // We keep mapCenter for now as it represents "Active Target"
                // But we could null it if we want "Free Pan" mode
            }
        };
        map.on('movestart', onMove);
        return () => { map.off('movestart', onMove); };
    }, [map, mapCenter]);

    return (
        <>
            {center && !isTooFar && (
                <div className="user-marker">
                    {/* Leaflet markers need to be inside MapContainer but outside MapController technically 
                        if using standard components, but we can use useMap and add a manual marker or 
                        just return it if this was a component. Actually, let's put it in AppMap. */}
                </div>
            )}
        </>
    );
}

export default function AppMap() {
    const { zone, userLocation, isTooFar, centerFallback } = useZoneAwareness();
    const [nodes, setNodes] = useState<NodeDatum[]>([]);

    // Default center is Ueno if user is far
    const defaultCenter: [number, number] = [centerFallback.lat, centerFallback.lon];

    useEffect(() => {
        fetchAllNodes().then(data => {
            setNodes(data);
        });
    }, []);

    return (
        <div className="w-full h-screen relative z-0">
            <MapContainer
                center={defaultCenter}
                zoom={15}
                scrollWheelZoom={true}
                className="w-full h-full"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                />

                <MapController
                    center={userLocation}
                    isTooFar={isTooFar}
                    fallback={centerFallback}
                />

                {/* User Location Marker */}
                {userLocation && !isTooFar && (
                    <NodeMarker
                        node={{
                            id: 'user-location',
                            city_id: 'user',
                            name: { 'zh-TW': '您的位置', 'en': 'Your Location', 'ja': '現在地' },
                            type: 'user',
                            location: { coordinates: [userLocation.lon, userLocation.lat] },
                            vibe: 'me',
                            is_hub: false,
                            geohash: '',
                            parent_hub_id: null,
                            zone: 'user'
                        } as any}
                        zone="core" // Highlight user always
                    />
                )}

                {/* Render Nodes */}
                {nodes.map(node => (
                    <NodeMarker
                        key={node.id}
                        node={node}
                        zone={zone}
                    />
                ))}
            </MapContainer>

            {/* Zone & Distance Indicator */}
            <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
                <div className="bg-white/90 backdrop-blur px-3 py-1 rounded-full shadow-lg text-sm font-medium">
                    <span className={
                        zone === 'core' ? 'text-green-600' :
                            zone === 'buffer' ? 'text-yellow-600' : 'text-gray-600'
                    }>
                        {zone === 'core' ? '🔴 Core Zone' :
                            zone === 'buffer' ? '🟡 Buffer Zone' : '⚪ Outer Zone'}
                    </span>
                </div>
                {isTooFar && (
                    <div className="bg-rose-500/90 text-white backdrop-blur px-3 py-1 rounded-full shadow-lg text-[10px] font-black uppercase tracking-widest animate-pulse">
                        📍 距離過遠已回正 (UENO)
                    </div>
                )}
            </div>
        </div>
    );
}
