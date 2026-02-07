import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

type FeedbackWeight = {
    tag: string;
    weight: number;
    updated_at: string;
};

type FeedbackEvent = {
    id: string;
    trace_id: string | null;
    user_id: string | null;
    session_id: string | null;
    locale: string | null;
    query: string | null;
    response: string | null;
    helpful: boolean;
    intent_tags: string[] | null;
    node_id: string | null;
    created_at: string;
};

type TrendRow = {
    day: string;
    positive: number;
    negative: number;
    total: number;
};

type AlertRow = {
    tag: string;
    weight: number;
    level: 'high' | 'medium';
};

function summarize(weights: FeedbackWeight[], events: FeedbackEvent[], threshold: number, alerts: AlertRow[]) {
    const positiveCount = events.filter((e) => e.helpful).length;
    const negativeCount = events.length - positiveCount;
    const avgWeight =
        weights.length > 0
            ? weights.reduce((sum, w) => sum + Number(w.weight || 0), 0) / weights.length
            : 0;
    return {
        totalEvents: events.length,
        positiveCount,
        negativeCount,
        totalTags: weights.length,
        avgWeight: Number(avgWeight.toFixed(4)),
        alertThreshold: threshold,
        alertCount: alerts.length,
        topPositive: [...weights].sort((a, b) => b.weight - a.weight).slice(0, 5),
        topNegative: [...weights].sort((a, b) => a.weight - b.weight).slice(0, 5),
    };
}

function toCsv(weights: FeedbackWeight[]): string {
    const header = 'tag,weight,updated_at';
    const rows = weights.map((w) => {
        const tag = `"${String(w.tag || '').replace(/"/g, '""')}"`;
        const weight = Number(w.weight || 0).toString();
        const updatedAt = `"${String(w.updated_at || '').replace(/"/g, '""')}"`;
        return `${tag},${weight},${updatedAt}`;
    });
    return [header, ...rows].join('\n');
}

function toMarkdown(weights: FeedbackWeight[], events: FeedbackEvent[]) {
    const threshold = 1.2;
    const alerts = buildWeightAlerts(weights, threshold);
    const s = summarize(weights, events, threshold, alerts);
    const lines: string[] = [];
    lines.push('# Agent Feedback Weights Report');
    lines.push('');
    lines.push(`- Generated At: ${new Date().toISOString()}`);
    lines.push(`- Total Events: ${s.totalEvents}`);
    lines.push(`- Positive: ${s.positiveCount}`);
    lines.push(`- Negative: ${s.negativeCount}`);
    lines.push(`- Total Tags: ${s.totalTags}`);
    lines.push(`- Average Weight: ${s.avgWeight}`);
    lines.push(`- Alert Threshold: ${s.alertThreshold}`);
    lines.push(`- Alert Count: ${s.alertCount}`);
    lines.push('');
    lines.push('## Top Positive Tags');
    for (const item of s.topPositive) {
        lines.push(`- ${item.tag}: ${Number(item.weight).toFixed(4)}`);
    }
    lines.push('');
    lines.push('## Top Negative Tags');
    for (const item of s.topNegative) {
        lines.push(`- ${item.tag}: ${Number(item.weight).toFixed(4)}`);
    }
    lines.push('');
    lines.push('## Weights Snapshot');
    lines.push('| Tag | Weight | Updated At |');
    lines.push('| --- | ---: | --- |');
    for (const w of weights) {
        lines.push(`| ${w.tag} | ${Number(w.weight).toFixed(4)} | ${w.updated_at || ''} |`);
    }
    return lines.join('\n');
}

function clampWeight(value: number): number {
    if (!Number.isFinite(value)) return 0;
    if (value > 2) return 2;
    if (value < -2) return -2;
    return Number(value.toFixed(4));
}

function dayKey(iso: string): string {
    if (!iso) return '';
    return new Date(iso).toISOString().slice(0, 10);
}

function buildTrendSeries(events: FeedbackEvent[], days: number): TrendRow[] {
    const bucket = new Map<string, TrendRow>();
    for (const e of events) {
        const day = dayKey(e.created_at);
        if (!day) continue;
        if (!bucket.has(day)) {
            bucket.set(day, { day, positive: 0, negative: 0, total: 0 });
        }
        const row = bucket.get(day)!;
        row.total += 1;
        if (e.helpful) row.positive += 1;
        else row.negative += 1;
    }
    const sorted = [...bucket.values()].sort((a, b) => a.day.localeCompare(b.day));
    if (!Number.isFinite(days) || days <= 0 || sorted.length <= days) return sorted;
    return sorted.slice(sorted.length - days);
}

