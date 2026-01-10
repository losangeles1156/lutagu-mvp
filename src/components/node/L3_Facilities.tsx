'use client';

import { useEffect, useState, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { StationUIProfile, L3Facility, LocaleString } from '@/lib/types/stationStandard';
import { getLocaleString, getBilingualString } from '@/lib/utils/localeUtils';
import { FacilityDetailModal } from '@/components/ui/FacilityDetailModal';
import { GLOBAL_SERVICES, ServiceCategory } from '@/data/externalServices';
import {
    User, Briefcase, Zap, ArrowUpDown, CircleDollarSign, Baby, Bike, Wifi, Info,
    Cigarette, Boxes, ShoppingBag, Utensils, Ticket, TrainFront, Landmark, Trees, Bed, Loader2, ExternalLink,
    ChevronDown, MapPin, Users, Luggage, BatteryCharging, HandMetal, X, ArrowRight, Store
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Local Dictionary for Facility Keys (case-insensitive lookup)
const FACILITY_KEY_MAP: Record<string, LocaleString> = {
    'barrier_free_entrance': { en: 'Barrier-free Entrance', ja: 'バリアフリー出入口', zh: '無障礙出入口' },
    'Barrier_free_entrance': { en: 'Barrier-free Entrance', ja: 'バリアフリー出入口', zh: '無障礙出入口' },
    'ticket_gate': { en: 'Ticket Gate', ja: '改札口', zh: '剪票口' },
    'Ticket_gate': { en: 'Ticket Gate', ja: '改札口', zh: '剪票口' },
    'toilet': { en: 'Toilet', ja: 'トイレ', zh: '洗手間' },
    'Toilet': { en: 'Toilet', ja: 'トイレ', zh: '洗手間' },
    'elevator': { en: 'Elevator', ja: 'エレベーター', zh: '電梯' },
    'Elevator': { en: 'Elevator', ja: 'エレベーター', zh: '電梯' },
    'escalator': { en: 'Escalator', ja: 'エスカレーター', zh: '手扶梯' },
    'Escalator': { en: 'Escalator', ja: 'エスカレーター', zh: '手扶梯' },
    'stairs': { en: 'Stairs', ja: '階段', zh: '樓梯' },
    'Stairs': { en: 'Stairs', ja: '階段', zh: '樓梯' },
    'waiting_area': { en: 'Waiting Area', ja: '待合室', zh: '候車室' },
    'waiting_room': { en: 'Waiting Room', ja: '待合室', zh: '候車室' },
    'locker': { en: 'Coin Lockers', ja: 'コインロッカー', zh: '置物櫃' },
    'coin_locker': { en: 'Coin Lockers', ja: 'コインロッカー', zh: '置物櫃' },
    'atm': { en: 'ATM', ja: 'ATM', zh: '提款機' },
    'ATM': { en: 'ATM', ja: 'ATM', zh: '提款機' },
    'wifi': { en: 'Wi-Fi', ja: 'Wi-Fi', zh: 'Wi-Fi' },
    'smoking_area': { en: 'Smoking Area', ja: '喫煙所', zh: '吸煙區' },
    'nursing_room': { en: 'Nursing Room', ja: '授乳室', zh: '哺乳室' },
    'information': { en: 'Information', ja: '案内所', zh: '服務台' },
};

// Attributes to hide from user display
const HIDDEN_ATTRIBUTES = new Set([
    '_source', 'source', 'source_url', '_source_url', 'osm_id',
    'location_description', 'updated_at', 'created_at', 'id'
]);

// Icon Mapping (case-insensitive)
const FACILITY_ICONS: Record<string, any> = {
    toilet: User, locker: Briefcase, charging: Zap, elevator: ArrowUpDown,
    atm: CircleDollarSign, nursery: Baby, bike: Bike, bikeshare: Bike, wifi: Wifi, info: Info,
    smoking: Cigarette, shopping: Store, dining: Utensils, leisure: Ticket,
    transport: TrainFront, religion: Landmark, nature: Trees, accommodation: Bed,
    // Additional mappings
    barrier_free_entrance: Users,
    'Barrier_free_entrance': Users,
    ticket_gate: Ticket,
    'Ticket_gate': Ticket,
    escalator: ArrowUpDown,
    stairs: ArrowUpDown,
    coin_locker: Briefcase,
    waiting_room: Info,
    smoking_area: Cigarette,
    nursing_room: Baby,
    information: Info,
};

const FACILITY_COLORS: Record<string, string> = {
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
    // Additional mappings
    barrier_free_entrance: 'bg-cyan-100 text-cyan-600',
    'Barrier_free_entrance': 'bg-cyan-100 text-cyan-600',
    ticket_gate: 'bg-indigo-100 text-indigo-600',
    escalator: 'bg-blue-100 text-blue-600',
    stairs: 'bg-gray-100 text-gray-600',
    coin_locker: 'bg-amber-100 text-amber-600',
    waiting_room: 'bg-gray-100 text-gray-600',
    smoking_area: 'bg-slate-100 text-slate-600',
    nursing_room: 'bg-pink-100 text-pink-600',
    information: 'bg-gray-100 text-gray-600',
};

interface L3_FacilitiesProps {
    data: StationUIProfile;
}

export function L3_Facilities({ data }: L3_FacilitiesProps) {
    const tL3 = useTranslations('l3');
    const tCommon = useTranslations('common');
    const locale = useLocale();
    const [facilities, setFacilities] = useState<L3Facility[]>(data.l3_facilities || []);
    const [loading, setLoading] = useState(true);
    const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [retryKey, setRetryKey] = useState(0);
    const [selectedFacility, setSelectedFacility] = useState<L3Facility | null>(null);
    const [drawerCategory, setDrawerCategory] = useState<{ type: string; label: string; items: L3Facility[] } | null>(null);

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

    // Group facilities by type
    const groupedFacilities = useMemo(() => {
        const groups: Record<string, L3Facility[]> = {};

        // Categories to hide for MVP due to data quality issues
        const HIDDEN_CATEGORIES_MVP = new Set([
            'barrier_free_entrance',
            'Barrier_free_entrance'
        ]);

        // Max items per category for MVP (prevents overwhelming UI with bad data)
        const MAX_ITEMS_PER_CATEGORY = 10;

        facilities.forEach(fac => {
            // Skip hidden categories
            if (HIDDEN_CATEGORIES_MVP.has(fac.type)) return;

            if (!groups[fac.type]) groups[fac.type] = [];
            // Limit items per category
            if (groups[fac.type].length < MAX_ITEMS_PER_CATEGORY) {
                groups[fac.type].push(fac);
            }
        });
        return groups;
    }, [facilities]);

    // Categories now start collapsed (removed auto-expand logic for MVP)

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
                        // [Fix] Prioritize distinct location description from attributes
                        const rawLoc = f.attributes?.location_description || f.attributes?.location || f.location || nameObj;

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
                            details: f.attributes ? Object.entries(f.attributes)
                                .filter(([k]) => !HIDDEN_ATTRIBUTES.has(k) && !k.startsWith('_'))
                                .filter(([, v]) => v !== null && v !== undefined && v !== '')
                                .map(([k, v]) => {
                                    // Localize attribute keys
                                    const keyMap: Record<string, LocaleString> = {
                                        'wheelchair': { ja: '車いす対応', en: 'Wheelchair', zh: '輪椅' },
                                        'ostomate': { ja: 'オストメイト', en: 'Ostomate', zh: '造口護理' },
                                        'floor': { ja: 'フロア', en: 'Floor', zh: '樓層' },
                                        'operator': { ja: '運営', en: 'Operator', zh: '營運商' },
                                    };
                                    const localizedKey = keyMap[k] ? getLocaleString(keyMap[k], locale) : k;
                                    const val = v === true ? '✓' : v === false ? '✗' : String(v);
                                    return { ja: `${localizedKey}: ${val}`, en: `${localizedKey}: ${val}`, zh: `${localizedKey}: ${val}` };
                                }) : [],
                            attributes: f.attributes
                        };
                    });
                    setFacilities(adapted);
                }
            } catch (err) {
                if (isMounted) setError(tL3('noServices'));
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        if (data.id) fetchFacilities();
        else setLoading(false);

        return () => { isMounted = false; };
    }, [data.id, data.l3_facilities, locale, retryKey, tL3]);

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
                    {locale.startsWith('ja') ? tCommon('retry', { defaultValue: '再試行' }) : locale.startsWith('en') ? tCommon('retry', { defaultValue: 'Retry' }) : tCommon('retry', { defaultValue: '重試' })}
                </button>
            </div>
        );
    }

    // [FIX] Don't return early - we still want to show global services even if station-specific facilities are empty
    const hasStationFacilities = facilities && facilities.length > 0;

    const toggleCategory = (type: string, items: L3Facility[], label: string) => {
        const isAccessible = type.toLowerCase().includes('barrier_free') || type.toLowerCase().includes('accessibility');
        if (isAccessible) {
            setDrawerCategory({ type, label, items });
            setExpandedCategory(null);
        } else {
            setExpandedCategory(expandedCategory === type ? null : type);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom duration-500 pb-20">

            {/* Grouped Facilities List */}
            {hasStationFacilities ? (
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

                    {Object.entries(groupedFacilities).map(([type, items]) => (
                        <FacilityCategory
                            key={type}
                            type={type}
                            items={items}
                            expandedCategory={expandedCategory}
                            toggleCategory={toggleCategory}
                            trackEvent={trackEvent}
                            setSelectedFacility={setSelectedFacility}
                            locale={locale}
                            tL3={tL3}
                            tCommon={tCommon}
                            id={data.id}
                        />
                    ))}
                </div>
            ) : (
                <div className="p-6 text-center text-gray-400 text-xs bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    {tL3('noServices')}
                </div>
            )}

            {/* Quick Links / Actions (e.g. Toilet Vacancy) */}
            {(data.external_links && data.external_links.length > 0 || data.id === 'odpt.Station:JR-East.Tokyo' || data.id === 'odpt.Station:JR-East.Yamanote.Tokyo' || data.name?.en?.includes('Tokyo Station')) && (
                <div className="space-y-2">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{tL3('quickLinks')}</h3>

                    {/* Tokyo Station VACAN Link (Hardcoded for MVP) */}
                    {(data.id === 'odpt.Station:JR-East.Tokyo' || data.id === 'odpt.Station:JR-East.Yamanote.Tokyo' || data.name?.en?.includes('Tokyo')) && (
                        <a
                            href="https://tokyo-station-toilet.pages.vacan.com/marunouchi-area"
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() =>
                                trackEvent({
                                    activityType: 'external_link_click',
                                    nodeId: data.id,
                                    url: 'https://tokyo-station-toilet.pages.vacan.com/marunouchi-area',
                                    title: 'Tokyo Station Toilet Vacancy',
                                    facilityType: 'toilet'
                                })
                            }
                            className="flex items-center justify-between p-4 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-[0.98] bg-cyan-600 text-white touch-manipulation"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/20 rounded-xl relative">
                                    <User size={20} aria-hidden="true" />
                                    <span className="absolute top-1 right-1 w-2 h-2 bg-green-400 border-2 border-cyan-600 rounded-full animate-pulse"></span>
                                </div>
                                <div>
                                    <span className="font-bold text-sm block">
                                        {tL3('toiletVacancy', { defaultValue: '廁所即時空缺' })}
                                    </span>
                                    <span className="text-[10px] opacity-90 block">
                                        {tL3('toiletVacancyDesc', { defaultValue: 'VACAN 即時狀態確認' })}
                                    </span>
                                </div>
                            </div>
                            <ExternalLink size={16} className="opacity-80" aria-hidden="true" />
                        </a>
                    )}

                    {data.external_links?.map((link, idx) => (
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

            {/* Universal Service Links (Not station-specific) */}
            <div className="space-y-2">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
                    {tL3('travelServices', { defaultValue: '旅遊服務' })}
                </h3>
                <div className="grid grid-cols-1 gap-2">
                    {(['shared_bike', 'charging', 'hands_free_tourism'] as ServiceCategory[]).map((cat) => {
                        const service = GLOBAL_SERVICES[cat];
                        if (!service) return null;
                        const lang = locale.startsWith('ja') ? 'ja' : locale.startsWith('zh') ? 'zh' : 'en';
                        const s = service[lang];
                        const Icon = cat === 'shared_bike' ? Bike : cat === 'charging' ? BatteryCharging : Luggage;
                        const bgColor = cat === 'shared_bike' ? 'bg-lime-600' : cat === 'charging' ? 'bg-sky-600' : 'bg-amber-600';
                        return (
                            <a
                                key={cat}
                                href={s.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center justify-between p-4 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-[0.98] ${bgColor} text-white`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white/20 rounded-xl">
                                        <Icon size={20} aria-hidden="true" />
                                    </div>
                                    <div>
                                        <span className="font-bold text-sm block">{s.name}</span>
                                        <span className="text-xs opacity-80">{s.desc}</span>
                                    </div>
                                </div>
                                <ExternalLink size={16} className="opacity-80" aria-hidden="true" />
                            </a>
                        );
                    })}
                </div>
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

            {/* Accessible Facilities List Drawer */}
            <AnimatePresence>
                {drawerCategory && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setDrawerCategory(null)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
                        />
                        {/* Drawer Content */}
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed bottom-0 left-0 right-0 z-[70] bg-slate-50 rounded-t-[32px] shadow-2xl max-h-[85vh] flex flex-col overflow-hidden"
                        >
                            {/* Drawer Header */}
                            <div className="p-6 pb-4 flex items-center justify-between sticky top-0 bg-slate-50/80 backdrop-blur-md z-10 border-b border-slate-200/50">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${FACILITY_COLORS[drawerCategory.type] || 'bg-cyan-100 text-cyan-600'}`}>
                                        {(() => {
                                            const Icon = FACILITY_ICONS[drawerCategory.type] || Users;
                                            return <Icon size={24} strokeWidth={2.5} />;
                                        })()}
                                    </div>
                                    <div>
                                        <h3 className="font-black text-xl text-slate-900">{drawerCategory.label}</h3>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                            {drawerCategory.items.length} {tL3('items')}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setDrawerCategory(null)}
                                    className="w-11 h-11 p-2.5 bg-slate-200/50 hover:bg-slate-200 text-slate-500 rounded-full transition-colors flex items-center justify-center"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Drawer Body - Scrollable List */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-12">
                                {drawerCategory.items.map((fac) => (
                                    <button
                                        key={fac.id}
                                        onClick={() => {
                                            trackEvent({
                                                activityType: 'facility_open',
                                                nodeId: data.id,
                                                facilityType: fac.type,
                                                facilityId: fac.id
                                            });
                                            setSelectedFacility(fac);
                                            // Optional: Keep drawer open or close it?
                                            // User usually wants to see the detail, so we keep it or close it?
                                            // Let's close the drawer when a detail is selected to avoid stack.
                                            setDrawerCategory(null);
                                        }}
                                        className="w-full text-left bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm hover:border-cyan-300 hover:shadow-md transition-all active:scale-[0.98] group"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-start gap-3">
                                                <div className="mt-1 p-1.5 bg-slate-50 rounded-lg text-slate-400 group-hover:text-cyan-500 transition-colors">
                                                    <MapPin size={16} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 group-hover:text-cyan-700 transition-colors">
                                                        {getBilingualString(fac.name, locale)}
                                                    </p>
                                                    {fac.details && fac.details.length > 0 && (
                                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                                            {fac.details.map((detail, idx) => (
                                                                <span key={idx} className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 font-bold rounded-md border border-slate-200/30">
                                                                    {getLocaleString(detail, locale)}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="mt-1 text-slate-300 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all">
                                                <ArrowRight size={18} />
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}

// Extracted Memoized Components

const FacilityCategory = ({
    type,
    items,
    expandedCategory,
    toggleCategory,
    trackEvent,
    setSelectedFacility,
    locale,
    tL3,
    tCommon,
    id
}: {
    type: string;
    items: L3Facility[];
    expandedCategory: string | null;
    toggleCategory: (type: string, items: L3Facility[], label: string) => void;
    trackEvent: (payload: any) => void;
    setSelectedFacility: (fac: L3Facility) => void;
    locale: any;
    tL3: any;
    tCommon: any;
    id: string;
}) => {
    const isExpanded = expandedCategory === type;
    const typeLower = type.toLowerCase();
    const Icon = FACILITY_ICONS[type] || FACILITY_ICONS[typeLower] || Boxes;
    const colorClass = FACILITY_COLORS[type] || FACILITY_COLORS[typeLower] || 'bg-gray-100 text-gray-600';
    const keyMapEntry = FACILITY_KEY_MAP[type] || FACILITY_KEY_MAP[typeLower];
    const label = keyMapEntry
        ? getLocaleString(keyMapEntry, locale)
        : (tL3(`categories.${type}`) !== `l3.categories.${type}` ? tL3(`categories.${type}`) : type);

    return (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all duration-300 shadow-sm">
            <button
                onClick={() => toggleCategory(type, items, label)}
                aria-label={`${label}: ${items.length} ${tL3('items', { defaultValue: 'items' })}${isExpanded ? ' - ' + tCommon('close') : ''}`}
                aria-expanded={isExpanded}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50/80 transition-colors group touch-manipulation min-h-[64px]"
            >
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${colorClass} shadow-sm group-hover:scale-105 transition-transform`}>
                        <Icon size={24} aria-hidden="true" strokeWidth={2.5} />
                    </div>
                    <div className="text-left">
                        <h4 className="text-sm font-extrabold text-gray-900 capitalize tracking-tight">{label}</h4>
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
                                <FacilityRow
                                    key={fac.id}
                                    fac={fac}
                                    id={id}
                                    locale={locale}
                                    trackEvent={trackEvent}
                                    setSelectedFacility={setSelectedFacility}
                                />
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const FacilityRow = ({
    fac,
    id,
    locale,
    trackEvent,
    setSelectedFacility
}: {
    fac: L3Facility;
    id: string;
    locale: any;
    trackEvent: (payload: any) => void;
    setSelectedFacility: (fac: L3Facility) => void;
}) => (
    <div
        className="bg-white p-3 rounded-xl border border-gray-100 flex items-start gap-3 cursor-pointer hover:border-indigo-200 hover:shadow-sm transition-all active:scale-[0.99] touch-manipulation min-h-[64px]"
        onClick={() => {
            trackEvent({
                activityType: 'facility_open',
                nodeId: id,
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
            <p className="text-sm font-medium text-gray-900 leading-tight">
                {getBilingualString(fac.name, locale)}
            </p>
            {fac.location && getLocaleString(fac.location, locale) !== getLocaleString(fac.name, locale) && (
                <div className="flex items-center gap-1 mt-1 text-xs text-indigo-600 font-medium bg-indigo-50 px-1.5 py-0.5 rounded w-fit max-w-full truncate">
                    <MapPin size={10} className="shrink-0" />
                    <span>{getLocaleString(fac.location, locale)}</span>
                </div>
            )}
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
);
