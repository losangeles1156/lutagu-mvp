'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { MapPin, Search, X, ChevronRight, Check } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

interface LocationSelectorProps {
    value: { city: string; district: string } | null;
    onChange: (value: { city: string; district: string } | null) => void;
    placeholder?: string;
    className?: string;
    showDistrict?: boolean;
}

// Taiwan cities and districts data
const TAIWAN_CITIES = [
    { 
        code: 'taipei', 
        name: '台北市', 
        enName: 'Taipei',
        hot: true,
        districts: ['中山區', '大同區', '松山區', '大安區', '萬華區', '信義區', '士林區', '北投區', '內湖區', '南港區', '中正區', '文山區']
    },
    { 
        code: 'newtaipei', 
        name: '新北市', 
        enName: 'New Taipei',
        hot: true,
        districts: ['板橋區', '中和區', '永和區', '土城區', '樹林區', '三峽區', '鶯歌區', '三重區', '新莊區', '泰山區', '林口區', '淡水區', '汐止區', '瑞芳區', '五股區', '八里區', '新店區', '深坑區', '石碇區', '坪林區', '三芝區', '金山區', '萬里區', '烏來區']
    },
    { 
        code: 'keelung', 
        name: '基隆市', 
        enName: 'Keelung',
        hot: false,
        districts: ['仁愛區', '信義區', '中正區', '中山區', '安樂區', '暖暖區', '七堵區']
    },
    { 
        code: 'taoyuan', 
        name: '桃園市', 
        enName: 'Taoyuan',
        hot: false,
        districts: ['桃園區', '中壢區', '平鎮區', '龍潭區', '楊梅區', '新屋區', '觀音區', '龜山區', '蘆竹區', '大溪區', '大園區', '復興區']
    },
    { 
        code: 'hsinchu', 
        name: '新竹市', 
        enName: 'Hsinchu',
        hot: true,
        districts: ['東區', '北區', '香山區']
    },
    { 
        code: 'hsinchu-county', 
        name: '新竹縣', 
        enName: 'Hsinchu County',
        hot: false,
        districts: ['竹北市', '竹東鎮', '新埔鎮', '關西鎮', '峨眉鄉', '五峰鄉', '橫山鄉', '北埔鄉', '寶山鄉', '尖石鄉', '芎林鄉', '湖口鄉']
    },
    { 
        code: 'miaoli', 
        name: '苗栗縣', 
        enName: 'Miaoli',
        hot: false,
        districts: ['苗栗市', '頭份市', '竹南鎮', '後龍鎮', '通霄鎮', '苑裡鎮', '卓蘭鎮', '大湖鄉', '公館鄉', '銅鑼鄉', '三義鄉', '西湖鄉', '造橋鄉', '三灣鄉', '南庄鄉', '獅潭鄉']
    },
    { 
        code: 'taichung', 
        name: '台中市', 
        enName: 'Taichung',
        hot: true,
        districts: ['中區', '東區', '南區', '西區', '北區', '北屯區', '西屯區', '南屯區', '太平區', '大里區', '霧峰區', '烏日區', '豐原區', '后里區', '東勢區', '石岡區', '新社區', '潭子區', '大雅區', '神岡區', '大肚區', '沙鹿區', '龍井區', '梧棲區', '清水區', '大甲區', '外埔區', '大安區']
    },
    { 
        code: 'changhua', 
        name: '彰化縣', 
        enName: 'Changhua',
        hot: false,
        districts: ['彰化市', '員林市', '鹿港鎮', '和美鎮', '北斗鎮', '溪湖鎮', '田中鎮', '二林鎮', '線西鄉', '伸港鄉', '福興鄉', '秀水鄉', '花壇鄉', '芬園鄉', '大村鄉', '埔鹽鄉', '永靖鄉', '社頭鄉', '二水鄉', '田尾鄉', '埤頭鄉', '芳苑鄉', '大城鄉', '竹塘鄉']
    },
    { 
        code: 'nantou', 
        name: '南投縣', 
        enName: 'Nantou',
        hot: false,
        districts: ['南投市', '埔里鎮', '草屯鎮', '竹山鎮', '集集鎮', '名間鄉', '鹿谷鄉', '中寮鄉', '魚池鄉', '國姓鄉', '水里鄉', '信義鄉', '仁愛鄉']
    },
    { 
        code: 'yunlin', 
        name: '雲林縣', 
        enName: 'Yunlin',
        hot: false,
        districts: ['斗六市', '斗南鎮', '虎尾鎮', '西螺鎮', '土庫鎮', '北港鎮', '林內鄉', '古坑鄉', '大埤鄉', '莿桐鄉', '二崙鄉', '崙背鄉', '麥寮鄉', '東勢鄉', '褒忠鄉', '台西鄉', '元長鄉', '四湖鄉', '口湖鄉', '水林鄉']
    },
    { 
        code: 'chiayi', 
        name: '嘉義市', 
        enName: 'Chiayi',
        hot: false,
        districts: ['東區', '西區']
    },
    { 
        code: 'chiayi-county', 
        name: '嘉義縣', 
        enName: 'Chiayi County',
        hot: false,
        districts: ['太保市', '朴子市', '布袋鎮', '大林鎮', '民雄鄉', '溪口鄉', '新港鄉', '六腳鄉', '東石鄉', '義竹鄉', '鹿草鄉', '水上鄉', '中埔鄉', '竹崎鄉', '梅山鄉', '番路鄉', '大埔鄉', '阿里山鄉']
    },
    { 
        code: 'tainan', 
        name: '台南市', 
        enName: 'Tainan',
        hot: true,
        districts: ['中西區', '東區', '南區', '北區', '安平區', '安南區', '永康區', '歸仁區', '新化區', '左鎮區', '玉井區', '楠西區', '南化區', '仁德區', '關廟區', '龍崎區', '官田區', '麻豆區', '佳里區', '西港區', '七股區', '將軍區', '學甲區', '北門區', '新營區', '後壁區', '白河區', '東山區', '六甲區', '下營區', '柳營區', '鹽水區', '善化區', '大內區', '山上區', '新市區', '安定區']
    },
    { 
        code: 'kaohsiung', 
        name: '高雄市', 
        enName: 'Kaohsiung',
        hot: true,
        districts: ['新興區', '前金區', '苓雅區', '鹽埕區', '鼓山區', '旗津區', '前鎮區', '三民區', '左營區', '楠梓區', '小港區', '鳳山區', '林園區', '大寮區', '大樹區', '大社區', '仁武區', '鳥松區', '岡山區', '橋頭區', '梓官區', '彌陀區', '永安區', '燕巢區', '田寮區', '阿蓮區', '路竹區', '湖內區', '茄萣區', '鼓山區', '左營區']
    },
    { 
        code: 'pingtung', 
        name: '屏東縣', 
        enName: 'Pingtung',
        hot: false,
        districts: ['屏東市', '潮州鎮', '東港鎮', '恆春鎮', '萬丹鄉', '長治鄉', '麟洛鄉', '九如鄉', '里港鄉', '鹽埔鄉', '高樹鄉', '萬巒鄉', '內埔鄉', '竹田鄉', '新埤鄉', '枋寮鄉', '新園鄉', '崁頂鄉', '林邊鄉', '南州鄉', '佳冬鄉', '琉球鄉', '車城鄉', '滿州鄉', '枋山鄉', '霧台鄉', '瑪家鄉', '泰武鄉', '來義鄉', '春日鄉', '獅子鄉', '牡丹鄉']
    },
    { 
        code: 'yilan', 
        name: '宜蘭縣', 
        enName: 'Yilan',
        hot: false,
        districts: ['宜蘭市', '羅東鎮', '蘇澳鎮', '頭城鎮', '礁溪鄉', '壯圍鄉', '員山鄉', '大同鄉', '五結鄉', '三星鄉', '冬山鄉', '南澳鄉']
    },
    { 
        code: 'hualien', 
        name: '花蓮縣', 
        enName: 'Hualien',
        hot: false,
        districts: ['花蓮市', '鳳林鎮', '玉里鎮', '新城鄉', '吉安鄉', '壽豐鄉', '秀林鄉', '新城鄉', '光復鄉', '豐濱鄉', '瑞穗鄉', '萬榮鄉', '卓溪鄉']
    },
    { 
        code: 'taitung', 
        name: '台東縣', 
        enName: 'Taitung',
        hot: false,
        districts: ['台東市', '成功鎮', '關山鎮', '卑南鄉', '鹿野鄉', '延平鄉', '海端鄉', '池上鄉', '東河鄉', '長濱鄉', '太麻里鄉', '金峰鄉', '大武鄉', '達仁鄉', '綠島鄉', '蘭嶼鄉']
    },
    { 
        code: 'penghu', 
        name: '澎湖縣', 
        enName: 'Penghu',
        hot: false,
        districts: ['馬公市', '湖西鄉', '白沙鄉', '西嶼鄉', '望安鄉', '七美鄉']
    },
    { 
        code: 'kinmen', 
        name: '金門縣', 
        enName: 'Kinmen',
        hot: false,
        districts: ['金城鎮', '金湖鎮', '金沙鎮', '金寧鄉', '烈嶼鄉', '烏坵鄉']
    },
    { 
        code: 'lienchiang', 
        name: '連江縣', 
        enName: 'Lienchiang (Matsu)',
        hot: false,
        districts: ['南竿鄉', '北竿鄉', '莒光鄉', '東引鄉']
    },
] as const;

