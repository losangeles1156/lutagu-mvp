'use client';

import { logger } from '@/lib/utils/logger';
import { Component, ReactNode, useState, useMemo, useEffect } from 'react';
import { MapContainer as LeafletMapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useZoneAwareness } from '@/hooks/useZoneAwareness';
import { useNodeStore } from '@/stores/nodeStore';
import { useLocale } from 'next-intl';

// [OPTIMIZED] New Hooks
import { useViewportBounds } from '@/hooks/map/useViewportBounds';
import { useVisibleMarkers } from '@/hooks/map/useVisibleMarkers';
import { useNodeDisplay, useNodes, useHubDetails, useNodeError, useNodeLoading } from '@/providers/NodeDisplayProvider';
import { MapController_Optimized } from './MapController_Optimized';

import { ViewportNodeLoader_Optimized } from './ViewportNodeLoader_Optimized';
// Components
import { NodeMarker } from './NodeMarker';
import { HubNodeLayer } from './HubNodeLayer';
import { TrainLayer } from './TrainLayer';
import { PedestrianLayer } from './PedestrianLayer';
import { RouteLayer } from './RouteLayer';
import { JapanTimeClock } from '@/components/ui/JapanTimeClock';

// -----------------------------------------------------------------------------
// [OPTIMIZED] Virtualized Node Layer
// Replaces the standard NodeLayer by filtering nodes based on viewport
// -----------------------------------------------------------------------------
function VirtualizedNodeLayer({ zone, locale }: { zone: 'core' | 'buffer' | 'outer'; locale: string }) {
    const allNodes = useNodes();
    const hubDetails = useHubDetails();
    const error = useNodeError();
    const currentNodeId = useNodeStore(s => s.currentNodeId);

    // [OPTIMIZATION] 1. Track Map Bounds & Zoom
    const { bounds: mapBounds, zoom } = useViewportBounds();

    // [OPTIMIZATION] 2. Filter nodes to only those visible in viewport AND allowed by Zoom Tier
    const visibleNodes = useVisibleMarkers(allNodes, { bounds: mapBounds, zoom });

    // Logs for verification
    useEffect(() => {
        if (allNodes.length > 0 && visibleNodes.length !== allNodes.length) {
            logger.log(`[VirtualizedNodeLayer] Virtualization Active: ${visibleNodes.length} visible / ${allNodes.length} total`);
        }
    }, [allNodes.length, visibleNodes.length]);

    // Expansion Logic (Preserved from original NodeLayer)
    const expandedHubId = useMemo(() => {
        if (!currentNodeId) return null;
        const selected = allNodes.find(n => n.id === currentNodeId);
        if (!selected) return currentNodeId;
        return selected.parent_hub_id || selected.id;
    }, [currentNodeId, allNodes]);

    const expandedNodeIds = useMemo(() => {
        if (!expandedHubId) return null;

        const selectedHub = allNodes.find(n => n.id === expandedHubId);
        if (!selectedHub) return null;

        const hasAnyParent = allNodes.some(n => n.parent_hub_id);
        const children = allNodes.filter(n => n.parent_hub_id === expandedHubId);
        if (hasAnyParent && children.length > 0) return null;

        const [hubLon, hubLat] = selectedHub.location.coordinates;
        if (!Number.isFinite(hubLat) || !Number.isFinite(hubLon)) return null;

        const thresholdMeters = 220;
        const R = 6371e3;

        const toRad = (deg: number) => deg * Math.PI / 180;
        const distanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
            const φ1 = toRad(lat1);
            const φ2 = toRad(lat2);
            const Δφ = toRad(lat2 - lat1);
            const Δλ = toRad(lon2 - lon1);
            const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return R * c;
        };

        const nearby = allNodes
            .filter(n => n.id !== expandedHubId)
            .map(n => {
                const [lon, lat] = n.location.coordinates;
                if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
                const d = distanceMeters(hubLat, hubLon, lat, lon);
                if (d > thresholdMeters) return null;
                return { id: n.id, d };
            })
            .filter(Boolean) as { id: string; d: number }[];

        nearby.sort((a, b) => a.d - b.d);
        const limited = nearby.slice(0, 18).map(x => x.id);
        return [expandedHubId, ...limited];
    }, [expandedHubId, allNodes]);

    if (error) {
        logger.warn('[VirtualizedNodeLayer] Display error:', error);
    }

    return (
        <HubNodeLayer
            nodes={visibleNodes} // Passing FILTERED nodes
            hubDetails={hubDetails as any}
            zone={zone}
            locale={locale}
            currentNodeId={currentNodeId}
            expandedHubId={expandedHubId}
            expandedNodeIds={expandedNodeIds}
            enableClustering={true}
            zoom={zoom}
        />
    );
}

