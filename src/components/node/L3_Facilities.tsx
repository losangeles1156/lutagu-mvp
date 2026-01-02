'use client';

import { useEffect, useState, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { StationUIProfile, L3Facility, FacilityType, LocaleString } from '@/lib/types/stationStandard';
import { getLocaleString } from '@/lib/utils/localeUtils';
import {
    User, Briefcase, Zap, ArrowUpDown, CircleDollarSign, Baby, Bike, Wifi, Info,
    Cigarette, Boxes, ShoppingBag, Utensils, Ticket, TrainFront, Landmark, Trees, Bed, Loader2, ExternalLink,
    ChevronDown, ChevronRight, MapPin, Clock, Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Local Dictionary for Facility Keys
const FACILITY_KEY_MAP: Record<string, LocaleString> = {
    'Barrier_free_entrance': { en: 'Barrier-free Entrance', ja: 'バリアフリー出入口', zh: '無障礙出入口' },
    'Ticket_gate': { en: 'Ticket Gate', ja: '改札口', zh: '剪票口' },
    'Toilet': { en: 'Toilet', ja: 'トイレ', zh: '洗手間' },
    'Elevator': { en: 'Elevator', ja: 'エレベーター', zh: '電梯' },
    'Escalator': { en: 'Escalator', ja: 'エスカレーター', zh: '手扶梯' },
    'Stairs': { en: 'Stairs', ja: '階段', zh: '樓梯' },
    'Waiting_area': { en: 'Waiting Area', ja: '待合室', zh: '候車室' },
    'Locker': { en: 'Coins Lockers', ja: 'コインロッカー', zh: '置物櫃' },
    'ATM': { en: 'ATM', ja: 'ATM', zh: '提款機' },
    'Shop': { en: 'Shop', ja: '売店', zh: '商店' },
};

// Icon Mapping
const FACILITY_ICONS: Record<FacilityType | string, any> = {
    toilet: User, locker: Briefcase, charging: Zap, elevator: ArrowUpDown,
    atm: CircleDollarSign, nursery: Baby, bike: Bike, bikeshare: Bike, wifi: Wifi, info: Info,
    smoking: Cigarette, shopping: ShoppingBag, dining: Utensils, leisure: Ticket,
    transport: TrainFront, religion: Landmark, nature: Trees, accommodation: Bed,
    'Barrier_free_entrance': Users,
    'Ticket_gate': Ticket,
};

const FACILITY_COLORS: Record<FacilityType | string, string> = {
    toilet: 'bg-emerald-100 text-emerald-600',
    locker: 'bg-amber-100 text-amber-600',
    charging: 'bg-sky-100 text-sky-600',
    elevator: 'bg-blue-100 text-blue-600',
    atm: 'bg-indigo-100 text-indigo-600',
    nursery: 'bg-pink-100 text-pink-600',
    bike: 'bg-lime-100 text-lime-600',
    bikeshare: 'bg-lime-100 text-lime-600',
    wifi: 'bg-violet-100 text-violet-600',
    info: 'bg-gray-100 text-gray-600',
    smoking: 'bg-slate-100 text-slate-600',
    shopping: 'bg-orange-100 text-orange-600',
    dining: 'bg-red-100 text-red-600',
    leisure: 'bg-indigo-100 text-indigo-600',
    transport: 'bg-blue-100 text-blue-600',
    religion: 'bg-purple-100 text-purple-600',
    nature: 'bg-green-100 text-green-600',
    accommodation: 'bg-rose-100 text-rose-600',
    'Barrier_free_entrance': 'bg-cyan-100 text-cyan-600',
};

import { FacilityDetailModal } from '@/components/ui/FacilityDetailModal';

// Facility Priority Order (Accessibility First!)
const FACILITY_PRIORITY: Record<string, number> = {
    // 【無障礙設施】⭐ Highest Priority
    'elevator': 1,
    'Barrier_free_entrance': 2,
    'Escalator': 3,

    // 【親子設施】
    'nursery': 10,
    'Baby': 11,

    // 【衛生設施】
    'toilet': 20,
    'Toilet': 20,

    // 【服務設施】
    'info': 30,
    'Info': 30,
    'Ticket_gate': 31,
    'locker': 32,
    'Locker': 32,
    'atm': 33,
    'ATM': 33,
    'Waiting_area': 34,
    'Shop': 35,
    'shopping': 35,

    // 【其他設施】
    'charging': 40,
    'wifi': 41,
    'Wifi': 41,
    'bike': 42,
    'bikeshare': 42,
    'Bike': 42,
    'smoking': 43,
    'Cigarette': 43,
    'Stairs': 44,

    // 【類別設施】
    'dining': 50,
    'leisure': 51,
    'transport': 52,
    'religion': 53,
    'nature': 54,
    'accommodation': 55,
};

interface L3_FacilitiesProps {
    data: StationUIProfile;
}

export function L3_Facilities({ data }: L3_FacilitiesProps) {
    const tL3 = useTranslations('l3');
    const locale = useLocale();
    const [facilities, setFacilities] = useState<L3Facility[]>(data.l3_facilities || []);
    const [loading, setLoading] = useState(true);
    const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [retryKey, setRetryKey] = useState(0);
    const [selectedFacility, setSelectedFacility] = useState<L3Facility | null>(null);

    const trackEvent = (payload: {
        activityType: 'external_link_click' | 'facility_open';
        nodeId: string;
        trackingId?: string | null;
        url?: string | null;
        title?: string | null;
        facilityType?: string | null;
        facilityId?: string | null;
    }) => {
        try {
            void fetch('/api/activity', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    activityType: payload.activityType,
                    nodeId: payload.nodeId,
                    trackingId: payload.trackingId ?? null,
                    url: payload.url ?? null,
                    title: payload.title ?? null,
                    facilityType: payload.facilityType ?? null,
                    facilityId: payload.facilityId ?? null
                }),
                keepalive: true
            });
        } catch {
            return;
        }
    };

    // Group facilities by type with priority sorting
    const groupedFacilities = useMemo(() => {
        const groups: Record<string, L3Facility[]> = {};
        facilities.forEach(fac => {
            if (!groups[fac.type]) groups[fac.type] = [];
            groups[fac.type].push(fac);
        });

        // Sort groups by priority (Accessibility First!)
        const sortedEntries = Object.entries(groups).sort(([typeA], [typeB]) => {
            const priorityA = FACILITY_PRIORITY[typeA] ?? 999;
            const priorityB = FACILITY_PRIORITY[typeB] ?? 999;
            return priorityA - priorityB;
        });

        return Object.fromEntries(sortedEntries);
    }, [facilities]);

    // Set initial expanded category (first one)
    useEffect(() => {
        if (!expandedCategory && Object.keys(groupedFacilities).length > 0) {
            setExpandedCategory(Object.keys(groupedFacilities)[0]);
        }
    }, [groupedFacilities, expandedCategory]);

    useEffect(() => {
        let isMounted = true;

        // Prioritize Props Data
        if (data.l3_facilities && data.l3_facilities.length > 0) {
            setFacilities(data.l3_facilities);
            setLoading(false);
            return;
        }

        async function fetchFacilities() {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(`/api/station/${encodeURIComponent(data.id)}/facilities`);
                if (!res.ok) throw new Error('API Error');
                const json = await res.json();

                if (isMounted && json.facilities) {
                    // Adapt Backend Data (StationFacility) to UI Data (L3Facility)
                    const adapted: L3Facility[] = json.facilities.map((f: any, idx: number) => {
                        // Resolve Name/Location with priority:
                        // 1. Dictionary Lookup (Fix for raw keys)
                        // 2. object `name_i18n`
                        // 3. raw string `location` or `name`

                        const rawName = f.name_i18n || f.location || f.name || 'Unknown';

                        // Check Dictionary first if rawName is a simple string key
                        let nameObj: LocaleString;
                        if (typeof rawName === 'string' && FACILITY_KEY_MAP[rawName]) {
                            nameObj = FACILITY_KEY_MAP[rawName];
                        } else if (typeof rawName === 'object' && rawName !== null) {
                            nameObj = {
                                ja: rawName.ja || rawName.en || rawName.zh,
                                en: rawName.en || rawName.ja || rawName.zh,
                                zh: rawName.zh || rawName['zh-TW'] || rawName.ja
                            };
                        } else {
                            nameObj = { ja: rawName, en: rawName, zh: rawName };
                        }

                        let locObj: LocaleString;
                        const rawLoc = f.location || nameObj;
                        if (typeof rawLoc === 'object' && rawLoc !== null) {
                            locObj = {
                                ja: rawLoc.ja || rawLoc.en || rawLoc.zh,
                                en: rawLoc.en || rawLoc.ja || rawLoc.zh,
                                zh: rawLoc.zh || rawLoc['zh-TW'] || rawLoc.ja
                            };
                        } else {
                            locObj = { ja: rawLoc, en: rawLoc, zh: rawLoc };
                        }

                        return {
                            id: `${data.id}-l3-${idx}-${Date.now()}`,
                            type: f.type,
                            name: nameObj,
                            location: locObj,
                            details: f.attributes ? Object.entries(f.attributes).map(([k, v]) => {
                                const val = `${k}: ${v}`;
                                return { ja: val, en: val, zh: val };
                            }) : [],
                            attributes: f.attributes
                        };
                    });
                    setFacilities(adapted);
                }
            } catch (err) {
                const msg = locale.startsWith('ja')
                    ? '設施情報を取得できませんでした。時間をおいて再試行してください。'
                    : locale.startsWith('en')
                        ? 'Unable to load facilities right now. Please try again later.'
                        : '暫時無法取得設施資料，請稍後再試。';
                if (isMounted) setError(msg);
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        if (data.id) fetchFacilities();
        else setLoading(false);

        return () => { isMounted = false; };
    }, [data.id, data.l3_facilities, locale, retryKey]);

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <Loader2 className="animate-spin text-gray-300" />
            </div>
        );
    }

    if (error && (!facilities || facilities.length === 0)) {
        return (
            <div className="p-8 text-center text-gray-500 text-xs bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <div className="mb-4">{error}</div>
                <button
                    type="button"
                    onClick={() => setRetryKey(v => v + 1)}
                    className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-100 active:scale-[0.98] transition-all"
                >
                    {locale.startsWith('ja') ? '再試行' : locale.startsWith('en') ? 'Retry' : '重試'}
                </button>
            </div>
        );
    }

    if (!facilities || facilities.length === 0) {
        return (
            <div className="p-8 text-center text-gray-400 text-xs bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                {tL3('noServices')}
            </div>
        );
    }

    const toggleCategory = (type: string) => {
        setExpandedCategory(expandedCategory === type ? null : type);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom duration-500 pb-20">

            {/* Quick Links / Actions (e.g. Toilet Vacancy) */}
            {data.external_links && data.external_links.length > 0 && (
                <div className="space-y-2">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{tL3('quickLinks')}</h3>
                    {data.external_links.map((link, idx) => (
                        <a
                            key={idx}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() =>
                                trackEvent({
                                    activityType: 'external_link_click',
                                    nodeId: data.id,
                                    trackingId: (link as any)?.tracking_id ?? null,
                                    url: link.url,
                                    title: getLocaleString(link.title, locale)
                                })
                            }
                            className={`flex items-center justify-between p-4 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-[0.98] ${link.bg || 'bg-blue-600'} text-white`}
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/20 rounded-xl">
                                    {link.icon === 'toilet' ? <User size={20} aria-hidden="true" /> : <ExternalLink size={20} aria-hidden="true" />}
                                </div>
                                <span className="font-bold text-sm">{getLocaleString(link.title, locale)}</span>
                            </div>
                            <ExternalLink size={16} className="opacity-80" aria-hidden="true" />
                        </a>
                    ))}
                </div>
            )}

            {/* Grouped Facilities List */}
            <div className="space-y-3">
                <div className="flex items-center justify-between px-1 mb-2">
                    <div className="flex items-center gap-2">
                        <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest">{tL3('servicesTitle')}</h3>
                        <span className="px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 text-[9px] font-black uppercase tracking-widest border border-orange-100">
                            L3
                        </span>
                    </div>
                    <span className="text-[10px] font-bold text-gray-400">{tL3('facilitiesFound', { count: facilities.length })}</span>
                </div>

                {Object.entries(groupedFacilities).map(([type, items]) => {
                    const isExpanded = expandedCategory === type;
                    const Icon = FACILITY_ICONS[type] || Boxes;
                    const colorClass = FACILITY_COLORS[type] || 'bg-gray-100 text-gray-600';
                    const label = tL3(`categories.${type}`) !== `l3.categories.${type}` ? tL3(`categories.${type}`) : type;

                    // Check if this is a high-priority accessibility facility
                    const isAccessibility = (FACILITY_PRIORITY[type] ?? 999) <= 3;

                    return (
                        <div key={type} className="bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all duration-300 shadow-sm">

                            {/* Category Header */}
                            <button
                                onClick={() => toggleCategory(type)}
                                className="w-full flex items-center justify-between p-4 hover:bg-gray-50/80 transition-colors group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${colorClass} shadow-sm group-hover:scale-105 transition-transform`}>
                                        <Icon size={24} aria-hidden="true" strokeWidth={2.5} />
                                    </div>
                                    <div className="text-left">
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-sm font-extrabold text-gray-900 capitalize tracking-tight">{label}</h4>
                                            {isAccessibility && (
                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-cyan-100 text-cyan-700 text-[9px] font-black uppercase tracking-wider">
                                                    ♿ {locale === 'zh-TW' ? '優先' : locale === 'ja' ? '優先' : 'Priority'}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[10px] text-gray-500 font-bold bg-white px-1.5 py-0.5 rounded-md border border-gray-100 shadow-sm">
                                                {items.length} {tL3('items', { defaultValue: 'Items' })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className={`w-8 h-8 flex items-center justify-center rounded-full bg-white border border-gray-100 text-gray-400 shadow-sm transition-all duration-300 ${isExpanded ? 'rotate-180 bg-gray-50' : 'group-hover:border-gray-200'}`}>
                                    <ChevronDown size={16} aria-hidden="true" strokeWidth={2.5} />
                                </div>
                            </button>

                            {/* Expanded Content */}
                            <AnimatePresence>
                                {isExpanded && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                                    >
                                        <div className="px-4 pb-4 space-y-3 border-t border-gray-50 bg-gray-50/30 pt-3">
                                            {items.map((fac) => (
                                                <div
                                                    key={fac.id}
                                                    className="bg-white p-3 rounded-xl border border-gray-100 flex items-start gap-3 cursor-pointer hover:border-indigo-200 hover:shadow-sm transition-all active:scale-[0.99]"
                                                    onClick={() => {
                                                        trackEvent({
                                                            activityType: 'facility_open',
                                                            nodeId: data.id,
                                                            facilityType: fac.type,
                                                            facilityId: fac.id
                                                        });
                                                        setSelectedFacility(fac);
                                                    }}
                                                >
                                                    <div className="mt-1 text-gray-300">
                                                        <MapPin size={14} aria-hidden="true" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-gray-900">
                                                            {getLocaleString(fac.name, locale)}
                                                        </p>
                                                        {fac.details && fac.details.length > 0 && (
                                                            <div className="flex flex-wrap gap-1 mt-2">
                                                                {fac.details.map((detail, idx) => (
                                                                    <span key={idx} className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md">
                                                                        {getLocaleString(detail, locale)}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    );
                })}
            </div>

            {/* Detail Modal */}
            {selectedFacility && (
                <FacilityDetailModal
                    facility={{
                        id: selectedFacility.id,
                        category: selectedFacility.type,
                        subCategory: selectedFacility.type,
                        location: getLocaleString(selectedFacility.location, locale),
                        attributes: {
                            ...selectedFacility.attributes,
                            name: getLocaleString(selectedFacility.name, locale)
                        }
                    }}
                    onClose={() => setSelectedFacility(null)}
                />
            )}
        </div>
    );
}
