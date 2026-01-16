import { CityAdapter } from './types';

export const tokyoCoreAdapter: CityAdapter = {
    id: 'tokyo_core',
    name: { 'zh-TW': '東京都心', 'ja': '東京都心', 'en': 'Central Tokyo' },
    timezone: 'Asia/Tokyo',
    // Bounding Box from spec: [139.73, 35.65] ~ [139.82, 35.74] (Lon, Lat)
    // Spec says: `[139.73, 35.65]` ~ `[139.82, 35.74]`
    // BUT Typescript BoundingBox is [Lat, Lon].
    // Lat: 35.65 ~ 35.74
    // Lon: 139.73 ~ 139.82
    bounds: {
        sw: [35.65, 139.73],
        ne: [35.74, 139.82]
    },
    features: {
        hasSubway: true,
        hasBus: true,
        hasSharedMobility: true,
        hasTaxiIntegration: true,
    },
    dataSources: {
        odptOperators: ['TokyoMetro', 'Toei', 'JR-East'],
        gbfsSystems: ['docomo-cycle-tokyo', 'luup'],
    },
    commercialPartners: {
        taxi: {
            provider: 'go_taxi',
            // GO Taxi - 使用 Web 頁面作為中介，用戶可從此處下載或開啟 App
            deepLinkTemplate: 'https://go.mo-t.com/',
            webFallback: 'https://go.mo-t.com/',
            storeLinks: {
                ios: 'https://apps.apple.com/jp/app/go-taxi/id1458398674',
                android: 'https://play.google.com/store/apps/details?id=com.DeNAMobility.taxiapp'
            }
        },
        locker: {
            provider: 'ecbo',
            // Ecbo Cloak - 行李寄存服務
            deepLinkTemplate: 'https://cloak.ecbo.io/ja',
            webFallback: 'https://cloak.ecbo.io/ja',
            storeLinks: {
                ios: 'https://apps.apple.com/jp/app/ecbo-cloak/id1272498364',
                android: 'https://play.google.com/store/apps/details?id=io.ecbo.cloak'
            }
        },
        sharedMobility: {
            provider: 'luup',
            // LUUP - 電動滑板車/自行車共享服務
            deepLinkTemplate: 'https://luup.sc/',
            webFallback: 'https://luup.sc/',
            storeLinks: {
                ios: 'https://apps.apple.com/jp/app/luup/id1471138219',
                android: 'https://play.google.com/store/apps/details?id=sc.luup.android'
            }
        }
    },
};