// -----------------------------------------------------------------------------
// Helper Components (ErrorBoundary)
// -----------------------------------------------------------------------------

class MapErrorBoundary extends Component<{ children: ReactNode; onReset: () => void }, { hasError: boolean }> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError() { return { hasError: true }; }
    componentDidCatch(error: any, info: any) { logger.error('Map Crash:', error, info); }
    render() {
        if (this.state.hasError) return <button onClick={() => { this.setState({ hasError: false }); this.props.onReset(); }}>Retry Map</button>;
        return this.props.children;
    }
}

// -----------------------------------------------------------------------------
// [OPTIMIZED] Main Map Container
// -----------------------------------------------------------------------------

export function MapContainer() {
    const { zone, userLocation, isTooFar, centerFallback } = useZoneAwareness();
    const [key, setKey] = useState(0);
    const locale = useLocale();
    const allNodes = useNodes();
    const nodeLoading = useNodeLoading();
    const nodeError = useNodeError();
    const { reset } = useNodeDisplay();

    // Default center
    const defaultCenter: [number, number] = [centerFallback.lat, centerFallback.lon];

    return (
        <div className="w-full h-screen relative z-0">
            {/* Clock Overlay */}
            <div className="absolute top-4 right-4 z-[500] pointer-events-none">
                <div className="pointer-events-auto"><JapanTimeClock /></div>
            </div>

            <MapErrorBoundary onReset={() => setKey(k => k + 1)}>
                <LeafletMapContainer
                    key={key}
                    center={defaultCenter}
                    zoom={15}
                    scrollWheelZoom={true}
                    className="w-full h-full"
                >
                    <TileLayer
                        attribution='&copy; OpenStreetMap'
                        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                        subdomains="abcd"
                    />

                    {/* [OPTIMIZATION] Decoupled Controller */}
                    <MapController_Optimized
                        center={userLocation}
                        isTooFar={isTooFar}
                        fallback={centerFallback}
                        nodes={allNodes}
                    />

                    {/* [OPTIMIZATION] Using new optimized loader */}
                    <ViewportNodeLoader_Optimized />

                    {/* User Marker */}
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

                    {/* [OPTIMIZATION] The New Layer */}
                    <VirtualizedNodeLayer zone={zone} locale={locale} />

                    <TrainLayer />
                    <PedestrianLayer />
                    <RouteLayer />

                </LeafletMapContainer>
            </MapErrorBoundary>

            {(nodeLoading || nodeError) && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[600] px-4">
                    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 text-xs font-bold text-slate-600 shadow-lg backdrop-blur">
                        <span>{nodeError ? '節點載入失敗' : '載入節點中'}</span>
                        {nodeError && (
                            <button
                                type="button"
                                onClick={() => {
                                    reset();
                                    setKey(k => k + 1);
                                }}
                                className="rounded-xl bg-slate-900 px-3 py-1.5 text-[10px] font-black text-white"
                            >
                                重試
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* UI Overlays (Simplified for Prototype - Removing "Optimized Map Active" banner for final) */}
            {/* Only showing clean overlay if needed, or removing entirely as this is now PROD code */}
        </div>
    );
}

export default MapContainer;
