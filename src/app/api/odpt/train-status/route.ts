import { NextRequest, NextResponse } from 'next/server';
import { getTrainStatus } from '@/lib/odpt/service';
import { supabaseAdmin } from '@/lib/supabase';
import type { TransitIncident, TransitIncidentEvidence, TransitIncidentSource, TransitIncidentSeverity, TransitIncidentStatus } from '@/lib/odpt/types';

function extractDelayMinutes(text: string): number | null {
    const t = String(text || '');
    const m = t.match(/(\d+)\s*分/u);
    if (!m) return null;
    const n = Number(m[1]);
    return Number.isFinite(n) ? n : null;
}

function classifyIncident(params: {
    statusTextJa: string;
    messageJa: string;
    hasSecondaryTrouble: boolean;
}): { status: TransitIncidentStatus; severity: TransitIncidentSeverity } {
    const statusText = params.statusTextJa;
    const msg = params.messageJa;
    const t = `${statusText} ${msg}`;

    if (/(運転見合わせ|運転見合せ|運転中止|運休|全線停止|全線見合わせ)/.test(t)) {
        return { status: 'suspended', severity: 'critical' };
    }
    if (/(大幅|著しい|大幅な遅れ|遅延|ダイヤ乱れ|運転本数が少なく|間引き運転)/.test(t) || params.hasSecondaryTrouble) {
        return { status: 'delay', severity: 'major' };
    }
    if (/(遅れ|一部遅延|混雑|調整)/.test(t)) {
        return { status: 'delay', severity: 'minor' };
    }
    if (/(平常運転|通常運転|おおむね平常)/.test(t)) {
        return { status: 'normal', severity: 'none' };
    }
    return { status: 'unknown', severity: 'minor' };
}

function buildEvidence(item: any): TransitIncidentEvidence[] {
    const ev: TransitIncidentEvidence[] = [];
    const secondarySource = String(item?.secondary_source || '');
    const secondaryStatus = String(item?.secondary_status || '');

    const maybePush = (source: TransitIncidentSource, e: Omit<TransitIncidentEvidence, 'source'>) => {
        ev.push({ source, ...e });
    };

    if (secondarySource || secondaryStatus) {
        maybePush('yahoo', {
            title: secondarySource || 'Yahoo Transit',
            observed_at: typeof item?.['dc:date'] === 'string' ? item['dc:date'] : new Date().toISOString(),
            snippet_ja: secondaryStatus || undefined,
        });
    }

    return ev;
}

