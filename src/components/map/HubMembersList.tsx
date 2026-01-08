'use client';

import { memo } from 'react';
import { Link2, MapPin, Footprints, Building2 } from 'lucide-react';
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

interface HubMemberCardProps {
    member: HubMemberInfo;
    locale: string;
    onMemberClick?: (memberId: string) => void;
}

const TransferTypeLabels: Record<string, { icon: typeof Link2; label: string; color: string; bgColor: string }> = {
    indoor: {
        icon: Building2,
        label: '室內直通',
        color: 'text-emerald-700',
        bgColor: 'bg-emerald-50 border-emerald-200'
    },
    outdoor: {
        icon: Footprints,
        label: '站外換乘',
        color: 'text-amber-700',
        bgColor: 'bg-amber-50 border-amber-200'
    }
};

// Memoized Hub Member Card
const HubMemberCard = memo(({ member, locale, onMemberClick }: HubMemberCardProps) => {
    const memberName = getLocaleString(member.member_name, locale) || member.member_id;
    const operatorColor = getOperatorColor(member.operator);

    const transferInfo = TransferTypeLabels[member.transfer_type] || TransferTypeLabels.outdoor;
    const TransferIcon = transferInfo.icon;
    const walkingTime = member.walking_seconds
        ? `${Math.ceil(member.walking_seconds / 60)} 分鐘`
        : null;

    return (
        <button
            onClick={() => onMemberClick?.(member.member_id)}
            className="w-full p-3 bg-white rounded-xl border border-gray-100 hover:border-indigo-200 hover:shadow-md transition-all text-left group"
        >
            <div className="flex items-start gap-3">
                {/* Operator Color Bar */}
                <div
                    className="w-1.5 h-full min-h-[60px] rounded-full shrink-0"
                    style={{ backgroundColor: operatorColor }}
                />

                <div className="flex-1 min-w-0">
                    {/* Member Name */}
                    <h4 className="font-bold text-sm text-gray-900 group-hover:text-indigo-600 transition-colors">
                        {memberName}
                    </h4>

                    {/* Operator & Line */}
                    <p className="text-xs text-gray-500 mt-0.5">
                        <span className="font-medium">{member.operator}</span>
                        {member.line_name && <span> · {member.line_name}</span>}
                    </p>

                    {/* Transfer Type Badge */}
                    <div className="flex items-center gap-2 mt-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${transferInfo.bgColor} ${transferInfo.color}`}>
                            <TransferIcon size={10} />
                            {transferInfo.label}
                        </span>

                        {walkingTime && (
                            <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                                <MapPin size={10} />
                                {walkingTime}
                            </span>
                        )}
                    </div>
                </div>

                {/* Arrow indicator */}
                <div className="shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-indigo-400">
                        <path d="M9 18l6-6-6-6" />
                    </svg>
                </div>
            </div>
        </button>
    );
});

HubMemberCard.displayName = 'HubMemberCard';

// Helper function to get operator color
function getOperatorColor(operator: string): string {
    const colors: Record<string, string> = {
        'JR-East': '#006400',      // Dark Green 深綠色
        'JR-West': '#1976D2',
        'JR-Central': '#388E3C',
        'TokyoMetro': '#4F46E5',   // Indigo 靛藍色
        'Toei': '#6CBB5A',         // Light Green Ginkgo 淺綠銀杏葉
        'TokyoMonorail': '#00BFFF',
        'Keisei': '#00008B',       // Dark Blue 深藍色
        'Keikyu': '#8B0000',       // Dark Red 深紅色
        'Keio': '#F57C00',
        'Odakyu': '#0060B2',
        'Seibu': '#FF9800',
        'Tobu': '#1E40AF',         // White-Blue mix 白藍混搭
        'Tokyu': '#FF5722',
        'Airport': '#FF6B35',
        'Mitsubishi': '#607D8B',
        'Other': '#9E9E9E'
    };

    return colors[operator] || colors['Other'];
}

// Hub Members List Component
interface HubMembersListProps {
    members: HubMemberInfo[];
    locale: string;
    hubName?: string;
    onMemberClick?: (memberId: string) => void;
}

export const HubMembersList = memo(function HubMembersList({
    members,
    locale,
    hubName,
    onMemberClick
}: HubMembersListProps) {
    if (!members || members.length === 0) return null;

    const indoorCount = members.filter(m => m.transfer_type === 'indoor').length;
    const outdoorCount = members.filter(m => m.transfer_type === 'outdoor').length;

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest">
                        換乘站點
                    </h3>
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-full">
                        {members.length} 個站點
                    </span>
                </div>

                {/* Transfer type summary */}
                <div className="flex items-center gap-2 text-[10px]">
                    {indoorCount > 0 && (
                        <span className="flex items-center gap-1 text-emerald-600">
                            <Building2 size={10} />
                            {indoorCount} 室內
                        </span>
                    )}
                    {outdoorCount > 0 && (
                        <span className="flex items-center gap-1 text-amber-600">
                            <Footprints size={10} />
                            {outdoorCount} 站外
                        </span>
                    )}
                </div>
            </div>

            {/* Members Grid */}
            <div className="grid grid-cols-1 gap-2">
                {members.map((member) => (
                    <HubMemberCard
                        key={member.member_id}
                        member={member}
                        locale={locale}
                        onMemberClick={onMemberClick}
                    />
                ))}
            </div>
        </div>
    );
});

// Hub Info Header Component
interface HubInfoHeaderProps {
    hubName: string;
    hubId: string;
    memberCount: number;
    transferType: string;
    transferComplexity: string;
    indoorConnectionNotes?: string | null;
    locale: string;
}

export const HubInfoHeader = memo(function HubInfoHeader({
    hubName,
    hubId,
    memberCount,
    transferType,
    transferComplexity,
    indoorConnectionNotes,
    locale
}: HubInfoHeaderProps) {
    const complexityColors: Record<string, { bg: string; text: string }> = {
        simple: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
        moderate: { bg: 'bg-amber-50', text: 'text-amber-700' },
        complex: { bg: 'bg-rose-50', text: 'text-rose-700' }
    };

    const complexityLabels: Record<string, string> = {
        simple: '簡單換乘',
        moderate: '中等換乘',
        complex: '複雜換乘'
    };

    const colors = complexityColors[transferComplexity] || complexityColors.moderate;

    return (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-4 border border-indigo-100">
            <div className="flex items-start gap-3">
                {/* Hub Icon */}
                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-lg">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-white">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                        <path d="M2 12h20" />
                    </svg>
                </div>

                <div className="flex-1 min-w-0">
                    <h2 className="text-base font-black text-gray-900">{hubName}</h2>
                    <p className="text-[10px] text-gray-400 font-mono mt-0.5 truncate">{hubId}</p>

                    {/* Badges */}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="px-2 py-0.5 bg-white border border-indigo-200 text-indigo-700 text-[10px] font-bold rounded-full">
                            🔗 {memberCount} 個子站點
                        </span>

                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${colors.bg} ${colors.text}`}>
                            {complexityLabels[transferComplexity]}
                        </span>

                        {indoorConnectionNotes && (
                            <span className="text-[10px] text-gray-500 hidden sm:inline">
                                {indoorConnectionNotes}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});
