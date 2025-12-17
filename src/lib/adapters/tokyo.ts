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
        gbfsSystems: ['docomo-cycle-tokyo', 'hellocycling'],
    },
    commercialPartners: {
        taxi: {
            provider: 'go_taxi',
            deepLinkTemplate: 'https://go.mo-t.com/?...' // Placeholder
        },
        locker: {
            provider: 'ecbo',
            deepLinkTemplate: 'https://cloak.ecbo.io/?...' // Placeholder
        },
    },
};
