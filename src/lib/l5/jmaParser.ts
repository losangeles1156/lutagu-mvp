/**
 * JMA (Japan Meteorological Agency) Alert Parser
 * 氣象廳防災情報 XML 解析器
 *
 * 數據源: https://www.data.jma.go.jp/developer/xml/feed/extra.xml
 */

import { JMAAlertInfo, DisasterType, AlertLevel } from './types';

// JMA 警報類型對應
const DISASTER_TYPE_MAP: Record<string, DisasterType> = {
    '大雨': 'heavy_rain',
    '洪水': 'flood',
    '暴風': 'typhoon',
    '大雪': 'snow',
    '暴風雪': 'snow',
    '地震': 'earthquake',
    '津波': 'tsunami',
};

// JMA 警報級別對應
const ALERT_LEVEL_MAP: Record<string, AlertLevel> = {
    '注意報': 'advisory',
    '警報': 'warning',
    '特別警報': 'special_emergency',
};

// 東京 23 區代碼
export const TOKYO_WARD_CODES: Record<string, string> = {
    '千代田区': '13101',
    '中央区': '13102',
    '港区': '13103',
    '新宿区': '13104',
    '文京区': '13105',
    '台東区': '13106',
    '墨田区': '13107',
    '江東区': '13108',
    '品川区': '13109',
    '目黒区': '13110',
    '大田区': '13111',
    '世田谷区': '13112',
    '渋谷区': '13113',
    '中野区': '13114',
    '杉並区': '13115',
    '豊島区': '13116',
    '北区': '13117',
    '荒川区': '13118',
    '板橋区': '13119',
    '練馬区': '13120',
    '足立区': '13121',
    '葛飾区': '13122',
    '江戸川区': '13123',
};

// 低窪地帶 (洪水高危區)
export const FLOOD_HIGH_RISK_WARDS = [
    '13108', // 江東区
    '13121', // 足立区
    '13122', // 葛飾区
    '13123', // 江戸川区
    '13107', // 墨田区
];

/**
 * 解析 JMA RSS Feed 中的警報資訊 (簡化版)
 * 實際實作需要完整的 XML 解析
 */
export async function fetchJMAAlerts(): Promise<JMAAlertInfo[]> {
    const JMA_FEED_URL = 'https://www.data.jma.go.jp/developer/xml/feed/extra.xml';

    try {
        const response = await fetch(JMA_FEED_URL, {
            headers: {
                'Accept': 'application/xml',
            },
            next: { revalidate: 60 }, // 快取 1 分鐘
        });

        if (!response.ok) {
            console.error('[JMA Parser] Failed to fetch JMA feed:', response.status);
            return [];
        }

        const xmlText = await response.text();
        return parseJMAXML(xmlText);
    } catch (error) {
        console.error('[JMA Parser] Error fetching JMA alerts:', error);
        return [];
    }
}

/**
 * 解析 JMA XML (簡化版 - 需要完整實作)
 * 實際 XML 結構較複雜，這裡提供框架
 */
function parseJMAXML(xmlText: string): JMAAlertInfo[] {
    const alerts: JMAAlertInfo[] = [];

    // TODO: 使用 xml2js 或 fast-xml-parser 進行完整解析
    // 這裡僅提供結構框架

    // 簡易正則匹配標題（僅供示範）
    const titleMatches = xmlText.match(/<title>([^<]+)<\/title>/g);
    const linkMatches = xmlText.match(/<link>([^<]+)<\/link>/g);

    if (titleMatches) {
        for (const title of titleMatches) {
            const content = title.replace(/<\/?title>/g, '');

            // 過濾離島警報 (伊豆諸島、小笠原諸島)
            // 但必須保留 '東京地方' (23區), '多摩地方' (包含奧多摩)
            const isIsland = content.includes('伊豆諸島') || content.includes('小笠原諸島');
            if (isIsland) {
                continue;
            }

            // 檢查是否為東京/關東相關警報
            // 關鍵字覆蓋：東京, 関東, 多摩, 千代田区... (如果 XML 包含區名)
            if (
                content.includes('東京') ||
                content.includes('関東') ||
                content.includes('多摩') ||
                content.includes('特別警報') // 特別警報不應輕易過濾
            ) {
                // 解析災害類型
                let disasterType: DisasterType = 'heavy_rain';
                for (const [keyword, type] of Object.entries(DISASTER_TYPE_MAP)) {
                    if (content.includes(keyword)) {
                        disasterType = type;
                        break;
                    }
                }

                // 解析警報級別
                let alertLevel: AlertLevel = 'advisory';
                for (const [keyword, level] of Object.entries(ALERT_LEVEL_MAP)) {
                    if (content.includes(keyword)) {
                        alertLevel = level;
                        break;
                    }
                }

                alerts.push({
                    type: disasterType,
                    level: alertLevel,
                    issuedAt: new Date(),
                    affectedAreas: ['13000'], // MVP 暫時標記為全東京都 (TODO: 解析具體區名)
                    headline: content,
                    description: content,
                });
            }
        }
    }

    return alerts;
}

