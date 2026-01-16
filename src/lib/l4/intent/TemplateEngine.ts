
import { SupportedLocale } from '../assistantEngine';

export interface TemplateResponse {
    type: 'text' | 'card' | 'action';
    content: string;
    data?: any;
}

export interface IntentTemplate {
    id: string;
    patterns: RegExp[];
    keywords?: string[]; // 新增：用於 Trie 樹精確匹配的關鍵字
    responses: Record<SupportedLocale, string | ((match: RegExpMatchArray) => TemplateResponse)>;
    priority: number;
}

/**
 * 高效的關鍵字 Trie 樹，用於 O(L) 時間複雜度的匹配
 */
class KeywordTrie {
    private root: any = {};

    public insert(keyword: string, templateId: string) {
        let node = this.root;
        for (const char of keyword.toLowerCase()) {
            if (!node[char]) node[char] = {};
            node = node[char];
        }
        node.isEnd = true;
        node.templateId = templateId;
    }

    public search(text: string): string | null {
        let node = this.root;
        const lower = text.toLowerCase();
        for (const char of lower) {
            if (!node[char]) return null;
            node = node[char];
        }
        return node.isEnd ? node.templateId : null;
    }
}

export class TemplateEngine {
    private templates: IntentTemplate[] = [];
    private trie = new KeywordTrie();

    constructor() {
        this.initializeTemplates();
        this.buildTrie();
    }

    private buildTrie() {
        for (const template of this.templates) {
            if (template.keywords) {
                for (const kw of template.keywords) {
                    this.trie.insert(kw, template.id);
                }
            }
        }
    }

    private initializeTemplates() {
        this.templates = [
            {
                id: 'greeting',
                priority: 100,
                keywords: ['你好', '您好', 'hello', 'hi', 'hey', '安安', '哈囉', '早安', '午安', '晚安'],
                patterns: [
                    /^(你好|您好|hello|hi|hey|安安|哈囉)/i,
                    /^(早上好|午安|晚安|早安)/i
                ],
                responses: {
                    'zh-TW': '你好！我是 LUTAGU，你的東京交通 AI 導航助手。想去哪裡，或者有什麼交通問題都可以問我喔！',
                    'zh': '你好！我是 LUTAGU，你的东京交通 AI 导航助手。想去哪里，或者有什么交通问题都可以问我喔！',
                    'en': 'Hello! I am LUTAGU, your Tokyo transport AI assistant. How can I help you navigate today?',
                    'ja': 'こんにちは！私は LUTAGU です。東京の交通案内をお手傳いします。何かお困りですか？',
                    'ar': 'مرحباً! أنا LUTAGU، مساعدك الذكي للمواصلات في طوكيو. كيف يمكنني مساعدتك اليوم؟'
                }
            },
            {
                id: 'fare-query-basic',
                priority: 90,
                patterns: [
                    /(?:多少錢|票價|車資|運賃|fare).*(?:到|至|まで|to)\s*([^?\s]+)/i,
                    /([^?\s]+)(?:的)?(?:票價|車資|運賃|fare)/i
                ],
                responses: {
                    'zh-TW': (match) => ({
                        type: 'action',
                        content: `正在為您查詢前往 ${match[1]} 的票價...`,
                        data: { action: 'query_fare', target: match[1] }
                    }),
                    'zh': (match) => ({
                        type: 'action',
                        content: `正在为您查询前往 ${match[1]} 的票价...`,
                        data: { action: 'query_fare', target: match[1] }
                    }),
                    'en': (match) => ({
                        type: 'action',
                        content: `Querying fare to ${match[1]}...`,
                        data: { action: 'query_fare', target: match[1] }
                    }),
                    'ja': (match) => ({
                        type: 'action',
                        content: `${match[1]} までの運賃を調べています...`,
                        data: { action: 'query_fare', target: match[1] }
                    }),
                    'ar': (match) => ({
                        type: 'action',
                        content: `جاري الاستعلام عن الأجرة إلى ${match[1]}...`,
                        data: { action: 'query_fare', target: match[1] }
                    })
                }
            },
            {
                id: 'live-status-help',
                priority: 92,
                patterns: [
                    /(?:延誤|誤點|停駛|停運|運行|運轉|運行狀態|狀態|異常|停電)/i,
                    /(?:遅延|運休|運行状況|運転見合わせ)/i,
                    /(?:delay|delayed|disruption|suspend|suspended|status|power outage|blackout)/i
                ],
                responses: {
                    'zh-TW': '我可以看即時運行狀態。請告訴我你目前在哪一站（或在地圖選擇車站/開啟定位），我就能用即時資料回覆延誤原因與替代建議。',
                    'zh': '我可以看即时运行状态。请告诉我你目前在哪一站（或在地图选择车站/开启定位），我就能用即时资料回复延误原因与替代建议。',
                    'en': 'I can check live service status. Tell me your current station (or select one on the map / enable location) so I can use live data to reply with the cause and a backup option.',
                    'ja': '運行状況を確認できます。今いる駅名（または地図で駅を選択／位置情報を有効化）を教えてください。遅延理由と代替案を即時データで返します。',
                    'ar': 'يمكنني التحقق من حالة التشغيل الفورية. أخبرني بمحطتك الحالية (أو اختر محطة على الخريطة/فعّل الموقع) لأجيب باستخدام البيانات الفورية مع السبب وخيار بديل.'
                }
            }
        ];
    }

    public match(text: string, locale: SupportedLocale = 'zh-TW'): TemplateResponse | null {
        const trimmed = text.trim();
        
        // 1. 優先嘗試 Trie 樹精確匹配 (O(L))
        const templateId = this.trie.search(trimmed);
        if (templateId) {
            const template = this.templates.find(t => t.id === templateId);
            if (template) {
                const res = template.responses[locale] || template.responses['en'];
                if (typeof res !== 'function') {
                    return { type: 'text', content: res };
                }
                // 如果是 function，則提供一個模擬的 match array
                return res([trimmed] as any);
            }
        }

        // 2. 備援回正則匹配 (O(N*M))
        for (const template of this.templates.sort((a, b) => b.priority - a.priority)) {
            for (const pattern of template.patterns) {
                const match = trimmed.match(pattern);
                if (match) {
                    const res = template.responses[locale] || template.responses['en'];
                    if (typeof res === 'function') {
                        return res(match);
                    }
                    return { type: 'text', content: res };
                }
            }
        }
        return null;
    }
}

export const templateEngine = new TemplateEngine();
