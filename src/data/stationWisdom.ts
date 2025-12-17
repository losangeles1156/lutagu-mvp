export interface StationTrap {
    type: 'depth' | 'transfer' | 'exit' | 'crowd';
    title: string;
    content: string;
    advice: string;
    severity: 'medium' | 'high' | 'critical';
}

export interface StationWisdomData {
    traps: StationTrap[];
    hacks?: string[];
}

export const STATION_WISDOM: Record<string, StationWisdomData> = {
    // Ueno Station (Target for verification)
    'odpt:Station:TokyoMetro.Ueno': {
        traps: [
            {
                type: 'depth',
                title: '🚄 新幹線搭乘警示 (High Depth)',
                content: '上野站的新幹線月臺位於地下四層，非常深！從上野公園/不忍口進站後，需連續搭乘 **四段長扶梯** 才能抵達。',
                advice: '⚠️ 心理建設：請務必預留 **至少 15 分鐘** 的進站緩衝時間。絕對不要在發車前 5 分鐘才抵達驗票口，你會趕不上。',
                severity: 'critical'
            }
        ],
        hacks: [
            '🐼 **熊貓橋 (Panda Bridge)**：從公園口出站後，不需下樓，直接走天橋可通往入谷口與車站大廳，避開 1F 的擁擠人潮。',
            '🛍️ **阿美橫町切入點**：想去阿美橫町？不要走「中央改札」，改走「不忍改札」過馬路就是入口，省下 5 分鐘迷路時間。'
        ]
    },

    // Tokyo Station (Reference)
    'odpt:Station:TokyoMetro.Tokyo': {
        traps: [
            {
                type: 'transfer',
                title: '🏃 京葉線轉乘陷阱 (Far Transfer)',
                content: '京葉線（去迪士尼的路線）月臺距離山手線非常遠，實際上接近「有樂町站」。',
                advice: '⚠️ 心理建設：轉乘通道長達 800 公尺，步行需 15-20 分鐘。請把它當作是「走到下一站」的距離感。',
                severity: 'high'
            }
        ]
    }
};
