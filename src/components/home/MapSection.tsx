'use client';

import dynamic from 'next/dynamic';
import { MapSkeleton } from '@/components/map/MapSkeleton';

const MapContainer = dynamic(
    () => import('@/components/map/MapContainer'),
    { ssr: false, loading: () => <MapSkeleton /> }
);

export function MapSection() {
    return (
        <>
            <MapContainer />
        </>
    );
}
