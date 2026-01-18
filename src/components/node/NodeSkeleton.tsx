'use client';

/**
 * NodeSkeleton - Skeleton loading UI for NodeTabs
 * Displayed while node data is being fetched.
 * Follows mobile-design skill: immediate visual feedback for loading states.
 */
export function NodeSkeleton() {
    return (
        <div className="p-6 space-y-6 animate-pulse" role="status" aria-label="Loading station details">
            {/* Tab bar skeleton */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-10 w-20 bg-slate-100 rounded-xl flex-shrink-0" />
                ))}
            </div>

            {/* Content skeleton */}
            <div className="space-y-4">
                {/* Title area */}
                <div className="h-6 w-48 bg-slate-100 rounded-lg" />
                <div className="h-4 w-32 bg-slate-50 rounded-lg" />

                {/* Card skeletons */}
                {[1, 2, 3].map((i) => (
                    <div key={i} className="p-4 bg-slate-50 rounded-2xl space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-100 rounded-xl" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 w-24 bg-slate-100 rounded-lg" />
                                <div className="h-3 w-16 bg-slate-100 rounded-lg" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Screen reader text */}
            <span className="sr-only">Loading...</span>
        </div>
    );
}
