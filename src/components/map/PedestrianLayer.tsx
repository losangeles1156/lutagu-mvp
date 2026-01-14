
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useMap, Polyline, CircleMarker, Popup } from 'react-leaflet';
import { useAppStore } from '@/stores/appStore';
import { toast } from 'sonner';
import { getDistanceKm } from '@/lib/utils/geoUtils';
import L from 'leaflet';

interface GraphNode {
    id: string;
    coordinates: { type: 'Point', coordinates: [number, number] };
    description: string;
    distance_from_query: number;
}

interface GraphLink {
    id: string;
    link_id: string;
    start_node_id: string;
    end_node_id: string;
    geometry: any; 
    accessibility_rank: string;
    has_elevator_access: boolean;
    distance_meters: number;
}

function roundToStep(value: number, step: number) {
    return Math.round(value / step) * step;
}

function centerStepForZoom(zoom: number) {
    if (zoom >= 19) return 0.0003;
    if (zoom >= 18) return 0.0006;
    if (zoom >= 17) return 0.001;
    return 0.002;
}

function zoomBucket(zoom: number) {
    if (zoom >= 19) return 19;
    if (zoom >= 18) return 18;
    if (zoom >= 16) return 16;
    return 0;
}

export function PedestrianLayer() {
    const map = useMap();
    const { 
        userProfile, 
        setRouteEnd, 
        setRouteStart, 
        routeStart, 
        setIsRouteCalculating, 
        setRoutePath, 
        setRouteSummary,
        mapCenter
    } = useAppStore();
    const [nodes, setNodes] = useState<GraphNode[]>([]);
    const [links, setLinks] = useState<GraphLink[]>([]);
    const [loading, setLoading] = useState(false);
    
    const abortControllerRef = useRef<AbortController | null>(null);
    const routeAbortControllerRef = useRef<AbortController | null>(null);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const lastQueryKeyRef = useRef<string | null>(null);
    const cacheRef = useRef<Map<string, { nodes: GraphNode[]; links: GraphLink[]; ts: number }>>(new Map());

    const handleSetDestination = async (node: GraphNode) => {
        let startPoint = routeStart;
        
        if (!startPoint) {
            if (mapCenter) {
                 startPoint = { lat: mapCenter.lat, lon: mapCenter.lon, name: 'Current Location' };
                 setRouteStart(startPoint);
            } else {
                toast.error('Cannot determine start location');
                return;
            }
        }
        
        const endPoint = { lat: node.coordinates.coordinates[1], lon: node.coordinates.coordinates[0], name: node.description, id: node.id };

        const dist = getDistanceKm(startPoint.lat, startPoint.lon, endPoint.lat, endPoint.lon);
        if (dist < 0.05) {
             toast.warning('Destination is very close (< 50m)');
        }

        setRouteEnd(endPoint);
        setIsRouteCalculating(true);
        map.closePopup();

        routeAbortControllerRef.current?.abort();
        const controller = new AbortController();
        routeAbortControllerRef.current = controller;

        try {
            const res = await fetch('/api/navigation/route', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    startLat: startPoint.lat,
                    startLon: startPoint.lon,
                    endNodeId: node.id,
                    userProfile,
                    weather: 'clear'
                }),
                signal: controller.signal
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to calculate route');
            }

            const data = await res.json();
            const path = data.nodes.map((n: any) => [n.lat, n.lon]);
            setRoutePath(path);
            setRouteSummary(data.summary);
            toast.success(`Route found: ${data.summary.estimated_duration_minutes} min`);

        } catch (err: any) {
            if (controller.signal.aborted || err?.name === 'AbortError') return;
            console.error(err);
            toast.error(err.message);
            setRoutePath(null);
            setRouteSummary(null);
        } finally {
            setIsRouteCalculating(false);
        }
    };

    const handleSetStart = (node: GraphNode) => {
        setRouteStart({ 
            lat: node.coordinates.coordinates[1], 
            lon: node.coordinates.coordinates[0], 
            name: node.description, 
            id: node.id 
        });
        toast.success('Start point set');
        map.closePopup();
    };

    const fetchData = useCallback(async () => {
        const zoom = map.getZoom();
        const MIN_ZOOM = 16;

        if (zoom < MIN_ZOOM) {
            lastQueryKeyRef.current = null;
            setNodes([]);
            setLinks([]);
            return;
        }

        // Cancel previous pending request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        const controller = new AbortController();
        abortControllerRef.current = controller;

        setLoading(true);
        const center = map.getCenter();
        const zBucket = zoomBucket(zoom);
        const step = centerStepForZoom(zoom);
        const qLat = roundToStep(center.lat, step);
        const qLon = roundToStep(center.lng, step);
        const radius = zoom >= 18 ? 400 : 650;

        try {
            const profile = userProfile || 'general';
            const key = `${zBucket}:${qLat},${qLon}:${radius}:${profile}`;

            if (lastQueryKeyRef.current === key) {
                return;
            }

            const cached = cacheRef.current.get(key);
            if (cached && Date.now() - cached.ts < 30_000) {
                lastQueryKeyRef.current = key;
                setNodes(cached.nodes);
                setLinks(cached.links);
                return;
            }

            const res = await fetch(`/api/navigation/graph?lat=${qLat}&lon=${qLon}&radius=${radius}&user_profile=${profile}`, {
                signal: controller.signal
            });
            
            if (!res.ok) {
                // If 4xx or 5xx, throw to catch block
                throw new Error(`API Error: ${res.status}`);
            }

            const json = await res.json();
            
            const nextNodes: GraphNode[] = json.nodes || [];
            const nextLinks: GraphLink[] = json.edges || [];

            lastQueryKeyRef.current = key;
            cacheRef.current.set(key, { nodes: nextNodes, links: nextLinks, ts: Date.now() });
            setNodes(nextNodes);
            setLinks(nextLinks);
        } catch (e: any) {
            if (controller.signal.aborted || e?.name === 'AbortError') return;
            console.error("Failed to fetch graph", e);
        } finally {
            if (abortControllerRef.current === controller) {
                setLoading(false);
                abortControllerRef.current = null;
            }
        }
    }, [map, userProfile]);

    useEffect(() => {
        const onMoveEnd = () => {
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = setTimeout(() => {
                fetchData();
            }, 300);
        };

        // Initial fetch
        fetchData();
        
        map.on('moveend', onMoveEnd);
        return () => {
            map.off('moveend', onMoveEnd);
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            if (routeAbortControllerRef.current) {
                routeAbortControllerRef.current.abort();
            }
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, [map, fetchData]);

    return (
        <>
            {/* Render Links */}
            {links.map(link => {
                let positions: [number, number][] = [];

                // Case 1: GeoJSON Geometry (from RPC)
                if (link.geometry && typeof link.geometry === 'object' && link.geometry.type === 'LineString') {
                     positions = link.geometry.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number]);
                } 
                // Case 2: Fallback (WKB or missing geometry) - Use Node Coordinates
                else if (link.start_node_id && link.end_node_id) {
                    const startNode = nodes.find(n => n.id === link.start_node_id);
                    const endNode = nodes.find(n => n.id === link.end_node_id);

                    if (startNode && endNode && startNode.coordinates && endNode.coordinates) {
                         // Swap [lon, lat] to [lat, lon] for Leaflet
                         const startPos = [startNode.coordinates.coordinates[1], startNode.coordinates.coordinates[0]] as [number, number];
                         const endPos = [endNode.coordinates.coordinates[1], endNode.coordinates.coordinates[0]] as [number, number];
                         positions = [startPos, endPos];
                    }
                }

                if (positions.length === 0) return null;
                
                const color = link.has_elevator_access ? '#10b981' : '#f59e0b'; // Green vs Amber
                
                return (
                    <Polyline 
                        key={link.id} 
                        positions={positions} 
                        pathOptions={{ color, weight: 4, opacity: 0.7 }} 
                    >
                         <Popup>
                            <div className="text-sm">
                                <p><strong>Rank:</strong> {link.accessibility_rank}</p>
                                <p><strong>Elevator:</strong> {link.has_elevator_access ? 'Yes' : 'No'}</p>
                                <p><strong>Distance:</strong> {link.distance_meters}m</p>
                            </div>
                        </Popup>
                    </Polyline>
                );
            })}

            {/* Render Nodes */}
            {nodes.map(node => {
                 const [lon, lat] = node.coordinates.coordinates;
                 return (
                     <CircleMarker 
                        key={node.id} 
                        center={[lat, lon]} 
                        radius={5} 
                        pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.8 }}
                        eventHandlers={{
                            click: (e) => {
                                 L.DomEvent.stopPropagation(e);
                            }
                        }}
                    >
                        <Popup>
                            <div className="p-2 min-w-[200px]">
                                <h3 className="font-bold mb-2 text-sm">{node.description || 'Pedestrian Node'}</h3>
                                <div className="flex flex-col gap-2">
                                     <button
                                        className="bg-blue-600 text-white px-3 py-2 rounded-md text-xs font-bold hover:bg-blue-700 transition-colors w-full shadow-sm"
                                        onClick={() => handleSetDestination(node)}
                                    >
                                        NAVIGATE HERE
                                    </button>
                                    <button
                                        className="bg-gray-100 text-gray-700 px-3 py-2 rounded-md text-xs font-bold hover:bg-gray-200 transition-colors w-full border border-gray-200"
                                        onClick={() => handleSetStart(node)}
                                    >
                                        SET AS START
                                    </button>
                                </div>
                            </div>
                        </Popup>
                    </CircleMarker>
                 );
            })}
        </>
    );
}
