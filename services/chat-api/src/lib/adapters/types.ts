export type LocalizedText = {
    'zh-TW': string;
    ja?: string;
    en?: string;
    [key: string]: string | undefined;
};

export interface BoundingBox {
    sw: [number, number]; // [lat, lon]
    ne: [number, number]; // [lat, lon]
}

export interface FeatureFlags {
    hasSubway: boolean;
    hasBus: boolean;
    hasSharedMobility: boolean;
    hasTaxiIntegration: boolean;
}

export interface DataSourceConfig {
    odptOperators?: string[];
    gtfsFeeds?: string[];
    gbfsSystems?: string[];
}

export interface CommercialPartnerConfig {
    provider: string;
    deepLinkTemplate: string;
    webFallback?: string;        // Web URL fallback if app not installed
    appScheme?: string;          // App URI scheme (e.g., 'go://', 'luup://')
    storeLinks?: {
        ios?: string;
        android?: string;
    };
}

export interface CityAdapter {
    id: string;
    name: LocalizedText;
    timezone: string;
    bounds: BoundingBox;

    // Feature Flags
    features: FeatureFlags;

    // Data Sources
    dataSources: DataSourceConfig;

    // Commercial Integrations
    commercialPartners: {
        taxi?: CommercialPartnerConfig;
        locker?: CommercialPartnerConfig;
        sharedMobility?: CommercialPartnerConfig;
    };
}
