
export type ServiceCategory = 'luggage_storage' | 'wifi' | 'taxi' | 'shared_bike' | 'charging' | 'hands_free_tourism';

interface ServiceLink {
    name: string;
    url: string;
    desc: string;
}

interface LocalizedService {
    ja: ServiceLink;
    en: ServiceLink;
    zh: ServiceLink;
}

// Default fallback services
export const GLOBAL_SERVICES: Record<ServiceCategory, LocalizedService | null> = {
    luggage_storage: {
        ja: { name: 'ecbo cloak', url: 'https://cloak.ecbo.io/', desc: '荷物預かり予約' },
        en: { name: 'ecbo cloak', url: 'https://cloak.ecbo.io/en', desc: 'Luggage Storage Reservation' },
        zh: { name: 'ecbo cloak', url: 'https://cloak.ecbo.io/zh-TW', desc: '行李寄放預約' }
    },
    wifi: {
        ja: { name: 'Japan Wi-Fi', url: 'https://www.ntt-bp.net/j-wifi-auto/en/', desc: '無料Wi-Fiアプリ' },
        en: { name: 'Japan Wi-Fi', url: 'https://www.ntt-bp.net/j-wifi-auto/en/', desc: 'Free Wi-Fi App' },
        zh: { name: 'Japan Wi-Fi', url: 'https://www.ntt-bp.net/j-wifi-auto/zh-tw/', desc: '免費 Wi-Fi App' }
    },
    taxi: {
        ja: { name: 'GO / Uber', url: 'https://go.mo-t.com/', desc: 'タクシー配車アプリ' },
        en: { name: 'GO / Uber', url: 'https://go.mo-t.com/', desc: 'Taxi App' },
        zh: { name: 'GO / Uber', url: 'https://go.mo-t.com/', desc: '計程車叫車 App' }
    },
    shared_bike: {
        ja: { name: 'LUUP', url: 'https://luup.sc/', desc: '電動キックボード・シェアサイクル' },
        en: { name: 'LUUP', url: 'https://luup.sc/en/', desc: 'E-Scooter / Bike Share' },
        zh: { name: 'LUUP', url: 'https://luup.sc/', desc: '電動滑板車/共享單車' }
    },
    charging: {
        ja: { name: 'ChargeSPOT', url: 'https://web.charge-spot.com/home', desc: 'モバイルバッテリーレンタル' },
        en: { name: 'ChargeSPOT', url: 'https://web.charge-spot.com/home', desc: 'Portable Power Bank Rental' },
        zh: { name: 'ChargeSPOT', url: 'https://web.charge-spot.com/home', desc: '行動電源租借' }
    },
    hands_free_tourism: {
        ja: { name: '手ぶら観光', url: 'https://cloak.ecbo.io/', desc: '荷物を預けて身軽に観光' },
        en: { name: 'Hands-Free Tourism', url: 'https://cloak.ecbo.io/en', desc: 'Store luggage, travel light' },
        zh: { name: '空手觀光', url: 'https://cloak.ecbo.io/zh-TW', desc: '行李寄放，輕鬆觀光' }
    }
};

// Operator-specific overrides
export const OPERATOR_SERVICES: Record<string, Partial<Record<ServiceCategory, LocalizedService>>> = {
    'TokyoMetro': {
        luggage_storage: {
            ja: { name: '東京メトロ・ロッカー', url: 'https://www.tokyometro.jp/station/service/coinlocker/', desc: '駅のコインロッカー' },
            en: { name: 'Tokyo Metro Lockers', url: 'https://www.tokyometro.jp/lang_en/station/service/coinlocker/', desc: 'Station Coin Lockers' },
            zh: { name: '東京地鐵置物櫃', url: 'https://www.tokyometro.jp/lang_tcn/station/service/coinlocker/', desc: '車站投幣式置物櫃' }
        }
    },
    'JR-East': {
        luggage_storage: {
            ja: { name: 'JR東日本・駅サービス', url: 'https://www.jreast.co.jp/railway/station/locker/', desc: 'コインロッカー検索' },
            en: { name: 'JR East Station Services', url: 'https://www.jreast.co.jp/e/stations/', desc: 'Station Facilities' },
            zh: { name: 'JR 東日本車站服務', url: 'https://www.jreast.co.jp/tc/stations/', desc: '車站設施' }
        }
    }
};

export function getServiceRecommendation(
    category: ServiceCategory,
    locale: 'ja' | 'en' | 'zh' | 'zh-TW',
    operatorId?: string // e.g., 'TokyoMetro', 'JR-East'
) {
    // 1. Check Operator Specifics
    if (operatorId) {
        const opServices = OPERATOR_SERVICES[operatorId];
        if (opServices && opServices[category]) {
            return getLocalized(opServices[category]!, locale);
        }
    }

    // 2. Fallback to Global
    const globalService = GLOBAL_SERVICES[category];
    if (globalService) {
        return getLocalized(globalService, locale);
    }

    return null;
}

function getLocalized(service: LocalizedService, locale: string) {
    let lang: 'ja' | 'en' | 'zh' = 'en';
    if (typeof locale === 'string') {
        const lower = locale.toLowerCase();
        if (lower.startsWith('ja')) lang = 'ja';
        else if (lower.startsWith('zh')) lang = 'zh';
    }
    return service[lang];
}