/**
 * 判斷指定區域是否在警報範圍內
 */
export function isAreaAffected(
    wardCode: string,
    alerts: JMAAlertInfo[]
): boolean {
    return alerts.some(alert =>
        alert.affectedAreas.includes(wardCode) ||
        alert.affectedAreas.includes('13000') // 東京都全域
    );
}

/**
 * 判斷是否應觸發避難模式
 */
export function shouldTriggerEvacuation(
    wardCode: string,
    alerts: JMAAlertInfo[]
): { shouldTrigger: boolean; level: 'green' | 'yellow' | 'orange' | 'red' } {
    const affectedAlerts = alerts.filter(alert =>
        isAreaAffected(wardCode, [alert])
    );

    if (affectedAlerts.length === 0) {
        return { shouldTrigger: false, level: 'green' };
    }

    // 檢查最高警報級別
    const hasSpecialEmergency = affectedAlerts.some(a => a.level === 'special_emergency');
    const hasEmergency = affectedAlerts.some(a => a.level === 'emergency');
    const hasWarning = affectedAlerts.some(a => a.level === 'warning');

    // 低窪地帶加權
    const isHighRiskArea = FLOOD_HIGH_RISK_WARDS.includes(wardCode);

    if (hasSpecialEmergency) {
        return { shouldTrigger: true, level: 'red' };
    }

    if (hasEmergency || (hasWarning && isHighRiskArea)) {
        return { shouldTrigger: true, level: 'orange' };
    }

    if (hasWarning) {
        return { shouldTrigger: true, level: 'yellow' };
    }

    return { shouldTrigger: false, level: 'green' };
}

/**
 * 生成多語言警報訊息
 */
export function generateAlertMessage(
    alert: JMAAlertInfo,
    locale: 'ja' | 'en' | 'zh-TW' | 'zh'
): string {
    const disasterLabels: Record<DisasterType, Record<string, string>> = {
        heavy_rain: { ja: '大雨', en: 'Heavy Rain', 'zh-TW': '大雨', zh: '大雨' },
        flood: { ja: '洪水', en: 'Flood', 'zh-TW': '洪水', zh: '洪水' },
        typhoon: { ja: '暴風', en: 'Typhoon', 'zh-TW': '颱風', zh: '台风' },
        snow: { ja: '大雪', en: 'Heavy Snow', 'zh-TW': '大雪', zh: '大雪' },
        earthquake: { ja: '地震', en: 'Earthquake', 'zh-TW': '地震', zh: '地震' },
        tsunami: { ja: '津波', en: 'Tsunami', 'zh-TW': '海嘯', zh: '海啸' },
    };

    const levelLabels: Record<AlertLevel, Record<string, string>> = {
        advisory: { ja: '注意報', en: 'Advisory', 'zh-TW': '注意報', zh: '注意报' },
        warning: { ja: '警報', en: 'Warning', 'zh-TW': '警報', zh: '警报' },
        emergency: { ja: '緊急警報', en: 'Emergency', 'zh-TW': '緊急警報', zh: '紧急警报' },
        special_emergency: { ja: '特別警報', en: 'Special Emergency', 'zh-TW': '特別警報', zh: '特别警报' },
    };

    const disaster = disasterLabels[alert.type][locale] || disasterLabels[alert.type]['en'];
    const level = levelLabels[alert.level][locale] || levelLabels[alert.level]['en'];

    const templates: Record<string, string> = {
        'ja': `🔴【${level}】${disaster}${level}が発令されました。`,
        'en': `🔴 ${level.toUpperCase()}: ${disaster} ${level} has been issued.`,
        'zh-TW': `🔴【${level}】${disaster}${level}已發布。`,
        'zh': `🔴【${level}】${disaster}${level}已发布。`,
    };

    return templates[locale] || templates['en'];
}
