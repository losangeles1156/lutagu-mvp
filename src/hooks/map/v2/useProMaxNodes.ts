import { useMemo } from 'react';
import { useNodes } from '@/providers/NodeDisplayProvider';
// Strategy: Reuse existing efficient fetcher if possible, but isolate filtering logic.
import { transformToGeoName } from '@/lib/map/nodeTransformer';
import { useLocale } from 'next-intl';

export interface ProMaxNode {
    id: string;
    geoName: string; // The "Pure" name
    location: [number, number];
    tier: number; // 1-5
    color: string;
    isHub: boolean;
    primaryOperator?: string;
    // Minimal props for rendering
}

/**
 * useProMaxNodes (Hook)
 * 
 * Logic Isolation:
 * - Does NOT depend on legacy `useVisibleMarkers`
 * - Uses `nodeTransformer` for naming
 * - Strictly enforces 5-Tier layout
 */
export function useProMaxNodes(zoom: number) {
    const nodes = useNodes(); // Fetch from Provider
    const locale = useLocale();

    const proMaxNodes = useMemo(() => {
        if (!nodes) return [];

        // 1. Filter Logic (Strict 5-Tier Visibility + Hub Aggregation)
        const visibleNodes = nodes.filter(node => {
            const tier = (node as any).display_tier || 5;
            const minZoom = (node as any).min_zoom_level || 16;
            const isMember = !!(node as any).parent_hub_id;

            // Hub Aggregation: Hide member nodes in ProMax view to keep it clean
            // [Pro Max] Single marker for hubs
            if (isMember) return false;

            // Tier 1: Always Visible (Super Hubs)
            if (tier === 1) return true;

            // Tier 2: Zoom 12+ (Major Hubs)
            if (tier === 2) return zoom >= 12;

            // Tier 3: Zoom 14+ (Minor Hubs)
            if (tier === 3) return zoom >= 14;

            // Tier 4-5: Zoom 15/16+
            return zoom >= minZoom;
        });

        // 2. Transform to ProMax Data Structure
        return visibleNodes.map(node => {
            const tier = (node as any).display_tier || 5;
            const [lon, lat] = node.location.coordinates;

            return {
                id: node.id,
                geoName: transformToGeoName(node.name, tier, locale),
                location: [lat, lon] as [number, number], // Leaflet [lat, lng]
                tier,
                color: (node as any).brand_color || '#9ca3af',
                isHub: (node as any).is_hub || false,
                primaryOperator: (node as any).primary_operator
            } as ProMaxNode;
        });

    }, [nodes, zoom, locale]);

    return proMaxNodes;
}
