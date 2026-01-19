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
    go_taxi: {
        id: 'go_taxi',
        name: {
            ja: 'GO',
            en: 'GO',
            zh: 'GO'
        },
        category: 'mobility',
        baseUrl: 'https://go.mo-t.com/',
        trackingParams: {
            utm_source: 'lutagu'
        },
        ui: {
            icon: 'ExternalLink',
            color: 'indigo',
            label: {
                ja: 'タクシー（GO）',
                en: 'Taxi (GO)',
                zh: '計程車（GO）'
            },
            description: {
                ja: '急ぐときの最短手段（配車アプリ）',
                en: 'Fastest fallback when you are in a hurry',
                zh: '趕時間時最穩的替代方案（叫車）'
            },
            cta: {
                ja: 'アプリを開く',
                en: 'Open',
                zh: '開啟'
            }
        }
    },
    luup: {
        id: 'luup',
        name: {
            ja: 'LUUP',
            en: 'LUUP',
            zh: 'LUUP'
        },
        category: 'mobility',
        baseUrl: 'https://luup.sc/',
        trackingParams: {
            utm_source: 'lutagu'
        },
        ui: {
            icon: 'Bike',
            color: 'emerald',
            label: {
                ja: 'シェア（LUUP）',
                en: 'Shared mobility (LUUP)',
                zh: '共享（LUUP）'
            },
            description: {
                ja: '短距離の移動に便利',
                en: 'Good for short last-mile trips',
                zh: '短距離最後一公里的好選擇'
            },
            cta: {
                ja: '開く',
                en: 'Open',
                zh: '開啟'
            }
        }
    },
    toei_bus: {
        id: 'toei_bus',
        name: {
            ja: '都営バス',
            en: 'Toei Bus',
            zh: '都營公車'
        },
        category: 'mobility',
        baseUrl: 'https://www.kotsu.metro.tokyo.jp/bus/',
        trackingParams: {
            utm_source: 'lutagu'
        },
        ui: {
            icon: 'ExternalLink',
            color: 'slate',
            label: {
                ja: '都営バス',
                en: 'Toei Bus',
                zh: '都營公車'
            },
            description: {
                ja: '都営バスの路線・時刻表',
                en: 'Toei bus routes and timetables',
                zh: '都營公車路線與時刻表'
            },
            cta: {
                ja: '開く',
                en: 'Open',
                zh: '開啟'
            }
        }
    },
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

    let url: URL;
    try {
        url = new URL(partner.baseUrl);
    } catch {
        return '';
    }

    if (url.protocol !== 'https:') return '';

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

export function getPartnerIdFromUrl(inputUrl: string): string | null {
    if (!inputUrl) return null;

    let target: URL;
    try {
        target = new URL(inputUrl);
    } catch {
        return null;
    }

    if (!/^https?:$/.test(target.protocol)) return null;

    const targetHost = target.host;
    for (const partner of Object.values(PARTNER_REGISTRY)) {
        try {
            const base = new URL(partner.baseUrl);
            if (base.host === targetHost) return partner.id;
        } catch {
            continue;
        }
    }

    return null;
}

export function getSafeExternalUrl(inputUrl: string): string | null {
    if (!inputUrl) return null;

    let url: URL;
    try {
        url = new URL(inputUrl);
    } catch {
        return null;
    }

    if (!/^https?:$/.test(url.protocol)) return null;
    if (url.username || url.password) return null;

    const normalized = url.toString();
    if (normalized.length > 2048) return null;

    return normalized;
}
