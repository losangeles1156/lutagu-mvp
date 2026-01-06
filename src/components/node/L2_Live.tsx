'use client';

import { useState, memo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Zap, AlertTriangle, Users } from 'lucide-react';
import { StationUIProfile } from '@/lib/types/stationStandard';
import { getLocaleString } from '@/lib/utils/localeUtils';
import { SmartWeatherCard } from '@/components/ui/SmartWeatherCard';
import { HubInfoHeader, HubMembersList } from '@/components/map/HubMembersList';

// Types for Hub information
interface HubMemberInfo {
    member_id: string;
    member_name: any;
    operator: string;
    line_name: string | null;
    transfer_type: string;
    walking_seconds: number | null;
    sort_order: number;
}

interface HubDetails {
    member_count: number;
    transfer_type: string;
    transfer_complexity: string;
    walking_distance_meters: number | null;
    indoor_connection_notes: string | null;
    members?: HubMemberInfo[];
}

// Memoized Train Line Item with Compact Mode support
const TrainLineItem = memo(({ line, isDelay, tL2, locale, compact = false }: { line: any, isDelay: boolean, tL2: any, locale: string, compact?: boolean }) => {
    // Compact Layout (for Normal status in busy hubs)
    if (compact) {
        return (
            <div className="p-2.5 flex items-center gap-2.5 bg-gray-50/50 rounded-xl border border-gray-100 hover:bg-white hover:shadow-sm transition-all">
                <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] text-white shadow-sm shrink-0"
                    style={{ backgroundColor: line.color }}
                >
                    🚇
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-xs text-gray-700 truncate leading-tight">
                        {getLocaleString(line.name, locale)}
                    </h4>
                    <p className="text-[9px] text-gray-400 truncate mt-0.5">
                        {line.operator}
                    </p>
                </div>
            </div>
        );
    }

    // Full Layout (Existing style for Delays or sparse lists)
    return (
        <div className={`p-4 flex items-center gap-3 ${isDelay ? 'bg-rose-50/30' : ''}`}>
            <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg text-white shadow-sm shrink-0"
                style={{ backgroundColor: line.color }}
            >
                🚇
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-0.5">
                    <h4 className="font-bold text-sm text-gray-900 flex items-center gap-2 truncate">
                        {getLocaleString(line.name, locale)}
                        <span className="text-[8px] font-black uppercase px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded hidden sm:inline-block">
                            {line.operator}
                        </span>
                    </h4>

                    {isDelay && (
                        <span className="px-2 py-0.5 bg-rose-500 text-white text-[9px] font-black rounded-full animate-pulse shrink-0">DELAY</span>
                    )}
                </div>
                <div className="flex justify-between items-center">
                    <p className="text-[10px] text-gray-500 truncate pr-2">
                        {line.message
                            ? getLocaleString(line.message, locale)
                            : (isDelay ? tL2('status.delay') : tL2('status.normal'))
                        }
                    </p>
                </div>
            </div>
        </div>
    );
});
TrainLineItem.displayName = 'TrainLineItem';

interface L2_LiveProps {
    data: StationUIProfile;
    hubDetails?: HubDetails | null;
}

