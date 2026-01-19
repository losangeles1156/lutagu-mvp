/**
 * Node ID Normalizer
 *
 * 統一處理車站 ID 的正規化與變體生成
 * 解決 odpt:Station: vs odpt.Station: 格式不一致問題
 */

/**
 * 車站 ID 的兩種主要格式
 * - 邏輯 ID: odpt:Station:Operator.StationName (用於 seedNodes、前端)
 * - 物理 ID: odpt.Station:Operator.Line.StationName (用於 ODPT API、l3_facilities)
 */

export type StationIdFormat = 'logical' | 'physical';

/**
 * 將任意格式的車站 ID 正規化為邏輯 ID 格式
 * @param id - 原始車站 ID
 * @returns 正規化後的邏輯 ID (odpt:Station:Operator.StationName)
 */
export function normalizeToLogicalId(id: string): string {
    if (!id) return '';

    // 已經是邏輯 ID 格式
    if (id.startsWith('odpt:Station:')) {
        return id;
    }

    // 物理 ID 格式 (odpt.Station:Operator.Line.StationName)
    if (id.startsWith('odpt.Station:')) {
        const rest = id.replace(/^odpt\.Station:/, '');
        const parts = rest.split('.');

        if (parts.length >= 3) {
            // odpt.Station:TokyoMetro.Ginza.Ueno -> odpt:Station:TokyoMetro.Ueno
            const operator = parts[0];
            const stationName = parts[parts.length - 1];
            return `odpt:Station:${operator}.${stationName}`;
        } else if (parts.length === 2) {
            // odpt.Station:TokyoMetro.Ueno -> odpt:Station:TokyoMetro.Ueno
            return `odpt:Station:${rest}`;
        }
    }

    return id;
}

/**
 * 將任意格式的車站 ID 正規化為物理 ID 格式 (需要路線資訊)
 * @param id - 原始車站 ID
 * @param line - 路線名稱 (可選，用於生成完整物理 ID)
 * @returns 正規化後的物理 ID
 */
export function normalizeToPhysicalId(id: string, line?: string): string {
    if (!id) return '';

    // 已經是物理 ID 格式
    if (id.startsWith('odpt.Station:')) {
        return id;
    }

    // 邏輯 ID 格式 (odpt:Station:Operator.StationName)
    if (id.startsWith('odpt:Station:')) {
        const rest = id.replace(/^odpt:Station:/, '');
        const parts = rest.split('.');

        if (parts.length === 2 && line) {
            // odpt:Station:TokyoMetro.Ueno + Ginza -> odpt.Station:TokyoMetro.Ginza.Ueno
            const [operator, stationName] = parts;
            return `odpt.Station:${operator}.${line}.${stationName}`;
        }

        // 無法轉換，返回簡單格式轉換
        return `odpt.Station:${rest}`;
    }

    return id;
}

/**
 * 提取車站名稱片段 (不含運營商和路線)
 * @param id - 車站 ID
 * @returns 車站名稱片段 (如 "Ueno", "Akihabara")
 */
export function extractStationNameSlug(id: string): string {
    if (!id) return '';

    // 移除前綴
    let rest = id
        .replace(/^odpt\.Station:/, '')
        .replace(/^odpt:Station:/, '');

    // 取最後一個部分作為車站名稱
    const parts = rest.split('.');
    return parts[parts.length - 1] || '';
}

/**
 * 提取運營商名稱
 * @param id - 車站 ID
 * @returns 運營商名稱 (如 "TokyoMetro", "Toei", "JR-East")
 */
export function extractOperator(id: string): string | null {
    if (!id) return null;

    // 常見運營商列表
    const operators = [
        'TokyoMetro', 'Toei', 'JR-East', 'Keisei', 'Keikyu', 'Tokyu',
        'Odakyu', 'Keio', 'Seibu', 'Tobu', 'TsukubaExpress', 'Yurikamome',
        'TokyoMonorail', 'TWR'
    ];

    for (const op of operators) {
        if (id.includes(op)) {
            return op;
        }
    }

    return null;
}

