
export interface LocaleString {
    ja: string;
    en: string;
    zh: string;
}

export interface StationLineDef {
    name: LocaleString;
    operator: 'Metro' | 'Toei' | 'JR' | 'Private' | 'Other';
    color: string;
}

// Line Metadata Registry (Single Source of Truth)
export const LINES = {
    // Metro
    Ginza: { name: { ja: '銀座線', en: 'Ginza Line', zh: '銀座線' }, operator: 'Metro', color: '#FF9500' } as StationLineDef,
    Marunouchi: { name: { ja: '丸ノ内線', en: 'Marunouchi Line', zh: '丸之內線' }, operator: 'Metro', color: '#F62E36' } as StationLineDef,
    Hibiya: { name: { ja: '日比谷線', en: 'Hibiya Line', zh: '日比谷線' }, operator: 'Metro', color: '#B5B5AC' } as StationLineDef,
    Tozai: { name: { ja: '東西線', en: 'Tozai Line', zh: '東西線' }, operator: 'Metro', color: '#00D7CF' } as StationLineDef,
    Chiyoda: { name: { ja: '千代田線', en: 'Chiyoda Line', zh: '千代田線' }, operator: 'Metro', color: '#00BB85' } as StationLineDef,
    Yurakucho: { name: { ja: '有楽町線', en: 'Yurakucho Line', zh: '有樂町線' }, operator: 'Metro', color: '#C1A47B' } as StationLineDef,
    Hanzomon: { name: { ja: '半蔵門線', en: 'Hanzomon Line', zh: '半藏門線' }, operator: 'Metro', color: '#8F76D6' } as StationLineDef,
    Namboku: { name: { ja: '南北線', en: 'Namboku Line', zh: '南北線' }, operator: 'Metro', color: '#00AC9B' } as StationLineDef,
    Fukutoshin: { name: { ja: '副都心線', en: 'Fukutoshin Line', zh: '副都心線' }, operator: 'Metro', color: '#9C5E31' } as StationLineDef,

    // Toei
    Asakusa: { name: { ja: '淺草線', en: 'Asakusa Line', zh: '淺草線' }, operator: 'Toei', color: '#E85298' } as StationLineDef,
    Mita: { name: { ja: '三田線', en: 'Mita Line', zh: '三田線' }, operator: 'Toei', color: '#0070C0' } as StationLineDef,
    Shinjuku: { name: { ja: '新宿線', en: 'Shinjuku Line', zh: '新宿線' }, operator: 'Toei', color: '#6CBB5A' } as StationLineDef,
    Oedo: { name: { ja: '大江戸線', en: 'Oedo Line', zh: '大江戶線' }, operator: 'Toei', color: '#CE045B' } as StationLineDef,

    // JR East
    Yamanote: { name: { ja: '山手線', en: 'Yamanote Line', zh: '山手線' }, operator: 'JR', color: '#9ACD32' } as StationLineDef,
    KeihinTohoku: { name: { ja: '京浜東北線', en: 'Keihin-Tohoku Line', zh: '京濱東北線' }, operator: 'JR', color: '#00BFFF' } as StationLineDef,
    Chuo: { name: { ja: '中央線', en: 'Chuo Line', zh: '中央線' }, operator: 'JR', color: '#FF4500' } as StationLineDef,
    Sobu: { name: { ja: '総武線', en: 'Sobu Line', zh: '總武線' }, operator: 'JR', color: '#FFD700' } as StationLineDef,
    SobuRapid: { name: { ja: '総武快速線', en: 'Sobu Rapid Line', zh: '總武快速線' }, operator: 'JR', color: '#0072BC' } as StationLineDef, // Blue
    ChuoSobu: { name: { ja: '中央・総武線', en: 'Chuo-Sobu Line', zh: '中央・總武線' }, operator: 'JR', color: '#FFD700' } as StationLineDef, // Yellow
    Joban: { name: { ja: '常磐線', en: 'Joban Line', zh: '常磐線' }, operator: 'JR', color: '#00B261' } as StationLineDef,
    Keiyo: { name: { ja: '京葉線', en: 'Keiyo Line', zh: '京葉線' }, operator: 'JR', color: '#C9242F' } as StationLineDef,
    Tokaido: { name: { ja: '東海道線', en: 'Tokaido Line', zh: '東海道線' }, operator: 'JR', color: '#F68B1E' } as StationLineDef,
    Yokosuka: { name: { ja: '横須賀線', en: 'Yokosuka Line', zh: '橫須賀線' }, operator: 'JR', color: '#006599' } as StationLineDef,
    UenoTokyo: { name: { ja: '上野東京ライン', en: 'Ueno-Tokyo Line', zh: '上野東京線' }, operator: 'JR', color: '#800080' } as StationLineDef, // Purple
    Saikyo: { name: { ja: '埼京線', en: 'Saikyo Line', zh: '埼京線' }, operator: 'JR', color: '#00AC9B' } as StationLineDef, // Greenish
    ShonanShinjuku: { name: { ja: '湘南新宿ライン', en: 'Shonan-Shinjuku Line', zh: '湘南新宿線' }, operator: 'JR', color: '#E21F26' } as StationLineDef, // Red

    // Private / Other
    Tsukuba: { name: { ja: 'つくばエクスプレス', en: 'Tsukuba Express', zh: '筑波快線' }, operator: 'Private', color: '#DD1320' } as StationLineDef, // Red
    Yurikamome: { name: { ja: 'ゆりかもめ', en: 'Yurikamome', zh: '百合海鷗號' }, operator: 'Private', color: '#1B94C2' } as StationLineDef, // Cyan
    Monorail: { name: { ja: '東京モノレール', en: 'Tokyo Monorail', zh: '東京單軌電車' }, operator: 'Private', color: '#10529F' } as StationLineDef, // Blue
    Keisei: { name: { ja: '京成線', en: 'Keisei Line', zh: '京成線' }, operator: 'Private', color: '#00539B' } as StationLineDef,
    SeibuIkebukuro: { name: { ja: '西武池袋線', en: 'Seibu Ikebukuro Line', zh: '西武池袋線' }, operator: 'Private', color: '#F58220' } as StationLineDef,
    // Keikyu
    KeikyuMain: { name: { ja: '京急本線', en: 'Keikyu Main Line', zh: '京急本線' }, operator: 'Private', color: '#00C3E3' } as StationLineDef, // Cyan/Blue
    KeikyuAirport: { name: { ja: '京急空港線', en: 'Keikyu Airport Line', zh: '京急機場線' }, operator: 'Private', color: '#00C3E3' } as StationLineDef,

    // Aliases for ODPT API Variations (Normalized keys)
    ChuoSobuLocal: { name: { ja: '中央・総武線(各停)', en: 'Chuo-Sobu Line (Local)', zh: '中央・總武線(各停)' }, operator: 'JR', color: '#FFD700' } as StationLineDef,
    KeihinTohokuNegishi: { name: { ja: '京浜東北・根岸線', en: 'Keihin-Tohoku-Negishi Line', zh: '京濱東北・根岸線' }, operator: 'JR', color: '#00BFFF' } as StationLineDef,
    JobanRapid: { name: { ja: '常磐線(快速)', en: 'Joban Line (Rapid)', zh: '常磐線(快速)' }, operator: 'JR', color: '#00B261' } as StationLineDef,
    JobanLocal: { name: { ja: '常磐線(各停)', en: 'Joban Line (Local)', zh: '常磐線(各停)' }, operator: 'Metro', color: '#00B261' } as StationLineDef, // Usually thru-service
};

