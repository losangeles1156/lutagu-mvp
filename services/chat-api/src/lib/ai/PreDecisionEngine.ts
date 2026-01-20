/**
 * PreDecisionEngine - 混合意圖分類引擎
 *
 * 設計目標：
 * 1. 快速意圖分類 (0-5ms)
 * 2. 成本優化 (優先使用低成本方法)
 * 3. 快取機制避免重複計算
 *
 * @packageDocumentation
 */

import { generateLLMResponse } from './llmClient';

// ============================================================================
// 內部日誌記錄器
// ============================================================================

function logPreDecision(source: string, latency: number): void {
    console.log(`[PreDecisionEngine] Source: ${source} | Latency: ${latency}ms`);
}

/**
 * 決策複雜度等級
 */
export enum DecisionLevel {
    LEVEL_1_SIMPLE = 'simple',    // 簡單：預設範本回覆
    LEVEL_2_MEDIUM = 'medium',    // 中等：演算法處理
    LEVEL_3_COMPLEX = 'complex'   // 複雜：LLM 處理
}

/**
 * 預決策結果介面
 */
export interface PreDecisionResult {
    /** 決策等級 */
    level: DecisionLevel;
    /** 信心度 (0-1) */
    confidence: number;
    /** 建議使用的模型 */
    suggestedModel: string;
    /** 判定理由 */
    reason: string;
    /** 預估延遲 (ms) */
    estimatedLatency: number;
    /** 是否來自快取 */
    _fromCache?: boolean;
}

// ============================================================================
// Level 1 關鍵詞表 (最低成本匹配)
// ============================================================================

const LEVEL_1_KEYWORDS: Record<string, string[]> = {
    // 問候語
    greeting: [
        '你好', 'hello', 'hi', '嗨', '安安', '哈囉', '哈喽',
        'こんにちは', 'こんばんは', 'おはよう', 'おはようございます', 'はじめまして', 'よろしく', 'よろしくお願いします', 'もしもし',
        '早安', '午安', '晚安', '好', 'good morning', 'good afternoon',
        '晚上好', '初次見面', '請多指教', 'yahoo', 'yo'
    ],
    // 感謝語
    thanks: [
        '謝謝', 'thank', '感謝', '感激', 'thanks', 'appreciate',
        '感恩', '太感謝了', '謝謝你', 'thank you', '阿里嘎多',
        '感恩啦', '感激不盡'
    ],
    // 基本資訊查詢 (包含時間查詢)
    // NOTE: 避免使用「現在」單獨作為關鍵詞，因為會與路線查詢中的「我現在想去」衝突
    basic_info: [
        '天氣', 'weather', '現在幾點', '現在時間', '現在日期',
        '匯率', 'rate', '日期', 'today', '今天日期',
        '今日', '星期幾', '禮拜幾'
    ],
    // 簡單 FAQ - 日本交通票券
    simple_faq: [
        '怎麼買票', 'ic卡', 'suica', 'pasmo', '哪裡買',
        '如何充值', '在哪裡', '營業時間', 'open', 'close',
        'icOCA', 'kitaca', 'manaca', 'nimoca', 'sugoca',
        '定期券', '月票', '回數券', '一日券',
        '購票', '買票', '售票', '售票處',
        '充值', '加值', '儲值', '儲金',
        '營業', '開門', '關門', '休息'
    ],
    // 道歉/再見
    farewell: [
        '再見', 'bye', '再會', '掰掰', '再聊', '拜拜',
        'sorry', '對不起', '抱歉', '不好意思',
        '辛苦了', '下次見', '晚安'
    ],
    // 肯定/否定回應
    affirmative: [
        '好', '可以', '沒問題', '好的', 'okay', 'ok', 'sure',
        '不用', '不要', 'no', '不用了'
    ]
};

// ============================================================================
// Level 2 關鍵詞表 (演算法處理)
// ============================================================================

