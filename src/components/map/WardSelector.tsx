
import React, { useState, useEffect } from 'react';
import { useWardStore } from '@/lib/stores/wardStore';
import { ChevronDown, MapPin, X } from 'lucide-react';

interface WardSelectorProps {
    currentWardId: string | null;
    onSelectWard: (wardId: string) => void;
    lang?: 'ja' | 'en' | 'zh-TW';
}

export function WardSelector({ currentWardId, onSelectWard, lang = 'ja' }: WardSelectorProps) {
    const { wards, fetchWards } = useWardStore();
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        // Ensure wards are loaded
        if (wards.length === 0) {
            fetchWards();
        }
    }, [fetchWards, wards.length]);

    // Helper to get localized name
    const getLocName = (w: any) => {
        if (lang === 'zh-TW') return w.name.zh;
        if (lang === 'en') return w.name.en;
        return w.name.ja;
    };

    const selectedWard = wards.find(w => w.id === currentWardId);
    const label = selectedWard ? getLocName(selectedWard) : (lang === 'en' ? 'Select Area' : '選擇區域');

    return (
        <div className="absolute top-20 left-4 z-[1000] font-sans">
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 bg-white/90 backdrop-blur-md px-4 py-3 rounded-xl shadow-lg border border-white/50 hover:bg-white transition-all active:scale-95 text-gray-800 font-medium min-w-[140px] justify-between group"
            >
                <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-full ${selectedWard ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                        <MapPin size={16} />
                    </div>
                    <span>{label}</span>
                </div>
                <ChevronDown size={16} className={`text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <div className="absolute top-14 left-0 w-[280px] bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 origin-top-left">
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                            {lang === 'en' ? 'Tokyo Wards' : '東京行政區'}
                        </span>
                        <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
                            <X size={14} className="text-gray-400" />
                        </button>
                    </div>

                    {/* Ward Grid */}
                    <div className="p-2 grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                        {wards.map(w => (
                            <button
                                key={w.id}
                                onClick={() => {
                                    onSelectWard(w.id);
                                    setIsOpen(false);
                                }}
                                className={`
                                    relative flex flex-col items-start p-3 rounded-xl text-left transition-all duration-200
                                    ${currentWardId === w.id
                                        ? 'bg-blue-500 text-white shadow-md shadow-blue-200'
                                        : 'hover:bg-gray-100 text-gray-700 hover:shadow-sm bg-white border border-gray-50'
                                    }
                                `}
                            >
                                <span className="text-sm font-bold leading-tight">{getLocName(w)}</span>
                                <span className={`text-[10px] mt-0.5 opacity-80 ${currentWardId === w.id ? 'text-blue-100' : 'text-gray-400'}`}>
                                    {w.code || 'Tokyo'}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
