import Image from 'next/image';

/**
 * MapSkeleton - Skeleton loading UI for MapContainer
 * Displayed while the map is being dynamically loaded.
 * Improves perceived performance by showing immediate visual feedback.
 *
 * Performance Optimization (2026-01-22):
 * - Changed from <img> to Next.js <Image> for automatic optimization
 * - Added priority flag for LCP optimization
 * - Expected improvement: LCP from 7.6s to ~2.5s (-67%)
 */
export function MapSkeleton() {
    return (
        <div
            className="w-full h-full bg-slate-50 flex flex-col items-center justify-center relative overflow-hidden"
            role="status"
            aria-label="Loading map"
        >
            {/* LCP Optimization: Static Map Background with Next.js Image */}
            <div className="absolute inset-0 z-0">
                <Image
                    src="/images/map-placeholder.jpg"
                    alt="Map background"
                    fill
                    priority
                    quality={85}
                    className="object-cover scale-105"
                    sizes="100vw"
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
