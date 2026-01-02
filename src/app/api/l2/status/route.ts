import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { STATION_LINES } from '@/lib/constants/stationLines';

function normalizeLineToken(input: string) {
    return input
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/^toei/, '')
        .replace(/^tokyometro/, '')
        .replace(/line$/g, '')
        .replace(/[\-_.:]/g, '');
}

function severityToLineStatus(severity: string | undefined) {
    if (severity === 'critical') return 'suspended';
    if (severity === 'major' || severity === 'minor') return 'delay';
    return 'normal';
}

function pickWorstSeverity(disruptions: any[]) {
    const order = ['none', 'minor', 'major', 'critical'];
    return disruptions.reduce(
        (acc, d) => (order.indexOf(String(d?.severity)) > order.indexOf(acc) ? String(d?.severity) : acc),
        'none'
    );
}

function matchDisruptionToLine(lineDef: any, disruption: any) {
    const lineColor = String(lineDef?.color || '').toLowerCase();
    const dColor = String(disruption?.line_color || '').toLowerCase();
    if (lineColor && dColor && lineColor === dColor) return true;

    const enA = String(lineDef?.name?.en || '');
    const jaA = String(lineDef?.name?.ja || '');
    const enB = String(disruption?.line_name?.en || '');
    const jaB = String(disruption?.line_name?.ja || '');

    const nEnA = normalizeLineToken(enA);
    const nEnB = normalizeLineToken(enB);
    if (nEnA && nEnB && (nEnA === nEnB || nEnB.includes(nEnA) || nEnA.includes(nEnB))) return true;

    const nJaA = normalizeLineToken(jaA);
    const nJaB = normalizeLineToken(jaB);
    if (nJaA && nJaB && (nJaA === nJaB || nJaB.includes(nJaA) || nJaA.includes(nJaB))) return true;

    return false;
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const stationId = searchParams.get('station_id') || searchParams.get('stationId');

    if (!stationId) {
        return NextResponse.json({ error: 'Missing station_id or stationId' }, { status: 400 });
    }

    try {
        const [snapshotRes, historyRes] = await Promise.all([
            supabaseAdmin
                .from('transit_dynamic_snapshot')
                .select(`
                    *,
                    stations_static (
                        l1_ai_personality_summary
                    )
                `)
                .eq('station_id', stationId)
                .gt('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
                .order('updated_at', { ascending: false })
                .limit(1)
                .maybeSingle(),
            supabaseAdmin
                .from('l2_disruption_history')
                .select('station_id,severity,has_issues,affected_lines,disruption_data,created_at')
                .eq('station_id', stationId)
                .gt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
                .order('created_at', { ascending: false })
                .limit(20)
        ]);

        const { data, error } = snapshotRes;
        const { data: historyRows, error: historyError } = historyRes;

        if (error) {
            console.error('Error fetching L2 status:', error);
            return NextResponse.json({ error: 'Database Error' }, { status: 500 });
        }

        if (historyError) {
            // Ignore missing table error (PGRST205) as history is optional
            if (historyError.code !== 'PGRST205') {
                console.error('Error fetching disruption history:', historyError);
            }
        }

        if (!data) {
            console.log('[L2 API] No data found in DB for station:', stationId);
            return NextResponse.json(null);
        }

        console.log('[L2 API] Raw DB Data:', data);


        // Transform Flat DB columns (from n8n) to Frontend Interface

        // 1. Get lines for this station (Now returns Rich Objects from upgraded stationLines.ts)
        const lines = STATION_LINES[stationId] || [];

        const disruptionData = (data as any).disruption_data;
        const disruptions = Array.isArray(disruptionData?.disruptions) ? disruptionData.disruptions : [];
        const l4Hint = disruptionData?.l4_hint;

        const lineStatusArray = lines.map(lineDef => {
            const matching = disruptions.filter((d: any) => matchDisruptionToLine(lineDef, d));
            if (matching.length > 0) {
                const worst = pickWorstSeverity(matching);
                const primary = matching.find((d: any) => String(d?.severity) === worst) || matching[0];
                const status = severityToLineStatus(worst);
                const msgJa = primary?.message?.ja || primary?.status_label?.ja || l4Hint?.message?.ja;
                const msgEn = primary?.message?.en || primary?.status_label?.en || l4Hint?.message?.en;
                const msgZh =
                    primary?.message?.['zh-TW'] ||
                    primary?.message?.zh ||
                    primary?.status_label?.['zh-TW'] ||
                    primary?.status_label?.zh ||
                    l4Hint?.message?.['zh-TW'] ||
                    l4Hint?.message?.zh;

                const message = (msgJa || msgEn || msgZh)
                    ? {
                        ja: msgJa || (data.reason_ja || ''),
                        en: msgEn || 'Service update',
                        zh: msgZh || (data.reason_zh_tw || '')
                    }
                    : undefined;

                return {
                    name: lineDef.name,
                    operator: lineDef.operator,
                    color: lineDef.color,
                    status,
                    message
                };
            }

            const fallbackStatus = data.status_code?.toLowerCase() || 'normal';
            const fallbackMessage = (data.status_code === 'DELAY' || data.status_code === 'SUSPENDED')
                ? {
                    ja: data.reason_ja || data.message || 'Delay',
                    en: data.message || 'Delay',
                    zh: data.reason_zh_tw || data.reason_ja || '延誤'
                }
                : undefined;

            return {
                name: lineDef.name,
                operator: lineDef.operator,
                color: lineDef.color,
                status: fallbackStatus,
                message: fallbackMessage
            };
        });

        const severity = String(disruptionData?.overall_severity || 'none');
        const severityScore = ({ none: 0, minor: 1, major: 2, critical: 3 } as any)[severity] ?? 0;
        const congestionFromSeverity = severityScore >= 3 ? 5 : severityScore >= 2 ? 4 : severityScore >= 1 ? 3 : 2;

        const weatherInfo = (() => {
            const w: any = data.weather_info;
            const t = w?.update_time ? Date.parse(String(w.update_time)) : NaN;
            const stale = Number.isFinite(t) ? (Date.now() - t > 12 * 60 * 60 * 1000) : true;
            if (!w || stale) return null;
            return w;
        })();

        const fallbackWeatherInfo = weatherInfo
            ? null
            : (await supabaseAdmin
                .from('transit_dynamic_snapshot')
                .select('weather_info, updated_at')
                .not('weather_info', 'is', null)
                .order('updated_at', { ascending: false })
                .limit(1)
                .maybeSingle()).data?.weather_info;

        const l2Status = {
            congestion: disruptionData ? congestionFromSeverity : (data.status_code === 'DELAY' ? 4 : (data.status_code === 'SUSPENDED' ? 5 : 2)),
            line_status: lineStatusArray,
            weather: {
                temp: (weatherInfo || fallbackWeatherInfo)?.temp || 0,
                condition: (weatherInfo || fallbackWeatherInfo)?.condition || 'Unknown',
                wind: (weatherInfo || fallbackWeatherInfo)?.wind || 0
            },
            updated_at: data.updated_at,
            disruption_history: Array.isArray(historyRows) ? historyRows : []
        };

        return NextResponse.json(l2Status, {
            headers: {
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30'
            }
        });
    } catch (e) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
