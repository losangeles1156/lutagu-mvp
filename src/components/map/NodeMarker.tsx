'use client';

import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { useAppStore } from '@/stores/appStore';

interface NodeMarkerProps {
    node: {
        id: string;
        name: any;
        location: { coordinates: [number, number] }; // GeoJSON Point [lon, lat]
        type: string;
        is_hub: boolean;
    };
    zone: 'core' | 'buffer' | 'outer';
}

export function NodeMarker({ node, zone }: NodeMarkerProps) {
    const { setCurrentNode, setBottomSheetOpen } = useAppStore();
    const [lon, lat] = node.location.coordinates;

    const handleClick = () => {
        setCurrentNode(node.id);
        setBottomSheetOpen(true);
    };

    // if (zone === 'outer') return null; // Logic removed: All nodes should be visible for manual planning

    // Use node's own zone for styling, fallback to 'core' if undefined
    const nodeZone = node.is_hub ? 'core' : 'buffer';
    const isCoreNode = nodeZone === 'core';

    // Custom DivIcon based on node type/zone
    const icon = L.divIcon({
        className: isCoreNode ? 'node-marker-core' : 'node-marker-buffer',
        html: isCoreNode
            ? `<div class="w-8 h-8 bg-indigo-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-xs">${node.is_hub ? '★' : ''}</div>`
            : `<div class="w-3 h-3 bg-gray-500 rounded-full border border-white"></div>`,
        iconSize: isCoreNode ? [32, 32] : [12, 12],
        iconAnchor: isCoreNode ? [16, 16] : [6, 6]
    });

    return (
        <Marker
            position={[lat, lon]}
            icon={icon}
            eventHandlers={{ click: handleClick }}
        >
            {/* We control popup via BottomSheet, but can keep tooltip here if needed */}
        </Marker>
    );
}
