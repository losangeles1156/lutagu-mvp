/**
 * Rapid/Express Service Patterns
 * Defines stop patterns for rapid services to enable "skip-stop" edges in the routing graph.
 * These patterns model trains that skip intermediate stations.
 */

export interface RapidServicePattern {
    /** The railwayId suffix for this rapid service (e.g., 'ChuoRapid' -> 'odpt.Railway:JR-East.ChuoRapid') */
    railwayId: string;
    /** Operator for fare calculations */
    operator: string;
    /** Display name */
    title: { ja: string; en: string; 'zh-TW': string };
    /** Ordered list of station IDs this rapid service stops at */
    stops: string[];
    /** Average minutes per edge (stop-to-stop) */
    avgMinutesPerEdge: number;
}

/**
 * Key JR East Rapid Services in the Tokyo area
 */
export const RAPID_SERVICE_PATTERNS: RapidServicePattern[] = [
    // ==================== JR Chuo Line ====================
    {
        railwayId: 'odpt.Railway:JR-East.ChuoRapid',
        operator: 'odpt.Operator:JR-East',
        title: { ja: '中央線快速', en: 'Chuo Rapid', 'zh-TW': '中央線快速' },
        stops: [
            'odpt.Station:JR-East.ChuoRapid.Takao',
            'odpt.Station:JR-East.ChuoRapid.NishiHachioji',
            'odpt.Station:JR-East.ChuoRapid.Hachioji',
            'odpt.Station:JR-East.ChuoRapid.Toyota',
            'odpt.Station:JR-East.ChuoRapid.Hino',
            'odpt.Station:JR-East.ChuoRapid.Tachikawa',
            'odpt.Station:JR-East.ChuoRapid.Kunitachi',
            'odpt.Station:JR-East.ChuoRapid.NishiKokubunji',
            'odpt.Station:JR-East.ChuoRapid.Kokubunji',
            'odpt.Station:JR-East.ChuoRapid.Musashikoganei',
            'odpt.Station:JR-East.ChuoRapid.Mitaka',
            'odpt.Station:JR-East.ChuoRapid.Kichijoji',
            'odpt.Station:JR-East.ChuoRapid.NishiOgikubo',
            'odpt.Station:JR-East.ChuoRapid.Ogikubo',
            'odpt.Station:JR-East.ChuoRapid.Nakano',
            'odpt.Station:JR-East.ChuoRapid.Shinjuku',
            'odpt.Station:JR-East.ChuoRapid.Yotsuya',
            'odpt.Station:JR-East.ChuoRapid.Ochanomizu',
            'odpt.Station:JR-East.ChuoRapid.Kanda',
            'odpt.Station:JR-East.ChuoRapid.Tokyo',
        ],
        avgMinutesPerEdge: 4.0,
    },
    {
        railwayId: 'odpt.Railway:JR-East.ChuoSpecialRapid',
        operator: 'odpt.Operator:JR-East',
        title: { ja: '中央線特快', en: 'Chuo Special Rapid', 'zh-TW': '中央線特快' },
        stops: [
            'odpt.Station:JR-East.ChuoRapid.Takao',
            'odpt.Station:JR-East.ChuoRapid.Hachioji',
            'odpt.Station:JR-East.ChuoRapid.Tachikawa',
            'odpt.Station:JR-East.ChuoRapid.Kokubunji',
            'odpt.Station:JR-East.ChuoRapid.Mitaka',
            'odpt.Station:JR-East.ChuoRapid.Nakano',
            'odpt.Station:JR-East.ChuoRapid.Shinjuku',
            'odpt.Station:JR-East.ChuoRapid.Yotsuya',
            'odpt.Station:JR-East.ChuoRapid.Ochanomizu',
            'odpt.Station:JR-East.ChuoRapid.Kanda',
            'odpt.Station:JR-East.ChuoRapid.Tokyo',
        ],
        avgMinutesPerEdge: 5.5,
    },

    // ==================== JR Saikyo / Shonan-Shinjuku ====================
    {
        railwayId: 'odpt.Railway:JR-East.ShonanShinjuku',
        operator: 'odpt.Operator:JR-East',
        title: { ja: '湘南新宿ライン', en: 'Shonan-Shinjuku Line', 'zh-TW': '湘南新宿線' },
        stops: [
            'odpt.Station:JR-East.Tokaido.Ofuna',
            'odpt.Station:JR-East.Tokaido.Totsuka',
            'odpt.Station:JR-East.Tokaido.Yokohama',
            'odpt.Station:JR-East.Tokaido.Musashikosugi',
            'odpt.Station:JR-East.Yamanote.Osaki',
            'odpt.Station:JR-East.Yamanote.Ebisu',
            'odpt.Station:JR-East.Yamanote.Shibuya',
            'odpt.Station:JR-East.Yamanote.Shinjuku',
            'odpt.Station:JR-East.Yamanote.Ikebukuro',
            'odpt.Station:JR-East.SaikyoKawagoe.Akabane',
            'odpt.Station:JR-East.TakasaakiUtsunomiya.Urawa',
            'odpt.Station:JR-East.TakasaakiUtsunomiya.Omiya',
        ],
        avgMinutesPerEdge: 7.5,
    },
    // ==================== JR Tokaido ====================
    {
        railwayId: 'odpt.Railway:JR-East.Tokaido',
        operator: 'odpt.Operator:JR-East',
        title: { ja: '東海道線', en: 'Tokaido Line', 'zh-TW': '東海道線' },
        stops: [
            'odpt.Station:JR-East.Tokaido.Tokyo',
            'odpt.Station:JR-East.Tokaido.Shinbashi',
            'odpt.Station:JR-East.Tokaido.Shinagawa',
            'odpt.Station:JR-East.Tokaido.Kawasaki',
            'odpt.Station:JR-East.Tokaido.Yokohama',
            'odpt.Station:JR-East.Tokaido.Totsuka',
            'odpt.Station:JR-East.Tokaido.Ofuna',
        ],
        avgMinutesPerEdge: 9.0,
    },

    // ==================== JR Keihin-Tohoku (Rapid) ====================
    {
        railwayId: 'odpt.Railway:JR-East.KeihinTohokuRapid',
        operator: 'odpt.Operator:JR-East',
        title: { ja: '京浜東北線快速', en: 'Keihin-Tohoku Rapid', 'zh-TW': '京濱東北線快速' },
        stops: [
            'odpt.Station:JR-East.KeihinTohokuNegishi.Hamamatsucho',
            'odpt.Station:JR-East.KeihinTohokuNegishi.Tokyo',
            'odpt.Station:JR-East.KeihinTohokuNegishi.Akihabara',
            'odpt.Station:JR-East.KeihinTohokuNegishi.Ueno',
            'odpt.Station:JR-East.KeihinTohokuNegishi.Tabata',
        ],
        avgMinutesPerEdge: 3.0,
    },

    // ==================== Tobu Isesaki (Rapid) ====================
    {
        railwayId: 'odpt.Railway:Tobu.SkytreeLine.Rapid',
        operator: 'odpt.Operator:Tobu',
        title: { ja: '東武スカイツリーライン急行', en: 'Tobu Skytree Rapid', 'zh-TW': '東武晴空塔線急行' },
        stops: [
            'odpt.Station:Tobu.TobuSkytree.Kuki',
            'odpt.Station:Tobu.TobuSkytree.Kasukabe',
            'odpt.Station:Tobu.TobuSkytree.Koshigaya',
            'odpt.Station:Tobu.TobuSkytree.ShinKoshigaya',
            'odpt.Station:Tobu.TobuSkytree.Takenotsuka',
            'odpt.Station:Tobu.TobuSkytree.Nishiarai',
            'odpt.Station:Tobu.TobuSkytree.Kitasenju',
            'odpt.Station:Tobu.TobuSkytree.TokyoSkytree',
            'odpt.Station:Tobu.TobuSkytree.Asakusa',
        ],
        avgMinutesPerEdge: 5.0,
    },

    // ==================== Seibu Ikebukuro (Rapid) ====================
    {
        railwayId: 'odpt.Railway:Seibu.Ikebukuro.Rapid',
        operator: 'odpt.Operator:Seibu',
        title: { ja: '西武池袋線急行', en: 'Seibu Ikebukuro Rapid', 'zh-TW': '西武池袋線急行' },
        stops: [
            'odpt.Station:Seibu.Ikebukuro.Hanno',
            'odpt.Station:Seibu.Ikebukuro.Irumashi',
            'odpt.Station:Seibu.Ikebukuro.Kotesashi',
            'odpt.Station:Seibu.Ikebukuro.Tokorozawa',
            'odpt.Station:Seibu.Ikebukuro.Hibarigaoka',
            'odpt.Station:Seibu.Ikebukuro.Shakujikoen',
            'odpt.Station:Seibu.Ikebukuro.Nerima',
            'odpt.Station:Seibu.Ikebukuro.Ikebukuro',
        ],
        avgMinutesPerEdge: 5.5,
    },

    // ==================== Tobu Tojo (Rapid) ====================
    {
        railwayId: 'odpt.Railway:Tobu.Tojo.Rapid',
        operator: 'odpt.Operator:Tobu',
        title: { ja: '東武東上線急行', en: 'Tobu Tojo Rapid', 'zh-TW': '東武東上線急行' },
        stops: [
            'odpt.Station:Tobu.Tojo.Kawagoemachi',
            'odpt.Station:Tobu.Tojo.Kawagoe',
            'odpt.Station:Tobu.Tojo.Fujimino',
            'odpt.Station:Tobu.Tojo.Shiki',
            'odpt.Station:Tobu.Tojo.Asakadai',
            'odpt.Station:Tobu.Tojo.Wakoshi',
            'odpt.Station:Tobu.Tojo.Narimasu',
            'odpt.Station:Tobu.Tojo.Ikebukuro',
        ],
        avgMinutesPerEdge: 5.0,
    },
    // ==================== Odakyu Odawara (Rapid Express) ====================
    {
        railwayId: 'odpt.Railway:Odakyu.Odawara.RapidExpress',
        operator: 'odpt.Operator:Odakyu',
        title: { ja: '小田急線快速急行', en: 'Odakyu Rapid Express', 'zh-TW': '小田急線快速急行' },
        stops: [
            'odpt.Station:Odakyu.Odawara.Shinjuku',
            'odpt.Station:Odakyu.Odawara.YoyogiUehara',
            'odpt.Station:Odakyu.Odawara.ShimoKitazawa',
            'odpt.Station:Odakyu.Odawara.Noborito',
            'odpt.Station:Odakyu.Odawara.ShinYurigaoka',
            'odpt.Station:Odakyu.Odawara.Machida',
            'odpt.Station:Odakyu.Odawara.SagamiOno',
            'odpt.Station:Odakyu.Odawara.Ebina',
            'odpt.Station:Odakyu.Odawara.HonAtsugi',
        ],
        avgMinutesPerEdge: 6.5,
    },

    // ==================== Tokyu Toyoko (F-Liner / Express) ====================
    {
        railwayId: 'odpt.Railway:Tokyu.Toyoko.F-Liner',
        operator: 'odpt.Operator:Tokyu',
        title: { ja: '東急東横線特急', en: 'Tokyu Toyoko Ltd. Exp.', 'zh-TW': '東急東横線特急' },
        stops: [
            'odpt.Station:Tokyu.Toyoko.Shibuya',
            'odpt.Station:Tokyu.Toyoko.NakaMeguro',
            'odpt.Station:Tokyu.Toyoko.Jiyugaoka',
            'odpt.Station:Tokyu.Toyoko.MusashiKosugi',
            'odpt.Station:Tokyu.Toyoko.Kikuna',
            'odpt.Station:Tokyu.Toyoko.Yokohama',
        ],
        avgMinutesPerEdge: 5.0,
    },

    // ==================== Tokyu Den-en-toshi (Express) ====================
    {
        railwayId: 'odpt.Railway:Tokyu.DenEnToshi.Express',
        operator: 'odpt.Operator:Tokyu',
        title: { ja: '東急田園都市線急行', en: 'Tokyu Den-en-toshi Express', 'zh-TW': '東急田園都市線急行' },
        stops: [
            'odpt.Station:Tokyu.DenEnToshi.Shibuya',
            'odpt.Station:Tokyu.DenEnToshi.SangenJaya',
            'odpt.Station:Tokyu.DenEnToshi.FutakoTamagawa',
            'odpt.Station:Tokyu.DenEnToshi.Mizonokuchi',
            'odpt.Station:Tokyu.DenEnToshi.Saginuma',
            'odpt.Station:Tokyu.DenEnToshi.TamaPlaza',
            'odpt.Station:Tokyu.DenEnToshi.Aobadai',
            'odpt.Station:Tokyu.DenEnToshi.Nagatsuta',
            'odpt.Station:Tokyu.DenEnToshi.ChuoRinkan',
        ],
        avgMinutesPerEdge: 4.0,
    },
];