function buildWeightAlerts(weights: FeedbackWeight[], threshold: number): AlertRow[] {
    const safeThreshold = Number.isFinite(threshold) && threshold > 0 ? threshold : 1.2;
    const rows: AlertRow[] = [];
    for (const item of weights) {
        const value = Number(item.weight || 0);
        const abs = Math.abs(value);
        if (abs < safeThreshold) continue;
        rows.push({
            tag: item.tag,
            weight: value,
            level: abs >= safeThreshold * 1.3 ? 'high' : 'medium',
        });
    }
    return rows.sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));
}

export async function GET(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const format = (url.searchParams.get('format') || 'json').toLowerCase();
        const eventLimit = Number(url.searchParams.get('limit') || '100');
        const trendDays = Number(url.searchParams.get('trend_days') || '14');
        const alertThreshold = Number(url.searchParams.get('alert_threshold') || '1.2');

        const [{ data: weightsData, error: weightsError }, { data: eventsData, error: eventsError }] =
            await Promise.all([
                supabaseAdmin
                    .from('agent_feedback_weights')
                    .select('tag,weight,updated_at')
                    .order('weight', { ascending: false }),
                supabaseAdmin
                    .from('agent_feedback_events')
                    .select('id,trace_id,user_id,session_id,locale,query,response,helpful,intent_tags,node_id,created_at')
                    .order('created_at', { ascending: false })
                    .limit(Number.isFinite(eventLimit) ? Math.max(1, Math.min(500, eventLimit)) : 100),
            ]);

        if (weightsError || eventsError) {
            return NextResponse.json(
                {
                    error: 'Failed to fetch agent feedback data',
                    weightsError: weightsError?.message || null,
                    eventsError: eventsError?.message || null,
                },
                { status: 500 }
            );
        }

        const weights = (weightsData || []) as FeedbackWeight[];
        const events = (eventsData || []) as FeedbackEvent[];
        const alerts = buildWeightAlerts(weights, alertThreshold);
        const summary = summarize(weights, events, alertThreshold, alerts);
        const trend = buildTrendSeries(events, trendDays);

        if (format === 'csv') {
            return new NextResponse(toCsv(weights), {
                status: 200,
                headers: {
                    'Content-Type': 'text/csv; charset=utf-8',
                    'Content-Disposition': `attachment; filename="agent-feedback-weights-${new Date().toISOString().slice(0, 10)}.csv"`,
                },
            });
        }

        if (format === 'md' || format === 'markdown') {
            return new NextResponse(toMarkdown(weights, events), {
                status: 200,
                headers: {
                    'Content-Type': 'text/markdown; charset=utf-8',
                    'Content-Disposition': `attachment; filename="agent-feedback-report-${new Date().toISOString().slice(0, 10)}.md"`,
                },
            });
        }

        return NextResponse.json({
            summary,
            weights,
            events,
            trend,
            alerts,
            generatedAt: new Date().toISOString(),
        });
    } catch (error: any) {
        return NextResponse.json(
            { error: error?.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}

export async function PUT(req: NextRequest) {
    try {
        const body = await req.json();
        const action = String(body?.action || '').trim();
        if (!action) {
            return NextResponse.json({ error: 'action is required' }, { status: 400 });
        }

        if (action === 'set_tag') {
            const tag = String(body?.tag || '').trim();
            const weight = clampWeight(Number(body?.weight));
            if (!tag) {
                return NextResponse.json({ error: 'tag is required' }, { status: 400 });
            }
            const { error } = await supabaseAdmin
                .from('agent_feedback_weights')
                .upsert([{ tag, weight, updated_at: new Date().toISOString() }], { onConflict: 'tag' });
            if (error) {
                return NextResponse.json({ error: error.message }, { status: 500 });
            }
            return NextResponse.json({ ok: true, action, tag, weight });
        }

        if (action === 'reset_all') {
            const { data, error } = await supabaseAdmin
                .from('agent_feedback_weights')
                .select('tag');
            if (error) {
                return NextResponse.json({ error: error.message }, { status: 500 });
            }
            const rows = (data || []).map((row: { tag: string }) => ({
                tag: row.tag,
                weight: 0,
                updated_at: new Date().toISOString(),
            }));
            if (rows.length > 0) {
                const { error: upsertError } = await supabaseAdmin
                    .from('agent_feedback_weights')
                    .upsert(rows, { onConflict: 'tag' });
                if (upsertError) {
                    return NextResponse.json({ error: upsertError.message }, { status: 500 });
                }
            }
            return NextResponse.json({ ok: true, action, updated: rows.length });
        }

        return NextResponse.json({ error: 'unsupported action' }, { status: 400 });
    } catch (error: any) {
        return NextResponse.json(
            { error: error?.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}

export const __private__ = {
    buildTrendSeries,
    buildWeightAlerts,
    clampWeight,
};