// Operator Colors for Map Icons (Official Brand Colors)
export const OPERATOR_COLORS: Record<string, string> = {
    'JR': '#00AC4E',           // JR East - Official Green
    'Metro': '#149BDF',        // Tokyo Metro - Heart Blue 官方企業色
    'Toei': '#70BE1B',         // Toei - Light Green (User Preference)
    'Keikyu': '#8B0000',       // Keikyu - Dark Red (深紅色)
    'Tokyu': '#EE0000',        // Tokyu - Red
    'Odakyu': '#0060B2',       // Odakyu - Blue
    'Keio': '#DD0077',         // Keio - Pink
    'Seibu': '#009944',        // Seibu - Green
    'Keisei': '#00008B',       // Keisei - Dark Blue (深藍色)
    'Tobu': '#1E40AF',         // Tobu - Blue
    'Tsukuba': '#DD1320',      // Tsukuba Express - Red
    'Yurikamome': '#1B94C2',   // Yurikamome - Blue
    'Monorail': '#00BFFF',     // Tokyo Monorail - Deep Sky Blue
    'Private': '#6B7280',      // Others - Gray
};

// Hub Primary Operator Override (when auto-detection isn't accurate)
const HUB_PRIMARY_OPERATOR: Record<string, string> = {
    'odpt:Station:JR-East.Tokyo': 'JR',
    'odpt:Station:JR-East.Ueno': 'JR',
    'odpt:Station:JR-East.Akihabara': 'JR',
    'odpt:Station:TokyoMetro.Otemachi': 'Metro',
    'odpt:Station:TokyoMetro.Ginza': 'Metro',
    'odpt:Station:TokyoMetro.Asakusa': 'Metro',
    'odpt:Station:JR-East.Hamamatsucho': 'JR',
    'odpt:Station:JR-East.Okachimachi': 'JR',
    'odpt:Station:TokyoMetro.Shimbashi': 'JR', // Primarily JR hub
    'odpt:Station:TokyoMetro.Hibiya': 'Metro',
    'odpt:Station:TokyoMetro.Iidabashi': 'Metro',
};