/**
 * Station name alias mapping for connecting rapid patterns to local network.
 * Maps rapid-line station IDs to their base station names for transfer linking.
 */
export const RAPID_STATION_ALIASES: Record<string, string[]> = {
    'Shinjuku': [
        'odpt.Station:JR-East.ChuoRapid.Shinjuku',
        'odpt.Station:JR-East.Yamanote.Shinjuku',
        'odpt.Station:TokyoMetro.Marunouchi.Shinjuku',
        'odpt.Station:Toei.Oedo.Shinjuku',
        'odpt.Station:Toei.Shinjuku.Shinjuku',
    ],
    'Tokyo': [
        'odpt.Station:JR-East.ChuoRapid.Tokyo',
        'odpt.Station:JR-East.Yamanote.Tokyo',
        'odpt.Station:TokyoMetro.Marunouchi.Tokyo',
    ],
    'Ikebukuro': [
        'odpt.Station:JR-East.Yamanote.Ikebukuro',
        'odpt.Station:TokyoMetro.Marunouchi.Ikebukuro',
        'odpt.Station:Seibu.Ikebukuro.Ikebukuro',
        'odpt.Station:Tobu.Tojo.Ikebukuro',
    ],
    'Ueno': [
        'odpt.Station:JR-East.Yamanote.Ueno',
        'odpt.Station:JR-East.KeihinTohokuNegishi.Ueno',
        'odpt.Station:TokyoMetro.Ginza.Ueno',
        'odpt.Station:TokyoMetro.Hibiya.Ueno',
    ],
    'Shibuya': [
        'odpt.Station:JR-East.Yamanote.Shibuya',
        'odpt.Station:TokyoMetro.Ginza.Shibuya',
        'odpt.Station:TokyoMetro.Hanzomon.Shibuya',
        'odpt.Station:TokyoMetro.Fukutoshin.Shibuya',
    ],
    'Omiya': [
        'odpt.Station:JR-East.TakasaakiUtsunomiya.Omiya',
        'odpt.Station:JR-East.KeihinTohokuNegishi.Omiya',
        'odpt.Station:JR-East.SaikyoKawagoe.Omiya',
    ],
    'Machida': [
        'odpt.Station:JR-East.Yokohama.Machida',
        'odpt.Station:Odakyu.Odawara.Machida',
    ],
    'Yokohama': [
        'odpt.Station:JR-East.Tokaido.Yokohama',
        'odpt.Station:JR-East.Yokosuka.Yokohama',
        'odpt.Station:JR-East.KeihinTohokuNegishi.Yokohama',
        'odpt.Station:JR-East.ShonanShinjuku.Yokohama',
        'odpt.Station:Tokyu.Toyoko.Yokohama',
        'odpt.Station:Sotetsu.SotetsuMain.Yokohama',
    ],
    'Shimo-Kitazawa': [
        'odpt.Station:Odakyu.Odawara.ShimoKitazawa',
        'odpt.Station:Keio.Inokashira.ShimoKitazawa',
    ],
    'Naka-Meguro': [
        'odpt.Station:TokyoMetro.Hibiya.NakaMeguro',
        'odpt.Station:Tokyu.Toyoko.NakaMeguro',
    ],
};
