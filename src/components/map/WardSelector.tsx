
import React from 'react';

// Hardcoded list of active wards for MVP
const ACTIVE_WARDS = [
    { id: 'ward:taito', name: { ja: '台東区', en: 'Taito', zh: '台東區' } },
    { id: 'ward:chiyoda', name: { ja: '千代田区', en: 'Chiyoda', zh: '千代田區' } },
    { id: 'ward:chuo', name: { ja: '中央区', en: 'Chuo', zh: '中央區' } },
    { id: 'ward:shinjuku', name: { ja: '新宿区', en: 'Shinjuku', zh: '新宿區' } },
    { id: 'ward:shibuya', name: { ja: '渋谷区', en: 'Shibuya', zh: '渋谷區' } },
    { id: 'ward:minato', name: { ja: '港区', en: 'Minato', zh: '港區' } },
    { id: 'ward:sumida', name: { ja: '墨田区', en: 'Sumida', zh: '墨田區' } },
    { id: 'ward:koto', name: { ja: '江東区', en: 'Koto', zh: '江東區' } },
    { id: 'ward:shinagawa', name: { ja: '品川区', en: 'Shinagawa', zh: '品川區' } },
    { id: 'ward:bunkyo', name: { ja: '文京区', en: 'Bunkyo', zh: '文京區' } },
    { id: 'ward:toshima', name: { ja: '豊島区', en: 'Toshima', zh: '豐島區' } },
    { id: 'ward:arakawa', name: { ja: '荒川区', en: 'Arakawa', zh: '荒川區' } },
];

interface WardSelectorProps {
    currentWardId: string | null;
    onSelectWard: (wardId: string) => void;
    lang?: 'ja' | 'en' | 'zh-TW';
}

export function WardSelector({ currentWardId, onSelectWard, lang = 'ja' }: WardSelectorProps) {
    // Helper to get localized name
    const getLocName = (w: any) => {
        if (lang === 'zh-TW') return w.name.zh;
        if (lang === 'en') return w.name.en;
        return w.name.ja;
    };

    return (
        <div className="absolute top-20 left-4 z-[1000] bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-white/50 p-2 flex flex-col gap-2 max-h-[300px] overflow-y-auto w-32">
            <span className="text-xs font-bold text-gray-400 px-2">WARDS</span>
            {ACTIVE_WARDS.map(w => (
                <button
                    key={w.id}
                    onClick={() => onSelectWard(w.id)}
                    className={`text-left px-3 py-2 rounded-lg text-sm font-medium transition-all ${currentWardId === w.id
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'hover:bg-gray-100 text-gray-700'
                        }`}
                >
                    {getLocName(w)}
                </button>
            ))}
        </div>
    );
}
