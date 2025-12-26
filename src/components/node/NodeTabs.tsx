'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Dna,
    Activity,
    Grid,
    Sparkles,
    TrainFront
} from 'lucide-react';
import { L1_DNA } from '@/components/node/L1_DNA';
import { L2_Live } from '@/components/node/L2_Live';
import { L3_Facilities } from '@/components/node/L3_Facilities';
import { L4_Bambi } from '@/components/node/L4_Bambi';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { TimetableBoard } from '@/components/odpt/TimetableBoard';
import { FareTable } from '@/components/odpt/FareTable';
import { guessOperator } from '@/hooks/useOdptData';

// Tab Configuration
const TABS = [
    { id: 'dna', label: 'DNA', icon: Dna, color: 'bg-blue-500' },
    { id: 'live', label: 'LIVE', icon: Activity, color: 'bg-green-500' },
    { id: 'l3', label: 'FACILITY', icon: Grid, color: 'bg-orange-500' },
    { id: 'l4', label: 'BAMBI', icon: Sparkles, color: 'bg-purple-600' },
];

export function NodeTabs({ nodeData, profile }: { nodeData?: any, profile?: any }) {
    const [activeTab, setActiveTab] = useState('l4'); // Default to L4 for Bambi strategy
    const tTabs = useTranslations('tabs');

    // Use real profile data or fallback to basic node structure
    const rawData = profile || nodeData || {};
    const operator = rawData.id ? guessOperator(rawData.id) : '';

    // [Adapter] Transform Backend L1 Counts to UI L1 Structure
    const l1Adapter = (() => {
        // If the new format already exists, use it
        if (rawData.l1_dna) return rawData.l1_dna;

        // If the OLD array format exists (legacy support/transition), convert it
        // (Skipping for now as we assume cold data or mock counts)

        const counts = rawData.category_counts || {};

        // Helper for labels
        const labels: Record<string, { ja: string, en: string, zh: string }> = {
            shopping: { ja: '買い物', en: 'Shopping', zh: '購物' },
            dining: { ja: 'グルメ', en: 'Dining', zh: '餐飲' },
            leisure: { ja: 'レジャー', en: 'Leisure', zh: '休閒' },
            culture: { ja: '文化', en: 'Culture', zh: '文化' },
            service: { ja: 'サービス', en: 'Service', zh: '服務' },
            medical: { ja: '医療', en: 'Medical', zh: '醫療' },
            education: { ja: '教育', en: 'Education', zh: '教育' },
            finance: { ja: '金融', en: 'Finance', zh: '金融' },
            accommodation: { ja: '宿泊', en: 'Accommodation', zh: '住宿' },
            nature: { ja: '自然', en: 'Nature', zh: '自然' }
        };

        const categories: Record<string, any> = {};

        Object.entries(counts).forEach(([key, count]) => {
            if (typeof count !== 'number' || count <= 0) return;
            if (!labels[key]) return;

            categories[key] = {
                id: key,
                count: count,
                label: labels[key],
                subcategories: {},
                representative_spots: [
                    {
                        name: { ja: `${labels[key].ja}スポット`, en: `${labels[key].en} Spot`, zh: `${labels[key].zh}地點` },
                        osm_id: 'mock-1'
                    },
                    {
                        name: { ja: `人気の${labels[key].ja}`, en: `Popular ${labels[key].en}`, zh: `熱門${labels[key].zh}` },
                        osm_id: 'mock-2'
                    }
                ]
            };
        });

        return {
            categories,
            vibe_tags: [
                { id: 'vibe1', label: { en: 'Bustling', ja: '賑やか', zh: '熱鬧' }, score: 5 },
                { id: 'vibe2', label: { en: 'Convenient', ja: '便利', zh: '便利' }, score: 4 }
            ],
            last_updated: new Date().toISOString()
        };
    })();

    // [Adapter] Transform Backend L2 Status to UI L2 Structure
    const l2Adapter = (() => {
        const source = rawData.l2_status || {};

        return {
            lines: (source.line_status || []).map((l: any, idx: number) => ({
                id: `line-${idx}`,
                name: l.name || { ja: l.line, en: l.line, zh: l.line }, // Support both legacy string and new object
                operator: l.operator || 'Metro',
                color: l.color || '#999999',
                status: l.status || 'normal',
                message: l.message ? { ja: l.message, en: l.message, zh: l.message } : undefined
            })),
            weather: {
                temp: source.weather?.temp || 0,
                condition: source.weather?.condition || 'Clear',
                windSpeed: source.weather?.wind || 0
            },
            crowd: {
                level: source.congestion || 1,
                trend: 'stable',
                userVotes: {
                    total: 0,
                    distribution: [0, 0, 0, 0, 0]
                }
            }
        };
    })();

    const standardData = {
        ...rawData,
        // Ensure name is a proper LocaleString even if rawData is messy
        name: {
            ja: rawData.name?.ja || rawData.title || 'Station',
            en: rawData.name?.en || rawData.title || 'Station',
            zh: rawData.name?.zh || rawData.name?.['zh-TW'] || rawData.title || '車站'
        },
        id: rawData.id || rawData.node_id, // Normalize ID
        l3_facilities: rawData.l3_facilities || [], // Default to array
        l1_dna: l1Adapter,
        l2: l2Adapter
    };

    return (
        <div className="w-full h-full bg-white flex flex-col">

            {/* Tab Navigation (Sticky Header) */}
            <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
                <div className="flex justify-around items-center p-2">
                    {TABS.map((tab) => {
                        const isActive = activeTab === tab.id;
                        const Icon = tab.icon;

                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`relative flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-300 ${isActive ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'
                                    }`}
                            >
                                <div className={`p-2 rounded-xl transition-all ${isActive ? `${tab.color} text-white shadow-md scale-110` : 'bg-transparent'
                                    }`}>
                                    <Icon size={20} className="transition-transform" />
                                </div>
                                <span className={`text-[9px] font-black uppercase tracking-widest ${isActive ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'
                                    }`}>
                                    {tTabs(tab.id === 'l3' ? 'facility' : tab.id === 'l4' ? 'bambi' : tab.id)}
                                </span>

                                {/* Active Indicator Dot */}
                                {isActive && (
                                    <motion.div
                                        layoutId="activeTabDot"
                                        className="absolute -bottom-2 w-1 h-1 rounded-full bg-gray-900"
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
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            <L1_DNA data={standardData} />
                        </motion.div>
                    )}

                    {activeTab === 'live' && (
                        <motion.div
                            key="live"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            <L2_Live data={standardData} />
                        </motion.div>
                    )}

                    {activeTab === 'l3' && (
                        <motion.div
                            key="l3"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            <ErrorBoundary fallback={
                                <div className="p-8 text-center text-gray-400 text-xs bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                    Services temporarily unavailable
                                </div>
                            }>
                                <L3_Facilities data={standardData} />
                            </ErrorBoundary>
                        </motion.div>
                    )}

                    {activeTab === 'l4' && (
                        <motion.div
                            key="l4"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            <ErrorBoundary>
                                <L4_Bambi data={standardData} />
                            </ErrorBoundary>
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>
        </div>
    );
}
