'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Compass,
    Activity,
    Building2,
    Lightbulb
} from 'lucide-react';
import { L1_DNA } from '@/components/node/L1_DNA';
import { L2_Live } from '@/components/node/L2_Live';
import { L3_Facilities } from '@/components/node/L3_Facilities';
import L4_Dashboard from '@/components/node/L4_Dashboard';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { StationUIProfile } from '@/lib/types/stationStandard';
import { getLocaleString } from '@/lib/utils/localeUtils';

const TABS = [
    { id: 'dna', icon: Compass, tone: 'sky', primary: false },
    { id: 'live', icon: Activity, tone: 'emerald', primary: false },
    { id: 'facility', icon: Building2, tone: 'amber', primary: false },
    { id: 'lutagu', icon: Lightbulb, tone: 'violet', primary: true },
] as const;

type TabId = (typeof TABS)[number]['id'];

const TAB_STYLES: Record<TabId, { active: string; inactive: string; dot: string }> = {
    dna: {
        active: 'bg-sky-600 text-white shadow-sm shadow-sky-200',
        inactive: 'bg-white text-slate-500 border border-slate-200',
        dot: 'bg-sky-600'
    },
    live: {
        active: 'bg-emerald-600 text-white shadow-sm shadow-emerald-200',
        inactive: 'bg-white text-slate-500 border border-slate-200',
        dot: 'bg-emerald-600'
    },
    facility: {
        active: 'bg-amber-600 text-white shadow-sm shadow-amber-200',
        inactive: 'bg-white text-slate-500 border border-slate-200',
        dot: 'bg-amber-600'
    },
    lutagu: {
        active: 'bg-violet-600 text-white shadow-sm shadow-violet-200',
        inactive: 'bg-violet-50 text-violet-700 border border-violet-200',
        dot: 'bg-violet-600'
    }
};

