
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

type LineStatusDetail = 'normal' | 'delay_minor' | 'delay_major' | 'halt' | 'canceled' | 'unknown';

function extractDelayMinutesFromText(text: string): number | null {
    const s = String(text || '');
    if (!s) return null;

    const candidates: number[] = [];

    const jaPatterns: RegExp[] = [
        /最大\s*(\d{1,3})\s*分/g,
        /(\d{1,3})\s*分\s*(?:程度)?\s*(?:以上)?\s*(?:の)?\s*(?:遅れ|遅延)/g,
        /(?:遅れ|遅延)(?:が)?\s*(\d{1,3})\s*分/g,
        /(\d{1,3})\s*分\s*(?:遅れ|遅延)/g
    ];
    for (const re of jaPatterns) {
        let m: RegExpExecArray | null;
        while ((m = re.exec(s)) !== null) {
            const n = Number(m[1]);
            if (Number.isFinite(n) && n >= 0) candidates.push(n);
        }
    }

    const enPatterns: RegExp[] = [
        /(\d{1,3})\s*(?:min|mins|minutes)\s*(?:delay|delayed|late)?/gi,
        /delay(?:ed)?\s*(?:by|of)?\s*(\d{1,3})\s*(?:min|mins|minutes)/gi
    ];
    for (const re of enPatterns) {
        let m: RegExpExecArray | null;
        while ((m = re.exec(s)) !== null) {
            const n = Number(m[1]);
            if (Number.isFinite(n) && n >= 0) candidates.push(n);
        }
    }

    if (candidates.length === 0) return null;
    return Math.max(...candidates);
}

function classifyLineStatusFromText(params: {
    severity?: string;
    statusText?: string;
    messageJa?: string;
    messageEn?: string;
    messageZh?: string;
}): { status: 'normal' | 'delay' | 'suspended'; detail: LineStatusDetail; delayMinutes: number | null } {
    const statusText = String(params.statusText || '');
    const ja = String(params.messageJa || '');
    const en = String(params.messageEn || '');
    const zh = String(params.messageZh || '');

    const combinedLower = `${statusText}\n${ja}\n${en}\n${zh}`.toLowerCase();

    const looksNormal =
        combinedLower.includes('平常') ||
        combinedLower.includes('通常') ||
        combinedLower.includes('operating normally') ||
        combinedLower.includes('normal operation') ||
        combinedLower.includes('no delays') ||
        combinedLower.includes('service is normal');

    if (looksNormal) {
        return { status: 'normal', detail: 'normal', delayMinutes: null };
    }

    const isCanceled =
        ja.includes('運休') ||
        ja.includes('運転取り止め') ||
        ja.includes('運転を取りやめ') ||
        combinedLower.includes('cancelled') ||
        combinedLower.includes('canceled') ||
        combinedLower.includes('cancelled service') ||
        combinedLower.includes('service cancelled');

    if (isCanceled) {
        return { status: 'suspended', detail: 'canceled', delayMinutes: null };
    }

    const isHalt =
        ja.includes('運転見合わせ') ||
        ja.includes('運転を見合わせ') ||
        ja.includes('運転中止') ||
        ja.includes('運転休止') ||
        ja.includes('運行を見合わせ') ||
        combinedLower.includes('service suspended') ||
        combinedLower.includes('suspended') ||
        combinedLower.includes('stopped');

    if (isHalt) {
        return { status: 'suspended', detail: 'halt', delayMinutes: null };
    }

    const delayMinutes = extractDelayMinutesFromText(`${statusText}\n${ja}\n${en}\n${zh}`);
    if (delayMinutes !== null) {
        return {
            status: 'delay',
            detail: delayMinutes >= 30 ? 'delay_major' : 'delay_minor',
            delayMinutes
        };
    }

    const looksDelay =
        ja.includes('遅れ') ||
        ja.includes('遅延') ||
        combinedLower.includes('delay') ||
        combinedLower.includes('delayed');

    if (looksDelay) {
        return { status: 'delay', detail: 'unknown', delayMinutes: null };
    }

    if (params.severity === 'critical') {
        return { status: 'suspended', detail: 'halt', delayMinutes: null };
    }

    if (params.severity === 'major' || params.severity === 'minor') {
        return { status: 'delay', detail: 'unknown', delayMinutes: null };
    }

    return { status: 'normal', detail: 'unknown', delayMinutes: null };
}

