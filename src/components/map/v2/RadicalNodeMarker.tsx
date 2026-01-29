'use client';

import { DivIcon } from 'leaflet';
import L from 'leaflet';
import { Marker, useMap } from 'react-leaflet';
import { useMemo, useCallback } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProMaxNode } from '@/hooks/map/v2/useProMaxNodes';
import { getNodeDisplayManifest } from '@/lib/constants/MapDisplayPolicy';
import { useNodeStore } from '@/stores/nodeStore';
import { useUIStore } from '@/stores/uiStore';
import { Train, MapPin, Navigation } from 'lucide-react';

interface RadicalNodeMarkerProps {
    node: ProMaxNode;
    zoom: number;
    isSelected?: boolean;
}

// Radical Design Constants
const TIER_1_SIZE = 56; // Super Hub
const TIER_2_SIZE = 44; // Major Hub
const TIER_3_SIZE = 28; // Generic

export function RadicalNodeMarker({ node, zoom, isSelected = false }: RadicalNodeMarkerProps) {
    const setCurrentNode = useNodeStore(s => s.setCurrentNode);
    const setBottomSheetOpen = useUIStore(s => s.setBottomSheetOpen);
    const map = useMap();

    const handleClick = useCallback(() => {
        setCurrentNode(node.id);
        setBottomSheetOpen(true);
        // Radical Interaction: Fly to node
        map.flyTo(node.location, 16, { duration: 1.2, easeLinearity: 0.25 });
    }, [node.id, setCurrentNode, setBottomSheetOpen, map, node.location]);

    const icon = useMemo(() => {
        // Use centralized manifest logic
        // Convert node.tier (1-5) to MapDisplayTier enum
        const manifest = getNodeDisplayManifest(node.tier, zoom, isSelected);
        const { size, zIndex, showLabel, shape } = manifest;
        const zIndexClass = `z-[${zIndex}]`;

        // Radical Geometry: Squircle for Tier 1, Circle for Tier 2+
        const shapeClass = shape === 'squircle' ? 'rounded-[16px]' : 'rounded-full';

        // Gradient & Shadow
        // Asymmetric Tension: Offset shadow, strong border
        const html = renderToStaticMarkup(
            <div className={`relative group select-none ${zIndexClass}`} style={{ width: size, height: size }}>
                {/* Radical Shadow (Asymmetric) */}
                <div
                    className={`absolute inset-0 translate-x-[4px] translate-y-[4px] bg-black/20 ${shapeClass}`}
                    style={{ filter: 'blur(4px)' }}
                />

                {/* Main Body */}
                <div
                    className={`relative w-full h-full flex items-center justify-center border-[3px] border-white shadow-xl overflow-hidden bg-white ${shapeClass} transition-transform transform group-hover:scale-110 active:scale-95 ${isSelected ? 'ring-4 ring-indigo-400' : ''}`}
                    style={{ backgroundColor: node.color }}
                >
                    {/* Inner Icon */}
                    {node.tier <= 2 ? (
                        <span className="text-white font-black text-lg tracking-tighter">
                            {/* Robust ID Parser: Get first 2 chars of ID or specialized known prefixes */}
                            {node.id.startsWith('JR') ? 'JR' :
                                node.id.startsWith('Metro') || node.id.startsWith('TokyoMetro') ? 'M' :
                                    node.id.startsWith('Toei') ? 'T' :
                                        node.id.slice(0, 1).toUpperCase()}
                        </span>
                    ) : (
                        <div className="w-2 h-2 bg-white rounded-full" />
                    )}

                    {/* Gloss Effect */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent pointer-events-none" />
                </div>

                {/* Radical Label (Pure Geo-Name) */}
                {showLabel && (
                    <div className="absolute top-1/2 left-full ml-3 -translate-y-1/2 flex items-center">
                        {/* Connector Line */}
                        {node.tier === 1 && <div className="w-2 h-[2px] bg-black/80 mr-1" />}

                        <div className={`bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-r-xl rounded-bl-xl shadow-lg border-l-[3px] border-l-black/80 ${isSelected ? 'scale-110' : ''}`}>
                            <span className="text-xs font-black tracking-tight text-slate-800 whitespace-nowrap">
                                {node.geoName}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        );

        return L.divIcon({
            html,
            className: 'radical-marker-icon', // Use strict CSS for no default style
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
        });
    }, [node, zoom, isSelected]);

    return (
        <Marker
            position={node.location}
            icon={icon}
            eventHandlers={{ click: handleClick }}
        />
    );
}
