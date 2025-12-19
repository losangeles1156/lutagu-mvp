'use client';

import { useState } from 'react';
import { FacilityProfile } from '../ui/FacilityProfile';
import { CategoryCounts } from '@/lib/nodes/facilityProfileCalculator';
import { STATION_WISDOM, StationTrap } from '@/data/stationWisdom';
import { Info, AlertTriangle, Lightbulb, Zap, Smile, MapPin as MapIcon, Star, ArrowRight, Map as MapIcon2 } from 'lucide-react';
import { FacilityCarousel } from '../ui/FacilityCarousel';
import { NodeProfile } from '@/lib/api/nodes';

interface NodeTabsProps {
    nodeData: any;
    profile: NodeProfile | null;
}

export function NodeTabs({ nodeData, profile }: NodeTabsProps) {
    const [activeTab, setActiveTab] = useState<'l1' | 'l2' | 'l3' | 'l4'>('l1');

    return (
        <div className="flex flex-col gap-4">
            {/* Tab Headers */}
            <div className="flex border-b border-gray-100">
                <button
                    onClick={() => setActiveTab('l1')}
                    className={`flex-1 py-2 text-xs font-black transition-colors border-b-2 ${activeTab === 'l1'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-gray-400 hover:text-gray-600'
                        }`}
                >
                    DNA (L1)
                </button>
                <button
                    onClick={() => setActiveTab('l2')}
                    className={`flex-1 py-2 text-xs font-black transition-colors border-b-2 ${activeTab === 'l2'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-gray-400 hover:text-gray-600'
                        }`}
                >
                    LIVE (L2)
                </button>
                <button
                    onClick={() => setActiveTab('l3')}
                    className={`flex-1 py-2 text-xs font-black transition-colors border-b-2 ${activeTab === 'l3'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-gray-400 hover:text-gray-600'
                        }`}
                >
                    FACILITY (L3)
                </button>
                <button
                    onClick={() => setActiveTab('l4')}
                    className={`flex-1 py-2 text-xs font-black transition-colors border-b-2 ${activeTab === 'l4'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-gray-400 hover:text-gray-600'
                        }`}
                >
                    BAMBI (L4)
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
                                        <h3 className="font-black text-sm uppercase tracking-widest text-gray-900">地點基因 (Location DNA)</h3>
                                    </div>
                                    <FacilityProfile
                                        counts={profile.category_counts}
                                        vibeTags={profile.vibe_tags}
                                    />
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
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">人流預測</h4>
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full animate-pulse ${(profile?.l2_status?.congestion || 1) >= 4 ? 'bg-orange-500' : 'bg-green-500'}`} />
                                    <span className="text-sm font-bold text-gray-900">
                                        {(profile?.l2_status?.congestion || 1) >= 4 ? '較為擁擠 (Busy)' : '舒適 (Comfortable)'}
                                    </span>
                                </div>
                            </div>
                            <div className="p-4 bg-white rounded-2xl border border-black/[0.03] shadow-sm">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">預計候車</h4>
                                <div className="text-sm font-bold text-gray-900 flex items-baseline gap-1">
                                    <span>{profile?.l2_status?.congestion ? (profile.l2_status.congestion * 2) : 3}</span>
                                    <span className="text-[10px] text-gray-400">min</span>
                                </div>
                            </div>
                        </div>

                        {profile?.l2_status?.line_status?.map((ls: any, i: number) => (
                            <div key={i} className={`p-4 rounded-2xl border flex items-center gap-3 ${ls.status !== 'normal' ? 'bg-rose-50 border-rose-100' : 'bg-green-50 border-green-100'}`}>
                                <div className={`p-2 bg-white rounded-xl shadow-sm ${ls.status !== 'normal' ? 'text-rose-500' : 'text-green-500'}`}>
                                    <Zap size={18} fill="currentColor" />
                                </div>
                                <div>
                                    <h4 className={`text-xs font-black uppercase ${ls.status !== 'normal' ? 'text-rose-900' : 'text-green-900'}`}>{ls.line}</h4>
                                    <p className={`text-xs font-medium ${ls.status !== 'normal' ? 'text-rose-700' : 'text-green-700'}`}>{ls.message || '正常運行'}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'l3' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {profile?.l3_facilities ? profile.l3_facilities.map((fac: any) => (
                            <div key={fac.id} className="p-4 bg-white rounded-2xl border border-black/[0.03] shadow-sm flex justify-between items-center group">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                                        {fac.category === 'toilet' ? '🚻' : fac.category === 'locker' ? '🧳' : '⚡'}
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-900">{fac.subCategory === 'station_toilet' ? '車站廁所' : fac.subCategory === 'coin_locker' ? '置物櫃' : fac.category}</h4>
                                        <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                                            <MapIcon size={10} />
                                            <span>{fac.location}</span>
                                        </div>
                                    </div>
                                </div>
                                <ArrowRight size={16} className="text-gray-300 group-hover:text-indigo-600 transition-colors" />
                            </div>
                        )) : (
                            <div className="p-8 text-center text-gray-400 italic text-xs">此區域暫無 L3 設施資訊</div>
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
                                        <h4 className="font-black text-white/70 text-[10px] uppercase tracking-[0.2em] mb-1">Bambi's Strategy</h4>
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