// Get Primary Operator for a node
export function getPrimaryOperator(nodeId: string): string {
    // 1. Check explicit override first
    if (HUB_PRIMARY_OPERATOR[nodeId]) {
        return HUB_PRIMARY_OPERATOR[nodeId];
    }
    // 2. Auto-detect from node ID prefix
    if (nodeId.includes('JR-East')) return 'JR';
    if (nodeId.includes('TokyoMetro')) return 'Metro';
    if (nodeId.includes('Toei')) return 'Toei';

    // Private Railways
    if (nodeId.includes('Keikyu')) return 'Keikyu';
    if (nodeId.includes('Tokyu')) return 'Tokyu';
    if (nodeId.includes('Odakyu')) return 'Odakyu';
    if (nodeId.includes('Keio')) return 'Keio';
    if (nodeId.includes('Seibu')) return 'Seibu';
    if (nodeId.includes('Keisei')) return 'Keisei';
    if (nodeId.includes('Tobu')) return 'Tobu';
    if (nodeId.includes('TsukubaExpress')) return 'Tsukuba';
    if (nodeId.includes('Yurikamome')) return 'Yurikamome';
    if (nodeId.includes('TokyoMonorail')) return 'Monorail';

    return 'Private'; // Default fallback
}

// Get Short Abbreviation for Operator (English letters only)
export function getOperatorAbbreviation(operator: string): string {
    const abbreviations: Record<string, string> = {
        'JR': 'J',
        'Metro': 'M',
        'Toei': 'T',
        'Keikyu': 'KQ',
        'Tokyu': 'TQ',
        'Odakyu': 'OE',
        'Keio': 'KO',
        'Seibu': 'SE',
        'Keisei': 'KS',
        'Tobu': 'TB',
        'Tsukuba': 'TX',
        'Yurikamome': 'YK',
        'Monorail': 'MO',
        'Private': 'P',
    };
    return abbreviations[operator] || '';
}

