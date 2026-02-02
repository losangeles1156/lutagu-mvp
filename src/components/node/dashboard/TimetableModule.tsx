'use client';

import { useTranslations } from 'next-intl';
import type { OdptStationTimetable } from '@/lib/odpt/types';

/** Hub 組成資訊，用於智慧 fallback 顯示 */
export interface HubInfo {
    isHubStation: boolean;
    hasMetro: boolean;
    hasJR: boolean;
    hasPrivate: boolean;
}

interface TimetableModuleProps {
    timetables: OdptStationTimetable[] | null;
    stationId: string;
    locale: string;
    selectedDirection?: string | null;
    hubInfo?: HubInfo;
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

// JR official timetable URL mapping for Tokyo stations
// Coverage: Full Yamanote Line (30 stations) + Core 11 Wards JR stations
// Source: JR East official website (https://www.jreast.co.jp/estation/)
const JR_TIMETABLE_URLS: Record<string, string> = {
    // === YAMANOTE LINE (山手線) - Complete 30 stations ===
    'Tokyo': 'https://www.jreast.co.jp/estation/stations/1039.html',
    'Kanda': 'https://www.jreast.co.jp/estation/stations/526.html',
    'Akihabara': 'https://www.jreast.co.jp/estation/stations/47.html',
    'Okachimachi': 'https://www.jreast.co.jp/estation/stations/323.html',
    'Ueno': 'https://www.jreast.co.jp/estation/stations/204.html',
    'Uguisudani': 'https://www.jreast.co.jp/estation/stations/198.html',
    'Nippori': 'https://www.jreast.co.jp/estation/stations/1155.html',
    'NishiNippori': 'https://www.jreast.co.jp/estation/stations/1156.html',
    'Nishi-Nippori': 'https://www.jreast.co.jp/estation/stations/1156.html', // Alias
    'Tabata': 'https://www.jreast.co.jp/estation/stations/959.html',
    'Komagome': 'https://www.jreast.co.jp/estation/stations/716.html',
    'Sugamo': 'https://www.jreast.co.jp/estation/stations/905.html',
    'Otsuka': 'https://www.jreast.co.jp/estation/stations/355.html',
    'Ikebukuro': 'https://www.jreast.co.jp/estation/stations/108.html',
    'Mejiro': 'https://www.jreast.co.jp/estation/stations/1480.html',
    'Takadanobaba': 'https://www.jreast.co.jp/estation/stations/965.html',
    'ShinOkubo': 'https://www.jreast.co.jp/estation/stations/854.html',
    'Shin-Okubo': 'https://www.jreast.co.jp/estation/stations/854.html', // Alias
    'Shinjuku': 'https://www.jreast.co.jp/estation/stations/866.html',
    'Yoyogi': 'https://www.jreast.co.jp/estation/stations/1604.html',
    'Harajuku': 'https://www.jreast.co.jp/estation/stations/1271.html',
    'Shibuya': 'https://www.jreast.co.jp/estation/stations/800.html',
    'Ebisu': 'https://www.jreast.co.jp/estation/stations/254.html',
    'Meguro': 'https://www.jreast.co.jp/estation/stations/1472.html',
    'Gotanda': 'https://www.jreast.co.jp/estation/stations/703.html',
    'Osaki': 'https://www.jreast.co.jp/estation/stations/330.html',
    'Shinagawa': 'https://www.jreast.co.jp/estation/stations/788.html',
    'TakanawaGateway': 'https://www.jreast.co.jp/estation/stations/1735.html',
    'Takanawa-Gateway': 'https://www.jreast.co.jp/estation/stations/1735.html', // Alias
    'Tamachi': 'https://www.jreast.co.jp/estation/stations/980.html',
    'Hamamatsucho': 'https://www.jreast.co.jp/estation/stations/1247.html',
    'Shimbashi': 'https://www.jreast.co.jp/estation/stations/871.html',
    'Yurakucho': 'https://www.jreast.co.jp/estation/stations/1616.html',

    // === CHUO LINE (中央線) - Core 11 Wards ===
    'Ochanomizu': 'https://www.jreast.co.jp/estation/stations/341.html',
    'Suidobashi': 'https://www.jreast.co.jp/estation/stations/906.html',
    'Iidabashi': 'https://www.jreast.co.jp/estation/stations/105.html',
    'Ichigaya': 'https://www.jreast.co.jp/estation/stations/103.html',
    'Yotsuya': 'https://www.jreast.co.jp/estation/stations/1601.html',
    'Shinanomachi': 'https://www.jreast.co.jp/estation/stations/803.html',
    'Sendagaya': 'https://www.jreast.co.jp/estation/stations/931.html',

    // === SOBU LINE (総武線) - Core 11 Wards ===
    'Ryogoku': 'https://www.jreast.co.jp/estation/stations/1646.html',
    'Kinshicho': 'https://www.jreast.co.jp/estation/stations/597.html',
    'Kameido': 'https://www.jreast.co.jp/estation/stations/525.html',
    'Asakusabashi': 'https://www.jreast.co.jp/estation/stations/38.html',
    'Akihabarasobu': 'https://www.jreast.co.jp/estation/stations/47.html', // Same as Yamanote

    // === KEIHIN-TOHOKU LINE (京浜東北線) - North Extension ===
    'Oji': 'https://www.jreast.co.jp/estation/stations/348.html',
    'Akabane': 'https://www.jreast.co.jp/estation/stations/20.html',
    'Higashi-Jujo': 'https://www.jreast.co.jp/estation/stations/1310.html',
    'Jujo': 'https://www.jreast.co.jp/estation/stations/842.html',
    'Kami-Nakazato': 'https://www.jreast.co.jp/estation/stations/515.html',

    // === KEIYO LINE (京葉線) - Koto Ward ===
    'Shin-Kiba': 'https://www.jreast.co.jp/estation/stations/844.html',
    'ShinKiba': 'https://www.jreast.co.jp/estation/stations/844.html', // Alias
    'Kasairinkaikoen': 'https://www.jreast.co.jp/estation/stations/512.html',
    'Maihama': 'https://www.jreast.co.jp/estation/stations/1415.html', // Disney

    // === TOKAIDO/YOKOSUKA LINE (東海道線/横須賀線) ===
    'Kawasaki': 'https://www.jreast.co.jp/estation/stations/538.html',

    // === OTHER CORE STATIONS ===
    'NishiOgikubo': 'https://www.jreast.co.jp/estation/stations/1152.html',
    'Ogikubo': 'https://www.jreast.co.jp/estation/stations/335.html',
    'Nakano': 'https://www.jreast.co.jp/estation/stations/1077.html',
};

// Check if station is JR and get official timetable URL
function getJROfficialTimetableUrl(stationId: string): string | null {
    if (!stationId.includes('JR-East') && !stationId.includes('JR.East')) {
        return null;
    }
    const baseName = String(stationId || '').split(/[:.]/).pop() || '';
    return JR_TIMETABLE_URLS[baseName] || null;
}

function isJRStation(stationId: string): boolean {
    return stationId.includes('JR-East') || stationId.includes('JR.East');
}

export function TimetableModule({ timetables, stationId, locale, selectedDirection, hubInfo }: TimetableModuleProps) {
    const t = useTranslations('l4.dashboard');
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const jstNow = new Date(utc + (3600000 * 9));
    const nowHHMM = `${String(jstNow.getHours()).padStart(2, '0')}:${String(jstNow.getMinutes()).padStart(2, '0')}`;
    const items = timetables || [];

    if (!items.length) {
        const jrUrl = getJROfficialTimetableUrl(stationId);
        const isJR = isJRStation(stationId);
        const stationName = getLocalizedStationName(stationId, locale);

        // 智慧判斷 Hub 組成
        const isHub = hubInfo?.isHubStation ?? false;
        const hubHasMetro = hubInfo?.hasMetro ?? false;
        const hubHasJR = hubInfo?.hasJR ?? isJR;

        // 根據 Hub 組成決定 fallback 訊息
        let message: string;
        let subMessage: string;

        if (isHub && hubHasMetro && !hubHasJR) {
            // Hub 有 Metro 但無 JR，數據應該可用但可能是 API 問題
            message = locale.startsWith('ja')
                ? 'ODPT API から時刻表を取得できませんでした'
                : locale.startsWith('en')
                    ? 'Could not retrieve timetable from ODPT API'
                    : '無法從 ODPT API 取得時刻表';
            subMessage = locale.startsWith('ja')
                ? 'API接続に問題がある可能性があります。しばらくしてからお試しください。'
                : locale.startsWith('en')
                    ? 'There may be an API connection issue. Please try again later.'
                    : '可能是 API 連線問題，請稍後再試。';
        } else if (!isHub && isJR) {
            // 單一 JR 站點（非 Hub）
            message = locale.startsWith('ja')
                ? 'JR線の時刻表はODPT APIでは提供されていません'
                : locale.startsWith('en')
                    ? 'JR timetables are not available via ODPT API'
                    : 'JR 時刻表不在 ODPT API 提供範圍';
            subMessage = locale.startsWith('ja')
                ? 'JR東日本の公式サイトをご確認ください。'
                : locale.startsWith('en')
                    ? 'Please check the official JR East website.'
                    : '請前往 JR 東日本官方網站查看。';
        } else if (isHub && hubHasMetro && hubHasJR) {
            // Hub 有 Metro 也有 JR，但數據為空
            message = locale.startsWith('ja')
                ? '時刻表を取得できませんでした'
                : locale.startsWith('en')
                    ? 'Unable to retrieve timetable'
                    : '無法取得時刻表';
            subMessage = locale.startsWith('ja')
                ? 'JR線はODPT非対応。地下鉄はAPI接続に問題がある可能性があります。'
                : locale.startsWith('en')
                    ? 'JR lines are not in ODPT. Metro may have API issues.'
                    : 'JR 線不在 ODPT，Metro 可能有 API 問題。';
        } else {
            // 預設 fallback
            message = t('timetable.noData', { defaultValue: '時刻表が見つかりません' });
            subMessage = locale.startsWith('ja')
                ? '駅の掲示板または公式サイトをご確認ください。'
                : locale.startsWith('en')
                    ? 'Please check the station display or official website.'
                    : '請確認車站告示牌或官方網站。';
        }

        return (
            <div className="flex flex-col items-center justify-center p-8 bg-white/40 backdrop-blur-md rounded-[2.5rem] border border-white/60 text-center">
                <div className="w-16 h-16 bg-white/80 rounded-full flex items-center justify-center text-3xl shadow-sm mb-4">
                    {hubHasMetro && !hubHasJR ? '⚠️' : isJR || hubHasJR ? '🚃' : '🕰️'}
                </div>

                <p className="text-sm font-black text-slate-600">{message}</p>
                <p className="text-xs text-slate-400 mt-2 max-w-[220px] leading-relaxed">{subMessage}</p>

                <div className="flex flex-wrap gap-2 mt-4 justify-center">
                    {/* JR 官網連結 */}
                    {(isJR || hubHasJR) && jrUrl && (
                        <a
                            href={jrUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-green-500 text-white text-xs font-bold rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
                        >
                            <span>🚃</span>
                            <span>JR {stationName}</span>
                        </a>
                    )}
                    {/* 通用搜尋連結 */}
                    <a
                        href={`https://www.google.com/search?q=${stationName}+station+timetable+東京`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 text-xs font-bold rounded-full hover:bg-slate-200 transition-all duration-200"
                    >
                        <span>🔍</span>
                        <span>{locale.startsWith('ja') ? 'Webで検索' : locale.startsWith('en') ? 'Search Web' : '網路搜尋'}</span>
                    </a>
                </div>
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
                                const objs = (table['odpt:stationTimetableObject'] || []).map(o => {
                                    const destRaw = o['odpt:destinationStation'];
                                    const destId = Array.isArray(destRaw) ? destRaw[0] : destRaw;
                                    return {
                                        time: String(o['odpt:departureTime'] || ''),
                                        dest: getLocalizedStationName(String(destId || ''), locale)
                                    };
                                });
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
