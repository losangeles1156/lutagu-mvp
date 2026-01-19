/**
 * JMA Weather Alert Service
 * 
 * Fetches and parses weather alerts from Japan Meteorological Agency (JMA).
 * Designed to run as a scheduled task via n8n or cron.
 */

import { supabaseAdmin } from '@/lib/supabase';

// JMA Alert XML Feed URLs
const JMA_FEEDS = {
    // Kishō Shōnin (Warnings/Advisories) for Kanto region
    kanto: 'https://www.jma.go.jp/bosai/warning/data/warning/130000.json', // Tokyo
};

// Mapping JMA severity codes to our system
const SEVERITY_MAP: Record<string, 'advisory' | 'warning' | 'emergency'> = {
    '注意報': 'advisory',
    '警報': 'warning',
    '特別警報': 'emergency',
};

// Mapping JMA alert types to our codes
const ALERT_TYPE_MAP: Record<string, string> = {
    '大雪': 'heavy_snow',
    '暴風雪': 'blizzard',
    '大雨': 'heavy_rain',
    '暴風': 'storm',
    '洪水': 'flood',
    '高潮': 'storm_surge',
    '波浪': 'high_waves',
    '雷': 'thunder',
    '濃霧': 'dense_fog',
    '乾燥': 'dry_air',
    '低温': 'low_temp',
    '霜': 'frost',
    '着氷': 'icing',
    '着雪': 'snow_accretion',
    '地震': 'earthquake',
};

export interface JMAAlert {
    alert_type: string;
    severity: 'advisory' | 'warning' | 'emergency';
    affected_regions: string[];
    title: { ja: string; en: string; zh: string };
    description: { ja: string; en: string; zh: string };
    source: string;
    valid_from: string;
    valid_until: string | null;
}

/**
 * Fetches weather alerts from JMA for Tokyo region
 */
export async function fetchJMAAlerts(): Promise<JMAAlert[]> {
    try {
        const response = await fetch(JMA_FEEDS.kanto, {
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) {
            console.error('[JMA] Failed to fetch alerts:', response.status);
            return [];
        }

        const data = await response.json();
        const alerts: JMAAlert[] = [];

        // Parse JMA JSON format (simplified - actual format may vary)
        // JMA uses nested area codes and warning types
        if (data?.areaTypes) {
            for (const areaType of data.areaTypes) {
                for (const area of (areaType.areas || [])) {
                    for (const warning of (area.warnings || [])) {
                        if (warning.status !== '発表') continue; // Only active alerts

                        const alertCode = warning.code || '';
                        const alertType = ALERT_TYPE_MAP[alertCode] || 'other';
                        const severity = SEVERITY_MAP[warning.kind?.name] || 'advisory';

                        alerts.push({
                            alert_type: alertType,
                            severity,
                            affected_regions: [area.code, 'tokyo'],
                            title: {
                                ja: `${warning.kind?.name || '注意報'}: ${alertCode}`,
                                en: `${severity.toUpperCase()}: ${alertType.replace('_', ' ')}`,
                                zh: `${severity === 'emergency' ? '特別警報' : severity === 'warning' ? '警報' : '注意報'}: ${alertCode}`
                            },
                            description: {
                                ja: warning.text || '詳細情報は気象庁ウェブサイトをご確認ください。',
                                en: warning.text || 'Please check JMA website for details.',
                                zh: warning.text || '請查看氣象廳網站以獲取詳細資訊。'
                            },
                            source: 'jma',
                            valid_from: new Date().toISOString(),
                            valid_until: null
                        });
                    }
                }
            }
        }

        return alerts;
    } catch (error) {
        console.error('[JMA] Error fetching alerts:', error);
        return [];
    }
}

/**
 * Syncs JMA alerts to Supabase
 */
export async function syncAlertsToSupabase(): Promise<{ inserted: number; errors: number }> {
    const alerts = await fetchJMAAlerts();
    let inserted = 0;
    let errors = 0;

    for (const alert of alerts) {
        try {
            const { error } = await supabaseAdmin
                .from('weather_alerts')
                .upsert({
                    alert_type: alert.alert_type,
                    severity: alert.severity,
                    affected_regions: alert.affected_regions,
                    title: alert.title.ja,
                    subtitle: alert.title.en,
                    content: alert.description,
                    region: alert.affected_regions[0],
                    source: alert.source,
                    valid_from: alert.valid_from,
                    valid_until: alert.valid_until,
                    data_type: 'jma_alert',
                    timestamp: new Date().toISOString()
                }, {
                    onConflict: 'id',
                    ignoreDuplicates: false
                });

            if (error) {
                console.error('[JMA] Insert error:', error);
                errors++;
            } else {
                inserted++;
            }
        } catch (e) {
            console.error('[JMA] Sync error:', e);
            errors++;
        }
    }

    console.log(`[JMA] Sync complete: ${inserted} inserted, ${errors} errors`);
    return { inserted, errors };
}

/**
 * Gets active alerts from database
 */
export async function getActiveAlerts(region?: string): Promise<any[]> {
    const now = new Date().toISOString();

    let query = supabaseAdmin
        .from('weather_alerts')
        .select('*')
        .eq('data_type', 'jma_alert')
        .or(`valid_until.is.null,valid_until.gt.${now}`);

    if (region) {
        query = query.contains('affected_regions', [region]);
    }

    const { data, error } = await query.order('created_at', { ascending: false }).limit(10);

    if (error) {
        console.error('[JMA] Error fetching active alerts:', error);
        return [];
    }

    return data || [];
}