export const STATION_LINES: Record<string, StationLineDef[]> = {
    // --- MAJOR HUBS (Multi-Operator Aggregates) ---

    // Ueno (JR + Metro + Keisei)
    'odpt:Station:JR-East.Ueno': [LINES.Yamanote, LINES.KeihinTohoku, LINES.Joban, LINES.UenoTokyo, LINES.Ginza, LINES.Hibiya, LINES.Keisei],
    'odpt:Station:TokyoMetro.Ueno': [LINES.Yamanote, LINES.KeihinTohoku, LINES.Joban, LINES.UenoTokyo, LINES.Ginza, LINES.Hibiya, LINES.Keisei], // Alias (seedNodes uses this)
    'odpt.Station:TokyoMetro.Ginza.Ueno': [LINES.Yamanote, LINES.KeihinTohoku, LINES.Joban, LINES.UenoTokyo, LINES.Ginza, LINES.Hibiya, LINES.Keisei], // Alias

    // Akihabara (JR + Metro + Tsukuba)
    'odpt:Station:JR-East.Akihabara': [LINES.Yamanote, LINES.KeihinTohoku, LINES.Sobu, LINES.Hibiya, LINES.Tsukuba],
    'odpt:Station:TsukubaExpress.Akihabara': [LINES.Yamanote, LINES.KeihinTohoku, LINES.Sobu, LINES.Hibiya, LINES.Tsukuba], // Alias (seedNodes uses this)
    'odpt.Station:TokyoMetro.Hibiya.Akihabara': [LINES.Yamanote, LINES.KeihinTohoku, LINES.Sobu, LINES.Hibiya, LINES.Tsukuba], // Alias

    // Shinjuku (JR + Metro + Toei)
    'odpt:Station:JR-East.Shinjuku': [LINES.Yamanote, LINES.Chuo, LINES.Sobu, LINES.Saikyo, LINES.ShonanShinjuku, LINES.Marunouchi, LINES.Shinjuku, LINES.Oedo],
    'odpt:Station:TokyoMetro.Shinjuku': [LINES.Yamanote, LINES.Chuo, LINES.Sobu, LINES.Saikyo, LINES.ShonanShinjuku, LINES.Marunouchi, LINES.Shinjuku, LINES.Oedo],
    'odpt:Station:Toei.Shinjuku': [LINES.Yamanote, LINES.Chuo, LINES.Sobu, LINES.Saikyo, LINES.ShonanShinjuku, LINES.Marunouchi, LINES.Shinjuku, LINES.Oedo],

    // Shibuya (JR + Metro)
    'odpt:Station:JR-East.Shibuya': [LINES.Yamanote, LINES.Saikyo, LINES.ShonanShinjuku, LINES.Ginza, LINES.Hanzomon, LINES.Fukutoshin],
    'odpt:Station:TokyoMetro.Shibuya': [LINES.Yamanote, LINES.Saikyo, LINES.ShonanShinjuku, LINES.Ginza, LINES.Hanzomon, LINES.Fukutoshin],

    // Ikebukuro (JR + Metro)
    'odpt:Station:JR-East.Ikebukuro': [LINES.Yamanote, LINES.Saikyo, LINES.ShonanShinjuku, LINES.Marunouchi, LINES.Yurakucho, LINES.Fukutoshin],
    'odpt:Station:TokyoMetro.Ikebukuro': [LINES.Yamanote, LINES.Saikyo, LINES.ShonanShinjuku, LINES.Marunouchi, LINES.Yurakucho, LINES.Fukutoshin],

    // Tokyo (JR + Metro) - Added UenoTokyo
    'odpt:Station:JR-East.Tokyo': [LINES.Yamanote, LINES.Chuo, LINES.Keiyo, LINES.KeihinTohoku, LINES.Tokaido, LINES.SobuRapid, LINES.UenoTokyo, LINES.Marunouchi],
    'odpt.Station:TokyoMetro.Marunouchi.Tokyo': [LINES.Yamanote, LINES.Chuo, LINES.Keiyo, LINES.KeihinTohoku, LINES.Tokaido, LINES.SobuRapid, LINES.UenoTokyo, LINES.Marunouchi], // Alias


    // Shimbashi (JR + Metro + Toei + Yurikamome)
    'odpt:Station:JR-East.Shimbashi': [LINES.Yamanote, LINES.KeihinTohoku, LINES.Tokaido, LINES.Yokosuka, LINES.Ginza, LINES.Asakusa, LINES.Yurikamome],
    'odpt:Station:TokyoMetro.Shimbashi': [LINES.Yamanote, LINES.KeihinTohoku, LINES.Tokaido, LINES.Yokosuka, LINES.Ginza, LINES.Asakusa, LINES.Yurikamome], // Alias
    'odpt:Station:Toei.Shimbashi': [LINES.Yamanote, LINES.KeihinTohoku, LINES.Tokaido, LINES.Yokosuka, LINES.Ginza, LINES.Asakusa, LINES.Yurikamome], // Alias

    // Hamamatsucho (JR + Monorail + Toei(Daimon))
    'odpt:Station:JR-East.Hamamatsucho': [LINES.Yamanote, LINES.KeihinTohoku, LINES.Monorail, LINES.Asakusa, LINES.Oedo], // Daimon is adjacent
    'odpt:Station:Toei.Daimon': [LINES.Yamanote, LINES.KeihinTohoku, LINES.Monorail, LINES.Asakusa, LINES.Oedo], // Alias

    // Asakusa (Metro + Toei + Tobu(implicit))
    'odpt:Station:TokyoMetro.Asakusa': [LINES.Ginza, LINES.Asakusa], // Tobu Skytree Line optional?
    'odpt.Station:TokyoMetro.Ginza.Asakusa': [LINES.Ginza, LINES.Asakusa], // Alias
    'odpt:Station:Toei.Asakusa': [LINES.Ginza, LINES.Asakusa], // Alias

    // --- OTHER STATIONS (Usually Single or Dual Operator) ---

    // Metro
    'odpt:Station:TokyoMetro.Ginza': [LINES.Ginza, LINES.Marunouchi, LINES.Hibiya],
    'odpt:Station:TokyoMetro.Tawaramachi': [LINES.Ginza],
    'odpt:Station:TokyoMetro.Inaricho': [LINES.Ginza],
    'odpt:Station:TokyoMetro.Mitsukoshimae': [LINES.Ginza, LINES.Hanzomon],
    'odpt:Station:TokyoMetro.Kanda': [LINES.Ginza, LINES.Yamanote, LINES.KeihinTohoku, LINES.Chuo], // JR Kanda is adjacent
    'odpt:Station:TokyoMetro.Kyobashi': [LINES.Ginza],
    'odpt:Station:TokyoMetro.Nihombashi': [LINES.Ginza, LINES.Tozai, LINES.Asakusa],
    'odpt:Station:TokyoMetro.Toranomon': [LINES.Ginza],
    'odpt:Station:TokyoMetro.AoyamaItchome': [LINES.Ginza, LINES.Hanzomon, LINES.Oedo],
    'odpt:Station:TokyoMetro.Omotesando': [LINES.Ginza, LINES.Chiyoda, LINES.Hanzomon],
    // 'odpt:Station:TokyoMetro.Shibuya': [LINES.Ginza, LINES.Hanzomon, LINES.Fukutoshin, LINES.Yamanote, LINES.Saikyo, LINES.ShonanShinjuku], // Massive hub (Moved to top)

    // Hibiya Line
    'odpt:Station:TokyoMetro.Iriya': [LINES.Hibiya],
    'odpt:Station:TokyoMetro.Minowa': [LINES.Hibiya],
    'odpt:Station:TokyoMetro.Kayabacho': [LINES.Hibiya, LINES.Tozai],
    'odpt:Station:TokyoMetro.Hatchobori': [LINES.Hibiya, LINES.Keiyo], // JR Keiyo
    'odpt:Station:TokyoMetro.Tsukiji': [LINES.Hibiya],
    'odpt:Station:TokyoMetro.HigashiGinza': [LINES.Hibiya, LINES.Asakusa],
    'odpt:Station:TokyoMetro.Hibiya': [LINES.Hibiya, LINES.Chiyoda, LINES.Mita],
    'odpt:Station:TokyoMetro.Kasumigaseki': [LINES.Hibiya, LINES.Marunouchi, LINES.Chiyoda],
    'odpt:Station:TokyoMetro.Kamiyacho': [LINES.Hibiya],
    'odpt:Station:TokyoMetro.Roppongi': [LINES.Hibiya, LINES.Oedo],
    'odpt:Station:TokyoMetro.Hiroo': [LINES.Hibiya],
    'odpt:Station:TokyoMetro.NakaMeguro': [LINES.Hibiya],

    // JR East (Others) - Merged Okachimachi includes Oedo Line from UenoOkachimachi
    'odpt:Station:JR-East.Okachimachi': [LINES.Yamanote, LINES.KeihinTohoku, LINES.Oedo],
    'odpt:Station:JR-East.Kanda': [LINES.Yamanote, LINES.KeihinTohoku, LINES.Chuo, LINES.Ginza], // Shared with Metro
    'odpt:Station:JR-East.Yurakucho': [LINES.Yamanote, LINES.KeihinTohoku, LINES.Yurakucho],
    'odpt:Station:JR-East.Uguisudani': [LINES.Yamanote, LINES.KeihinTohoku],

    // Toei
    'odpt:Station:Toei.Kuramae': [LINES.Asakusa, LINES.Oedo],
    'odpt:Station:Toei.Asakusabashi': [LINES.Asakusa, LINES.Sobu], // JR Sobu
    'odpt:Station:Toei.HigashiNihombashi': [LINES.Asakusa, LINES.Shinjuku],
    'odpt:Station:Toei.Nihombashi': [LINES.Asakusa, LINES.Ginza, LINES.Tozai],
    'odpt:Station:Toei.Takaracho': [LINES.Asakusa],
    'odpt:Station:Toei.HigashiGinza': [LINES.Asakusa, LINES.Hibiya],
    'odpt:Station:Toei.UenoOkachimachi': [LINES.Yamanote, LINES.KeihinTohoku, LINES.Oedo], // Alias for merged JR-East.Okachimachi
    'odpt:Station:Toei.ShinOkachimachi': [LINES.Oedo, LINES.Tsukuba], // Connects to TX
    'odpt:Station:Toei.Kachidoki': [LINES.Oedo],
    'odpt:Station:Toei.Tsukishima': [LINES.Oedo, LINES.Yurakucho],
    'odpt:Station:Toei.Tsukijishijo': [LINES.Oedo],

    // Others
    'odpt:Station:TokyoMetro.Ochanomizu': [LINES.Marunouchi, LINES.Chuo, LINES.Sobu],
    'odpt:Station:TokyoMetro.Otemachi': [LINES.Marunouchi, LINES.Tozai, LINES.Chiyoda, LINES.Hanzomon, LINES.Mita],
    'odpt:Station:TokyoMetro.Iidabashi': [LINES.Tozai, LINES.Yurakucho, LINES.Namboku, LINES.Oedo, LINES.Chuo, LINES.Sobu],
    'odpt:Station:TokyoMetro.Kudanshita': [LINES.Tozai, LINES.Hanzomon, LINES.Shinjuku],
    'odpt:Station:TokyoMetro.Yushima': [LINES.Chiyoda],

    // Additional stations from SEED_NODES
    'odpt:Station:Toei.Ningyocho': [LINES.Asakusa, LINES.Hibiya],
    'odpt:Station:TokyoMetro.Akasakamitsuke': [LINES.Ginza, LINES.Marunouchi],
    // 'odpt:Station:TokyoMetro.Hiroo': [LINES.Hibiya], // Already defined above
    // 'odpt:Station:TokyoMetro.NakaMeguro': [LINES.Hibiya], // Already defined above
    'odpt:Station:Toei.Hamacho': [LINES.Shinjuku],
    'odpt:Station:Toei.Jimbocho': [LINES.Shinjuku, LINES.Hanzomon, LINES.Mita],
    'odpt:Station:Toei.Ogawamachi': [LINES.Shinjuku],
    'odpt:Station:Toei.Kudanshita': [LINES.Shinjuku, LINES.Tozai, LINES.Hanzomon],
    'odpt:Station:Toei.Iwamotocho': [LINES.Shinjuku],
    'odpt:Station:Toei.Hibiya': [LINES.Mita, LINES.Hibiya, LINES.Chiyoda],
    'odpt:Station:Toei.Uchisaiwaicho': [LINES.Mita],
    'odpt:Station:Toei.Ichigaya': [LINES.Shinjuku, LINES.Namboku, LINES.Yurakucho],
    'odpt:Station:JR-East.Iidabashi': [LINES.Chuo, LINES.Sobu, LINES.Tozai, LINES.Yurakucho, LINES.Namboku, LINES.Oedo],

    // --- Nakano Ward ---
    'odpt:Station:JR-East.Nakano': [LINES.Chuo, LINES.Tozai],
    'odpt:Station:TokyoMetro.Nakano': [LINES.Tozai, LINES.Chuo],

    // --- Nerima Ward ---
    'odpt:Station:Seibu.Nerima': [LINES.SeibuIkebukuro, LINES.Oedo], // Using newly added Seibu line
    'odpt:Station:Toei.Nerima': [LINES.Oedo, LINES.SeibuIkebukuro],

    // --- Kita Ward ---
    'odpt:Station:JR-East.Oji': [LINES.KeihinTohoku, LINES.Namboku],
    'odpt:Station:TokyoMetro.Oji': [LINES.Namboku, LINES.KeihinTohoku],

    // --- JR Hub: Shinagawa ---
    'odpt:Station:JR-East.Shinagawa': [LINES.Yamanote, LINES.KeihinTohoku, LINES.Tokaido, LINES.Yokosuka, LINES.UenoTokyo, LINES.KeikyuMain],

    // --- JR Hub: Akabane ---
    'odpt:Station:JR-East.Akabane': [LINES.KeihinTohoku, LINES.Saikyo, LINES.ShonanShinjuku, LINES.UenoTokyo], // + Takasaki/Utsunomiya (using UenoTokyo/Shonan as proxies)

    // --- JR Yamanote South (Osaki, Gotanda, Meguro) ---
    'odpt:Station:JR-East.Osaki': [LINES.Yamanote, LINES.Saikyo, LINES.ShonanShinjuku],
    'odpt:Station:JR-East.Gotanda': [LINES.Yamanote, LINES.Asakusa, LINES.SeibuIkebukuro], // Note: Gotanda is actually Toei Asakusa + Tokyu Ikegami (Tokyu not fully def yet) - using Asakusa
    'odpt:Station:JR-East.Meguro': [LINES.Yamanote, LINES.Namboku, LINES.Mita], // + Tokyu Meguro
};

