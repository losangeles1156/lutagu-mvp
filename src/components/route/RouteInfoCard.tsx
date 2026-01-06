
'use client';

import { useAppStore } from '@/stores/appStore';
import { X, Navigation, Clock } from 'lucide-react';

export function RouteInfoCard() {
    const { routeSummary, clearRoute, isRouteCalculating } = useAppStore();

    if (!routeSummary && !isRouteCalculating) return null;

    return (
        <div className="absolute bottom-24 left-4 right-4 z-[1000] bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-white/20 p-4 md:w-96 md:left-1/2 md:-translate-x-1/2 transition-all duration-300">
            {isRouteCalculating ? (
                <div className="flex items-center gap-3">
                    <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
                    <span className="text-sm font-medium text-gray-700">Calculating optimal path...</span>
                </div>
            ) : (
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-2xl font-bold text-gray-900">
                            <Clock className="w-6 h-6 text-blue-600" />
                            <span>{Math.round(routeSummary!.estimated_duration_minutes)} <span className="text-sm font-normal text-gray-500">min</span></span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                            <Navigation className="w-4 h-4" />
                            <span>{(routeSummary!.total_distance_meters / 1000).toFixed(2)} km</span>
                        </div>
                    </div>
                    <button
                        onClick={clearRoute}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors active:scale-95"
                        aria-label="Close route"
                    >
                        <X className="w-6 h-6 text-gray-500" />
                    </button>
                </div>
            )}
        </div>
    );
}
