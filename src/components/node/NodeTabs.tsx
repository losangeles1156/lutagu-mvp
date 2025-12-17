'use client';

import { useState } from 'react';
import { FacilityProfile } from '../ui/FacilityProfile';
import { CategoryCounts } from '@/lib/nodes/facilityProfileCalculator';
import { STATION_WISDOM, StationTrap } from '@/data/stationWisdom';

interface NodeTabsProps {
    nodeData: any;
    profile: {
        category_counts: CategoryCounts;
        vibe_tags: string[];
    } | null;
}

export function NodeTabs({ nodeData, profile }: NodeTabsProps) {
    const [activeTab, setActiveTab] = useState<'overview' | 'live' | 'ai'>('overview');

    return (
        <div className="flex flex-col gap-4">
            {/* Tab Headers */}
            <div className="flex border-b border-gray-100">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`flex-1 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'overview'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-gray-400 hover:text-gray-600'
                        }`}
                >
                    概覽 (L1)
                </button>
                <button
                    onClick={() => setActiveTab('live')}
                    className={`flex-1 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'live'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-gray-400 hover:text-gray-600'
                        }`}
                >
                    即時 (L2)
                </button>
                <button
                    onClick={() => setActiveTab('ai')}
                    className={`flex-1 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'ai'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-gray-400 hover:text-gray-600'
                        }`}
                >
                    AI 觀點 (L3)
                </button>
            </div>

            {/* Tab Content */}
            <div className="min-h-[150px]">
                {activeTab === 'overview' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {profile ? (
                            <FacilityProfile counts={profile.category_counts} vibeTags={profile.vibe_tags} />
                        ) : (
                            <div className="p-4 bg-gray-50 text-gray-500 rounded-lg text-sm text-center">
                                正在分析生活機能數據...
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'live' && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {/* Mock Live Status */}
                        <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                            <h4 className="text-xs font-bold text-green-800 uppercase mb-1">人流狀況</h4>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                <span className="text-sm text-green-700">目前舒適 (Comfortable)</span>
                            </div>
                        </div>

                        <div className="p-3 bg-orange-50 rounded-lg border border-orange-100">
                            <h4 className="text-xs font-bold text-orange-800 uppercase mb-1">交通警示</h4>
                            <div className="text-sm text-orange-700">
                                ⚠️ 銀座線：車輛檢查導致延遲 (5 min)
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'ai' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {/* 1. Experiential Wisdom Cards (Traps) - Priority Display */}
                        {STATION_WISDOM[nodeData.sameAs] && STATION_WISDOM[nodeData.sameAs].traps.map((trap: StationTrap, idx: number) => (
                            <div key={`trap-${idx}`} className={`p-4 rounded-xl border border-l-4 shadow-sm ${trap.severity === 'critical' ? 'bg-red-50 border-red-500 text-red-900' :
                                trap.severity === 'high' ? 'bg-orange-50 border-orange-500 text-orange-900' :
                                    'bg-blue-50 border-blue-500 text-blue-900'
                                }`}>
                                <h4 className="font-bold flex items-center gap-2 mb-2">
                                    <span>⚠️</span> {trap.title}
                                </h4>
                                <p className="text-sm mb-3 opacity-90">{trap.content}</p>
                                <div className="bg-white/60 p-3 rounded-lg text-sm font-medium">
                                    {trap.advice}
                                </div>
                            </div>
                        ))}

                        {/* 2. Insider Hacks (Tips) - Secondary Display */}
                        {STATION_WISDOM[nodeData.sameAs] && STATION_WISDOM[nodeData.sameAs].hacks?.map((hack: string, idx: number) => (
                            <div key={`hack-${idx}`} className="p-4 rounded-xl border border-l-4 border-emerald-500 bg-emerald-50 text-emerald-900 shadow-sm">
                                <h4 className="font-bold flex items-center gap-2 mb-2">
                                    <span>💡</span> 在地人密技 (Insider Hack)
                                </h4>
                                <div className="text-sm prose prose-sm prose-emerald">
                                    <span dangerouslySetInnerHTML={{ __html: hack.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                                </div>
                            </div>
                        ))}

                        {/* 3. Standard AI Message */}
                        <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 bg-indigo-200 rounded-full flex items-center justify-center flex-shrink-0">
                                    🤖
                                </div>
                                <div>
                                    <h4 className="font-bold text-indigo-900 text-sm mb-1">Bambi 的在地觀點</h4>
                                    <p className="text-sm text-indigo-800 leading-relaxed">
                                        {nodeData?.name?.['en']?.includes('Ueno')
                                            ? "這裡不只是公園！試試從「不忍口」出來，那裡的阿美橫町有全東京最便宜的零食和海鮮丼。"
                                            : "這是一個充滿活力的區域，非常適合午後散步。建議避開通勤尖峰時段。"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
