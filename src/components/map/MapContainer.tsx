'use client';

import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useZoneAwareness } from '@/hooks/useZoneAwareness';
import { useAppStore } from '@/stores/appStore';
import { fetchAllNodes, NodeDatum } from '@/lib/api/nodes';
import { NodeMarker } from './NodeMarker';
import { TrainLayer } from './TrainLayer';
import { useLocale } from 'next-intl';

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
    const [gpsAlert, setGpsAlert] = useState<{ show: boolean, type: 'far' | 'denied' }>({ show: false, type: 'far' });
    const locale = useLocale();

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
                        zone="core"
                        locale={locale}
                    />
                )}

                {/* Render Nodes */}
                {nodes.map(node => (
                    <NodeMarker
                        key={node.id}
                        node={node}
                        zone={zone}
                        locale={locale}
                    />
                ))}

                {/* Real-time Train Layer */}
                <TrainLayer />
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

            {/* GPS & Navigation Controls */}
            <div className="absolute bottom-24 right-4 z-[1000] flex flex-col gap-3">
                <button
                    onClick={async () => {
                        if (!navigator.geolocation) return;
                        navigator.geolocation.getCurrentPosition(
                            async (pos) => {
                                const { latitude, longitude } = pos.coords;
                                // Simple distance check to Ueno (approx 0.5 degrees roughly 50km)
                                const dist = Math.sqrt(Math.pow(latitude - 35.7138, 2) + Math.pow(longitude - 139.7773, 2));

                                if (dist > 0.45) { // Roughly 50km
                                    const ueno = { lat: 35.7138, lon: 139.7773 };
                                    useAppStore.getState().setMapCenter(ueno);
                                    setGpsAlert({ show: true, type: 'far' });
                                } else {
                                    // Find nearest node
                                    try {
                                        const res = await fetchAllNodes();
                                        let nearest = res[0];
                                        let minD = Infinity;
                                        res.forEach(n => {
                                            const d = Math.sqrt(Math.pow(latitude - n.location.coordinates[1], 2) + Math.pow(longitude - n.location.coordinates[0], 2));
                                            if (d < minD) {
                                                minD = d;
                                                nearest = n;
                                            }
                                        });
                                        if (nearest) {
                                            const [lon, lat] = nearest.location.coordinates;
                                            useAppStore.getState().setMapCenter({ lat, lon });
                                            useAppStore.getState().setCurrentNode(nearest.id);
                                        }
                                    } catch (e) {
                                        useAppStore.getState().setMapCenter({ lat: latitude, lon: longitude });
                                    }
                                }
                            },
                            (err) => {
                                if (err.code === 1) setGpsAlert({ show: true, type: 'denied' });
                            }
                        );
                    }}
                    className="w-12 h-12 bg-white rounded-2xl shadow-xl flex items-center justify-center text-indigo-600 hover:bg-indigo-50 transition-all border border-black/[0.03] active:scale-95"
                >
                    <div className="relative">
                        <div className="absolute inset-0 bg-indigo-400 blur-lg opacity-20" />
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 3L10 14M21 3l-7 20-4-9-9-4 20-7z"></path></svg>
                    </div>
                </button>
            </div>

            {/* GPS Alert Overlay */}
            {gpsAlert.show && (
                <div className="absolute inset-0 z-[2000] flex items-center justify-center p-6 bg-black/20 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-xs rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-6 text-center">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${gpsAlert.type === 'far' ? 'bg-amber-50 text-amber-500' : 'bg-rose-50 text-rose-500'}`}>
                                {gpsAlert.type === 'far' ?
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg> :
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg>
                                }
                            </div>
                            <h3 className="text-lg font-black text-gray-900 mb-2">
                                {gpsAlert.type === 'far' ? '距離核心區域過遠' : '定位授權失敗'}
                            </h3>
                            <p className="text-xs text-gray-500 font-medium leading-relaxed mb-6">
                                {gpsAlert.type === 'far' ?
                                    '偵測到您目前距離東京超過 50 公里。已為您預設至上野車站，您也可以手動選擇下方的門戶節點。' :
                                    '請開啟瀏覽器定位授權，以便 Bambi 為您精準導航。'}
                            </p>

                            {gpsAlert.type === 'far' && (
                                <div className="grid grid-cols-2 gap-2 mb-6 text-indigo-100">
                                    {['上野', '淺草', '秋葉原', '東京'].map((name) => (
                                        <button
                                            key={name}
                                            onClick={() => {
                                                const nodesFallback = {
                                                    '上野': { lat: 35.7138, lon: 139.7773 },
                                                    '淺草': { lat: 35.7119, lon: 139.7976 },
                                                    '秋葉原': { lat: 35.6984, lon: 139.7753 },
                                                    '東京': { lat: 35.6812, lon: 139.7671 }
                                                };
                                                const target = (nodesFallback as any)[name];
                                                useAppStore.getState().setMapCenter(target);
                                                setGpsAlert({ show: false, type: 'far' });
                                            }}
                                            className="py-2.5 bg-indigo-50/50 hover:bg-indigo-600 hover:text-white text-xs font-black text-indigo-700 rounded-xl transition-all active:scale-95"
                                        >
                                            {name}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <button
                                onClick={() => setGpsAlert({ show: false, type: 'far' })}
                                className="w-full py-3.5 bg-gray-900 text-white rounded-2xl text-xs font-black hover:bg-gray-800 transition-colors shadow-lg active:scale-95"
                            >
                                好的，知道了
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
