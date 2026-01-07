'use client';

import { Marker } from 'react-leaflet';
import L from 'leaflet';
import { useAppStore } from '@/stores/appStore';
import { renderToStaticMarkup } from 'react-dom/server';
import { Crown, MapPin, Train, Link2 } from 'lucide-react';
import { OPERATOR_COLORS, getPrimaryOperator } from '@/lib/constants/stationLines';
import { getLocaleString } from '@/lib/utils/localeUtils';
import { memo, useMemo, useCallback } from 'react';

interface HubMemberInfo {
    member_id: string;
    member_name: any;
    operator: string;
    line_name: string | null;
    transfer_type: string;
    walking_seconds: number | null;
    sort_order: number;
}

interface NodeMarkerProps {
    node: {
        id: string;
        name: any;
        location: { coordinates: [number, number] };
        type: string;
        is_hub: boolean;
        tier?: 'major' | 'minor';
        mapDesign?: { color?: string; icon?: string };
        vibe?: string | null;
        facility_profile?: any;
        parent_hub_id?: string | null;
    };
    hubDetails?: {
        member_count: number;
        transfer_type: string;
        transfer_complexity: string;
        walking_distance_meters: number | null;
        indoor_connection_notes: string | null;
        members?: HubMemberInfo[];
    };
    zone: 'core' | 'buffer' | 'outer';
    locale?: string;
    zoom?: number;
    onClick?: (node: any) => void;
}

// [PERF] Static icon cache to avoid recreating identical icons
const iconCache = new Map<string, L.DivIcon>();

