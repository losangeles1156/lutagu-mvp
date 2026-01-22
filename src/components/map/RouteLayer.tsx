
'use client';

import { useEffect } from 'react';
import { useMap, Polyline, Marker, Popup } from 'react-leaflet';
import { useRouteStore } from '@/stores/routeStore';
import L from 'leaflet';
import { MapPin, Flag } from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';

const createIcon = (icon: React.ReactNode, color: string) => {
    return L.divIcon({
        className: 'bg-transparent',
        html: renderToStaticMarkup(
            <div className="relative flex items-center justify-center w-8 h-8">
                <div className={`absolute w-full h-full rounded-full opacity-20 ${color} animate-ping`} />
                <div className={`relative w-8 h-8 rounded-full ${color} shadow-lg flex items-center justify-center text-white`}>
                    {icon}
                </div>
            </div>
        ),
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -36]
    });
};

export function RouteLayer() {
    const map = useMap();
    const { routePath, routeStart, routeEnd } = useRouteStore();

    useEffect(() => {
        if (routePath && routePath.length > 0) {
            // Fit bounds to route
            const bounds = L.latLngBounds(routePath);
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [routePath, map]);

    if (!routePath || routePath.length === 0) return null;

    const startIcon = createIcon(<MapPin className="w-5 h-5" />, 'bg-blue-600');
    const endIcon = createIcon(<Flag className="w-5 h-5" />, 'bg-red-600');

    return (
        <>
            <Polyline
                positions={routePath}
                pathOptions={{
                    color: '#3b82f6', // Blue-500
                    weight: 6,
                    opacity: 0.8,
                    lineCap: 'round',
                    lineJoin: 'round',
                    dashArray: '10, 10',
                    className: 'animate-dash'
                }}
            />
            {/* Start Marker */}
            {routeStart && (
                <Marker position={[routeStart.lat, routeStart.lon]} icon={startIcon}>
                    <Popup>Start: {routeStart.name || 'Current Location'}</Popup>
                </Marker>
            )}
            {/* End Marker */}
            {routeEnd && (
                <Marker position={[routeEnd.lat, routeEnd.lon]} icon={endIcon}>
                    <Popup>End: {routeEnd.name || 'Destination'}</Popup>
                </Marker>
            )}
        </>
    );
}
