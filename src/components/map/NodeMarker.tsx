'use client';

import { Marker } from 'react-leaflet';
import L from 'leaflet';
import { useNodeStore } from '@/stores/nodeStore';
import { useUIStore } from '@/stores/uiStore';
import { renderToStaticMarkup } from 'react-dom/server';
import { Crown, MapPin, Train, Link2, Plane } from 'lucide-react';
import { OPERATOR_COLORS, getPrimaryOperator, getOperatorAbbreviation, STATION_LINES } from '@/lib/constants/stationLines';
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
    isSelected?: boolean;
    onClick?: (node: any) => void;
}

// [PERF] LRU icon cache to avoid recreating identical icons
// Using Map which maintains insertion order for LRU behavior
const ICON_CACHE_MAX_SIZE = 400;
const iconCache = new Map<string, L.DivIcon>();

const AIRPORT_TERMINAL_IDS = [
    'odpt.Station:JR-East.NaritaAirportBranch.NaritaAirportTerminal1',
    'odpt.Station:JR-East.NaritaAirportBranch.NaritaAirportTerminal2and3',
    'odpt.Station:JR-East.NaritaAirportTerminal1', // Consolidated ID
    'odpt.Station:JR-East.NaritaAirportTerminal2And3', // Consolidated ID
    'odpt.Station:Keikyu.Airport.HanedaAirportTerminal1and2',
    'odpt.Station:Keikyu.Airport.HanedaAirportTerminal3',
    'odpt.Station:TokyoMonorail.HanedaMonorail.HanedaAirportTerminal1',
    'odpt.Station:TokyoMonorail.HanedaMonorail.HanedaAirportTerminal2',
    'odpt.Station:TokyoMonorail.HanedaMonorail.HanedaAirportTerminal3',
    'odpt.Station:Keisei.KeiseiMain.NaritaAirportTerminal1',
    'odpt.Station:Keisei.KeiseiMain.NaritaAirportTerminal2and3',
    'odpt.Station:Keisei.NaritaSkyAccess.NaritaAirportTerminal1',
    'odpt.Station:Keisei.NaritaSkyAccess.NaritaAirportTerminal2and3'
];

