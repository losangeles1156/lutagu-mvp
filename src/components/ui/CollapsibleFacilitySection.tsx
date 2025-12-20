'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, MapPin, ExternalLink } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface FacilityItem {
    id: string;
    category: string;
    subCategory: string;
    location: string;
    attributes?: Record<string, any>;
}

interface CollapsibleFacilitySectionProps {
    facilities: FacilityItem[];
    onFacilityClick?: (facility: FacilityItem) => void;
}

// Category configuration with icons and colors
const CATEGORY_CONFIG: Record<string, { icon: string; label: string; color: string; bgColor: string }> = {
    toilet: { icon: '🚻', label: '廁所', color: 'text-blue-600', bgColor: 'bg-blue-50' },
    locker: { icon: '🧳', label: '置物櫃', color: 'text-orange-600', bgColor: 'bg-orange-50' },
    elevator: { icon: '🛗', label: '電梯', color: 'text-green-600', bgColor: 'bg-green-50' },
    accessibility: { icon: '♿', label: '無障礙', color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
    wifi: { icon: '📶', label: 'WiFi', color: 'text-purple-600', bgColor: 'bg-purple-50' },
    charging: { icon: '⚡', label: '充電', color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
    accommodation: { icon: '🏨', label: '住宿', color: 'text-pink-600', bgColor: 'bg-pink-50' },
    dining: { icon: '🍽️', label: '餐飲', color: 'text-red-600', bgColor: 'bg-red-50' },
    shopping: { icon: '🛍️', label: '購物', color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
    leisure: { icon: '🎭', label: '休閒', color: 'text-cyan-600', bgColor: 'bg-cyan-50' },
    religion: { icon: '⛩️', label: '宗教', color: 'text-amber-600', bgColor: 'bg-amber-50' },
    transport: { icon: '🚃', label: '交通', color: 'text-slate-600', bgColor: 'bg-slate-50' },
};

export function CollapsibleFacilitySection({ facilities, onFacilityClick }: CollapsibleFacilitySectionProps) {
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['toilet', 'locker'])); // Default expand common ones
    const tL3 = useTranslations('l3');

    // Group facilities by category
    const grouped = facilities.reduce((acc, fac) => {
        const cat = fac.category;
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(fac);
        return acc;
    }, {} as Record<string, FacilityItem[]>);

    const toggleCategory = (cat: string) => {
        setExpandedCategories(prev => {
            const next = new Set(prev);
            if (next.has(cat)) next.delete(cat);
            else next.add(cat);
            return next;
        });
    };

    const categoryOrder = ['toilet', 'locker', 'elevator', 'accessibility', 'wifi', 'charging', 'accommodation', 'dining', 'shopping', 'leisure', 'religion', 'transport'];
    const sortedCategories = Object.keys(grouped).sort((a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b));

    return (
        <div className="space-y-2">
            {/* Quick Preview Badges */}
            <div className="flex flex-wrap gap-2 mb-4 pb-3 border-b border-gray-100">
                {sortedCategories.map(cat => {
                    const config = CATEGORY_CONFIG[cat] || { icon: '📍', label: cat, color: 'text-gray-600', bgColor: 'bg-gray-50' };
                    const count = grouped[cat].length;
                    return (
                        <button
                            key={cat}
                            onClick={() => toggleCategory(cat)}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-bold transition-all ${expandedCategories.has(cat)
                                    ? `${config.bgColor} ${config.color} ring-2 ring-offset-1 ring-current`
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                }`}
                        >
                            <span>{config.icon}</span>
                            <span>{count}</span>
                        </button>
                    );
                })}
            </div>

            {/* Collapsible Sections */}
            {sortedCategories.map(cat => {
                const config = CATEGORY_CONFIG[cat] || { icon: '📍', label: cat, color: 'text-gray-600', bgColor: 'bg-gray-50' };
                const isExpanded = expandedCategories.has(cat);
                const items = grouped[cat];

                return (
                    <div key={cat} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                        {/* Category Header */}
                        <button
                            onClick={() => toggleCategory(cat)}
                            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 ${config.bgColor} rounded-xl flex items-center justify-center text-lg`}>
                                    {config.icon}
                                </div>
                                <div className="text-left">
                                    <h4 className="font-black text-sm text-gray-900">{config.label}</h4>
                                    <p className="text-[10px] text-gray-400 font-medium">{items.length} 處設施</p>
                                </div>
                            </div>
                            <div className={`p-1.5 rounded-lg ${isExpanded ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400'} transition-colors`}>
                                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </div>
                        </button>

                        {/* Facility Items */}
                        {isExpanded && (
                            <div className="border-t border-gray-100 divide-y divide-gray-50">
                                {items.map((fac, idx) => (
                                    <div
                                        key={fac.id}
                                        onClick={() => onFacilityClick?.(fac)}
                                        className="px-4 py-3 flex items-start justify-between hover:bg-gray-50 cursor-pointer transition-colors animate-in fade-in slide-in-from-top-2 duration-200"
                                        style={{ animationDelay: `${idx * 30}ms` }}
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 text-xs text-gray-700 font-medium">
                                                <MapPin size={12} className="text-gray-400 flex-shrink-0" />
                                                <span className="line-clamp-1">{fac.location}</span>
                                            </div>
                                            {/* Attribute Tags */}
                                            {fac.attributes && Object.keys(fac.attributes).length > 0 && (
                                                <div className="flex flex-wrap gap-1.5 mt-2">
                                                    {fac.attributes.wheelchair_accessible && (
                                                        <span className="text-[9px] font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full">♿ {tL3('wheelchairFriendly')}</span>
                                                    )}
                                                    {fac.attributes.has_washlet && (
                                                        <span className="text-[9px] font-bold bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full">WASHLET</span>
                                                    )}
                                                    {fac.attributes.sizes?.includes('L') && (
                                                        <span className="text-[9px] font-bold bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded-full">{tL3('largeLuggage')}</span>
                                                    )}
                                                    {fac.attributes.count && (
                                                        <span className="text-[9px] font-bold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">{fac.attributes.count}個</span>
                                                    )}
                                                    {fac.attributes.note && (
                                                        <span className="text-[9px] font-medium bg-gray-50 text-gray-500 px-1.5 py-0.5 rounded italic">"{fac.attributes.note}"</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <ExternalLink size={14} className="text-gray-300 flex-shrink-0 ml-2" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