/**
 * 提取路線名稱 (僅適用於物理 ID 格式)
 * @param id - 車站 ID
 * @returns 路線名稱 (如 "Ginza", "Hibiya") 或 null
 */
export function extractLineName(id: string): string | null {
    if (!id || !id.startsWith('odpt.Station:')) return null;

    const rest = id.replace(/^odpt\.Station:/, '');
    const parts = rest.split('.');

    // 物理 ID: Operator.Line.StationName
    if (parts.length >= 3) {
        return parts[1];
    }

    return null;
}

/**
 * 生成所有可能的 ID 變體供資料庫查詢使用
 * 這是解決 ID 不一致問題的核心函數
 *
 * @param id - 原始車站 ID
 * @returns 所有可能的 ID 變體陣列
 */
export function getAllIdVariants(id: string): string[] {
    if (!id) return [];

    const variants = new Set<string>();
    variants.add(id);

    // 1. 基本格式轉換
    if (id.startsWith('odpt.Station:')) {
        // 物理 -> 邏輯
        const logical = normalizeToLogicalId(id);
        variants.add(logical);
        // 替換前綴
        variants.add(id.replace(/^odpt\.Station:/, 'odpt:Station:'));
    } else if (id.startsWith('odpt:Station:')) {
        // 邏輯 -> 物理 (簡單替換)
        variants.add(id.replace(/^odpt:Station:/, 'odpt.Station:'));
    }

    // 2. 提取關鍵資訊生成更多變體
    const operator = extractOperator(id);
    const stationName = extractStationNameSlug(id);

    if (operator && stationName) {
        // 常見路線映射 (用於生成物理 ID)
        const operatorLines: Record<string, string[]> = {
            'TokyoMetro': ['Ginza', 'Marunouchi', 'Hibiya', 'Tozai', 'Chiyoda', 'Yurakucho', 'Hanzomon', 'Namboku', 'Fukutoshin'],
            'Toei': ['Asakusa', 'Mita', 'Shinjuku', 'Oedo'],
            'JR-East': ['Yamanote', 'KeihinTohoku', 'Chuo', 'Sobu', 'Joban', 'Keiyo']
        };

        const lines = operatorLines[operator] || [];
        for (const line of lines) {
            variants.add(`odpt.Station:${operator}.${line}.${stationName}`);
            variants.add(`odpt:Station:${operator}.${line}.${stationName}`);
        }

        // 邏輯 ID 格式
        variants.add(`odpt:Station:${operator}.${stationName}`);
        variants.add(`odpt.Station:${operator}.${stationName}`);
    }

    return Array.from(variants);
}

/**
 * 檢查兩個 ID 是否指向同一車站
 * @param id1 - 第一個 ID
 * @param id2 - 第二個 ID
 * @returns 是否為同一車站
 */
export function isSameStation(id1: string, id2: string): boolean {
    if (!id1 || !id2) return false;
    if (id1 === id2) return true;

    // 比較正規化後的邏輯 ID
    const logical1 = normalizeToLogicalId(id1);
    const logical2 = normalizeToLogicalId(id2);

    if (logical1 === logical2) return true;

    // 比較車站名稱片段
    const slug1 = extractStationNameSlug(id1);
    const slug2 = extractStationNameSlug(id2);

    return slug1 === slug2 && extractOperator(id1) === extractOperator(id2);
}

/**
 * 用於資料庫查詢的 ID 候選列表生成器
 * 結合 getAllIdVariants 和 Hub 成員解析
 *
 * @param id - 原始車站 ID
 * @param hubMemberResolver - Hub 成員解析函數 (可選)
 * @returns 用於資料庫查詢的完整 ID 列表
 */
export function buildQueryCandidates(
    id: string,
    hubMemberResolver?: (id: string) => string[]
): string[] {
    const candidates = new Set<string>();

    // 基本變體
    for (const variant of getAllIdVariants(id)) {
        candidates.add(variant);
    }

    // Hub 成員
    if (hubMemberResolver) {
        const members = hubMemberResolver(id);
        for (const member of members) {
            for (const variant of getAllIdVariants(member)) {
                candidates.add(variant);
            }
        }
    }

    return Array.from(candidates);
}
