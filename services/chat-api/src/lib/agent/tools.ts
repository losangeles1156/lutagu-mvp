import { tool } from 'ai';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { getJSTTime } from '@/lib/utils/timeUtils';
import { TagEngine, TagContext } from '@/lib/tagging/TagEngine';
import { reasoningTools } from '@/lib/l4/reasoningTools';

export interface ToolResult<T = any> {
    success: boolean;
    data?: T;
    error?: string;
}

// =============================================================================
// Tool Definitions
// =============================================================================

export const tools = {
    ...reasoningTools,
    /**
     * Get current time in Japan (Asia/Tokyo)
     */
    get_current_time: tool({
        description: '取得目前日本 (Asia/Tokyo) 時間。用於判斷季節性活動 (如初詣)、末班車或店家營業時間。',
        inputSchema: z.object({}),
        execute: async () => {
            const jst = getJSTTime();
            return {
                iso: jst.date.toISOString(),
                local: jst.date.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
                year: jst.date.getFullYear(),
                month: jst.date.getMonth() + 1,
                day: jst.date.getDate(),
                hour: jst.hour,
                isHoliday: jst.isHoliday,
                holidayName: jst.holidayName
            };
        }
    }),

    /**
     * Get current weather for a station
     */
    get_weather: tool({
        description: '取得車站當前天氣與體感溫度。用於判斷是否需要建議室內路徑。',
        inputSchema: z.object({
            stationId: z.string().describe('ODPT Station ID')
        }),
        execute: async ({ stationId }) => {
            const { data: cache } = await supabaseAdmin
                .from('weather_cache')
                .select('value')
                .eq('station_id', stationId)
                .maybeSingle();

            if (cache?.value) {
                const val = cache.value as any;
                return {
                    temp: val.temp ?? 20,
                    condition: val.condition ?? 'unknown',
                    humidity: val.humidity,
                    alert: val.alert
                };
            }
            return { temp: 20, condition: 'unknown' };
        }
    }),

    /**
     * Get train delay status
     */
    get_train_status: tool({
        description: '取得路線延誤狀態。用於判斷是否需要啟動「避難模式」建議替代路線。',
        inputSchema: z.object({
            stationId: z.string().describe('ODPT Station ID')
        }),
        execute: async ({ stationId }) => {
            const cacheKey = `l2:${stationId}`;
            const { data: cache } = await supabaseAdmin
                .from('l2_cache')
                .select('value')
                .eq('key', cacheKey)
                .maybeSingle();

            if (cache?.value) {
                const val = cache.value as any;
                const statuses: any[] = [];
                if (Array.isArray(val.line_status)) {
                    val.line_status.forEach((ls: any) => {
                        statuses.push({
                            line: ls.line || ls.name?.en || 'Unknown',
                            status: ls.status || 'normal',
                            delayMinutes: ls.delay || 0,
                            message: ls.message
                        });
                    });
                }
                if (typeof val.delay === 'number' && val.delay > 0) {
                    statuses.push({ line: 'General', status: 'delayed', delayMinutes: val.delay });
                }
                return statuses;
            }
            return [];
        }
    }),

    /**
     * Get accessibility facilities
     */
    get_accessibility: tool({
        description: '取得無障礙設施 (電梯/坡道/輪椅坡道) 資訊。對於 wheelchair/stroller 使用者為必要調用。',
        inputSchema: z.object({
            stationId: z.string().describe('ODPT Station ID')
        }),
        execute: async ({ stationId }) => {
            const accessibilityTypes = ['elevator', 'slope', 'wheelchair_ramp', 'barrier_free_entrance'];
            const { data: facilities } = await supabaseAdmin
                .from('l3_facilities')
                .select('*')
                .eq('station_id', stationId)
                .in('type', accessibilityTypes);

            if (!facilities) return [];

            return facilities.map((f: any) => ({
                id: f.id,
                type: f.type,
                name: f.name_i18n?.zh || f.name_i18n?.ja || f.name_i18n?.en || f.type,
                location: f.location_i18n?.zh || f.location_i18n?.ja || f.attributes?.location_description || '',
                floor: f.attributes?.floor
            }));
        }
    }),

    /**
     * Get station facilities
     */
    get_station_facilities: tool({
        description: '取得車站設施 (廁所/置物櫃/ATM 等) 資訊。可指定設施類型。',
        inputSchema: z.object({
            stationId: z.string().describe('ODPT Station ID'),
            facilityType: z.string().optional().describe('Optional: toilet, locker, atm, wifi, etc.')
        }),
        execute: async ({ stationId, facilityType }) => {
            let query = supabaseAdmin
                .from('l3_facilities')
                .select('*')
                .eq('station_id', stationId);

            if (facilityType) {
                query = query.eq('type', facilityType);
            }

            const { data: facilities } = await query.limit(20);
            if (!facilities) return [];

            return facilities.map((f: any) => ({
                id: f.id,
                type: f.type,
                name: f.name_i18n?.zh || f.name_i18n?.ja || f.name_i18n?.en || f.type,
                location: f.location_i18n?.zh || f.location_i18n?.ja || '',
                attributes: f.attributes
            }));
        }
    }),

    /**
     * Search knowledge base
     */
    search_knowledge: tool({
        description: '根據標籤搜尋專家知識庫。支援自然語言查詢與多維度標籤解析。',
        inputSchema: z.object({
            stationId: z.string().describe('ODPT Station ID'),
            tags: z.array(z.string()).optional().describe('Tags to search: transfer, accessibility, locker, crowd, etc.'),
            query: z.string().optional().describe('Natural language query')
        }),
        execute: async ({ stationId, tags, query }) => {
            try {
                // [Refactor] Use knowledgeService/searchService
                const { searchL4Knowledge } = await import('@/lib/l4/searchService');

                const results = await searchL4Knowledge({
                    query: query || (tags ? tags.join(' ') : 'tips'),
                    stationId: stationId,
                    topK: 5
                });

                if (!results) return [];

                return results.map((rule: any) => ({
                    title: `[${rule.category}] ${rule.section}`,
                    content: rule.content,
                    tags: [rule.category]
                }));
            } catch (e) {
                console.error(e);
                return [];
            }
        }
    })
};
