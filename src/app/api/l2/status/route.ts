
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { STATION_LINES, LINES, StationLineDef, OPERATOR_COLORS } from '@/lib/constants/stationLines';
import { getLiveWeather } from '@/lib/weather/service';

// API Keys
const API_KEY_STANDARD = process.env.ODPT_API_KEY || process.env.ODPT_API_TOKEN; // Permanent (Metro/Toei)
const API_KEY_CHALLENGE = process.env.ODPT_API_TOKEN_BACKUP; // Temporary (JR East)
const ODPT_BASE_URL = 'https://api.odpt.org/api/v4';

import { getTrainStatus } from '@/lib/odpt/service';

function cleanLineName(id: string): string {
    let name = id
        .replace(/^odpt\.Railway:/, '')
        .replace(/^odpt\.Station:/, '')
        .replace(/^(JR-East|TokyoMetro|Toei|Keikyu|Tokyu|Odakyu|Keio|Seibu|Tobu|Yurikamome|TWR|TokyoMonorail)\./, '');

    // Remove known suffixes if present
    name = name.replace(/Line$/, '');

    // Handle Dot/CamelCase to Space
    name = name.replace(/\./g, ' ');
    // Insert space before capital letters if not already there (CamelCase -> Camel Case)
    // Avoid breaking if it's already spaced
    name = name.replace(/([a-z])([A-Z])/g, '$1 $2');

    return name.trim();
}

