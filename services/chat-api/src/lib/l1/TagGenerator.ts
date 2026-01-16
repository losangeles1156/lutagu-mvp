import { CategoryMapping, getCategoryById } from './categoryMapping';

export interface TagResult {
    tags_core: string[];
    tags_intent: string[];
    tags_visual: string[];
}

export class TagGenerator {
    /**
     * Generate 3-5-8 strategy tags for a POI
     */
    public static generate(poi: {
        name: string;
        category: string;
        attributes?: Record<string, any>;
    }): TagResult {
        const result: TagResult = {
            tags_core: [],
            tags_intent: [],
            tags_visual: []
        };

        // 1. Core Retrieval (3-4 chars, Core Noun)
        let normalizedCategory = poi.category;
        if (normalizedCategory === 'accommodation') normalizedCategory = 'hotel';

        const categoryInfo = getCategoryById(normalizedCategory);
        if (categoryInfo) {
            // Use localized names as base tags
            const zhName = categoryInfo.name['zh-TW'];
            if (zhName && zhName.length <= 4) {
                result.tags_core.push(zhName);
            }
        }

        // Add core tags from name (simplified logic)
        const coreKeywords = ['拉麵', '壽司', '咖啡', '燒肉', '居酒屋', '甜點', '飯店', '旅館', '藥妝', '超市'];
        coreKeywords.forEach(kw => {
            if (poi.name.includes(kw)) result.tags_core.push(kw);
        });

        // 2. Intent Alignment (5-8 chars, Action/Adj + Noun)
        // Combining attributes with core tags
        if (normalizedCategory === 'restaurant' || normalizedCategory === 'dining') {
            result.tags_intent.push('在地美食推薦');
            if (poi.attributes?.price === 'cheap') result.tags_intent.push('平價美食推薦');
        }
        if (normalizedCategory === 'cafe') {
            if (poi.attributes?.wifi) result.tags_intent.push('讀書工作咖啡');
            if (poi.attributes?.quiet) result.tags_intent.push('安靜咖啡廳');
            result.tags_intent.push('下午茶時光');
        }
        if (normalizedCategory === 'hotel' || normalizedCategory === 'accommodation') {
            result.tags_intent.push('住宿推薦');
            if (poi.name.includes('Hostel') || poi.name.includes('Guest House')) result.tags_intent.push('背包客住宿');
        }

        // 3. Multimodal Alignment (Visual features, Describe appearance)
        if (poi.name.includes('昭和') || poi.name.includes('老舖')) {
            result.tags_visual.push('昭和復古風');
        }
        if (poi.name.includes('Blue Bottle') || poi.name.includes('%')) {
            result.tags_visual.push('極簡風');
            result.tags_visual.push('清水模建築');
        }
        if (poi.name.includes('庭園') || poi.name.includes('公園')) {
            result.tags_visual.push('自然景觀');
        }

        // Remove duplicates
        result.tags_core = [...new Set(result.tags_core)];
        result.tags_intent = [...new Set(result.tags_intent)];
        result.tags_visual = [...new Set(result.tags_visual)];

        return result;
    }

    /**
     * Generate 3-5-8 strategy tags for L3 Facilities
     */
    public static generateForL3(facility: {
        type: string;
        attributes?: Record<string, any>;
    }): TagResult {
        const result: TagResult = {
            tags_core: [],
            tags_intent: [],
            tags_visual: []
        };

        // 1. Core Retrieval
        const typeMap: Record<string, string> = {
            'elevator': '電梯',
            'escalator': '電扶梯',
            'toilet': '廁所',
            'nursing_room': '哺乳室',
            'coin_locker': '置物櫃',
            'ticket_machine': '售票機',
            'atm': 'ATM'
        };
        if (typeMap[facility.type]) {
            result.tags_core.push(typeMap[facility.type]);
        } else {
            result.tags_core.push(facility.type);
        }

        // 2. Intent Alignment
        if (facility.type === 'toilet') {
            if (facility.attributes?.wheelchair) result.tags_intent.push('無障礙廁所');
            if (facility.attributes?.baby_chair) result.tags_intent.push('親子友善廁所');
            if (facility.attributes?.ostomate) result.tags_intent.push('人工肛門廁所');
        }
        if (facility.type === 'elevator') {
            if (facility.attributes?.capacity && facility.attributes.capacity >= 11) {
                result.tags_intent.push('輪椅大型電梯');
            }
            result.tags_intent.push('攜帶行李方便');
        }
        if (facility.type === 'nursing_room') {
            if (facility.attributes?.hot_water) result.tags_intent.push('熱水哺乳室');
            result.tags_intent.push('育嬰設施');
        }
        if (facility.type === 'coin_locker') {
            if (facility.attributes?.large_size) result.tags_intent.push('大型行李寄放');
            result.tags_intent.push('行李寄放');
        }

        return result;
    }

    /**
     * Generate 3-5-8 strategy tags for L4 Knowledge
     */
    public static generateForL4(knowledge: {
        category: string;
        title: string;
        content: string;
    }): TagResult {
        const result: TagResult = {
            tags_core: [],
            tags_intent: [],
            tags_visual: []
        };

        // 1. Core Retrieval
        const categoryMap: Record<string, string> = {
            'transfer': '轉乘',
            'ticket': '票券',
            'disaster': '防災',
            'food': '美食',
            'shopping': '購物',
            'railway': '鐵路',
            'hub_station': '樞紐站',
            'accessibility': '無障礙',
            'exit': '出口',
            'wifi': '網路'
        };
        if (categoryMap[knowledge.category]) {
            result.tags_core.push(categoryMap[knowledge.category]);
        }

        // Extract keywords from content if core is empty or generic
        const contentKeywords = [
            { k: '新幹線', t: '新幹線' },
            { k: '地鐵', t: '地鐵' },
            { k: '巴士', t: '巴士' },
            { k: '計程車', t: '計程車' },
            { k: '置物櫃', t: '置物櫃' },
            { k: '電梯', t: '電梯' }
        ];

        contentKeywords.forEach(ekw => {
            if (knowledge.title.includes(ekw.k) || knowledge.content.includes(ekw.k)) {
                result.tags_core.push(ekw.t);
            }
        });

        // 2. Intent Alignment
        const intentPatterns = [
            { query: '省錢', tag: '省錢交通攻略' },
            { query: '最快', tag: '最快路徑攻略' },
            { query: '避開人潮', tag: '避開尖峰人潮' },
            { query: '擁擠', tag: '避開尖峰人潮' },
            { query: '下雨', tag: '雨天備案建議' },
            { query: '帶小孩', tag: '親子旅遊建議' },
            { query: '嬰兒車', tag: '親子旅遊建議' },
            { query: '大型行李', tag: '大型行李運送' },
            { query: '大行李', tag: '大型行李運送' },
            { query: '輪椅', tag: '無障礙動線' },
            { query: '整修', tag: '施工改道注意' }
        ];

        for (const pattern of intentPatterns) {
            if (knowledge.title.includes(pattern.query) || knowledge.content.includes(pattern.query)) {
                result.tags_intent.push(pattern.tag);
            }
        }

        return result;
    }
}
