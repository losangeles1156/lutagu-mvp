'use client';

import { useTranslations } from 'next-intl';
import type { OdptRailwayFare } from '@/lib/odpt/types';

interface FareModuleProps {
    fares: OdptRailwayFare[] | null;
    locale: string;
}

function getLocalizedStationName(id: string, locale: string): string {
    const base = String(id || '').split(/[:.]/).pop() || '';
    const stationMap: Record<string, Record<string, string>> = {
        'Tokyo': { 'zh': '東京', 'ja': '東京', 'en': 'Tokyo' },
        'Ueno': { 'zh': '上野', 'ja': '上野', 'en': 'Ueno' },
        'Asakusa': { 'zh': '淺草', 'ja': '浅草', 'en': 'Asakusa' },
        'Akihabara': { 'zh': '秋葉原', 'ja': '秋葉原', 'en': 'Akihabara' },
        'Shinjuku': { 'zh': '新宿', 'ja': '新宿', 'en': 'Shinjuku' },
        'Shibuya': { 'zh': '澀谷', 'ja': '渋谷', 'en': 'Shibuya' },
        'Ginza': { 'zh': '銀座', 'ja': '銀座', 'en': 'Ginza' },
        'Ikebukuro': { 'zh': '池袋', 'ja': '池袋', 'en': 'Ikebukuro' },
    };

    const entry = stationMap[base];
    if (!entry) return base;

    const lang = locale.startsWith('zh') ? 'zh' : locale.startsWith('ja') ? 'ja' : 'en';
    return entry[lang] || entry['en'] || base;
}

export function FareModule({ fares, locale }: FareModuleProps) {
    const t = useTranslations('l4.dashboard');
    const rows = fares || [];
    const tTo = t('fare.to');
    const tIC = t('fare.ic');
    const tTicket = t('fare.ticket');

    return (
        <div className="overflow-hidden rounded-2xl border border-slate-100/60 bg-white/40 backdrop-blur-sm" dir="auto">
            <table className="w-full text-sm text-left rtl:text-right">
                <thead className="bg-slate-50/50 text-slate-500 font-black text-[10px] uppercase tracking-wider">
                    <tr>
                        <th className="p-4">{tTo}</th>
                        <th className="p-4">{tIC}</th>
                        <th className="p-4">{tTicket}</th>
                    </tr>
                </thead>
                <tbody className="text-slate-700 font-bold">
                    {rows.slice(0, 10).map((f) => (
                        <tr key={f['@id']} className="border-b border-slate-100/40 hover:bg-white/40 transition-colors">
                            <td className="p-4 text-xs">{getLocalizedStationName(String(f['odpt:toStation'] || ''), locale)}</td>
                            <td className="p-4 text-indigo-600 font-black">¥{f['odpt:icCardFare']}</td>
                            <td className="p-4 text-slate-500">¥{f['odpt:ticketFare']}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
