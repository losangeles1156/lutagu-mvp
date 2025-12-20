'use client';

import { useState, useEffect } from 'react';
import { FacilityProfile } from '../ui/FacilityProfile';
import { CategoryCounts } from '@/lib/nodes/facilityProfileCalculator';
import { STATION_WISDOM, StationTrap } from '@/data/stationWisdom';
import { FacilityCarousel } from '../ui/FacilityCarousel';
import { NodeProfile } from '@/lib/api/nodes';
import { FacilityFingerprint } from './FacilityFingerprint';
import { VibeTags } from './VibeTags';
import { useLocale, useTranslations } from 'next-intl';
import {
    AlertOctagon, Zap, Smile, MapPin as MapIcon, Star, ArrowRight,
    Map as MapIcon2, AlertTriangle, Clock, Users, Navigation, Info,
    Lightbulb, CloudRain, Sun, Cloud, Thermometer, Wind
} from 'lucide-react';

// Weather Alert Section Component (P1-2)
function WeatherAlertSection() {
    const [alerts, setAlerts] = useState<any[]>([]);

    useEffect(() => {
        const fetchAlerts = async () => {
            try {
                const res = await fetch('/api/weather');
                if (res.ok) {
                    const data = await res.json();
                    if (data.alerts) setAlerts(data.alerts);
                }
            } catch (error) { }
        };
        fetchAlerts();
    }, []);

    if (alerts.length === 0) return null;

    const mainAlert = alerts[0];
    const isCritical = mainAlert.severity === 'critical';

    return (
        <div className={`mt-1 mb-4 p-3 rounded-2xl border flex items-start gap-3 animate-in fade-in zoom-in duration-500 ${isCritical ? 'bg-rose-50 border-rose-100' : 'bg-amber-50 border-amber-100'}`}>
            <div className={`p-2 rounded-xl shadow-sm ${isCritical ? 'bg-white text-rose-500 animate-pulse' : 'bg-white text-amber-500'}`}>
                {isCritical ? <AlertOctagon size={16} /> : <AlertTriangle size={16} />}
            </div>
            <div className="flex-1 overflow-hidden">
                <h4 className={`text-[10px] font-black uppercase tracking-tight truncate ${isCritical ? 'text-rose-900' : 'text-amber-900'}`}>
                    【天候警告】{mainAlert.title}
                </h4>
                <p className={`text-[10px] font-medium leading-tight mt-0.5 line-clamp-2 ${isCritical ? 'text-rose-700' : 'text-amber-700'}`}>
                    {mainAlert.summary}
                </p>
            </div>
        </div>
    );
}

interface NodeTabsProps {
    nodeData: any;
    profile: NodeProfile | null;
}