function normalizeToIncident(item: any): TransitIncident {
    const railway = String(item?.['odpt:railway'] || '');
    const operator = typeof item?.['odpt:operator'] === 'string' ? item['odpt:operator'] : undefined;

    const statusObj = item?.['odpt:trainInformationStatus'];
    const statusTextJa = (typeof statusObj === 'object' && statusObj) ? (statusObj.ja || statusObj.en || '') : String(statusObj || '');

    const textObj = item?.['odpt:trainInformationText'];
    const messageJa = (typeof textObj === 'object' && textObj) ? (textObj.ja || '') : String(textObj || '');
    const messageEn = (typeof textObj === 'object' && textObj) ? (textObj.en || '') : '';
    const messageZhTw = (typeof textObj === 'object' && textObj) ? (textObj['zh-TW'] || textObj.zh || '') : '';

    const hasSecondaryTrouble = Boolean(item?.secondary_source) && String(item?.secondary_status || '').toLowerCase() !== 'normal';
    const classified = classifyIncident({ statusTextJa, messageJa, hasSecondaryTrouble });

    const delayMinutes = extractDelayMinutes(messageJa);

    const observedAt = typeof item?.['dc:date'] === 'string' ? item['dc:date'] : new Date().toISOString();
    const id = String(item?.['owl:sameAs'] || item?.['@id'] || `synthetic:${railway}:${observedAt}`);

    const evidence = buildEvidence(item);

    return {
        id,
        source: id.startsWith('yahoo:') ? 'yahoo' : 'odpt',
        operator,
        railway,
        status: classified.status,
        severity: classified.severity,
        delay_minutes: delayMinutes,
        message: {
            ja: messageJa || statusTextJa || undefined,
            en: messageEn || undefined,
            'zh-TW': messageZhTw || undefined,
        },
        occurred_at: null,
        observed_at: observedAt,
        evidence: evidence.length > 0 ? evidence : undefined,
        trust_level: item.trust_level,
        confidence: item.confidence,
    };
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const operatorParam = searchParams.get('operator') || undefined;
        const format = searchParams.get('format') || 'agent';
        const persistRequested = searchParams.get('persist') === '1' || searchParams.get('persist') === 'true';
        const ingestSecret = process.env.L2_REFRESH_SECRET || process.env.N8N_WEBHOOK_SECRET;
        const persist = persistRequested && Boolean(ingestSecret) && req.headers.get('x-l2-refresh-secret') === ingestSecret;

        const results = await getTrainStatus(operatorParam);

        if (format === 'incidents') {
            const incidents = results
                .map(normalizeToIncident)
                .filter((i) => i.railway && i.status !== 'normal' && i.severity !== 'none');

            if (persist && incidents.length > 0) {
                await supabaseAdmin
                    .from('transit_alerts')
                    .upsert(
                        incidents.map((i) => ({
                            id: i.id,
                            operator: i.operator || null,
                            railway: i.railway,
                            status: i.status,
                            text_ja: i.message?.ja || '',
                            text_en: i.message?.en || '',
                            occurred_at: i.occurred_at || null,
                            updated_at: i.observed_at,
                            trust_level: i.trust_level || 'unverified',
                            confidence: i.confidence || 0.5,
                            metadata: { evidence: i.evidence }
                        })),
                        { onConflict: 'id' }
                    );
            }


            return NextResponse.json(
                {
                    incidents,
                    count: incidents.length,
                    persisted: persist && incidents.length > 0,
                },
                {
                    headers: {
                        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
                    },
                }
            );
        }

        const filteredResults = results.map((item: any) => {
            const textObj = item['odpt:trainInformationText'];
            const statusText =
                (typeof textObj === 'object' && textObj)
                    ? (textObj['zh-TW'] || textObj.zh || textObj.en || textObj.ja)
                    : String(textObj || '');
            return {
                railway: item['odpt:railway']?.split(':').pop(),
                status: statusText,
                operator: item['odpt:operator']?.split(':').pop(),
                time: item['dc:date'],
            };
        });

        return NextResponse.json(
            filteredResults,
            {
                headers: {
                    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
                },
            }
        );
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const ingestSecret = process.env.L2_REFRESH_SECRET || process.env.N8N_WEBHOOK_SECRET;
    if (!ingestSecret || req.headers.get('x-l2-refresh-secret') !== ingestSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const items: any[] = Array.isArray(body?.items) ? body.items : [];
        const incidents: TransitIncident[] = items
            .map(normalizeToIncident)
            .filter((i: TransitIncident) => Boolean(i.railway));

        if (incidents.length === 0) {
            return NextResponse.json({ ok: true, upserted: 0 });
        }

        const { error } = await supabaseAdmin
            .from('transit_alerts')
            .upsert(
                incidents.map((i: TransitIncident) => ({
                    id: i.id,
                    operator: i.operator || null,
                    railway: i.railway,
                    status: i.status,
                    text_ja: i.message?.ja || '',
                    text_en: i.message?.en || '',
                    occurred_at: i.occurred_at || null,
                    updated_at: i.observed_at,
                    trust_level: i.trust_level || 'unverified',
                    confidence: i.confidence || 0.5,
                    metadata: { evidence: i.evidence }
                })),
                { onConflict: 'id' }
            );


        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ ok: true, upserted: incidents.length });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || 'Internal Server Error' }, { status: 500 });
    }
}
