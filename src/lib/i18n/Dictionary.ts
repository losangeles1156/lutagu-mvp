/**
 * 日本交通專門用語辭典 (Transport Terminology Dictionary)
 * 用於確保 AI 翻譯的一致性與專業度
 */

export const TRANSPORT_DICTIONARY: Record<string, string> = {
    // 站體設施
    "改札": "Ticket Gate / 驗票閘口",
    "みどりの窓口": "Midori-no-Madoguchi (Ticket Office) / 綠色窗口",
    "精算機": "Fare Adjustment Machine / 補票機",
    "券売機": "Ticket Vending Machine / 售票機",
    "出入口": "Entrance/Exit / 出入口",
    "ホーム": "Platform / 月台",
    "コンコース": "Concourse / 大廳",

    // 乘車相關
    "振替輸送": "Alternative Transport / 替代接駁",
    "運転見合わせ": "Service Suspended / 暫停營運",
    "遅延": "Delay / 延遲",
    "運休": "Cancelled / 停駛",
    "直通運転": "Through Service / 直通運轉",

    // 地點/狀態
    "駅構内": "Station Premises / 車站區域內",
    "改札外": "Outside Ticket Gates / 閘門外",
    "改札内": "Inside Ticket Gates / 閘門內",
    "バリアフリー": "Barrier-free / 無障礙",

    // 票卡
    "定期券": "Commuter Pass / 定期券",
    "特急券": "Limited Express Ticket / 特急券",
    "乗車券": "Basic Fare Ticket / 乘車券"
};

/**
 * 格式化為 Prompt 用的 Markdown 表格
 */
export function getDictionaryPrompt(): string {
    const header = "| 原文 (Original) | 翻譯 (Translation) |\n| :--- | :--- |\n";
    const body = Object.entries(TRANSPORT_DICTIONARY)
        .map(([key, value]) => `| ${key} | ${value} |`)
        .join('\n');
    return header + body;
}