export const HUB_STATION_MEMBERS: Record<string, string[]> = {
    // Kanda (JR + Metro Ginza)
    'odpt:Station:JR-East.Kanda': [
        'odpt:Station:JR-East.Kanda',
        'odpt:Station:TokyoMetro.Kanda',
        'odpt.Station:TokyoMetro.Ginza.Kanda'
    ],
    'odpt:Station:TokyoMetro.Kanda': [
        'odpt:Station:JR-East.Kanda',
        'odpt:Station:TokyoMetro.Kanda',
        'odpt.Station:TokyoMetro.Ginza.Kanda'
    ],
    'odpt.Station:TokyoMetro.Ginza.Kanda': [
        'odpt:Station:JR-East.Kanda',
        'odpt:Station:TokyoMetro.Kanda',
        'odpt.Station:TokyoMetro.Ginza.Kanda'
    ],

    // Ueno (JR + Metro Ginza + Metro Hibiya)
    'odpt:Station:JR-East.Ueno': [
        'odpt:Station:JR-East.Ueno',
        'odpt:Station:TokyoMetro.Ueno',
        'odpt.Station:TokyoMetro.Ginza.Ueno',
        'odpt.Station:TokyoMetro.Hibiya.Ueno'
    ],
    'odpt:Station:TokyoMetro.Ueno': [
        'odpt:Station:JR-East.Ueno',
        'odpt:Station:TokyoMetro.Ueno',
        'odpt.Station:TokyoMetro.Ginza.Ueno',
        'odpt.Station:TokyoMetro.Hibiya.Ueno'
    ],
    'odpt.Station:TokyoMetro.Ginza.Ueno': [
        'odpt:Station:JR-East.Ueno',
        'odpt:Station:TokyoMetro.Ueno',
        'odpt.Station:TokyoMetro.Ginza.Ueno',
        'odpt.Station:TokyoMetro.Hibiya.Ueno'
    ],

    // Akihabara (JR + Metro Hibiya + Tsukuba Express)
    'odpt:Station:JR-East.Akihabara': [
        'odpt:Station:JR-East.Akihabara',
        'odpt:Station:TsukubaExpress.Akihabara',
        'odpt.Station:TokyoMetro.Hibiya.Akihabara'
    ],
    'odpt:Station:TsukubaExpress.Akihabara': [
        'odpt:Station:JR-East.Akihabara',
        'odpt:Station:TsukubaExpress.Akihabara',
        'odpt.Station:TokyoMetro.Hibiya.Akihabara'
    ],
    'odpt.Station:TokyoMetro.Hibiya.Akihabara': [
        'odpt:Station:JR-East.Akihabara',
        'odpt:Station:TsukubaExpress.Akihabara',
        'odpt.Station:TokyoMetro.Hibiya.Akihabara'
    ],

    // Tokyo (JR + Metro Marunouchi)
    'odpt:Station:JR-East.Tokyo': [
        'odpt:Station:JR-East.Tokyo',
        'odpt.Station:TokyoMetro.Marunouchi.Tokyo'
    ],
    'odpt.Station:TokyoMetro.Marunouchi.Tokyo': [
        'odpt:Station:JR-East.Tokyo',
        'odpt.Station:TokyoMetro.Marunouchi.Tokyo'
    ],

    // Shinjuku (JR + Metro Marunouchi + Toei Shinjuku + Toei Oedo)
    'odpt:Station:JR-East.Shinjuku': [
        'odpt:Station:JR-East.Shinjuku',
        'odpt:Station:TokyoMetro.Shinjuku',
        'odpt.Station:TokyoMetro.Marunouchi.Shinjuku',
        'odpt.Station:Toei.Shinjuku.Shinjuku',
        'odpt.Station:Toei.Oedo.Shinjuku'
    ],
    'odpt:Station:TokyoMetro.Shinjuku': [
        'odpt:Station:JR-East.Shinjuku',
        'odpt:Station:TokyoMetro.Shinjuku',
        'odpt.Station:TokyoMetro.Marunouchi.Shinjuku',
        'odpt.Station:Toei.Shinjuku.Shinjuku',
        'odpt.Station:Toei.Oedo.Shinjuku'
    ],
    'odpt:Station:Toei.Shinjuku': [
        'odpt:Station:JR-East.Shinjuku',
        'odpt.Station:TokyoMetro.Marunouchi.Shinjuku',
        'odpt.Station:Toei.Shinjuku.Shinjuku',
        'odpt.Station:Toei.Oedo.Shinjuku'
    ],

    // Shibuya Group
    'odpt:Station:JR-East.Shibuya': [
        'odpt:Station:JR-East.Shibuya',
        'odpt.Station:TokyoMetro.Ginza.Shibuya',
        'odpt.Station:TokyoMetro.Hanzomon.Shibuya',
        'odpt.Station:TokyoMetro.Fukutoshin.Shibuya'
    ],
    'odpt:Station:TokyoMetro.Shibuya': [
        'odpt:Station:JR-East.Shibuya',
        'odpt.Station:TokyoMetro.Ginza.Shibuya',
        'odpt.Station:TokyoMetro.Hanzomon.Shibuya',
        'odpt.Station:TokyoMetro.Fukutoshin.Shibuya'
    ],

    // Ikebukuro Group
    'odpt:Station:JR-East.Ikebukuro': [
        'odpt:Station:JR-East.Ikebukuro',
        'odpt.Station:TokyoMetro.Marunouchi.Ikebukuro',
        'odpt.Station:TokyoMetro.Yurakucho.Ikebukuro',
        'odpt.Station:TokyoMetro.Fukutoshin.Ikebukuro'
    ],
    'odpt:Station:TokyoMetro.Ikebukuro': [
        'odpt:Station:JR-East.Ikebukuro',
        'odpt.Station:TokyoMetro.Marunouchi.Ikebukuro',
        'odpt.Station:TokyoMetro.Yurakucho.Ikebukuro',
        'odpt.Station:TokyoMetro.Fukutoshin.Ikebukuro'
    ],

    'odpt:Station:TokyoMetro.Asakusa': [
        'odpt.Station:TokyoMetro.Ginza.Asakusa',
        'odpt.Station:Toei.Asakusa.Asakusa',
        'odpt:Station:Tobu.Skytree.Asakusa'
    ],
    'odpt.Station:TokyoMetro.Ginza.Asakusa': [
        'odpt.Station:TokyoMetro.Ginza.Asakusa',
        'odpt.Station:Toei.Asakusa.Asakusa',
        'odpt:Station:Tobu.Skytree.Asakusa'
    ],
    'odpt:Station:Toei.Asakusa': [
        'odpt.Station:TokyoMetro.Ginza.Asakusa',
        'odpt.Station:Toei.Asakusa.Asakusa',
        'odpt:Station:Tobu.Skytree.Asakusa'
    ],

    'odpt:Station:JR-East.Shimbashi': [
        'odpt:Station:JR-East.Shimbashi',
        'odpt.Station:TokyoMetro.Ginza.Shimbashi',
        'odpt.Station:Toei.Asakusa.Shimbashi',
        'odpt:Station:Yurikamome.Shimbashi'
    ],

    'odpt:Station:JR-East.Hamamatsucho': [
        'odpt:Station:JR-East.Hamamatsucho',
        'odpt:Station:TokyoMonorail.Haneda.MonorailHamamatsucho',
        'odpt.Station:Toei.Asakusa.Daimon',
        'odpt.Station:Toei.Oedo.Daimon'
    ],

    // Nihombashi (Metro + Toei)
    'odpt:Station:TokyoMetro.Nihombashi': [
        'odpt:Station:TokyoMetro.Nihombashi',
        'odpt:Station:Toei.Nihombashi',
        'odpt.Station:TokyoMetro.Ginza.Nihombashi',
        'odpt.Station:TokyoMetro.Tozai.Nihombashi',
        'odpt.Station:Toei.Asakusa.Nihombashi'
    ],
    'odpt:Station:Toei.Nihombashi': [
        'odpt:Station:TokyoMetro.Nihombashi',
        'odpt:Station:Toei.Nihombashi',
        'odpt.Station:TokyoMetro.Ginza.Nihombashi',
        'odpt.Station:TokyoMetro.Tozai.Nihombashi',
        'odpt.Station:Toei.Asakusa.Nihombashi'
    ],

    // Iidabashi (JR + Metro + Toei)
    'odpt:Station:JR-East.Iidabashi': [
        'odpt:Station:JR-East.Iidabashi',
        'odpt:Station:TokyoMetro.Iidabashi',
        'odpt:Station:Toei.Iidabashi',
        'odpt.Station:TokyoMetro.Tozai.Iidabashi',
        'odpt.Station:TokyoMetro.Yurakucho.Iidabashi',
        'odpt.Station:TokyoMetro.Namboku.Iidabashi',
        'odpt.Station:Toei.Oedo.Iidabashi'
    ],
    'odpt:Station:TokyoMetro.Iidabashi': [
        'odpt:Station:JR-East.Iidabashi',
        'odpt:Station:TokyoMetro.Iidabashi',
        'odpt:Station:Toei.Iidabashi',
        'odpt.Station:TokyoMetro.Tozai.Iidabashi',
        'odpt.Station:TokyoMetro.Yurakucho.Iidabashi',
        'odpt.Station:TokyoMetro.Namboku.Iidabashi',
        'odpt.Station:Toei.Oedo.Iidabashi'
    ],

    // Otemachi (Metro + Toei)
    'odpt:Station:TokyoMetro.Otemachi': [
        'odpt:Station:TokyoMetro.Otemachi',
        'odpt:Station:Toei.Otemachi',
        'odpt.Station:TokyoMetro.Marunouchi.Otemachi',
        'odpt.Station:TokyoMetro.Tozai.Otemachi',
        'odpt.Station:TokyoMetro.Chiyoda.Otemachi',
        'odpt.Station:TokyoMetro.Hanzomon.Otemachi',
        'odpt.Station:Toei.Mita.Otemachi'
    ]
};

