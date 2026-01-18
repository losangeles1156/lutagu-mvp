'use client';

import { logger } from '@/lib/utils/logger';

import { useEffect, useRef, useState } from 'react';
import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { renderToStaticMarkup } from 'react-dom/server';
import { STATION_MAP } from '@/lib/api/nodes';

interface Train {
    id: string;
    railway: string;
    trainNumber: string;
    type: string;
    fromStation: string;
    toStation: string;
    direction: string;
    delay: number;
}

const LINE_COLORS: Record<string, string> = {
    'odpt.Railway:TokyoMetro.Ginza': '#FF9500',
    'odpt.Railway:Toei.Asakusa': '#E60012',
    'odpt.Railway:TokyoMetro.Hibiya': '#B5B5B6',
    'odpt.Railway:Toei.Oedo': '#B6007A',
    'odpt.Railway:JR-East.Yamanote': '#9ACD32',
};

export function TrainLayer() {
    const [trains, setTrains] = useState<Train[]>([]);
    const abortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        const fetchTrains = async () => {
            abortRef.current?.abort();
            const controller = new AbortController();
            abortRef.current = controller;

            try {
                const res = await fetch('/api/train?mode=position', { signal: controller.signal });
                if (res.ok) {
                    const data = await res.json();
                    // Filter trains that are in our recognized stations
                    const activeTrains = (data.trains as Train[]).filter(t =>
                        STATION_MAP[t.fromStation] && (t.toStation ? STATION_MAP[t.toStation] : true)
                    );
                    setTrains(activeTrains);
                }
            } catch (e) {
                if (controller.signal.aborted || (e instanceof Error && e.name === 'AbortError')) return;
                logger.error('Failed to fetch trains:', e);
            }
        };

        fetchTrains();
        const interval = setInterval(fetchTrains, 30000); // 30s update
        return () => {
            clearInterval(interval);
            abortRef.current?.abort();
        };
    }, []);

    return (
        <>
            {trains.map((train) => {
                const fromCoords = STATION_MAP[train.fromStation];
                if (!fromCoords) return null; // Defensive check

                const toCoords = train.toStation ? STATION_MAP[train.toStation] : null;

                // If we don't have toCoords, just show at fromCoords
                const pos: [number, number] = toCoords
                    ? [(fromCoords.lat + toCoords.lat) / 2, (fromCoords.lon + toCoords.lon) / 2] // Simple interpolation
                    : [fromCoords.lat, fromCoords.lon];

                const color = LINE_COLORS[train.railway] || '#666';
                const isDelayed = train.delay > 0;

                const iconMarkup = renderToStaticMarkup(
                    <div className="relative group">
                        {/* Delay Glow */}
                        {isDelayed && (
                            <div className="absolute -inset-1 bg-red-500 rounded-full blur animate-pulse opacity-75" />
                        )}
                        <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white shadow-lg border-2 border-white transition-transform hover:scale-110"
                            style={{ backgroundColor: color }}
                        >
                            <span className="text-xs font-black">🚃</span>
                        </div>
                        {isDelayed && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-white flex items-center justify-center text-[6px] font-black">
                                !
                            </div>
                        )}
                    </div>
                );

                const icon = L.divIcon({
                    html: iconMarkup,
                    className: 'train-icon',
                    iconSize: [32, 32],
                    iconAnchor: [16, 16],
                });

                return (
                    <Marker key={train.id} position={pos} icon={icon}>
                        <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                            <div className="px-2 py-1 text-[10px] font-bold">
                                <span className="text-gray-500">{train.trainNumber}</span>
                                <div className="flex items-center gap-1">
                                    <span>{train.railway.split('.').pop()}</span>
                                    {isDelayed && <span className="text-red-500">延誤 {train.delay / 60}m</span>}
                                </div>
                            </div>
                        </Tooltip>
                    </Marker>
                );
            })}
        </>
    );
}
