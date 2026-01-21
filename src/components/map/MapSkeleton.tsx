

/**
 * MapSkeleton - Skeleton loading UI for MapContainer
 * Displayed while the map is being dynamically loaded.
 * Improves perceived performance by showing immediate visual feedback.
 */
export function MapSkeleton() {
    return (
        <div
            className="w-full h-full bg-slate-50 flex flex-col items-center justify-center relative overflow-hidden"
            role="status"
            aria-label="Loading map"
        >
            {/* LCP Optimization: Static Map Background */}
            <div className="absolute inset-0 z-0">
                {/* 
                  Using direct img tag or Next.js Image with priority is crucial here.
                  We use a standard img tag for simplicity and guaranteed browser preload behavior 
                  in this specific Skeleton context.
                */}
                <img
                    src="/images/map-placeholder.jpg"
                    alt="Map background"
                    className="w-full h-full object-cover scale-105"
                    fetchPriority="high"
                />
            </div>

            {/* Shimmer Overlay */}
            <div className="absolute inset-0 bg-white/30 z-10 animate-pulse" />

            {/* Center loading indicator */}
            <div className="relative z-20 flex flex-col items-center gap-4">
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
        </div>
    );
}

export default MapSkeleton;