export function getStationIdVariants(id: string) {
    const variants = new Set<string>();
    variants.add(id);
    if (id.startsWith('odpt.Station:')) variants.add(id.replace(/^odpt\.Station:/, 'odpt:Station:'));
    if (id.startsWith('odpt:Station:')) variants.add(id.replace(/^odpt:Station:/, 'odpt.Station:'));
    return Array.from(variants);
}

export const ODPT_LINE_SEGMENT_BY_NAME_EN: Record<string, string> = {
    'Ginza Line': 'Ginza',
    'Marunouchi Line': 'Marunouchi',
    'Hibiya Line': 'Hibiya',
    'Tozai Line': 'Tozai',
    'Chiyoda Line': 'Chiyoda',
    'Yurakucho Line': 'Yurakucho',
    'Hanzomon Line': 'Hanzomon',
    'Namboku Line': 'Namboku',
    'Fukutoshin Line': 'Fukutoshin',
    'Asakusa Line': 'Asakusa',
    'Mita Line': 'Mita',
    'Shinjuku Line': 'Shinjuku',
    'Oedo Line': 'Oedo',
    'Yamanote Line': 'Yamanote',
    'Keihin-Tohoku Line': 'KeihinTohoku',
    'Chuo Line': 'Chuo',
    'Sobu Line': 'Sobu',
    'Sobu Rapid Line': 'SobuRapid',
    'Chuo-Sobu Line': 'ChuoSobu',
    'Joban Line': 'Joban',
    'Keiyo Line': 'Keiyo',
    'Tokaido Line': 'Tokaido',
    'Yokosuka Line': 'Yokosuka',
    'Ueno-Tokyo Line': 'UenoTokyo',
    'Saikyo Line': 'Saikyo',
    'Shonan-Shinjuku Line': 'ShonanShinjuku'
};