const LEVEL_2_KEYWORDS: Record<string, string[]> = {
    //路線規劃
    route: [
        '到', '去', '怎麼去', '如何去', 'route', 'to', 'from',
        '轉乘', '乗換', '如何換車', '路線', 'path', 'direction',
        '前往', '走法', '怎麼走', '最近路線',
        '怎麼搭', '搭乘', '乘坐', '坐車',
        '換車', '轉車', '轉乘', '轉站',
        '從', '離開', '出發', '起點', '終點',
        '中間', '途經', '經過'
    ],
    // 票價查詢
    fare: [
        '多少錢', '票價', 'fare', '車資', '運費', '多少',
        'price', '費用', '花費', 'cost',
        '多少円', '多少日幣', '多少日元',
        '總共', '總價', '合計', '全部',
        'IC卡價', '現金價', 'payage'
    ],
    // 時間表 (不包含 "幾點"，因為與 Level 1 衝突)
    timetable: [
        '時刻表', '時間表', 'timetable', 'schedule',
        '首班車', '末班車', '首班车', '末班车', '班次',
        '發車', '到站時間', '列車時間',
        '發車時間', '到站時間', '行駛時間',
        '待ち時間', '等候時間', '需要多久',
        '幾分鐘', '多久', '需要多少時間'
    ],
    // 站點設施
    station_info: [
        '電梯', '電扶梯', '出口', '入口', '在哪裡', '位置',
        '洗手間', '廁所', 'toilet', '電費', '月台',
        '剪票口', '驗票口', '閘門', '閘口',
        '無障礙', '殘障', '輪椅', '嬰兒車',
        '寄物櫃', '置物櫃', '行李寄放',
        '便利商店', '商店', '餐廳', '咖啡廳',
        '觀光案內', '旅遊中心', '服務台',
        '詢問處', '案内所', 'information'
    ],
    // 附近設施
    nearby: [
        '附近', 'nearby', '周邊', '周圍', '旁邊', '周遭',
        '有什麼', '推薦', '景點',
        '觀光景點', '旅遊景點', '好玩', '推薦景點',
        '美食', '餐廳', '小吃', '推薦餐廳',
        '購物', '商場', '免稅店', 'outlet'
    ],
    // 營運狀態
    operation_status: [
        '營運', '運行', '行駛', '停駛', '停開',
        '延誤', 'delay', '誤點', '晚點',
        '遅延', '遅れ', '運行状況', '運行狀況', '運転状況',
        '平常運転', '平時運行',
        '運転見合わせ', '見合わせ', '運休', 'ダイヤ', '運転間隔',
        '正常', 'status', '狀態',
        '停運', '停行', '不通', '不通區間'
    ]
};

// ============================================================================
// 快取設定
// ============================================================================

const DECISION_CACHE = new Map<string, PreDecisionResult>();
const DECISION_CACHE_MAX_SIZE = 500;
const DECISION_CACHE_TTL_MS = 5 * 60 * 1000; // 5 分鐘

interface CacheEntry {
    result: PreDecisionResult;
    timestamp: number;
}

/**
 * PreDecisionEngine - 預決策引擎
 *
 * 職責：
 * 1. 快速意圖分類 (關鍵詞匹配 → ML 分類)
 * 2. 結果快取
 * 3. 提供決策建議給 HybridEngine
 */
export class PreDecisionEngine {
    private cache: Map<string, CacheEntry> = new Map();
    private cacheOrder: string[] = [];

    constructor() {
        // 初始化週期性清理任務
        this.startCleanupTask();
    }

