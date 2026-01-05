'use client';

import { Marker } from 'react-leaflet';
import L from 'leaflet';
import { useAppStore } from '@/stores/appStore';
import { renderToStaticMarkup } from 'react-dom/server';
import { Crown, MapPin, Train, Link2 } from 'lucide-react';
import { OPERATOR_COLORS, getPrimaryOperator } from '@/lib/constants/stationLines';
import { getLocaleString } from '@/lib/utils/localeUtils';

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

export function NodeMarker({ node, hubDetails, locale = 'zh-TW', zoom = 22, onClick }: NodeMarkerProps) {
    const { setCurrentNode, setBottomSheetOpen, currentNodeId } = useAppStore();

    // Coordinate Parsing
    let lon = 0, lat = 0;
    if (Array.isArray((node as any).coordinates?.coordinates)) {
        [lon, lat] = (node as any).coordinates.coordinates;
    } else if (Array.isArray(node.location?.coordinates)) {
        [lon, lat] = node.location.coordinates;
    }

    if (!lat || !lon) return null;

    const isSelected = currentNodeId === node.id;
    const isMajor = node.tier === 'major' || node.is_hub;
    const hasMembers = hubDetails && hubDetails.member_count > 0;
    const memberCount = hubDetails?.member_count || 0;

    // [NEW] Operator-Based Color System
    const primaryOperator = getPrimaryOperator(node.id);
    const operatorColor = OPERATOR_COLORS[primaryOperator] || OPERATOR_COLORS['Metro'];

    // Icon: Hub stations use Train, others use MapPin
    const DisplayIcon = isMajor ? Train : MapPin;

    // Final color is operator-based (overriding old mapDesign system)
    const finalColor = operatorColor;

    const baseColor = isSelected ? '#111827' : finalColor;
    const label = getLocaleString(node.name, locale) || node.id;
    const ringRadiusClass = hasMembers ? 'rounded-[22px]' : 'rounded-full';
    const showLabel = isSelected || hasMembers || isMajor || (zoom >= 15);

    // Transfer type badge styling
    const transferType = hubDetails?.transfer_type || 'indoor';
    const transferLabels: Record<string, { label: string; bgColor: string }> = {
        indoor: { label: '🔗', bgColor: '#10B981' },
        outdoor: { label: '📍', bgColor: '#F59E0B' },
        adjacent: { label: '🚶', bgColor: '#3B82F6' }
    };
    const transferBadge = transferLabels[transferType] || transferLabels.indoor;

    const handleClick = () => {
        if (onClick) {
            onClick(node);
        } else {
            setCurrentNode(node.id);
            setBottomSheetOpen(true);
        }
    };

    const iconMarkup = renderToStaticMarkup(
        <div
            title={label}
            className={`relative flex items-center justify-center select-none transition-transform duration-300 group ${isSelected ? 'z-50 scale-110' : 'z-10 hover:scale-[1.04] hover:z-40'}`}
        >
            {(isSelected || isMajor) && (
                <div className="absolute inset-0 rounded-full animate-ping opacity-15 bg-indigo-600" style={{ animationDuration: '3s' }} />
            )}

            {hasMembers && (
                <div className="absolute inset-0 rounded-[22px] bg-indigo-600/15 blur-md" />
            )}

            <div className="relative">
                {hasMembers && (
                    <>
                        <div className="absolute inset-0 translate-x-[6px] translate-y-[6px] rounded-[18px] bg-slate-900/15" />
                        <div className="absolute inset-0 translate-x-[3px] translate-y-[3px] rounded-[18px] bg-slate-900/10" />
                    </>
                )}

                <div
                    className={`relative flex items-center justify-center border-[3px] border-white text-white shadow-[0_18px_50px_rgba(0,0,0,0.25)] transition-transform group-active:scale-[0.98] ${hasMembers ? 'rounded-[18px]' : 'rounded-full'}`}
                    style={{ width: isMajor || hasMembers ? 56 : 48, height: isMajor || hasMembers ? 56 : 48, backgroundColor: baseColor }}
                >
                    <div className="drop-shadow-md">
                        <DisplayIcon size={isMajor ? 24 : 22} strokeWidth={2.6} />
                    </div>

                    {isSelected && (
                        <div className={`absolute inset-[-6px] ${ringRadiusClass} ring-2 ring-indigo-400/80`} />
                    )}
                </div>

                {isMajor && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                        <Crown size={22} className="text-amber-400 fill-amber-400 drop-shadow-[0_3px_8px_rgba(0,0,0,0.30)]" />
                    </div>
                )}

                {hasMembers && (
                    <>
                        {/* Member count badge */}
                        <div className="absolute -top-2.5 -right-2.5 z-30">
                            <div 
                                className="h-6 min-w-6 px-2 rounded-full text-white text-[10px] font-black flex items-center justify-center shadow-lg border border-white/30"
                                style={{ backgroundColor: baseColor }}
                            >
                                +{memberCount}
                            </div>
                        </div>
                        
                        {/* Transfer type indicator */}
                        <div 
                            className="absolute -bottom-1.5 -left-1.5 z-30 w-5 h-5 rounded-full flex items-center justify-center shadow-md border border-white"
                            style={{ backgroundColor: transferBadge.bgColor }}
                            title={hubDetails?.indoor_connection_notes || transferType}
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
                    className={`absolute -bottom-12 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-2xl whitespace-nowrap shadow-2xl border border-white/60 backdrop-blur-md transition-all duration-200 ${isSelected ? 'bg-slate-900/90 text-white scale-105' : 'bg-white/90 text-slate-900'}`}
                >
                    <span className="text-xs font-black tracking-tight">{label}</span>
                </div>
            )}
        </div>
    );

    const leafletIcon = L.divIcon({
        html: iconMarkup,
        className: 'custom-node-icon',
        iconSize: [72, 72],
        iconAnchor: [36, 72],
    });

    return (
        <Marker
            position={[lat, lon]}
            icon={leafletIcon}
            eventHandlers={{
                click: handleClick,
            }}
        />
    );
}