export function guessPhysicalOdptStationIds(nodeId: string) {
    if (!nodeId) return [];
    if (nodeId.startsWith('odpt.Station:')) return [nodeId];

    const stationSlug = (nodeId.split(':').pop() || '').split('.').pop() || '';
    if (!stationSlug) return [];

    const operatorToken = nodeId.includes('TokyoMetro')
        ? 'TokyoMetro'
        : nodeId.includes('Toei')
            ? 'Toei'
            : nodeId.includes('JR-East')
                ? 'JR-East'
                : null;

    if (!operatorToken) return [];

    const targetOperator: StationLineDef['operator'] = operatorToken === 'TokyoMetro'
        ? 'Metro'
        : operatorToken === 'Toei'
            ? 'Toei'
            : 'JR';

    const lineDefs = STATION_LINES[nodeId] || [];
    const ids = new Set<string>();

    for (const line of lineDefs) {
        if (line.operator !== targetOperator) continue;
        const segment = ODPT_LINE_SEGMENT_BY_NAME_EN[line.name.en];
        if (!segment) continue;
        ids.add(`odpt.Station:${operatorToken}.${segment}.${stationSlug}`);
    }

    return Array.from(ids);
}

export function resolveHubStationMembers(stationId: string) {
    for (const v of getStationIdVariants(stationId)) {
        const hit = HUB_STATION_MEMBERS[v];
        if (hit && hit.length > 0) return hit;
    }
    return [stationId];
}