export function L2_Live({ data, hubDetails }: L2_LiveProps) {
    const tL2 = useTranslations('l2');
    const locale = useLocale();
    const { lines, crowd, updatedAt } = (data.l2 || {
        lines: [],
        crowd: { level: 1, trend: 'stable', userVotes: { total: 0, distribution: [0, 0, 0, 0, 0] } },
        updatedAt: undefined
    });
    const [clickedCrowd, setClickedCrowd] = useState<number | null>(null);

    // Handle Crowd Vote with optimistic UI
    const handleVote = async (idx: number) => {
        setClickedCrowd(idx); // Optimistic UI update

        try {
            await fetch('/api/l2/feedback', {
                method: 'POST',
                body: JSON.stringify({
                    stationId: data.id,
                    crowdLevel: idx + 1 // 0-based index to 1-5 scale
                })
            });
            // Note: Data won't refresh until standard revalidation, but UI reflects the click
        } catch (e) {
            console.error('Vote failed', e);
        }
    };

    // Weather is now handled entirely by SmartWeatherCard - no duplicate API calls


    // Derived State for Layout
    const delayedLines = lines.filter((l: any) => l.status !== 'normal');
    const normalLines = lines.filter((l: any) => l.status === 'normal');
    const isBusyHub = lines.length > 4; // Trigger compact mode if more than 4 lines

    // Derived State for Crowd
    const maxVoteIdx = crowd.userVotes.distribution.indexOf(Math.max(...crowd.userVotes.distribution));

    return (

        <div className="space-y-4 animate-in fade-in slide-in-from-bottom duration-500">
            {/* 0. Hub Information Section - Only show if hubDetails is provided */}
            {hubDetails && hubDetails.member_count > 0 && (
                <div className="space-y-3">
                    <HubInfoHeader
                        hubName={getLocaleString(data.name, locale) || '車站'}
                        hubId={data.id}
                        memberCount={hubDetails.member_count}
                        transferType={hubDetails.transfer_type}
                        transferComplexity={hubDetails.transfer_complexity}
                        indoorConnectionNotes={hubDetails.indoor_connection_notes}
                        locale={locale}
                    />

                    <HubMembersList
                        members={hubDetails.members || []}
                        locale={locale}
                        hubName={getLocaleString(data.name, locale)}
                        onMemberClick={(memberId) => {
                            // Handle member click - could navigate or show more info
                            console.log('Member clicked:', memberId);
                        }}
                    />
                </div>
            )}

            {/* 1. Train Operation Status */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest">{tL2('operationTitle')}</h3>
                        <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-[9px] font-black uppercase tracking-widest border border-green-100">
                            L2
                        </span>
                        {/* Summary Badge */}
                        {lines.length > 0 && (
                            delayedLines.length > 0 ? (
                                <span className="px-2 py-0.5 bg-rose-100 text-rose-600 text-[9px] font-bold rounded-full flex items-center gap-1">
                                    <AlertTriangle size={10} /> {delayedLines.length} Issues
                                </span>
                            ) : (
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[9px] font-bold rounded-full flex items-center gap-1">
                                    <Zap size={10} /> All Good
                                </span>
                            )
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-[8px] font-bold text-gray-300 uppercase tracking-tight">Source: ODPT</span>
                        <span className="text-[10px] font-medium text-gray-400">
                            {updatedAt && <span className="ml-1 text-xs font-mono text-indigo-400">
                                {new Date(updatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Tokyo' })}
                            </span>}
                        </span>
                    </div>

                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden p-1">
                    {lines.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 text-xs">
                            {locale.startsWith('ja')
                                ? '運行情報がありません'
                                : locale.startsWith('en')
                                    ? 'No live line data available'
                                    : '目前沒有即時列車資訊'}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-1">
                            {/* 1. Delayed Lines (Full Alert Width) */}
                            {delayedLines.map((line: any) => (
                                <div key={line.id} className="border-b border-gray-50 last:border-0">
                                    <TrainLineItem
                                        line={line}
                                        isDelay={true}
                                        tL2={tL2}
                                        locale={locale}
                                        compact={false} // Always full for delays
                                    />
                                </div>
                            ))}

                            {/* 2. Normal Lines (Grid if busy, List if few) */}
                            <div className={isBusyHub ? "grid grid-cols-2 gap-2 p-2" : "divide-y divide-gray-50"}>
                                {normalLines.map((line: any) => (
                                    <TrainLineItem
                                        key={line.id}
                                        line={line}
                                        isDelay={false}
                                        tL2={tL2}
                                        locale={locale}
                                        compact={isBusyHub} // Compact if busy
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Attribution Footer moved outside inner div if needed, or kept here */}
                    <div className="px-3 py-2 bg-gray-50/50 text-[8px] text-gray-400 text-center font-medium rounded-b-xl">
                        Data provided by Open Data Challenge for Public Transportation
                    </div>
                </div>
            </div>

            {/* 2. Weather & Alerts (SmartWeatherCard V2.0) */}
            <div className="space-y-2">
                <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest">{tL2('weatherTitle')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* SmartWeatherCard handles weather + alert + AI advice */}
                    <div className="relative">
                        {/* Scope Label - Explicitly stating this is TOKYO-wide */}
                        <div className="absolute -top-2 left-2 z-20 px-1.5 py-0.5 bg-gray-900/90 text-white text-[8px] font-black uppercase tracking-widest rounded-full shadow-sm border border-white/10">
                            TOKYO WIDE
                        </div>
                        <SmartWeatherCard />
                    </div>


                    {/* User Crowd Report Section */}
                    <div className="flex-1 bg-white rounded-2xl border border-gray-100 p-3 shadow-sm flex flex-col justify-center">
                        <div className="flex items-center gap-2 mb-2">
                            <Users size={14} className="text-gray-400" />
                            <span className="text-[10px] font-black text-gray-400 uppercase">{tL2('crowdReport')}</span>
                            <span className="text-[8px] text-indigo-400 bg-indigo-50 px-1 py-0.5 rounded ml-auto">
                                LIVE CROWD
                            </span>
                        </div>
                        {/* Disclaimer */}
                        <p className="text-[8px] text-gray-400 mb-2 leading-tight">
                            {locale.startsWith('zh') ? '數據來源：運行狀況與用戶回報' : 'Source: Service Status & User Reports'}
                        </p>
                        <div className="grid grid-cols-5 gap-1">
                            {[
                                { emoji: '😴', label: tL2('crowd.empty') },
                                { emoji: '😊', label: tL2('crowd.comfortable') },
                                { emoji: '😐', label: tL2('crowd.normal') },
                                { emoji: '😓', label: tL2('crowd.crowded') },
                                { emoji: '🥵', label: tL2('crowd.full') },
                            ].map((opt, idx) => {
                                const isMostPopular = clickedCrowd !== null && idx === maxVoteIdx;
                                const isSelected = clickedCrowd === idx;

                                return (
                                    <button
                                        key={idx}
                                        className={`flex flex-col items-center justify-center p-1.5 rounded-xl border transition-all relative min-h-[50px] ${isSelected
                                            ? 'bg-indigo-600 border-indigo-600 text-white scale-110 shadow-md z-10'
                                            : isMostPopular
                                                ? 'bg-indigo-50 border-indigo-200 ring-2 ring-indigo-100'
                                                : 'bg-white border-gray-100 hover:border-indigo-300 hover:bg-indigo-50'
                                            }`}
                                        onClick={() => handleVote(idx)}
                                    >
                                        <span className="text-base leading-none mb-1">{opt.emoji}</span>
                                        <span className={`text-[9px] font-bold leading-none ${isSelected ? 'text-indigo-100' : 'text-gray-500'}`}>
                                            {opt.label}
                                        </span>
                                        
                                        {/* Show Count if clicked (Simulated logic) */}
                                        {clickedCrowd !== null && (
                                            <span className={`text-[8px] font-bold mt-0.5 ${isSelected ? 'text-indigo-100' : 'text-gray-400'}`}>
                                                {crowd.userVotes.distribution[idx] + (isSelected ? 1 : 0)}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                        <p className="text-[9px] text-gray-300 mt-2 text-center">
                            {clickedCrowd !== null ? tL2('crowdThanks') : tL2('crowdClick')}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

