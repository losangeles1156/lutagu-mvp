export interface PartnerOffer {
    id: string;
    name: {
        ja: string;
        en: string;
        zh: string;
    };
    category: 'crowd' | 'storage' | 'mobility' | 'wifi' | 'general';
    baseUrl: string;
    trackingParams?: Record<string, string>;
    ui: {
        icon: 'Users' | 'Package' | 'Bike' | 'Wifi' | 'ExternalLink'; // Map to Lucide icons in component
        color: 'orange' | 'blue' | 'emerald' | 'indigo' | 'slate';
        label: {
            ja: string;
            en: string;
            zh: string;
        };
        description: {
            ja: string;
            en: string;
            zh: string;
        };
        cta: {
            ja: string;
            en: string;
            zh: string;
        };
    };
}

export const PARTNER_REGISTRY: Record<string, PartnerOffer> = {
    vacan: {
        id: 'vacan',
        name: {
            ja: 'Vacan',
            en: 'Vacan',
            zh: 'Vacan'
        },
        category: 'crowd',
        baseUrl: 'https://vacan.com/map/35.682471,139.764162,14', // Default fallback, can be dynamic
        trackingParams: {
            isOpendata: 'false',
            utm_source: 'lutagu'
        },
        ui: {
            icon: 'Users',
            color: 'orange',
            label: {
                ja: '混雑状況',
                en: 'Live Availability',
                zh: '即時空位'
            },
            description: {
                ja: '近くの店や施設の空き状況をチェック',
                en: 'Check real-time availability of nearby spots',
                zh: '查看周邊商店與設施的即時空位'
            },
            cta: {
                ja: 'マップを開く',
                en: 'Open Map',
                zh: '開啟地圖'
            }
        }
    },
    // Placeholder for future partners
    ecbo_cloak: {
        id: 'ecbo_cloak',
        name: {
            ja: 'ecbo cloak',
            en: 'ecbo cloak',
            zh: 'ecbo cloak'
        },
        category: 'storage',
        baseUrl: 'https://cloak.ecbo.io/',
        trackingParams: {
            utm_source: 'lutagu'
        },
        ui: {
            icon: 'Package',
            color: 'blue',
            label: {
                ja: '荷物預かり',
                en: 'Luggage Storage',
                zh: '行李寄放'
            },
            description: {
                ja: 'スマホで予約できる荷物預かり所',
                en: 'Reserve luggage storage on your phone',
                zh: '用手機預約附近的行李寄放處'
            },
            cta: {
                ja: '予約する',
                en: 'Reserve Now',
                zh: '立即預約'
            }
        }
    }
};

export function getPartnerUrl(partnerId: string, dynamicParams?: Record<string, string>): string {
    const partner = PARTNER_REGISTRY[partnerId];
    if (!partner) return '';

    const url = new URL(partner.baseUrl);

    // Add static tracking params
    if (partner.trackingParams) {
        Object.entries(partner.trackingParams).forEach(([key, value]) => {
            url.searchParams.append(key, value);
        });
    }

    // Add dynamic params (e.g., lat/lon override)
    if (dynamicParams) {
        Object.entries(dynamicParams).forEach(([key, value]) => {
            url.searchParams.append(key, value);
        });
    }

    return url.toString();
}
