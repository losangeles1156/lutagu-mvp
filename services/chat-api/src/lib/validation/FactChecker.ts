/**
 * FactChecker - 事實驗證模組
 * 
 * 用於檢測 AI 回應中的知識幻覺，特別是交通路線的錯誤聲稱。
 * 對照 transit_ground_truth.json 進行驗證。
 */

import transitGroundTruth from '../../data/transit_ground_truth.json';

export interface FactCheckResult {
    hasHallucination: boolean;
    issues: FactCheckIssue[];
    correctedResponse?: string;
}

export interface FactCheckIssue {
    type: 'direct_claim' | 'no_transfer' | 'wrong_route';
    severity: 'critical' | 'warning';
    claim: string;
    correction: string;
    context?: string;
}

// 幻覺關鍵字模式
const HALLUCINATION_PATTERNS = {
    direct_to_tokyo: [
        /京急[線]?[^，。]*直達[^品川]*東京/i,
        /京急[線]?[^，。]*直接[^品川]*東京/i,
        /Keikyu[^,.\n]*direct[^Shinagawa]*Tokyo Station/i,
        /直達東京車站[^，。]*京急/i,
        /無需轉乘[^，。]*東京車站/i,
        /不需要[轉換]?[^，。]*東京車站/i
    ],
    no_transfer_haneda_tokyo: [
        /羽田[^，。]*東京車站[^，。]*不[用需]?轉[乘車換]/i,
        /從羽田[^，。]*直達[^，。]*東京車站/i,
        /Haneda[^,.\n]*direct[^,.\n]*Tokyo Station/i,
        /no transfer[^,.\n]*Haneda[^,.\n]*Tokyo/i
    ]
};

// 用於檢測潛在幻覺的通用模式
const GENERIC_DIRECT_PATTERNS = [
    /直達/,
    /不需要轉乘/,
    /不用轉車/,
    /無需轉乘/,
    /直接到達/,
    /一路直達/,
    /直接抵達/
];

/**
 * 檢查回應中是否包含知識幻覺
 */
export function checkForHallucinations(
    response: string,
    query: string
): FactCheckResult {
    const issues: FactCheckIssue[] = [];

    // 1. 檢查是否涉及羽田到東京車站的路線
    const isHanedaToTokyoQuery = /(?:羽田|haneda).*(?:東京車站|東京駅|tokyo station)/i.test(query) ||
        /(?:東京車站|東京駅|tokyo station).*(?:羽田|haneda)/i.test(query);

    if (isHanedaToTokyoQuery) {
        // 檢測「京急直達東京」的錯誤聲稱
        for (const pattern of HALLUCINATION_PATTERNS.direct_to_tokyo) {
            if (pattern.test(response)) {
                issues.push({
                    type: 'direct_claim',
                    severity: 'critical',
                    claim: '京急線直達東京車站',
                    correction: '京急線只直達品川站，需要在品川轉乘 JR 才能到東京車站',
                    context: response.match(pattern)?.[0]
                });
                break;
            }
        }

        // 檢測「無需轉乘」的錯誤聲稱
        for (const pattern of HALLUCINATION_PATTERNS.no_transfer_haneda_tokyo) {
            if (pattern.test(response)) {
                issues.push({
                    type: 'no_transfer',
                    severity: 'critical',
                    claim: '羽田機場到東京車站不需轉乘',
                    correction: '從羽田機場到東京車站必須轉乘（在品川或濱松町）',
                    context: response.match(pattern)?.[0]
                });
                break;
            }
        }
    }

    // 2. 通用檢測：如果查詢包含「羽田」和「東京」，但回應說「直達」
    if (/羽田|haneda/i.test(query) && /東京[車駅站]|tokyo station/i.test(query)) {
        for (const pattern of GENERIC_DIRECT_PATTERNS) {
            if (pattern.test(response)) {
                // 確保不是在說「品川」直達
                if (!/品川.*直達|直達.*品川|Shinagawa.*direct|direct.*Shinagawa/i.test(response)) {
                    issues.push({
                        type: 'direct_claim',
                        severity: 'warning',
                        claim: response.match(pattern)?.[0] || '直達聲稱',
                        correction: '從羽田機場到東京車站沒有直達路線，必須轉乘',
                        context: response.substring(0, 100)
                    });
                    break;
                }
            }
        }
    }

    const hasHallucination = issues.some(i => i.severity === 'critical');

    let correctedResponse: string | undefined;
    if (hasHallucination) {
        correctedResponse = correctResponse(response, issues);
    }

    return {
        hasHallucination,
        issues,
        correctedResponse
    };
}

/**
 * 嘗試修正回應中的錯誤
 */
function correctResponse(response: string, issues: FactCheckIssue[]): string {
    let corrected = response;

    for (const issue of issues) {
        if (issue.type === 'direct_claim' || issue.type === 'no_transfer') {
            // 插入修正說明
            const groundTruth = transitGroundTruth.routes.haneda_to_tokyo_station;
            const correctRoute = groundTruth?.correct_routes?.[0];

            if (correctRoute) {
                const correction = `\n\n⚠️ **重要更正**：從羽田機場到東京車站**需要轉乘**。建議路線：${correctRoute.name}，在${correctRoute.transfer_station}轉車，總時間約${correctRoute.total_time_minutes}分鐘，票價¥${correctRoute.total_fare_yen}。`;
                corrected = corrected + correction;
            }
        }
    }

    return corrected;
}

/**
 * 獲取特定路線的正確資訊
 */
export function getGroundTruth(routeKey: string): any {
    return (transitGroundTruth.routes as any)[routeKey] || null;
}

/**
 * 檢查特定路線是否需要轉乘
 */
export function requiresTransfer(origin: string, destination: string): boolean {
    const normalizedOrigin = origin.toLowerCase();
    const normalizedDest = destination.toLowerCase();

    // 羽田到東京車站
    if ((normalizedOrigin.includes('羽田') || normalizedOrigin.includes('haneda')) &&
        (normalizedDest.includes('東京') || normalizedDest.includes('tokyo'))) {
        return true;
    }

    return false;
}

export default {
    checkForHallucinations,
    getGroundTruth,
    requiresTransfer
};
