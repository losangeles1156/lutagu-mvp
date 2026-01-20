'use client';

import { useState, useEffect, memo, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Zap, AlertTriangle, AlertOctagon, Cloud, Sun, Users, Wind, ArrowRight, Plane, ExternalLink } from 'lucide-react';
import { translateDisruption } from '@/lib/odpt/odptDisruptionTranslations';
import { StationUIProfile } from '@/lib/types/stationStandard';
import { getLocaleString } from '@/lib/utils/localeUtils';
import { SmartWeatherCard } from '@/components/ui/SmartWeatherCard';
import { HubInfoHeader, HubMembersList } from '@/components/map/HubMembersList';
import { logger } from '@/lib/utils/logger';
import { LiveFlightBoard } from '@/components/node/LiveFlightBoard';
import { trackFunnelEvent } from '@/lib/tracking';
import { PartnerNudgeCard } from '@/components/marketing/PartnerNudgeCard';
import { PARTNER_REGISTRY } from '@/config/partners';
import { DisruptionBanner } from '@/components/guard/DisruptionBanner';
import { useTripGuardStore } from '@/stores/tripGuardStore';
import { Bell } from 'lucide-react';

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
const TrainLineItem = memo(({ line, tL2, locale, compact = false }: { line: any, tL2: any, locale: string, compact?: boolean }) => {
    const isMonitoring = useTripGuardStore(state => state.isMonitoring(line.id || line.name)); // Fallback to name if ID missing
    const addLine = useTripGuardStore(state => state.addLine);
    const removeLine = useTripGuardStore(state => state.removeLine);

    // Helper to toggle
    const toggleMonitor = (e: React.MouseEvent) => {
        e.stopPropagation();
        const lineId = line.id || line.name;
        if (isMonitoring) {
            removeLine(lineId);
        } else {
            addLine({ id: lineId, name: getLocaleString(line.name, locale), operator: line.operator });
        }
    };

    // Compact Layout (for Normal status in busy hubs)
    if (compact) {
        return (
            <div className="p-2.5 flex items-center gap-2.5 bg-gray-50/50 rounded-xl border border-gray-100 hover:bg-white hover:shadow-sm transition-all touch-manipulation min-h-[52px]">
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
                {/* Compact Monitor Toggle */}
                <button
                    onClick={toggleMonitor}
                    className={`p-1.5 rounded-full transition-colors ${isMonitoring ? 'text-indigo-600 bg-indigo-50' : 'text-gray-300 hover:text-gray-500'}`}
                >
                    {isMonitoring ? <Bell size={12} className="fill-current" /> : <Bell size={12} />}
                </button>
            </div>
        );
    }

    const statusDetail = String(line._displayStatusDetail || line.status_detail || '');
    const delayMinutes = typeof line.delay_minutes === 'number' ? line.delay_minutes : null;
    const hasLineIdentity = Boolean(line._hasLineIdentity || line.railway_id || line.line_name);

    const statusTheme = (() => {
        if (statusDetail === 'canceled') {
            return {
                wrapper: 'bg-slate-50 border-l-4 border-slate-400',
                badge: 'bg-slate-600 text-white',
                badgeText: locale === 'ja' ? '運休' : locale === 'en' ? 'Cancelled' : '運休',
                defaultText: locale === 'ja' ? '一部または全区間で運休' : locale === 'en' ? 'Some services are cancelled' : '停駛／取消班次'
            };
        }
        if (statusDetail === 'halt') {
            return {
                wrapper: 'bg-rose-50 border-l-4 border-rose-500',
                badge: 'bg-rose-600 text-white',
                badgeText: locale === 'ja' ? '運転見合わせ' : locale === 'en' ? 'Suspended' : '運転見合わせ',
                defaultText: locale === 'ja' ? '運転を見合わせています' : locale === 'en' ? 'Service is suspended' : '暫停運行'
            };
        }
        if (statusDetail === 'delay_major') {
            return {
                wrapper: 'bg-orange-50 border-l-4 border-orange-500',
                badge: 'bg-orange-600 text-white',
                badgeText: locale === 'ja'
                    ? `遅延${delayMinutes !== null ? ` ${delayMinutes}分` : ''}`
                    : locale === 'en'
                        ? `Delay${delayMinutes !== null ? ` ${delayMinutes} min` : ''}`
                        : `延誤${delayMinutes !== null ? ` ${delayMinutes} 分` : ''}`,
                defaultText: locale === 'ja'
                    ? `30分以上の遅れ${delayMinutes !== null ? `（${delayMinutes}分）` : ''}`
                    : locale === 'en'
                        ? `Delay 30+ min${delayMinutes !== null ? ` (${delayMinutes} min)` : ''}`
                        : `延誤 30 分鐘以上${delayMinutes !== null ? `（${delayMinutes} 分）` : ''}`
            };
        }
        if (statusDetail === 'delay_minor') {
            return {
                wrapper: 'bg-amber-50 border-l-4 border-amber-400',
                badge: 'bg-amber-500 text-white',
                badgeText: locale === 'ja'
                    ? `遅延${delayMinutes !== null ? ` ${delayMinutes}分` : ''}`
                    : locale === 'en'
                        ? `Delay${delayMinutes !== null ? ` ${delayMinutes} min` : ''}`
                        : `延誤${delayMinutes !== null ? ` ${delayMinutes} 分` : ''}`,
                defaultText: locale === 'ja'
                    ? `30分未満の遅れ${delayMinutes !== null ? `（${delayMinutes}分）` : ''}`
                    : locale === 'en'
                        ? `Delay under 30 min${delayMinutes !== null ? ` (${delayMinutes} min)` : ''}`
                        : `延誤 30 分鐘以內${delayMinutes !== null ? `（${delayMinutes} 分）` : ''}`
            };
        }
        if ((line._displayStatus || line.status) === 'suspended') {
            return {
                wrapper: 'bg-rose-50 border-l-4 border-rose-500',
                badge: 'bg-rose-600 text-white',
                badgeText: locale === 'ja' ? '運行停止' : locale === 'en' ? 'Suspended' : '運行停止',
                defaultText: locale === 'ja' ? '運行に影響があります' : locale === 'en' ? 'Service disruption' : '運行受影響'
            };
        }
        if ((line._displayStatus || line.status) === 'delay') {
            return {
                wrapper: 'bg-amber-50 border-l-4 border-amber-400',
                badge: 'bg-amber-500 text-white',
                badgeText: locale === 'ja' ? '遅延' : locale === 'en' ? 'Delay' : '延誤',
                defaultText: tL2('status.delay')
            };
        }
        return {
            wrapper: '',
            badge: '',
            badgeText: '',
            defaultText: tL2('status.normal')
        };
    })();

    // Full Layout (Existing style for Delays or sparse lists)
    return (
        <div className={`p-4 flex items-center gap-3 touch-manipulation min-h-[64px] ${statusTheme.wrapper}`}>
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

                    {hasLineIdentity && (line._displayStatus || line.status) !== 'normal' && statusTheme.badgeText && (
                        <span className={`px-2 py-0.5 text-[9px] font-black rounded-full shrink-0 ${statusTheme.badge}`}>
                            {statusTheme.badgeText}
                        </span>
                    )}
                </div>
                <div className="flex justify-between items-center">
                    <p className="text-[10px] text-gray-500 truncate pr-2">
                        {hasLineIdentity && line.message
                            ? translateDisruption(getLocaleString(line.message, locale), locale)
                            : statusTheme.defaultText
                        }
                    </p>
                </div>
            </div>

            {/* Full Layout Monitor Toggle */}
            <button
                onClick={toggleMonitor}
                className={`p-2 rounded-full transition-all active:scale-95 ${isMonitoring
                    ? 'text-indigo-600 bg-indigo-50 shadow-sm'
                    : 'text-gray-300 hover:text-indigo-400 hover:bg-gray-50'
                    }`}
                title="Trip Guard: Monitor this line"
            >
                {isMonitoring ? <Bell size={18} className="fill-current" /> : <Bell size={18} />}
            </button>
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
        weather: { temp: 0, condition: 'Clear', windSpeed: 0 },
        crowd: { level: 1, trend: 'stable', userVotes: { total: 0, distribution: [0, 0, 0, 0, 0] } },
        updatedAt: undefined
    });



    // [New] Airport Logic
    const isHaneda = data.id === 'odpt:Station:Airport.Haneda' || data.name?.en?.includes('Haneda');
    const isNarita = data.id === 'odpt:Station:Airport.Narita' || data.name?.en?.includes('Narita');
    const isAirport = isHaneda || isNarita;
    const airportCode = isHaneda ? 'HND' : 'NRT';

    // Track Facility View (Funnel Step 4)
    useEffect(() => {
        if (data.id) {
            trackFunnelEvent({
                step_name: 'facility_viewed',
                step_number: 4,
                path: '/l2',
                metadata: {
                    facility_id: data.id,
                    facility_type: isAirport ? 'airport' : 'station'
                }
            });
        }
    }, [data.id, isAirport]);

    // Filter Lines for Airport (Show express preferentially)
    const displayLines = useMemo(() => {
        if (!isAirport) return lines;
        // Prioritize express
        return [...lines].sort((a: any, b: any) => {
            // Helper to get check string
            const getName = (n: any) => (typeof n.name === 'string' ? n.name : n.name?.en || '').toLowerCase();
            const nameA = getName(a);
            const nameB = getName(b);

            // Check for express keywords (English or localized if possible)
            const isExpressA = nameA.includes('express') || nameA.includes('liner') || nameA.includes('monorail') || nameA.includes('特急') || nameA.includes('ライナー');
            const isExpressB = nameB.includes('express') || nameB.includes('liner') || nameB.includes('monorail') || nameB.includes('特急') || nameB.includes('ライナー');

            return (isExpressB ? 1 : 0) - (isExpressA ? 1 : 0);
        });
    }, [lines, isAirport]);

    const displayLinesForUi = useMemo(() => {
        return displayLines.map((line: any) => {
            const hasLineIdentity = Boolean(line.railway_id || line.line_name);
            return {
                ...line,
                _displayStatus: hasLineIdentity ? line.status : 'normal',
                _displayStatusDetail: hasLineIdentity ? line.status_detail : 'normal',
                _hasLineIdentity: hasLineIdentity
            };
        });
    }, [displayLines]);

    // Re-derive for layout with sorted lines
    const delayedLines = displayLinesForUi.filter((l: any) => String(l._displayStatusDetail || (l._displayStatus === 'normal' ? 'normal' : 'unknown')) !== 'normal');
    const normalLines = displayLinesForUi.filter((l: any) => String(l._displayStatusDetail || (l._displayStatus === 'normal' ? 'normal' : 'unknown')) === 'normal');
    const isBusyHub = displayLinesForUi.length > 4;



    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom duration-500">
            {/* [New] Trip Guard Banner (Sticky/Top) */}
            <DisruptionBanner />

            {/* [New] Realtime Flight Board (Airport Only) */}
            {isAirport && (
                <div className="space-y-2">
                    <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest px-1">
                        {tL2('liveFlightTitle', { defaultValue: 'Live Flight Status' })}
                    </h3>
                    <LiveFlightBoard airportCode={airportCode} />
                </div>
            )}

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
                            logger.debug('Hub member clicked', { memberId });
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
                            {tL2('noLiveData', { defaultValue: 'No live line data available' })}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-1">
                            {/* 1. Delayed Lines (Full Alert Width) */}
                            {delayedLines.map((line: any) => (
                                <div key={line.id} className="border-b border-gray-50 last:border-0">
                                    <TrainLineItem
                                        line={line}
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
                        <span>
                            Data: ODPT / Open Data Challenge for Public Transportation ·
                            <a
                                href={`/${locale}/data-licenses`}
                                className="ml-1 underline underline-offset-2 hover:text-gray-500"
                            >
                                Licenses
                            </a>
                            <a
                                href="https://developer.odpt.org/terms"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-2 underline underline-offset-2 hover:text-gray-500"
                            >
                                ODPT Terms
                            </a>
                        </span>
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
                            {tL2('tokyoWide', { defaultValue: 'TOKYO WIDE' })}
                        </div>
                        <SmartWeatherCard initialData={data.l2?.weather} />
                    </div>


                    {/* [MODIFIED] Dynamic Partner Nudge Cards */}
                    {/* Currently checking for "Crowd" data to trigger Vacan, but can be generic */}
                    <PartnerNudgeCard
                        offer={PARTNER_REGISTRY.vacan}
                        dynamicParams={{}}
                    />

                    {/* User Crowd Report Section */}
                    <CrowdFeedbackCard
                        stationId={data.id}
                        initialCrowd={crowd}
                        tL2={tL2}
                    />
                </div>
            </div>
        </div>
    );
}



// Extracted Component for Crowd Feedback (Isolated Render)
const CrowdFeedbackCard = memo(({ stationId, initialCrowd, tL2 }: { stationId: string, initialCrowd: any, tL2: any }) => {
    const [clickedCrowd, setClickedCrowd] = useState<number | null>(null);

    // Derived Logic for Popular Vote
    const maxVoteIdx = useMemo(() => {
        if (!initialCrowd?.userVotes?.distribution) return -1;
        return initialCrowd.userVotes.distribution.indexOf(Math.max(...initialCrowd.userVotes.distribution));
    }, [initialCrowd]);

    const handleVote = async (idx: number) => {
        setClickedCrowd(idx); // Standard react render update only for this component

        try {
            await fetch('/api/l2/feedback', {
                method: 'POST',
                body: JSON.stringify({
                    stationId,
                    crowdLevel: idx + 1
                })
            });
        } catch (e) {
            logger.error('L2 status vote failed', e);
        }
    };

    return (
        <div className="flex-1 bg-white rounded-2xl border border-gray-100 p-3 shadow-sm flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-2">
                <Users size={14} className="text-gray-400" />
                <span className="text-[10px] font-black text-gray-400 uppercase">{tL2('crowdReport')}</span>
                <span className="text-[8px] text-indigo-400 bg-indigo-50 px-1 py-0.5 rounded ml-auto">
                    LIVE CROWD
                </span>
            </div>
            <p className="text-[8px] text-gray-400 mb-2 leading-tight">
                {tL2('dataSourceDisclaimer', { defaultValue: 'Source: Service Status & User Reports' })}
            </p>
            <div className="grid grid-cols-5 gap-1">
                {[
                    { emoji: '😴', label: tL2('crowd.empty') },
                    { emoji: '😊', label: tL2('crowd.comfortable') },
                    { emoji: '😐', label: tL2('crowd.normal') },
                    { emoji: '😓', label: tL2('crowd.crowded') },
                    { emoji: '🥵', label: tL2('crowd.full') },
                ].map((opt, idx) => {
                    // Logic: If user voted (clickedCrowd !== null), highlight their choice.
                    // If not voted, highlight the global max (maxVoteIdx).
                    // In original logic: isMostPopular = clickedCrowd !== null && idx === maxVoteIdx;
                    // Wait, original logic was:
                    // isMostPopular = clickedCrowd !== null && idx === maxVoteIdx;
                    // This means we ONLY show the "Most Popular" highlight AFTER the user has voted?
                    // Let's check original code:
                    // const isMostPopular = clickedCrowd !== null && idx === maxVoteIdx;
                    // Yes. So if user hasn't voted, no highlight?
                    // "highlight the global max" usually implies showing the crowd BEFORE vote.
                    // But maybe we want mystery until vote?
                    // Let's stick to original behavior: Show popular ONLY after vote, or maybe show always?
                    // Original code: isMostPopular = clickedCrowd !== null && idx === maxVoteIdx;
                    // Actually, lines 343-348:
                    // isSelected ? ... : isMostPopular ? ... : ...
                    // So if NOT selected, check isMostPopular.
                    // If `clickedCrowd` is null, isMostPopular is false.
                    // So initially, nothing is emphasized. User clicks -> they see their choice AND the popular choice (if different).

                    const isMostPopular = clickedCrowd !== null && idx === maxVoteIdx;
                    const isSelected = clickedCrowd === idx;

                    return (
                        <button
                            key={idx}
                            className={`flex flex-col items-center justify-center p-1.5 rounded-xl border transition-all relative min-h-[52px] touch-manipulation ${isSelected
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

                            {clickedCrowd !== null && (
                                <span className={`text-[8px] font-bold mt-0.5 ${isSelected ? 'text-indigo-100' : 'text-gray-400'}`}>
                                    {initialCrowd.userVotes.distribution[idx] + (isSelected ? 1 : 0)}
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
    );
});
CrowdFeedbackCard.displayName = 'CrowdFeedbackCard';
