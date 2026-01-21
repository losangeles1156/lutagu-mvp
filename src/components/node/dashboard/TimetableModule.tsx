'use client';

import { useTranslations } from 'next-intl';
import type { OdptStationTimetable } from '@/lib/odpt/types';

interface TimetableModuleProps {
    timetables: OdptStationTimetable[] | null;
    stationId: string;
    locale: string;
    selectedDirection?: string | null;
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

export function TimetableModule({ timetables, stationId, locale, selectedDirection }: TimetableModuleProps) {
    const t = useTranslations('l4.dashboard');
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const jstNow = new Date(utc + (3600000 * 9));
    const nowHHMM = `${String(jstNow.getHours()).padStart(2, '0')}:${String(jstNow.getMinutes()).padStart(2, '0')}`;
    const items = timetables || [];

    if (!items.length) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-white/40 backdrop-blur-md rounded-[2.5rem] border border-white/60 text-center">
                <div className="w-16 h-16 bg-white/80 rounded-full flex items-center justify-center text-3xl shadow-sm mb-4">🕰️</div>
                <p className="text-sm font-black text-slate-600">
                    {t('timetable.noData')}
                </p>
                <p className="text-xs text-slate-400 mt-1">{t('timetable.noDataSub')}</p>
            </div>
        );
    }

    const directions = Array.from(new Set(items.map(t => t['odpt:railDirection']).filter(Boolean)));
    const filteredDirections = selectedDirection ? directions.filter(d => d === selectedDirection) : directions;
    const tTo = t('timetable.to');

    return (
        <div className="space-y-4" dir="auto">
            {filteredDirections.map((dir) => {
                const tables = items.filter(t => t['odpt:railDirection'] === dir);
                const dirName = getLocalizedStationName(String(dir), locale);
                return (
                    <div key={dir} className="bg-white/60 backdrop-blur-xl rounded-[2rem] border border-white/60 shadow-xl shadow-slate-200/10 overflow-hidden group">
                        <div className="bg-slate-50/50 px-5 py-3 border-b border-slate-100/50 flex items-center justify-between">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                {tTo}{dirName}
                            </span>
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        </div>
                        <div className="p-5">
                            {tables.map(table => {
                                const objs = (table['odpt:stationTimetableObject'] || []).map(o => ({
                                    time: String(o['odpt:departureTime'] || ''),
                                    dest: getLocalizedStationName(String(o['odpt:destinationStation'] || ''), locale)
                                }));
                                const next = objs.filter(o => o.time >= nowHHMM).sort((a, b) => a.time.localeCompare(b.time)).slice(0, 8);
                                const calendarId = String(table['odpt:calendar'] || '').split(':').pop() || '';
                                const calendarLabel = calendarId.includes('Weekday') ? t('timetable.weekday') : t('timetable.weekend');

                                return (
                                    <div key={table['@id']} className="mb-6 last:mb-0">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className={`w-1 h-3 rounded-full ${calendarId.includes('Weekday') ? 'bg-indigo-500' : 'bg-rose-500'}`} />
                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                                {calendarLabel}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-4 gap-2">
                                            {next.map((t, idx) => (
                                                <div key={`${t.time}-${idx}`} className="flex flex-col items-center p-2.5 bg-white/80 rounded-xl border border-slate-100/50 shadow-sm hover:border-indigo-200 transition-colors group/item">
                                                    <span className="text-sm font-black text-slate-800 group-hover/item:text-indigo-600 transition-colors">{t.time}</span>
                                                    {t.dest && <span className="text-[9px] text-slate-400 font-bold truncate w-full text-center mt-0.5">{t.dest}</span>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
