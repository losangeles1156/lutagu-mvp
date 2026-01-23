
import { RouteOption, RouteStep } from '@/lib/l4/types/RoutingTypes';

export function filterRoutesByL2Status(params: {
    routes: RouteOption[];
    l2Status: any;
}): { routes: RouteOption[]; removed: RouteOption[] } {
    const { routes, l2Status } = params;
    if (!l2Status || typeof l2Status !== 'string') {
        return { routes, removed: [] };
    }

    // Simplified logic: If L2 status mentions a railway name, we consider it disrupted/suspended.
    // In a real scenario, this should be more robust (structured data).
    // For now, we assume l2Status is a summary text.

    // We need railway aliases to match text.
    // Since we lack the full alias map here, we'll do a basic flexible matching.

    // Actually, l2Status in this project is often a JSON or structured object in some contexts,
    // but the error message fallback suggests it might be text.
    // Let's assume it's text for now as per `getErrorText` usage.

    const statusText = JSON.stringify(l2Status).toLowerCase();

    // Status keywords indicating suspension
    const suspensionKeywords = ['suspended', '見合わせ', '運休', 'stop'];
    const isSuspension = suspensionKeywords.some(k => statusText.includes(k));

    if (!isSuspension) {
        // If just delays, we might currently keep all routes or warn.
        // For MVP, if not suspended, we keep them.
        return { routes, removed: [] };
    }

    const kept: RouteOption[] = [];
    const removed: RouteOption[] = [];

    for (const route of routes) {
        let isAffected = false;
        // Check if any railway in the route is mentioned in the status
        // Route has `railways` string array
        if (route.railways) {
            for (const rId of route.railways) {
                // Clean ID to name approximate
                // odpt.Railway:JR-East.Chuo -> "Chuo"
                const name = rId.split('.').pop()?.toLowerCase();
                if (name && statusText.includes(name)) {
                    isAffected = true;
                    break;
                }
            }
        }

        if (isAffected) {
            removed.push(route);
        } else {
            kept.push(route);
        }
    }

    return { routes: kept, removed };
}
