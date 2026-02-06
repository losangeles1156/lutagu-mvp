'use client';

import { logger } from '@/lib/utils/logger';

import { useState, useEffect } from 'react';
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
import L4_Dashboard from '@/components/node/L4_Dashboard_Optimized';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { StationUIProfile } from '@/lib/types/stationStandard';
import { getLocaleString } from '@/lib/utils/localeUtils';
import { useUIStore } from '@/stores/uiStore';

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
    // L2: Use store state for deep link support
    const storeNodeTab = useUIStore(state => state.nodeActiveTab);
    const setNodeActiveTab = useUIStore(state => state.setNodeActiveTab);
    const [localTab, setLocalTab] = useState<TabId>('lutagu');

    // Use store tab if available, otherwise use local state
    const activeTab = (storeNodeTab || localTab) as TabId;

    const tTabs = useTranslations('tabs');
    const tCommon = useTranslations('common');
    const tL4 = useTranslations('l4');
    const locale = useLocale();

    const node = nodeData && typeof nodeData === 'object' ? nodeData : {};
    const prof = profile && typeof profile === 'object' ? profile : {};
    const rawData = { ...node, ...prof };

    // [Adapter] Transform Backend L2 Status to UI L2 Structure
    const l2Adapter = (() => {
        const source = rawData.l2_status || {};

        return {
            lines: (source.line_status || []).map((l: any, idx: number) => ({
                id: l.railway_id || l.id || `${l.operator || 'unknown'}:${l.line || idx}`,
                name: getLocaleString(l.name, locale) || l.line || l.name,
                railway_id: l.railway_id,
                line_name: l.line_name || l.line,
                operator: l.operator || 'Metro',
                color: l.color || '#999999',
                status: l.status || 'normal',
                status_detail: l.status_detail || undefined,
                delay_minutes: typeof l.delay_minutes === 'number' ? l.delay_minutes : null,
                severity: l.severity || undefined,
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
        id: node.id || node.node_id || prof.node_id || rawData.id || rawData.node_id || 'unknown',
        tier: node.tier || rawData.tier || 'minor',
        name: {
            ja: node.name?.ja || rawData.name?.ja || node.title || rawData.title || 'Station',
            en: node.name?.en || rawData.name?.en || node.title || rawData.title || 'Station',
            zh: node.name?.zh || node.name?.['zh-TW'] || rawData.name?.zh || rawData.name?.['zh-TW'] || node.title || rawData.title || tCommon('station', { defaultValue: '車站' })
        },
        description: {
            ja: node.description?.ja || rawData.description?.ja || '',
            en: node.description?.en || rawData.description?.en || '',
            zh: node.description?.zh || node.description?.['zh-TW'] || rawData.description?.zh || rawData.description?.['zh-TW'] || ''
        },
        l1_dna: {
            categories: rawData.l1_dna?.categories || {},
            vibe_tags: (() => {
                // Ensure vibe_tags is always an array before mapping
                const tags = node.vibe_tags || rawData.vibe_tags;
                if (!tags) return [];
                if (Array.isArray(tags)) {
                    return tags.map((t: string | { id: string; label?: any; score?: number }) => {
                        if (typeof t === 'string') {
                            return { id: t, label: { ja: t, en: t, zh: t }, score: 5 };
                        }
                        // Ensure existing objects have all required fields
                        return {
                            id: t.id || String(t),
                            label: t.label || { ja: t.id, en: t.id, zh: t.id },
                            score: t.score ?? 5
                        };
                    });
                }
                // Handle case where tags is an object or other type
                logger.warn('[NodeTabs] vibe_tags is not an array:', typeof tags, tags);
                return [];
            })(),
            tagline: rawData.l1_dna?.tagline,
            title: rawData.l1_dna?.title,
            last_updated: new Date().toISOString()
        },
        l2: l2Adapter,
        l3_facilities: rawData.l3_facilities || [],
        l4_cards: rawData.l4_cards || [],
        l4_knowledge: node.riding_knowledge || rawData.riding_knowledge || rawData.l4_knowledge || undefined
    };

    // Debug: Log L4 Knowledge data flow


    return (
        <div className="flex flex-col h-full bg-slate-50 relative">
            {/* Tab Navigation */}
            <div className="flex-none px-4 pb-2 pt-2 bg-white border-b border-slate-100 shadow-sm z-20 flex items-center justify-between">
                <div className="flex gap-2 overflow-x-auto no-scrollbar py-1 flex-1" role="tablist">
                    {TABS.map((tab) => {
                        const isActive = activeTab === tab.id;
                        const styles = TAB_STYLES[tab.id];
                        const Icon = tab.icon;

                        // Custom Label Logic
                        let label = tTabs(tab.id);
                        if (tab.id === 'lutagu') {
                            // Override label for LUTAGU tab
                            label = tTabs('lutaguSmart', { defaultValue: tL4('lutaguStrategy', { defaultValue: '智能嚮導' }) });
                        }

                        return (
                            <button
                                key={tab.id}
                                onClick={() => { setLocalTab(tab.id); setNodeActiveTab(tab.id); }}
                                role="tab"
                                aria-selected={isActive}
                                aria-label={tTabs(`${tab.id}Label`, { defaultValue: label })}
                                className={`
                                    flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold transition-all whitespace-nowrap
                                    ${isActive ? styles.active : styles.inactive}
                                `}
                            >
                                <Icon size={16} className={isActive ? 'stroke-[3px]' : ''} aria-hidden="true" />
                                <span>{label}</span>
                                {isActive && (
                                    <motion.div
                                        layoutId="activeTabDot"
                                        className="w-1.5 h-1.5 rounded-full bg-white ml-0.5"
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                        className={`h-full w-full absolute inset-0 ${activeTab === 'lutagu' ? 'overflow-hidden' : 'overflow-y-auto p-4'}`}
                    >
                        <ErrorBoundary variant="inline">
                            {activeTab === 'dna' && (
                                <L1_DNA
                                    data={standardData}
                                />
                            )}
                            {activeTab === 'live' && (
                                <L2_Live
                                    data={standardData}
                                />
                            )}
                            {activeTab === 'facility' && (
                                <L3_Facilities
                                    data={standardData}
                                />
                            )}
                            {activeTab === 'lutagu' && (
                                <L4_Dashboard
                                    currentNodeId={standardData.id}
                                    l4Knowledge={standardData.l4_knowledge}
                                />
                            )}
                        </ErrorBoundary>
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
