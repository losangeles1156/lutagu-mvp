import { supabaseAdmin } from '@/lib/supabase';
import { resolveNodeInheritance } from '@/lib/nodes/inheritance';

export interface SimplePlaceContext {
    name: string;
    category: string;
    description: string;
    url?: string;
}

/**
 * Fetches approved L1 custom places for a given node (and its hub).
 * Returns a formatted string for AI context.
 */
export async function getApprovedL1PlacesContext(nodeId: string, locale: string = 'zh-TW'): Promise<string> {
    if (!nodeId) return '';

    try {
        const inheritance = await resolveNodeInheritance({ nodeId, client: supabaseAdmin });
        const targetIds = [nodeId];
        if (inheritance?.hub?.id && inheritance.hub.id !== nodeId) {
            targetIds.push(inheritance.hub.id);
        }

        // 增強查詢：包含 vibe_tags 和 ai_description
        const { data, error } = await supabaseAdmin
            .from('l1_custom_places')
            .select(`
                name_i18n, 
                primary_category,
                category, 
                description_i18n, 
                affiliate_url,
                vibe_tags,
                ai_description
            `)
            .in('station_id', targetIds)
            .eq('is_active', true)
            .eq('status', 'approved')
            .order('priority', { ascending: false })
            .limit(15);

        if (error || !data || data.length === 0) return '';

        // 格式化為 Agent 可理解的結構
        const places = data.map(row => {
            const name = getLocaleString(row.name_i18n, locale);
            const cat = row.primary_category || row.category;
            const vibes = Array.isArray(row.vibe_tags) ? row.vibe_tags.join(', ') : '';
            const desc = row.ai_description || getLocaleString(row.description_i18n, locale);
            const url = row.affiliate_url;

            let line = `• ${name} [${cat}]`;
            if (vibes) line += ` (${vibes})`;
            if (desc) line += ` - ${desc}`;
            if (url) line += ` | Link: ${url}`;
            return line;
        });

        return `

📍 VERIFIED LOCAL SPOTS (推薦優先順序):
${places.join('\n')}

💡 使用這些標籤理解用戶需求：
- 問「便宜/平價」→ 推薦有 "budget" 標籤的店家
- 問「姻緣/戀愛」→ 推薦有 "love_luck" 標籤的景點
- 問「網紅打卡」→ 推薦有 "instagram" 標籤的地點
`;

    } catch (err) {
        console.error('Error fetching L1 context:', err);
        return '';
    }
}

function getLocaleString(obj: any, locale: string): string {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    return obj[locale] || obj['zh-TW'] || obj['en'] || obj['ja'] || '';
}
