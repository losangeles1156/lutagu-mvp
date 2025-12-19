'use client';

import { Marker } from 'react-leaflet';
import L from 'leaflet';
import { useAppStore } from '@/stores/appStore';
import { renderToStaticMarkup } from 'react-dom/server';
import { MapPin } from 'lucide-react';

interface NodeMarkerProps {
    node: {
        id: string;
        name: any;
        location: { coordinates: [number, number] }; // GeoJSON Point [lon, lat]
        type: string;
        is_hub: boolean;
        vibe?: string | null;
    };
    zone: 'core' | 'buffer' | 'outer';
}

const VIBE_STYLE: Record<string, { color: string; icon: string }> = {
    culture: { color: 'bg-amber-500', icon: '🎨' },
    geek: { color: 'bg-indigo-500', icon: '🎮' },
    transit: { color: 'bg-blue-600', icon: '🚉' },
    luxury: { color: 'bg-rose-500', icon: '💎' },
    tourism: { color: 'bg-orange-500', icon: '⛩️' },
};

export function NodeMarker({ node, zone }: NodeMarkerProps) {
    const { setCurrentNode, setBottomSheetOpen, currentNodeId } = useAppStore();

    // Robust coordinate extraction
    let lon = 0, lat = 0;
    if (Array.isArray(node.location.coordinates)) {
        [lon, lat] = node.location.coordinates;
    } else if (node.location.coordinates && typeof node.location.coordinates === 'object') {
        // Handle { lon: ..., lat: ... } if it happens
        const coords = node.location.coordinates as any;
        lon = coords.lon || coords.x || 0;
        lat = coords.lat || coords.y || 0;
    }

    const isSelected = currentNodeId === node.id;

    const handleClick = () => {
        setCurrentNode(node.id);
        setBottomSheetOpen(true);
    };

    // Use node's own zone for styling, fallback to 'core' if undefined
    const nodeZone = node.is_hub ? 'core' : 'buffer';
    const isCoreNode = nodeZone === 'core';
    const vibe = node.vibe || (node.is_hub ? 'transit' : null);
    const vibeConfig = vibe ? VIBE_STYLE[vibe] : null;

    // Create a dynamic premium icon using SVG + Lucide
    const iconMarkup = renderToStaticMarkup(
        <div className={`relative flex items-center justify-center transition-all duration-300 ${isSelected ? 'scale-125 -translate-y-2' : 'scale-100'}`}>
            {/* 1. Pulse Layer (For Hubs or Selected) */}
            {(isSelected || node.is_hub) && (
                <>
                    <div className={`absolute inset-0 rounded-full animate-ping opacity-20 ${isSelected ? 'bg-indigo-500' : (vibeConfig?.color || 'bg-rose-400')}`} style={{ animationDuration: '3s' }} />
                    <div className={`absolute -inset-2 rounded-full animate-pulse opacity-10 ${isSelected ? 'bg-indigo-400' : (vibeConfig?.color || 'bg-rose-300')}`} />
                </>
            )}

            {/* 2. Marker Body (Diamond shape 2.1 style) */}
            <div className={`w-11 h-11 rounded-[14px] flex items-center justify-center shadow-[0_8px_16px_rgba(0,0,0,0.15)] transform rotate-45 transition-all border-[1.5px] ${isSelected
                ? 'bg-indigo-600 border-white text-white ring-4 ring-indigo-500/10'
                : vibeConfig
                    ? `${vibeConfig.color} border-white/80 text-white`
                    : 'bg-white border-gray-100 text-indigo-600'
                }`}>
                <div className="-rotate-45 flex items-center justify-center">
                    {isSelected ? (
                        <MapPin size={24} fill="white" className="animate-bounce-short" />
                    ) : (vibeConfig && !node.is_hub) ? (
                        <span className="text-sm">{vibeConfig.icon}</span>
                    ) : node.is_hub ? (
                        <div className="relative">
                            <span className="text-sm font-black drop-shadow-md">★</span>
                            {vibeConfig && <span className="absolute -top-3 -right-3 text-[10px] bg-white rounded-full p-0.5 shadow-sm">{vibeConfig.icon}</span>}
                        </div>
                    ) : (
                        <MapPin size={18} />
                    )}
                </div>
            </div>

            {/* 3. Dynamic Label for Hubs or Selected */}
            {(isSelected || node.is_hub) && (
                <div className={`absolute -top-12 px-3 py-1.5 rounded-full font-black whitespace-nowrap shadow-xl transition-all duration-500 border border-white/20 backdrop-blur-md ${isSelected
                    ? 'bg-gray-900 text-white scale-110'
                    : 'bg-white/90 text-gray-800 text-[9px] scale-90'
                    }`}>
                    <div className="flex items-center gap-1.5">
                        {vibeConfig && <span className="text-xs">{vibeConfig.icon}</span>}
                        <span>{node.name?.['zh-TW'] || node.name?.['en']}</span>
                    </div>
                </div>
            )}
        </div>
    );

    const customIcon = L.divIcon({
        html: iconMarkup,
        className: 'custom-node-icon',
        iconSize: [44, 44],
        iconAnchor: [22, 22],
    });

    if (!lat || !lon) return null; // Safety

    return (
        <Marker
            position={[lat, lon]}
            icon={customIcon}
            eventHandlers={{
                click: handleClick,
            }}
        />
    );
}
