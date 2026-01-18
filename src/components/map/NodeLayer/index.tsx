'use client';

import { logger } from '@/lib/utils/logger';

import React, { Component, ReactNode } from 'react';
import { useNodes, useHubDetails, useNodeLoading, useNodeError } from '@/providers/NodeDisplayProvider';
import { HubNodeLayer } from '../HubNodeLayer';
import { useAppStore } from '@/stores/appStore';

/**
 * NodeLayerErrorBoundary - Isolated error boundary for node rendering
 * Prevents node display errors from crashing the entire map
 */
class NodeLayerErrorBoundary extends Component<
    { children: ReactNode; fallback?: ReactNode },
    { hasError: boolean; errorMessage: string | null }
> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false, errorMessage: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, errorMessage: error.message };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        logger.error('[NodeLayer] Render error caught:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback || null;
        }
        return this.props.children;
    }
}

/**
 * NodeLayerContent - The actual node rendering logic
 * Separated from the ErrorBoundary for clean error handling
 */
interface NodeLayerContentProps {
    zone: 'core' | 'buffer' | 'outer';
    locale: string;
}

function NodeLayerContent({ zone, locale }: NodeLayerContentProps) {
    const nodes = useNodes();
    const hubDetails = useHubDetails();
    const error = useNodeError();
    const currentNodeId = useAppStore(s => s.currentNodeId);

    const expandedHubId = (() => {
        if (!currentNodeId) return null;
        const selected = nodes.find(n => n.id === currentNodeId);
        if (!selected) return currentNodeId;
        return selected.parent_hub_id || selected.id;
    })();

    const expandedNodeIds = (() => {
        if (!expandedHubId) return null;

        const selectedHub = nodes.find(n => n.id === expandedHubId);
        if (!selectedHub) return null;

        const hasAnyParent = nodes.some(n => n.parent_hub_id);
        const children = nodes.filter(n => n.parent_hub_id === expandedHubId);
        if (hasAnyParent && children.length > 0) return null;

        const [hubLon, hubLat] = selectedHub.location.coordinates;
        if (!Number.isFinite(hubLat) || !Number.isFinite(hubLon)) return null;

        const thresholdMeters = 220;
        const R = 6371e3;

        const toRad = (deg: number) => deg * Math.PI / 180;
        const distanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
            const φ1 = toRad(lat1);
            const φ2 = toRad(lat2);
            const Δφ = toRad(lat2 - lat1);
            const Δλ = toRad(lon2 - lon1);
            const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return R * c;
        };

        const nearby = nodes
            .filter(n => n.id !== expandedHubId)
            .map(n => {
                const [lon, lat] = n.location.coordinates;
                if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
                const d = distanceMeters(hubLat, hubLon, lat, lon);
                if (d > thresholdMeters) return null;
                return { id: n.id, d };
            })
            .filter(Boolean) as { id: string; d: number }[];

        nearby.sort((a, b) => a.d - b.d);
        const limited = nearby.slice(0, 18).map(x => x.id);
        return [expandedHubId, ...limited];
    })();

    if (error) {
        logger.warn('[NodeLayer] Display error:', error);
        // Still try to render whatever nodes we have
    }

    return (
        <HubNodeLayer
            nodes={nodes as any} // Cast to avoid type mismatch
            hubDetails={hubDetails as any}
            zone={zone}
            locale={locale}
            currentNodeId={currentNodeId}
            expandedHubId={expandedHubId}
            expandedNodeIds={expandedNodeIds}
        />
    );
}

/**
 * NodeLayer - Isolated node display component
 * - Reads from NodeDisplayContext
 * - Wrapped in ErrorBoundary
 * - Independent from other UI components
 */
interface NodeLayerProps {
    zone: 'core' | 'buffer' | 'outer';
    locale: string;
}

export function NodeLayer({ zone, locale }: NodeLayerProps) {
    return (
        <NodeLayerErrorBoundary>
            <NodeLayerContent zone={zone} locale={locale} />
        </NodeLayerErrorBoundary>
    );
}

export default NodeLayer;