// Dynamic line lookup from nodes.transit_lines as fallback
async function getNodeTransitLines(stationId: string, transitLines?: unknown): Promise<StationLineDef[]> {
    try {
        const linesValue = transitLines;
        if (!Array.isArray(linesValue)) {
            return [];
        }

        return linesValue.map((lineId: string) => {
            const lineNameLower = lineId.toLowerCase();

            // 1. Strict Match against LINES constant (Preferred)
            const strictMatch = Object.values(LINES).find(def => {
                const defEn = def.name.en.toLowerCase().replace(' line', '');
                return lineNameLower.includes(defEn) ||
                    (def.name.ja && lineId.includes(def.name.ja));
            });

            if (strictMatch) {
                return strictMatch;
            }

            // 2. Fallback Construction with Smart Logic
            let operator: StationLineDef['operator'] = 'Other';
            let color = '#9CA3AF'; // Default Gray

            if (lineId.includes('Metro') || lineId.includes('Ginza') || lineId.includes('Marunouchi')) {
                operator = 'Metro';
                color = OPERATOR_COLORS['Metro'];
            } else if (lineId.includes('Toei') || lineId.includes('Oedo') || lineId.includes('Asakusa')) {
                operator = 'Toei';
                color = OPERATOR_COLORS['Toei'];
            } else if (lineId.includes('JR') || lineId.includes('Yamanote') || lineId.includes('Chuo')) {
                operator = 'JR';
                color = OPERATOR_COLORS['JR'];
            } else if (lineId.includes('Keikyu')) {
                operator = 'Private';
                color = OPERATOR_COLORS['Keikyu'];
            } else if (lineId.includes('Odakyu')) {
                operator = 'Private';
                color = OPERATOR_COLORS['Odakyu'];
            } else if (lineId.includes('Keio')) {
                operator = 'Private';
                color = OPERATOR_COLORS['Keio'];
            } else if (lineId.includes('Seibu')) {
                operator = 'Private';
                color = OPERATOR_COLORS['Seibu'];
            } else if (lineId.includes('Tobu')) {
                operator = 'Private';
                color = OPERATOR_COLORS['Tobu'];
            } else if (lineId.includes('Tokyu')) {
                operator = 'Private';
                color = OPERATOR_COLORS['Tokyu'];
            } else if (lineId.includes('Yurikamome')) {
                operator = 'Private';
                color = OPERATOR_COLORS['Yurikamome'];
            } else if (lineId.includes('Monorail')) {
                operator = 'Private';
                color = OPERATOR_COLORS['Monorail'];
            }

            const baseName = cleanLineName(lineId);

            return {
                name: {
                    ja: `${baseName}線`, // Fallback attempt
                    en: `${baseName} Line`,
                    zh: `${baseName}線`
                },
                operator,
                color
            } as StationLineDef;
        });
    } catch (e) {
        console.error('[L2 API] getNodeTransitLines error:', e);
        return [];
    }
}

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
    // 1. Check ID/Railway Match (New)
    if (disruption.railway_id) {
        // Construct approximate ODPT ID from lineDef (e.g. "Ginza" + "Metro" -> "TokyoMetro.Ginza")
        // This is fuzzy but robust enough for the major lines
        const lineSlug = lineDef.name.en.replace(' Line', '').replace('-', '');
        const opPrefix = lineDef.operator === 'Metro' ? 'TokyoMetro' : lineDef.operator === 'Toei' ? 'Toei' : lineDef.operator === 'JR' ? 'JR-East' : 'Keikyu';
        // Check if disruption.railway_id contains these tokens
        if (disruption.railway_id.includes(opPrefix) && disruption.railway_id.includes(lineSlug)) {
            return true;
        }
    }

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
    const refreshRequested = searchParams.get('refresh') === '1' || searchParams.get('refresh') === 'true';
    const refreshSecret = process.env.L2_REFRESH_SECRET || process.env.N8N_WEBHOOK_SECRET;
    const refresh = refreshRequested && Boolean(refreshSecret) && request.headers.get('x-l2-refresh-secret') === refreshSecret;

    if (!stationId) {
        return NextResponse.json({ error: 'Missing station_id or stationId' }, { status: 400 });
    }

    try {
        const [snapshotRes, historyRes, crowdReportsRes, nodeRes] = await Promise.all([
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
                .limit(20),
            supabaseAdmin
                .from('transit_crowd_reports')
                .select('crowd_level')
                .eq('station_id', stationId)
                .gt('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString()) // Last 30 mins
            ,
            supabaseAdmin
                .from('nodes')
                .select('transit_lines, coordinates')
                .eq('id', stationId)
                .maybeSingle()
        ]);

        const { data, error } = snapshotRes;
        const { data: historyRows, error: historyError } = historyRes;
        const crowdReports = crowdReportsRes.data || [];

        if (error) {
            console.error('Error fetching L2 status:', error);
            // Don't fail completely, try to serve live info if DB fails
        }

        // Base Data from DB or default
        const baseData = data || {
            status_code: 'NORMAL',
            updated_at: new Date().toISOString(),
            disruption_data: { disruptions: [] }
        };

        // Transform Flat DB columns to Frontend Interface
        // Normalize stationId to find matching STATION_LINES entry
        // Handle various ID formats: odpt:Station:Operator.Line.Station, odpt.Station:Operator.Line.Station, etc.

        // Step 1: Try direct match
        let lines = STATION_LINES[stationId] || [];

        // Step 2: Try with prefix swap (odpt.Station: <-> odpt:Station:)
        if (lines.length === 0) {
            const swappedId = stationId.startsWith('odpt.Station:')
                ? stationId.replace(/^odpt\.Station:/, 'odpt:Station:')
                : stationId.replace(/^odpt:Station:/, 'odpt.Station:');
            lines = STATION_LINES[swappedId] || [];
        }

        // Step 3: Try extracting station slug and matching (for Operator.Line.Station format)
        if (lines.length === 0) {
            const match = stationId.match(/[.:](TokyoMetro|Toei|JR-East)[.:]([A-Za-z]+)[.:](.+)$/);
            if (match) {
                const operator = match[1];
                const line = match[2];
                const station = match[3];
                // Try various combinations
                const candidates = [
                    `odpt:Station:${operator}.${station}`,
                    `odpt.Station:${operator}.${station}`,
                    `odpt:Station:${operator}.${line === 'Oedo' ? 'Shinjuku' : station}`, // Special case for Oedo Shinjuku
                ];
                for (const candidate of candidates) {
                    lines = STATION_LINES[candidate] || [];
                    if (lines.length > 0) break;
                }
            }
        }

        // Step 4: For specific known patterns, hard-code the mapping
        if (lines.length === 0) {
            const lowerId = stationId.toLowerCase();
            if (lowerId.includes('oedo.shinjuku')) {
                lines = STATION_LINES['odpt:Station:Toei.Shinjuku'] || [];
            } else if (lowerId.includes('hibiya.akihabara')) {
                lines = STATION_LINES['odpt:Station:JR-East.Akihabara'] ||
                    STATION_LINES['odpt.Station:TokyoMetro.Hibiya.Akihabara'] || [];
            }
        }

        // Step 5: Final fallback - dynamically fetch from nodes.transit_lines
        if (lines.length === 0) {
            lines = await getNodeTransitLines(stationId, nodeRes.data?.transit_lines);
            if (lines.length > 0) {
                console.log(`[L2 API] Resolved ${lines.length} lines from nodes.transit_lines for ${stationId}`);
            }
        }

        const trainStatus = await getTrainStatus(); // Fetches all lines cached

        // Transform simplified getTrainStatus response to expected format for matching
        const liveTrainInfo = trainStatus.map((item: any) => {
            const statusObj = item['odpt:trainInformationStatus'];
            const statusText = (typeof statusObj === 'object' && statusObj) ? (statusObj.ja || statusObj.en) : statusObj;

            // Skip normal operation
            if (!statusText || statusText === '平常運転' || statusText.includes('平常通り')) {
                // Check if text says normal
                const textObj = item['odpt:trainInformationText'];
                const textJa = (typeof textObj === 'object' && textObj) ? textObj.ja : textObj;
                if (!textJa || textJa.includes('平常') || textJa.includes('通常')) return null;
            }

            const textObj = item['odpt:trainInformationText'];
            const textJa = (typeof textObj === 'object' && textObj) ? textObj.ja : textObj;
            const textEn = (typeof textObj === 'object' && textObj) ? textObj.en : '';

            return {
                severity: (item.secondary_status && item.secondary_status !== 'normal') ? 'major' : 'minor',
                railway_id: item['odpt:railway'],
                line_name: {
                    en: (item['odpt:railway'] || '').split('.').pop(),
                    ja: ''
                },
                status_label: {
                    ja: statusText || '運行情報',
                    en: 'Service Update',
                    zh: '營運調整'
                },
                message: {
                    ja: textJa || '',
                    en: textEn || '',
                    zh: textJa || ''
                }
            };
        }).filter(Boolean);

        // Mix DB disruptions with Live API disruptions
        // CRITICAL FIX: Filter out DB disruptions that mention "Normal" or "平常"
        const filteredDbDisruptions = (baseData as any).disruption_data?.disruptions?.filter((d: any) => {
            const msg = d.message?.ja || d.status_label?.ja || '';
            return !msg.includes('平常') && !msg.includes('通常') && !msg.includes('ダイヤ乱れは解消');
        }) || [];

        const combinedDisruptions = [...filteredDbDisruptions, ...liveTrainInfo];

        const lineStatusArray = lines.map(lineDef => {
            const matching = combinedDisruptions.filter((d: any) => matchDisruptionToLine(lineDef, d));

            if (matching.length > 0) {
                // Determine valid issue from matches
                const worst = pickWorstSeverity(matching);
                const primary = matching.find((d: any) => String(d?.severity) === worst) || matching[0];

                // Text Resolution
                const msgJa = primary?.message?.ja || primary?.status_label?.ja || '';
                const msgEn = primary?.message?.en || primary?.status_label?.en || '';
                const msgZh = primary?.message?.['zh-TW'] || primary?.message?.zh || primary?.status_label?.['zh-TW'] || primary?.status_label?.zh || '';

                // DANGER FIX: If the message explicitly says 'Operating Normally' (平常/通常), override status to normal
                const isActuallyNormal = msgJa.includes('平常') || msgJa.includes('通常') || msgJa.includes('ダイヤ乱れは解消');
                const status = isActuallyNormal ? 'normal' : severityToLineStatus(worst);

                const message = (msgJa || msgEn || msgZh) && !isActuallyNormal
                    ? {
                        ja: msgJa || '',
                        en: msgEn || 'Service update',
                        zh: msgZh || ''
                    }
                    : undefined;

                return {
                    line: lineDef.name.en,
                    name: lineDef.name,
                    operator: lineDef.operator,
                    color: lineDef.color,
                    status,
                    message
                };
            }

            // Fallback (if no specific disruption matched)
            return {
                line: lineDef.name.en,
                name: lineDef.name,
                operator: lineDef.operator,
                color: lineDef.color,
                status: 'normal',
                message: undefined
            };
        });

        // Overall Station Severity
        const stationHasDelay = lineStatusArray.some(l => l.status !== 'normal');

        // Calculate Weather
        // Priority: 
        // 1. Existing weather_info in snapshot (if < 3 hours old)
        // 2. Live fetch via Open-Meteo (if coordinates available or default)
        // 3. Last known weather from ANY station in DB (global fallback)

        const weatherInfo = await (async () => {
            const w: any = baseData.weather_info;
            const t = w?.update_time ? Date.parse(String(w.update_time)) : NaN;

            // If we have data and it's fresh (< 3 hours), use it
            if (w && Number.isFinite(t) && (Date.now() - t < 3 * 60 * 60 * 1000)) {
                return w;
            }

            // Otherwise, try to fetch live
            try {
                // Try to get coords from nodes table if not in baseData
                let lat = 35.6895; // Default Tokyo Center
                let lon = 139.6917;

                if (nodeRes.data?.coordinates) {
                    const coords = nodeRes.data.coordinates as any;
                    if (coords.coordinates && Array.isArray(coords.coordinates)) {
                        // PostGIS geojson format: { type: "Point", coordinates: [lon, lat] }
                        lon = coords.coordinates[0];
                        lat = coords.coordinates[1];
                    } else if (Array.isArray(coords) && coords.length >= 2) {
                        // Array format: [lon, lat] or [lat, lon] - common in JSONB
                        lon = coords[0];
                        lat = coords[1];
                    }
                }

                const live = await getLiveWeather(lat, lon);
                return {
                    temp: live.temp,
                    condition: live.condition,
                    wind: live.wind,
                    label: live.label,
                    emoji: live.emoji,
                    humidity: live.humidity,
                    precipitationProbability: live.precipitationProbability,
                    update_time: new Date().toISOString()
                };
            } catch (e) {
                console.warn(`[L2 API] Live weather fetch failed for ${stationId}, falling back to DB:`, e);

                // Final fallback: Last known weather in the system
                const { data: fallback } = await supabaseAdmin
                    .from('transit_dynamic_snapshot')
                    .select('weather_info')
                    .not('weather_info', 'is', null)
                    .order('updated_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                return fallback?.weather_info || null;
            }
        })();

        // Calculate Crowd Level from Reports
        // Distribution: [Level 1, Level 2, Level 3, Level 4, Level 5]
        const voteDistribution = [0, 0, 0, 0, 0];
        let voteSum = 0;
        let voteCount = 0;

        crowdReports.forEach((r: any) => {
            const level = r.crowd_level;
            if (level >= 1 && level <= 5) {
                voteDistribution[level - 1]++;
                voteSum += level;
                voteCount++;
            }
        });

        // Determine Final Crowd Level
        // Priority:
        // 1. Station Delay -> Level 4 (Crowded)
        // 2. User Votes (if > 3 votes) -> Average or Mode
        // 3. Static/History -> Level 2 (Normal)

        let finalCrowdLevel = baseData.crowd_level || 2;

        if (stationHasDelay) {
            finalCrowdLevel = 4;
        } else if (voteCount >= 3) {
            // Use average for smoother transition, rounded
            finalCrowdLevel = Math.round(voteSum / voteCount);
        }

        const l2Status = {
            congestion: finalCrowdLevel,
            crowd: {
                level: finalCrowdLevel,
                trend: 'stable', // could compare with older data if available
                userVotes: {
                    total: voteCount,
                    distribution: voteDistribution
                }
            },
            line_status: lineStatusArray,
            weather: {
                temp: weatherInfo?.temp || 0,
                condition: weatherInfo?.condition || 'Unknown',
                wind: weatherInfo?.wind || 0
            },
            updated_at: new Date().toISOString(),
            is_stale: false,
            disruption_history: Array.isArray(historyRows) ? historyRows : []
        };

        const dbFresh = (() => {
            if (!data) return false;
            const updatedAt = (baseData as any)?.updated_at;
            const t = updatedAt ? Date.parse(String(updatedAt)) : NaN;
            if (!Number.isFinite(t)) return false;
            return Date.now() - t <= 2 * 60 * 1000;
        })();

        const shouldUpsertDb = !dbFresh;
        const shouldUpsertCache = refresh || shouldUpsertDb;

        if (shouldUpsertDb || shouldUpsertCache) {
            const nowIso = new Date().toISOString();
            const reasonJa = (() => {
                const firstIssue = lineStatusArray.find(l => l.status !== 'normal');
                if (!firstIssue) return '運行正常';
                const msg = firstIssue.message?.ja || '';
                return msg || '運行情報あり';
            })();

            const disruptionData = {
                disruptions: combinedDisruptions,
                fetched_at: nowIso
            };

            try {
                const tasks: PromiseLike<any>[] = [];

                if (shouldUpsertDb) {
                    tasks.push(
                        supabaseAdmin
                            .from('transit_dynamic_snapshot')
                            .upsert(
                                {
                                    station_id: stationId,
                                    status_code: stationHasDelay ? 'DELAY' : 'NORMAL',
                                    reason_ja: reasonJa,
                                    reason_zh_tw: '',
                                    weather_info: weatherInfo,
                                    disruption_data: disruptionData,
                                    updated_at: nowIso
                                },
                                { onConflict: 'station_id' }
                            )
                    );
                }

                if (shouldUpsertCache) {
                    tasks.push(
                        supabaseAdmin
                            .from('l2_cache')
                            .upsert(
                                {
                                    key: `l2:${stationId}`,
                                    value: l2Status,
                                    expires_at: new Date(Date.now() + 20 * 60 * 1000).toISOString()
                                },
                                { onConflict: 'key' }
                            )
                    );
                }

                await Promise.all(tasks);
            } catch (e) {
                console.warn('[L2 API] Persist failed:', e);
            }
        }

        return NextResponse.json(l2Status, {
            headers: {
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30'
            }
        });
    } catch (e) {
        console.error('L2 API Fatal Error:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