export function NodeTabs({ nodeData, profile }: { nodeData?: any, profile?: any }) {
    const [activeTab, setActiveTab] = useState<TabId>('lutagu');
    const tTabs = useTranslations('tabs');
    const tCommon = useTranslations('common');
    const tL4 = useTranslations('l4');
    const locale = useLocale();

    // Use real profile data or fallback to basic node structure
    const rawData = profile || nodeData || {};

    // [Adapter] Transform Backend L2 Status to UI L2 Structure
    const l2Adapter = (() => {
        const source = rawData.l2_status || {};

        return {
            lines: (source.line_status || []).map((l: any, idx: number) => ({
                id: `line-${idx}`,
                name: getLocaleString(l.name, locale) || l.line || l.name,
                operator: l.operator || 'Metro',
                color: l.color || '#999999',
                status: l.status || 'normal',
                message: getLocaleString(l.message, locale)
            })),
            weather: {
                temp: source.weather?.temp || 0,
                condition: source.weather?.condition || 'Clear',
                windSpeed: source.weather?.wind || 0
            },
            crowd: {
                level: source.congestion || 1,
                trend: 'stable' as const,
                userVotes: {
                    total: 0,
                    distribution: [0, 0, 0, 0, 0]
                }
            },
            updatedAt: source.updated_at
        };
    })();

    const standardData: StationUIProfile = {
        id: rawData.id || rawData.node_id || 'unknown',
        tier: rawData.tier || 'minor',
        name: {
            ja: rawData.name?.ja || rawData.title || 'Station',
            en: rawData.name?.en || rawData.title || 'Station',
            zh: rawData.name?.zh || rawData.name?.['zh-TW'] || rawData.title || '車站'
        },
        description: { ja: '', en: '', zh: '' }, // Default description
        mapDesign: rawData.mapDesign,
        l1_dna: rawData.l1_dna || {
            categories: {}, // Populate if possible from category_counts
            vibe_tags: rawData.vibe_tags || [],
            last_updated: new Date().toISOString()
        },
        l2: l2Adapter,
        l3_facilities: rawData.l3_facilities || [],
        l4_cards: rawData.l4_cards || [],
        external_links: rawData.external_links
    };

    return (
        <div className="w-full h-full bg-white flex flex-col">

            {/* Tab Navigation (Sticky Header) */}
            <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
                <div className="flex justify-between items-center px-3 py-2" role="tablist" aria-label={tCommon('tabMenu')}>
                    {TABS.map((tab) => {
                        const isActive = activeTab === tab.id;
                        const Icon = tab.icon;
                        const iconClassName = isActive ? TAB_STYLES[tab.id].active : TAB_STYLES[tab.id].inactive;

                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                role="tab"
                                aria-selected={isActive}
                                aria-controls={`panel-${tab.id}`}
                                id={`tab-${tab.id}`}
                                className={`relative flex flex-col items-center justify-center gap-1 min-w-[72px] min-h-[56px] px-3 py-2 rounded-2xl transition-transform duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/15 focus-visible:ring-offset-2 ${isActive ? 'text-slate-900' : 'text-slate-600 hover:text-slate-900'}`}
                            >
                                <div className={`flex items-center justify-center w-10 h-10 rounded-2xl transition-colors ${iconClassName}`}>
                                    <Icon size={20} strokeWidth={2} aria-hidden="true" />
                                </div>
                                <span className={`text-[10px] font-semibold leading-none ${isActive ? 'opacity-100' : 'opacity-75'}`}>
                                    {tTabs(tab.id)}
                                </span>

                                {/* Active Indicator Dot */}
                                {isActive && (
                                    <motion.div
                                        layoutId="activeTabDot"
                                        className={`absolute -bottom-1.5 w-1.5 h-1.5 rounded-full ${TAB_STYLES[tab.id].dot}`}
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 p-4 pb-24 overflow-y-auto">
                <AnimatePresence mode="wait">

                    {activeTab === 'dna' && (
                        <motion.div
                            key="dna"
                            id="panel-dna"
                            role="tabpanel"
                            aria-labelledby="tab-dna"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className="mb-4 px-1">
                                <h2 className="text-sm font-semibold text-slate-900">{tTabs('dna')}</h2>
                            </div>
                            <ErrorBoundary>
                                <L1_DNA data={standardData} />
                            </ErrorBoundary>
                        </motion.div>
                    )}

                    {activeTab === 'live' && (
                        <motion.div
                            key="live"
                            id="panel-live"
                            role="tabpanel"
                            aria-labelledby="tab-live"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className="mb-4 px-1">
                                <h2 className="text-sm font-semibold text-slate-900">{tTabs('live')}</h2>
                            </div>
                            <ErrorBoundary>
                                <L2_Live data={standardData} />
                            </ErrorBoundary>
                        </motion.div>
                    )}

                    {activeTab === 'facility' && (
                        <motion.div
                            key="facility"
                            id="panel-facility"
                            role="tabpanel"
                            aria-labelledby="tab-facility"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className="mb-4 px-1">
                                <h2 className="text-sm font-semibold text-slate-900">{tTabs('facility')}</h2>
                            </div>
                            <ErrorBoundary>
                                <L3_Facilities data={standardData} />
                            </ErrorBoundary>
                        </motion.div>
                    )}

                    {activeTab === 'lutagu' && (
                        <motion.div
                            key="lutagu"
                            id="panel-lutagu"
                            role="tabpanel"
                            aria-labelledby="tab-lutagu"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="h-full"
                        >
                            <div className="mb-4 px-1">
                                <h2 className="text-sm font-semibold text-slate-900">{tTabs('lutagu')}</h2>
                                <p className="text-xs text-slate-500">{tL4('strategyTitle')}</p>
                            </div>
                            <ErrorBoundary>
                                <L4_Dashboard
                                    currentNodeId={standardData.id}
                                    locale={locale as any}
                                />
                            </ErrorBoundary>
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>
        </div>
    );
}