function NodeMarkerInner({ node, hubDetails, locale = 'zh-TW', zoom = 22, isSelected = false, onClick }: NodeMarkerProps) {
    const setCurrentNode = useNodeStore(s => s.setCurrentNode);
    const setBottomSheetOpen = useUIStore(s => s.setBottomSheetOpen);

    // Derive all values BEFORE any hooks to avoid conditional hook calls
    const isMajor = node.tier === 'major' || node.is_hub;
    const hasMembers = hubDetails && hubDetails.member_count > 0;
    const memberCount = hubDetails?.member_count || 0;

    // Coordinate Parsing - memoized (MUST be before early return)
    const coords = useMemo(() => {
        let lon = 0, lat = 0;
        if (Array.isArray((node as any).coordinates?.coordinates)) {
            // PostGIS GeoJSON format: [lon, lat]
            [lon, lat] = (node as any).coordinates.coordinates;
        } else if (Array.isArray(node.location?.coordinates)) {
            // Alternative GeoJSON location: [lon, lat]
            [lon, lat] = node.location.coordinates;
        } else if (typeof (node as any).coordinates?.lat === 'number') {
            // API v2 flattened format: { lat, lng }
            lat = (node as any).coordinates.lat;
            lon = (node as any).coordinates.lng || (node as any).coordinates.lon;
        }
        return { lat, lon };
    }, [node]);

    // [UPDATED] Flexible airport detection for consolidated nodes
    const isAirport = useMemo(() => {
        return node.type === 'airport' ||
            AIRPORT_TERMINAL_IDS.includes(node.id) ||
            node.id.includes('Airport');
    }, [node.id, node.type]);

    // [PERF] Memoize operator color lookup (MUST be before early return)
    const primaryOperator = useMemo(() => getPrimaryOperator(node.id), [node.id]);
    const operatorAbbr = useMemo(() => getOperatorAbbreviation(primaryOperator), [primaryOperator]);
    const isPrivate = useMemo(() => !['JR', 'Metro', 'Toei'].includes(primaryOperator), [primaryOperator]);

    const lines = useMemo(() => STATION_LINES[node.id] || [], [node.id]);
    const primaryLineColor = useMemo(() => lines.length > 0 ? lines[0].color : null, [lines]);

    const baseColor = useMemo(() => {
        if (isAirport) return '#3B82F6'; // Blue for airports
        const operatorColor = OPERATOR_COLORS[primaryOperator] || OPERATOR_COLORS['Metro'];
        return isSelected ? '#111827' : operatorColor;
    }, [isSelected, isAirport, primaryOperator]);

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

        // Use Plane icon for airports, Train for major hubs/train stations, MapPin for others
        const DisplayIcon = isAirport ? Plane : (isMajor ? Train : MapPin);

        // Custom styling for Private Railways: use rounded-xl (square-ish) instead of rounded-full
        const shapeClass = isAirport ? 'rounded-full' : (isPrivate ? 'rounded-xl' : (hasMembers ? 'rounded-[18px]' : 'rounded-full'));
        const ringRadiusClass = isAirport ? 'rounded-full' : (isPrivate ? 'rounded-xl' : (hasMembers ? 'rounded-[22px]' : 'rounded-full'));

        const markerSize = isAirport || isMajor || hasMembers ? 56 : 48;
        const iconSize = isAirport ? 26 : (isMajor ? 24 : 22);

        // [PERF] Simplified markup for mobile - removed heavy animations
        const iconMarkup = renderToStaticMarkup(
            <div
                title={label}
                className={`relative flex items-center justify-center select-none ${isSelected ? 'z-50' : 'z-10'}`}
            >
                {/* [PERF] Removed animate-ping for mobile performance */}
                {hasMembers && (
                    <div className={`absolute inset-0 ${ringRadiusClass} bg-indigo-600/10`} />
                )}

                <div className="relative">
                    {/* [PERF] Simplified shadow layers - reduced from 2 to 1 */}
                    {hasMembers && (
                        <div className={`absolute inset-0 translate-x-[3px] translate-y-[3px] ${shapeClass} bg-slate-900/10`} />
                    )}

                    <div
                        className={`relative flex flex-col items-center justify-center border-[3px] border-white text-white shadow-lg ${shapeClass}`}
                        style={{ width: markerSize, height: markerSize, backgroundColor: baseColor }}
                    >
                        {/* Line color accent ring (inner) */}
                        {primaryLineColor && primaryLineColor !== baseColor && (
                            <div
                                className={`absolute inset-[2px] border-[2px] opacity-60 ${shapeClass}`}
                                style={{ borderColor: primaryLineColor }}
                            />
                        )}

                        {!isAirport && (
                            <span className="text-xl font-black leading-none tracking-tighter z-10">
                                {operatorAbbr || 'S'}
                            </span>
                        )}
                        {/* Only show icon if Airport */}
                        {isAirport && (
                            <DisplayIcon size={iconSize} strokeWidth={2.6} className="z-10" />
                        )}

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

        // [PERF] LRU cache: delete & re-insert to move to end (most recent)
        // If key exists, remove it first to update its position
        if (iconCache.has(iconCacheKey)) {
            iconCache.delete(iconCacheKey);
        }
        // Evict oldest (first) entry if at capacity
        if (iconCache.size >= ICON_CACHE_MAX_SIZE) {
            const oldestKey = iconCache.keys().next().value;
            if (oldestKey) iconCache.delete(oldestKey);
        }
        iconCache.set(iconCacheKey, icon);

        return icon;
    }, [iconCacheKey, isMajor, hasMembers, memberCount, baseColor, showLabel, label, isSelected, transferBadge, isAirport, isPrivate, operatorAbbr, primaryLineColor]);

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
    // Added updated_at check for version control support
    return (
        prevProps.node.id === nextProps.node.id &&
        (prevProps.node as any).updated_at === (nextProps.node as any).updated_at &&
        prevProps.hubDetails?.member_count === nextProps.hubDetails?.member_count &&
        prevProps.locale === nextProps.locale &&
        prevProps.zoom === nextProps.zoom &&
        prevProps.isSelected === nextProps.isSelected
    );
});
