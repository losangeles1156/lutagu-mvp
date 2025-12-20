'use client';

import { X, MapPin, Clock, ExternalLink, Accessibility } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface FacilityItem {
    id: string;
    category: string;
    subCategory: string;
    location: string;
    attributes?: Record<string, any>;
}

interface FacilityDetailModalProps {
    facility: FacilityItem | null;
    onClose: () => void;
}

const CATEGORY_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
    toilet: { icon: '🚻', label: '廁所', color: 'bg-blue-500' },
    locker: { icon: '🧳', label: '置物櫃', color: 'bg-orange-500' },
    elevator: { icon: '🛗', label: '電梯', color: 'bg-green-500' },
    accessibility: { icon: '♿', label: '無障礙', color: 'bg-indigo-500' },
    wifi: { icon: '📶', label: 'WiFi', color: 'bg-purple-500' },
    charging: { icon: '⚡', label: '充電站', color: 'bg-yellow-500' },
    accommodation: { icon: '🏨', label: '住宿', color: 'bg-pink-500' },
    dining: { icon: '🍽️', label: '餐飲', color: 'bg-red-500' },
    shopping: { icon: '🛍️', label: '購物', color: 'bg-emerald-500' },
    leisure: { icon: '🎭', label: '休閒', color: 'bg-cyan-500' },
    religion: { icon: '⛩️', label: '宗教', color: 'bg-amber-500' },
    transport: { icon: '🚃', label: '交通', color: 'bg-slate-500' },
};

export function FacilityDetailModal({ facility, onClose }: FacilityDetailModalProps) {
    const tL3 = useTranslations('l3');

    if (!facility) return null;

    const config = CATEGORY_CONFIG[facility.category] || { icon: '📍', label: facility.category, color: 'bg-gray-500' };
    const attrs = facility.attributes || {};

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom duration-300">
                <div className="bg-white rounded-t-[32px] shadow-2xl max-h-[70vh] overflow-auto">
                    {/* Header */}
                    <div className={`${config.color} p-6 rounded-t-[32px] relative overflow-hidden`}>
                        <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                        >
                            <X size={20} className="text-white" />
                        </button>
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-3xl">
                                {config.icon}
                            </div>
                            <div className="text-white">
                                <h3 className="font-black text-xl">{config.label}</h3>
                                <p className="text-white/80 text-sm font-medium">
                                    {facility.subCategory === 'station_toilet' ? tL3('stationToilet') :
                                        facility.subCategory === 'coin_locker' ? tL3('coinLocker') :
                                            facility.subCategory === 'elevator' ? tL3('elevator') : facility.subCategory}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-5">
                        {/* Location */}
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-gray-100 rounded-xl text-gray-600">
                                <MapPin size={20} />
                            </div>
                            <div>
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">位置</h4>
                                <p className="text-sm font-bold text-gray-900">{facility.location}</p>
                            </div>
                        </div>

                        {/* Attributes */}
                        {Object.keys(attrs).length > 0 && (
                            <div className="space-y-3">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">設施屬性</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    {attrs.wheelchair_accessible && (
                                        <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl">
                                            <span className="text-lg">♿</span>
                                            <span className="text-xs font-bold text-blue-700">{tL3('wheelchairFriendly')}</span>
                                        </div>
                                    )}
                                    {attrs.has_washlet && (
                                        <div className="flex items-center gap-2 p-3 bg-indigo-50 rounded-xl">
                                            <span className="text-lg">🚿</span>
                                            <span className="text-xs font-bold text-indigo-700">溫水洗淨</span>
                                        </div>
                                    )}
                                    {attrs.sizes && (
                                        <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-xl">
                                            <span className="text-lg">📦</span>
                                            <span className="text-xs font-bold text-orange-700">尺寸: {attrs.sizes.join(', ')}</span>
                                        </div>
                                    )}
                                    {attrs.count && (
                                        <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl">
                                            <span className="text-lg">🔢</span>
                                            <span className="text-xs font-bold text-emerald-700">數量: {attrs.count} 個</span>
                                        </div>
                                    )}
                                    {attrs.hours && (
                                        <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl col-span-2">
                                            <Clock size={18} className="text-amber-600" />
                                            <span className="text-xs font-bold text-amber-700">營業時間: {attrs.hours}</span>
                                        </div>
                                    )}
                                    {attrs.name && (
                                        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl col-span-2">
                                            <span className="text-lg">🏷️</span>
                                            <span className="text-xs font-bold text-gray-700">{attrs.name}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Note */}
                        {attrs.note && (
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                <p className="text-sm text-gray-600 italic">💡 {attrs.note}</p>
                            </div>
                        )}

                        {/* AI Chat Prompt */}
                        <button className="w-full p-4 bg-indigo-600 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100">
                            🦌 詢問 Bambi 關於此設施
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