function lineStatusDetailRank(detail: LineStatusDetail): number {
    if (detail === 'canceled') return 4;
    if (detail === 'halt') return 3;
    if (detail === 'delay_major') return 2;
    if (detail === 'delay_minor') return 1;
    return 0;
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
                const pick = (() => {
                    const scored = matching
                        .map((d: any) => {
                            const statusText =
                                (typeof d?.status_label === 'object' && d?.status_label)
                                    ? (d.status_label.ja || d.status_label.en || '')
                                    : String(d?.status_label || '');

                            const msgObj = d?.message;
                            const msgJa =
                                (typeof msgObj === 'object' && msgObj) ? (msgObj.ja || '') : (typeof msgObj === 'string' ? msgObj : '');
                            const msgEn = (typeof msgObj === 'object' && msgObj) ? (msgObj.en || '') : '';
                            const msgZh = (typeof msgObj === 'object' && msgObj) ? (msgObj['zh-TW'] || msgObj.zh || '') : '';

                            const classified = classifyLineStatusFromText({
                                severity: String(d?.severity || ''),
                                statusText,
                                messageJa: msgJa,
                                messageEn: msgEn,
                                messageZh: msgZh
                            });

                            const severityRank = (() => {
                                const s = String(d?.severity || 'none');
                                if (s === 'critical') return 3;
                                if (s === 'major') return 2;
                                if (s === 'minor') return 1;
                                return 0;
                            })();

                            return {
                                d,
                                classified,
                                rank: lineStatusDetailRank(classified.detail),
                                severityRank
                            };
                        })
                        .sort((a, b) => b.rank - a.rank || b.severityRank - a.severityRank);
                    return scored[0] || null;
                })();

                const primary = pick?.d || matching[0];
                const worst = pickWorstSeverity(matching);

                const primaryMsgObj = primary?.message;
                const msgJa =
                    (typeof primaryMsgObj === 'object' && primaryMsgObj)
                        ? (primaryMsgObj.ja || primary?.status_label?.ja || '')
                        : (typeof primaryMsgObj === 'string' ? primaryMsgObj : (primary?.status_label?.ja || ''));
                const msgEn =
                    (typeof primaryMsgObj === 'object' && primaryMsgObj)
                        ? (primaryMsgObj.en || primary?.status_label?.en || '')
                        : (primary?.status_label?.en || '');
                const msgZh =
                    (typeof primaryMsgObj === 'object' && primaryMsgObj)
                        ? (primaryMsgObj['zh-TW'] || primaryMsgObj.zh || primary?.status_label?.['zh-TW'] || primary?.status_label?.zh || '')
                        : (primary?.status_label?.['zh-TW'] || primary?.status_label?.zh || '');

                const statusText =
                    (typeof primary?.status_label === 'object' && primary?.status_label)
                        ? (primary.status_label.ja || primary.status_label.en || '')
                        : String(primary?.status_label || '');

                const classified = pick?.classified ||
                    classifyLineStatusFromText({
                        severity: String(primary?.severity || ''),
                        statusText,
                        messageJa: msgJa,
                        messageEn: msgEn,
                        messageZh: msgZh
                    });

                const isActuallyNormal = classified.detail === 'normal' || msgJa.includes('ダイヤ乱れは解消');
                const status = isActuallyNormal ? 'normal' : classified.status;

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
                    status_detail: isActuallyNormal ? 'normal' : classified.detail,
                    delay_minutes: isActuallyNormal ? null : classified.delayMinutes,
                    severity: String(worst || ''),
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
                status_detail: 'normal',
                delay_minutes: null,
                severity: 'none',
                message: undefined
            };
        });

        // Overall Station Severity
        const hasSuspension = lineStatusArray.some(l => l.status_detail === 'halt' || l.status_detail === 'canceled' || l.status === 'suspended');
        const hasDelay = lineStatusArray.some(l => l.status_detail === 'delay_major' || l.status_detail === 'delay_minor' || l.status === 'delay');

        let finalStatusCode = 'NORMAL';
        if (hasSuspension) finalStatusCode = 'SUSPENDED';
        else if (hasDelay) finalStatusCode = 'DELAY';

        // Calculate Weather
        // Priority:
        // 1. Existing weather_info in snapshot (if < 3 hours old)
        // 2. Live fetch via Open-Meteo (if coordinates available or default)
        // 3. Last known weather from ANY station in DB (global fallback)

        const stationHasDelay = finalStatusCode !== 'NORMAL';


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

            const overallSeverity = (() => {
                if (hasSuspension) return 'critical';
                if (lineStatusArray.some(l => l.status_detail === 'delay_major')) return 'major';
                if (lineStatusArray.some(l => l.status_detail === 'delay_minor')) return 'minor';
                if (hasDelay) return 'minor';
                return 'none';
            })();

            const affectedLines = Array.from(
                new Set(
                    lineStatusArray
                        .filter(l => l.status !== 'normal')
                        .map(l => l.name?.ja || l.line)
                        .filter(Boolean)
                )
            );

            const shouldLogHistory = (() => {
                if (overallSeverity === 'none') return false;
                const last = Array.isArray(historyRows) && historyRows.length > 0 ? (historyRows[0] as any) : null;
                if (!last) return true;
                const lastAtMs = last?.created_at ? Date.parse(String(last.created_at)) : NaN;
                const recent = Number.isFinite(lastAtMs) && (Date.now() - lastAtMs < 5 * 60 * 1000);
                if (!recent) return true;
                if (String(last?.severity || '') !== overallSeverity) return true;
                return false;
            })();

            try {
                const tasks: PromiseLike<any>[] = [];

                if (shouldUpsertDb) {
                    tasks.push(
                        supabaseAdmin
                            .from('transit_dynamic_snapshot')
                            .upsert(
                                {
                                    station_id: stationId,
                                    status_code: finalStatusCode,
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

                if (shouldLogHistory) {
                    tasks.push(
                        supabaseAdmin
                            .from('l2_disruption_history')
                            .insert({
                                station_id: stationId,
                                severity: overallSeverity,
                                has_issues: true,
                                affected_lines: affectedLines,
                                disruption_data: disruptionData,
                            })
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

;(GET as any).__private__ = {
    extractDelayMinutesFromText,
    classifyLineStatusFromText,
    lineStatusDetailRank,
};
