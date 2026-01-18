'use client';

import { logger } from '@/lib/utils/logger';

import { useState, useEffect, useMemo } from 'react';
import { useWardStore, Ward } from '@/lib/stores/wardStore';
import { NodeMarker } from './NodeMarker';
import { fetchNodesByWard } from '@/lib/api/nodesByWard';
import { NodeDatum } from '@/lib/api/nodes';

interface WardNodeLayerProps {
    wardId?: string | null;
    onNodeClick?: (node: any) => void;
    showHubBadge?: boolean;
    className?: string;
    locale?: string;
}

export function WardNodeLayer({
    wardId,
    onNodeClick,
    showHubBadge = true,
    className,
    locale = 'zh-TW',
}: WardNodeLayerProps) {
    const { wards, fetchWards, isLoading, error } = useWardStore();

    // Fetch wards on mount
    useMemo(() => {
        if (wards.length === 0 && !isLoading) {
            fetchWards();
        }
    }, [wards.length, isLoading, fetchWards]);

    // Get nodes for the specific ward or all wards
    const targetWard = useMemo(() => {
        if (!wardId) return null;
        return wards.find((w) => w.id === wardId) || null;
    }, [wards, wardId]);

    // Filter wards based on wardId or show all
    const displayWards = useMemo(() => {
        if (wardId) {
            const ward = wards.find((w) => w.id === wardId);
            return ward ? [ward] : [];
        }
        // Return all wards when no specific wardId is selected
        return wards;
    }, [wards, wardId]);

    // Loading state
    if (isLoading && wards.length === 0) {
        return (
            <div className={`ward-node-layer loading ${className || ''}`}>
                <div className="ward-layer-loading">
                    <span className="loading-spinner" />
                    <span>載入區域數據...</span>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className={`ward-node-layer error ${className || ''}`}>
                <div className="ward-layer-error">
                    <span>⚠️ 無法載入區域數據</span>
                    <button onClick={() => fetchWards()} className="retry-button">
                        重試
                    </button>
                </div>
            </div>
        );
    }

    // Render ward boundaries and nodes
    return (
        <div className={`ward-node-layer ${className || ''}`}>
            {/* Ward nodes */}
            {displayWards.map((ward) => (
                <WardNodes
                    key={ward.id}
                    ward={ward}
                    onNodeClick={onNodeClick}
                    showHubBadge={showHubBadge}
                    locale={locale}
                />
            ))}
        </div>
    );
}

// Helper function to get ward name by locale
function getWardName(ward: Ward, locale: string = 'zh-TW'): string {
    if (locale === 'zh-TW' || locale === 'zh') return ward.name.zh || ward.name.ja || ward.id;
    if (locale === 'en') return ward.name.en || ward.name.ja || ward.id;
    return ward.name.ja || ward.name.en || ward.id;
}

// Render nodes for a specific ward
function WardNodes({
    ward,
    onNodeClick,
    showHubBadge,
    locale = 'zh-TW',
}: {
    ward: Ward;
    onNodeClick?: (node: any) => void;
    showHubBadge: boolean;
    locale?: string;
}) {
    // Fetch actual nodes for the ward
    const { nodes, isLoading } = useWardNodes(ward.id);

    const name = getWardName(ward, locale);

    return (
        <div className="ward-nodes" data-ward-id={ward.id}>
            {/* Ward label */}
            <div className="ward-label">
                <span className="ward-name">{name}</span>
                <span className="ward-stats">
                    {isLoading ? '載入中...' : `${nodes.length} 站點`}
                </span>
            </div>

            {/* Render Actual Nodes (Hide children) */}
            {nodes
                .filter(n => !n.parent_hub_id) // Only show independent nodes or hubs
                .map((node) => (
                    <NodeMarker
                        key={node.id}
                        node={node}
                        hubDetails={{
                            member_count: 0,
                            transfer_type: 'indoor',
                            transfer_complexity: 'simple',
                            walking_distance_meters: null,
                            indoor_connection_notes: null
                        }}
                        zone="core"
                        locale={locale}
                        zoom={15} // Default zoom for ward view
                        onClick={onNodeClick}
                    />
                ))}
        </div>
    );
}

// Hook for using ward-based node data
export function useWardNodes(wardId: string | null) {
    const { wards, fetchWards, isLoading: isWardsLoading } = useWardStore();
    const [nodes, setNodes] = useState<NodeDatum[]>([]);
    const [isLoadingNodes, setIsLoadingNodes] = useState(false);

    const ward = useMemo(() => {
        if (!wardId) return null;
        return wards.find((w) => w.id === wardId) || null;
    }, [wards, wardId]);

    useEffect(() => {
        if (!wardId) {
            setNodes([]);
            return;
        }

        let mounted = true;
        setIsLoadingNodes(true);

        fetchNodesByWard(wardId)
            .then(data => {
                if (mounted) setNodes(data);
            })
            .catch(err => logger.error(err))
            .finally(() => {
                if (mounted) setIsLoadingNodes(false);
            });

        return () => { mounted = false; };
    }, [wardId]);

    return {
        ward,
        nodes,
        isLoading: isWardsLoading || isLoadingNodes,
        refetch: fetchWards,
    };
}

// Component for displaying all ward info
export function WardInfoPanel({ wardId }: { wardId: string | null }) {
    const { wards, fetchWards } = useWardStore();

    const ward = useMemo(() => {
        if (!wardId) return null;
        return wards.find((w) => w.id === wardId) || null;
    }, [wards, wardId]);

    if (!ward) {
        return (
            <div className="ward-info-panel empty">
                <p>選擇一個區域以查看詳情</p>
            </div>
        );
    }

    const name = getWardName(ward);

    return (
        <div className="ward-info-panel">
            <h3 className="ward-info-title">{name}</h3>

            <div className="ward-info-actions">
                <button
                    className="action-button"
                    onClick={() => fetchWards()}
                >
                    刷新數據
                </button>
                <button className="action-button secondary">
                    查看詳細
                </button>
            </div>
        </div>
    );
}
