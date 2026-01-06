
import React, { useState, useEffect } from 'react';
import { useWardStore } from '@/lib/stores/wardStore';
import { ChevronDown, MapPin, X, Check, CheckCheck, XCircle } from 'lucide-react';

interface WardSelectorProps {
    currentWardIds: string[];
    onSelectWard: (wardId: string, isFirstSelection: boolean) => void;
    onSelectAll?: () => void;
    onClearAll?: () => void;
    lang?: 'ja' | 'en' | 'zh-TW';
}

export function WardSelector({
    currentWardIds,
    onSelectWard,
    onSelectAll,
    onClearAll,
    lang = 'ja'
}: WardSelectorProps) {
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

    // Generate label based on selection count
    const getLabel = () => {
        const count = currentWardIds.length;
        if (count === 0) {
            return lang === 'en' ? 'Select Area' : '選擇區域';
        }
        if (count === 1) {
            const ward = wards.find(w => w.id === currentWardIds[0]);
            return ward ? getLocName(ward) : '1 區域';
        }
        if (count === wards.length) {
            return lang === 'en' ? 'All Areas' : '全部區域';
        }
        return lang === 'en' ? `${count} Areas` : `${count} 個區域`;
    };

    const handleWardClick = (wardId: string) => {
        const isFirstSelection = currentWardIds.length === 0;
        onSelectWard(wardId, isFirstSelection);
    };

    return (
        <div className="absolute top-20 left-4 z-[1000] font-sans">
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 bg-white/90 backdrop-blur-md px-4 py-3 rounded-xl shadow-lg border border-white/50 hover:bg-white transition-all active:scale-95 text-gray-800 font-medium min-w-[140px] justify-between group"
            >
                <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-full ${currentWardIds.length > 0 ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                        <MapPin size={16} />
                    </div>
                    <span>{getLabel()}</span>
                    {currentWardIds.length > 1 && (
                        <span className="ml-1 px-1.5 py-0.5 bg-blue-500 text-white text-[10px] font-bold rounded-full">
                            {currentWardIds.length}
                        </span>
                    )}
                </div>
                <ChevronDown size={16} className={`text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <div className="absolute top-14 left-0 w-[300px] bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 origin-top-left">
                    {/* Header with Actions */}
                    <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                            {lang === 'en' ? 'Tokyo Wards' : '東京行政區'}
                        </span>
                        <div className="flex items-center gap-1">
                            {/* Select All Button */}
                            {onSelectAll && (
                                <button
                                    onClick={() => { onSelectAll(); }}
                                    className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors text-blue-600 flex items-center gap-1"
                                    title={lang === 'en' ? 'Select All' : '全選'}
                                >
                                    <CheckCheck size={14} />
                                    <span className="text-[10px] font-medium">{lang === 'en' ? 'All' : '全選'}</span>
                                </button>
                            )}
                            {/* Clear Button */}
                            {onClearAll && currentWardIds.length > 0 && (
                                <button
                                    onClick={() => { onClearAll(); }}
                                    className="p-1.5 hover:bg-red-100 rounded-lg transition-colors text-red-500 flex items-center gap-1"
                                    title={lang === 'en' ? 'Clear' : '清除'}
                                >
                                    <XCircle size={14} />
                                    <span className="text-[10px] font-medium">{lang === 'en' ? 'Clear' : '清除'}</span>
                                </button>
                            )}
                            <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-gray-200 rounded-full transition-colors ml-1">
                                <X size={14} className="text-gray-400" />
                            </button>
                        </div>
                    </div>

                    {/* Ward Grid */}
                    <div className="p-2 grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                        {wards.map(w => {
                            const isSelected = currentWardIds.includes(w.id);
                            return (
                                <button
                                    key={w.id}
                                    onClick={() => handleWardClick(w.id)}
                                    className={`
                                        relative flex items-start gap-2 p-3 rounded-xl text-left transition-all duration-200
                                        ${isSelected
                                            ? 'bg-blue-500 text-white shadow-md shadow-blue-200'
                                            : 'hover:bg-gray-100 text-gray-700 hover:shadow-sm bg-white border border-gray-50'
                                        }
                                    `}
                                >
                                    {/* Checkbox indicator */}
                                    <div className={`
                                        w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5
                                        ${isSelected
                                            ? 'bg-white border-white'
                                            : 'border-gray-300'
                                        }
                                    `}>
                                        {isSelected && <Check size={12} className="text-blue-500" />}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold leading-tight">{getLocName(w)}</span>
                                        <span className={`text-[10px] mt-0.5 opacity-80 ${isSelected ? 'text-blue-100' : 'text-gray-400'}`}>
                                            {w.code || 'Tokyo'}
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