function NodeMarkerInner({ node, hubDetails, locale = 'zh-TW', zoom = 22, onClick }: NodeMarkerProps) {
    const setCurrentNode = useAppStore(s => s.setCurrentNode);
    const setBottomSheetOpen = useAppStore(s => s.setBottomSheetOpen);
    const currentNodeId = useAppStore(s => s.currentNodeId);

    // Derive all values BEFORE any hooks to avoid conditional hook calls
    const isSelected = currentNodeId === node.id;
    const isMajor = node.tier === 'major' || node.is_hub;
    const hasMembers = hubDetails && hubDetails.member_count > 0;
    const memberCount = hubDetails?.member_count || 0;

    // Coordinate Parsing - memoized (MUST be before early return)
    const coords = useMemo(() => {
        let lon = 0, lat = 0;
        if (Array.isArray((node as any).coordinates?.coordinates)) {
            [lon, lat] = (node as any).coordinates.coordinates;
        } else if (Array.isArray(node.location?.coordinates)) {
            [lon, lat] = node.location.coordinates;
        }
        return { lat, lon };
    }, [node]);

    // [PERF] Memoize operator color lookup (MUST be before early return)
    const baseColor = useMemo(() => {
        const primaryOperator = getPrimaryOperator(node.id);
        const operatorColor = OPERATOR_COLORS[primaryOperator] || OPERATOR_COLORS['Metro'];
        return isSelected ? '#111827' : operatorColor;
    }, [node.id, isSelected]);

    const label = useMemo(() => getLocaleString(node.name, locale) || node.id, [node.name, node.id, locale]);
    const showLabel = isSelected || hasMembers || isMajor || (zoom >= 15);

    // Transfer type badge styling (MUST be before early return)
    const transferBadge = useMemo(() => {
        const transferType = hubDetails?.transfer_type || 'indoor';
        const transferLabels: Record<string, { label: string; bgColor: string }> = {
            indoor: { label: '🔗', bgColor: '#10B981' },
            outdoor: { label: '📍', bgColor: '#F59E0B' },
            adjacent: { label: '🚶', bgColor: '#3B82F6' }
        };
        return transferLabels[transferType] || transferLabels.indoor;
    }, [hubDetails?.transfer_type]);

    // [PERF] Memoize click handler (MUST be before early return)
    const handleClick = useCallback(() => {
        if (onClick) {
            onClick(node);
        } else {
            setCurrentNode(node.id);
            setBottomSheetOpen(true);
        }
    }, [onClick, node, setCurrentNode, setBottomSheetOpen]);

    // [PERF] Generate cache key for icon (MUST be before early return)
    const iconCacheKey = useMemo(() => {
        return `${node.id}:${isSelected}:${isMajor}:${hasMembers}:${memberCount}:${baseColor}:${showLabel}:${label}`;
    }, [node.id, isSelected, isMajor, hasMembers, memberCount, baseColor, showLabel, label]);

    // [PERF] Memoize entire icon creation with caching (MUST be before early return)
    const leafletIcon = useMemo(() => {
        // Check cache first
        const cached = iconCache.get(iconCacheKey);
        if (cached) return cached;

        const DisplayIcon = isMajor ? Train : MapPin;
        const ringRadiusClass = hasMembers ? 'rounded-[22px]' : 'rounded-full';
        const markerSize = isMajor || hasMembers ? 56 : 48;
        const iconSize = isMajor ? 24 : 22;

        // [PERF] Simplified markup for mobile - removed heavy animations
        const iconMarkup = renderToStaticMarkup(
            <div
                title={label}
                className={`relative flex items-center justify-center select-none ${isSelected ? 'z-50' : 'z-10'}`}
            >
                {/* [PERF] Removed animate-ping for mobile performance */}
                {hasMembers && (
                    <div className="absolute inset-0 rounded-[22px] bg-indigo-600/10" />
                )}

                <div className="relative">
                    {/* [PERF] Simplified shadow layers - reduced from 2 to 1 */}
                    {hasMembers && (
                        <div className="absolute inset-0 translate-x-[3px] translate-y-[3px] rounded-[18px] bg-slate-900/10" />
                    )}

                    <div
                        className={`relative flex items-center justify-center border-[3px] border-white text-white shadow-lg ${hasMembers ? 'rounded-[18px]' : 'rounded-full'}`}
                        style={{ width: markerSize, height: markerSize, backgroundColor: baseColor }}
                    >
                        <DisplayIcon size={iconSize} strokeWidth={2.6} />

                        {isSelected && (
                            <div className={`absolute inset-[-6px] ${ringRadiusClass} ring-2 ring-indigo-400/80`} />
                        )}
                    </div>

                    {isMajor && (
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                            <Crown size={22} className="text-amber-400 fill-amber-400" />
                        </div>
                    )}

                    {hasMembers && (
                        <>
                            {/* Member count badge */}
                            <div className="absolute -top-2.5 -right-2.5 z-30">
                                <div
                                    className="h-6 min-w-6 px-2 rounded-full text-white text-[10px] font-black flex items-center justify-center shadow-md border border-white/30"
                                    style={{ backgroundColor: baseColor }}
                                >
                                    +{memberCount}
                                </div>
                            </div>

                            {/* Transfer type indicator */}
                            <div
                                className="absolute -bottom-1.5 -left-1.5 z-30 w-5 h-5 rounded-full flex items-center justify-center shadow-sm border border-white"
                                style={{ backgroundColor: transferBadge.bgColor }}
                            >
                                <Link2 size={10} className="text-white" />
                            </div>
                        </>
                    )}

                    <div
                        className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 border-r-[3px] border-b-[3px] border-white rounded-br-sm -z-10"
                        style={{ backgroundColor: baseColor }}
                    />
                </div>

                {showLabel && (
                    <div
                        className={`absolute -bottom-12 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-2xl whitespace-nowrap shadow-lg border border-white/60 ${isSelected ? 'bg-slate-900/90 text-white' : 'bg-white/90 text-slate-900'}`}
                    >
                        <span className="text-xs font-black tracking-tight">{label}</span>
                    </div>
                )}
            </div>
        );

        const icon = L.divIcon({
            html: iconMarkup,
            className: 'custom-node-icon',
            iconSize: [72, 72],
            iconAnchor: [36, 72],
        });

        // Store in cache (limit cache size to prevent memory issues)
        if (iconCache.size > 500) {
            const firstKey = iconCache.keys().next().value;
            if (firstKey) iconCache.delete(firstKey);
        }
        iconCache.set(iconCacheKey, icon);

        return icon;
    }, [iconCacheKey, isMajor, hasMembers, memberCount, baseColor, showLabel, label, isSelected, transferBadge]);

    // NOW we can do early return - after all hooks
    if (!coords.lat || !coords.lon) return null;

    return (
        <Marker
            position={[coords.lat, coords.lon]}
            icon={leafletIcon}
            eventHandlers={{
                click: handleClick,
            }}
        />
    );
}

// [PERF] Export memoized component to prevent unnecessary re-renders
export const NodeMarker = memo(NodeMarkerInner, (prevProps, nextProps) => {
    // Custom comparison: only re-render if important props changed
    return (
        prevProps.node.id === nextProps.node.id &&
        prevProps.hubDetails?.member_count === nextProps.hubDetails?.member_count &&
        prevProps.locale === nextProps.locale &&
        prevProps.zoom === nextProps.zoom
    );
});