export function NodeTabs({ nodeData, profile }: NodeTabsProps) {
    const [activeTab, setActiveTab] = useState<'l1' | 'l2' | 'l3' | 'l4'>('l1');
    const locale = useLocale();
    const tTabs = useTranslations('tabs');
    const tL2 = useTranslations('l2');
    const tL3 = useTranslations('l3');
    const tL4 = useTranslations('l4');
    const tNode = useTranslations('node');

    return (
        <div className="flex flex-col gap-4">
            {/* Tab Headers - Premium Glassmorphism */}
            <div className="flex p-1 bg-gray-100/50 backdrop-blur-sm rounded-xl border border-gray-200/50 relative overflow-hidden">
                <button
                    onClick={() => setActiveTab('l1')}
                    className={`flex-1 py-2.5 text-[10px] font-black tracking-widest transition-all rounded-lg relative z-10 ${activeTab === 'l1'
                        ? 'bg-white text-indigo-600 shadow-sm scale-100'
                        : 'text-gray-400 hover:text-gray-600 hover:bg-white/50 scale-[0.98]'
                        }`}
                >
                    {tTabs('dna')}
                </button>
                <button
                    onClick={() => setActiveTab('l2')}
                    className={`flex-1 py-2.5 text-[10px] font-black tracking-widest transition-all rounded-lg relative z-10 ${activeTab === 'l2'
                        ? 'bg-white text-indigo-600 shadow-sm scale-100'
                        : 'text-gray-400 hover:text-gray-600 hover:bg-white/50 scale-[0.98]'
                        }`}
                >
                    {tTabs('live')}
                </button>
                <button
                    onClick={() => setActiveTab('l3')}
                    className={`flex-1 py-2.5 text-[10px] font-black tracking-widest transition-all rounded-lg relative z-10 ${activeTab === 'l3'
                        ? 'bg-white text-indigo-600 shadow-sm scale-100'
                        : 'text-gray-400 hover:text-gray-600 hover:bg-white/50 scale-[0.98]'
                        }`}
                >
                    {tTabs('facility')}
                </button>
                <button
                    onClick={() => setActiveTab('l4')}
                    className={`flex-1 py-2.5 text-[10px] font-black tracking-widest transition-all rounded-lg relative z-10 ${activeTab === 'l4'
                        ? 'bg-white text-indigo-600 shadow-sm scale-100'
                        : 'text-gray-400 hover:text-gray-600 hover:bg-white/50 scale-[0.98]'
                        }`}
                >
                    {tTabs('bambi')}
                </button>
            </div>

            {/* Tab Content */}
            <div className="min-h-[150px]">
                {activeTab === 'l1' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
                        {profile ? (
                            <div className="space-y-6">
                                {/* 1. Personality Profile & Vibe Tags */}
                                <div className="animate-in fade-in slide-in-from-bottom duration-500">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="p-1.5 bg-indigo-600 rounded-lg text-white">
                                            <Star size={16} fill="currentColor" />
                                        </div>
                                        <h3 className="font-black text-sm uppercase tracking-widest text-gray-900">{tNode('locationDna')}</h3>
                                    </div>
                                    <VibeTags tags={profile.vibe_tags} />
                                    <FacilityFingerprint counts={profile.category_counts} locale={locale} />
                                </div>

                                {/* 2. Emotional Context Description */}
                                <div className="p-5 bg-white rounded-[32px] border border-black/[0.03] shadow-sm italic text-gray-500 text-sm leading-relaxed font-medium relative group">
                                    <div className="absolute -left-1 top-4 w-1 h-8 bg-indigo-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                                    {nodeData?.name?.['zh-TW'] === '上野' || nodeData?.name?.['en']?.includes('Ueno') ? (
                                        <>「上野站不僅僅是交通樞紐，它承載著下町的溫情與藝術的重量。從阿美橫町的叫賣聲到美術館的靜謐，這種矛盾的共和正是它的魅力所在。」</>
                                    ) : nodeData?.name?.['zh-TW'] === '淺草' || nodeData?.name?.['en']?.includes('Asakusa') ? (
                                        <>「穿越雷門的喧囂，淺草的靈魂其實藏在巷弄裡。清晨的仲見世通與夜晚的隅田川步道，展現了這座古老街區截然不同的兩張面孔。」</>
                                    ) : nodeData?.name?.['zh-TW'] === '秋葉原' || nodeData?.name?.['en']?.includes('Akihabara') ? (
                                        <>「電壓與心跳同步加速的城市。這裡是御宅族的聖地，也是科技的發源地。在女僕的歡迎聲與電子零件的氣味中，感受最純粹的熱愛。」</>
                                    ) : nodeData?.name?.['zh-TW'] === '東京' || nodeData?.name?.['en']?.includes('Tokyo') ? (
                                        <>「日本的玄關，歷史與現代的交會點。紅磚站舍訴說著百年的故事，而丸之內的高樓則描繪著未來的藍圖。這裡是旅程的起點，也是歸途。」</>
                                    ) : nodeData?.name?.['zh-TW'] === '銀座' || nodeData?.name?.['en']?.includes('Ginza') ? (
                                        <>「優雅的大人街道。週末的步行者天國讓奢華變得親近，歌舞伎座則守護著傳統的靈魂。在這裡，迷路也是一種高級的享受。」</>
                                    ) : (nodeData?.name?.['zh-TW'] === '藏前' || nodeData?.name?.['en']?.includes('Kuramae')) ? (
                                        <>「東京的布魯克林。倉庫改建的職人咖啡與隅田川的波光粼粼，交織出最愜意的午後。適合帶著筆記本，書寫旅行的每個靈感瞬間。」</>
                                    ) : (nodeData?.name?.['zh-TW'] === '御徒町' || nodeData?.name?.['en']?.includes('Okachimachi')) ? (
                                        <>「喧囂中的尋寶樂趣。從珠寶批發到高架下的平民美食，這裡是阿美橫町活力的延伸。吉池超市的新鮮海產，更是在地人的廚房秘密。」</>
                                    ) : (nodeData?.name?.['zh-TW'] === '鶯谷' || nodeData?.name?.['en']?.includes('Uguisudani')) ? (
                                        <>「昭和時代的時光膠囊。北口的霓虹與南口的靜謐形成強烈對比。在萩之湯洗去疲憊，感受東京最真實、不加修飾的生活體溫。」</>
                                    ) : (nodeData?.name?.['zh-TW'] === '淺草橋' || nodeData?.name?.['en']?.includes('Asakusabashi')) ? (
                                        <>「手作與人形的批發城。這裡沒有過度的包裝，只有最齊全的材料與職人的熱情。在高架下的老派居酒屋，聽聽東京上班族的真實心聲。」</>
                                    ) : (nodeData?.name?.['zh-TW'] === '田原町' || nodeData?.name?.['en']?.includes('Tawaramachi')) ? (
                                        <>「料理人的後勤基地。合羽橋道具街的入口，空氣中飄散著對於烹飪的執著。這裡是尋找一把『命中注定』廚刀的最佳起點。」</>
                                    ) : (nodeData?.name?.['zh-TW'] === '入谷' || nodeData?.name?.['en']?.includes('Iriya')) ? (
                                        <>「牽牛花與鬼子母神的守護地。遠離觀光客的喧囂，這裡是下町生活的真實切片。在巷弄間尋找百年鰻魚飯的香氣，體驗歲月靜好。」</>
                                    ) : (nodeData?.name?.['zh-TW'] === '東銀座' || nodeData?.name?.['en']?.includes('Higashi-ginza')) ? (
                                        <>「歌舞伎的華麗後台。空氣中飄散著三明治的香氣與傳統藝能的雅韻。比銀座更親民，比築地更優雅，是大人的秘密基地。」</>
                                    ) : (nodeData?.name?.['zh-TW'] === '日本橋' || nodeData?.name?.['en']?.includes('Nihombashi')) ? (
                                        <>「日本公路的原點。麒麟之翼守護著這座城市的歷史與未來。在百年百貨與現代金融大樓之間，感受東京跳動的心臟。」</>
                                    ) : (nodeData?.name?.['zh-TW'] === '人形町' || nodeData?.name?.['en']?.includes('Ningyocho')) ? (
                                        <>「江戶情懷的活化石。甘酒橫丁的甜香與安產祈願的鐘聲，交織出最溫暖的下町風景。在老舖壽喜燒的熱氣中，品味時光。」</>
                                    ) : (nodeData?.name?.['zh-TW'] === '東日本橋' || nodeData?.name?.['en']?.includes('Higashi-nihombashi')) ? (
                                        <>「問屋街的迷宮入口。衣服與雜貨的批發能量在此匯聚。三條地鐵線交織出的三角地帶，是旅人通往東京各處的秘密轉運站。」</>
                                    ) : (nodeData?.name?.['zh-TW'] === '京橋' || nodeData?.name?.['en']?.includes('Kyobashi')) ? (
                                        <>「東京隱藏的藝術心臟。在高級辦公大樓的縫隙間，藏著無數的畫廊與骨董店。這裡是靜謐的藝術散步道，適合細細品味。」</>
                                    ) : (nodeData?.name?.['zh-TW'] === '三越前' || nodeData?.name?.['en']?.includes('Mitsukoshimae')) ? (
                                        <>「江戶商人的豪情與現代的雅緻。從百年百貨的獅像到 Coredo 的精緻小店，這裡是感受日本傳統商業美學的最佳舞台。」</>
                                    ) : (nodeData?.name?.['zh-TW'] === '稻荷町' || nodeData?.name?.['en']?.includes('Inaricho')) ? (
                                        <>「祈願與蒸氣的街道。神靈棲息在百年神社與佛壇店中，而凡人的疲憊則在熱氣蒸騰的錢湯裡獲得救贖。這是離觀光區最近的寧靜綠洲。」</>
                                    ) : (nodeData?.name?.['zh-TW'] === '三之輪' || nodeData?.name?.['en']?.includes('Minowa')) ? (
                                        <>「懷舊的終點站。當路面電車的叮噹聲響起，有頂棚的商店街正販售著昭和時代的生活素描。這裡是時間流動變慢的地方。」</>
                                    ) : (nodeData?.name?.['zh-TW'] === '新御徒町' || nodeData?.name?.['en']?.includes('Shin-Okachimachi')) ? (
                                        <>「隱藏的交匯點。在日本第二古老的商店街地底下，潛藏著巨大的交通與職人能量。表面寧靜如水，地下在此奔流。」</>
                                    ) : (nodeData?.name?.['zh-TW'] === '神田' || nodeData?.name?.['en']?.includes('Kanda')) ? (
                                        <>「嗅覺與知識的雙重饗宴。空氣中總是飄散著咖哩的香辛與舊書的紙香。這裡是上班族的午餐戰場，也是愛書人的精神故鄉。」</>
                                    ) : (nodeData?.name?.['zh-TW'] === '湯島' || nodeData?.name?.['en']?.includes('Yushima')) ? (
                                        <>「學問之神的庇護地。男坂的陡峭象徵求學的艱辛，而女坂則有梅花的溫柔相伴。在甜酒的香氣中，感受代代學子的祈願與希望。」</>
                                    ) : (nodeData?.name?.['zh-TW'] === '築地' || nodeData?.name?.['en']?.includes('Tsukiji')) ? (
                                        <>「東京的美食靈魂。雖然場內市場已遷，但場外的活力依舊。在清晨的喧囂與玉子燒的香氣中，感受這座城市最鮮活的生命力。」</>
                                    ) : (nodeData?.name?.['zh-TW'] === '御茶之水' || nodeData?.name?.['en']?.includes('Ochanomizu')) ? (
                                        <>「樂器與學術的交響樂章。在神田川的潺潺流水聲中，學生們揹著吉他穿梭於古書店與醫院之間。這裡是青春與智慧的交匯處。」</>
                                    ) : (nodeData?.name?.['zh-TW'] === '霞關' || nodeData?.name?.['en']?.includes('Kasumigaseki')) ? (
                                        <>「國家運行的靜謐引擎。在莊嚴的官廳建築群中，日比谷公園的綠意提供了珍貴的喘息空間。這裡是決定這個國家未來的核心。」</>
                                    ) : (nodeData?.name?.['zh-TW'] === '飯田橋' || nodeData?.name?.['en']?.includes('Iidabashi')) ? (
                                        <>「運河與坡道的交匯點。神樂坂的石板路通往迷人的小巴黎，而外濠公園的櫻花則映照著水面。在這裡，東京展現了最浪漫的一面。」</>
                                    ) : (nodeData?.name?.['zh-TW'] === '大手町' || nodeData?.name?.['en']?.includes('Otemachi')) ? (
                                        <>「菁英們的地下迷宮。連接著無數企業總部與皇居的寧靜。在地底深處的繁忙步伐中，推動著世界經濟的脈動。」</>
                                    ) : (nodeData?.name?.['zh-TW'] === '茅場町' || nodeData?.name?.['en']?.includes('Kayabacho')) ? (
                                        <>「商業的靜默守護者。作為證券街的後盾，這裡有著務實而堅毅的氣息。在隅田川露台的微風中，暫時忘卻數字的跳動。」</>

                                    ) : (
                                        <>「這裡不只是交通點，更是觀察東京生活縮影的最佳視窗。不論是尋找隱藏美食還是感受文化氣息，Bambi 都能為您導航那些難以言喻的城市魅力。」</>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="p-8 bg-gray-50 text-gray-400 rounded-[32px] text-sm text-center font-medium border-2 border-dashed border-gray-100 italic">
                                正在分析 L1 基因數據...
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'l2' && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-4 bg-white rounded-2xl border border-black/[0.03] shadow-sm">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{tL2('density')}</h4>
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-bold text-gray-900">
                                            {(profile?.l2_status?.congestion || 1) >= 4 ? tL2('crowdedLevel') : (profile?.l2_status?.congestion || 1) >= 2 ? tL2('normalLevel') : tL2('comfortLevel')}
                                        </span>
                                        <span className="text-[10px] font-black text-indigo-500">{(profile?.l2_status?.congestion || 1) * 20}%</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full transition-all duration-1000 ${(profile?.l2_status?.congestion || 1) >= 4 ? 'bg-rose-500' : (profile?.l2_status?.congestion || 1) >= 2 ? 'bg-amber-400' : 'bg-green-500'}`}
                                            style={{ width: `${(profile?.l2_status?.congestion || 1) * 20}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 bg-white rounded-2xl border border-black/[0.03] shadow-sm">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{tL2('wait')}</h4>
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                                        <Zap size={16} fill="currentColor" />
                                    </div>
                                    <div className="text-sm font-bold text-gray-900 flex items-baseline gap-1">
                                        <span>{profile?.l2_status?.congestion ? (profile.l2_status.congestion * 2) : 3}</span>
                                        <span className="text-[10px] text-gray-400">{tL2('min')}</span>
                                    </div>
                                </div>
                            </div>
                            {/* Weather Alert Integration (P1-2) */}
                            <WeatherAlertSection />
                        </div>

                        {/* Line Status Section */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="p-1.5 bg-rose-100 rounded-lg text-rose-600">
                                    <Zap size={14} fill="currentColor" />
                                </div>
                                <h3 className="font-black text-[10px] uppercase tracking-widest text-gray-900">{tL2('service')}</h3>
                            </div>

                            {!profile?.l2_status?.line_status || profile.l2_status.line_status.length === 0 ? (
                                <div className="p-4 bg-green-50 border border-green-100 rounded-2xl flex items-center gap-3">
                                    <div className="p-2 bg-white rounded-xl shadow-sm text-green-500">
                                        <Smile size={18} />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-black uppercase text-green-900">{tL2('allLinesNormal')}</h4>
                                        <p className="text-xs font-medium text-green-700">{tL2('runningNormal')}</p>
                                    </div>
                                </div>
                            ) : (
                                profile.l2_status.line_status.map((ls: any, i: number) => (
                                    <div key={i} className={`p-4 rounded-2xl border flex items-center gap-3 animate-in fade-in slide-in-from-left duration-300`}
                                        style={{ animationDelay: `${i * 100}ms`, backgroundColor: ls.status !== 'normal' ? '#FFF1F2' : '#F0FDF4', borderColor: ls.status !== 'normal' ? '#FFE4E6' : '#DCFCE7' }}>
                                        <div className={`p-2 bg-white rounded-xl shadow-sm ${ls.status !== 'normal' ? 'text-rose-500 animate-pulse' : 'text-green-500'}`}>
                                            <Zap size={18} fill="currentColor" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center">
                                                <h4 className={`text-xs font-black uppercase ${ls.status !== 'normal' ? 'text-rose-900' : 'text-green-900'}`}>{ls.line}</h4>
                                                {ls.status !== 'normal' && <span className="text-[8px] font-black bg-rose-500 text-white px-1.5 py-0.5 rounded-full uppercase">Delay</span>}
                                            </div>
                                            <p className={`text-[11px] font-medium leading-tight mt-0.5 ${ls.status !== 'normal' ? 'text-rose-700' : 'text-green-700'}`}>
                                                {ls.message || (ls.status === 'normal' ? '正常運行' : '發生延誤')}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'l3' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {profile?.l3_facilities ? profile.l3_facilities.map((fac: any, i: number) => (
                            <div key={fac.id} className="p-4 bg-white rounded-2xl border border-black/[0.03] shadow-sm flex flex-col gap-3 group animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: `${i * 50}ms` }}>
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-xl shadow-inner group-hover:scale-110 transition-transform">
                                            {fac.category === 'toilet' ? '🚻' :
                                                fac.category === 'locker' ? '🧳' :
                                                    fac.category === 'charging' ? '⚡' :
                                                        fac.category === 'accessibility' ? '♿' :
                                                            fac.category === 'elevator' ? '🛗' : '📍'}
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-black text-gray-900">
                                                {fac.subCategory === 'station_toilet' ? tL3('stationToilet') :
                                                    fac.subCategory === 'coin_locker' ? tL3('coinLocker') :
                                                        fac.subCategory === 'elevator' ? tL3('elevator') :
                                                            fac.category}
                                            </h4>
                                            <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                                                <MapIcon size={10} />
                                                <span>{fac.location}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <ArrowRight size={14} className="text-gray-300 group-hover:text-indigo-600 transition-colors" />
                                </div>

                                {/* Attributes / Barrier-free Details */}
                                {fac.attributes && Object.keys(fac.attributes).length > 0 && (
                                    <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-50">
                                        {fac.attributes.wheelchair_accessible && (
                                            <span className="text-[9px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100 flex items-center gap-1">
                                                <span className="text-[10px]">♿</span> {tL3('wheelchairFriendly')}
                                            </span>
                                        )}
                                        {fac.attributes.has_washlet && (
                                            <span className="text-[9px] font-black bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full border border-indigo-100">WASHLET</span>
                                        )}
                                        {fac.attributes.sizes && fac.attributes.sizes.includes('L') && (
                                            <span className="text-[9px] font-black bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full border border-orange-100">{tL3('largeLuggage')}</span>
                                        )}
                                        {fac.attributes.note && (
                                            <span className="text-[9px] font-bold text-gray-500 bg-gray-50 px-2 py-0.5 rounded-md italic">
                                                &quot;{fac.attributes.note}&quot;
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        )) : (
                            <div className="p-8 text-center text-gray-400 italic text-xs">{tNode('noL3Facilities')}</div>
                        )}
                    </div>
                )}

                {activeTab === 'l4' && (
                    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {/* Action Nudges */}
                        {profile?.l4_nudges?.map((nudge: any, idx: number) => (
                            <div key={idx} className="p-6 bg-indigo-600 text-white rounded-3xl shadow-xl shadow-indigo-100 relative overflow-hidden group">
                                <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
                                <div className="flex items-start gap-4 relative z-10">
                                    <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl shadow-inner">
                                        🦌
                                    </div>
                                    <div>
                                        <h4 className="font-black text-white/70 text-[10px] uppercase tracking-[0.2em] mb-1">Bambi&apos;s Strategy</h4>
                                        <h3 className="font-black text-lg mb-1">{nudge.title}</h3>
                                        <p className="text-sm font-bold leading-relaxed opacity-90">{nudge.content}</p>
                                        <div className="mt-4 bg-white/20 p-3 rounded-xl border border-white/20 text-xs font-black">
                                            建議：{nudge.advice}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Wisdom Traps from L1 legacy but still valuable */}
                        {STATION_WISDOM[nodeData?.sameAs || '']?.traps.map((trap: StationTrap, idx: number) => (
                            <div key={`trap-${idx}`} className={`group relative overflow-hidden p-5 rounded-2xl border-l-8 shadow-sm transition-all hover:shadow-md ${trap.severity === 'critical' ? 'bg-red-50 border-red-500 text-red-900' :
                                trap.severity === 'high' ? 'bg-orange-50 border-orange-500 text-orange-900' :
                                    'bg-amber-50 border-amber-500 text-amber-900'
                                }`}>
                                <div className="flex items-center gap-2 mb-3">
                                    <div className={`p-1.5 rounded-lg bg-white/80 shadow-sm`}>
                                        <AlertTriangle size={18} className={trap.severity === 'critical' ? 'text-red-600' : 'text-orange-600'} />
                                    </div>
                                    <span className="font-black text-[10px] uppercase tracking-wider">心理建設警示</span>
                                </div>
                                <h4 className="font-bold text-base mb-1">{trap.title}</h4>
                                <p className="text-xs mb-3 opacity-80 leading-relaxed font-medium">{trap.content}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div >
    );
}