export function LocationSelector({
    value,
    onChange,
    placeholder = '選擇縣市',
    className = '',
    showDistrict = false
}: LocationSelectorProps) {
    const locale = useLocale();
    const t = useTranslations('locationSelector');
    
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCityIndex, setSelectedCityIndex] = useState<number | null>(null);
    
    const containerRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSelectedCityIndex(null);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filter cities based on search
    const filteredCities = useMemo(() => {
        if (!searchQuery) return TAIWAN_CITIES;
        
        const query = searchQuery.toLowerCase();
        return TAIWAN_CITIES.filter(city => 
            city.name.includes(searchQuery) ||
            city.enName.toLowerCase().includes(query) ||
            city.code.includes(query)
        );
    }, [searchQuery]);

    // Get current city data
    const currentCityData = useMemo(() => {
        if (!value?.city) return null;
        return TAIWAN_CITIES.find(c => c.name === value.city || c.code === value.city);
    }, [value]);

    const handleCitySelect = (index: number) => {
        const city = TAIWAN_CITIES[index];
        
        if (showDistrict) {
            setSelectedCityIndex(index);
        } else {
            onChange({ city: city.name, district: '' });
            setIsOpen(false);
            setSelectedCityIndex(null);
            setSearchQuery('');
        }
    };

    const handleDistrictSelect = (district: string) => {
        if (selectedCityIndex === null) return;
        const city = TAIWAN_CITIES[selectedCityIndex];
        onChange({ city: city.name, district });
        setIsOpen(false);
        setSelectedCityIndex(null);
        setSearchQuery('');
    };

    const handleClear = () => {
        onChange(null);
        setSelectedCityIndex(null);
        setSearchQuery('');
        setIsOpen(false);
    };

    const formatDisplay = () => {
        if (!value) return placeholder;
        if (value.district) {
            return `${value.city} ${value.district}`;
        }
        return value.city;
    };

    // Get hot cities
    const hotCities = TAIWAN_CITIES.filter(c => c.hot);

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    w-full flex items-center gap-3 px-4 py-4
                    bg-slate-50 border-0 rounded-xl
                    text-left transition-all
                    hover:bg-slate-100 focus:bg-white focus:ring-2 focus:ring-indigo-500
                    min-h-[52px]
                `}
            >
                <MapPin size={20} className="text-slate-400 shrink-0" />
                <span className={`text-sm font-bold ${value ? 'text-slate-900' : 'text-slate-400'}`}>
                    {formatDisplay()}
                </span>
            </button>

            {/* Selector Panel */}
            {isOpen && (
                <div 
                    ref={panelRef}
                    className="absolute top-full left-0 right-0 mt-2 
                        bg-white rounded-2xl shadow-xl border border-slate-100 
                        z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
                    style={{ maxHeight: '70vh' }}
                >
                    {/* Search Input */}
                    <div className="p-4 border-b border-slate-100">
                        <div className="relative">
                            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={t('searchPlaceholder')}
                                className="w-full pl-12 pr-10 py-3 
                                    bg-slate-50 border-0 rounded-xl
                                    text-sm font-bold placeholder:text-slate-400
                                    focus:ring-2 focus:ring-indigo-500 focus:bg-white
                                    min-h-[48px]"
                                autoFocus
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 
                                        p-1 hover:bg-slate-200 rounded-full transition-colors"
                                >
                                    <X size={16} className="text-slate-400" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Two Column Layout */}
                    <div className="flex" style={{ height: '400px' }}>
                        {/* City List */}
                        <div className="flex-1 overflow-y-auto border-r border-slate-100">
                            {/* Hot Cities */}
                            {!searchQuery && selectedCityIndex === null && (
                                <div className="p-4 border-b border-slate-100">
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                                        🔥 {t('hot')}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {hotCities.map((city, idx) => {
                                            const originalIndex = TAIWAN_CITIES.indexOf(city);
                                            return (
                                                <button
                                                    key={city.code}
                                                    onClick={() => handleCitySelect(originalIndex)}
                                                    className="px-3 py-2 
                                                        bg-indigo-50 text-indigo-600 
                                                        text-sm font-bold rounded-lg
                                                        hover:bg-indigo-100 transition-colors
                                                        min-h-[40px]"
                                                >
                                                    {city.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* All Cities */}
                            <div className="p-2">
                                {filteredCities.map((city, idx) => {
                                    const originalIndex = TAIWAN_CITIES.indexOf(city);
                                    const isSelected = selectedCityIndex === originalIndex;
                                    
                                    return (
                                        <button
                                            key={city.code}
                                            onClick={() => handleCitySelect(originalIndex)}
                                            className={`
                                                w-full flex items-center justify-between px-4 py-3
                                                text-left transition-colors rounded-xl
                                                min-h-[48px]
                                                ${isSelected 
                                                    ? 'bg-indigo-50 text-indigo-600' 
                                                    : 'hover:bg-slate-50 text-slate-700'
                                                }
                                            `}
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-lg">{city.hot ? '🔥' : '📍'}</span>
                                                <span className="text-sm font-bold">{city.name}</span>
                                                <span className="text-xs text-slate-400">({city.enName})</span>
                                            </div>
                                            <ChevronRight size={16} className={isSelected ? '' : 'opacity-0 group-hover:opacity-100'} />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* District List */}
                        {selectedCityIndex !== null && (
                            <div className="flex-1 overflow-y-auto bg-slate-50">
                                <div className="p-4 border-b border-slate-200 bg-white sticky top-0">
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                        📍 {TAIWAN_CITIES[selectedCityIndex].name}
                                    </div>
                                </div>
                                <div className="p-2">
                                    {TAIWAN_CITIES[selectedCityIndex].districts.map((district) => (
                                        <button
                                            key={district}
                                            onClick={() => handleDistrictSelect(district)}
                                            className={`
                                                w-full flex items-center justify-between px-4 py-3
                                                text-left transition-colors rounded-xl
                                                hover:bg-white text-slate-700
                                                min-h-[48px]
                                                ${value?.district === district ? 'bg-indigo-50 text-indigo-600' : ''}
                                            `}
                                        >
                                            <span className="text-sm font-bold">{district}</span>
                                            {value?.district === district && (
                                                <Check size={16} />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {selectedCityIndex === null && (
                        <div className="p-4 border-t border-slate-100 flex justify-between bg-slate-50">
                            <button
                                onClick={handleClear}
                                className="py-2 px-4 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors"
                            >
                                {t('clear')}
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="py-2 px-4 text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
                            >
                                {t('close')}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default LocationSelector;