    /**
     * 分類使用者輸入意圖
     *
     * @param text 使用者輸入文字
     * @returns 預決策結果
     */
    public async classifyIntent(text: string): Promise<PreDecisionResult> {
        const normalizedText = text.trim().toLowerCase();
        const startTime = Date.now();

        // 1. 檢查快取
        const cacheKey = `intent:${normalizedText}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            logPreDecision('cache_hit', Date.now() - startTime);
            return { ...cached, _fromCache: true };
        }

        // 2. Level 2 快速匹配 (0-1ms) - 優先於 Level 1，確保具體意圖（如「去羽田」）不被問候語覆蓋
        const level2Match = this.matchLevel2Keywords(normalizedText);
        if (level2Match.matched) {
            const result: PreDecisionResult = {
                level: DecisionLevel.LEVEL_2_MEDIUM,
                confidence: level2Match.confidence,
                suggestedModel: 'algorithm',
                reason: `匹配 Level 2 關鍵詞: ${level2Match.category}`,
                estimatedLatency: 20
            };
            this.setCache(cacheKey, result);
            logPreDecision('level2_keyword', Date.now() - startTime);
            return result;
        }

        // 3. Level 1 快速匹配 (0-1ms) - Level 2 未匹配時才檢查
        const level1Match = this.matchLevel1Keywords(normalizedText);
        if (level1Match.matched) {
            const result: PreDecisionResult = {
                level: DecisionLevel.LEVEL_1_SIMPLE,
                confidence: level1Match.confidence,
                suggestedModel: 'none',
                reason: `匹配 Level 1 關鍵詞: ${level1Match.category}`,
                estimatedLatency: 1
            };
            this.setCache(cacheKey, result);
            logPreDecision('level1_keyword', Date.now() - startTime);
            return result;
        }

        // 4. Level 3: 需要 ML/LLM 分類 (5-50ms)
        const result = await this.mlClassifyIntent(text);
        this.setCache(cacheKey, result);
        logPreDecision('level3_ml', Date.now() - startTime);
        return result;
    }

    /**
     * 匹配 Level 1 關鍵詞
     */
    private matchLevel1Keywords(text: string): {
        matched: boolean;
        category: string;
        confidence: number;
    } {
        for (const [category, keywords] of Object.entries(LEVEL_1_KEYWORDS)) {
            for (const keyword of keywords) {
                if (text.includes(keyword.toLowerCase())) {
                    return {
                        matched: true,
                        category,
                        confidence: 0.95
                    };
                }
            }
        }
        return { matched: false, category: '', confidence: 0 };
    }

    /**
     * 匹配 Level 2 關鍵詞
     */
    private matchLevel2Keywords(text: string): {
        matched: boolean;
        category: string;
        confidence: number;
    } {
        for (const [category, keywords] of Object.entries(LEVEL_2_KEYWORDS)) {
            for (const keyword of keywords) {
                if (text.includes(keyword.toLowerCase())) {
                    return {
                        matched: true,
                        category,
                        confidence: 0.90
                    };
                }
            }
        }
        return { matched: false, category: '', confidence: 0 };
    }

    /**
     * 使用 ML/LLM 進行意圖分類
     */
    private async mlClassifyIntent(text: string): Promise<PreDecisionResult> {
        const prompt = this.buildClassificationPrompt(text);

        try {
            const result = await generateLLMResponse({
                systemPrompt: `你是意圖分類專家，請分析使用者輸入並分類為以下等級：
- simple: 問候、基本資訊、FAQ - 可用預設範本回答
- medium: 需要計算的路線、票價、特定站點資訊 - 需要演算法處理
- complex: 需要推理的行程規劃、多站點建議、情境判斷 - 需要 LLM 處理

請嚴格只回覆 JSON 格式，reason 請用繁體中文(台灣)，
reason 必須在 10 個中文字以內，格式：
{"level": "simple|medium|complex", "confidence": 0.0-1.0, "reason": "理由"}`,
                userPrompt: prompt,
                temperature: 0.1,
                taskType: 'classification'
            });

            const parsed = this.parseClassificationResult(result);

            // 根據分類結果設定建議模型 (Trinity Architecture Strategy)
            let suggestedModel = 'none';
            if (parsed.level === DecisionLevel.LEVEL_3_COMPLEX) {
                // 複雜推理預設使用 Gemini 3 Flash Preview
                suggestedModel = 'gemini-3-flash-preview';
            } else if (parsed.level === DecisionLevel.LEVEL_2_MEDIUM) {
                suggestedModel = 'algorithm';
            }

            // 若為長文/閒聊 (可在 parsed.reason 中偵測關鍵字擴充邏輯)
            if (parsed.reason.includes('閒聊') || parsed.reason.includes('創作')) {
                suggestedModel = 'deepseek-v3';
            }

            return {
                level: parsed.level,
                confidence: parsed.confidence,
                suggestedModel,
                reason: parsed.reason,
                estimatedLatency: parsed.level === DecisionLevel.LEVEL_3_COMPLEX ? 50 : 20
            };
        } catch (error) {
            console.error('[PreDecisionEngine] ML 分類失敗:', error);

            // ML 分類失敗時，保守估計為 Level 3
            return {
                level: DecisionLevel.LEVEL_3_COMPLEX,
                confidence: 0.5,
                suggestedModel: process.env.AI_SLM_MODEL || 'mistral-small-latest',
                reason: 'ML分類失敗，保守估計',
                estimatedLatency: 100
            };
        }
    }

    /**
     * 建立分類提示
     */
    private buildClassificationPrompt(text: string): string {
        return `分析以下使用者輸入的複雜度等級：

使用者輸入: "${text}"

請根據以下標準判斷：
1. 問候語、感謝、基本資訊查詢 → simple
2. 需要計算的路線、票價、站點資訊 → medium
3. 需要推理、多站點、情境判斷 → complex

只回覆 JSON。`;
    }

    /**
     * 解析分類結果
     */
    private parseClassificationResult(result: string | null): {
        level: DecisionLevel;
        confidence: number;
        reason: string;
    } {
        if (!result) {
            return {
                level: DecisionLevel.LEVEL_3_COMPLEX,
                confidence: 0.5,
                reason: '解析失敗'
            };
        }

        try {
            // 清理可能的 markdown 格式
            const cleanResult = result
                .replace(/```json/g, '')
                .replace(/```/g, '')
                .trim();

            const parsed = JSON.parse(cleanResult);

            return {
                level: this.parseLevel(parsed.level),
                confidence: Math.max(0, Math.min(1, parsed.confidence || 0.7)),
                reason: parsed.reason || 'ML分類結果'
            };
        } catch (error) {
            // 嘗試簡單解析
            const lowerResult = result.toLowerCase();
            if (lowerResult.includes('simple')) {
                return {
                    level: DecisionLevel.LEVEL_1_SIMPLE,
                    confidence: 0.7,
                    reason: '關鍵詞匹配'
                };
            } else if (lowerResult.includes('medium')) {
                return {
                    level: DecisionLevel.LEVEL_2_MEDIUM,
                    confidence: 0.7,
                    reason: '關鍵詞匹配'
                };
            }

            return {
                level: DecisionLevel.LEVEL_3_COMPLEX,
                confidence: 0.6,
                reason: '解析結果'
            };
        }
    }

    /**
     * 解析等級字串
     */
    private parseLevel(levelStr: string): DecisionLevel {
        switch (levelStr?.toLowerCase()) {
            case 'simple':
                return DecisionLevel.LEVEL_1_SIMPLE;
            case 'medium':
                return DecisionLevel.LEVEL_2_MEDIUM;
            case 'complex':
                return DecisionLevel.LEVEL_3_COMPLEX;
            default:
                return DecisionLevel.LEVEL_3_COMPLEX;
        }
    }

    // =========================================================================
    // 快取管理
    // =========================================================================

    /**
     * 從快取取得結果
     */
    private getFromCache(key: string): PreDecisionResult | null {
        const entry = this.cache.get(key);
        if (!entry) return null;

        // 檢查 TTL
        if (Date.now() - entry.timestamp > DECISION_CACHE_TTL_MS) {
            this.cache.delete(key);
            this.cacheOrder = this.cacheOrder.filter(k => k !== key);
            return null;
        }

        return entry.result;
    }

    /**
     * 設定快取
     */
    private setCache(key: string, result: PreDecisionResult): void {
        // 檢查快取大小限制
        if (this.cache.size >= DECISION_CACHE_MAX_SIZE) {
            // 移除最舊的項目
            const oldestKey = this.cacheOrder.shift();
            if (oldestKey) {
                this.cache.delete(oldestKey);
            }
        }

        this.cache.set(key, {
            result,
            timestamp: Date.now()
        });
        this.cacheOrder.push(key);
    }

    /**
     * 啟動週期性清理任務
     */
    private startCleanupTask(): void {
        const timer = setInterval(() => {
            const now = Date.now();
            for (const [key, entry] of this.cache.entries()) {
                if (now - entry.timestamp > DECISION_CACHE_TTL_MS) {
                    this.cache.delete(key);
                    this.cacheOrder = this.cacheOrder.filter(k => k !== key);
                }
            }
        }, 60 * 1000); // 每分鐘清理一次
        timer.unref?.();
    }

    /**
     * 清除快取
     */
    public clearCache(): void {
        this.cache.clear();
        this.cacheOrder = [];
    }

    /**
     * 取得快取統計
     */
    public getCacheStats(): { size: number; maxSize: number; ttlMs: number } {
        return {
            size: this.cache.size,
            maxSize: DECISION_CACHE_MAX_SIZE,
            ttlMs: DECISION_CACHE_TTL_MS
        };
    }
}

// ============================================================================
// 單例匯出
// ============================================================================

export const preDecisionEngine = new PreDecisionEngine();

// ============================================================================
// 便捷函數
// ============================================================================

/**
 * 快速分類使用者意圖
 */
export async function classifyIntent(text: string): Promise<PreDecisionResult> {
    return preDecisionEngine.classifyIntent(text);
}

/**
 * 清除預決策快取
 */
export function clearPreDecisionCache(): void {
    preDecisionEngine.clearCache();
}

/**
 * 取得快取統計
 */
export function getPreDecisionCacheStats(): { size: number; maxSize: number; ttlMs: number } {
    return preDecisionEngine.getCacheStats();
}
