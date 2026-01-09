'use client';

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
        console.error('[NodeLayer] Render error caught:', error, errorInfo);
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

    // Filter to only show hub nodes (for cleaner display)
    const hubNodes = nodes.filter(n => n.is_hub);

    if (error) {
        console.warn('[NodeLayer] Display error:', error);
        // Still try to render whatever nodes we have
    }

    return (
        <HubNodeLayer
            nodes={hubNodes as any} // Cast to avoid type mismatch
            hubDetails={hubDetails as any}
            zone={zone}
            locale={locale}
            currentNodeId={currentNodeId}
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

