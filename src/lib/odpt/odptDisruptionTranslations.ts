
// Causes (Reasons)
export const DISRUPTION_CAUSES: Record<string, { en: string; zh: string }> = {
    // 設備故障系
    '変電所の電気設備故障': { en: 'Substation equipment failure', zh: '變電站設備故障' },
    '信号トラブル': { en: 'Signal trouble', zh: '信號故障' },
    '信号故障': { en: 'Signal failure', zh: '信號故障' },
    '車両点検': { en: 'Train inspection', zh: '列車檢查' },
    '車両故障': { en: 'Train malfunction', zh: '列車故障' },
    '線路点検': { en: 'Track inspection', zh: '軌道檢查' },
    '架線点検': { en: 'Overhead wire inspection', zh: '電車線檢查' },
    '架線切断': { en: 'Overhead wire unevenness', zh: '電車線斷裂' },
    '架線凍結': { en: 'Frozen overhead wire', zh: '電車線凍結' },
    'ホームドア点検': { en: 'Platform door inspection', zh: '月台門檢查' },
    'ポイント点検': { en: 'Switch inspection', zh: '道岔檢查' },
    '電気設備点検': { en: 'Electrical equipment inspection', zh: '電氣設備檢查' },

    // 自然災害・天氣
    '台風': { en: 'Typhoon', zh: '颱風' },
    '大雨': { en: 'Heavy rain', zh: '豪雨' },
    '強風': { en: 'Strong wind', zh: '強風' },
    '大雪': { en: 'Heavy snow', zh: '大雪' },
    '積雪': { en: 'Snow accumulation', zh: '積雪' },
    '降雪': { en: 'Snowfall', zh: '降雪' },
    '濃霧': { en: 'Dense fog', zh: '濃霧' },
    '地震': { en: 'Earthquake', zh: '地震' },
    '落雷': { en: 'Lightning strike', zh: '落雷' },
    '津波': { en: 'Tsunami', zh: '海嘯' },

    // 事故・人為因素
    '人身事故': { en: 'Passenger injury / Accident', zh: '人身事故' },
    '接触事故': { en: 'Collision accident', zh: '擦撞事故' },
    '踏切事故': { en: 'Level crossing accident', zh: '平交道事故' },
    '線路内人立入': { en: 'Person on track', zh: '軌道有人闖入' },
    '公衆立ち入り': { en: 'Public trespassing', zh: '民眾闖入管制區' },
    '異音の確認': { en: 'Checking unusual noise', zh: '確認異常聲響' },
    '安全確認': { en: 'Safety check', zh: '安全確認' },
    'ドア点検': { en: 'Door inspection', zh: '車門檢查' },
    '急病人': { en: 'Medical emergency', zh: '急病救護' },
    '急病人救護': { en: 'Medical emergency', zh: '急病救護' },
    'お客様救護': { en: 'Passenger assistance', zh: '旅客救護' },
    'お客様転落': { en: 'Passenger fall', zh: '旅客跌落' },
    '荷物挟まり': { en: 'Luggage caught in door', zh: '行李夾住' },
    '混雑': { en: 'Congestion', zh: '擁擠' },
    'お客様混雑': { en: 'Passenger congestion', zh: '乘客擁擠' },
    '線路支障': { en: 'Obstruction on track', zh: '軌道障礙物' },
    '飛来物': { en: 'Flying object', zh: '飛來物' },
    '動物と接触': { en: 'Animal collision', zh: '動物撞擊' },
    '倒木': { en: 'Fallen tree', zh: '倒樹' },
};

// Status Phrases / Sentences / Other keywords
export const DISRUPTION_PHRASES: Record<string, { en: string; zh: string }> = {
    // Sentence patterns (Longer first)
    '運転を見合わせています': { en: 'Service is suspended', zh: '暫停運行' },
    '遅れがでています': { en: 'Delays are occurring', zh: '出現延誤' },
    '遅れが出ています': { en: 'Delays are occurring', zh: '出現延誤' },
    'ダイヤが乱れています': { en: 'Schedule is disrupted', zh: '時刻表混亂' },
    '運転再開については': { en: 'Regarding resumption', zh: '關於恢復運行' },
    '運転再開は': { en: 'Resumption is expected at', zh: '預計恢復運行時間為' },
    '見込んでいます': { en: 'is expected', zh: '左右' },
    '内・外回り': { en: 'inner and outer loop', zh: '內外環線' },
    '上下線': { en: 'both directions', zh: '雙向' },
    '一部区間': { en: 'some sections', zh: '部分區間' },
    '直通運転': { en: 'Through service', zh: '直通運行' },
    '中止': { en: 'Suspended', zh: '中止' },
    '振替輸送': { en: 'Transfer transport', zh: '振替輸送（替代運輸）' },
    '振替輸送を実施': { en: 'Transfer transport is available', zh: '實施振替輸送（替代運輸）' },

    // Short keywords
    'ダイヤ乱れ': { en: 'Schedule disruption', zh: '時刻表混亂' },
    '行き先変更': { en: 'Destination change', zh: '終點站變更' },
    '運休': { en: 'Service suspended', zh: '停駛' },
    '運転見合わせ': { en: 'Service suspended', zh: '暫停運行' },
    '遅れ': { en: 'Delay', zh: '延誤' },
    '大幅な遅れ': { en: 'Major delay', zh: '嚴重延誤' },
    '今後の気象情報にご注意ください': { en: 'Please keep checking weather updates', zh: '請持續留意最新氣象資訊' },
    '運休が発生する可能性': { en: 'Service suspension is possible', zh: '可能臨時停駛' },
};

// Merge for full translation
export const DISRUPTION_ALL = { ...DISRUPTION_CAUSES, ...DISRUPTION_PHRASES };

export function translateDisruption(text: string, targetLocale: string): string {
    if (!text) return '';

    // Normalize locale to 'en' or 'zh' (default to zh for zh-TW)
    const localeKey = targetLocale.startsWith('en') ? 'en' : 'zh';

    let processedText = text;

    // Iterate through ALL sorted keys (Causes + Phrases)
    // Sort keys by length desc to match longest phrases first
    const sortedKeys = Object.keys(DISRUPTION_ALL).sort((a, b) => b.length - a.length);

    for (const key of sortedKeys) {
        if (processedText.includes(key)) {
            const translation = DISRUPTION_ALL[key][localeKey];

            // If the text is JUST the key
            if (processedText === key) {
                return translation;
            }

            // Replace
            processedText = processedText.replace(key, translation);
        }
    }

    // Common grammar suffix translation (fallback if not caught by phrases)
    if (localeKey === 'zh') {
        processedText = processedText
            .replace(/の影響で/g, ' 導致')
            .replace(/ため/g, ' 因為')
            .replace(/発生/g, '發生');
    } else if (localeKey === 'en') {
        processedText = processedText
            .replace(/の影響で/g, ' due to ')
            .replace(/ため/g, ' because of ');
    }

    return processedText;
}

export function getDisruptionCause(text: string, targetLocale: string): string | null {
    if (!text) return null;
    const localeKey = targetLocale.startsWith('en') ? 'en' : 'zh';

    // Only check CAUSES
    const sortedKeys = Object.keys(DISRUPTION_CAUSES).sort((a, b) => b.length - a.length);

    for (const key of sortedKeys) {
        if (text.includes(key)) {
            return DISRUPTION_CAUSES[key][localeKey];
        }
    }
    return null;
}
