'use client';

/**
 * MapSkeleton - Skeleton loading UI for MapContainer
 * Displayed while the map is being dynamically loaded.
 * Improves perceived performance by showing immediate visual feedback.
 */
export function MapSkeleton() {
    return (
        <div
            className="w-full h-full bg-gradient-to-b from-slate-100 to-slate-50 flex flex-col items-center justify-center relative overflow-hidden"
            role="status"
            aria-label="Loading map"
        >
            {/* Animated gradient background */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer"
                style={{ animation: 'shimmer 2s infinite' }} />

            {/* Map placeholder with grid pattern */}
            <div className="absolute inset-0 opacity-10">
                <div className="grid grid-cols-8 grid-rows-8 h-full w-full">
                    {Array.from({ length: 64 }).map((_, i) => (
                        <div key={i} className="border border-slate-200" />
                    ))}
                </div>
            </div>

            {/* Center loading indicator */}
            <div className="relative z-10 flex flex-col items-center gap-4">
                <div className="w-16 h-16 relative">
                    <div className="absolute inset-0 border-4 border-indigo-600/20 rounded-full" />
                    <div className="absolute inset-0 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                </div>
                <div className="px-6 py-3 bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-white/20">
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">
                        Loading Map
                    </span>
                </div>
            </div>

            {/* Screen reader text */}
            <span className="sr-only">Loading map...</span>

            {/* Shimmer animation keyframes */}
            <style jsx>{`
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
            `}</style>
        </div>
    );
}

export default MapSkeleton;
