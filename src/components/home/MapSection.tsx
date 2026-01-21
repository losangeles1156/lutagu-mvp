'use client';

import dynamic from 'next/dynamic';
import { MapSkeleton } from '@/components/map/MapSkeleton';

const MapContainer = dynamic(
    () => import('@/components/map/MapContainer'),
    { ssr: false }
);

export function MapSection() {
    return (
        <div className="relative w-full h-full">
            {/* 
              LCP Optimization: 
              Render Skeleton explicitly to guarantee it exists in SSR HTML.
              It sits behind the map (z-0) and acts as the placeholder until tiles load.
            */}
            <div className="absolute inset-0 z-0">
                <MapSkeleton />
            </div>

            {/* Interactive Map (Client Only) - Loads on top */}
            <div className="relative z-10 w-full h-full">
                <MapContainer />
            </div>
        </div>
    );
}
