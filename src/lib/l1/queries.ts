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
        // 1. Resolve Hub ID
        const inheritance = await resolveNodeInheritance({ nodeId, client: supabaseAdmin });
        const targetIds = [nodeId];
        if (inheritance?.hub?.id && inheritance.hub.id !== nodeId) {
            targetIds.push(inheritance.hub.id);
        }

        // 2. Query DB
        const { data, error } = await supabaseAdmin
            .from('l1_custom_places')
            .select('name_i18n, category, description_i18n, affiliate_url')
            .in('station_id', targetIds)
            .eq('is_active', true)
            .eq('status', 'approved')
            .limit(10); // Limit to prevent context overflow

        if (error || !data || data.length === 0) return '';

        // 3. Format
        const places = data.map(row => {
            const name = getLocaleString(row.name_i18n, locale);
            const desc = getLocaleString(row.description_i18n, locale);
            const cat = row.category;
            const url = row.affiliate_url;

            let line = `- [${cat}] ${name}`;
            if (desc) line += `: ${desc}`;
            if (url) line += ` (Link: ${url})`;
            return line;
        });

        return `\n\nVERIFIED LOCAL SPOTS (Recommend these first):\n${places.join('\n')}`;

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
